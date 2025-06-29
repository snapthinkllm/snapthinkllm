import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Sidebar from './ui-elements/Sidebar';
import ModelSelector from './pages/ModelSelector';
import ChatHeader from './ui-elements/ChatHeader';
import ChatFooter from './ui-elements/ChatFooter';
import { chunkText } from './utils/chunkText';


function App() {
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelSelected, setModelSelected] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [stats, setStats] = useState({
    totalTokens: 0,
    tokensPerSecond: 0,
    contextTokens: 0,
  });
  const messagesEndRef = useRef(null);
  const [ragMode, setRagMode] = useState(false); // RAG mode toggle
  const [ragData, setRagData] = useState(new Map());
  const [toast, setToast] = useState(null);
  const [docUploaded, setDocUploaded] = useState(false);


  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);


  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {  
    window.chatAPI.listChats().then(setSessions);
  }, []);

  useEffect(() => {
    if (chatId) {
      window.chatAPI.loadChat(chatId).then(setMessages);
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const newChat = async () => {
    const id = `chat-${Date.now()}`;
    const defaultName = 'New Chat';
    setChatId(id);
    setMessages([]);
    setSessions(prev => [...prev, { id, name: defaultName }]);
    setDocUploaded(false);
    await window.chatAPI.renameChat({ id, name: defaultName });
  };

  const switchChat = async (id) => {
    setChatId(id);
    const data = await window.chatAPI.loadChat(id);
    setMessages(data);
    setDocUploaded(ragData.has(id));
    setRagMode(ragData.has(id)); // auto enable RAG mode if document exists
  }

  const updateChatName = async (id, newName) => {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, name: newName } : s)));
    await window.chatAPI.renameChat({ id, name: newName });
  };

  function buildMessageContext(inputText, metadata = {}) {
      const userMessage = {
        role: 'user',
        content: inputText,
        timestamp: new Date().toISOString(),
      };

      if (metadata.sources?.length) {
        const contextMessage = {
          role: 'system',
          content: `The following document content is relevant for answering the user's question:\n\n${metadata.sources
            .map((src, i) => `--- Source ${i + 1} ---\n${src.text}`)
            .join('\n\n')}`,
        };
        return [[...messages, contextMessage, userMessage], userMessage];
      }

      return [[...messages, userMessage], userMessage];
    }

  const sendMessage = async (customInput, metadata = {}) => {
    const messageToSend = typeof customInput === 'string' ? customInput : input;

    if (!messageToSend?.trim?.()) return;
    if (!chatId) return alert('Please create or select a chat session first.');

    const [finalMessages, userMessage] = buildMessageContext(messageToSend, metadata);

    // Show only userMessage in UI
    const updatedUI = [...messages, userMessage];
    setMessages(updatedUI);
    setInput('');
    setLoading(true);

    if (messages.length === 0) {
      const trimmed = messageToSend.trim().slice(0, 40).replace(/\n/g, ' ');
      if (trimmed) updateChatName(chatId, trimmed);
    }

    console.log('📤 Final message history sent to LLM:', finalMessages);

    const start = performance.now();

    try {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelSelected,
          messages: finalMessages,
          stream: false,
        }),
      });

      const end = performance.now();
      const elapsedSeconds = (end - start) / 1000;

      const data = await res.json();

      const assistantMessage = data.message
        ? {
            role: 'assistant',
            content: data.message.content,
            timestamp: new Date().toISOString(),
            ...(metadata.sources ? { sources: metadata.sources } : {}),
          }
        : {
            role: 'assistant',
            content: '[Error: No message returned]',
            timestamp: new Date().toISOString(),
          };

      const updatedMessages = [...updatedUI, assistantMessage];
      setMessages(updatedMessages);
      await window.chatAPI.saveChat({ id: chatId, messages: updatedMessages });

      const estimateTokens = (text) => Math.round(text.split(/\s+/).length / 0.75);
      const totalText = updatedMessages.map((m) => m.content).join(' ');
      const totalTokens = estimateTokens(totalText);
      const responseTokens = estimateTokens(assistantMessage.content);
      const tokensPerSecond = elapsedSeconds > 0 ? Math.round(responseTokens / elapsedSeconds) : 0;

      setStats({
        totalTokens,
        tokensPerSecond,
        contextTokens: estimateTokens(JSON.stringify(finalMessages)),
      });
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: '[Error: Unable to fetch response]',
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...updatedUI, errorMessage];
      setMessages(updatedMessages);
      await window.chatAPI.saveChat({ id: chatId, messages: updatedMessages });
    }

    setLoading(false);
  };


  const deleteChat = async (id) => {
    await window.chatAPI.deleteChat(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setRagData(prev => {
      const copy = new Map(prev);
      copy.delete(id);
      return copy;
    });
    if (chatId === id) {
      setChatId('');
      setMessages([]);
      setRagMode(false);
    }
  };

    // Export current chat
  const handleExport = async () => {
    if (!chatId) return;
    await window.chatAPI.exportChat(chatId);
  };


  // Import a chat
  const handleImport = async () => {
    const result = await window.chatAPI.importChat();
    if (result) {
      setSessions(prev => [...prev, result]);
      setChatId(result.id);
    }
  };


  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;

    const ext = file.name.split('.').pop().toLowerCase();

    try {
      let text = '';
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      if (ext === 'pdf') {
        console.log('Sending PDF binary data to main process:', uint8Array.length);
        const result = await window.chatAPI.parsePDF(uint8Array);
        if (result.error || !result.text?.trim()) {
          throw new Error(result.error || 'No text returned from PDF');
        }
        text = result.text;
      } else if (ext === 'txt' || ext === 'md') {
        text = new TextDecoder().decode(uint8Array);
      } else {
        alert('❌ Unsupported file type. Please upload PDF, TXT, or Markdown.');
        return;
      }

      // ✅ Show preview
      console.log(`✅ Parsed ${ext.toUpperCase()} Text Length:`, text.length);
      console.log('📄 Preview:\n', text.trim().slice(0, 500));

      const chunks = chunkText(text, 300, 50);
      const embedded = await embedChunksLocally(chunks);

      console.log('📌 Embedded Chunks:', embedded.length);
      setRagData(prev => new Map(prev).set(chatId, {
        chunks,
        embedded,
        fileName: file.name,
      }));
      setRagMode(true);

      // ✅ Compose synthetic RAG summarization question
      const prompt = `📄 Summarize the uploaded ${ext.toUpperCase()} document using its content. Highlight main sections, topics, and key takeaways.`;

      const topChunks = embedded.map((item, index) => ({
        text: item.chunk,
        index,
        fileName: file.name,
      }));

      const metadata = {
        sources: topChunks,
      };

      const userMessage = {
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      await window.chatAPI.saveChat({ id: chatId, messages: newMessages });

      setToast(`✅ Document uploaded. RAG summarization from ${chunks.length} chunks ready.`);

    } catch (err) {
      console.error('❌ Document upload error:', err);
      alert('Failed to parse or upload the document. Please try another file.');
    }
  };

  const handleSummarizeDoc = () => {
    const data = ragData.get(chatId);
    if (!data) {
      alert('❌ No document found for summarization.');
      return;
    }

    const allText = data.chunks.join(' ');
    const summarizePrompt = `📄 Summarize the uploaded document below.\n\n${allText}`;

    sendMessage(summarizePrompt);
  };


  async function embedChunksLocally(chunks) {
    const embedded = [];
    console.log('🔍 Embedding chunks...');
    console.time('Embedding time');

    for (const chunk of chunks) {
      const res = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text', // Replace with an embedding-capable model
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
    console.timeEnd('Embedding time');

    return embedded;
  }


  const sendRAGQuestion = async (question) => {
    if (!question.trim()) return;

    const data = ragData.get(chatId);
    if (!data || !data.embedded?.length) {
      setToast(
        '📄 No RAG document found for this session. \nPlease upload a document using "Summarize PDF" or \ndisable RAG mode to ask general questions.'
      );
      return;
    }

    try {
      // Step 1: Embed the question
      const res = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: question,
        }),
      });

      const questionEmbeddingData = await res.json();
      const questionEmbedding = questionEmbeddingData.embedding;
      if (!questionEmbedding) throw new Error('No embedding returned for question');

      // Step 2: Compute cosine similarity between question and each chunk
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

      // Step 3: Compose cleaner prompt
      const prompt = `📄 Use relevant information from the uploaded document to answer the question. Sources will be shown below.\n\n❓ Question: ${question}`;

      const userMessage = {
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');

      const metadata = {
        sources: topChunks.map((item) => ({
          text: item.chunk,
          index: item.sourceIndex,
          fileName: data.fileName || 'Uploaded Document',
        })),
      };

      // 🧠 Send message with `sources` attached
      sendMessage(prompt, metadata);

    } catch (err) {
      console.error('❌ Semantic search error:', err);
      alert('Failed to embed or search document context.');
    }
  };




  function renderWithThinking(text, sources = []) {
    const parts = text.split(/(<think>[\s\S]*?<\/think>)/g);

    return (
      <>
        {/* 🔍 Main Assistant Response Rendering */}
        {parts.map((part, index) => {
          const trimmed = part.trim();

          if (trimmed.startsWith('<think>') && trimmed.endsWith('</think>')) {
            const content = trimmed.slice(7, -8).trim();
            return (
              <div
                key={`think-${index}`}
                className="my-2 p-2 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 italic text-sm rounded"
              >
                💭
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          return (
            <div key={`text-${index}`} className="prose dark:prose-invert max-w-none mb-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {part}
              </ReactMarkdown>
            </div>
          );
        })}

        {/* 📄 Enhanced Sources Section */}
        {sources.length > 0 && (
          <details className="mt-3 p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40 shadow-sm">
            <summary className="cursor-pointer font-semibold text-sm text-gray-900 dark:text-gray-100">
              📄 Sources ({sources.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {sources.map((src, i) => (
                <li key={i}>
                  <details className="bg-white dark:bg-gray-700 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                    <summary className="cursor-pointer text-xs font-mono">
                      📑 {src.fileName || 'Document'} — Chunk #{src.index + 1}
                    </summary>
                    <pre className="mt-2 text-[11px] whitespace-pre-wrap text-gray-100 dark:text-gray-100">
                      {src.text}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          </details>
        )}
      </>
    );
  }




  return (
    <div className="flex h-screen  from-[#f4f7fb] via-[#e6edf7] to-[#dce8f2] dark:from-gray-900 dark:via-gray-800 dark:bg-[#1c1d1e] text-zinc-900 dark:text-white transition-colors">
      {toast && (
        <div className="fixed left-1/3 bottom-1/5 transform -translate-x-1/2 px-6 py-4 rounded-xl shadow-xl z-50 text-sm max-w-md w-fit
          border-2 border-yellow-500 dark:border-yellow-400
          bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="text-xl">⚠️</div>
            <div className="flex-1">{toast}</div>
          </div>
        </div>
      )}
      {/* Main Chat Column */}
      <div className="flex flex-col flex-1 h-full">

      {/* Header */}
        <ChatHeader
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          handleExport={handleExport}
          handleImport={handleImport}
          setModelSelected={setModelSelected}
        />

      {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {!modelSelected ? (
            <ModelSelector onSelect={setModelSelected} />
          ) : (
            <>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-lg px-5 py-3 rounded-2xl shadow-md transition-all duration-300 ${
                    m.role === 'user'
                      ? 'bg-[#a2bdf7] text-slate-900 dark:bg-gray-600 dark:text-white self-end ml-auto'
                      : 'bg-[#dfe2e8] dark:bg-slate-800 text-black dark:text-white self-start mr-auto'
                  }`}
                >
                  <div className="text-xs opacity-60 mb-1">
                    <b>{m.role === 'user' ? 'You' : 'Bot'}:</b>{' '}
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    {m.role === 'assistant'
                      ? renderWithThinking(m.content, m.sources)
                      : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {m.content}
                        </ReactMarkdown>
                      )
                    }
                  </div>
                </div>
              ))}
              {loading && (
                <div className="max-w-lg px-5 py-3 rounded-2xl bg-[#e6edf7] dark:bg-gray-700/60 text-black dark:text-white self-start mr-auto shadow-md">
                  <b>assistant:</b> Typing...
                </div>
              )}
              <div ref={messagesEndRef}></div>

              <div className="flex justify-center mt-2">
                <div className="inline-block text-xs font-mono px-4 py-2 text-gray-700 dark:text-gray-300 bg-white/40 dark:bg-gray-700/40 backdrop-blur rounded-md shadow">
                  <p className="whitespace-pre-wrap text-center">
                    🤖 Model: <span className="font-semibold">{modelSelected}</span> |
                    🧮 Tokens: <span className="font-semibold">{stats.totalTokens}</span> |
                    ⚡ Speed: <span className="font-semibold">{stats.tokensPerSecond}/s</span> |
                    🧠 Context: <span className="font-semibold">{stats.contextTokens}</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </main>

      {/* Footer */}
        {modelSelected && (
          <ChatFooter
            chatId={chatId}
            input={input}
            ragMode={ragMode}
            setInput={setInput}
            setRagMode={setRagMode}
            sendMessage={sendMessage}
            sendRAGQuestion={sendRAGQuestion}
            handleDocumentUpload={handleDocumentUpload}
            handleSummarizeDoc={handleSummarizeDoc}
            loading={loading}
            docUploaded={docUploaded}
            setDocUploaded={setDocUploaded}
          />
        )}
      </div>

      {/* Sidebar */}
      {modelSelected && (
        <Sidebar
          sessions={sessions}
          chatId={chatId}
          newChat={newChat}
          switchChat={switchChat}
          deleteChat={deleteChat}
        />
      )}
    </div>
  );
}

export default App;
