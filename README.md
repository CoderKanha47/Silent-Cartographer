# 🛰️ Silent Cartographer

A fully local, self-contained supply chain verification engine. Silent Cartographer ingests international logistics documentation (commercial invoices, entry bills, manifests) and uses a local LLM pipeline to cross-examine data points, catching weight, value, or tracking discrepancies instantly before they hit the ledger.

## 🚀 Key Features

* 100% Private Local Inference: Runs document extraction completely offline using Ollama and qwen2.5-coder:3b; No data ever leaves your machine.
* In-Memory Cross-Examination: Bypasses disk-write bottlenecks by streaming file content straight into runtime memory for parallel parameter auditing.
* Smart Discrepancy Flagging: Automatically extracts and cross-references key metrics (weights, values, reference IDs) across independent documents to catch shipping anomalies.
* Dockerized Setup: Entire environment (frontend, database schemas, API routing) spins up locally via Docker and Supabase CLI.

## 🛠️ The Architecture

[Document Upload] ➔ [In-Memory Text Extraction] ➔ [Local Qwen Extraction] ➔ [Cross-Check Audit Matrix] ➔ [UI Status Dashboard]

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
