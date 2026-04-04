# VaultRAG

**Hackathon Problem Statement Addressed:**
> **EC604 - Knowledge Retrieval:** Designing solutions that enable efficient discovery and retrieval of relevant knowledge across enterprise systems while maintaining context.

## 📖 Overview

**VaultRAG** is a secure, role-based Retrieval-Augmented Generation (RAG) system built for the enterprise. It allows users to ask questions over private documents and receive grounded, reliable answers without sending sensitive data to external AI providers. 

The application utilizes a robust architecture featuring a local vector database for semantic search and an entirely local LLM (Phi-3) for generation. It implements Role-Based Access Control (RBAC), ensuring that Employees only see Employee-level data, while Executives can upload new documents (PDF/CSV) and query across the entire organization's knowledge base.

## 🛠️ Tech Stack

- **Frontend:** Next.js (React 19), Tailwind CSS
- **Backend:** FastAPI, Python
- **Database:** ChromaDB (Persistent SQLite vector store)
- **Embeddings:** SentenceTransformers (`all-MiniLM-L6-v2`)
- **LLM Engine:** Ollama (running Microsoft's `phi3`)

---

## ⚠️ CRITICAL REQUIREMENT: OLLAMA & PHI-3

**For the AI generation to work, you MUST have Ollama installed locally and run the Phi-3 model.** VaultRAG does not use external APIs for chat generation; it relies entirely on your local machine.

1. **Install Ollama:** Download and install from [ollama.com](https://ollama.com/).
2. **Download and Run Phi-3:** Open your terminal and run the following command. Keep it running in the background.

```bash
ollama run phi3
```

---

## 🚀 Getting Started

To run VaultRAG locally, you will need to start three separate processes: Ollama (described above), the FastAPI backend, and the Next.js frontend.

### 1. Start the FastAPI Backend (Port 8000)

The backend handles document chunking, embedding generation, ChromaDB vector searches, and communication with Ollama.

Open a terminal in the root directory of the project:

```bash
# Optional: Create and activate a virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install the Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn main:app --reload
```
*The backend will now be running at http://localhost:8000. It will automatically create the `./chroma_db` directory on first run.*

### 2. Start the Next.js Frontend (Port 3000)

The frontend provides a modern chat interface with role selection and document upload capabilities.

Open a **new** terminal, navigate to the frontend directory, and start the development server:

```bash
# Navigate to the frontend directory
cd vaultrag-frontend

# Install Node dependencies
npm install

# Start the Next.js development server
npm run dev
```

### 3. Open the Application

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**. 

- Use the **Header** to toggle between Employee and Executive roles.
- Switch to the **Executive** role to drag-and-drop PDF or CSV files into the input bar for ingestion.
- Start asking questions!

---

## 📚 Architecture Deep Dive

Curious about how the pieces fit together? Check out our comprehensive [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) document at the root of the repository for an in-depth look at our data flows, RBAC implementations, and API schemas.
