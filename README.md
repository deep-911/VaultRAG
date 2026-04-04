# 🔒 VaultRAG: Secure Role-Based Knowledge Base

VaultRAG is an advanced Retrieval-Augmented Generation (RAG) system built to securely index and answer queries across your private documents. It enforces strict Role-Based Access Control (RBAC), ensuring that users only receive answers generated from documents they are authorized to see.

## 🌟 Key Features

*   **Role-Based Access Control (RBAC):** Native support for `Employee` and `Executive` roles. Documents uploaded via "Executive mode" are invisible to standard employee queries.
*   **Fully Private LLM Backend:** Utilizes a local instance of the **Phi-3** model via Ollama. No data is sent to external API providers.
*   **Async High-Performance Pipeline:** Embedding creation (`all-MiniLM-L6-v2`) and ChromaDB vector queries are handled asynchronously utilizing `httpx` and `asyncio` to ensure the FastAPI server never blocks.
*   **Intelligent Refuse-to-Answer:** The system intelligently declines to respond when no matching vector chunks meet similarity thresholds or bypass RBAC filters. 
*   **Persistent & Type-Safe UI:** A sleek, glassmorphic Next.js UI using local browser storage for persistent chat history and secure Typescript mappings.

## 🚀 Quickstart

### 1. Prerequisites 
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** installed locally (running with `phi3`).

### 2. Backend Setup
```bash
cd VaultRAG
# Install dependencies
pip install -r requirements.txt

# Start Ollama service (in a separate terminal)
ollama run phi3

# Start FastAPI backend
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd vaultrag-frontend
# Install Node dependencies
npm install

# Start Next.js Development Server
npm run dev
```
Navigate to `http://localhost:3000` to start querying your secure local knowledge base!

## 📄 License & Attribution
Designed for performance, privacy, and team collaboration.
