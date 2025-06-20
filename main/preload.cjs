const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatAPI', {
  // Save a chat session with an ID
  saveChat: ({ id, messages }) => ipcRenderer.send('save-chat', { id, messages }),

  // Load a chat session by ID
  loadChat: (id) => ipcRenderer.invoke('load-chat', id),

  // List all available chat sessions
  listChats: () => ipcRenderer.invoke('list-chats'),

  // Open folder where chat sessions are stored
  showChatFolder: () => ipcRenderer.send('show-chat-folder'),
});
