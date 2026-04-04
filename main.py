import csv
import json
import os
import re
import uuid
import logging
import asyncio
from io import BytesIO, StringIO

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
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
    documents: list[dict],
    distances: list[float],
) -> tuple[list[dict], list[float]]:
    """Remove very weak matches vs. the best hit; requires distances from Chroma."""
    if not documents:
        return [], []
    if not distances or len(distances) != len(documents):
        return documents, distances or [0.0] * len(documents)

    d0 = distances[0]
    kept_docs: list[dict] = []
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
    documents: list[dict],
    distances: list[float],
    keywords: list[str],
) -> list[dict]:
    """Prefer chunks that mention query terms (revenue, salary, …) when overlap exists."""
    if not documents:
        return []
    pairs: list[tuple[dict, float, int]] = []
    for doc, dist in zip(documents, distances):
        ov = _keyword_overlap_count(doc["text"], keywords)
        pairs.append((doc, dist, ov))

    if keywords:
        with_kw = [p for p in pairs if p[2] > 0]
        if with_kw:
            pairs = with_kw

    pairs.sort(key=lambda x: (-x[2], x[1]))
    out: list[dict] = []
    seen: set[str] = set()
    for doc, _, _ in pairs:
        text_val = doc.get("text", "")
        if text_val and text_val.strip() and text_val not in seen:
            seen.add(text_val)
            out.append(doc)
        if len(out) >= RETRIEVAL_TOP_K:
            break
    return out


def _join_context_blocks(documents: list[dict]) -> str:
    """Join retrieved docs with explicit separators for the LLM."""
    parts: list[str] = []
    for i, doc in enumerate(documents, start=1):
        filename = doc.get("source_document", f"Source {i}")
        parts.append(f"--- {filename} ---\n{doc['text'].strip()}")
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
    """Split long text into ~500 char chunks with a 100-character overlap sliding window."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    
    chunk_size = 500
    overlap = 100
    chunks = []
    start = 0
    n = len(text)
    
    while start < n:
        end = min(start + chunk_size, n)
        if end == n:
            piece = text[start:end].strip()
            if piece:
                chunks.append(piece)
            break
            
        cut = text.rfind(" ", start, end)
        if cut <= start:
            cut = end
            
        piece = text[start:cut].strip()
        if piece:
            chunks.append(piece)
            
        next_start = max(start + 1, cut - overlap)
        space_idx = text.find(" ", next_start, cut)
        if space_idx != -1:
            start = space_idx + 1
        else:
            start = next_start
            
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


class ChatHistoryItem(BaseModel):
    role: str       # "user" or "system"
    text: str


class SearchRequest(BaseModel):
    query: str
    user_role: str
    chat_history: list[ChatHistoryItem] = []

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
            metadatas=[{"role": req.role, "source_document": "Direct Upload"}],
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
        filename = file.filename or "unknown"
        metadatas = [{"role": UPLOAD_ROLE, "source_document": filename} for _ in chunks]

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


def _rbac_search(query: str, user_role: str) -> list[dict]:
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
        include=["documents", "distances", "metadatas"],
    )

    raw_texts = results.get("documents", [[]])[0] or []
    raw_dist = results.get("distances", [[]])[0] or []
    raw_meta = results.get("metadatas", [[]])[0] or []

    if not raw_texts:
        return []

    raw_docs = [{"text": t, "source_document": m.get("source_document", "Unknown Source") if m else "Unknown Source"} for t, m in zip(raw_texts, raw_meta)]

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




# --------------- Query Rewriter (conversational memory) ---------------

_REWRITE_PROMPT_TEMPLATE = """Given the following conversation history and a new user question, rewrite the user question into a single standalone search query that captures the full intent. Do NOT answer the question. Only output the rewritten query and nothing else.

CONVERSATION HISTORY:
{history}

LATEST USER QUESTION:
{question}

REWRITTEN STANDALONE QUERY:"""

MAX_HISTORY_TURNS = 4  # send at most 4 recent messages for rewriting


async def _rewrite_query_with_history(
    query: str,
    chat_history: list[ChatHistoryItem],
) -> str:
    """Use a fast LLM call to resolve pronouns / context from chat history."""
    if not chat_history:
        return query

    recent = chat_history[-MAX_HISTORY_TURNS:]
    history_text = "\n".join(
        f"{('User' if m.role == 'user' else 'Assistant')}: {m.text[:300]}"
        for m in recent
    )

    prompt = _REWRITE_PROMPT_TEMPLATE.format(
        history=history_text,
        question=query,
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                OLLAMA_URL,
                json={"model": "phi3", "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
        rewritten = (resp.json().get("response", "") or "").strip()
        # Basic sanity: if the LLM returned garbage or empty, fall back
        if rewritten and 10 < len(rewritten) < 500:
            logger.info("Query rewritten: %r -> %r", query, rewritten)
            return rewritten
    except Exception as exc:
        logger.warning("Query rewrite failed, using original query: %s", exc)

    return query


# --------------- Answer prompt builder ---------------

def _build_ask_prompt(context: str, query: str, chat_history: list[ChatHistoryItem] | None = None) -> str:
    """Prompt for /ask: grounded, professional two-part answer when applicable."""
    history_block = ""
    if chat_history:
        recent = chat_history[-MAX_HISTORY_TURNS:]
        lines = []
        for m in recent:
            label = "User" if m.role == "user" else "Assistant"
            lines.append(f"{label}: {m.text[:300]}")
        history_block = f"\nCONVERSATION HISTORY:\n" + "\n".join(lines) + "\n"

    return f"""---
{history_block}
CONTEXT:
{context}

QUESTION:
{query}

INSTRUCTIONS:

Answer the user's question using ONLY the provided CONTEXT. Never contradict the CONTEXT — pay close attention to negative statements like "no X" or "does not use Y". If the user asks for details, lists, or step-by-step explanations, provide a thorough, complete answer. Use the conversation history to understand follow-up questions. If the CONTEXT completely lacks the answer, state that the documents do not contain the information. DO NOT append any disclaimers, apologies, or missing-information warnings to the end of a valid answer. DO NOT cite sources, print filenames, or echo the raw context in your answer — the system UI handles citations automatically. Provide ONLY your answer. Give the answer and immediately stop generating.

---

Answer:
"""


_CONTEXT_STREAM_DELIMITER = "\n\n__VAULTRAG_CONTEXT__\n"


@app.post("/ask")
async def ask_question(req: SearchRequest):
    # --- Step 1 & 2 run before we return the StreamingResponse so
    #     validation / search errors become normal HTTP errors. ---
    try:
        search_query = req.query
        if req.chat_history:
            search_query = await _rewrite_query_with_history(
                req.query, req.chat_history
            )

        documents = await asyncio.to_thread(_rbac_search, search_query, req.user_role)
        documents = [d for d in documents if d and d.get("text", "").strip()]
    except Exception as e:
        logger.error(f"Error in ask_question pre-processing: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during ask")

    # --- No matching documents: short-circuit with a tiny stream ---
    if not documents:
        async def _empty_stream():
            yield "No relevant information found."
            yield _CONTEXT_STREAM_DELIMITER
            yield json.dumps([])

        return StreamingResponse(_empty_stream(), media_type="text/plain")

    # --- Step 3: Build prompt, then stream Ollama token-by-token ---
    context = _join_context_blocks(documents)
    prompt = _build_ask_prompt(context, req.query, req.chat_history or None)

    async def _llm_stream():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    OLLAMA_URL,
                    json={"model": "phi3", "prompt": prompt, "stream": True},
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("response", "")
                            if token:
                                yield token
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            logger.error("Could not connect to Ollama during streaming")
            yield "\n\n**Error:** Could not connect to Ollama. Start it with `ollama serve`."
        except Exception as e:
            logger.error(f"Streaming LLM error: {e}")
            yield f"\n\n**Error:** {e}"

        # --- Final chunk: source metadata for the frontend ---
        yield _CONTEXT_STREAM_DELIMITER
        yield json.dumps(documents)

    return StreamingResponse(_llm_stream(), media_type="text/plain")
