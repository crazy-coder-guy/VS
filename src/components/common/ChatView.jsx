import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { projectSocket } from '../../services/ProjectService';

const ChatView = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hello! I am your DeepSeek-powered assistant. How can I help you today?' }]);
  const [isThinking, setIsThinking] = useState(false);
  const [status, setStatus] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  useEffect(() => {
    const handleResponse = (data) => {
      if (data.isThinking) {
        setIsThinking(true);
      } else {
        setIsThinking(false);
        setStatus('');
        setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
      }
    };

    const handleProgress = (data) => {
      setStatus(data.status);
    };

    projectSocket.on('ai-chat-response', handleResponse);
    projectSocket.on('ai-chat-progress', handleProgress);

    return () => {
      projectSocket.off('ai-chat-response', handleResponse);
      projectSocket.off('ai-chat-progress', handleProgress);
    };
  }, []);

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    
    const userMsg = input.trim();
    setMessages([...messages, { role: 'user', text: userMsg }]);
    setInput('');
    setIsThinking(true);
    
    projectSocket.emit('ai-chat-request', { prompt: userMsg });
  };

  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.path) {
        // Add file reference to input
        const refText = `@${data.path} `;
        setInput(prev => prev.includes(refText) ? prev : prev + refText);
      }
    } catch (err) {
      console.error("Drop failed:", err);
    }
  };

  const [currentRoot, setCurrentRoot] = useState('');

  useEffect(() => {
    projectSocket.on('project-root-updated', ({ path }) => {
      setCurrentRoot(path);
    });
    // Request initial root if needed
    projectSocket.emit('git-refresh-status'); // This often triggers root related updates
    return () => projectSocket.off('project-root-updated');
  }, []);

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        padding: '10px',
        backgroundColor: isOver ? 'rgba(0, 122, 204, 0.05)' : 'transparent',
        transition: 'background-color 0.2s',
        border: isOver ? '2px dashed var(--accent-primary)' : '2px solid transparent',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: '10px', opacity: 0.6, fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>AI CHAT</span>
          {isOver && <span style={{ color: 'var(--accent-primary)' }}>Drop to add file reference</span>}
        </div>
        {currentRoot && (
          <div style={{ 
            fontSize: '9px', 
            opacity: 0.5, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            backgroundColor: 'var(--bg-secondary)',
            padding: '2px 4px',
            borderRadius: '2px'
          }}>
            Root: {currentRoot}
          </div>
        )}
      </div>
      
      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px', paddingRight: '4px' }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            padding: '8px', borderRadius: '4px',
            backgroundColor: msg.role === 'assistant' ? 'var(--bg-secondary)' : 'var(--accent-primary)',
            alignSelf: msg.role === 'assistant' ? 'flex-start' : 'flex-end',
            maxWidth: '92%', fontSize: 'var(--font-size-sm)',
            border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', opacity: 0.7 }}>
              {msg.role === 'assistant' ? <Bot size={12} /> : <User size={12} />}
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>{msg.role === 'assistant' ? 'AI' : 'YOU'}</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
              {msg.text}
            </div>
          </div>
        ))}

        {(isThinking || status) && (
          <div style={{
            padding: '8px', borderRadius: '4px',
            backgroundColor: 'var(--bg-secondary)',
            alignSelf: 'flex-start',
            maxWidth: '92%', fontSize: 'var(--font-size-xs)',
            border: '1px solid var(--border-color)',
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>{status || 'Thinking...'}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isThinking ? "AI is working..." : "Ask AI to read or edit code..."}
          disabled={isThinking}
          style={{
            flex: 1, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', padding: '6px 10px', fontSize: 'var(--font-size-md)', borderRadius: '4px', outline: 'none',
            opacity: isThinking ? 0.6 : 1
          }}
        />
        <button 
          onClick={handleSend} 
          disabled={isThinking}
          style={{ 
            backgroundColor: isThinking ? 'var(--bg-secondary)' : 'var(--accent-primary)', 
            border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: isThinking ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ChatView;

