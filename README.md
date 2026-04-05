<div align="center">

# 🔐 VaultRAG

### Zero-Trust Private Document Intelligence

*Your enterprise knowledge. Your hardware. Your rules. No data ever leaves.*

<br/>

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![ChromaDB](https://img.shields.io/badge/ChromaDB-1.5-FF6F00?style=for-the-badge)
![Phi-3](https://img.shields.io/badge/LLM-Phi--3_(Ollama)-7C3AED?style=for-the-badge)
![CUDA](https://img.shields.io/badge/CUDA-GPU_Accelerated-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)

<br/>

[📖 Architecture Doc](#-full-architecture) · [🚀 Quick Start](#-quick-start) · [🧑‍⚖️ Judge's Guide](#%EF%B8%8F-judges-testing-guide)

</div>

---

## 🎯 The Problem

> **Every time an employee pastes a contract into ChatGPT, your company's IP walks out the front door.**

Enterprises sit on mountains of sensitive documents — financials, HR policies, legal contracts, strategic roadmaps. Employees need to *search* this knowledge, but existing solutions force a terrible choice:

| Option | Risk |
|---|---|
| Public LLMs (ChatGPT, Gemini) | 🚩 Confidential data sent to third-party servers |
| Traditional search (Elasticsearch) | 😐 Keyword matching — no understanding, no synthesis |
| Cloud RAG (Azure AI, AWS Bedrock) | 💸 Expensive, vendor lock-in, data still in the cloud |

## 💡 The VaultRAG Solution

**VaultRAG is a fully local, zero-trust RAG system** that keeps 100% of your data on your own hardware. It uses a local Phi-3 LLM via Ollama, stores embeddings in a local ChromaDB instance, and enforces role-based access at the *physical database layer* — not as an afterthought.

```
📄 Your Documents ──► 🧠 Local Embeddings ──► 🔒 Role-Scoped ChromaDB ──► 🤖 Local Phi-3 LLM ──► ✅ Answer
                      (all-MiniLM-L6-v2)      (never leaves your SSD)      (Ollama, on your GPU)
```

**Nothing is sent to any external server. Ever.**

---

## ⚡ Core Features — The Five Pillars

### 🛡️ 1. Dual-Token Zero-Trust Authentication
Every API request must carry a valid Bearer token. Two scoped tokens map to two organizational roles — no sessions, no cookies, no implicit trust. If the token is missing or invalid, the request is **dead on arrival**.

```
Executive Token: eclipse-vault-2026  →  Full document access
Employee Token:  vault-member-2026   →  Restricted to Employee-only docs
```

### 🔒 2. Scoped RBAC with Physical Data Isolation
This is not app-level filtering. The role is injected as a **`WHERE` clause directly into the ChromaDB vector query**. If you're an Employee, Executive documents are never loaded into memory, never scored, never returned. You are *physically blind* to them.

```python
# Employee: sees ONLY their tier
where_filter = {"role": "Employee"}

# Executive: sees everything
where_filter = {"role": {"$in": ["Employee", "Executive"]}}
```

### 🧠 3. "Genius Retrieval" — Cross-Encoder Reranking
Naive similarity search returns garbage. VaultRAG uses a **two-stage pipeline**:

| Stage | Model | Action |
|---|---|---|
| 1. Bi-Encoder | `all-MiniLM-L6-v2` | Fetch 15 candidate chunks from ChromaDB |
| 2. Cross-Encoder | `ms-marco-MiniLM-L-6-v2` | Rerank all 15 with full self-attention on GPU |
| 3. Selection | — | Keep only the **top 5** most relevant chunks |

Result: dramatically better answers, near-zero hallucination.

### 📦 4. Async, Memory-Safe Document Ingestion
Upload PDF, CSV, or TXT files up to 25 MB. The file is read in **1 MB chunks** (early rejection for oversized files), then processing is handed to a **FastAPI BackgroundTask** — the UI gets an instant `HTTP 202 Accepted` and never blocks.

```
Upload ──► 1MB chunked read ──► 25MB guard ──► HTTP 202 ──► Background: extract → chunk → embed → store
```

### 🌊 5. Network-Resilient Custom Streaming Protocol
LLM tokens stream to the browser **one-by-one** for a real-time typing effect. Source metadata is delivered after the answer via a custom `__VAULTRAG_CONTEXT__` delimiter — the frontend parser handles arbitrary chunk boundaries with a safe-zone buffer.

```
[LLM tokens...] → "\n\n__VAULTRAG_CONTEXT__\n" → [{"text":"...","source_document":"Report.pdf"}]
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| Ollama | Latest ([download](https://ollama.com)) |
| NVIDIA GPU | Recommended (CUDA) — CPU works but slower |

### Step 1: Clone the Repository

```bash
git clone https://github.com/deep-911/VaultRAG.git
cd VaultRAG
```

### Step 2: Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Install Ollama & Pull the Model

If you are setting this up on a clean machine, open **PowerShell** and install Ollama via the official command:

```powershell
irm https://ollama.com/install.ps1 | iex
```
After installation of ollama proceed below
In a **separate terminal**:

```bash
ollama serve
```

```bash
ollama pull phi3
```

> ⏳ The `phi3` model is ~2.3 GB. This only needs to be done once.

### Step 4: Launch the FastAPI Backend

Open a **new PowerShell terminal** in the project root and run:

```powershell
$env:EXECUTIVE_SECRET_TOKEN="eclipse-vault-2026"; $env:EMPLOYEE_SECRET_TOKEN="vault-member-2026"; python -m uvicorn main:app --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 5: Launch the Next.js Frontend

Open **another terminal**:

```bash
cd vaultrag-frontend
npm install
npm run dev
```

### Step 6: Open the App 🎉

Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser. You're in.

---

## 🧑‍⚖️ Judge's Testing Guide

### The "Shadow Filter" Test — Proving Physical Data Isolation

This 3-step test demonstrates that VaultRAG's RBAC is **not cosmetic** — Employee users are physically incapable of seeing Executive documents, even when asking directly about their content.

#### Step 1: Upload as Executive 📤

1. In the bottom bar, switch your role to **Executive** (shield icon).
2. Click the **📎 paperclip** button and upload any PDF, CSV, or TXT file.
   - Example: a file named `Q4_Financials.pdf` containing revenue data.
3. The system will respond with `"Ingestion started in the background."` — wait a few seconds for processing.
4. Ask: **"What are the key financial figures?"**
5. ✅ You should receive a detailed, sourced answer with citations from your uploaded document.

#### Step 2: Switch to Employee & Ask the Same Question 🔄

1. Switch your role to **Employee** in the bottom bar.
2. Ask the **exact same question**: **"What are the key financial figures?"**
3. 🚫 **Result:** `"No relevant information found."` — the Employee token's ChromaDB query physically excludes Executive-tagged documents. The data was never loaded, never scored, never visible.

#### Step 3: Verify the Asymmetry ✅

| Action | Executive | Employee |
|---|---|---|
| See Executive documents | ✅ Full access | ❌ Physically blind |
| See Employee documents | ✅ Full access | ✅ Full access |
| Upload files | ✅ Tagged as Executive | ✅ Tagged as Employee |

> 💡 **Why this matters:** Unlike traditional systems that filter results *after* retrieval, VaultRAG's `WHERE` clause means restricted documents are never even queried. There is no data to leak.

---

## 🏗️ Architecture At a Glance

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js 16 Frontend                      │
│   InputBar → vaultragApi.ts → Streaming Parser → ChatWindow│
│                  (Bearer token injection)                    │
└────────────────────────┬───────────────────────────────────┘
                         │ fetch (ReadableStream)
┌────────────────────────▼───────────────────────────────────┐
│                   FastAPI Backend                           │
│                                                             │
│   verify_token()  ──►  _rbac_search()  ──►  Ollama (phi3) │
│   (Zero-Trust)        (RBAC + Rerank)     (Local LLM)      │
│                           │                                 │
│                    ChromaDB (local)                          │
│               {role, source_document}                       │
└─────────────────────────────────────────────────────────────┘
```

> 📖 For the complete deep-dive — security model, retrieval pipeline internals, streaming protocol, and component maps — see **[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)**.

---

## 📁 Project Structure

```
VaultRAG/
├── main.py                      # FastAPI backend (auth, RBAC, retrieval, streaming)
├── requirements.txt             # Pinned Python dependencies
├── chroma_db/                   # Persistent vector database (auto-created)
├── PROJECT_ARCHITECTURE.md      # Detailed architecture document
│
└── vaultrag-frontend/           # Next.js 16 / React 19
    ├── app/
    │   ├── page.tsx             # Main app (state orchestrator)
    │   ├── layout.tsx           # Root layout (fonts, theme)
    │   └── globals.css          # Full design system
    ├── components/              # 11 React components
    │   ├── ChatWindow.tsx       # Message rendering + markdown
    │   ├── InputBar.tsx         # Input + voice + attachments
    │   ├── SourceSnippet.tsx    # Expandable source citations
    │   └── ...
    └── lib/
        ├── vaultragApi.ts       # API layer (auth, streaming, upload)
        └── chatTypes.ts         # TypeScript interfaces
```

---

## 🛠️ API Reference

| Method | Endpoint | Auth | Status | Description |
|---|---|---|---|---|
| `GET` | `/health` | — | `200` | Liveness check |
| `GET` | `/db-status` | — | `200` | Document count in ChromaDB |
| `POST` | `/ask` | 🔐 Bearer | `200` (stream) | RAG query with streaming LLM response |
| `POST` | `/upload-file` | 🔐 Bearer | `202` | Async file ingestion (PDF/CSV/TXT) |
| `POST` | `/search` | — | `200` | Direct vector search (no LLM) |

---

## 👥 Team VaultRAG

Built with 🔥 for the **Eclipse Hackathon 2026**.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**VaultRAG** — *Because your data deserves better than a third-party API.*

</div>
