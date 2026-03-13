import axios from 'axios';
import { tools } from './tools.js';

const DEEPSEEK_API_URL = process.env.AI_API_URL || 'http://localhost:11434/v1/chat/completions';
const MODEL_NAME = process.env.AI_MODEL || 'qwen2.5-coder:7b';

const SYSTEM_PROMPT = `You are Antigravity, a powerful AI coding assistant integrated into a VS Code-like IDE.
You have access to the user's project files and can read/write them using tools.
Be concise and professional. When asked to fix an issue, first read the relevant files, then propose or perform the edit.
Always provide a brief explanation of your changes.

Guidelines:
- If you need to see a file, call 'read_file'.
- If you need to see directory structure, call 'list_files'.
- If you need to make a change, call 'write_file'.
- Answer in markdown.
`;

export async function runAgent(userPrompt, rootDir, onProgress) {
  let messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];

  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;
    try {
      onProgress({ status: 'Thinking...', role: 'assistant' });

      const response = await axios.post(DEEPSEEK_API_URL, {
        model: MODEL_NAME,
        messages: messages,
        tools: tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }))
      });

      const choice = response.data.choices[0];
      const message = choice.message;
      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const tool = tools.find(t => t.name === toolCall.function.name);
          if (tool) {
            onProgress({ status: `Calling tool: ${tool.name}...`, role: 'assistant' });
            const args = JSON.parse(toolCall.function.arguments);
            const result = await tool.execute(args, rootDir);
            
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: tool.name,
              content: String(result)
            });
          }
        }
      } else {
        // No more tool calls, return final response
        return message.content;
      }
    } catch (error) {
      console.error('Agent Error:', error.response?.data || error.message);
      return `Error from AI: ${error.message}`;
    }
  }

  return "I've reached my maximum reasoning steps for this request.";
}
