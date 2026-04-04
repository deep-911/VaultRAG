# VaultRAG: Zero-Trust Private Document Intelligence 🔐 

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

VaultRAG is an enterprise-grade Retrieval-Augmented Generation (RAG) system built from the ground up for strict environments where sensitive intellectual property cannot leave the local network. 

## 🚨 The Core Problem
Most modern AI tools require organizations to ship proprietary data to third-party cloud SaaS products via web APIs. In heavily regulated industries (Finance, Legal, Healthcare, Executive Management), throwing confidential documents over the wall is totally unacceptable. Even internal RAG solutions often struggle with granular access—engineers gain access to executive payroll data simply because an embedding matched their query.

## 🛡️ The Solution
VaultRAG keeps your data yours. It is a completely **local, GPU-accelerated RAG pipeline** enforcing **Scoped Role-Based Access Control (RBAC)** down to the vector chunk level. Every document uploaded is strictly tagged with its organizational scope. Every user question is securely authenticated and isolated against the vector database, guaranteeing that an `Employee` can never accidentally (or maliciously) extract `Executive` intelligence.

## 🚀 Technical Deep Dive (The Architecture)

VaultRAG isn't a naive wrapper—it is heavily hardened for enterprise scalability and accuracy.

- **Genius Retrieval Ecosystem:** We abandoned naive keyword matching and standard vector similarity boundaries for neural relevancy. By pre-fetching top candidates from ChromaDB and piping them through a live, GPU-accelerated **Cross-Encoder Model (`ms-marco-MiniLM-L-6-v2`)**, we dynamically rerank document hits to calculate absolute relevancy scores, eliminating context hallucinations.
- **Asynchronous OOM-Protected Ingestion:** To prevent catastrophic `Out-Of-Memory` faults during heavy traffic, file parsing relies on chunked buffer reads bounded safely beneath 25MB limits. Process-heavy embedding blocks are entirely stripped out of the HTTP thread and securely offloaded to FastAPI `BackgroundTasks`. 
- **Zero-Trust Bearer Authentication:** Built entirely on Zero-Trust principles via strict `HTTPBearer` authorization. The backend requires verified tokens—refusing any fallback state or wildcard CORS vulnerabilities.
- **Bi-Modal Streaming Pipeline:** The application doesn't just read an LLM stream; it multiplexes one. Text tokens stream immediately to the frontend to guarantee minimal Time-to-First-Token (TTFT), followed by a JSON payload cleanly delivering exact citation metadata.

## 🛠️ Setup Guide

Get VaultRAG up and running securely on your local network in minutes.

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **Ollama** (running locally with `phi3` installed: `ollama run phi3`)

### 2. Backend Initialization (FastAPI)
```bash
# 1. Navigate to the backend root
cd VaultRAG

# 2. Setup your virtual environment
python -m venv venv
source venv/bin/activate  # (or `venv\Scripts\activate` on Windows)

# 3. Install requirements
pip install -r requirements.txt

# 4. Set secure environment variables and launch
export EXECUTIVE_SECRET_TOKEN="your-secure-executive-token"
export EMPLOYEE_SECRET_TOKEN="your-secure-employee-token"
export FRONTEND_URL="http://localhost:3000"

python -m uvicorn main:app --port 8000
```

### 3. Frontend Initialization (Next.js)
```bash
# 1. Navigate to the frontend directory
cd VaultRAG/vaultrag-frontend

# 2. Install dependencies
npm install

# 3. Ensure the backend URL is pointing to port 8000 inside an .env file
# NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000

# 4. Start the development server
npm run dev
```

### 4. Authenticate & Ask
Open your browser to `http://localhost:3000`. Utilize the tokens you strictly defined in step 2 to perform authenticated, scoped queries. Let your private data talk without leaving the machine.
