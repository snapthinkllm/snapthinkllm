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
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
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
ipcMain.on('save-chat', (e, { id, messages }) => {
  try {
    fs.writeFileSync(path.join(chatsDir, `${id}.json`), JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error(`Error saving chat (${id}):`, err);
  }
});

ipcMain.handle('load-chat', (e, id) => {
  try {
    const filePath = path.join(chatsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath));
    }
    return [];
  } catch (e) {
    console.error(`Error loading chat (${id}):`, e);
    return [];
  }
});

ipcMain.handle('list-chats', () => {
  try {
    const files = fs.readdirSync(chatsDir).filter(f => f.endsWith('.json') && f !== 'chats.json');
    const manifest = loadManifest();
    return files.map(file => {
      const id = path.basename(file, '.json');
      return {
        id,
        name: manifest[id] || id,
      };
    });
  } catch (e) {
    console.error('Error listing chats:', e);
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

ipcMain.handle('delete-chat', (event, chatId) => {
  try {
    const filePath = path.join(chatsDir, `${chatId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const manifest = loadManifest();
    delete manifest[chatId];
    saveManifest(manifest);

    return { success: true };
  } catch (err) {
    console.error(`Error deleting chat (${chatId}):`, err);
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
  const filePath = path.join(chatsDir, `${chatId}.json`);
  if (!fs.existsSync(filePath)) return;
  const data = fs.readFileSync(filePath);
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

  const fileData = fs.readFileSync(filePaths[0]);
  const parsed = JSON.parse(fileData);

  const id = `import-${Date.now()}`;
  const filePath = path.join(chatsDir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2));

  const manifest = loadManifest();
  manifest[id] = parsed[0]?.content?.slice(0, 30) || 'Imported Chat';
  saveManifest(manifest);

  return { id, name: manifest[id] };
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

// -------------------- App Lifecycle --------------------
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
