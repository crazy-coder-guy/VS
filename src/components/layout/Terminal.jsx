import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useTheme } from '../../context/ThemeContext';
import 'xterm/css/xterm.css';

const Terminal = ({ terminalId, initialCwd = 'D:\\AICODE\\ai-ide' }) => {
  const { theme } = useTheme();
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Define themes
    const themes = {
      dark: {
        background: '#1e1e1e', // VS Code default dark background
        foreground: '#cccccc', // VS Code default text
        cursor: '#cccccc',
        selectionBackground: '#264f78', // VS Code selection
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      light: {
        background: '#ffffff', // VS Code default light background
        foreground: '#333333', // VS Code light text
        cursor: '#333333',
        selectionBackground: '#add6ff', // VS Code light selection
        black: '#000000',
        red: '#cd3131',
        green: '#008000',
        yellow: '#795e26',
        blue: '#0451a5',
        magenta: '#bc3fbc',
        cyan: '#0598bc',
        white: '#555555',
        brightBlack: '#666666',
        brightRed: '#cd3131',
        brightGreen: '#14ce14',
        brightYellow: '#b5ba00',
        brightBlue: '#0451a5',
        brightMagenta: '#bc3fbc',
        brightCyan: '#0598bc',
        brightWhite: '#a5a5a5'
      }
    };

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      theme: themes[theme] || themes.dark,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln('Windows PowerShell');
    term.writeln('Copyright (C) Microsoft Corporation. All rights reserved.');
    term.writeln('');
    term.writeln('Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows');
    term.writeln('');
    term.write(`\x1b[1;32mPS ${initialCwd}>\x1b[0m `);

    let currentLine = '';
    let currentDir = initialCwd;

    const getPrompt = () => `\x1b[1;32mPS ${currentDir}>\x1b[0m `;

    const handleCommand = (line) => {
      const parts = line.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (!cmd) return;

      if (cmd === 'help') {
        term.writeln('help        - List documentation for available commands');
        term.writeln('ls          - List directory contents');
        term.writeln('pwd         - Print working directory');
        term.writeln('echo [text] - Echo the provided text');
        term.writeln('clear       - Clear the terminal screen');
        term.writeln('npm start   - Mock starting the application');
        term.writeln('git status  - Mock git status check');
      } else if (cmd === 'ls') {
        term.writeln('\x1b[1;34msrc/\x1b[0m  \x1b[1;34mpublic/\x1b[0m  package.json  vite.config.js  node_modules/');
      } else if (cmd === 'cd' || cmd === 'cd..') {
        const pathArg = cmd === 'cd..' ? '..' : args[0];
        if (!pathArg || pathArg === '~') {
          currentDir = initialCwd;
        } else if (pathArg === '..' || pathArg === '../') {
          // Simple mock for moving up
          const parts = currentDir.split('\\');
          if (parts.length > 1) {
            parts.pop();
            currentDir = parts.join('\\');
            if (currentDir === 'D:') currentDir = 'D:\\';
          }
        } else {
          // Mock moving into a directory
          if (currentDir.endsWith('\\')) {
            currentDir = currentDir + pathArg;
          } else {
            currentDir = currentDir + '\\' + pathArg;
          }
        }
      } else if (cmd === 'pwd') {
        term.writeln(currentDir);
      } else if (cmd === 'clear' || cmd === 'cls') {
        term.reset();
      } else if (cmd === 'npm' && args[0] === 'start') {
        term.writeln('\x1b[1;32m> ai-ide-project@0.0.0 dev\x1b[0m');
        term.writeln('\x1b[1;32m> vite\x1b[0m');
        term.writeln('');
        term.writeln('\x1b[1;36m  VITE v5.0.0\x1b[0m  ready in 124ms');
        term.writeln('');
        term.writeln('\x1b[1;32m  ➜  Local:   http://localhost:5173/\x1b[0m');
      } else if (cmd === 'git' && args[0] === 'status') {
        term.writeln('On branch master');
        term.writeln("Your branch is up to date with 'origin/master'.");
        term.writeln('');
        term.writeln('nothing to commit, working tree clean');
      } else if (cmd === 'echo') {
        term.writeln(args.join(' '));
      } else {
        term.writeln(`\x1b[31m${cmd} : The term '${cmd}' is not recognized as the name of a cmdlet, function, script file, or operable program.\x1b[0m`);
        term.writeln(`\x1b[31mCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.\x1b[0m`);
      }
    };

    // Use onData for a better, more "real" feeling terminal
    term.onData(data => {
      const code = data.charCodeAt(0);
      if (code === 13) { // Enter
        term.write('\r\n');
        handleCommand(currentLine);
        currentLine = '';
        term.write(getPrompt());
      } else if (code === 127 || code === 8) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        currentLine += data;
        term.write(data);
      }
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    // Initial fit after a delay to ensure container is ready
    const resizeTimeout = setTimeout(() => {
      try {
         fitAddon.fit();
      } catch (e) {} // Ignore if terminal unmounted fast
    }, 100);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [terminalId]); // Re-mount if ID changes entirely

  useEffect(() => {
    // Dynamic theme applying without destroying Terminal
    if (xtermRef.current) {
        const isDark = theme === 'dark';
        xtermRef.current.options.theme = {
          background: isDark ? '#1e1e1e' : '#ffffff',
          foreground: isDark ? '#cccccc' : '#333333',
          cursor: isDark ? '#cccccc' : '#333333',
          selectionBackground: isDark ? '#264f78' : '#add6ff',
          black: '#000000',
          red: '#cd3131',
          green: isDark ? '#0dbc79' : '#008000',
          yellow: isDark ? '#e5e510' : '#795e26',
          blue: isDark ? '#2472c8' : '#0451a5',
          magenta: '#bc3fbc',
          cyan: isDark ? '#11a8cd' : '#0598bc',
          white: isDark ? '#e5e5e5' : '#555555',
          brightBlack: '#666666',
          brightRed: isDark ? '#f14c4c' : '#cd3131',
          brightGreen: isDark ? '#23d18b' : '#14ce14',
          brightYellow: isDark ? '#f5f543' : '#b5ba00',
          brightBlue: isDark ? '#3b8eea' : '#0451a5',
          brightMagenta: isDark ? '#d670d6' : '#bc3fbc',
          brightCyan: isDark ? '#29b8db' : '#0598bc',
          brightWhite: isDark ? '#e5e5e5' : '#a5a5a5'
        };
    }
  }, [theme]);

  return (
    <div
      ref={terminalRef}
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff', // Dynamic background
        padding: '10px 0 0 10px',
        overflow: 'hidden'
      }}
    />
  );
};

export default Terminal;
