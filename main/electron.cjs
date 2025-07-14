const { app, BrowserWindow, ipcMain, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
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
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenu(null);

  // Load appropriate URL based on environment
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
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

//--------------------- Python Code Execution --------------------

ipcMain.handle('run-python', async (event, code) => {
  const tempFile = path.join(os.tmpdir(), `snapthink_${Date.now()}.py`);
  console.log(`🔄 Running Python code in temporary file: ${tempFile}`);

  try {
    fs.writeFileSync(tempFile, code, 'utf-8');

    return await new Promise((resolve) => {
      const proc = spawn('python3', [tempFile]);

      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => (output += data.toString()));
      proc.stderr.on('data', (data) => (error += data.toString()));

      proc.on('close', (code) => {
        fs.unlinkSync(tempFile); // Cleanup
        resolve({
          success: code === 0,
          result: code === 0 ? output : error,
        });
      });
    });
  } catch (err) {
    return { success: false, result: `Internal error: ${err.message}` };
  }
});

// -------------------- Media file handlers --------------------
ipcMain.handle('save-media-file', async (event, { chatId, fileName, fileData, fileType }) => {
  try {
    const chatDir = path.join(chatsDir, chatId);
    const mediaDir = path.join(chatDir, 'media');
    
    // Ensure media directory exists
    fs.mkdirSync(mediaDir, { recursive: true });
    
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const uniqueFileName = `${baseName}_${timestamp}${ext}`;
    
    const mediaPath = path.join(mediaDir, uniqueFileName);
    
    // Convert base64 data to buffer and save
    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(mediaPath, buffer);
    
    console.log(`✅ Saved media file: ${uniqueFileName} (${fileType})`);
    
    return {
      fileName: uniqueFileName,
      originalName: fileName,
      filePath: mediaPath,
      fileType,
      size: buffer.length
    };
  } catch (err) {
    console.error('❌ Error saving media file:', err);
    throw err;
  }
});

ipcMain.handle('get-media-path', async (event, { chatId, fileName }) => {
  try {
    const mediaPath = path.join(chatsDir, chatId, 'media', fileName);
    
    if (fs.existsSync(mediaPath)) {
      // Read the file and convert to base64 data URL
      const fileBuffer = fs.readFileSync(mediaPath);
      const ext = path.extname(fileName).toLowerCase();
      
      // Determine MIME type based on extension
      let mimeType = 'application/octet-stream';
      if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.bmp') mimeType = 'image/bmp';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
      else if (ext === '.ogg') mimeType = 'video/ogg';
      else if (ext === '.avi') mimeType = 'video/x-msvideo';
      else if (ext === '.mov') mimeType = 'video/quicktime';
      
      // Convert to data URL
      const base64Data = fileBuffer.toString('base64');
      return `data:${mimeType};base64,${base64Data}`;
    }
    
    return null;
  } catch (err) {
    console.error('❌ Error getting media path:', err);
    return null;
  }
});

// -------------------- Notebook directory setup --------------------
const notebooksDir = path.join(app.getPath('userData'), 'notebooks');
const notebookManifestFile = path.join(notebooksDir, 'notebooks.json');

if (!fs.existsSync(notebooksDir)) fs.mkdirSync(notebooksDir);

function loadNotebookManifest() {
  try {
    if (fs.existsSync(notebookManifestFile)) {
      return JSON.parse(fs.readFileSync(notebookManifestFile));
    }
  } catch (e) {
    console.error('Failed to read notebook manifest:', e);
  }
  return {};
}

function saveNotebookManifest(data) {
  try {
    fs.writeFileSync(notebookManifestFile, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write notebook manifest:', e);
  }
}

// -------------------- IPC Notebook handlers --------------------

// List all notebooks
ipcMain.handle('list-notebooks', () => {
  try {
    console.log('📂 Listing notebooks from:', notebooksDir);
    
    if (!fs.existsSync(notebooksDir)) {
      fs.mkdirSync(notebooksDir, { recursive: true });
      return [];
    }

    const notebookIds = fs.readdirSync(notebooksDir).filter(f => {
      const stat = fs.statSync(path.join(notebooksDir, f));
      return stat.isDirectory();
    });

    const notebooks = notebookIds.map((id) => {
      const notebookPath = path.join(notebooksDir, id, 'notebook.json');
      
      if (fs.existsSync(notebookPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(notebookPath, 'utf-8'));
          
          // Calculate stats
          const messagesPath = path.join(notebooksDir, id, 'messages.json');
          let totalMessages = 0;
          if (fs.existsSync(messagesPath)) {
            const messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));
            totalMessages = messagesData.messages?.length || 0;
          }
          
          // Count files
          const docsDir = path.join(notebooksDir, id, 'docs');
          const totalFiles = fs.existsSync(docsDir) ? fs.readdirSync(docsDir).length : 0;
          
          return {
            ...metadata,
            stats: {
              ...metadata.stats,
              totalMessages,
              totalFiles,
              lastActive: metadata.updatedAt || metadata.createdAt
            }
          };
        } catch (error) {
          console.error(`❌ Error reading notebook ${id}:`, error);
          return null;
        }
      }
      return null;
    }).filter(Boolean);

    console.log(`✅ Found ${notebooks.length} notebooks`);
    return notebooks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (error) {
    console.error('❌ Error listing notebooks:', error);
    return [];
  }
});

// Create new notebook
ipcMain.handle('create-notebook', (event, { title, description = '' }) => {
  try {
    const timestamp = Date.now();
    const id = `notebook-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const notebookDir = path.join(notebooksDir, id);
    
    // Create notebook directory structure
    fs.mkdirSync(notebookDir, { recursive: true });
    fs.mkdirSync(path.join(notebookDir, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(notebookDir, 'images'), { recursive: true });
    fs.mkdirSync(path.join(notebookDir, 'videos'), { recursive: true });
    fs.mkdirSync(path.join(notebookDir, 'outputs'), { recursive: true });
    
    const now = new Date().toISOString();
    
    // Create notebook metadata
    const metadata = {
      id,
      title: title || 'New Notebook',
      description,
      createdAt: now,
      updatedAt: now,
      thumbnail: null,
      tags: [],
      model: null,
      plugins: {
        enabled: [],
        settings: {}
      },
      stats: {
        totalMessages: 0,
        totalTokens: 0,
        totalFiles: 0,
        lastActive: now
      }
    };
    
    // Save metadata
    fs.writeFileSync(
      path.join(notebookDir, 'notebook.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Create empty messages file
    fs.writeFileSync(
      path.join(notebookDir, 'messages.json'),
      JSON.stringify({ messages: [] }, null, 2)
    );
    
    console.log(`✅ Created notebook: ${id}`);
    return metadata;
  } catch (error) {
    console.error('❌ Error creating notebook:', error);
    throw error;
  }
});

// Load notebook
ipcMain.handle('load-notebook', (event, notebookId) => {
  try {
    console.log(`🔄 Loading notebook: ${notebookId}`);
    const notebookDir = path.join(notebooksDir, notebookId);
    
    if (!fs.existsSync(notebookDir)) {
      throw new Error(`Notebook ${notebookId} not found`);
    }
    
    // Load metadata
    const metadataPath = path.join(notebookDir, 'notebook.json');
    const metadata = fs.existsSync(metadataPath) 
      ? JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      : {};
    
    // Load messages
    const messagesPath = path.join(notebookDir, 'messages.json');
    const messagesData = fs.existsSync(messagesPath)
      ? JSON.parse(fs.readFileSync(messagesPath, 'utf-8'))
      : { messages: [] };
    
    // Load file lists
    const files = {
      docs: loadFileList(path.join(notebookDir, 'docs')),
      images: loadFileList(path.join(notebookDir, 'images')),
      videos: loadFileList(path.join(notebookDir, 'videos')),
      outputs: loadFileList(path.join(notebookDir, 'outputs'))
    };
    
    console.log(`✅ Loaded notebook: ${notebookId} with ${messagesData.messages.length} messages`);
    
    return {
      metadata,
      messages: messagesData.messages,
      files
    };
  } catch (error) {
    console.error(`❌ Error loading notebook ${notebookId}:`, error);
    throw error;
  }
});

// Save notebook messages
ipcMain.handle('save-notebook', (event, notebookId, data) => {
  try {
    const notebookDir = path.join(notebooksDir, notebookId);
    
    if (!fs.existsSync(notebookDir)) {
      throw new Error(`Notebook ${notebookId} not found`);
    }
    
    // Save messages if provided
    if (data.messages) {
      const messagesPath = path.join(notebookDir, 'messages.json');
      fs.writeFileSync(messagesPath, JSON.stringify({ messages: data.messages }, null, 2));
    }
    
    // Update notebook metadata timestamp
    const metadataPath = path.join(notebookDir, 'notebook.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      metadata.updatedAt = new Date().toISOString();
      metadata.stats.totalMessages = data.messages?.length || metadata.stats.totalMessages || 0;
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
    
    console.log(`✅ Saved notebook: ${notebookId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error saving notebook ${notebookId}:`, error);
    throw error;
  }
});

// Update notebook metadata
ipcMain.handle('update-notebook', (event, notebookId, updates) => {
  try {
    const notebookDir = path.join(notebooksDir, notebookId);
    const metadataPath = path.join(notebookDir, 'notebook.json');
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Notebook ${notebookId} not found`);
    }
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const updatedMetadata = {
      ...metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));
    
    console.log(`✅ Updated notebook metadata: ${notebookId}`);
    return updatedMetadata;
  } catch (error) {
    console.error(`❌ Error updating notebook ${notebookId}:`, error);
    throw error;
  }
});

// Delete notebook
ipcMain.handle('delete-notebook', (event, notebookId) => {
  try {
    const notebookDir = path.join(notebooksDir, notebookId);
    
    if (fs.existsSync(notebookDir)) {
      fs.rmSync(notebookDir, { recursive: true, force: true });
      console.log(`✅ Deleted notebook: ${notebookId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error deleting notebook ${notebookId}:`, error);
    throw error;
  }
});

// Export notebook as .snap file
ipcMain.handle('export-notebook', async (event, notebookId) => {
  try {
    const { dialog } = require('electron');
    const AdmZip = require('adm-zip');
    
    const notebookDir = path.join(notebooksDir, notebookId);
    
    if (!fs.existsSync(notebookDir)) {
      throw new Error(`Notebook ${notebookId} not found`);
    }
    
    // Get notebook metadata for default filename
    const metadataPath = path.join(notebookDir, 'notebook.json');
    const metadata = fs.existsSync(metadataPath) 
      ? JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      : { title: 'notebook' };
    
    const defaultFileName = `${metadata.title.replace(/[^a-zA-Z0-9]/g, '_')}.snap`;
    
    const result = await dialog.showSaveDialog({
      title: 'Export Notebook',
      defaultPath: defaultFileName,
      filters: [
        { name: 'SnapThink Notebooks', extensions: ['snap'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    // Create zip archive
    const zip = new AdmZip();
    
    // Add all files from notebook directory
    const addDirectoryToZip = (dirPath, zipPath = '') => {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const itemZipPath = zipPath ? `${zipPath}/${item}` : item;
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          addDirectoryToZip(itemPath, itemZipPath);
        } else {
          zip.addLocalFile(itemPath, zipPath, item);
        }
      });
    };
    
    addDirectoryToZip(notebookDir);
    
    // Write zip file
    zip.writeZip(result.filePath);
    
    console.log(`✅ Exported notebook ${notebookId} to ${result.filePath}`);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error(`❌ Error exporting notebook ${notebookId}:`, error);
    throw error;
  }
});

// Import notebook from .snap file
ipcMain.handle('import-notebook', async (event) => {
  try {
    const { dialog } = require('electron');
    const AdmZip = require('adm-zip');
    
    const result = await dialog.showOpenDialog({
      title: 'Import Notebook',
      filters: [
        { name: 'SnapThink Notebooks', extensions: ['snap'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    
    const filePath = result.filePaths[0];
    
    // Extract zip file
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    
    // Find notebook.json to get metadata
    const notebookEntry = entries.find(entry => entry.entryName === 'notebook.json');
    if (!notebookEntry) {
      throw new Error('Invalid notebook file: notebook.json not found');
    }
    
    const metadata = JSON.parse(notebookEntry.getData().toString());
    
    // Generate new ID to avoid conflicts
    const timestamp = Date.now();
    const newId = `notebook-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotebookDir = path.join(notebooksDir, newId);
    
    // Extract all files to new directory
    zip.extractAllTo(newNotebookDir, true);
    
    // Update metadata with new ID and timestamp
    const updatedMetadata = {
      ...metadata,
      id: newId,
      updatedAt: new Date().toISOString(),
      title: `${metadata.title} (Imported)`
    };
    
    fs.writeFileSync(
      path.join(newNotebookDir, 'notebook.json'),
      JSON.stringify(updatedMetadata, null, 2)
    );
    
    console.log(`✅ Imported notebook ${newId} from ${filePath}`);
    return { success: true, notebook: updatedMetadata };
  } catch (error) {
    console.error('❌ Error importing notebook:', error);
    throw error;
  }
});

// Helper function to load file list from directory
function loadFileList(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    
    return fs.readdirSync(dirPath)
      .filter(fileName => !fileName.endsWith('.meta.json') && !fileName.endsWith('.info.json')) // Skip metadata files
      .map(fileName => {
        const filePath = path.join(dirPath, fileName);
        const stat = fs.statSync(filePath);
        
        // Try to load metadata if it exists
        const metadataPath = path.join(dirPath, `${fileName}.meta.json`);
        const infoPath = path.join(dirPath, `${fileName}.info.json`);
        
        let metadata = null;
        if (fs.existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          } catch (error) {
            console.error(`Error loading metadata for ${fileName}:`, error);
          }
        } else if (fs.existsSync(infoPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
          } catch (error) {
            console.error(`Error loading info for ${fileName}:`, error);
          }
        }
        
        return {
          name: fileName,
          size: stat.size,
          uploadedAt: metadata?.uploadedAt || stat.birthtime.toISOString(),
          path: filePath,
          ...metadata // Spread any additional metadata
        };
      });
  } catch (error) {
    console.error(`Error loading file list from ${dirPath}:`, error);
    return [];
  }
}

// Add file to notebook
ipcMain.handle('add-notebook-file', (event, notebookId, file, type = 'docs') => {
  try {
    const notebookDir = path.join(notebooksDir, notebookId);
    const targetDir = path.join(notebookDir, type);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Handle different file input types
    if (file.buffer) {
      // File uploaded from browser with buffer data
      const targetPath = path.join(targetDir, file.name);
      const buffer = Buffer.from(file.buffer);
      fs.writeFileSync(targetPath, buffer);
      
      // Save metadata if provided
      if (file.metadata) {
        const metadataPath = path.join(targetDir, `${file.name}.meta.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(file.metadata, null, 2));
      }
      
      console.log(`✅ Added file ${file.name} to notebook ${notebookId} (${type}) with buffer`);
    } else if (file.data) {
      // Base64 data (for media files)
      const targetPath = path.join(targetDir, file.name);
      const buffer = Buffer.from(file.data, 'base64');
      fs.writeFileSync(targetPath, buffer);
      
      // Save file info
      const infoPath = path.join(targetDir, `${file.name}.info.json`);
      fs.writeFileSync(infoPath, JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: file.uploadedAt
      }, null, 2));
      
      console.log(`✅ Added media file ${file.name} to notebook ${notebookId} (${type})`);
    } else if (file.path) {
      // Copy file from existing path
      const targetPath = path.join(targetDir, file.name);
      fs.copyFileSync(file.path, targetPath);
      console.log(`✅ Copied file ${file.name} to notebook ${notebookId} (${type})`);
    } else {
      throw new Error('Invalid file data - missing buffer, data, or path');
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error adding file to notebook ${notebookId}:`, error);
    throw error;
  }
});

// Remove file from notebook
ipcMain.handle('remove-notebook-file', (event, notebookId, fileName, type = 'docs') => {
  try {
    const notebookDir = path.join(notebooksDir, notebookId);
    const filePath = path.join(notebookDir, type, fileName);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed file ${fileName} from notebook ${notebookId} (${type})`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error removing file from notebook ${notebookId}:`, error);
    throw error;
  }
});

// -------------------- App Lifecycle --------------------

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

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
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Migration from chats to notebooks
ipcMain.handle('migrate-chats-to-notebooks', async () => {
  try {
    console.log('🔄 Starting migration from chats to notebooks...');
    
    const migratedNotebooks = [];
    
    // Check if chats directory exists
    if (!fs.existsSync(chatsDir)) {
      console.log('ℹ️ No chats directory found, skipping migration');
      return { success: true, migrated: 0 };
    }
    
    // Get all chat IDs
    const chatIds = fs.readdirSync(chatsDir).filter(f => {
      const stat = fs.statSync(path.join(chatsDir, f));
      return stat.isDirectory();
    });
    
    console.log(`📂 Found ${chatIds.length} chats to migrate`);
    
    // Load chat manifest for names
    const manifest = loadManifest();
    
    for (const chatId of chatIds) {
      try {
        const chatDir = path.join(chatsDir, chatId);
        const chatPath = path.join(chatDir, 'chat.json');
        
        if (!fs.existsSync(chatPath)) {
          console.log(`⚠️ Skipping ${chatId}: no chat.json found`);
          continue;
        }
        
        // Load chat data
        const chatData = JSON.parse(fs.readFileSync(chatPath, 'utf-8'));
        const messages = chatData.messages || [];
        const docs = chatData.docs || [];
        
        // Generate notebook ID and create directory
        const timestamp = Date.now();
        const notebookId = `notebook-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        const notebookDir = path.join(notebooksDir, notebookId);
        
        // Create notebook directory structure
        fs.mkdirSync(notebookDir, { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'docs'), { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'images'), { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'videos'), { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'outputs'), { recursive: true });
        
        // Determine title from manifest or first message
        let title = manifest[chatId] || 'Migrated Chat';
        if (title === chatId && messages.length > 0) {
          // Extract title from first user message
          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            title = firstUserMessage.content.slice(0, 50).replace(/\n/g, ' ').trim();
            if (title.length === 50) title += '...';
          }
        }
        
        // Get creation date from first message or directory stats
        let createdAt = new Date().toISOString();
        if (messages.length > 0) {
          const firstMessage = messages[0];
          if (firstMessage.timestamp) {
            createdAt = firstMessage.timestamp;
          }
        } else {
          try {
            const stat = fs.statSync(chatDir);
            createdAt = stat.birthtime.toISOString();
          } catch (e) {
            // Use current time as fallback
          }
        }
        
        // Get last update time
        let updatedAt = createdAt;
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.timestamp) {
            updatedAt = lastMessage.timestamp;
          }
        }
        
        // Create notebook metadata
        const metadata = {
          id: notebookId,
          title,
          description: `Migrated from chat session: ${chatId}`,
          createdAt,
          updatedAt,
          thumbnail: null,
          tags: ['migrated', 'legacy-chat'],
          model: null, // Will be set when user selects a model
          plugins: {
            enabled: docs.length > 0 ? ['document-rag'] : [],
            settings: {}
          },
          stats: {
            totalMessages: messages.length,
            totalTokens: 0, // Will be calculated later
            totalFiles: docs.length,
            lastActive: updatedAt
          },
          migration: {
            originalChatId: chatId,
            migratedAt: new Date().toISOString(),
            version: '1.0'
          }
        };
        
        // Add IDs to messages if they don't have them
        const migratedMessages = messages.map((msg, index) => ({
          ...msg,
          id: msg.id || `msg-${timestamp}-${index}`,
          timestamp: msg.timestamp || createdAt
        }));
        
        // Copy document files if they exist
        const chatDocsDir = path.join(chatDir, 'docs');
        if (fs.existsSync(chatDocsDir)) {
          const docFiles = fs.readdirSync(chatDocsDir);
          docFiles.forEach(fileName => {
            const sourcePath = path.join(chatDocsDir, fileName);
            const targetPath = path.join(notebookDir, 'docs', fileName);
            fs.copyFileSync(sourcePath, targetPath);
          });
        }
        
        // Copy any media files
        const chatMediaDir = path.join(chatDir, 'media');
        if (fs.existsSync(chatMediaDir)) {
          const mediaFiles = fs.readdirSync(chatMediaDir);
          mediaFiles.forEach(fileName => {
            const sourcePath = path.join(chatMediaDir, fileName);
            const extension = path.extname(fileName).toLowerCase();
            
            let targetDir;
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
              targetDir = path.join(notebookDir, 'images');
            } else if (['.mp4', '.avi', '.mov', '.webm'].includes(extension)) {
              targetDir = path.join(notebookDir, 'videos');
            } else {
              targetDir = path.join(notebookDir, 'outputs');
            }
            
            const targetPath = path.join(targetDir, fileName);
            fs.copyFileSync(sourcePath, targetPath);
          });
        }
        
        // Save notebook metadata
        fs.writeFileSync(
          path.join(notebookDir, 'notebook.json'),
          JSON.stringify(metadata, null, 2)
        );
        
        // Save messages
        fs.writeFileSync(
          path.join(notebookDir, 'messages.json'),
          JSON.stringify({ messages: migratedMessages }, null, 2)
        );
        
        migratedNotebooks.push(metadata);
        
        console.log(`✅ Migrated chat ${chatId} -> notebook ${notebookId}: "${title}"`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate chat ${chatId}:`, error);
      }
    }
    
    console.log(`🎉 Migration completed! Migrated ${migratedNotebooks.length} chats to notebooks`);
    
    return { 
      success: true, 
      migrated: migratedNotebooks.length,
      notebooks: migratedNotebooks 
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
});

// Helper function to backup existing chats before migration
ipcMain.handle('backup-chats', async () => {
  try {
    const { dialog } = require('electron');
    const AdmZip = require('adm-zip');
    
    if (!fs.existsSync(chatsDir)) {
      return { success: false, message: 'No chats directory found' };
    }
    
    const result = await dialog.showSaveDialog({
      title: 'Backup Chats',
      defaultPath: `snapthink-chats-backup-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [
        { name: 'ZIP Archives', extensions: ['zip'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    // Create zip archive
    const zip = new AdmZip();
    
    // Add entire chats directory
    zip.addLocalFolder(chatsDir, 'chats');
    
    // Write zip file
    zip.writeZip(result.filePath);
    
    console.log(`✅ Created chat backup: ${result.filePath}`);
    return { success: true, filePath: result.filePath };
    
  } catch (error) {
    console.error('❌ Error creating chat backup:', error);
    throw error;
  }
});

// Get notebook media file path/data
ipcMain.handle('get-notebook-media-path', async (event, { notebookId, fileName, fileType }) => {
  try {
    // Determine the subfolder based on file type
    const subFolder = fileType === 'image' ? 'images' : fileType === 'video' ? 'videos' : 'images';
    const mediaPath = path.join(notebooksDir, notebookId, subFolder, fileName);
    
    if (fs.existsSync(mediaPath)) {
      // Read the file and convert to base64 data URL
      const fileBuffer = fs.readFileSync(mediaPath);
      const ext = path.extname(fileName).toLowerCase();
      
      // Determine MIME type based on extension
      let mimeType = 'application/octet-stream';
      if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.bmp') mimeType = 'image/bmp';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
      else if (ext === '.ogg') mimeType = 'video/ogg';
      else if (ext === '.avi') mimeType = 'video/x-msvideo';
      else if (ext === '.mov') mimeType = 'video/quicktime';
      
      // Convert to data URL
      const base64Data = fileBuffer.toString('base64');
      return `data:${mimeType};base64,${base64Data}`;
    }
    
    console.log(`❌ Media file not found: ${mediaPath}`);
    return null;
  } catch (err) {
    console.error('❌ Error getting notebook media path:', err);
    return null;
  }
});
