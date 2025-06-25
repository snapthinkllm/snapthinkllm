import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Sidebar from './ui-elements/Sidebar';
import ModelSelector from './pages/ModelSelector';
import ChatHeader from './ui-elements/ChatHeader';
import ChatFooter from './ui-elements/ChatFooter';

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

  const sendMessage = async (customInput) => {
    const messageToSend = typeof customInput === 'string' ? customInput : input;

    if (!messageToSend?.trim?.()) return;
    if (!chatId) return alert('Please create or select a chat session first.');

    const userMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (messages.length === 0) {
      const trimmed = messageToSend.trim().slice(0, 40).replace(/\n/g, ' ');
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
      const totalText = updatedMessages.map((m) => m.content).join(' ');
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

    // Convert file to Uint8Array for binary IPC transfer
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
      alert('Unsupported file type. Please upload a PDF, TXT, or Markdown file.');
      return;
    }

    console.log(`✅ Parsed ${ext.toUpperCase()} Text Length:`, text.length);
    console.log('📄 Preview:\n', text.trim().slice(0, 500));

    // Compose final summarization prompt
    const fullPrompt = `📄 Summarize the uploaded ${ext.toUpperCase()} content below.${
      ext === 'pdf'
        ? ' The content may include tables flattened into plain text. Try to infer tabular structure from spacing.'
        : ''
    }\n\n${text}`;

    const userMessage = {
      role: 'user',
      content: fullPrompt,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    await window.chatAPI.saveChat({ id: chatId, messages: newMessages });

    sendMessage(fullPrompt);
  } catch (err) {
    console.error('❌ Document upload error:', err);
    alert('Failed to parse or upload the document. Please try another file.');
  }
};



  function renderWithThinking(text) {
    if (typeof text !== 'string') return null;

    const parts = text.split(/(<think>[\s\S]*?<\/think>)/g);

    return parts.map((part, index) => {
      const trimmed = part.trim();

      if (trimmed.startsWith('<think>') && trimmed.endsWith('</think>')) {
        const content = trimmed.slice(7, -8).trim(); // Remove <think> tags
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
    });
  }


  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f4f7fb] via-[#e6edf7] to-[#dce8f2] dark:from-gray-900 dark:via-gray-800 dark:to-black text-zinc-900 dark:text-white transition-colors">
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
          <ChatFooter
            chatId={chatId}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            handleDocumentUpload={handleDocumentUpload}
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
