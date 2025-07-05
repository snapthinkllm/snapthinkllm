export function useChatManager({
  setChatId,
  setMessages,
  setSessionDocs,
  setRagMode,
  setDocUploaded,
  setRagData,
  setSessions,
}) {
  const newChat = async () => {
    console.log('🆕 Creating new chat session...');
    const id = `chat-${Date.now()}`;
    const defaultName = 'New Chat';

    setChatId(id);
    setMessages([]);
    setSessionDocs([]);
    setDocUploaded(false);
    setRagMode(false);

    const newChatObj = { id, name: defaultName, messages: [], docs: [] };

    setSessions((prev) => [...prev, { id, name: defaultName }]);

    await window.chatAPI.renameChat({ id, name: defaultName });
    await window.chatAPI.saveChat({ id, messages: [], docs: [] });
  };

  const switchChat = async (id) => {
    const { messages = [], docs = [] } = await window.chatAPI.loadChat(id);
    console.log(`🔄 Switched to chat ${id}. Messages:`, messages, 'Docs:', docs);

    setMessages(messages);
    setSessionDocs(docs);

    if (docs.length > 0) {
      try {
        const loadedDocs = await loadSessionDocs(id, docs);
        const chunks = loadedDocs.flatMap((doc) => doc.chunks);
        const embeddings = loadedDocs.flatMap((doc) => doc.embeddings);

        setRagData((prev) => new Map(prev).set(id, {
          chunks,
          embedded: embeddings,
          fileName: loadedDocs.map((d) => d.name).join(', '),
        }));
        setRagMode(true);
        setDocUploaded(true);
        setChatId(id);
      } catch (err) {
        console.warn(`⚠️ Failed to load RAG data for chat ${id}:`, err);
        setRagMode(false);
        setDocUploaded(false);
        setChatId(id);
      }
    } else {
      console.log(`📄 No documents found for chat ${id}. Disabling RAG mode.`);
      setRagMode(false);
      setDocUploaded(false);
      setChatId(id);
    }
  };

  const updateChatName = async (id, newName) => {
    console.log(`📝 Renaming chat ${id} to "${newName}"...`);
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name: newName } : s)));
    await window.chatAPI.renameChat({ id, name: newName });
  };

  const deleteChat = async (id) => {
    await window.chatAPI.deleteChat(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setRagData((prev) => {
      const copy = new Map(prev);
      copy.delete(id);
      return copy;
    });
    setMessages([]);
    setRagMode(false);
    if (id === chatId) {
      setChatId('');
    }
  };

  const loadSessionDocs = async (chatId, docsMetadata) => {
    const loadedDocs = [];

    for (const doc of docsMetadata) {
      const { id: docId, name, ext } = doc;

      try {
        const result = await window.chatAPI.loadDocData({ chatId, docId, ext });

        if (result?.chunks && result?.embeddings) {
          loadedDocs.push({
            id: docId,
            name,
            filePath: `chats/${chatId}/docs/${docId}/file.${ext}`,
            chunks: result.chunks,
            embeddings: result.embeddings,
          });
        } else {
          console.warn(`⚠️ Failed to load doc ${name}`);
        }
      } catch (err) {
        console.error(`❌ Error loading doc ${name}`, err);
      }
    }

    return loadedDocs;
  };

  return {
    newChat,
    switchChat,
    updateChatName,
    deleteChat,
    loadSessionDocs,
  };
}
