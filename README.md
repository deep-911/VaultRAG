# VaultRAG: Role-aware local RAG

[![CI](https://github.com/deep-911/VaultRAG/actions/workflows/ci.yml/badge.svg)](https://github.com/deep-911/VaultRAG/actions/workflows/ci.yml)

VaultRAG is a retrieval-augmented generation (RAG) stack for **private documents**: **FastAPI** + **ChromaDB** + **sentence-transformers** for retrieval, **Ollama** (e.g. **Phi-3**) for answers, and a **Next.js** chat UI. Metadata-based **Employee / Executive** scopes filter which chunks are retrieved.

**Important:** the demo UI toggles role on the client only. Treat the API as **unauthenticated** unless you add real auth for production.

## Features

- **Scoped retrieval:** Chroma metadata `role` + query filters (`Employee` vs `Employee` + `Executive`).
- **Local LLM:** configurable Ollama HTTP endpoint (default `phi3`).
- **Ingestion:** text upload, or PDF/CSV file upload (chunked, in-memory parse).
- **Refuse-to-answer:** skips the LLM when no chunks pass filters; output cleaning reduces prompt echo.
- **Frontend:** chat history (browser `localStorage`), optional TTS, PDF/CSV attach in Executive mode.

## Repository layout

| Path | Purpose |
|------|---------|
| `main.py` | FastAPI app, Chroma, embeddings, `/ask`, `/upload`, `/upload-file` |
| `requirements.txt` | Pinned Python dependencies |
| `vaultrag-frontend/` | Next.js 16 UI |
| `.github/workflows/ci.yml` | CI: Python syntax check + frontend lint/build |

Local data (not committed): `chroma_db/`, Hugging Face / torch caches as usual.

## Prerequisites

- **Python 3.10+**
- **Node.js 20+** (CI uses 20; 18+ may work)
- **Ollama** with a pulled model, e.g. `ollama pull phi3`

## Quickstart

### Backend

```bash
cd VaultRAG
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional: copy `.env.example` to `.env` and load it with your tooling, or export:

- `OLLAMA_URL` — default `http://localhost:11434/api/generate`

In another terminal:

```bash
ollama run phi3
```

### Frontend

```bash
cd vaultrag-frontend
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Point the UI at your API (default `http://127.0.0.1:8000`) or set `NEXT_PUBLIC_VAULTRAG_API_URL` (see `vaultrag-frontend/.env.example`).

## Configuration

| Variable | Where | Description |
|----------|--------|-------------|
| `OLLAMA_URL` | Backend | Ollama generate endpoint |
| `NEXT_PUBLIC_VAULTRAG_API_URL` | Frontend | Base URL for API (no trailing slash required) |

Upload limits are defined in `main.py` (`UPLOAD_MAX_BYTES`, `UPLOAD_MAX_CHUNKS`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
