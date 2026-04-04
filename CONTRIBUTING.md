# Contributing

Thanks for helping improve VaultRAG.

## Development setup

1. **Backend:** Python 3.10+, `pip install -r requirements.txt`, then `uvicorn main:app --reload --port 8000`.
2. **Frontend:** Node 20+ recommended, `cd vaultrag-frontend && npm ci && npm run dev`.
3. **Ollama:** Run a compatible model (e.g. `phi3`) for `/ask` responses.

Copy `.env.example` and `vaultrag-frontend/.env.example` if you need non-default URLs.

## Before you open a PR

- Run `npm run lint` and `npm run build` in `vaultrag-frontend`.
- Python: `python -m compileall -q main.py` (full app import downloads models; CI only checks syntax).
- Keep changes focused on one concern; avoid drive-by refactors.

## RBAC note

Role selection in the UI is a **demo**. Real deployments must authenticate users and enforce roles on the server.
