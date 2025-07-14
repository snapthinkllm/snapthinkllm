const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatAPI', {
  // Save a chat session with an ID
  saveChat: ({ id, messages = [], docs = [] }) => ipcRenderer.send('save-chat', { id, messages, docs }),

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

  updateChatDocs: ({ chatId, docs }) => ipcRenderer.send('update-chat-docs', { chatId, docs }),

  runPythonCode: (code) => ipcRenderer.invoke('run-python', code),

  // Media file handling
  saveMediaFile: ({ chatId, fileName, fileData, fileType }) => 
    ipcRenderer.invoke('save-media-file', { chatId, fileName, fileData, fileType }),
  
  getMediaPath: ({ chatId, fileName }) => 
    ipcRenderer.invoke('get-media-path', { chatId, fileName }),

});

contextBridge.exposeInMainWorld('notebookAPI', {
  // List all notebooks
  listNotebooks: () => ipcRenderer.invoke('list-notebooks'),
  
  // Create new notebook
  createNotebook: (options) => ipcRenderer.invoke('create-notebook', options),
  
  // Load notebook by ID
  loadNotebook: (notebookId) => ipcRenderer.invoke('load-notebook', notebookId),
  
  // Save notebook data
  saveNotebook: (notebookId, data) => ipcRenderer.invoke('save-notebook', notebookId, data),
  
  // Update notebook metadata
  updateNotebook: (notebookId, updates) => ipcRenderer.invoke('update-notebook', notebookId, updates),
  
  // Delete notebook
  deleteNotebook: (notebookId) => ipcRenderer.invoke('delete-notebook', notebookId),
  
  // Export notebook as .snap file
  exportNotebook: (notebookId) => ipcRenderer.invoke('export-notebook', notebookId),
  
  // Import notebook from .snap file
  importNotebook: () => ipcRenderer.invoke('import-notebook'),
  
  // File management
  addFile: (notebookId, file, type) => ipcRenderer.invoke('add-notebook-file', notebookId, file, type),
  removeFile: (notebookId, fileName, type) => ipcRenderer.invoke('remove-notebook-file', notebookId, fileName, type),
  
  // Media handling
  getMediaPath: (notebookId, fileName, fileType) => ipcRenderer.invoke('get-notebook-media-path', { notebookId, fileName, fileType }),
  
  // Migration
  migrateChatsToNotebooks: () => ipcRenderer.invoke('migrate-chats-to-notebooks'),
  backupChats: () => ipcRenderer.invoke('backup-chats'),
});
