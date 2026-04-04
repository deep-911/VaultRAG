# Security

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Contact the repository maintainers privately (e.g. GitHub Security Advisories for this repo, if enabled).

## Product context

VaultRAG is intended for **trusted local or private-network** use:

- The API does not ship with end-user authentication; `user_role` is supplied by the client.
- ChromaDB data under `chroma_db/` may contain sensitive text from ingested documents—protect filesystem access and backups.
- Use environment-specific CORS and network binding when exposing any HTTP service beyond localhost.

## Supply chain

- Pin Python dependencies in `requirements.txt` and review updates (including Dependabot PRs).
- Run `npm audit` in `vaultrag-frontend` periodically.
