import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { projectSocket } from '../../services/ProjectService';
import { useTheme } from '../../context/ThemeContext';
import 'xterm/css/xterm.css';

const Terminal = ({ terminalId, initialCwd, name = 'powershell' }) => {
  const { theme } = useTheme();
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const themes = {
      dark: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        selectionBackground: '#264f78',
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
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        selectionBackground: '#add6ff',
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
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: themes[theme] || themes.dark,
      convertEol: true,
      scrollback: 10000
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    // Join the global terminal session
    projectSocket.emit('spawn-terminal', { terminalId, cwd: initialCwd });

    const outputEvent = `terminal-output-${terminalId}`;
    projectSocket.on(outputEvent, (data) => {
      term.write(data);
    });

    term.onData((data) => {
      projectSocket.emit('terminal-input', { terminalId, input: data });
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
        projectSocket.emit('terminal-resize', {
          terminalId,
          cols: term.cols,
          rows: term.rows
        });
      } catch (e) { }
    };

    setTimeout(handleResize, 50);

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      projectSocket.off(outputEvent);
      term.dispose();
    };
  }, [terminalId, theme, initialCwd]);

  // Handle theme changes
  useEffect(() => {
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
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        padding: '8px 0 0 8px',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    />
  );
};

export default Terminal;