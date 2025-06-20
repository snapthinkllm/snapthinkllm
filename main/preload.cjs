const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatAPI', {
  saveChat: (messages) => ipcRenderer.send('save-chat', messages),
  loadChat: () => ipcRenderer.invoke('load-chat'),
  showChatFolder: () => ipcRenderer.send('show-chat-folder'),
});
