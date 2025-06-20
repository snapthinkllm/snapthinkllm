const { app, BrowserWindow, ipcMain, shell } = require('electron'); // ✅ Add `shell`
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.loadURL('http://localhost:5173');
  win.webContents.openDevTools();
}

//  Define chat file path
const chatFilePath = path.join(app.getPath('userData'), 'chat-history.json');

// Save chat messages to file
ipcMain.on('save-chat', (e, messages) => {
  try {
    fs.writeFileSync(chatFilePath, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error('Error saving chat:', err);
  }
});

//  Load chat messages from file
ipcMain.handle('load-chat', () => {
  try {
    if (fs.existsSync(chatFilePath)) {
      const data = fs.readFileSync(chatFilePath);
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error('Error loading chat:', e);
    return [];
  }
});

// Show chat folder in system file explorer
ipcMain.on('show-chat-folder', () => {
  shell.showItemInFolder(chatFilePath); 
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
