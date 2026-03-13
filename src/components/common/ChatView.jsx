import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

const ChatView = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hello! How can I help you today?' }]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm a VS Code-like AI assistant. I can help you with your code!" }]);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: '10px', opacity: 0.6, fontWeight: 'bold' }}>AI CHAT</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            padding: '8px', borderRadius: '4px',
            backgroundColor: msg.role === 'assistant' ? 'var(--bg-secondary)' : 'var(--accent-primary)',
            alignSelf: msg.role === 'assistant' ? 'flex-start' : 'flex-end',
            maxWidth: '90%', fontSize: 'var(--font-size-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', opacity: 0.7 }}>
              {msg.role === 'assistant' ? <Bot size={12} /> : <User size={12} />}
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>{msg.role === 'assistant' ? 'AI' : 'YOU'}</span>
            </div>
            {msg.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI..."
          style={{
            flex: 1, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', padding: '6px 10px', fontSize: 'var(--font-size-md)', borderRadius: '4px', outline: 'none'
          }}
        />
        <button onClick={handleSend} style={{ backgroundColor: 'var(--accent-primary)', border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
