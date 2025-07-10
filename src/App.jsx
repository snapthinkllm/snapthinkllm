import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Sidebar from './ui-elements/Sidebar';
import ModelSelector from './pages/ModelSelector';
import ChatHeader from './ui-elements/ChatHeader';
import ChatFooter from './ui-elements/ChatFooter';
import DownloadProgressModal from './ui-elements/DownloadProgressModal';
import { useChatManager } from './hooks/useChatManager'; 
import { useDocumentManager } from './hooks/useDocumentManager';
import { MessageSquarePlus } from 'lucide-react';

function App() {
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionDocs, setSessionDocs] = useState([]);
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
  const [downloading, setDownloading] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [detail, setDetail] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [activePanel, setActivePanel] = useState('chat');

  const {
    newChat,
    switchChat,
    updateChatName,
    deleteChat,
    loadSessionDocs,// for a future feature
  } = useChatManager({
    chatId,
    setChatId,
    setMessages,
    setSessionDocs,
    setRagMode,
    setDocUploaded,
    setRagData,
    setSessions,
  });




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
    console.log('🔥 useEffect for listChats triggered',sessions);
    window.chatAPI.listChats().then(setSessions);
  }, []);

  useEffect(() => {
    if (chatId) {
      console.log(`🔄 Loading chat ${chatId}...`);
      window.chatAPI.loadChat(chatId).then(({ messages, docs }) => {
        setMessages(messages);
        setSessionDocs(docs);
      });
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);


  function buildMessageContext(inputText, metadata = {}) {
    console.log('🔄 Building message context for input:', inputText, 'with metadata:', metadata, 'messages:', messages);

      const userMessage = {
        role: 'user',
        content: inputText,
        timestamp: new Date().toISOString(),
      };

      // ✅ Ensure messages is an array
      const messagesArray = Array.isArray(messages)
        ? messages
        : Array.isArray(messages?.messages)
          ? messages.messages
          : [];


      if (metadata.sources?.length) {
        const contextMessage = {
          role: 'system',
          content: `The following document content is relevant for answering the user's question:\n\n${metadata.sources
            .map((src, i) => `--- Source ${i + 1} ---\n${src.text}`)
            .join('\n\n')}`,
        };
        return [[...messagesArray, contextMessage, userMessage], userMessage];
      }

      console.log('📄 No sources provided, sending user message only', messagesArray);
      return [[...messagesArray, userMessage], userMessage];
    }


  const sendMessage = async (customInput, metadata = {}) => {
    console.log('📤 sendMessage called with input:', customInput, 'and metadata:', metadata, 'testinput:', input);
    const messageToSend = typeof customInput === 'string' ? customInput : input;

    if (!messageToSend?.trim?.()) return;
    if (!chatId) return alert('Please create or select a chat session first.');

    const [finalMessages, userMessage] = buildMessageContext(messageToSend, metadata);

    // Show only userMessage in UI
    const updatedUI = [...messages, userMessage];  // ✅ Correct, since messages is an array

    console.log('📤 Sending message:', updatedUI);
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

  function extractPythonCode(markdown) {
    const match = markdown.match(/```python\s+([\s\S]*?)```/);
    return match ? match[1] : null;
  }

  async function runPython(codeMarkdown) {
    console.log(' Running Python code from markdown:', codeMarkdown);
    const code = extractPythonCode(codeMarkdown);
    if (!code) return;

    const { success, result } = await window.chatAPI.runPythonCode(code);

    // Append a new message to the chat
    const newMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `\`\`\`${success ? 'python-output' : 'error'}\n${result.trim()}\n\`\`\``,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, newMessage]);
  }

  const {
    handleDocumentUpload,
    handleSummarizeDoc,
    sendRAGQuestion,
    searchDocuments,
  } = useDocumentManager({
    chatId,
    messages,
    setMessages,
    setToast,
    setRagData,
    setDocUploaded,
    setDownloading, // ✅ Add these 4
    setStatus,
    setProgress,
    setDetail,
    ragData,
    sendMessage,
    setRagMode, 
    setSessionDocs,
    modelSelected, 
    setModelSelected
  });


    // Export current chat
  const handleExport = async () => {
    console.log('📤 Exporting chat:', chatId);
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

  function escapeHtmlDangerousTags(input) {
    return input
      .replace(/<textarea/gi, '&lt;textarea')
      .replace(/<\/textarea>/gi, '&lt;/textarea&gt;')
      .replace(/<script/gi, '&lt;script')
      .replace(/<\/script>/gi, '&lt;/script&gt;');
  }
 
  function renderWithThinking(text, sources = [], onRunCode) {
    console.log('🔄 renderWithThinking called with text:', text, 'sources:', sources);
    const parts = text.split(/(<think>[\s\S]*?<\/think>)/g);

    const shouldShowRunButton =
      typeof onRunCode === 'function' &&
      text.includes('```python')  &&
      !text.includes('```python-output'); 

      console.log('🔄 shouldShowRunButton:', shouldShowRunButton);

    return (
      <>
        {parts.map((part, index) => {
          const trimmed = part.trim();

          if (trimmed.startsWith('<think>') && trimmed.endsWith('</think>')) {
            const content = trimmed.slice(7, -8).trim();
            const safeContent = escapeHtmlDangerousTags(content);
            return (
              <div
                key={`think-${index}`}
                className="my-2 p-2 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 italic text-sm rounded"
              >
                💭
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {safeContent}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          return (
            <div key={`text-${index}`} className="prose dark:prose-invert max-w-none mb-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  pre({ children, ...props }) {
                    const child = children[0];
                    const className = child?.props?.className || '';
                    const lang = className.replace('language-', '');

                    if (lang === 'python-output') {
                      return (
                        <pre className="bg-gray-900 text-green-300 p-3 rounded-md text-sm overflow-x-auto mt-2" {...props}>
                          {children}
                        </pre>
                      );
                    }

                    return (
                      <pre className="bg-zinc-800 text-white p-3 rounded-md text-sm overflow-x-auto mt-2" {...props}>
                        {children}
                      </pre>
                    );
                  },
                  code({ inline, className = '', children, ...props }) {
                    if (inline) {
                      return (
                        <code className="bg-gray-200 dark:bg-gray-700 text-sm px-1 py-0.5 rounded" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return <code className={className} {...props}>{children}</code>;
                  },
                }}
              >
                {part}
              </ReactMarkdown>
            </div>
          );
        })}

        {/* Run Code button at the bottom */}
        {shouldShowRunButton && (
          <button
            className="mt-2 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition"
            onClick={onRunCode}
          >
            ▶ Run Code
          </button>
        )}

        {/* 📄 Sources section */}
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
  };


  const handleCancelDownload = () => {
    window.chatAPI.cancelDownload?.();
    setDownloading(null);
    setStatus(null);
    setProgress(null);
  };


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
      <div className="flex flex-col flex-1 h-full scrollbar-thin scrollbar-thumb-amber-600 scrollbar-track-gray-800">

        {/* Header */}
          <ChatHeader
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            handleExport={handleExport}
            handleImport={handleImport}
            setModelSelected={setModelSelected}
          />

        {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-500 dark:scrollbar-track-gray-800 scrollbar-track-gray-200 ">
            {!modelSelected ? (
              <ModelSelector onSelect={setModelSelected} />
                        ) : !chatId ? (
                <div className="mt-32 text-center text-gray-600 dark:text-gray-400">
                  <h2 className="text-2xl font-semibold mb-3">
                    👋 {modelSelected} Model Selected!
                  </h2>
                  <p className="text-sm italic flex items-center justify-center gap-1 text-center">
                    Click the
                    <span className="inline-flex items-center font-medium text-blue-500">
                      <MessageSquarePlus size={16} className="mx-1" />
                      chat icon
                    </span>
                    on the sidebar to get started.
                  </p>
                </div>
                ): (
              <>
                {Array.isArray(messages) && messages
                .map((m, i) => (
                  <div
                    key={i}
                     className={`px-5 py-3 rounded-2xl shadow-md transition-all duration-300 ${
                      m.role === 'user'
                         ? 'max-w-lg bg-[#a2bdf7] text-slate-900 dark:bg-gray-600 dark:text-white self-end ml-auto'
                        : 'max-w-4xl bg-[#dfe2e8] dark:bg-slate-800 text-black dark:text-white self-start'
                    }`}
                  >
                    <div className="text-xs opacity-60 mb-1">
                      <b>{m.role === 'user' ? 'You' : 'Bot'}:</b>{' '}
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      {m.role === 'assistant'
                        ? renderWithThinking(m.content, m.sources, () => runPython(m.content))
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
            updateChatName={updateChatName}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            searchDocuments={searchDocuments}
          />
        )}

      {/* ✅ Embed download progress modal here */}
        {downloading && (
          <DownloadProgressModal
            modelName={downloading}
            status={status}
            progress={progress}
            detail={detail}
            onCancel={handleCancelDownload}
            onDone={() => {
              setDownloading(null);
              setStatus(null);
              setProgress(null);
            }}
          />
        )}
    </div>


  );
}

export default App;
