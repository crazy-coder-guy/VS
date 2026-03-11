import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MonacoEditor from '@monaco-editor/react';
import { X, Terminal as TerminalIcon, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { closeFile, setActiveFile, createTerminal, setActiveTerminal, closeTerminal } from '../../store/fileSlice';
import { useTheme } from '../../context/ThemeContext';
import Terminal from './Terminal';
import extensionService from '../../services/extensionService';
import ExtensionDetailsView from '../editor/ExtensionDetailsView';
import DiffViewer from '../common/DiffViewer';

const Editor = () => {
  const { openFiles, activeFileId, terminals, activeTerminalId } = useSelector(state => state.files);
  const { installedExtensions, selectedExtensionId } = useSelector(state => state.extensions);
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [showTerminal, setShowTerminal] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState('terminal');
  const isResizingTerminal = useRef(false);

  // Load extensions on startup
  useEffect(() => {
    extensionService.loadInstalled(installedExtensions);
  }, []); // Only on mount

  const panelTabs = [
    { id: 'problems', label: 'PROBLEMS' },
    { id: 'output', label: 'OUTPUT' },
    { id: 'debug', label: 'DEBUG CONSOLE' },
    { id: 'terminal', label: 'TERMINAL' },
    { id: 'ports', label: 'PORTS' }
  ];

  const startResizingTerminal = (e) => {
    isResizingTerminal.current = true;
    document.addEventListener('mousemove', handleTerminalMouseMove);
    document.addEventListener('mouseup', stopResizingTerminal);
    document.body.style.cursor = 'row-resize';
  };

  const stopResizingTerminal = () => {
    isResizingTerminal.current = false;
    document.removeEventListener('mousemove', handleTerminalMouseMove);
    document.removeEventListener('mouseup', stopResizingTerminal);
    document.body.style.cursor = 'default';
  };

  const handleTerminalMouseMove = (e) => {
    if (!isResizingTerminal.current) return;
    
    // Calculate full editor height minus current mouse position
    const newHeight = window.innerHeight - e.clientY - 22; 
    
    if (newHeight > 100 && newHeight < window.innerHeight - 150) {
      setTerminalHeight(newHeight);
    }
  };

  const activeFile = openFiles.find(f => f.id === activeFileId);

  return (
    <div style={{
      flex: 1,
      backgroundColor: 'var(--editor-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Tab Bar */}
      <div style={{
        height: '35px',
        backgroundColor: 'var(--side-bar-bg)',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border-color)',
        scrollbarWidth: 'none',
      }}>
        {openFiles.map(file => (
          <div
            key={file.id}
            onClick={() => dispatch(setActiveFile(file.id))}
            style={{
              height: '100%',
              padding: '0 10px 0 15px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              backgroundColor: activeFileId === file.id ? 'var(--editor-bg)' : 'transparent',
              borderRight: '1px solid var(--border-color)',
              borderTop: activeFileId === file.id ? '1px solid var(--accent-primary)' : 'none',
              fontSize: '13px',
              minWidth: '120px',
              position: 'relative',
              transition: 'background-color 0.2s'
            }}
          >
            <span style={{ marginRight: '8px', opacity: activeFileId === file.id ? 1 : 0.7 }}>{file.name}</span>
            <X 
              size={14} 
              style={{ marginLeft: 'auto', opacity: 0.5 }} 
              onClick={(e) => {
                e.stopPropagation();
                dispatch(closeFile(file.id));
              }}
            />
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {selectedExtensionId ? (
            <ExtensionDetailsView />
          ) : activeFile ? (
            activeFile.isDiff ? (
              <DiffViewer 
                oldValue={activeFile.originalContent} 
                newValue={activeFile.content} 
                leftTitle={`${activeFile.name.replace(' (Diff)', '')} (Original)`}
                rightTitle={`${activeFile.name.replace(' (Diff)', '')} (Modified)`}
              />
            ) : (
              <MonacoEditor
                height="100%"
                language={activeFile.language}
                value={activeFile.content}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                onMount={(editor, monaco) => {
                  window.monaco = monaco;
                }}
                options={{
                  fontSize: 14,
                  fontFamily: 'Google Sans, Fira Code, monospace',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 10 }
                }}
              />
            )
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.3,
              flexDirection: 'column',
              gap: '10px'
            }}>
              <TerminalIcon size={100} />
              <div style={{ fontSize: '20px' }}>AI IDE</div>
              <div style={{ fontSize: '14px' }}>Open a file or terminal to start</div>
            </div>
          )}
        </div>

        {/* Terminal Panel */}
        {showTerminal && (
          <div style={{ 
            height: `${terminalHeight}px`, 
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--editor-bg)',
            position: 'relative'
          }}>
            {/* Draggable resize handle */}
            <div 
              onMouseDown={startResizingTerminal}
              style={{
                position: 'absolute',
                top: '-2px',
                left: 0,
                right: 0,
                height: '4px',
                cursor: 'row-resize',
                backgroundColor: 'transparent',
                zIndex: 10,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            />
            
            {/* Panel Header Layer */}
            <div style={{
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 10px',
              borderTop: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', gap: '20px' }}>
                {panelTabs.map(tab => (
                  <div 
                    key={tab.id}
                    onClick={() => setActivePanelTab(tab.id)}
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      fontWeight: activePanelTab === tab.id ? '600' : '400',
                      letterSpacing: '0.5px',
                      color: activePanelTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      padding: '0 0 8px 0',
                      cursor: 'pointer',
                      borderBottom: activePanelTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      transition: 'all 0.1s'
                    }}
                  >
                    {tab.label}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', alignItems: 'center' }}>
                {activePanelTab === 'terminal' && (
                  <div style={{ display: 'flex', alignItems: 'center', marginRight: '20px', gap: '4px' }}>
                    {terminals.map((term, idx) => (
                      <div 
                        key={term.id}
                        onClick={() => dispatch(setActiveTerminal(term.id))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px',
                          cursor: 'pointer', fontSize: '11px', borderRadius: '4px',
                          backgroundColor: activeTerminalId === term.id ? 'var(--bg-secondary)' : 'transparent',
                          color: activeTerminalId === term.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                       <TerminalIcon size={12} /> {term.name} {idx + 1}
                       <X size={12} onClick={(e) => { e.stopPropagation(); dispatch(closeTerminal(term.id)); }} style={{ opacity: 0.5 }} />
                      </div>
                    ))}
                    <div onClick={() => dispatch(createTerminal())} style={{ cursor: 'pointer', padding: '2px', opacity: 0.7 }} title="New Terminal">
                      <Plus size={14} />
                    </div>
                  </div>
                )}
                <ChevronUp size={16} style={{ cursor: 'pointer' }} onClick={() => setTerminalHeight(window.innerHeight - 150)} title="Maximize Panel" />
                <X size={16} style={{ cursor: 'pointer' }} onClick={() => setShowTerminal(false)} title="Close Panel" />
              </div>
            </div>

            {/* Panel Content Layer */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {activePanelTab === 'terminal' && terminals.map(term => (
                <div 
                  key={term.id} 
                  style={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    display: activeTerminalId === term.id ? 'block' : 'none' 
                  }}
                >
                  <Terminal terminalId={term.id} initialCwd={term.cwd} />
                </div>
              ))}
              {activePanelTab !== 'terminal' && (
                <div style={{ 
                  padding: '15px', 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace'
                }}>
                  No content available for {activePanelTab}.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;