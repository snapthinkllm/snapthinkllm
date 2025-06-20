const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.loadURL('http://localhost:5173');
  win.webContents.openDevTools();
}

// 📁 Create directory to store multiple chat sessions
const chatsDir = path.join(app.getPath('userData'), 'chats');
if (!fs.existsSync(chatsDir)) {
  fs.mkdirSync(chatsDir);
}

// 💾 Save chat messages to a file based on session ID
ipcMain.on('save-chat', (e, { id, messages }) => {
  try {
    const filePath = path.join(chatsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error(`Error saving chat (${id}):`, err);
  }
});

// 📖 Load chat messages from a file by ID
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

// 📋 List available chat session files
ipcMain.handle('list-chats', () => {
  try {
    const files = fs.readdirSync(chatsDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        id: path.basename(file, '.json'),
        name: path.basename(file, '.json'),
      }));
  } catch (e) {
    console.error('Error listing chat sessions:', e);
    return [];
  }
});

// 📂 Show chat session folder in file explorer
ipcMain.on('show-chat-folder', () => {
  shell.openPath(chatsDir); // Opens folder instead of file
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
