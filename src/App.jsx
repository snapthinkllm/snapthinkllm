import { useEffect, useState, useRef } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('openai');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    window.chatAPI.loadChat().then(setMessages);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleModel = () => {
    setModel((prev) => (prev === 'openai' ? 'ollama' : 'openai'));
  };

  // async function sendMessage() {
  //   const userMessage = { role: 'user', content: input };
  //   const newMessages = [...messages, userMessage];
  //   setMessages(newMessages);
  //   setInput('');
  //   setLoading(true);

  //   let assistantMessage;

  //   try {
  //     if (model === 'openai') {
  //       const res = await fetch('https://api.openai.com/v1/chat/completions', {
  //         method: 'POST',
  //         headers: {
  //           Authorization: 'Bearer YOUR_OPENAI_KEY',
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           model: 'gpt-4',
  //           messages: newMessages,
  //         }),
  //       });

  //       const data = await res.json();
  //       assistantMessage = data.choices[0].message;
  //     } else {
  //       const res = await fetch('http://localhost:11434/api/chat', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           model: 'llama3',
  //           messages: newMessages,
  //         }),
  //       });

  //       const data = await res.json();
  //       assistantMessage = data.message
  //         ? { role: 'assistant', content: data.message.content }
  //         : { role: 'assistant', content: '[Error: No message returned]' };
  //     }

  //     const updatedMessages = [...newMessages, assistantMessage];
  //     setMessages(updatedMessages);
  //     window.chatAPI.saveChat(updatedMessages);
  //   } catch (err) {
  //     setMessages([
  //       ...newMessages,
  //       { role: 'assistant', content: '[Error: Unable to fetch response]' },
  //     ]);
  //   }

  //   setLoading(false);
  // }
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input,  timestamp: new Date().toISOString(), };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const assistantMessage = {
        role: 'assistant',
        content: `You said: "${userMessage.content}" (mock reply from ${model})`,
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      window.chatAPI.saveChat(updatedMessages);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-lime-100 via-cyan-100 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-black text-zinc-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="p-4 bg-white/70 dark:bg-gray-800/80 backdrop-blur border-b border-gray-300 dark:border-gray-700 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-teal-700 dark:text-lime-300">🧠 LLM UI</h1>
        <div className="space-x-2">
          <button
            onClick={toggleModel}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
          >
            {model === 'openai' ? '🔗 ChatGPT API' : '💻 Ollama Local'}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
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
                ? 'bg-teal-500 text-white self-end ml-auto'
                : 'bg-white/70 dark:bg-gray-700/60 text-black dark:text-white self-start mr-auto'
            }`}
          >
            <div className="text-xs opacity-60 mb-1">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div>
              <b>{m.role === 'user' ? 'You' : 'Bot'}:</b> {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="max-w-lg px-5 py-3 rounded-2xl bg-white/70 dark:bg-gray-700/60 text-black dark:text-white self-start mr-auto shadow-md">
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
          className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-lime-400"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-gradient-to-r from-teal-500 to-lime-500 hover:from-teal-600 hover:to-lime-600 text-white px-5 py-2 rounded-xl shadow-md transition duration-300"
        >
          Send
        </button>
      </footer>
    </div>
  );
}

export default App;
