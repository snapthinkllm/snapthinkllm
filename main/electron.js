const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL('http://localhost:5173');
}

const chatFile = path.join(app.getPath('userData'), 'chat-history.json');

ipcMain.on('save-chat', (e, messages) => {
  fs.writeFileSync(chatFile, JSON.stringify(messages, null, 2));
});

ipcMain.handle('load-chat', () => {
  try {
    if (fs.existsSync(chatFile)) {
      const data = fs.readFileSync(chatFile);
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
