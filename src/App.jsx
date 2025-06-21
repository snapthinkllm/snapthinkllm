import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

function App() {
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
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

  const newChat = () => {
    const id = `chat-${Date.now()}`;
    setChatId(id);
    setMessages([]);
    setSessions(prev => [...prev, { id, name: id }]);
  };

  const switchChat = async (id) => {
    setChatId(id);
    const data = await window.chatAPI.loadChat(id);
    setMessages(data);
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

    try {
      console.log('Sending messages to API:', newMessages);
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3:4b',
          messages: newMessages,
          stream: false
        }),
      });

      console.log('API response status:', res.status, res);

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
      window.chatAPI.saveChat({ id: chatId, messages: updatedMessages });
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: '[Error: Unable to fetch response]',
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      window.chatAPI.saveChat({ id: chatId, messages: updatedMessages });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#f4f7fb] via-[#e6edf7] to-[#dce8f2] dark:from-gray-900 dark:via-gray-800 dark:to-black text-zinc-900 dark:text-white transition-colors">
      {/* Main Chat Column */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="p-4 bg-white/80 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#1e4b6d] dark:text-lime-300">🧠 LLM UI</h1>
          <div className="space-x-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-500 hover:to-cyan-600 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
            >
              {darkMode ? '🌞 Light' : '🌙 Dark'}
            </button>
            <button
              onClick={() => window.chatAPI.showChatFolder()}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow transition"
            >
              📂 Show Chat Folder
            </button>
          </div>
        </header>

        {/* Chat area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-lg px-5 py-3 rounded-2xl shadow-md transition-all duration-300 ${
                m.role === 'user'
                  ? 'bg-[#87a0c9] text-white self-end ml-auto'
                  : 'bg-[#e6edf7] dark:bg-slate-800 text-black dark:text-white self-start mr-auto'
              }`}
            >
              <div className="text-xs opacity-60 mb-1">
                <b>{m.role === 'user' ? 'You ' : 'Bot '}: </b>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="max-w-lg px-5 py-3 rounded-2xl bg-[#e6edf7] dark:bg-gray-700/60 text-black dark:text-white self-start mr-auto shadow-md">
              <b>assistant:</b> Typing...
            </div>
          )}
          <div ref={messagesEndRef}></div>
        </main>

        <div className="text-sm px-4 py-2 bg-white/60 dark:bg-gray-800/80 backdrop-blur border-t border-gray-200 dark:border-gray-700 text-center">
          💬 {messages.length} messages ({messages.filter(m => m.role === 'user').length} from you)
        </div>

        {/* Input */}
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
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-l border-gray-200 dark:border-gray-700 bg-[#f4f7fb] dark:bg-gray-800/80 backdrop-blur p-4 space-y-4">
        <button
          onClick={newChat}
          className="w-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white py-2 rounded-lg hover:from-[#4f46e5] hover:to-[#6366f1] shadow"
        >
          + New Chat
        </button>
        <div className="overflow-y-auto space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => switchChat(s.id)}
              className={`w-full text-left px-4 py-2 rounded-lg ${
                s.id === chatId
                  ? 'bg-[#d6dfff] dark:bg-purple-600 text-black dark:text-white font-semibold'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default App;
