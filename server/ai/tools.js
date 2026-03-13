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
        path: { type: 'string', description: 'Relative path to the file from the workspace root.' }
      },
      required: ['path']
    },
    execute: async (args, rootDir) => {
      const fullPath = path.join(rootDir, args.path);
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        return content;
      } catch (error) {
        return `Error reading file: ${error.message}`;
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
      const fullPath = path.join(rootDir, args.path);
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
      const dirPath = path.join(rootDir, args.path || '.');
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
  }
];
