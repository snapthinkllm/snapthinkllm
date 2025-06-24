const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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

ipcMain.handle('download-model', (event, model) => {
  return new Promise((resolve, reject) => {
    currentPullProcess = spawn('ollama', ['pull', model]);

    currentPullProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`[ollama stdout] ${message}`);

      const percentMatch = message.match(/(\d+(\.\d+)?)%/);
      const progress = percentMatch ? parseFloat(percentMatch[1]) : null;

      event.sender.send('model-status', {
        model,
        status: 'downloading',
        detail: message,
        progress,
      });
    });

    currentPullProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.warn(`[ollama stderr] ${message}`);
      // ⚠️ Don't treat as error — pass along as additional info
      event.sender.send('model-status', {
        model,
        status: 'downloading',
        detail: message,
      });
    });

    currentPullProcess.on('close', (code) => {
      currentPullProcess = null;
      if (code === 0) {
        console.log(`[ollama] ${model} download complete`);
        event.sender.send('model-status', { model, status: 'done' });
        resolve();
      } else {
        console.error(`[ollama] Download failed with code ${code}`);
        event.sender.send('model-status', { model, status: 'error' });
        reject(new Error(`ollama pull exited with code ${code}`));
      }
    });
  });
});

ipcMain.on('cancel-download', () => {
  if (currentPullProcess) {
    currentPullProcess.kill();
    currentPullProcess = null;
    console.log('Download cancelled.');
  }
});

const { dialog } = require('electron');

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
  const pdfParse = require('pdf-parse');

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
