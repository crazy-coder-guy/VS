import axios from 'axios';
import { tools } from './tools.js';

const DEEPSEEK_API_URL = process.env.AI_API_URL || 'http://localhost:11434/v1/chat/completions';
const MODEL_NAME = process.env.AI_MODEL || 'qwen2.5-coder:7b';

const SYSTEM_PROMPT = `You are Antigravity, a powerful AI coding assistant integrated into a VS Code-like IDE.
You have access to the user's project files and can read/write them using tools.
Be concise and professional.

Tool Calling Protocol:
1. When you need to read or edit a file, you MUST use the available tools.
2. If the user DRAGS a file or folder into the chat, it adds "@path/to/item" to their prompt.
3. MANDATORY: If you see an "@path/to/item" reference, you MUST call 'read_file' on that path before responding.
4. If a tool fails with "Error reading file: ... no such file or directory", you MUST call 'get_workspace_info' to see where you are.
5. You can use EITHER absolute paths (like D:\...) or relative paths. If the @reference is an absolute path, use it exactly as provided (stripping the @).
6. If 'get_workspace_info' shows you are in the wrong project, inform the user or call 'set_project_root' if you have the correct absolute path.
7. Strip "@" prefixes from all paths before passing them to tools.

Precise Editing (Cursor-like):
- To edit existing files, prefer 'replace_content' over 'write_file'.
- 'replace_content' requires an EXACT match of the 'search' block. 
- Use 'read_file' with 'lineNumbers: true' to see the exact content and indentation before calling 'replace_content'.
- To remove ALL comments from a file, use the specialized 'remove_comments' tool for maximum efficiency.
- To remove specific comments or large blocks, provide the exact multi-line block in 'search' and the cleaned version in 'replace'.

Project Context:
- You have tools to list files, read files, and write files. Use them proactively to explore.
`;

export async function runAgent(userPrompt, rootDir, onProgress, setRootDir) {
  let messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];

  let iterations = 0;
  const maxIterations = 20;

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

      console.log(`[AI Agent] Raw Model Response:`, message.content);
      if (message.tool_calls) console.log(`[AI Agent] Native Tool Calls:`, JSON.stringify(message.tool_calls));

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const tool = tools.find(t => t.name === toolCall.function.name);
          if (tool) {
            onProgress({ status: `Calling tool: ${tool.name}...`, role: 'assistant' });
            let args = JSON.parse(toolCall.function.arguments);
            
            // Safety: Strip '@' from path if the AI left it in
            if (args.path && typeof args.path === 'string' && args.path.startsWith('@')) {
              console.log(`[AI Agent] Stripping @ from tool_call path: ${args.path}`);
              args.path = args.path.substring(1);
            }

            const result = await tool.execute(args, rootDir, setRootDir);
            
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: tool.name,
              content: String(result)
            });
          }
        }
      } else {
        // Fallback: If Qwen returns JSON instead of real tool_calls (often happens with local models)
        let content = message.content || "";
        
        // Extract JSON from markdown if exists
        const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        let jsonStr = null;

        if (markdownMatch) {
          jsonStr = markdownMatch[1];
        } else {
          // Look for something that looks like a JSON object: starts with { and ends with }
          // We use a greedy match to get the outermost object
          const lastBraceIndex = content.lastIndexOf('}');
          const firstBraceIndex = content.indexOf('{');
          if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
            jsonStr = content.substring(firstBraceIndex, lastBraceIndex + 1);
          }
        }
        
        if (jsonStr) {
           console.log(`[AI Agent] Attempting to parse extracted JSON`);
           try {
             const potentialTool = JSON.parse(jsonStr.trim());
             
             if (potentialTool.name && potentialTool.arguments) {
               console.log(`[AI Agent] Executing fallback tool: ${potentialTool.name}`);
               onProgress({ status: `Calling tool (extracted): ${potentialTool.name}...`, role: 'assistant' });
               const tool = tools.find(t => t.name === potentialTool.name);
               if (tool) {
                 let args = potentialTool.arguments;
                 if (args.path && typeof args.path === 'string') {
                    if (args.path.startsWith('@')) {
                      console.log(`[AI Agent] Stripping @ from fallback path: ${args.path}`);
                      args.path = args.path.substring(1);
                    }
                 }
                 const result = await tool.execute(args, rootDir, setRootDir);
                 
                 // Push the simulated messages
                 messages.push({ role: 'assistant', content: `Executing ${potentialTool.name}...` });
                 messages.push({ role: 'user', content: `Tool Result: ${result}` });
                 continue; 
               }
             }
           } catch (e) { 
             console.log("[AI Agent] JSON Fallback failed to parse:", e.message);
             console.log("[AI Agent] Failed string was:", jsonStr);
           }
        }
        return message.content;
      }
    } catch (error) {
      console.error('Agent Error:', error.response?.data || error.message);
      return `Error from AI: ${error.message}`;
    }
  }

  return "I've reached my maximum reasoning steps for this request.";
}
