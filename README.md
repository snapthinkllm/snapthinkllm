# 🚀 SnapThink LLM – Local AI Chat App

SnapThink is a powerful local chat UI powered by [Ollama](https://ollama.com) and Electron. It supports model management, chat session history, markdown rendering, document summarization, and retrieval-augmented generation (RAG) – all locally on your machine.

---

## 🧰 Getting Started

1. **Clone the repo**
2. `npm install`
3. `npm run build`
4. `npm run dev`

⚠️ You must have **[Ollama](https://ollama.com/download)** CLI installed and available in your system PATH.

---

## ✅ Features Overview

### 💬 Core Chat Features

| Feature | Description |
|--------|-------------|
| 💡 **Chat Interface** | ChatGPT-style UI with markdown, role tags, timestamps |
| ⌨️ **Input Box** | Text input with enter-to-send and button controls |
| 📤 **Local LLM API** | Uses `ollama`'s `/api/chat` endpoint |
| 🌗 **Dark Mode** | Toggleable theme, stored in localStorage |

---

### 💾 Chat Session Management

| Feature | Description |
|--------|-------------|
| 📁 **Save/Load Chats** | Each session saved as JSON under `userData/chats` |
| 📋 **Sidebar with Sessions** | Displays named chats with rename + delete support |
| 📝 **Rename Session** | Edits `chats.json` manifest file |
| 🗑️ **Delete Session** | Removes chat + manifest entry |
| 📤 **Export / 📥 Import Chat** | Backup and restore individual chat sessions |

---

### 🧠 Model Management

| Feature | Description |
|--------|-------------|
| 📦 **Model Selector Screen** | Shows known models + hardware recommendations |
| 📥 **Pull Models from Ollama** | Use custom model names (e.g., `mistral:7b-instruct`) |
| ⏳ **Download Progress Modal** | Tracks and displays status with cancel support |
| 🔄 **Cancel and resume download** |  next download with resumes where previous one left|
| ✅ **Downloaded Models Listing** | Separates downloaded models from suggested ones |
| ⚠️ **Manual Override** | Allows selecting incompatible models |
| 🧠 **Hardware Detection** | Auto-detects RAM/VRAM via `systeminformation` |

---

### 🧾 Document Summarization

| Feature | Description |
|--------|-------------|
| 📄 **PDF Parsing** | Reads and parses PDFs using `pdf-parse` |
| 🧩 **Chunking** | Splits large docs into manageable pieces |
| 🧠 **Summarization** | Summarizes each chunk locally using LLM |
| 📊 **Session Integration** | Injects summary into current chat |

---

### 🔍 Retrieval-Augmented Generation (RAG)

| Feature | Description |
|--------|-------------|
| 📂 **Per-Session Document Indexing** | Uploaded files are chunked and embedded |
| 🧠 **Contextual Answers** | Matched chunks are passed to prompt |
| 📄 **Show Sources Toggle** | Collapsible "Sources" section under answers |
| 🔒 **Session Isolation** | Document context is scoped to each session |

---

## 🛠 Developer Notes

| Feature | Description |
|--------|-------------|
| ⚙️ **Electron Integration** | Secure `ipcMain` + `preload.cjs` bridge |
| 📂 **Open Chat Folder** | Shows folder in file explorer |
| 🔄 **Model List Parsing** | Compatible with older Ollama CLI via fallback |
| 🛠 **Pluggable Model Registry** | Easily expand model list with JSON/JS config |

---

## 🧪 Roadmap

- [ ] Multi-file RAG per session
- [ ] Model config editor UI
- [ ] Settings panel (GPU usage, system caps)
- [ ] Export full chat history

---

## 📎 Notes

- Models are stored and served locally via Ollama.
- This app doesn't send any data to the internet unless the LLM model you're using does so (e.g., community-created models).
- All features run 100% offline.



Generate Exe:
npm install --save-dev electron-builder 
npm run build
npm run dist