import csv
import os
import re
import uuid
import logging
import asyncio
from io import BytesIO, StringIO

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import chromadb
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")

app = FastAPI(title="VaultRAG Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent ChromaDB client — data survives server restarts
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="vault_docs")

# Embedding model — loaded once at startup
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Upload limits (PDF/CSV ingestion)
UPLOAD_MAX_BYTES = 25 * 1024 * 1024  # 25 MiB raw file
UPLOAD_MAX_CHUNKS = 2000

# Retrieval: fetch extra, then filter/rerank; final count 3–4 (default 4)
RETRIEVAL_FETCH_K = 12
RETRIEVAL_TOP_K = 4
# Drop hits much worse than the best match (relative) and obvious low-similarity tails (absolute)
RETRIEVAL_MAX_DISTANCE_DELTA = 0.40
RETRIEVAL_MAX_DISTANCE_ABSOLUTE = 1.28

_STOPWORDS = frozenset(
    """
    a an the and or but if as of at by for from in into onto with to was were
    be been being is are am was were do does did done has have had having
    will would could should may might must shall can need ought
    this that these those what which who whom whose when where why how
    i me my we our you your he him his she her it its they them their
    not no nor only same so than too very just also about above after again
    all any both each few more most other some such than that the their then
    there these they this those through to under until up very was were what
    when where which while who whom whose why will with would yet
    """.split()
)


def _extract_query_keywords(query: str) -> list[str]:
    """Content words for lexical overlap (e.g. revenue, salary)."""
    words = re.findall(r"[a-zA-Z0-9]+", query.lower())
    return [w for w in words if len(w) > 2 and w not in _STOPWORDS]


def _keyword_overlap_count(text: str, keywords: list[str]) -> int:
    if not keywords:
        return 0
    t = text.lower()
    return sum(1 for kw in keywords if kw in t)


def _filter_by_similarity(
    documents: list[str],
    distances: list[float],
) -> tuple[list[str], list[float]]:
    """Remove very weak matches vs. the best hit; requires distances from Chroma."""
    if not documents:
        return [], []
    if not distances or len(distances) != len(documents):
        return documents, distances or [0.0] * len(documents)

    d0 = distances[0]
    kept_docs: list[str] = []
    kept_dist: list[float] = []
    for doc, d in zip(documents, distances):
        if d > RETRIEVAL_MAX_DISTANCE_ABSOLUTE:
            continue
        if d > d0 + RETRIEVAL_MAX_DISTANCE_DELTA:
            continue
        kept_docs.append(doc)
        kept_dist.append(d)
    return kept_docs, kept_dist


def _rerank_by_keywords(
    documents: list[str],
    distances: list[float],
    keywords: list[str],
) -> list[str]:
    """Prefer chunks that mention query terms (revenue, salary, …) when overlap exists."""
    if not documents:
        return []
    pairs: list[tuple[str, float, int]] = []
    for doc, dist in zip(documents, distances):
        ov = _keyword_overlap_count(doc, keywords)
        pairs.append((doc, dist, ov))

    if keywords:
        with_kw = [p for p in pairs if p[2] > 0]
        if with_kw:
            pairs = with_kw

    pairs.sort(key=lambda x: (-x[2], x[1]))
    out: list[str] = []
    seen: set[str] = set()
    for doc, _, _ in pairs:
        if doc and doc.strip() and doc not in seen:
            seen.add(doc)
            out.append(doc)
        if len(out) >= RETRIEVAL_TOP_K:
            break
    return out


def _join_context_blocks(documents: list[str]) -> str:
    """Join retrieved docs with explicit separators for the LLM."""
    parts: list[str] = []
    for i, doc in enumerate(documents, start=1):
        parts.append(f"--- Source {i} ---\n{doc.strip()}")
    return "\n\n".join(parts)


# --- File ingestion (bytes only; nothing written to disk) ---
CHUNK_MIN = 300
CHUNK_MAX = 500
UPLOAD_ROLE = "Executive"


def _extract_pdf_text(data: bytes) -> str:
    """Extract plain text from PDF bytes using pypdf (in-memory)."""
    from pypdf import PdfReader

    reader = PdfReader(BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            parts.append(t)
    return "\n".join(parts)


def _extract_csv_text(data: bytes) -> str:
    """Turn CSV bytes into line-oriented text (each row → cells joined by |)."""
    try:
        s = data.decode("utf-8")
    except UnicodeDecodeError:
        s = data.decode("utf-8", errors="replace")
    lines: list[str] = []
    reader = csv.reader(StringIO(s))
    for row in reader:
        lines.append(" | ".join(cell.strip() for cell in row))
    return "\n".join(lines)


def _split_into_chunks(text: str) -> list[str]:
    """Split long text into ~300–500 char chunks; prefer word boundaries."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    n = len(text)
    if n <= CHUNK_MAX:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < n:
        if n - start <= CHUNK_MAX:
            piece = text[start:n].strip()
            if piece:
                chunks.append(piece)
            break
        end = start + CHUNK_MAX
        cut = text.rfind(" ", start + CHUNK_MIN, end + 1)
        if cut == -1 or cut <= start:
            cut = end
        piece = text[start:cut].strip()
        if piece:
            chunks.append(piece)
        start = cut
        while start < n and text[start] == " ":
            start += 1
    return chunks


def _sniff_pdf(data: bytes) -> bool:
    return len(data) >= 4 and data[:4] == b"%PDF"


def _detect_file_kind(filename: str, content_type: str | None, data: bytes) -> str | None:
    """Return 'pdf' or 'csv', or None if unsupported."""
    name = (filename or "").lower()
    ct = (content_type or "").lower()
    if name.endswith(".pdf") or ct == "application/pdf":
        return "pdf"
    if name.endswith(".csv") or "csv" in ct or ct in ("text/csv", "application/csv"):
        return "csv"
    if _sniff_pdf(data):
        return "pdf"
    return None


class UploadRequest(BaseModel):
    content: str
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("Employee", "Executive"):
            raise ValueError("role must be 'Employee' or 'Executive'")
        return v


class SearchRequest(BaseModel):
    query: str
    user_role: str

    @field_validator("user_role")
    @classmethod
    def validate_user_role(cls, v: str) -> str:
        if v not in ("Employee", "Executive"):
            raise ValueError("user_role must be 'Employee' or 'Executive'")
        return v


@app.get("/health")
def health_check():
    return {"status": "VaultRAG Backend running"}


@app.get("/db-status")
def db_status():
    return {"total_documents": collection.count()}


@app.post("/upload")
async def upload_document(req: UploadRequest):
    try:
        embedding = await asyncio.to_thread(embedding_model.encode, req.content)
        embedding = embedding.tolist()
        doc_id = str(uuid.uuid4())

        await asyncio.to_thread(
            collection.add,
            ids=[doc_id],
            documents=[req.content],
            embeddings=[embedding],
            metadatas=[{"role": req.role}],
        )

        return {"message": f"Document stored with role '{req.role}'", "id": doc_id}
    except Exception as e:
        logger.error(f"Error in upload_document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during upload")


@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """
    Accept PDF or CSV in memory only (no disk persistence of the raw file).
    Text is chunked, embedded, and stored in Chroma with role Executive.
    """
    try:
        raw = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded file")

    if not raw:
        raise HTTPException(status_code=422, detail="Empty file")

    if len(raw) > UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {UPLOAD_MAX_BYTES // (1024 * 1024)} MiB)",
        )

    kind = _detect_file_kind(file.filename or "", file.content_type, raw)
    if not kind:
        raise HTTPException(
            status_code=400,
            detail="Only PDF or CSV files are supported",
        )

    try:
        if kind == "pdf":
            text = _extract_pdf_text(raw)
        else:
            text = _extract_csv_text(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse {kind.upper()} file: {exc}",
        ) from exc

    chunks = _split_into_chunks(text)
    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from the file",
        )

    if len(chunks) > UPLOAD_MAX_CHUNKS:
        raise HTTPException(
            status_code=413,
            detail=f"Too many chunks after splitting ({len(chunks)}); max {UPLOAD_MAX_CHUNKS}",
        )

    def _encode_file_chunks(parts: list[str]) -> list:
        return embedding_model.encode(parts, show_progress_bar=False).tolist()

    try:
        embeddings = await asyncio.to_thread(_encode_file_chunks, chunks)
        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [{"role": UPLOAD_ROLE} for _ in chunks]

        def _add_chunks() -> None:
            collection.add(
                ids=ids,
                documents=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
            )

        await asyncio.to_thread(_add_chunks)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to store document chunks",
        )

    return {"message": "Document successfully ingested"}


def _rbac_search(query: str, user_role: str) -> list[str]:
    """RBAC-filtered vector search with distance + keyword-aware ranking."""
    if user_role == "Employee":
        where_filter = {"role": "Employee"}
    else:
        where_filter = {"role": {"$in": ["Employee", "Executive"]}}

    query_embedding = embedding_model.encode(query).tolist()
    keywords = _extract_query_keywords(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(RETRIEVAL_FETCH_K, max(collection.count(), 1)),
        where=where_filter,
        include=["documents", "distances"],
    )

    raw_docs = results.get("documents", [[]])[0] or []
    raw_dist = results.get("distances", [[]])[0] or []

    if not raw_docs:
        return []

    if len(raw_dist) != len(raw_docs):
        ranked = _rerank_by_keywords(raw_docs, [0.0] * len(raw_docs), keywords)
        return ranked[:RETRIEVAL_TOP_K]

    docs, dists = _filter_by_similarity(raw_docs, raw_dist)
    if not docs:
        docs, dists = raw_docs[:1], raw_dist[:1]

    ranked = _rerank_by_keywords(docs, dists, keywords)
    return ranked[:RETRIEVAL_TOP_K]


@app.post("/search")
async def search_documents(req: SearchRequest):
    try:
        documents = await asyncio.to_thread(_rbac_search, req.query, req.user_role)
        return {"results": documents}
    except Exception as e:
        logger.error(f"Error in search_documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during search")


_CLEAN_OUTPUT_MAX_LEN = 600


def clean_llm_output(text: str) -> str:
    """
    Normalize LLM text for /ask: take content after Answer:, drop prompt lines,
    keep first 1–2 sentences, and fall back if empty or messy.
    """
    fallback = "No relevant information found."
    if text is None:
        return fallback
    t = str(text).strip()
    if not t:
        return fallback

    # 1. Prefer everything after the last "Answer:" (case-insensitive, handles echoed prompt)
    if "Answer:" in t:
        t = t.split("Answer:")[-1].strip()
    elif re.search(r"(?i)answer\s*:", t):
        t = re.split(r"(?i)answer\s*:\s*", t)[-1].strip()

    # 2. Drop lines that are clearly prompt scaffolding
    line_markers = ("CONTEXT:", "QUESTION:", "INSTRUCTION:", "INSTRUCTIONS:", "---")
    kept: list[str] = []
    for line in t.splitlines():
        if any(m in line for m in line_markers):
            continue
        kept.append(line)
    t = " ".join(s.strip() for s in kept if s.strip())

    # 3. Keep only first 1–2 sentences
    t = t.strip()
    if not t:
        return fallback
    parts = re.split(r"(?<=[.!?])\s+", t)
    parts = [p.strip() for p in parts if p.strip()]
    if not parts:
        return fallback
    t = " ".join(parts[:2]).strip()

    # 4. Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()

    # 5. Reject if still too long or still looks like leaked prompt
    if len(t) > _CLEAN_OUTPUT_MAX_LEN:
        return fallback
    low = t.lower()
    if "context:" in low or "question:" in low:
        return fallback
    if "instruction:" in low or "instructions:" in low:
        return fallback
    if "---" in t:
        return fallback
    if not t:
        return fallback

    return t


def _build_ask_prompt(context: str, query: str) -> str:
    """Prompt for /ask: grounded, professional two-part answer when applicable."""
    return f"""---

CONTEXT:
{context}

QUESTION:
{query}

INSTRUCTIONS:

* Answer using the provided context only.
* If partial information is available, answer based on what is present.
* If nothing relevant is found, respond with exactly this sentence and nothing else: No relevant information found.
* When you have an answer: start with the direct answer in one clear sentence. You may add at most one short second sentence that supports or sources it (optional). Do not add a third sentence.
* Write in complete, professional sentences—no fragments, bullets, or broken phrasing.
* Example of good formatting: "The company's revenue is 200 crore INR in Q4. This information is sourced from financial reports."
* Do not hallucinate beyond context.

---

Answer:
"""


@app.post("/ask")
async def ask_question(req: SearchRequest):
    try:
        documents = await asyncio.to_thread(_rbac_search, req.query, req.user_role)
        # Non-empty chunks only; never call the LLM with empty context
        documents = [d for d in documents if d and str(d).strip()]
        if not documents:
            return {
                "answer": "No relevant information found.",
                "context_used": [],
            }

        context = _join_context_blocks(documents)
        prompt = _build_ask_prompt(context, req.query)

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={"model": "phi3", "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            
        raw = response.json().get("response", "") or ""
        answer = clean_llm_output(raw)
        return {"answer": answer, "context_used": documents}

    except httpx.ConnectError:
        logger.error("Could not connect to Ollama")
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with 'ollama serve'.",
        )
    except Exception as e:
        logger.error(f"Error in ask_question: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during ask")
