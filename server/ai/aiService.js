import { runAgent } from './agent.js';

export default function setupAIService(io, socket, getRootDir, setRootDir) {
  socket.on('ai-chat-request', async ({ prompt }) => {
    console.log(`AI request from ${socket.id}: ${prompt}`);
    
    try {
      socket.emit('ai-chat-response', { 
        role: 'assistant', 
        text: 'AI is thinking...', 
        isThinking: true 
      });

      const response = await runAgent(prompt, getRootDir(), (progress) => {
        socket.emit('ai-chat-progress', progress);
      }, setRootDir);

      socket.emit('ai-chat-response', { 
        role: 'assistant', 
        text: response, 
        isThinking: false 
      });
    } catch (error) {
      console.error('AI Service Error:', error);
      socket.emit('ai-chat-response', { 
        role: 'assistant', 
        text: `Error: ${error.message}`, 
        isThinking: false 
      });
    }
  });
}
