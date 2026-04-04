<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.135-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/ChromaDB-1.5-orange" />
  <img src="https://img.shields.io/badge/LLM-Phi--3_(Ollama)-blueviolet" />
  <img src="https://img.shields.io/badge/CUDA-GPU_Accelerated-76B900?logo=nvidia&logoColor=white" />
</p>

# VaultRAG — Project Architecture

> **Version:** 2.0 · **Last Updated:** April 5, 2026  
> **Authors:** Team VaultRAG · **Event:** Eclipse Hackathon 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Zero-Trust Security Layer](#4-zero-trust-security-layer)
5. [Scoped RBAC & Data Isolation](#5-scoped-rbac--data-isolation)
6. [The "Genius Retrieval" Pipeline](#6-the-genius-retrieval-pipeline)
7. [Asynchronous Document Ingestion](#7-asynchronous-document-ingestion)
8. [Network-Resilient Streaming Protocol](#8-network-resilient-streaming-protocol)
9. [Conversational Memory & Query Rewriting](#9-conversational-memory--query-rewriting)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Data Flow — End-to-End Sequence](#11-data-flow--end-to-end-sequence)
12. [Directory Structure](#12-directory-structure)
13. [Deployment & Operations](#13-deployment--operations)

---

## 1. Executive Summary

**VaultRAG** is a zero-trust, role-scoped Retrieval-Augmented Generation (RAG) system designed for enterprise document intelligence. It enables employees and executives to query an organization's internal knowledge base through natural language, with responses generated exclusively from authorized, locally-stored documents — **no data ever leaves the corporate perimeter**.

The system differentiates itself through five architectural pillars:

| Pillar | Capability |
|---|---|
| **Zero-Trust Auth** | Dual-token Bearer authentication enforced at the API gateway layer via FastAPI dependency injection |
| **Scoped RBAC** | Physical data isolation at the vector database level — unauthorized roles are *blind* to restricted documents |
| **Genius Retrieval** | GPU-accelerated Cross-Encoder semantic reranking eliminates hallucination by discarding low-relevance chunks |
| **Async Ingestion** | Non-blocking, memory-safe file processing with 25 MB limits and 1 MB chunked reads |
| **Resilient Streaming** | Token-by-token HTTP streaming with a custom delimiter protocol for source-metadata delivery |

---

## 2. System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      Next.js 16 / React 19                            │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌─────────┐  │  │
│  │  │  Header   │ │ InputBar  │ │ChatWindow│ │HistoryPanel│ │ Modals  │  │  │
│  │  └──────────┘ └─────┬─────┘ └────┬─────┘ └────────────┘ └─────────┘  │  │
│  │                     │            │                                     │  │
│  │              ┌──────┴────────────┴───────┐                            │  │
│  │              │     vaultragApi.ts         │   ◄── Streaming consumer   │  │
│  │              │  (Bearer token injection)  │       + source extraction  │  │
│  │              └───────────┬────────────────┘                            │  │
│  └──────────────────────────┼─────────────────────────────────────────────┘  │
│                             │ HTTPS / fetch (ReadableStream)                 │
└─────────────────────────────┼────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   CORS Middleware  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┼────────────────────────────────────────────────┐
│                     FastAPI Backend (main.py)                                │
│                              │                                               │
│            ┌─────────────────▼──────────────────┐                            │
│            │    HTTPBearer Dependency Gate       │                            │
│            │  verify_token() → role: str         │                            │
│            └──────┬────────────────────┬────────┘                            │
│                   │                    │                                      │
│         ┌─────────▼─────┐    ┌────────▼────────┐                             │
│         │  POST /ask    │    │ POST /upload-file│                             │
│         │  (streaming)  │    │ (async ingest)   │                             │
│         └───────┬───────┘    └────────┬─────────┘                            │
│                 │                     │                                       │
│    ┌────────────▼────────┐   ┌────────▼───────────────┐                      │
│    │  _rbac_search()     │   │ BackgroundTasks         │                      │
│    │  + Cross-Encoder    │   │ _process_and_store_file │                      │
│    │    reranking         │   └────────┬───────────────┘                      │
│    └────────┬────────────┘            │                                      │
│             │                         │                                      │
│    ┌────────▼─────────────────────────▼──────────┐                           │
│    │          ChromaDB (PersistentClient)         │                           │
│    │           collection: vault_docs             │                           │
│    │     Metadata: { role, source_document }      │                           │
│    └──────────────────────────────────────────────┘                           │
│                                                                              │
│    ┌────────────────────┐    ┌────────────────────────┐                       │
│    │ SentenceTransformer│    │   CrossEncoder          │                      │
│    │ all-MiniLM-L6-v2   │    │ ms-marco-MiniLM-L-6-v2 │                      │
│    │     (GPU/CPU)       │    │       (GPU/CPU)         │                      │
│    └────────────────────┘    └────────────────────────┘                       │
│                                                                              │
│    ┌────────────────────────────────────────────┐                             │
│    │         Ollama (phi3 model)                │                             │
│    │   localhost:11434/api/generate             │                             │
│    │   (streaming token generation)            │                             │
│    └────────────────────────────────────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Backend

| Component | Technology | Version | Purpose |
|---|---|---|---|
| API Framework | FastAPI | 0.135.1 | Async HTTP server with OpenAPI docs |
| ASGI Server | Uvicorn | 0.42.0 | Production-grade ASGI process |
| Vector Database | ChromaDB | 1.5.5 | Persistent embedding storage with metadata filtering |
| Embedding Model | `all-MiniLM-L6-v2` | — | 384-dim dense vector embeddings (SentenceTransformers) |
| Reranker | `ms-marco-MiniLM-L-6-v2` | — | Cross-Encoder for pairwise relevance scoring |
| LLM | Phi-3 (via Ollama) | — | Local-only language model for answer generation |
| PDF Parser | pypdf | 6.9.1 | In-memory PDF text extraction |
| HTTP Client | httpx | 0.28.1 | Async streaming client for Ollama communication |
| GPU Acceleration | PyTorch (CUDA) | — | Automatic GPU offload for embedding + reranking |

### Frontend

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.2.2 | Server/client React framework |
| UI Library | React | 19.2.4 | Component-based UI with hooks |
| Styling | Vanilla CSS + CSS Variables | — | Theme-aware design system with glassmorphism |
| Icons | Lucide React | 1.7.0 | Consistent icon system |
| Markdown | react-markdown | 10.1.0 | Rich rendering of LLM responses |
| Animations | Framer Motion + CSS keyframes | — | Micro-interactions and ambient effects |
| Typography | Inter (Google Fonts) | — | Premium variable font |

---

## 4. Zero-Trust Security Layer

VaultRAG implements a **Zero-Trust authentication model** where every API request must present a valid Bearer token. There is no session state, no cookie-based auth, and no implicit trust — every request is validated independently.

### 4.1 Dual-Token Architecture

The system defines exactly **two** scoped Bearer tokens, each mapping to a distinct organizational role:

| Token Value | Role | Access Scope |
|---|---|---|
| `eclipse-vault-2026` | **Executive** | Full access — can query all documents (Employee + Executive) and ingest new files |
| `vault-member-2026` | **Employee** | Restricted — can only query Employee-tagged documents and ingest files tagged to their scope |

These tokens are loaded from environment variables (`EXECUTIVE_SECRET_TOKEN`, `EMPLOYEE_SECRET_TOKEN`) at server startup. **If either variable is missing, the server terminates immediately** with a critical error (see `main.py:28-30`) — this is a fail-closed security posture.

### 4.2 FastAPI Dependency Injection Gate

Authentication is implemented as a **FastAPI dependency** using the `Depends()` mechanism, ensuring it is structurally impossible for a developer to accidentally create an unprotected endpoint:

```python
_bearer_scheme = HTTPBearer()

_TOKEN_ROLE_MAP = {
    EXECUTIVE_SECRET_TOKEN: "Executive",
    EMPLOYEE_SECRET_TOKEN: "Employee",
}

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """Scoped RBAC gate: return the role associated with the Bearer token."""
    role = _TOKEN_ROLE_MAP.get(credentials.credentials)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized - Invalid Token",
        )
    return role
```

**Key design decisions:**

- **`HTTPBearer()` as the scheme**: FastAPI automatically rejects requests lacking a `Bearer <token>` header with a `403 Forbidden` before the handler even runs.
- **O(1) token lookup**: The `_TOKEN_ROLE_MAP` dictionary provides constant-time token validation.
- **Role as return value**: The `verify_token` dependency returns the authenticated *role string* (`"Executive"` or `"Employee"`), which downstream handlers use directly for RBAC filtering. This prevents role spoofing — even if a malicious client sends `user_role: "Executive"` in the request body, the `/ask` endpoint uses the **token-derived role** for data retrieval (see `main.py:550`).

### 4.3 Frontend Token Injection

The frontend API layer (`vaultragApi.ts`) maps the user's selected role to the correct Bearer token before every request:

```typescript
const EXECUTIVE_TOKEN = "eclipse-vault-2026";
const EMPLOYEE_TOKEN  = "vault-member-2026";

function getAuthHeaders(role: UserRole): Record<string, string> {
  const token = role === "Executive" ? EXECUTIVE_TOKEN : EMPLOYEE_TOKEN;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
```

This dual-mapping ensures the token is **the single source of truth** for authorization — the backend never trusts client-supplied role fields for access control.

### 4.4 CORS Enforcement

Cross-Origin Resource Sharing is restricted to the configured frontend origin only:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    ...
)
```

---

## 5. Scoped RBAC & Data Isolation

VaultRAG implements **physical data isolation** at the vector database layer. This is not application-level filtering applied after retrieval — it is a **`WHERE` clause injected into the ChromaDB query itself**, meaning unauthorized documents are never loaded into memory, never scored, and never visible to the requesting role.

### 5.1 How Metadata Tagging Works

Every document chunk stored in ChromaDB carries a `role` metadata field set at ingestion time:

```python
metadatas = [{"role": token_role, "source_document": filename} for _ in chunks]
```

The `token_role` is derived from the Bearer token used during upload — **not** from the request body. This means:
- Files uploaded with `eclipse-vault-2026` are tagged `role: "Executive"`
- Files uploaded with `vault-member-2026` are tagged `role: "Employee"`

### 5.2 Query-Time Role Filtering

The `_rbac_search()` function constructs a **role-scoped ChromaDB `where` filter** based on the authenticated role:

```python
def _rbac_search(query: str, user_role: str) -> list[dict]:
    if user_role == "Employee":
        where_filter = {"role": "Employee"}            # ← Employees see ONLY Employee docs
    else:
        where_filter = {"role": {"$in": ["Employee", "Executive"]}}  # ← Executives see ALL docs

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(RETRIEVAL_FETCH_K, max(collection.count(), 1)),
        where=where_filter,      # ◄── Physical isolation at the DB level
        include=["documents", "metadatas"],
    )
```

### 5.3 Isolation Guarantees

| Scenario | Employee Token | Executive Token |
|---|---|---|
| Employee-tagged documents | ✅ Visible | ✅ Visible |
| Executive-tagged documents | ❌ **Physically blind** | ✅ Visible |
| Upload tagging | Tagged as `Employee` | Tagged as `Executive` |
| Role spoofing via body | ❌ Ignored — token-derived role used | ❌ Ignored — token-derived role used |

The critical anti-spoofing line in the `/ask` endpoint:

```python
# Use the token-derived role for RBAC (not the request body) to
# prevent role spoofing.
documents = await asyncio.to_thread(_rbac_search, search_query, token_role)
```

This means even if a client sends `{"user_role": "Executive"}` with an Employee token, the search will only return Employee-scoped documents.

---

## 6. The "Genius Retrieval" Pipeline

VaultRAG employs a **two-stage retrieval architecture** that dramatically improves answer relevance compared to naive similarity search. This pipeline is the core differentiator for eliminating hallucinations.

### 6.1 Architecture Overview

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│  Stage 1: Bi-Encoder Retrieval      │
│  Model: all-MiniLM-L6-v2 (GPU)     │
│  Action: Encode query → 384-dim     │
│  ChromaDB: Fetch top 15 candidates  │
│  Filter: RBAC where clause applied  │
└──────────────┬──────────────────────┘
               │ 15 candidate chunks
               ▼
┌─────────────────────────────────────┐
│  Stage 2: Cross-Encoder Reranking   │
│  Model: ms-marco-MiniLM-L-6-v2     │
│  Action: Score each (query, chunk)  │
│          pair with full attention   │
│  Device: CUDA GPU (auto-detected)   │
│  Output: Relevance scores (float)   │
└──────────────┬──────────────────────┘
               │ sorted by score desc
               ▼
┌─────────────────────────────────────┐
│  Stage 3: Top-K Selection           │
│  Select top 5 highest-scoring       │
│  chunks for context assembly        │
└──────────────┬──────────────────────┘
               │ 5 grounded chunks
               ▼
        LLM Prompt Assembly
```

### 6.2 Stage 1 — Bi-Encoder Candidate Fetch

The first stage uses the **`all-MiniLM-L6-v2`** Sentence Transformer model to encode the user's query into a 384-dimensional dense vector. This vector is compared against all role-scoped document embeddings in ChromaDB using cosine similarity.

```python
RETRIEVAL_FETCH_K = 15  # Intentionally over-fetch for reranking headroom

query_embedding = embedding_model.encode(query).tolist()
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=min(RETRIEVAL_FETCH_K, max(collection.count(), 1)),
    where=where_filter,
    include=["documents", "metadatas"],
)
```

**Why 15?** — Bi-encoder models sacrifice precision for speed. By fetching 15 candidates instead of the final 5, we give the higher-accuracy Cross-Encoder a rich candidate pool to rescore, significantly reducing false negatives.

### 6.3 Stage 2 — Cross-Encoder Semantic Reranking

The Cross-Encoder **`ms-marco-MiniLM-L-6-v2`** receives each `(query, candidate_chunk)` pair and scores them using **full self-attention** — unlike the Bi-Encoder which encodes query and document independently. This produces dramatically more accurate relevance judgments.

```python
cross_encoder_model = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2",
    device="cuda" if torch.cuda.is_available() else "cpu"
)

# In _rbac_search():
pairs = [[query, doc["text"]] for doc in raw_docs]
scores = cross_encoder_model.predict(pairs)

scored_docs = list(zip(raw_docs, scores))
scored_docs.sort(key=lambda x: x[1], reverse=True)
```

**GPU acceleration** is critical here — scoring 15 pairs on a CUDA GPU takes ~10ms; on CPU it would take ~200ms. The model is loaded once at startup and kept in VRAM for the server's lifetime.

### 6.4 Stage 3 — Top-K Selection

After reranking, only the **top 5** highest-scoring chunks are selected for prompt assembly:

```python
RETRIEVAL_TOP_K = 5

return [doc for doc, score in scored_docs][:RETRIEVAL_TOP_K]
```

### 6.5 Grounded Prompt Engineering

Retrieved chunks are assembled into a strictly-grounded prompt that instructs the LLM to:
- Answer **exclusively** from the provided context
- Never contradict the context (respecting negative statements like "no X" or "does not use Y")
- Synthesize information across multiple chunks when applicable
- Refuse to answer when context is insufficient — rather than hallucinating
- **Not** cite sources (the frontend UI handles citation display automatically)

```python
INSTRUCTIONS:
Answer the user's question using ONLY the provided CONTEXT. Never contradict the CONTEXT —
pay close attention to negative statements like "no X" or "does not use Y". If the CONTEXT
completely lacks the answer, state that the documents do not contain the information.
DO NOT append any disclaimers, apologies, or missing-information warnings to the end of a
valid answer. DO NOT cite sources, print filenames, or echo the raw context in your answer —
the system UI handles citations automatically.
```

---

## 7. Asynchronous Document Ingestion

VaultRAG's ingestion pipeline is designed for **production-grade safety**: it prevents memory exhaustion, avoids blocking the API event loop, and supports PDF, CSV, and TXT file formats.

### 7.1 Upload Endpoint Architecture

```
Client (multipart/form-data)
    │
    ▼
POST /upload-file
    │
    ├── 1. Bearer Token Verification (verify_token dependency)
    │      → Returns token_role: "Executive" | "Employee"
    │
    ├── 2. Chunked File Reading (1 MB per iteration)
    │      while chunk := await file.read(1024 * 1024):
    │          raw_buffer.extend(chunk)
    │          if len(raw_buffer) > 25 MB:
    │              → HTTP 413 Request Entity Too Large
    │
    ├── 3. File Type Detection (_detect_file_kind)
    │      → Checks extension, MIME type, and magic bytes (%PDF header sniff)
    │      → Supported: PDF, CSV, TXT
    │      → Unsupported: HTTP 400
    │
    ├── 4. Background Task Dispatch
    │      background_tasks.add_task(_process_and_store_file, ...)
    │      → HTTP 202 Accepted (immediate response to client)
    │
    └── Client receives 202 — UI is unblocked
```

### 7.2 Memory Safety: The 25 MB Guard

The file is read in **1 MB chunks** from the upload stream, with a running size check:

```python
UPLOAD_MAX_BYTES = 25 * 1024 * 1024  # 25 MiB

raw_buffer = bytearray()
while chunk := await file.read(1024 * 1024):  # 1 MB chunks
    raw_buffer.extend(chunk)
    if len(raw_buffer) > UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {UPLOAD_MAX_BYTES // (1024 * 1024)} MiB)",
        )
```

**Why 1 MB chunks?** — Reading the entire file into memory at once (via `file.read()`) risks OOM on large uploads. The 1 MB stride provides early rejection: a 100 MB file is rejected after reading only 25 MB, not after loading the full payload.

### 7.3 Background Processing Pipeline

Once the HTTP response is returned, `_process_and_store_file` runs asynchronously:

```
_process_and_store_file(raw, filename, token_role, kind)
    │
    ├── 1. Text Extraction
    │      PDF → pypdf PdfReader (in-memory, no disk I/O)
    │      CSV → csv.reader (row cells joined by " | ")
    │      TXT → UTF-8 decode with error replacement
    │
    ├── 2. Sliding Window Chunking
    │      Chunk size: 500 characters
    │      Overlap: 100 characters
    │      → Preserves cross-boundary context
    │      → Max 2,000 chunks per file (guard against pathological inputs)
    │
    ├── 3. Batch Embedding
    │      embedding_model.encode(chunks)  # GPU-accelerated batch
    │
    └── 4. ChromaDB Storage
           collection.add(ids, documents, embeddings, metadatas)
           metadatas: [{role: token_role, source_document: filename}, ...]
```

### 7.4 Sliding Window Chunking Detail

The chunking strategy uses a **500-character window with 100-character overlap** to prevent information loss at chunk boundaries:

```python
def _split_into_chunks(text: str) -> list[str]:
    chunk_size = 500
    overlap = 100
    chunks = []
    start = 0

    while start < n:
        end = min(start + chunk_size, n)
        cut = text.rfind(" ", start, end)   # Break at word boundary
        if cut <= start:
            cut = end

        piece = text[start:cut].strip()
        if piece:
            chunks.append(piece)

        # Slide back by overlap amount for context continuity
        next_start = max(start + 1, cut - overlap)
        ...
```

The overlap ensures that if a fact spans a chunk boundary, at least one chunk will contain the complete information.

### 7.5 Supported File Types

| Format | Detection Method | Extraction Strategy |
|---|---|---|
| **PDF** | `.pdf` extension, `application/pdf` MIME, `%PDF` magic bytes | `pypdf.PdfReader` — in-memory, per-page text extraction |
| **CSV** | `.csv` extension, `text/csv` MIME | `csv.reader` — each row joined with ` \| ` separators |
| **TXT** | `.txt` extension, `text/plain` MIME | UTF-8 decode with `errors="replace"` for safety |

---

## 8. Network-Resilient Streaming Protocol

VaultRAG implements a **custom streaming protocol** over standard HTTP that delivers LLM tokens in real-time while appending structured source metadata at stream-end, using a single uninterrupted connection.

### 8.1 The Delimiter Protocol

The backend stream consists of two logical sections separated by a deterministic delimiter:

```
┌──────────────────────────────────────────────────────────┐
│  Section 1: LLM Answer Tokens                           │
│  "The quarterly revenue increased by 15% compared..."   │
│  (streamed token-by-token from Ollama)                   │
├──────────────────────────────────────────────────────────┤
│  DELIMITER: "\n\n__VAULTRAG_CONTEXT__\n"                 │
├──────────────────────────────────────────────────────────┤
│  Section 2: Source Metadata (JSON)                       │
│  [{"text":"...","source_document":"Q4_Report.pdf"},...]  │
└──────────────────────────────────────────────────────────┘
```

**Backend implementation** (`main.py:569-598`):

```python
_CONTEXT_STREAM_DELIMITER = "\n\n__VAULTRAG_CONTEXT__\n"

async def _llm_stream():
    # Stream Ollama tokens one by one
    async with client.stream("POST", OLLAMA_URL, json={...}) as resp:
        async for line in resp.aiter_lines():
            chunk = json.loads(line)
            token = chunk.get("response", "")
            if token:
                yield token

    # After all LLM tokens, yield the delimiter + source JSON
    yield _CONTEXT_STREAM_DELIMITER
    yield json.dumps(documents)

return StreamingResponse(_llm_stream(), media_type="text/plain")
```

### 8.2 Frontend Stream Parser

The frontend (`vaultragApi.ts:60-153`) implements a **state-machine parser** that handles the delimiter protocol with resilience to arbitrary chunk boundaries:

```
┌─────────────────┐
│  STREAMING STATE │
│                  │
│  Read chunks via │
│  reader.read()   │
│        │         │
│        ▼         │
│  Accumulate into │
│  fullText buffer │
│        │         │
│        ▼         │
│  ┌──────────────────────────────────┐
│  │ Delimiter found in buffer?       │
│  │                                  │
│  │  NO ──► Emit text up to          │
│  │         (buffer.length - delim.  │
│  │          length) chars           │
│  │         ↑ Safe zone: prevents    │
│  │           partial delimiter      │
│  │           emission               │
│  │                                  │
│  │  YES ──► Emit remaining answer   │
│  │          text before delimiter.  │
│  │          Set delimiterFound=true  │
│  │          Continue reading to      │
│  │          collect full JSON.       │
│  └──────────────────────────────────┘
│        │
│        ▼
│  Stream ends (done=true)
│        │
│        ▼
│  Extract JSON after delimiter
│  Parse as ContextSnippet[]
│  Call callbacks.onContext()
│  Call callbacks.onDone()
└─────────────────┘
```

**Critical safety mechanism** — the parser holds back the last `CONTEXT_DELIMITER.length` characters from emission to avoid displaying a partial delimiter to the user:

```typescript
// Emit text safely — hold back delimiter-length chars to avoid
// emitting a partial delimiter that we'd later need to retract.
const safeUpTo = fullText.length - CONTEXT_DELIMITER.length;
if (safeUpTo > emittedLength) {
  callbacks.onToken(fullText.slice(emittedLength, safeUpTo));
  emittedLength = safeUpTo;
}
```

### 8.3 Callback Interface

The streaming consumer exposes four lifecycle callbacks:

```typescript
export type StreamCallbacks = {
  onToken:   (token: string) => void;    // Each visible text fragment
  onContext: (context: ContextSnippet[]) => void;  // Source metadata
  onDone:    () => void;                 // Stream completed successfully
  onError:   (error: Error) => void;     // Connection or parse failure
};
```

The main page (`page.tsx`) wires these to React state updates:
- **`onToken`** → Appends text to the streaming message bubble (real-time typing effect)
- **`onContext`** → Attaches source documents to the message for citation rendering
- **`onDone`** → Marks the message as complete (removes cursor animation)
- **`onError`** → Converts the streaming placeholder to an error message

---

## 9. Conversational Memory & Query Rewriting

VaultRAG supports **multi-turn conversations** where follow-up questions like *"What about last quarter?"* are automatically resolved against chat history.

### 9.1 Query Rewrite Pipeline

When chat history exists, the system uses a **dedicated LLM call** to rewrite the user's query into a standalone search query:

```
User: "What is our revenue?"          → Search: "What is our revenue?"
User: "How about last quarter?"       → Search: "What was the revenue last quarter?"
User: "Compare it to competitors"     → Search: "Compare our revenue to competitors"
```

**Implementation** (`main.py:462-496`):

```python
_REWRITE_PROMPT_TEMPLATE = """Given the following conversation history and a new
user question, rewrite the user question into a single standalone search query
that captures the full intent. Do NOT answer the question. Only output the
rewritten query and nothing else.

CONVERSATION HISTORY:
{history}

LATEST USER QUESTION:
{question}

REWRITTEN STANDALONE QUERY:"""
```

- The rewrite uses the last **4 conversation turns** (`MAX_HISTORY_TURNS = 4`)
- Each history entry is truncated to 300 characters to stay within context limits
- If the rewrite call fails (timeout, Ollama down), the **original query is used** as a graceful fallback
- Sanity check: rewritten queries must be between 10–500 characters, otherwise the original is kept

### 9.2 Frontend History Management

Conversations are persisted to `localStorage` and organized by session:

```typescript
// page.tsx — Conversation state
const [conversations, setConversations] = useState<
  { id: number; title: string; messages: ChatMessage[]; createdAt: string }[]
>([]);
```

The last 4 messages are sent to the backend with each `/ask` request as `chat_history`.

---

## 10. Frontend Architecture

### 10.1 Component Hierarchy

```
RootLayout (layout.tsx)
 └─ ThemeProvider (ThemeContext.jsx)
     └─ App (page.tsx) — Main state orchestrator
         ├─ AmbientBackground — Animated CSS gradient backdrop
         ├─ CursorOrbs — Mouse-following visual effects
         ├─ HistoryPanel — Collapsible sidebar with conversation list
         │   ├─ New Chat button
         │   └─ Conversation items (select / delete)
         ├─ Header
         │   ├─ Sidebar toggle (Sparkles → PanelLeft on hover)
         │   ├─ Role badge (EMPLOYEE / EXECUTIVE)
         │   ├─ Settings button → SettingsModal
         │   └─ Profile button → ProfileModal
         ├─ SearchingAnimation — Full-screen particle wave effect during search
         ├─ ChatWindow
         │   ├─ WelcomeState (when no messages)
         │   │   └─ Quick prompt suggestion pills
         │   ├─ Message bubbles (user / system)
         │   │   ├─ ReactMarkdown rendering
         │   │   ├─ Streaming cursor animation
         │   │   └─ SourceSnippet citations (expandable)
         │   └─ TypingIndicator
         └─ InputBar
             ├─ File attachment (PDF, CSV, TXT)
             ├─ Voice input (Web Speech API)
             ├─ TTS toggle
             ├─ Role switcher dropdown (Employee ↔ Executive)
             └─ Send button
```

### 10.2 Key Components

| Component | File | Responsibility |
|---|---|---|
| **App** | `page.tsx` | Root state: conversations, active role, streaming lifecycle, file uploads |
| **ChatWindow** | `ChatWindow.tsx` | Message rendering with auto-scroll, welcome state, markdown formatting |
| **InputBar** | `InputBar.tsx` | Text input, file attachment, voice recognition, role switching |
| **SourceSnippet** | `SourceSnippet.tsx` | Expandable source citation cards with document name and chunk text |
| **HistoryPanel** | `HistoryPanel.tsx` | Sidebar conversation list with CRUD operations |
| **SearchingAnimation** | `SearchingAnimation.tsx` | Particle wave animation during query processing |
| **Header** | `Header.tsx` | App branding, role indicator, settings/profile access |
| **SettingsModal** | `SettingsModal.tsx` | Multi-tab settings: General, Appearance, Notifications, Privacy, Advanced |
| **ProfileModal** | `ProfileModal.tsx` | User profile view with avatar and account details |
| **ThemeContext** | `ThemeContext.jsx` | Dark/light theme state with localStorage persistence |

### 10.3 State Management

The application uses **React hooks exclusively** (no external state library):

| State | Location | Persistence |
|---|---|---|
| Conversations list | `page.tsx` → `useState` | `localStorage` (`vaultrag_conversations`) |
| Active conversation ID | `page.tsx` → `useState` | In-memory (selected session) |
| User role | `page.tsx` → `useState` | In-memory |
| Streaming status | `page.tsx` → `useState` (`isTyping`) | In-memory |
| Theme | `ThemeContext.jsx` | `localStorage` (`vaultrag-theme`) |
| Attached files | `page.tsx` → `useState` | In-memory |
| TTS enabled | `page.tsx` → `useState` | In-memory |

### 10.4 Text-to-Speech Integration

When TTS is enabled, completed system messages are automatically spoken using the **Web Speech API**:

```typescript
const utterance = new SpeechSynthesisUtterance(cleanText);
// Prefer female voices: Zira, Samantha, or Google US English
utterance.rate = 1.05;
utterance.pitch = 1.1;
utterance.lang = 'en-US';
window.speechSynthesis.speak(utterance);
```

---

## 11. Data Flow — End-to-End Sequence

### 11.1 Query Flow (POST /ask)

```
1. User types query in InputBar
   │
2. page.tsx::handleSend() fires
   ├─ Creates user ChatMessage
   ├─ Uploads any attached files (parallel)
   ├─ Creates empty streaming system message placeholder
   │
3. vaultragApi.ts::askVaultRagStream()
   ├─ Injects Bearer token based on selected role
   ├─ POST /ask with {query, user_role, chat_history}
   │
4. FastAPI: verify_token() dependency
   ├─ Extracts Bearer token from Authorization header
   ├─ Maps token → role via _TOKEN_ROLE_MAP
   ├─ Returns role string (or 401)
   │
5. Query Rewriting (if chat_history exists)
   ├─ Builds rewrite prompt with last 4 turns
   ├─ Calls Ollama (stream=false) for standalone query
   │
6. _rbac_search(search_query, token_role)
   ├─ Encodes query with all-MiniLM-L6-v2 (GPU)
   ├─ ChromaDB query: 15 candidates, RBAC where filter
   ├─ Cross-Encoder reranking: ms-marco-MiniLM-L-6-v2 (GPU)
   ├─ Returns top 5 chunks
   │
7. Prompt Assembly
   ├─ _join_context_blocks() — "--- filename ---\n{text}"
   ├─ _build_ask_prompt() — grounding instructions + context + query
   │
8. Ollama Streaming
   ├─ POST to Ollama with stream=true
   ├─ Yield tokens one-by-one via StreamingResponse
   │
9. Delimiter + Source Metadata
   ├─ Yield "\n\n__VAULTRAG_CONTEXT__\n"
   ├─ Yield JSON array of source documents
   │
10. Frontend Stream Parser
    ├─ onToken → updates streaming message text
    ├─ onContext → attaches source citations
    ├─ onDone → marks message complete
    │
11. ChatWindow renders:
    ├─ ReactMarkdown for formatted answer
    ├─ SourceSnippet cards for each citation
    └─ TTS speaks the answer (if enabled)
```

### 11.2 Upload Flow (POST /upload-file)

```
1. User clicks paperclip in InputBar
   ├─ Selects PDF, CSV, or TXT file
   │
2. page.tsx::handleSend() detects attached files
   ├─ Calls uploadExecutiveFile(file, role)
   │
3. vaultragApi.ts::uploadExecutiveFile()
   ├─ Creates FormData with file
   ├─ Injects Bearer token for current role
   ├─ POST /upload-file (multipart/form-data)
   │
4. FastAPI: verify_token() → token_role
   │
5. Chunked Reading (1 MB per read)
   ├─ Accumulates into raw_buffer
   ├─ Rejects if > 25 MB (HTTP 413)
   │
6. File Type Detection
   ├─ Extension → MIME → Magic bytes fallback
   ├─ Unsupported → HTTP 400
   │
7. Background Task Dispatch
   ├─ background_tasks.add_task(_process_and_store_file, ...)
   ├─ Returns HTTP 202 Accepted immediately
   │
8. Background: _process_and_store_file()
   ├─ Extract text (pypdf / csv.reader / UTF-8 decode)
   ├─ Sliding window chunking (500 chars, 100 overlap)
   ├─ Batch embedding (all-MiniLM-L6-v2, GPU)
   ├─ Store in ChromaDB with role metadata
   └─ Log success/failure
```

---

## 12. Directory Structure

```
VaultRAG/
├── main.py                          # FastAPI backend (601 lines)
├── requirements.txt                 # Pinned Python dependencies
├── .env.example                     # Environment variable template
├── chroma_db/                       # ChromaDB persistent storage (auto-created)
│   └── (SQLite + parquet files)
│
├── PROJECT_ARCHITECTURE.md          # This document
├── README.md                        # Getting started guide
├── CONTRIBUTING.md                  # Contribution guidelines
├── SECURITY.md                      # Security policy
├── LICENSE                          # MIT License
│
└── vaultrag-frontend/               # Next.js 16 application
    ├── app/
    │   ├── layout.tsx               # Root layout (Inter font, ThemeProvider)
    │   ├── page.tsx                 # Main application (state orchestrator)
    │   ├── error.tsx                # Global error boundary
    │   └── globals.css              # Design system (CSS variables, themes)
    ├── components/
    │   ├── AmbientBackground.tsx    # Animated gradient backdrop
    │   ├── ChatWindow.tsx           # Message list + welcome state
    │   ├── CursorOrbs.tsx           # Mouse-following visual effects
    │   ├── ExecutiveUnlockModal.tsx  # Executive role unlock UI
    │   ├── Header.tsx               # App header with role badge
    │   ├── HistoryPanel.tsx         # Sidebar conversation history
    │   ├── InputBar.tsx             # Input + attachments + voice + role
    │   ├── ProfileModal.tsx         # User profile modal
    │   ├── SearchingAnimation.tsx   # Particle wave during search
    │   ├── SettingsModal.tsx        # Multi-tab settings panel
    │   └── SourceSnippet.tsx        # Expandable source citation card
    ├── lib/
    │   ├── vaultragApi.ts           # API layer (auth, streaming, upload)
    │   └── chatTypes.ts             # TypeScript interfaces
    ├── context/
    │   └── ThemeContext.jsx          # Dark/light theme provider
    ├── package.json                  # Frontend dependencies
    └── next.config.ts                # Next.js configuration
```

---

## 13. Deployment & Operations

### 13.1 Prerequisites

| Requirement | Minimum | Recommended |
|---|---|---|
| Python | 3.11 | 3.12 |
| Node.js | 18 | 20+ |
| NVIDIA GPU | — | CUDA-capable GPU for 10x faster reranking |
| Ollama | v0.1+ | Latest, with `phi3` model pulled |
| RAM | 8 GB | 16 GB (model + ChromaDB) |

### 13.2 Quick Start

```bash
# 1. Clone and set up backend
cd VaultRAG
pip install -r requirements.txt

# 2. Set environment variables
export EXECUTIVE_SECRET_TOKEN="eclipse-vault-2026"
export EMPLOYEE_SECRET_TOKEN="vault-member-2026"
export OLLAMA_URL="http://localhost:11434/api/generate"

# 3. Start Ollama with Phi-3
ollama serve &
ollama pull phi3

# 4. Launch backend
uvicorn main:app --host 0.0.0.0 --port 8000

# 5. Launch frontend
cd vaultrag-frontend
npm install
npm run dev
```

### 13.3 API Endpoints

| Method | Path | Auth | Response | Description |
|---|---|---|---|---|
| `GET` | `/health` | No | `200 JSON` | Liveness probe |
| `GET` | `/db-status` | No | `200 JSON` | Document count in ChromaDB |
| `POST` | `/upload` | No | `200 JSON` | Direct text upload (legacy) |
| `POST` | `/upload-file` | **Bearer** | `202 JSON` | Async file ingestion (PDF/CSV/TXT) |
| `POST` | `/search` | No | `200 JSON` | Direct vector search (no LLM) |
| `POST` | `/ask` | **Bearer** | `200 Stream` | RAG query with streaming response |

### 13.4 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `EXECUTIVE_SECRET_TOKEN` | **Yes** | — | Bearer token for Executive role |
| `EMPLOYEE_SECRET_TOKEN` | **Yes** | — | Bearer token for Employee role |
| `OLLAMA_URL` | No | `http://localhost:11434/api/generate` | Ollama API endpoint |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS allowed origin |
| `NEXT_PUBLIC_VAULTRAG_API_URL` | No | `http://127.0.0.1:8000` | Backend URL for frontend |

---

<p align="center">
  <strong>VaultRAG</strong> · Eclipse Hackathon 2026 · Zero-Trust Enterprise RAG
</p>
