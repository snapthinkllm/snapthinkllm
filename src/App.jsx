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
    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Simulated LLM response
    setTimeout(() => {
      const assistantMessage = {
        role: 'assistant',
        content: `You said: "${userMessage.content}" (mock reply from ${model})`,
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      window.chatAPI.saveChat(updatedMessages);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="p-4 border-b border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex justify-between items-center">
        <h1 className="text-xl font-semibold">💬 LLM UI Desktop</h1>
        <div className="space-x-2">
          <button
            onClick={toggleModel}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {model === 'openai' ? '🔗 ChatGPT API' : '💻 Ollama Local'}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded"
          >
            {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-lg px-4 py-2 rounded-lg ${
              m.role === 'user'
                ? 'bg-blue-500 text-white self-end ml-auto'
                : 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white self-start mr-auto'
            }`}
          >
            <b>{m.role === 'user' ? 'You' : 'Bot'}:</b> {m.content}
          </div>
        ))}
        {loading && (
          <div className="max-w-lg px-4 py-2 rounded-lg bg-zinc-300 dark:bg-zinc-700 self-start mr-auto text-black dark:text-white">
            <b>assistant:</b> Typing...
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </main>

      {/* Input */}
      <footer className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center space-x-2">
        <input
          className="flex-1 p-2 rounded border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-black dark:text-white"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Send
        </button>
      </footer>
    </div>
  );
}

export default App;

