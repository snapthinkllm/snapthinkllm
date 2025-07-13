import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import NotebookSidebar from './NotebookSidebar';
import ModelSelector from '../pages/ModelSelector';
import ChatHeader from '../ui-elements/ChatHeader';
import ChatFooter from '../ui-elements/ChatFooter';
import DownloadProgressModal from '../ui-elements/DownloadProgressModal';
import MediaDisplay from './MediaDisplay';
import { useNotebookManager } from '../hooks/useNotebookManager';
import { useDocumentManager } from '../hooks/useDocumentManager';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';

function NotebookWorkspace({ notebookId, onBackToDashboard }) {
  const [notebook, setNotebook] = useState(null);
  const [messages, setMessages] = useState([]);
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
  const [ragMode, setRagMode] = useState(false);
  const [ragData, setRagData] = useState(new Map());
  const [toast, setToast] = useState(null);
  const [docUploaded, setDocUploaded] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [detail, setDetail] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [files, setFiles] = useState({ docs: [], images: [], videos: [], outputs: [] });

  const {
    updateNotebookTitle,
    saveNotebook,
    loadNotebook,
    refreshFiles,
  } = useNotebookManager({
    notebookId,
    setNotebook,
    setMessages,
    setFiles,
    setRagMode,
    setDocUploaded,
    setRagData,
    setModelSelected,
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
    if (notebookId) {
      loadNotebook();
    }
  }, [notebookId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    console.log('📄 NotebookWorkspace notebookId:', notebookId, 'modelSelected:', modelSelected);
  }, [notebookId, modelSelected]);

  function buildMessageContext(inputText, metadata = {}) {
    console.log('🔄 Building message context for input:', inputText, 'with metadata:', metadata, 'messages:', messages);

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString(),
    };

    const messagesArray = Array.isArray(messages) ? messages : [];

    if (metadata.sources?.length) {
      const contextMessage = {
        id: crypto.randomUUID(),
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
    console.log('📤 sendMessage called with input:', customInput, 'and metadata:', metadata);
    const messageToSend = typeof customInput === 'string' ? customInput : input;

    if (!messageToSend?.trim?.()) return;
    if (!notebookId) return alert('Please select a notebook first.');

    const [finalMessages, userMessage] = buildMessageContext(messageToSend, metadata);
    const updatedUI = [...messages, userMessage];

    console.log('📤 Sending message:', updatedUI);
    setMessages(updatedUI);
    setInput('');
    setLoading(true);

    // Auto-update notebook title from first message
    if (messages.length === 0) {
      const trimmed = messageToSend.trim().slice(0, 40).replace(/\n/g, ' ');
      if (trimmed) {
        await updateNotebookTitle(trimmed);
      }
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
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.message.content,
            timestamp: new Date().toISOString(),
            ...(metadata.sources ? { sources: metadata.sources } : {}),
          }
        : {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '[Error: No message returned]',
            timestamp: new Date().toISOString(),
          };

      const updatedMessages = [...updatedUI, assistantMessage];
      setMessages(updatedMessages);
      await saveNotebook(updatedMessages);

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
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '[Error: Unable to fetch response]',
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...updatedUI, errorMessage];
      setMessages(updatedMessages);
      await saveNotebook(updatedMessages);
    }

    setLoading(false);
  };

  function extractPythonCode(markdown) {
    const match = markdown.match(/```python\s+([\s\S]*?)```/);
    return match ? match[1] : null;
  }

  async function runPython(codeMarkdown) {
    console.log('🐍 Running Python code from markdown:', codeMarkdown);
    const code = extractPythonCode(codeMarkdown);
    if (!code) return;

    const { success, result } = await window.chatAPI.runPythonCode(code);

    const newMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `\`\`\`${success ? 'python-output' : 'error'}\n${result.trim()}\n\`\`\``,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    await saveNotebook(updatedMessages);
  }

  const {
    handleDocumentUpload,
    handleSummarizeDoc,
    sendRAGQuestion,
    searchDocuments,
    handleMediaUpload,
  } = useDocumentManager({
    notebookId: notebookId, // Updated to use notebookId parameter name
    messages,
    setMessages,
    setToast,
    setRagData,
    setDocUploaded,
    setDownloading,
    setStatus,
    setProgress,
    setDetail,
    ragData,
    sendMessage,
    setRagMode,
    setSessionDocs: (docs) => {
      setFiles(prev => ({ ...prev, docs }));
    },
    modelSelected,
    setModelSelected,
    refreshFiles, // Pass refreshFiles function
  });

  const handleExport = async () => {
    console.log('📤 Exporting notebook:', notebookId);
    if (!notebookId) return;
    await window.notebookAPI.exportNotebook(notebookId);
  };

  function escapeHtmlDangerousTags(input) {
    return input
      .replace(/<textarea/gi, '&lt;textarea')
      .replace(/<\/textarea>/gi, '&lt;/textarea&gt;')
      .replace(/<script/gi, '&lt;script')
      .replace(/<\/script>/gi, '&lt;/script&gt;');
  }

  function renderWithThinking(text, sources = [], onRunCode, mediaFile = null) {
    console.log('🔄 renderWithThinking called with text:', text, 'sources:', sources);
    const parts = text.split(/(<think>[\s\S]*?<\/think>)/g);

    const shouldShowRunButton =
      typeof onRunCode === 'function' &&
      text.includes('```python') &&
      !text.includes('```python-output');

    console.log('🔄 shouldShowRunButton:', shouldShowRunButton);

    return (
      <>
        {mediaFile && (
          <div className="mb-3">
            <MediaDisplay mediaFile={mediaFile} chatId={notebookId} />
          </div>
        )}

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

        {shouldShowRunButton && (
          <button
            className="mt-2 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition"
            onClick={onRunCode}
          >
            ▶ Run Code
          </button>
        )}

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

  const handleCancelDownload = () => {
    window.chatAPI.cancelDownload?.();
    setDownloading(null);
    setStatus(null);
    setProgress(null);
  };

  if (!notebook) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading notebook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen from-[#f4f7fb] via-[#e6edf7] to-[#dce8f2] dark:from-gray-900 dark:via-gray-800 dark:bg-[#1c1d1e] text-zinc-900 dark:text-white transition-colors">
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

      {/* Main Notebook Column */}
      <div className="flex flex-col flex-1 h-full scrollbar-thin scrollbar-thumb-amber-600 scrollbar-track-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">{notebook.title}</h1>
              {notebook.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{notebook.description}</p>
              )}
            </div>
          </div>
          
          <ChatHeader
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            handleExport={handleExport}
            handleImport={() => {}} // Not needed in workspace view
            setModelSelected={setModelSelected}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-500 dark:scrollbar-track-gray-800 scrollbar-track-gray-200">
          {!modelSelected ? (
            <ModelSelector onSelect={setModelSelected} />
          ) : messages.length === 0 ? (
            <div className="mt-32 text-center text-gray-600 dark:text-gray-400">
              <h2 className="text-2xl font-semibold mb-3">
                📓 {notebook.title}
              </h2>
              <p className="text-sm italic mb-6">
                Start your conversation with {modelSelected} model
              </p>
            </div>
          ) : (
            <>
              {Array.isArray(messages) && messages.map((m, i) => (
                <div
                  key={m.id || i}
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
                      ? renderWithThinking(m.content, m.sources, () => runPython(m.content), m.mediaFile)
                      : (
                        <>
                          {m.mediaFile && (
                            <div className="mb-3">
                              <MediaDisplay mediaFile={m.mediaFile} chatId={notebookId} />
                            </div>
                          )}
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {m.content}
                          </ReactMarkdown>
                        </>
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
            chatId={notebookId}
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
            onMediaUpload={handleMediaUpload}
          />
        )}
      </div>

      {/* Sidebar */}
      {modelSelected && (
        <NotebookSidebar
          notebook={notebook}
          files={files}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          searchDocuments={searchDocuments}
        />
      )}

      {/* Download Progress Modal */}
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

export default NotebookWorkspace;
