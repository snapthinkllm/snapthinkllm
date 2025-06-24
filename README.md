

# Getting started

UI for Snapthinkllm 

1. Clone the repo
2. Run: npm install
3. Run: npm run build
4. Run: npm run dev


Features list: 
1. 
2. Model selector
3. Add new model and Download model from ollama
4. See download progress and cancel midway

⚠️ Notes
You must have Ollama CLI installed and in PATH (should work fine from terminal).

Make sure your app has permissions to spawn processes (it does by default).



# 📋 SnapThink LLM – Feature Summary

## ✅ Core Features

| Feature | Description |
|--------|-------------|
| 💬 **Chat Interface** | Clean, ChatGPT-like UI with markdown rendering, timestamps, and message roles (user vs assistant). |
| 🧠 **Model Selector Screen** | Lets user choose from a list of known models (e.g., LLaMA, Mistral, Gemma, etc.) based on system VRAM/RAM compatibility. |
| ⌨️ **Input + Send Message** | Message input box with enter-to-send and send button. |
| 📤 **API Integration** | Uses Ollama's `/api/chat` endpoint to communicate with LLMs locally. |

---

## 💾 Chat Session Management

| Feature | Description |
|--------|-------------|
| 📁 **Save Chats to Disk** | Saves each chat session to a JSON file in userData folder. |
| 📋 **List Sessions** | Sidebar shows all past chat sessions, with their custom names. |
| ✏️ **Rename Sessions** | Renames sessions via a manifest (`chats.json`). |
| 🗑️ **Delete Sessions** | Permanently deletes a chat and removes from manifest. |

---

## 🧠 Model Handling

| Feature | Description |
|--------|-------------|
| 📦 **Pull Model** | Downloads models using `ollama pull <model>`. |
| 📊 **Progress Modal** | Shows a download progress bar with status updates. |
| ❌ **Cancel Download** | Gracefully cancels a model download mid-way. |
| ✅ **Done Button** | Appears once model is fully downloaded. |

---

## 🎨 Markdown + Custom Tags

| Feature | Description |
|--------|-------------|
| 📄 **Markdown Support** | Messages support GitHub-flavored markdown (GFM) with raw HTML. |
| 💭 **<think> Rendering** | Wraps `<think>...</think>` blocks in a highlighted bubble with an icon. |
| 🧱 **Error Boundary Fix** | Prevents crash when invalid markdown is rendered. |

---

## 🧰 Developer Enhancements

| Feature | Description |
|--------|-------------|
| ⚙️ **Electron Integration** | Communicates between renderer and Node backend (preload + ipcMain). |
| 📂 **Show Folder in Explorer** | Opens chat folder in system file browser. |
| 🌗 **Dark Mode Toggle** | Switches between light and dark themes and persists in localStorage. |

---

## 🛠️ In Progress / Upcoming

| Feature | Description |
|--------|-------------|
| 🔄 **Dynamic Progress Feedback** | For large model downloads, possibly replacing static progress bar with streaming lines. |
| 📁 **Import/Export Chat** | To back up, share, or migrate chats via JSON. |
| 🧾 **Known Models Externalized** | Plan to move model list into a separate, persistent config file (JSON or JS). |
| 📚 **Long Document Summarization** | Coming up — summarize multi-page inputs in segments. |

