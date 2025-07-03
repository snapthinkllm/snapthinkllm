const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatAPI', {
  // Save a chat session with an ID
  saveChat: ({ id, messages, docs = [] }) => ipcRenderer.send('save-chat', { id, messages, docs }),

  // Load a chat session by ID
  loadChat: (id) => ipcRenderer.invoke('load-chat', id),

  // List all available chat sessions
  listChats: () => ipcRenderer.invoke('list-chats'),

  // Open folder where chat sessions are stored
  showChatFolder: () => ipcRenderer.send('show-chat-folder'),

  deleteChat: (id) => ipcRenderer.invoke('delete-chat', id),

  renameChat: ({ id, name }) => ipcRenderer.invoke('rename-chat', { id, name }),

  downloadModel: (name) => ipcRenderer.invoke('download-model', name),

  cancelDownload: () => ipcRenderer.send('cancel-download'), 

  onModelStatus: (callback) => ipcRenderer.on('model-status', (_, msg) => callback(msg)),

  getDownloadedModels: () => ipcRenderer.invoke('get-downloaded-models'),

  getHardwareInfo: () => ipcRenderer.invoke('get-hardware-info'),

  exportChat: (id) => ipcRenderer.invoke('export-chat', id),
  
  importChat: () => ipcRenderer.invoke('import-chat'),

  parsePDF: (binaryData) => ipcRenderer.invoke('parse-pdf', binaryData),

  persistDoc: (data) => ipcRenderer.send('persist-doc', data),

  loadDocData: (params) => ipcRenderer.invoke('load-doc-data', params),

  persistDocMetadata: ({ chatId, docsMetadata }) =>
  ipcRenderer.send('persist-doc-metadata', { chatId, docsMetadata }),

  loadDocMetadata: (chatId) => ipcRenderer.invoke('load-doc-metadata', chatId),

});
