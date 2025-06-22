import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Sidebar from './ui-elements/Sidebar';
import ModelSelector from './pages/ModelSelector';

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
    await window.chatAPI.renameChat({ id, name: defaultName });
  };

  const switchChat = async (id) => {
    setChatId(id);
    const data = await window.chatAPI.loadChat(id);
    setMessages(data);
  };

  const updateChatName = async (id, newName) => {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, name: newName } : s)));
    await window.chatAPI.renameChat({ id, name: newName });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!chatId) return alert('Please create or select a chat session first.');

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (messages.length === 0) {
      const trimmed = input.trim().slice(0, 40).replace(/\n/g, ' ');
      if (trimmed) updateChatName(chatId, trimmed);
    }

    const start = performance.now();

    try {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelSelected,
          messages: newMessages,
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
          }
        : {
            role: 'assistant',
            content: '[Error: No message returned]',
            timestamp: new Date().toISOString(),
          };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      await window.chatAPI.saveChat({ id: chatId, messages: updatedMessages });

      const estimateTokens = (text) => Math.round(text.split(/\s+/).length / 0.75);
      const totalText = updatedMessages.map(m => m.content).join(' ');
      const totalTokens = estimateTokens(totalText);
      const responseTokens = estimateTokens(assistantMessage.content);
      const tokensPerSecond = elapsedSeconds > 0 ? Math.round(responseTokens / elapsedSeconds) : 0;

      setStats({
        totalTokens,
        tokensPerSecond,
        contextTokens: estimateTokens(JSON.stringify(newMessages)),
      });
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: '[Error: Unable to fetch response]',
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      await window.chatAPI.saveChat({ id: chatId, messages: updatedMessages });
    }

    setLoading(false);
  };

  const deleteChat = async (id) => {
    await window.chatAPI.deleteChat(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (chatId === id) {
      setChatId('');
      setMessages([]);
    }
  };

  function renderWithThinking(text) {
  const parts = text.split(/(<think>[\s\S]*?<\/think>)/g); // Split by <think> blocks

  return parts.map((part, index) => {
    if (part.startsWith('<think>') && part.endsWith('</think>')) {
      const content = part.slice(7, -8); // Remove <think> tags
      return (
        <div
          key={index}
          className="my-2 p-2 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 italic text-sm rounded"
        >
          💭 <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {content.trim()}
          </ReactMarkdown>
        </div>
      );
    }
    // Render other parts with markdown too
    return (
      <ReactMarkdown
        key={index}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        className="mb-2"
      >
        {part}
      </ReactMarkdown>
    );
  });
}

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f4f7fb] via-[#e6edf7] to-[#dce8f2] dark:from-gray-900 dark:via-gray-800 dark:to-black text-zinc-900 dark:text-white transition-colors">
      {/* Main Chat Column */}
      <div className="flex flex-col flex-1 h-full">
        {/* Header */}
        <header className="p-4 bg-white/80 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#1e4b6d] dark:text-lime-300">🧠 SnapThink LLM</h1>
          <div className="flex items-center gap-2">
            <button
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow transition"
            >
              {darkMode ? '🌞' : '🌙'}
            </button>

            <button
              title="Open Chat Folder"
              onClick={() => window.chatAPI.showChatFolder()}
              className="p-2 rounded-full bg-yellow-600 hover:bg-yellow-700 text-white shadow transition"
            >
              📁
            </button>

            <button
              title="Change Model"
              onClick={() => setModelSelected(null)}
              className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition"
            >
              🔄
            </button>
          </div>

        </header>

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
                      ? 'bg-[#a8c3ff] text-white dark:bg-gray-600 dark:text-white self-end ml-auto'
                      : 'bg-[#e6edf7] dark:bg-slate-800 text-black dark:text-white self-start mr-auto'
                  }`}
                >
                  <div className="text-xs opacity-60 mb-1">
                    <b>{m.role === 'user' ? 'You' : 'Bot'}:</b>{' '}
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    {m.role === 'assistant'
                      ? renderWithThinking(m.content)
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
          <footer className="p-4 bg-white/70 dark:bg-gray-800/80 backdrop-blur border-t border-gray-300 dark:border-gray-700 flex items-center space-x-2">
            <input
              className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#87a0c9] dark:focus:ring-lime-400"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] hover:from-[#0284c7] hover:to-[#4f46e5] text-white px-5 py-2 rounded-xl shadow-md transition duration-300"
            >
              Send
            </button>
          </footer>
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
