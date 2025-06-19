import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    window.chatAPI.loadChat().then(setMessages);
  }, []);

  async function sendMessage() {
    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_OPENAI_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: newMessages
      })
    });

    const data = await res.json();
    const assistantMessage = data.choices[0].message;
    const updatedMessages = [...newMessages, assistantMessage];

    setMessages(updatedMessages);
    window.chatAPI.saveChat(updatedMessages);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>ChatGPT Desktop</h2>
      <div style={{ height: 400, overflowY: 'auto', border: '1px solid gray', padding: 10 }}>
        {messages.map((m, i) => (
          <div key={i}><b>{m.role}:</b> {m.content}</div>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App
