const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { Console } = require('console');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (true) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// 📁 Chat directory and manifest
const chatsDir = path.join(app.getPath('userData'), 'chats');
const manifestFile = path.join(chatsDir, 'chats.json');
console.log('Chat directory:', chatsDir);
console.log('Manifest file:', manifestFile);

if (!fs.existsSync(chatsDir)) {
  fs.mkdirSync(chatsDir);
}

function loadManifest() {
  console.log('Chat directory:', chatsDir);
  console.log('Manifest file:', manifestFile);
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
  console.log('Chat directory:', chatsDir);
  console.log('Manifest file:', manifestFile);
  try {
    fs.writeFileSync(manifestFile, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write chat manifest:', e);
  }
}

// 💾 Save chat messages
ipcMain.on('save-chat', (e, { id, messages }) => {
  try {
    const filePath = path.join(chatsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error(`Error saving chat (${id}):`, err);
  }
});

// 📖 Load messages
ipcMain.handle('load-chat', (e, id) => {
  try {
    const filePath = path.join(chatsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error(`Error loading chat (${id}):`, e);
    return [];
  }
});

// 📋 List all sessions (load names from manifest)
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
    console.error('Error listing chat sessions:', e);
    return [];
  }
});

// 📝 Rename chat session
ipcMain.handle('rename-chat', async (event, { id, name }) => {
  try {
    const manifest = loadManifest();
    console.log(`Renaming chat (${id}) to "${name}"`);
    manifest[id] = name;
    saveManifest(manifest);
    return { success: true };
  } catch (err) {
    console.error(`Error renaming chat (${id}):`, err);
    throw err;
  }
});

// 📂 Show folder in file explorer
ipcMain.on('show-chat-folder', () => {
  shell.openPath(chatsDir);
});

// 🗑️ Delete a session
ipcMain.handle('delete-chat', async (event, chatId) => {
  try {
    const filePath = path.join(chatsDir, `${chatId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Also remove from manifest
    const manifest = loadManifest();
    delete manifest[chatId];
    saveManifest(manifest);

    return { success: true };
  } catch (err) {
    console.error(`Error deleting chat (${chatId}):`, err);
    throw err;
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
