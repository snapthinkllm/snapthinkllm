import { chunkText } from '../utils/chunkText';
import {
  ensureEmbeddingModel,
  getEmbedding,
  embedMultiple,
  cosineSimilarity
} from '../utils/embeddingUtils';
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
    setRagData((prev) =>
      new Map(prev).set(chatId, {
        docs: [
          {
            fileName: doc.name,
            chunks: doc.chunks,
            embeddings: doc.embeddings,
          },
        ],
      })
    );

    setDocUploaded(true);
    setRagMode?.(true);
    setSessionDocs((prev) => [...prev, doc]);
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
    return await embedMultiple(chunks);
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

    console.log('🔄 Sending RAG question:', question);
    const data = ragData.get(chatId);
    console.log('🔄 RAG data:', data);

    if (!question.trim()) return;

    // ✅ Filter docs with valid embeddings
    const embeddedDocs = data?.docs?.filter(
      doc => Array.isArray(doc.embeddings) && doc.embeddings.length > 0
    );

    if (!embeddedDocs || embeddedDocs.length === 0) {
      toast.warning("No embedded chunks found. Please upload and embed at least one document.");
      return;
    }

    // ✅ Flatten all embedded chunks
    const embeddedChunks = embeddedDocs.flatMap(doc =>
      doc.embeddings.map((embedding, idx) => ({
        chunk: doc.chunks[idx],
        embedding,
        fileName: doc.fileName,
      }))
    );

    // ✅ Embed the question
    const questionEmbedding = await getEmbedding(question);
    // ✅ Score chunks
    const scored = embeddedChunks.map(({ chunk, embedding, fileName }, index) => ({
      chunk,
      fileName,
      score: cosineSimilarity(questionEmbedding, embedding.embedding),
      index,
    }));

    // ✅ Get top 3 chunks
    const topChunks = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map(({ chunk, index, fileName }) => ({
        chunk,
        sourceIndex: index,
        fileName,
      }));

    // ✅ Metadata for display
    const metadata = {
      sources: topChunks.map((item) => ({
        text: item.chunk,
        index: item.sourceIndex,
        fileName: item.fileName || 'Uploaded Document',
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
    sendMessage(prompt, metadata);
  };



  async function ensureEmbeddingModel(setDownloading, setStatus, setProgress, setDetail) {
    console.log('🔄 Checking for embedding model...');
    const modelName = 'nomic-embed-text:latest';
    const models = await window.chatAPI.getDownloadedModels();
    const isPresent = models.some(m => (typeof m === 'string' ? m : m.name) === modelName);

    if (isPresent) return;

    const confirmed = window.confirm(
      `The embedding model "${modelName}" is required to understand and search within documents.\n\n` +
      `This model generates text embeddings used for semantic search and question answering over documents (RAG).\n\n` +
      `Would you like to download it now? (~100MB)`
    );

    if (!confirmed) {
      throw new Error("User declined to download embedding model");
    }

    console.log(`📥 Downloading embedding model: ${modelName}`);
    setDownloading(modelName);
    setStatus('starting');

    await window.chatAPI.downloadModel(modelName);

    setDownloading(null);
    setStatus(null);
    setProgress(null);

  };


  const searchDocuments = async (query) => {
    if (!query.trim()) return [];
    console.log(`🔍 Searching documents for query: "${query}"`);

    await ensureEmbeddingModel(setDownloading, setStatus, setProgress, setDetail);
    const queryEmbedding = await getEmbedding(query);

    const rag = ragData.get(chatId);
    console.log('🔄 RAG data:', rag, rag.docs);
    if (!rag?.docs?.length) return [];
    console.log(`📄 Found ${rag.docs.length} documents in RAG data.`);

    const results = [];
    rag.docs.forEach((doc, docIndex) => {
      doc.embeddings.forEach((entry, chunkIndex) => {
        results.push({
          chunk: doc.chunks[chunkIndex],
          score: cosineSimilarity(queryEmbedding, entry.embedding),
          fileName: doc.fileName,
          docIndex,
          chunkIndex,
        });
      });
    });
    console.log(`🔍 Search results for "${query}":`, results);
    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  };



  return {
    handleDocumentUpload,
    handleSummarizeDoc,
    sendRAGQuestion,
    searchDocuments
  };
}
