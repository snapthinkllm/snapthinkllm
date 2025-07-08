const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { dialog } = require('electron');
const si = require('systeminformation');
const pdfParse = require('pdf-parse');

// -------------------- Create window --------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'icons', 'snapthink-logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.setMenu(null);

  if (false) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// -------------------- Chat directory setup --------------------
const chatsDir = path.join(app.getPath('userData'), 'chats');
const manifestFile = path.join(chatsDir, 'chats.json');

if (!fs.existsSync(chatsDir)) fs.mkdirSync(chatsDir);

function loadManifest() {
  try {
    if (fs.existsSync(manifestFile)) {
      return JSON.parse(fs.readFileSync(manifestFile));
    }
  } catch (e) {
    console.error('Failed to read chat manifest:', e);
  }
  return {};
}

function saveManifest(data) {
  try {
    fs.writeFileSync(manifestFile, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write chat manifest:', e);
  }
}

function stripAnsi(input) {
  return input
    .replace(/\u001b\[.*?[@-~]/g, '')   // ESC[
    .replace(/\u001b\?.*?[hl]/g, '')    // ESC?
    .replace(/\r/g, '');                // carriage returns
}

// -------------------- IPC Chat handlers --------------------
ipcMain.on('save-chat', (e, { id, messages = [] }) => {
  try {
    const chatDir = path.join(chatsDir, id);
    fs.mkdirSync(chatDir, { recursive: true });

    const filePath = path.join(chatDir, 'chat.json');

    let existing = { messages: [], docs: [] };
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    const updated = {
      ...existing,
      messages, // replace messages
      // keep docs as-is
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    console.log(`✅ Saved chat "${id}" with ${messages.length} messages (docs preserved: ${existing.docs?.length || 0})`);
  } catch (err) {
    console.error(`❌ Error saving chat (${id}):`, err);
  }
});

ipcMain.handle('load-chat', (e, id) => {
  try {
    console.log(`🔄 Loading chat ${id}...`, chatsDir);
    const filePath = path.join(chatsDir, id, 'chat.json');
    if (fs.existsSync(filePath)) {
      const chat = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        messages: Array.isArray(chat.messages) ? chat.messages : [],
        docs: Array.isArray(chat.docs) ? chat.docs : [],
      };
    }
  } catch (e) {
    console.error(`❌ Error loading chat (${id}):`, e);
  }

  // Fallback: always return a valid shape
  return { messages: [], docs: [] };
});



ipcMain.handle('list-chats', () => {
  try {
    const manifestPath = path.join(chatsDir, 'chats.json');
    const manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      : {};

    const chatIds = fs.readdirSync(chatsDir).filter(f => {
      const stat = fs.statSync(path.join(chatsDir, f));
      return stat.isDirectory();
    });

    return chatIds.map((id) => {
      const chatPath = path.join(chatsDir, id, 'chat.json');
      let docs = [];
      let name = manifest[id] || id;  // ✅ Prefer manifest name

      if (fs.existsSync(chatPath)) {
        const chatData = JSON.parse(fs.readFileSync(chatPath));
        docs = chatData.docs || [];
      }

      console.log(`📂 Loaded chat "${id}" with ${docs.length} docs and name "${name}"`);
      return { id, name, docs };
    });
  } catch (e) {
    console.error('❌ Error listing chats:', e);
    return [];
  }
});


ipcMain.handle('rename-chat', (event, { id, name }) => {
  try {
    const manifest = loadManifest();
    manifest[id] = name;
    saveManifest(manifest);
    return { success: true };
  } catch (err) {
    console.error(`Error renaming chat (${id}):`, err);
    throw err;
  }
});

ipcMain.on('show-chat-folder', () => {
  shell.openPath(chatsDir);
});


ipcMain.handle('delete-chat', async (event, chatId) => {
  try {
    const dirPath = path.join(chatsDir, chatId);

    if (fs.existsSync(dirPath)) {
      // Recursively delete the entire chat directory
      fs.rmSync(dirPath, { recursive: true, force: true });
    }

    // Also remove from manifest if used
    const manifest = loadManifest();
    delete manifest[chatId];
    saveManifest(manifest);

    return { success: true };
  } catch (err) {
    console.error(`❌ Error deleting chat (${chatId}):`, err);
    throw err;
  }
});


// -------------------- Model Download --------------------
let currentPullProcess = null;

ipcMain.handle('download-model', async (event, model) => {
  return new Promise((resolve, reject) => {
    console.log(`[ollama] Downloading model: ${model}`);
    currentPullProcess = spawn('ollama', ['pull', model]);
    const webContents = event.sender;

    currentPullProcess.stdout.on('data', (data) => {
      const raw = data.toString();
      const clean = stripAnsi(raw).trim();
      const lines = clean.split('\n');
      const progressLine = lines.find(line => line.includes('pulling') && line.includes('%')) || clean;
      const percentMatch = progressLine.match(/(\d+(\.\d+)?)%/);
      const progress = percentMatch ? parseFloat(percentMatch[1]) : null;

      webContents.send('model-status', {
        model,
        status: 'downloading',
        detail: progressLine,
        progress,
      });
    });

    currentPullProcess.stderr.on('data', (data) => {
      const message = stripAnsi(data.toString().trim());
      console.log(`[ollama stderr] ${message}`);
      webContents.send('model-status', {
        model,
        status: 'downloading',
        detail: message,
      });
    });

    currentPullProcess.on('close', (code) => {
      currentPullProcess = null;
      if (code === 0) {
        console.log(`[ollama] ${model} download complete`);
        webContents.send('model-status', { model, status: 'done' });
        resolve({ success: true });
      } else {
        console.error(`[ollama] Download failed with code ${code}`);
        webContents.send('model-status', { model, status: 'error' });
        reject(new Error('Download failed'));
      }
    });
  });
});



function parseSizeToGB(sizeStr) {
  const size = parseFloat(sizeStr);
  if (sizeStr.includes('MB')) return +(size / 1024).toFixed(2);
  if (sizeStr.includes('GB')) return +size.toFixed(2);
  return null;
}

function parseOllamaList(output) {
  const lines = output.trim().split('\n');
  const dataLines = lines.slice(1);
  return dataLines.map(line => {
    const parts = line.trim().split(/\s{2,}/);
    const [name, id, size] = parts;
    return {
      name,
      id,
      sizeRaw: size,
      sizeInGB: parseSizeToGB(size)
    };
  });
}

ipcMain.handle('get-downloaded-models', async () => {
  return new Promise((resolve, reject) => {
    const list = spawn('ollama', ['list']);
    let output = '';

    list.stdout.on('data', data => {
      output += data.toString();
    });

    list.stderr.on('data', data => {
      console.error('[ollama stderr]', data.toString());
    });

    list.on('close', code => {
      if (code === 0) {
        try {
          resolve(parseOllamaList(output));
        } catch (err) {
          resolve([]);
        }
      } else {
        reject(new Error(`ollama list failed with code ${code}`));
      }
    });
  });
});

ipcMain.handle('get-hardware-info', async () => {
  try {
    const mem = await si.mem();
    const gpu = await si.graphics();

    const ramGB = Math.round(mem.total / 1024 ** 3);
    const vramGB = gpu.controllers.reduce((acc, g) => {
      const vram = g.vram || 0;
      return Math.max(acc, +(vram / 1024).toFixed(2));
    }, 0);

    return { ram: ramGB, vram: vramGB };
  } catch (e) {
    return { ram: 0, vram: 0 };
  }
});

ipcMain.on('cancel-download', () => {
  if (currentPullProcess) {
    currentPullProcess.kill();
    currentPullProcess = null;
    console.log('Download cancelled.');
  }
});

ipcMain.handle('export-chat', async (event, chatId) => {
    const filePath = path.join(chatsDir, chatId, 'chat.json'); // ✅ fixed path
    if (!fs.existsSync(filePath)) return { success: false };

    const data = fs.readFileSync(filePath, 'utf-8');
    const { canceled, filePath: exportPath } = await dialog.showSaveDialog({
      defaultPath: `${chatId}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!canceled && exportPath) {
      fs.writeFileSync(exportPath, data);
      return { success: true };
    }

    return { success: false };
  });


ipcMain.handle('import-chat', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) return;

  try {
    const fileData = fs.readFileSync(filePaths[0]);
    const parsed = JSON.parse(fileData);

    const id = `import-${Date.now()}`;
    const chatDir = path.join(chatsDir, id);
    const filePath = path.join(chatDir, 'chat.json');

    fs.mkdirSync(chatDir, { recursive: true });

    // ⚠️ Remove docs metadata if actual files are missing
    let sanitizedDocs = [];
    if (Array.isArray(parsed.docs)) {
      sanitizedDocs = parsed.docs.filter((doc) => {
        const docPath = path.join(chatDir, 'docs', doc.id, `file.${doc.ext}`);
        return fs.existsSync(docPath);
      });

      if (sanitizedDocs.length !== parsed.docs.length) {
        console.warn(`⚠️ Some document files are missing for imported chat ${id}.`);
      }
    }

    const cleaned = {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      docs: sanitizedDocs,
    };

    fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));

    const name =
      cleaned.messages[0]?.content?.slice(0, 30) || 'Imported Chat';

    return {
      id,
      name,
      docWarning: parsed.docs?.length && sanitizedDocs.length < parsed.docs.length,
    };
  } catch (err) {
    console.error('❌ Failed to import chat:', err);
    return null;
  }
});


// --------------------App -1 long document summarization --------------------

  ipcMain.handle('parse-pdf', async (event, binaryData) => {
    try {
      const buffer = Buffer.from(binaryData); // Handles Uint8Array correctly
      const pdfData = await pdfParse(buffer);
      return { text: pdfData.text };
    } catch (err) {
      console.error('Error parsing PDF:', err);
      return { error: 'Failed to parse PDF' };
    }
  });

// ----------------------- Ollama Installation Check --------------------
const isOllamaInstalled = () => {
  return new Promise((resolve) => {
    exec('ollama --version', (error) => {
      resolve(!error);
    });
  });
};

const promptUserToInstallOllama = async () => {
  const choice = await dialog.showMessageBox({
    type: 'warning',
    title: 'Ollama Not Found',
    message: 'Ollama is required to run SnapThink. It doesn’t appear to be installed.',
    detail: 'Would you like to install Ollama now, or proceed anyway if you already have it?',
    buttons: ['Install Ollama', 'Proceed Anyway', 'Exit'],
    defaultId: 0,
    cancelId: 2,
  });

  if (choice.response === 0) {
    shell.openExternal('https://ollama.com/download');
    return false; // Don't launch SnapThink yet
  } else if (choice.response === 1) {
    return true; // Proceed anyway
  }

  // Exit if "Exit"
  app.quit();
  return false;
};

ipcMain.on('persist-doc', (event, {
  chatId,
  docId,
  fileName,
  ext,
  fileBuffer,
  chunks,
  embeddings
}) => {
  try {
    const docDir = path.join(chatsDir, chatId, 'docs', docId);
    fs.mkdirSync(docDir, { recursive: true });

    // Save original file
    const filePath = path.join(docDir, `file.${ext}`);
    fs.writeFileSync(filePath, Buffer.from(fileBuffer));

    // Save chunks
    fs.writeFileSync(
      path.join(docDir, 'chunks.json'),
      JSON.stringify(chunks, null, 2)
    );

    // Save embeddings
    fs.writeFileSync(
      path.join(docDir, 'embeddings.json'),
      JSON.stringify(embeddings, null, 2)
    );

    console.log(`✅ Persisted doc "${fileName}" under chat "${chatId}"`);
  } catch (err) {
    console.error(`❌ Failed to persist doc ${fileName} in chat ${chatId}:`, err);
  }
});

ipcMain.on('persist-doc-metadata', (event, { chatId, docsMetadata }) => {
  try {
    const docDir = path.join(chatsDir, chatId, 'docs');
    fs.mkdirSync(docDir, { recursive: true });

    const metaPath = path.join(docDir, 'docsMetadata.json');
    fs.writeFileSync(metaPath, JSON.stringify(docsMetadata, null, 2));

    console.log(`✅ Saved docsMetadata.json for chat ${chatId}`);
  } catch (err) {
    console.error(`❌ Failed to save doc metadata for chat ${chatId}:`, err);
  }
});

ipcMain.handle('load-doc-data', (event, { chatId, docId, ext }) => {
  try {
    const docDir = path.join(chatsDir, chatId, 'docs', docId);

    const chunksPath = path.join(docDir, 'chunks.json');
    const embeddingsPath = path.join(docDir, 'embeddings.json');

    const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
    const embeddings = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'));

    return { chunks, embeddings };
  } catch (err) {
    console.error(`❌ Failed to load doc data for ${docId}:`, err);
    return null;
  }
});

ipcMain.handle('load-doc-metadata', (event, chatId) => {
  try {
    const metaPath = path.join(chatsDir, chatId, 'docs', 'docsMetadata.json');
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    return [];
  } catch (err) {
    console.error(`❌ Failed to load doc metadata for chat ${chatId}:`, err);
    return [];
  }
});


ipcMain.on('update-chat-docs', (e, { chatId, docs }) => {
  try {
    const chatDir = path.join(chatsDir, chatId);
    fs.mkdirSync(chatDir, { recursive: true });

    const filePath = path.join(chatDir, 'chat.json');

    let existing = { messages: [], docs: [] };
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    const updated = {
      ...existing,
      docs, // overwrite only the docs
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    console.log(`✅ Updated docs for chat "${chatId}", total: ${docs.length}`);
  } catch (err) {
    console.error(`❌ Failed to update docs for chat "${chatId}":`, err);
  }
});



// -------------------- App Lifecycle --------------------
app.whenReady().then(async () => {
  const installed = await isOllamaInstalled();

  if (!installed) {
    const shouldProceed = await promptUserToInstallOllama();
    if (!shouldProceed) return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
