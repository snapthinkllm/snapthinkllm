import { chunkText } from '../utils/chunkText';
import { v4 as uuidv4 } from 'uuid';

/*
We've created useDocumentManager.js, which cleanly encapsulates:

handleDocumentUpload

parseUploadedFile

embedAndPersistDocument

sendRAGQuestion

handleSummarizeDoc

This takes care of the full document pipeline (parse → embed → persist → summarize → QA).
*/
export function useDocumentManager({
  chatId,
  messages,
  setMessages,
  setToast,
  setRagData,
  setDocUploaded,
  setDownloading, // ✅ Add here too
  setStatus,
  setProgress,
  setDetail,
  ragData,
  sendMessage,
  setRagMode,
  setSessionDocs
}) {
  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;

    try {
      const parsedText = await parseUploadedFile(file);
      showParsedPreview(parsedText, file.name);

      const doc = await embedAndPersistDocument(file, chatId, parsedText);

      updateRagState(doc);
      await saveAutoSummaryPrompt(doc);

      setToast(`✅ Document uploaded and persisted. RAG ready.`);
    } catch (err) {
      console.error('❌ Document upload error:', err);
      alert('Failed to parse or persist the document. Please try again.');
    }
  };

  const parseUploadedFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (ext === 'pdf') {
      const result = await window.chatAPI.parsePDF(uint8Array);
      if (result.error || !result.text?.trim()) {
        throw new Error(result.error || 'No text returned from PDF');
      }
      return result.text;
    }

    if (ext === 'txt' || ext === 'md') {
      return new TextDecoder().decode(uint8Array);
    }

    throw new Error('❌ Unsupported file type. Please upload PDF, TXT, or Markdown.');
  };

  const showParsedPreview = (text, name) => {
    console.log(`✅ Parsed ${name} — Length:`, text.length);
    console.log('📄 Preview:\n', text.trim().slice(0, 500));
  };

  const updateRagState = (doc) => {
    setRagData((prev) => new Map(prev).set(chatId, {
      chunks: doc.chunks,
      embedded: doc.embeddings,
      fileName: doc.name,
    }));
    setDocUploaded(true);
    setRagMode?.(true); 
    setSessionDocs(prev => [...prev, doc])
  };

  const saveAutoSummaryPrompt = async (doc) => {
    const prompt = `📄 Summarize the uploaded ${doc.name} document using its content. Highlight main sections, topics, and key takeaways.`;

    const topChunks = doc.chunks.slice(0, 3).map((chunk, index) => ({
      text: chunk,
      index,
      fileName: doc.name,
    }));

    const userMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    await window.chatAPI.saveChat({ id: chatId, messages: newMessages });
  };

  const handleSummarizeDoc = () => {
    const data = ragData.get(chatId);
    if (!data) {
      setToast('❌ No document found for summarization. Please upload a document first.');
      return;
    }

    const allText = data.chunks.join(' ');
    const summarizePrompt = `📄 Summarize the uploaded document below.\n\n${allText}`;

    sendRAGQuestion(summarizePrompt);
  };

  const embedChunksLocally = async (chunks) => {
    await ensureEmbeddingModel(setDownloading, setStatus, setProgress, setDetail);
    console.log('🔍 Embedding chunks...');
    const embedded = [];

    for (const chunk of chunks) {
      const res = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: chunk,
        }),
      });

      const data = await res.json();
      if (data.embedding) {
        embedded.push({ chunk, embedding: data.embedding });
      } else {
        console.error('❌ Failed to embed:', chunk.slice(0, 30));
      }
    }

    return embedded;
  };

  const embedAndPersistDocument = async (file, chatId, parsedText) => {
    const docId = uuidv4();
    const ext = file.name.split('.').pop();
    const chunks = chunkText(parsedText, 300, 50);
    const embeddings = await embedChunksLocally(chunks);

    const buffer = await file.arrayBuffer();
    await window.chatAPI.persistDoc({
      chatId,
      docId,
      fileName: file.name,
      ext,
      fileBuffer: Array.from(new Uint8Array(buffer)),
      chunks,
      embeddings,
    });

    const existingMeta = await window.chatAPI.loadDocMetadata?.(chatId);
    const docsMetadata = Array.isArray(existingMeta) ? existingMeta : [];
    docsMetadata.push({ id: docId, name: file.name, ext });

    await window.chatAPI.updateChatDocs({ chatId, docs: docsMetadata });
    await window.chatAPI.persistDocMetadata({ chatId, docsMetadata });

    return {
      id: docId,
      name: file.name,
      filePath: `chats/${chatId}/docs/${docId}/file.${ext}`,
      chunks,
      embeddings,
    };
  };

  const sendRAGQuestion = async (question) => {
    await ensureEmbeddingModel(setDownloading, setStatus, setProgress, setDetail); 
  
    const data = ragData.get(chatId);
    console.log('🔍 Sending RAG question:', question, data);
    if (!question.trim() || !data?.embedded?.length) return;

    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: question,
      }),
    });

    ;

    const questionEmbeddingData = await res.json();
    const questionEmbedding = questionEmbeddingData.embedding;
    if (!questionEmbedding) throw new Error('No embedding returned for question');

    const cosineSimilarity = (vecA, vecB) => {
      const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
      const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
      const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
      return dot / (normA * normB);
    };

    const scored = data.embedded.map(({ chunk, embedding }, index) => ({
      chunk,
      score: cosineSimilarity(questionEmbedding, embedding),
      index,
    }));

    const topChunks = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ chunk, index }) => ({
        chunk,
        sourceIndex: index,
      }));

    const metadata = {
      sources: topChunks.map((item) => ({
        text: item.chunk,
        index: item.sourceIndex,
        fileName: data.fileName || 'Uploaded Document',
      })),
    };

    const prompt = `📄 Use relevant information from the uploaded document to answer the question. Sources will be shown below.\n\n❓ Question: ${question}`;

    const userMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    console.log('🧠 Calling sendMessage with metadata:', metadata);
    sendMessage(prompt, metadata);
  };

  async function ensureEmbeddingModel() {
    console.log('🔄 Checking for embedding model...');
    const modelName = 'nomic-embed-text:latest';
    const models = await window.chatAPI.getDownloadedModels();
    const isPresent = models.some(m => (typeof m === 'string' ? m : m.name) === modelName);

    if (isPresent) return;
    console.log(`📥 Downloading embedding model: ${modelName}`);
    setDownloading(modelName);
    setStatus('starting');

    await window.chatAPI.downloadModel(modelName);
    setDownloading(null);
    setStatus(null);
    setProgress(null);

  };

  const handleCancelDownload = () => {
    window.chatAPI.cancelDownload?.();
    setDownloading(null);
    setStatus(null);
    setProgress(null);
  };


  return {
    handleDocumentUpload,
    handleSummarizeDoc,
    sendRAGQuestion,
  };
}
