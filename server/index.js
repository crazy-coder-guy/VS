import express from 'express';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';
import pty from 'node-pty';
import os from 'os';
import cors from 'cors';
import chokidar from 'chokidar';
import { exec } from 'child_process';
import path from 'path';
import GitService from './services/gitService.js';
import setupAIService from './ai/aiService.js';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
let rootDir = process.cwd();
let gitService = new GitService(rootDir);
let watcher = null;

console.log(`Backend initialized at: ${rootDir}`);

// --- Project-wide Linting Service ---
let isLinting = false;
let lastProblems = [];
let lintTimeout = null;

const runProjectLint = async (socket = null) => {
  if (isLinting) return;
  
  if (lintTimeout) clearTimeout(lintTimeout);
  lintTimeout = setTimeout(() => {
    isLinting = true;
    
    // Check if ESLint config exists in rootDir
    const configFiles = [
      'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs',
      '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc.json'
    ];
    const hasConfig = configFiles.some(file => fs.existsSync(path.join(rootDir, file)));
    
    if (!hasConfig) {
      isLinting = false;
      console.log('No ESLint config found, skipping linting.');
      if (socket) socket.emit('project-problems', []);
      else io.emit('project-problems', []);
      return;
    }

    // We use --no-error-on-unmatched-pattern to avoid crashes on empty projects
    const command = 'npx eslint . --format json --no-error-on-unmatched-pattern';
    
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      isLinting = false;
      
      if (!stdout && stderr) {
        console.warn('ESLint stderr (non-fatal):', stderr);
      }

      if (stdout) {
        try {
          const results = JSON.parse(stdout);
          const problems = [];
          
          results.forEach(file => {
            const relPath = path.relative(rootDir, file.filePath).replace(/\\/g, '/');
            
            file.messages.forEach(msg => {
              problems.push({
                id: `${relPath}-${msg.line}-${msg.column}-${msg.ruleId || 'syntax'}`,
                filePath: relPath,
                file: path.basename(file.filePath),
                message: msg.message,
                severity: msg.severity === 2 ? 8 : 4,
                line: msg.line,
                column: msg.column,
                ruleId: msg.ruleId
              });
            });
          });
          
          lastProblems = problems;
          
          if (socket) {
            socket.emit('project-problems', problems);
          } else {
            io.emit('project-problems', problems);
          }
          console.log(`Linting complete: found ${problems.length} problems in the workspace.`);
        } catch (e) {
          console.error('Failed to parse ESLint output:', e);
        }
      }
    });
  }, 1000); // 1s debounce
};

// --- Git Status Update ---
const broadcastGitStatus = async () => {
  const status = await gitService.getStatus();
  const branches = await gitService.getBranches();
  const log = await gitService.getLog();
  io.emit('git-status', { ...status, ...branches, log });
};

// Initial project scan
runProjectLint();

const setupWatcher = (dir) => {
  if (watcher) watcher.close();
  
  watcher = chokidar.watch('.', {
    ignored: /(^|[\/\\])\..|node_modules|dist|build/,
    persistent: true,
    cwd: dir,
    ignoreInitial: true
  });

  watcher.on('all', (event, filePath) => {
    console.log(`File ${event}: ${filePath}, triggering updates...`);
    io.emit('file-changed', { event, filePath });
    runProjectLint();
    broadcastGitStatus();
  });
};

setupWatcher(rootDir);

// --- Socket Connection ---
io.on('connection', (socket) => {
  console.log('Client connected to Project Service');
  
  // Immediately send last known problems
  socket.emit('project-problems', lastProblems);
  
  // Trigger a fresh lint for this new client
  runProjectLint(socket);

  // Terminal PTY management
  socket.on('spawn-terminal', ({ terminalId, cwd }) => {
    const initialCwd = cwd || rootDir;
    console.log(`Spawning PTY for ${terminalId}: shell=${shell}, cwd=${initialCwd}`);

    let ptyProcess;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: initialCwd,
        env: { ...process.env, NODE_OPTIONS: '--no-deprecation' }
      });

      ptyProcess.onData((data) => {
        socket.emit(`terminal-output-${terminalId}`, data);
      });

      const inputHandler = (data) => {
        if (data.terminalId === terminalId) {
          ptyProcess.write(data.input);
        }
      };

      const resizeHandler = (data) => {
        if (data.terminalId === terminalId) {
          ptyProcess.resize(data.cols, data.rows);
        }
      };

      socket.on('terminal-input', inputHandler);
      socket.on('terminal-resize', resizeHandler);

      socket.on('disconnect', () => {
        console.log(`PTY ${terminalId} killed on disconnect`);
        ptyProcess.kill();
        socket.off('terminal-input', inputHandler);
        socket.off('terminal-resize', resizeHandler);
      });
    } catch (err) {
      console.error('Failed to spawn PTY:', err);
      socket.emit(`terminal-output-${terminalId}`, `\r\n\x1b[31mFailed to spawn PTY: ${err.message}\x1b[0m\r\n`);
    }
  });
  
  // --- Git Operations ---
  socket.on('git-refresh-status', async () => {
    const status = await gitService.getStatus();
    const branches = await gitService.getBranches();
    const log = await gitService.getLog();
    socket.emit('git-status', { ...status, ...branches, log });
  });

  socket.on('git-get-log', async () => {
    const log = await gitService.getLog();
    socket.emit('git-log', { log });
  });

  socket.on('git-stage-file', async ({ filepath }) => {
    try {
      await gitService.add(filepath);
      broadcastGitStatus();
    } catch (err) {
      socket.emit('git-error', err.message);
    }
  });

  socket.on('git-unstage-file', async ({ filepath }) => {
    try {
      await gitService.reset(filepath);
      broadcastGitStatus();
    } catch (err) {
      socket.emit('git-error', err.message);
    }
  });

  socket.on('git-commit', async ({ message, author }) => {
    try {
      await gitService.commit(message, author);
      broadcastGitStatus();
    } catch (err) {
      socket.emit('git-error', err.message);
    }
  });

  socket.on('git-get-diff', async ({ filepath }) => {
    try {
      const diff = await gitService.getDiff(filepath);
      socket.emit(`git-diff-${filepath}`, diff);
    } catch (err) {
      socket.emit('git-error', err.message);
    }
  });

  socket.on('set-project-root', ({ path: newPath }) => {
    if (!newPath) return;
    console.log(`Switching project root to: ${newPath}`);
    rootDir = newPath;
    gitService.setRootDir(rootDir);
    setupWatcher(rootDir);
    runProjectLint();
    broadcastGitStatus();
    socket.emit('project-root-updated', { path: rootDir });
  });

  // AI Service
  const updateRootDir = (newPath) => {
    if (!newPath) return;
    console.log(`AI Switching project root to: ${newPath}`);
    rootDir = newPath;
    gitService.setRootDir(rootDir);
    setupWatcher(rootDir);
    runProjectLint();
    broadcastGitStatus();
    socket.emit('project-root-updated', { path: rootDir });
  };

  setupAIService(io, socket, () => rootDir, updateRootDir);
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`IDE backend listening on port ${PORT}`);
  runProjectLint(); // Initial project scan
});
