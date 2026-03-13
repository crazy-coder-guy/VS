import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MonacoEditor from '@monaco-editor/react';
import { X, Terminal as TerminalIcon, ChevronDown, ChevronUp, Plus, AlertCircle, AlertTriangle, Info, MoreHorizontal } from 'lucide-react';
import { closeFile, setActiveFile, createTerminal, setActiveTerminal, closeTerminal, setCursorPosition, setProblems, updateFileContent, markFileSaved, closeAllFiles, closeOtherFiles, closeSavedFiles } from '../../store/fileSlice';
import { useTheme } from '../../context/ThemeContext';
import Terminal from './Terminal';
import extensionService from '../../services/extensionService';
import ExtensionDetailsView from '../editor/ExtensionDetailsView';
import DiffViewer from '../common/DiffViewer';

const Editor = () => {
  const { openFiles, activeFileId, terminals, activeTerminalId, problems, projectProblems, autoSave } = useSelector(state => state.files);
  const { installedExtensions, selectedExtensionId } = useSelector(state => state.extensions);
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [showTerminal, setShowTerminal] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState('terminal');
  const [termSidebarWidth, setTermSidebarWidth] = useState(180);
  const [expandedProblems, setExpandedProblems] = useState({});
  const isResizingTerminal = useRef(false);
  const isResizingTermSidebar = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showTabMenu, setShowTabMenu] = useState(false);

  const activeFile = openFiles.find(f => f.id === activeFileId);

  const handleSave = async (fileToSave = activeFile) => {
    if (!fileToSave || !fileToSave.handle) return;
    try {
      const writable = await fileToSave.handle.createWritable();
      await writable.write(fileToSave.content);
      await writable.close();
      dispatch(markFileSaved(fileToSave.id));
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile]);

  useEffect(() => {
    if (autoSave && activeFile && activeFile.isDirty) {
      const timer = setTimeout(() => {
        handleSave(activeFile);
      }, 1000); // 1 second debounce for auto-save
      return () => clearTimeout(timer);
    }
  }, [activeFile?.content, autoSave]);

  useEffect(() => {
    if (showTabMenu) {
      const handleClickOutside = () => setShowTabMenu(false);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [showTabMenu]);

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
    e.preventDefault();
    isResizingTerminal.current = true;
    setIsResizing(true);
    document.addEventListener('mousemove', handleTerminalMouseMove);
    document.addEventListener('mouseup', stopResizingTerminal);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const stopResizingTerminal = () => {
    isResizingTerminal.current = false;
    setIsResizing(false);
    document.removeEventListener('mousemove', handleTerminalMouseMove);
    document.removeEventListener('mouseup', stopResizingTerminal);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const handleTerminalMouseMove = (e) => {
    if (!isResizingTerminal.current) return;

    // Use window height for most reliable calculation. 24px is StatusBar height.
    const newHeight = window.innerHeight - e.clientY - 24;

    // min height 50px, max height (window - TitleBar(35) - TabBar(35) - StatusBar(24) - some buffer)
    if (newHeight > 50 && newHeight < window.innerHeight - 120) {
      setTerminalHeight(newHeight);
    }
  };

  const startResizingTermSidebar = (e) => {
    isResizingTermSidebar.current = true;
    document.addEventListener('mousemove', handleTermSidebarMouseMove);
    document.addEventListener('mouseup', stopResizingTermSidebar);
    document.body.style.cursor = 'col-resize';
  };

  const stopResizingTermSidebar = () => {
    isResizingTermSidebar.current = false;
    document.removeEventListener('mousemove', handleTermSidebarMouseMove);
    document.removeEventListener('mouseup', stopResizingTermSidebar);
    document.body.style.cursor = 'default';
  };

  const handleTermSidebarMouseMove = (e) => {
    if (!isResizingTermSidebar.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 100 && newWidth < 500) {
      setTermSidebarWidth(newWidth);
    }
  };

  return (
    <div style={{
      flex: 1,
      backgroundColor: 'var(--editor-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      height: '100%'
    }}>
      {/* Global resizing overlay - fixed position to capture all events */}
      {isResizing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          cursor: isResizingTerminal.current ? 'row-resize' : 'col-resize',
          backgroundColor: 'transparent',
          pointerEvents: 'all'
        }} />
      )}

      {/* Tab Bar Container */}
      <div style={{
        height: '35px',
        backgroundColor: 'var(--side-bar-bg)',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        position: 'relative'
      }}>
        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
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
              fontSize: 'var(--font-size-md)',
              minWidth: '120px',
              position: 'relative',
              transition: 'background-color 0.2s'
            }}
          >
            <span style={{ 
              marginRight: '8px', 
              opacity: activeFileId === file.id ? 1 : 0.7,
              maxWidth: '150px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {file.name}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {file.isDirty ? (
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--accent-primary)',
                  borderRadius: '50%',
                  marginRight: '4px'
                }} title="Unsaved changes" />
              ) : null}
              <X 
                size={14} 
                style={{ opacity: 0.5 }} 
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(closeFile(file.id));
                }}
              />
            </div>
          </div>
        ))}
        </div>
        
        {openFiles.length > 0 && (
          <div 
            onClick={(e) => { e.stopPropagation(); setShowTabMenu(!showTabMenu); }}
            style={{
              padding: '0 10px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              borderLeft: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--side-bar-bg)',
              position: 'relative',
              flexShrink: 0,
              zIndex: 100
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <MoreHorizontal size={18} />
            
            {showTabMenu && (
              <div style={{
                position: 'absolute',
                top: '35px',
                right: '5px',
                width: '180px',
                backgroundColor: 'var(--side-bar-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 2000,
                padding: '5px 0'
              }}>
                <div 
                  onClick={(e) => { e.stopPropagation(); dispatch(closeAllFiles()); setShowTabMenu(false); }}
                  style={{ padding: '6px 15px', cursor: 'pointer', fontSize: 'var(--font-size-md)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Close All
                </div>
                <div 
                  onClick={(e) => { e.stopPropagation(); dispatch(closeSavedFiles()); setShowTabMenu(false); }}
                  style={{ padding: '6px 15px', cursor: 'pointer', fontSize: 'var(--font-size-md)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Close Saved
                </div>
                <div 
                  onClick={(e) => { e.stopPropagation(); dispatch(closeOtherFiles()); setShowTabMenu(false); }}
                  style={{ padding: '6px 15px', cursor: 'pointer', fontSize: '13px' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Close Others
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content (Editor + Terminal) - Restructured for high stability */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Editor Writing Area */}
        <div style={{ 
          flex: 1, 
          position: 'relative',
          minHeight: 0, 
          pointerEvents: isResizing ? 'none' : 'auto',
          overflow: 'hidden'
        }}>
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
                  const pos = editor.getPosition();
                  if (pos) {
                    dispatch(setCursorPosition({
                      lineNumber: pos.lineNumber,
                      column: pos.column
                    }));
                  }
                  editor.onDidChangeCursorPosition((e) => {
                    dispatch(setCursorPosition({
                      lineNumber: e.position.lineNumber,
                      column: e.position.column
                    }));
                  });
                  monaco.editor.onDidChangeMarkers(() => {
                    const markers = monaco.editor.getModelMarkers({});
                    const mappedProblems = markers.map(m => ({
                      id: `${m.owner}-${m.code}-${m.startLineNumber}-${m.startColumn}`,
                      message: m.message,
                      severity: m.severity, 
                      line: m.startLineNumber,
                      column: m.startColumn,
                      file: activeFile.name,
                      filePath: activeFile.id
                    }));
                    dispatch(setProblems(mappedProblems));
                  });
                }}
                options={{
                  fontSize: 14,
                  fontFamily: 'Google Sans, Fira Code, monospace',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 10 }
                }}
                onChange={(value) => {
                  if (activeFile) {
                    dispatch(updateFileContent({ id: activeFile.id, content: value }));
                  }
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
              <div style={{ fontSize: 'var(--font-size-xl)' }}>AI IDE</div>
              <div style={{ fontSize: 'var(--font-size-md)' }}>Open a file or terminal to start</div>
            </div>
          )}
        </div>

        {/* Terminal Panel Area */}
        {showTerminal && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            flexShrink: 0
          }}>
            {/* Draggable resize handle */}
            <div
              onMouseDown={startResizingTerminal}
              style={{
                height: '6px',
                cursor: 'row-resize',
                backgroundColor: 'transparent',
                zIndex: 100,
                marginTop: '-3px',
                transition: 'background-color 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            />
            <div style={{
              height: `${terminalHeight}px`,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--editor-bg)',
              position: 'relative',
              flexShrink: 0,
              minHeight: '35px'
            }}>
              {/* Panel Header */}
              <div style={{
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--side-bar-bg)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', gap: '20px' }}>
                  {panelTabs.map(tab => (
                    <div
                      key={tab.id}
                      onClick={() => setActivePanelTab(tab.id)}
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        textTransform: 'uppercase',
                        fontWeight: activePanelTab === tab.id ? '600' : '400',
                        letterSpacing: '0.5px',
                        color: activePanelTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        padding: '8px 4px',
                        cursor: 'pointer',
                        borderBottom: activePanelTab === tab.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
                        transition: 'all 0.1s'
                      }}
                    >
                      {tab.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', alignItems: 'center' }}>
                  {activePanelTab === 'terminal' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '10px' }}>
                      <div
                        onClick={() => dispatch(createTerminal({ name: 'powershell' }))}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}
                      >
                        <Plus size={16} />
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  )}
                  <X size={16} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setShowTerminal(false)} title="Close Panel" />
                </div>
              </div>

              {/* Panel Content Area */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {activePanelTab === 'terminal' && terminals.map(term => (
                    <div
                      key={`${term.id}-${term.cwd}`}
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: activeTerminalId === term.id ? 'block' : 'none'
                      }}
                    >
                      <Terminal terminalId={term.id} initialCwd={term.cwd} name={term.name} />
                    </div>
                  ))}
                  {activePanelTab === 'problems' && (() => {
                    const openFilePaths = openFiles.map(f => f.id);
                    const filteredProjectProblems = projectProblems.filter(p => !openFilePaths.includes(p.filePath));
                    const combinedProblems = [...problems, ...filteredProjectProblems];

                    const groupedProblems = combinedProblems.reduce((acc, p) => {
                      const filePath = p.filePath || 'Unknown';
                      if (!acc[filePath]) {
                        acc[filePath] = {
                          file: p.file || 'Unknown',
                          filePath: filePath,
                          problems: [],
                          errorCount: 0,
                          warningCount: 0
                        };
                      }
                      acc[filePath].problems.push(p);
                      if (p.severity === 8) acc[filePath].errorCount++;
                      else acc[filePath].warningCount++;
                      return acc;
                    }, {});

                    const fileGroups = Object.values(groupedProblems).sort((a, b) => a.filePath.localeCompare(b.filePath));

                    return (
                      <div style={{ 
                        padding: '0', 
                        fontSize: 'var(--font-size-md)', 
                        color: 'var(--text-secondary)',
                        height: '100%',
                        overflowY: 'auto',
                      }}>
                        {fileGroups.length === 0 ? (
                          <div style={{ padding: '20px', opacity: 0.5 }}>No problems have been detected in the workspace.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {fileGroups.map(group => {
                              const isExpanded = expandedProblems[group.filePath] !== false;
                              return (
                                <div key={group.filePath} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <div 
                                    onClick={() => setExpandedProblems(prev => ({ ...prev, [group.filePath]: !isExpanded }))}
                                    style={{ 
                                      padding: '6px 12px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      cursor: 'pointer',
                                      backgroundColor: 'rgba(255,255,255,0.02)',
                                      fontWeight: '500'
                                    }}
                                  >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} style={{ transform: 'rotate(90deg)' }} />}
                                    <div style={{ display: 'flex', gap: '6px', marginRight: '4px' }}>
                                      {group.errorCount > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f14c4c', fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>
                                          <AlertCircle size={12} /> {group.errorCount}
                                        </div>
                                      )}
                                      {group.warningCount > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#cca700', fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>
                                          <AlertTriangle size={12} /> {group.warningCount}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ opacity: 0.8 }}>{group.file}</span>
                                    <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.5 }}>{group.filePath}</span>
                                  </div>

                                  {isExpanded && (
                                    <div style={{ paddingLeft: '24px' }}>
                                      {group.problems.map(p => (
                                        <div 
                                          key={p.id}
                                          onClick={() => {
                                            if (openFiles.some(f => f.id === p.filePath)) {
                                              dispatch(setActiveFile(p.filePath));
                                            } else {
                                              alert(`Please open ${p.file} in the Explorer to see this issue.`);
                                            }
                                          }}
                                          style={{ 
                                            padding: '4px 12px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px',
                                            cursor: 'pointer',
                                            fontSize: 'var(--font-size-sm)'
                                          }}
                                        >
                                          <div style={{ width: '14px', display: 'flex', justifyContent: 'center' }}>
                                            {p.severity === 8 && <AlertCircle size={14} color="#f14c4c" />}
                                            {p.severity === 4 && <AlertTriangle size={14} color="#cca700" />}
                                            {p.severity < 4 && <Info size={14} color="#3794ff" />}
                                          </div>
                                          <span style={{ opacity: 0.9 }}>{p.message}</span>
                                          <span style={{ marginLeft: 'auto', opacity: 0.4 }}>({p.line}, {p.column})</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {activePanelTab === 'terminal' && (
                  <>
                    <div
                      onMouseDown={startResizingTermSidebar}
                      style={{
                        width: '4px',
                        cursor: 'col-resize',
                        backgroundColor: 'transparent',
                        zIndex: 10,
                        flexShrink: 0
                      }}
                    />
                    <div style={{
                      width: `${termSidebarWidth}px`,
                      borderLeft: '1px solid var(--border-color)',
                      backgroundColor: 'var(--side-bar-bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '5px',
                      flexShrink: 0
                    }}>
                      {terminals.map((term) => (
                        <div
                          key={term.id}
                          onClick={() => dispatch(setActiveTerminal(term.id))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-sm)',
                            borderRadius: '4px',
                            marginBottom: '2px',
                            backgroundColor: activeTerminalId === term.id ? 'var(--bg-secondary)' : 'transparent',
                            color: activeTerminalId === term.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TerminalIcon size={14} style={{ opacity: 0.7 }} />
                            <span>{term.name}</span>
                          </div>
                          {terminals.length > 1 && (
                            <X
                              size={12}
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch(closeTerminal(term.id));
                              }}
                              style={{ opacity: 0.5 }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;