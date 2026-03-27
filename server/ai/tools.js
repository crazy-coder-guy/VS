import fs from 'fs/promises';
import path from 'path';

/**
 * Tools available to the AI agent.
 * Each tool should be an object with:
 * - name: The name of the tool
 * - description: What the tool does
 * - parameters: JSON schema for the parameters
 * - execute: The function to run
 */

export const tools = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file from the workspace root.' },
        lineNumbers: { type: 'boolean', description: 'Whether to include line numbers in the output.' }
      },
      required: ['path']
    },
    execute: async (args, rootDir) => {
      const fullPath = path.isAbsolute(args.path) ? args.path : path.join(rootDir, args.path);
      console.log(`[Tool:read_file] path=${args.path}, fullPath=${fullPath}`);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          const list = entries
            .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
            .map(e => `${e.name}${e.isDirectory() ? '/' : ''}`)
            .join('\n');
          return `This is a directory. Contents:\n${list}\nTo see the content of a specific file, call read_file on its path (e.g., "${args.path}/${entries[0]?.name || 'filename'}").`;
        }
        let content = await fs.readFile(fullPath, 'utf8');
        if (args.lineNumbers) {
          content = content.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
        }
        return content;
      } catch (error) {
        return `Error reading file: ${error.message}`;
      }
    }
  },
  {
    name: 'replace_content',
    description: 'Replace a specific block of text in a file with new content. Use this for precise edits.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file.' },
        search: { type: 'string', description: 'The exact block of code to find (including whitespace).' },
        replace: { type: 'string', description: 'The new code block to replace it with.' }
      },
      required: ['path', 'search', 'replace']
    },
    execute: async (args, rootDir) => {
      const fullPath = path.isAbsolute(args.path) ? args.path : path.join(rootDir, args.path);
      console.log(`[Tool:replace_content] path=${args.path}`);
      try {
        let content = await fs.readFile(fullPath, 'utf8');
        if (!content.includes(args.search)) {
          return `Error: Could not find the exact 'search' content in ${args.path}. Please ensure you provided the exact text, including whitespace and line breaks.`;
        }
        const newContent = content.replace(args.search, args.replace);
        await fs.writeFile(fullPath, newContent, 'utf8');
        return `Successfully updated ${args.path}`;
      } catch (error) {
        return `Error updating file: ${error.message}`;
      }
    }
  },
  {
    name: 'remove_comments',
    description: 'Remove all comments (//, /* */) from a file efficiently.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file.' }
      },
      required: ['path']
    },
    execute: async (args, rootDir) => {
      const fullPath = path.isAbsolute(args.path) ? args.path : path.join(rootDir, args.path);
      console.log(`[Tool:remove_comments] path=${args.path}`);
      try {
        let content = await fs.readFile(fullPath, 'utf8');
        
        // Match strings and comments. If it's a comment, remove it. If it's a string, keep it.
        const cleaned = content.replace(/(".*?"|'.*?'|`[\s\S]*?`|\/\*[\s\S]*?\*\/|\/\/.*)/g, (match) => {
          if (match.startsWith('//') || match.startsWith('/*')) {
            return '';
          }
          return match;
        });
        
        await fs.writeFile(fullPath, cleaned, 'utf8');
        return `Successfully removed all comments from ${args.path}`;
      } catch (error) {
        return `Error: ${error.message}`;
      }
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the workspace (overwrites existing).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file.' },
        content: { type: 'string', description: 'Full content to write to the file.' }
      },
      required: ['path', 'content']
    },
    execute: async (args, rootDir) => {
      const fullPath = path.isAbsolute(args.path) ? args.path : path.join(rootDir, args.path);
      console.log(`[Tool:write_file] path=${args.path}, fullPath=${fullPath}`);
      try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, args.content, 'utf8');
        return `Successfully wrote to ${args.path}`;
      } catch (error) {
        return `Error writing file: ${error.message}`;
      }
    }
  },
  {
    name: 'list_files',
    description: 'List files in a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the directory (default is root ".").' }
      }
    },
    execute: async (args, rootDir) => {
      const dirPath = path.isAbsolute(args.path || '.') ? (args.path || '.') : path.join(rootDir, args.path || '.');
      console.log(`[Tool:list_files] path=${args.path}, fullPath=${dirPath}`);
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries
          .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
          .map(e => `${e.name}${e.isDirectory() ? '/' : ''}`)
          .join('\n');
      } catch (error) {
        return `Error listing directory: ${error.message}`;
      }
    }
  },
  {
    name: 'get_workspace_info',
    description: 'Get information about the current workspace root and its contents.',
    parameters: { type: 'object', properties: {} },
    execute: async (args, rootDir) => {
      try {
        const entries = await fs.readdir(rootDir, { withFileTypes: true });
        const list = entries
          .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
          .map(e => `${e.name}${e.isDirectory() ? '/' : ''}`)
          .slice(0, 20) // Just a snippet
          .join('\n');
        return `Current Workspace Root: ${rootDir}\n\nTop-level contents:\n${list}`;
      } catch (error) {
        return `Error getting workspace info: ${error.message}`;
      }
    }
  },
  {
    name: 'set_project_root',
    description: 'Change the current workspace root directory (Absolute path).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The absolute path to the folders you want to switch to.' }
      },
      required: ['path']
    },
    execute: async (args, rootDir, setRootDir) => {
      if (typeof setRootDir !== 'function') return "Error: setRootDir not available.";
      try {
        setRootDir(args.path);
        return `Successfully switched project root to: ${args.path}`;
      } catch (error) {
        return `Error switching root: ${error.message}`;
      }
    }
  }
];
