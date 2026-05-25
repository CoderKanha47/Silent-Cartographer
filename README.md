# 🛰️ Silent Cartographer

A self-contained, locally focused supply chain compliance system. **Silent Cartographer** takes in logistics documentation (invoice, manifest, bill of lading) using OCR technology and utilizes a stand-alone, local LLM to analyze the data for any discrepancies regarding the cargo's weight.

## 🚀 Key Features

* **Local Inference:** Fully private document analysis utilizing Ollama and Qwen 2.5 3B. No third-party cloud API leaks.
* **Multi-Format Ingestion:** Seamless processing of raw text, JPGs, and scanned multi-page PDFs.
* **Deterministic Weight Verification:** Cross-references stated metrics across independent logistics sheets to detect anomalies.
* **Containerized Infrastructure:** Unified environment orchestration managed via Docker Compose.

## 🛠️ The Architecture

[Document Ingest] ➔ [OCR Processing Layer] ➔ [Local LLM Engine] ➔ [Compliance Matrix Result]

### Tech Stack
* **Frontend:** React, TypeScript, Tailwind CSS
* **Database & Storage:** Supabase (Local/Self-hosted Docker instances)
* **AI Orchestration:** Ollama + Qwen 2.5 3B
* **Environment:** Docker

## 📦 Local Setup Instructions

### Prerequisites
* Docker & Docker Compose installed
* Ollama installed locally with the Qwen 2.5 3B model pulled (`ollama run qwen2.5:3b`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/silent-cartographer.git](https://github.com/YOUR_USERNAME/silent-cartographer.git)
   cd silent-cartographer