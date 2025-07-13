import { useCallback } from 'react';

export function useNotebookManager({
  notebookId,
  setNotebook,
  setMessages,
  setFiles,
  setRagMode,
  setDocUploaded,
  setRagData,
  setModelSelected,
}) {
  
  const loadNotebook = useCallback(async () => {
    if (!notebookId) return;
    
    try {
      console.log('🔄 Loading notebook:', notebookId);
      const notebook = await window.notebookAPI.loadNotebook(notebookId);
      
      setNotebook(notebook.metadata);
      setMessages(notebook.messages || []);
      setFiles(notebook.files || { docs: [], images: [], videos: [], outputs: [] });
      
      // Set model if specified in notebook
      if (notebook.metadata.model) {
        setModelSelected(notebook.metadata.model);
      }
      
      // Set RAG mode if documents exist
      if (notebook.files?.docs?.length > 0) {
        setDocUploaded(true);
        setRagMode(true);
        
        // Load RAG data for documents
        try {
          // Filter docs that have chunks and embeddings
          const docsWithRAG = notebook.files.docs.filter(doc => 
            doc.chunks && doc.embeddings && 
            Array.isArray(doc.chunks) && Array.isArray(doc.embeddings)
          );
          
          if (docsWithRAG.length > 0) {
            // Create RAG data structure expected by useDocumentManager
            const ragMap = new Map();
            ragMap.set(notebookId, {
              docs: docsWithRAG.map(doc => ({
                fileName: doc.name,
                chunks: doc.chunks,
                embeddings: doc.embeddings,
              }))
            });
            
            setRagData(ragMap);
            console.log('✅ Loaded RAG data for', docsWithRAG.length, 'documents with embeddings');
          } else {
            console.log('⚠️ Found documents but no RAG data (chunks/embeddings)');
          }
        } catch (error) {
          console.error('❌ Failed to load RAG data:', error);
        }
      }
      
      console.log('✅ Notebook loaded:', notebook);
    } catch (error) {
      console.error('❌ Failed to load notebook:', error);
    }
  }, [notebookId, setNotebook, setMessages, setFiles, setRagMode, setDocUploaded, setRagData, setModelSelected]);
  
  const saveNotebook = useCallback(async (messages) => {
    if (!notebookId) return;
    
    try {
      await window.notebookAPI.saveNotebook(notebookId, {
        messages: messages || [],
      });
      console.log('✅ Notebook saved:', notebookId);
    } catch (error) {
      console.error('❌ Failed to save notebook:', error);
    }
  }, [notebookId]);
  
  const updateNotebookTitle = useCallback(async (title) => {
    if (!notebookId || !title?.trim()) return;
    
    try {
      await window.notebookAPI.updateNotebook(notebookId, {
        title: title.trim(),
        updatedAt: new Date().toISOString(),
      });
      
      setNotebook(prev => prev ? {
        ...prev,
        title: title.trim(),
        updatedAt: new Date().toISOString(),
      } : null);
      
      console.log('✅ Notebook title updated:', title);
    } catch (error) {
      console.error('❌ Failed to update notebook title:', error);
    }
  }, [notebookId, setNotebook]);
  
  const updateNotebookMetadata = useCallback(async (metadata) => {
    if (!notebookId) return;
    
    try {
      const updatedMetadata = {
        ...metadata,
        updatedAt: new Date().toISOString(),
      };
      
      await window.notebookAPI.updateNotebook(notebookId, updatedMetadata);
      
      setNotebook(prev => prev ? {
        ...prev,
        ...updatedMetadata,
      } : null);
      
      console.log('✅ Notebook metadata updated:', updatedMetadata);
    } catch (error) {
      console.error('❌ Failed to update notebook metadata:', error);
    }
  }, [notebookId, setNotebook]);
  
  const addFileToNotebook = useCallback(async (file, type = 'docs') => {
    if (!notebookId) return;
    
    try {
      await window.notebookAPI.addFile(notebookId, file, type);
      
      setFiles(prev => ({
        ...prev,
        [type]: [...(prev[type] || []), file],
      }));
      
      console.log('✅ File added to notebook:', file.name, 'type:', type);
    } catch (error) {
      console.error('❌ Failed to add file to notebook:', error);
    }
  }, [notebookId, setFiles]);
  
  const removeFileFromNotebook = useCallback(async (fileName, type = 'docs') => {
    if (!notebookId) return;
    
    try {
      await window.notebookAPI.removeFile(notebookId, fileName, type);
      
      setFiles(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter(file => file.name !== fileName),
      }));
      
      console.log('✅ File removed from notebook:', fileName, 'type:', type);
    } catch (error) {
      console.error('❌ Failed to remove file from notebook:', error);
    }
  }, [notebookId, setFiles]);
  
  const refreshFiles = useCallback(async () => {
    if (!notebookId) return;
    
    try {
      console.log('🔄 Refreshing files for notebook:', notebookId);
      const notebook = await window.notebookAPI.loadNotebook(notebookId);
      setFiles(notebook.files || { docs: [], images: [], videos: [], outputs: [] });
      console.log('✅ Files refreshed:', notebook.files);
    } catch (error) {
      console.error('❌ Failed to refresh files:', error);
    }
  }, [notebookId, setFiles]);

  return {
    loadNotebook,
    saveNotebook,
    updateNotebookTitle,
    updateNotebookMetadata,
    addFileToNotebook,
    removeFileFromNotebook,
    refreshFiles,
  };
}
