import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileJson, FileCode, File as FileIcon, Folder, FolderOpen, ListTree, ListFilter, Bot, Terminal as TerminalIcon, FilePlus, FolderPlus, Plus, Minus, Check, CornerUpLeft, MoreVertical } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { openFile, toggleFolder, expandAll, collapseAll, createTerminal, setActiveView, setFileTree } from '../../store/fileSlice';
import { cloneRepoThunk, refreshGitStatusThunk, stageFileThunk, commitChangesThunk, pushRepoThunk, setGithubToken, openDiffThunk, setGitStatus } from '../../store/gitSlice';
import { projectSocket } from '../../services/ProjectService';
import { gitReset } from '../../services/gitService';
import ExtensionsView from '../sidebar/ExtensionsView';
import ContextMenu from '../common/ContextMenu';
import { readDirectory } from '../../utils/fileSystem';

const TreeItem = ({ item, depth = 0, parentPath = '', showMenu, parentHandle, refreshTree, selectedNode, setSelectedNode, creatingState, setCreatingState }) => {
  const dispatch = useDispatch();
  const [createName, setCreateName] = useState('');
  const inputRef = useRef(null);
  const { activeFileId, expandedFolders, projectProblems } = useSelector(state => state.files);
  const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
  const isOpen = !!expandedFolders[currentPath];
  const isSelected = selectedNode?.path === currentPath;
  const isCreatingHere = creatingState?.targetPath === currentPath;
  
  // Calculate problems for this node
  const nodeProblems = projectProblems.filter(p => 
    item.kind === 'file' ? p.filePath === currentPath : p.filePath.startsWith(currentPath + '/') || p.filePath === currentPath
  );
  const errorCount = nodeProblems.filter(p => p.severity === 8).length;
  const warningCount = nodeProblems.length - errorCount;
  const hasProblems = nodeProblems.length > 0;

  useEffect(() => {
    if (isCreatingHere && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingHere]);

  const handleCreateKeyDown = async (e) => {
    if (e.key === 'Escape') {
      setCreatingState(null);
      setCreateName('');
    } else if (e.key === 'Enter') {
      if (!createName.trim()) {
        setCreatingState(null);
        return;
      }
      try {
        if (creatingState.type === 'file') {
          await item.handle.getFileHandle(createName, { create: true });
        } else {
          await item.handle.getDirectoryHandle(createName, { create: true });
        }
        setCreatingState(null);
        setCreateName('');
        if (refreshTree) refreshTree();
      } catch (err) {
        console.error(err);
        alert(`Failed to create ${creatingState.type}. It may already exist or you lack permissions.`);
      }
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    setSelectedNode({ path: currentPath, handle: item.handle, kind: item.kind, parentPath, parentHandle });
    if (item.kind === 'directory') {
      dispatch(toggleFolder(currentPath));
    } else {
      handleOpenFile();
    }
  };

  const handleOpenFile = async () => {
    try {
      const file = await item.handle.getFile();
      const content = await file.text();
      const extension = file.name.split('.').pop();
      const languageMap = {
        'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
        'css': 'css', 'html': 'html', 'json': 'json', 'md': 'markdown'
      };

      dispatch(openFile({
        id: currentPath,
        name: item.name,
        content: content,
        language: languageMap[extension] || 'plaintext',
        handle: item.handle // Crucial for saving later
      }));
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  const { uiOverrides } = useSelector(state => state.extensions);

  const getIcon = () => {
    const isMaterial = uiOverrides.iconTheme === 'material';
    
    if (item.kind === 'directory') {
      const color = isMaterial ? '#e0b060' : 'inherit';
      return isOpen ? 
        <FolderOpen size={16} style={{ color }} /> : 
        <Folder size={16} style={{ color }} />;
    }

    const extension = item.name.split('.').pop();
    if (extension === 'json') return <FileJson size={16} style={{ color: isMaterial ? '#f1e05a' : 'inherit' }} />;
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) return <FileCode size={16} style={{ color: isMaterial ? '#519aba' : 'inherit' }} />;
    if (extension === 'md') return <FileIcon size={16} style={{ color: isMaterial ? '#42a5f5' : 'inherit' }} />;
    
    return <FileIcon size={16} />;
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const menuItems = [];

    const mockAction = (actionName) => {
      console.log(`[Context Menu] Triggered: ${actionName} on ${currentPath}`);
      alert(`${actionName} is requested for: \n${currentPath}\n\n(This is a UI simulation)`);
    };

    if (item.kind === 'directory') {
      menuItems.push({
        label: 'New File...',
        icon: FileIcon,
        onClick: () => {
          setCreatingState({ targetPath: currentPath, type: 'file' });
          if (!isOpen) dispatch(toggleFolder(currentPath));
        }
      });
      menuItems.push({
        label: 'New Folder...',
        icon: Folder,
        onClick: () => {
          setCreatingState({ targetPath: currentPath, type: 'directory' });
          if (!isOpen) dispatch(toggleFolder(currentPath));
        }
      });
      menuItems.push({ type: 'separator' });
      menuItems.push({
        label: 'Reveal in File Explorer',
        onClick: () => mockAction('Reveal in File Explorer')
      });
      menuItems.push({
        label: 'Open in Integrated Terminal',
        icon: TerminalIcon,
        onClick: () => {
          const workspacePath = rootFolderPath || 'D:\\AICODE'; 
          dispatch(createTerminal({ cwd: `${workspacePath}\\${item.name}` }));
          dispatch(setActiveView('explorer'));
        }
      });
      menuItems.push({ type: 'separator' });
      menuItems.push({ label: 'Rename', onClick: () => mockAction('Rename') });
      menuItems.push({ 
        label: 'Delete', 
        onClick: async () => {
          if (confirm(`Are you sure you want to delete folder '${item.name}'?`)) {
            try {
              if (parentHandle) {
                await parentHandle.removeEntry(item.name, { recursive: true });
                if (refreshTree) refreshTree();
              } else {
                alert("Cannot delete root workspace folder.");
              }
            } catch (err) {
              console.error(err);
              alert("Failed to delete folder.");
            }
          }
        } 
      });
    } else {
      menuItems.push({ label: 'Open to the Side', onClick: () => mockAction('Open to the Side') });
      menuItems.push({ type: 'separator' });
      menuItems.push({
        label: 'Reveal in File Explorer',
        onClick: () => mockAction('Reveal in File Explorer')
      });
      menuItems.push({ type: 'separator' });
      menuItems.push({ label: 'Rename', onClick: () => mockAction('Rename') });
      menuItems.push({ 
        label: 'Delete', 
        onClick: async () => {
          if (confirm(`Are you sure you want to delete file '${item.name}'?`)) {
            try {
              if (parentHandle) {
                await parentHandle.removeEntry(item.name);
                if (refreshTree) refreshTree();
              } else {
                alert("Cannot delete root workspace folder.");
              }
            } catch (err) {
              console.error(err);
              alert("Failed to delete file.");
            }
          }
        } 
      });
    }

    showMenu(e.clientX, e.clientY, menuItems);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      path: currentPath,
      name: item.name,
      kind: item.kind
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div 
      style={{ userSelect: 'none' }} 
      onContextMenu={handleContextMenu}
      draggable="true"
      onDragStart={handleDragStart}
    >
      <div 
        onClick={handleToggle}
        style={{
          padding: '2px 8px',
          paddingLeft: `${depth * 10 + 12}px`,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: isSelected || activeFileId === currentPath ? 'var(--bg-secondary)' : 'transparent',
          transition: 'background-color 0.1s',
          whiteSpace: 'nowrap',
          color: isSelected || activeFileId === currentPath ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected && activeFileId !== currentPath) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px', flexShrink: 0 }}>
          {item.kind === 'directory' && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.8 }}>
            {getIcon()}
          </div>
          <span style={{ 
            fontSize: 'var(--font-size-md)', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: errorCount > 0 ? '#f14c4c' : (warningCount > 0 ? '#cca700' : 'inherit')
          }}>
            {item.name}
          </span>
          {hasProblems && (
            <div style={{ 
              marginLeft: 'auto', 
              fontSize: 'var(--font-size-xs)', 
              fontWeight: 'bold',
              color: errorCount > 0 ? '#f14c4c' : '#cca700',
              padding: '0 4px',
              opacity: 0.8
            }}>
              {nodeProblems.length}
            </div>
          )}
        </div>
      </div>
      {item.kind === 'directory' && isOpen && (
        <div>
          {item.children && item.children.map((child, idx) => (
            <TreeItem 
              key={idx} item={child} depth={depth + 1} parentPath={currentPath} showMenu={showMenu} parentHandle={item.handle} 
              refreshTree={refreshTree} selectedNode={selectedNode} setSelectedNode={setSelectedNode} 
              creatingState={creatingState} setCreatingState={setCreatingState} 
            />
          ))}
          {isCreatingHere && (
            <div style={{ paddingLeft: `${(depth + 1) * 10 + 26}px`, display: 'flex', alignItems: 'center', padding: '2px 4px' }}>
              <input
                ref={inputRef}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                onBlur={() => { setCreatingState(null); setCreateName(''); }}
                placeholder={`New ${creatingState.type}...`}
                style={{ 
                  width: '90%', 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--accent-primary)', 
                  color: 'var(--text-primary)', 
                  fontSize: 'var(--font-size-sm)', 
                  padding: '2px 4px', 
                  outline: 'none' 
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SearchView = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const { fileTree } = useSelector(state => state.files);
  const dispatch = useDispatch();

  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val || !fileTree) {
      setResults([]);
      return;
    }

    const searchResults = [];
    const searchRecursive = async (items) => {
      for (const item of items) {
        if (item.kind === 'file') {
          try {
            const file = await item.handle.getFile();
            const content = await file.text();
            if (content.toLowerCase().includes(val.toLowerCase())) {
              const lines = content.split('\n');
              const matches = lines.filter(line => line.toLowerCase().includes(val.toLowerCase()));
              searchResults.push({ name: item.name, handle: item.handle, matches });
            }
          } catch (err) { console.error(err); }
        } else if (item.kind === 'directory' && item.children) {
          await searchRecursive(item.children);
        }
      }
    };
    await searchRecursive(fileTree);
    setResults(searchResults);
  };

  const handleOpenFile = async (item) => {
    try {
      const file = await item.handle.getFile();
      const content = await file.text();
      const extension = file.name.split('.').pop();
      const languageMap = {
        'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
        'css': 'css', 'html': 'html', 'json': 'json', 'md': 'markdown'
      };
      dispatch(openFile({
        id: item.path || item.name,
        name: item.name,
        content: content,
        language: languageMap[extension] || 'plaintext',
        handle: item.handle
      }));
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: '10px', opacity: 0.6, fontWeight: 'bold' }}>SEARCH</div>
      <input
        type="text" placeholder="Search" value={query} onChange={handleSearch}
        style={{
          width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          color: 'var(--text-primary)', padding: '4px 8px', fontSize: 'var(--font-size-md)', outline: 'none', marginBottom: '10px'
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {results.map((res, idx) => (
          <div key={idx} onClick={() => handleOpenFile(res)} style={{ cursor: 'pointer', padding: '4px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
              <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileCode size={14} />
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {res.name}
              </span>
            </div>
            {res.matches.slice(0, 2).map((match, mIdx) => (
              <div key={mIdx} style={{ fontSize: 'var(--font-size-xs)', opacity: 0.6, paddingLeft: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {match.trim()}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};


const formatRelativePath = (fullpath) => {
  if (!fullpath) return '';
  const parts = fullpath.split(/[\\\/]/);
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('\\');
};

const GitView = () => {
  const git = useSelector(state => state.git || {});
  const dispatch = useDispatch();
  const [commitMessage, setCommitMessage] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneToken, setCloneToken] = useState('');
  const [isStagedExpanded, setIsStagedExpanded] = useState(true);
  const [isChangesExpanded, setIsChangesExpanded] = useState(true);
  const [isGraphExpanded, setIsGraphExpanded] = useState(true);
  const [showGitMenu, setShowGitMenu] = useState(false);

  useEffect(() => {
    // Initial fetch
    dispatch(refreshGitStatusThunk());
    
    // Listen for backend updates
    const handleStatusUpdate = (data) => {
      dispatch(setGitStatus(data));
    };
    
    projectSocket.on('git-status', handleStatusUpdate);
    return () => projectSocket.off('git-status', handleStatusUpdate);
  }, [dispatch]);

  const handleClone = async () => {
    let urlToClone = cloneUrl.trim();
    if (!urlToClone) return;
    if (!urlToClone.startsWith('http')) {
      urlToClone = 'https://' + urlToClone;
    }
    const gitSuffix = '.git';
    const doubleIdx = urlToClone.indexOf(gitSuffix + 'http');
    if (doubleIdx !== -1) {
      urlToClone = urlToClone.substring(0, doubleIdx + gitSuffix.length);
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const { repoDirHandle } = await dispatch(cloneRepoThunk({ url: urlToClone, token: cloneToken, dirHandle })).unwrap();
      const tree = await readDirectory(repoDirHandle);
      dispatch(setFileTree({ name: repoDirHandle.name, tree }));
    } catch (err) {
      if (err.name !== 'AbortError' && !err.message?.includes('underlying filesystem')) {
        alert("Clone failed: " + (err.message || err));
      }
    }
  };

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    dispatch(commitChangesThunk({ message: commitMessage }));
    setCommitMessage('');
  };

  const handlePush = () => {
    if (!git.repoUrl) return;
    dispatch(pushRepoThunk({ url: git.repoUrl, token: git.githubToken }));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(refreshGitStatusThunk());
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'M': return 'var(--git-modified)';
      case 'U': return 'var(--git-untracked)';
      case 'D': return 'var(--git-deleted)';
      case 'A': return 'var(--git-added)';
      default: return 'var(--text-secondary)';
    }
  };

  const FileList = ({ items, type, isExpanded }) => {
    if (!isExpanded) return null;
    if (!items || items.length === 0) return <div style={{ padding: '8px 20px', fontSize: 'var(--font-size-xs)', opacity: 0.4, fontStyle: 'italic' }}>No changes</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map(item => (
          <div 
            key={item.id} 
            onClick={() => dispatch(openDiffThunk({ filepath: item.path, name: item.name }))}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '2px 12px 2px 20px', cursor: 'pointer', fontSize: 'var(--font-size-sm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              e.currentTarget.querySelector('.git-actions').style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.querySelector('.git-actions').style.opacity = '0';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
              <FileIcon size={14} style={{ flexShrink: 0, color: getStatusColor(item.status), opacity: 0.9 }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', overflow: 'hidden' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatRelativePath(item.path)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="git-actions" style={{ display: 'flex', gap: '6px', opacity: 0, transition: 'opacity 0.1s' }}>
                {type === 'changes' ? (
                  <Plus size={14} title="Stage Changes" style={{ opacity: 0.7, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); dispatch(stageFileThunk({ filepath: item.path })); }} />
                ) : (
                  <Minus size={14} title="Unstage Changes" style={{ opacity: 0.7, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); gitReset(item.path); }} />
                )}
              </div>
              <span style={{ color: getStatusColor(item.status), fontWeight: '600', fontSize: '11px', width: '10px', textAlign: 'center' }}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!git.isRepo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
        <div style={{ fontSize: '11px', marginBottom: '20px', opacity: 0.6, fontWeight: 'bold', letterSpacing: '0.05em' }}>SOURCE CONTROL</div>
        <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '20px', lineHeight: '1.4' }}>The current project has no Git repository. You can initialize one or clone an existing one.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} placeholder="Repository URL" style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '12px', borderRadius: '4px', outline: 'none' }} />
          <input type="password" value={cloneToken} onChange={(e) => setCloneToken(e.target.value)} placeholder="Personal Access Token (optional)" style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '12px', borderRadius: '4px', outline: 'none' }} />
          <button onClick={handleClone} disabled={git.isCloning || !cloneUrl} style={{ backgroundColor: 'var(--accent-primary)', border: 'none', color: 'white', padding: '10px', borderRadius: '4px', cursor: git.isCloning ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'filter 0.2s' }}>{git.isCloning ? 'Cloning...' : 'Clone Repository'}</button>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ title, count, isExpanded, onToggle, showActions }) => (
    <div 
      onClick={onToggle}
      style={{ 
        display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer',
        backgroundColor: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)',
        userSelect: 'none'
      }}
    >
      <div style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.1s', display: 'flex', alignItems: 'center' }}>
        <ChevronDown size={14} style={{ marginRight: '4px' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 'bold', flex: 1, opacity: 0.8 }}>{title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showActions && isExpanded && (
          <div style={{ display: 'flex', gap: '6px', opacity: 0.7 }}>
             <Plus size={14} title="Stage All" onClick={(e) => { e.stopPropagation(); /* stageAll implementation needed if desired */ }} />
          </div>
        )}
          <span style={{ 
            fontSize: 'var(--font-size-xs)', backgroundColor: 'var(--bg-active)', padding: '0px 6px', 
            borderRadius: '10px', minWidth: '18px', textAlign: 'center', opacity: 0.7
          }}>{count}</span>
      </div>
    </div>
  );

  const CommitGraph = () => {
    if (!isGraphExpanded) return null;
    if (!git.log || git.log.length === 0) return <div style={{ padding: '8px 20px', fontSize: '10px', opacity: 0.4 }}>No history</div>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
        {git.log.map((commit, i) => (
          <div key={commit.oid} style={{ display: 'flex', padding: '2px 12px', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '14px', height: '24px' }}>
               {i !== 0 && <div style={{ position: 'absolute', top: 0, bottom: '50%', width: '1px', backgroundColor: 'var(--border-color)' }}></div>}
               {i !== git.log.length - 1 && <div style={{ position: 'absolute', top: '50%', bottom: 0, width: '1px', backgroundColor: 'var(--border-color)' }}></div>}
               <div style={{ 
                 width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--git-graph-node)', 
                 backgroundColor: 'var(--bg-primary)', zIndex: 1 
               }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(commit.message || '').split('\n')[0]}</span>
                {i === 0 && <span style={{ fontSize: '9px', backgroundColor: '#007acc', color: 'white', padding: '0 4px', borderRadius: '8px' }}>{git.currentBranch || 'main'}</span>}
              </div>
              <span style={{ fontSize: '10px', opacity: 0.4 }}>{commit.author}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      <div style={{ padding: '10px 14px', textTransform: 'uppercase', fontSize: '11px', opacity: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>SOURCE CONTROL</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span title="Refresh" onClick={() => dispatch(refreshGitStatusThunk())} style={{ cursor: 'pointer', opacity: 0.8 }}>↻</span>
          <div style={{ position: 'relative' }}>
            <MoreVertical size={14} title="More Actions..." onClick={(e) => { e.stopPropagation(); setShowGitMenu(!showGitMenu); }} style={{ cursor: 'pointer', opacity: 0.8 }} />
            {showGitMenu && (
              <div 
                style={{ 
                  position: 'absolute', top: '20px', right: '0', backgroundColor: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 1000, 
                  minWidth: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', padding: '4px 0'
                }}
                onMouseLeave={() => setShowGitMenu(false)}
              >
                <div onClick={handlePush} style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Push</div>
                <div onClick={() => alert('Pull not fully wired yet')} style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', opacity: 0.5 }}>Pull</div>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
                <div onClick={() => dispatch(refreshGitStatusThunk())} style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Refresh Status</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ padding: '0 12px 14px 12px' }}>
        <div style={{ position: 'relative' }}>
          <textarea 
            value={commitMessage} 
            onChange={(e) => setCommitMessage(e.target.value)} 
            placeholder={`Message (${git.currentBranch || 'main'})`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { handleCommit(); }
            }}
            style={{ 
              width: '100%', minHeight: '66px', backgroundColor: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', color: 'var(--text-primary)', 
              padding: '8px 28px 8px 8px', fontSize: 'var(--font-size-sm)', borderRadius: '3px', outline: 'none',
              resize: 'none'
            }} 
          />
          <Bot size={16} style={{ position: 'absolute', right: '8px', top: '8px', opacity: 0.4, color: 'var(--accent-secondary)' }} />
        </div>
        
        <div style={{ display: 'flex', marginTop: '6px', height: '30px' }}>
          <button 
            onClick={handleCommit} 
            disabled={!commitMessage.trim() || (git.staged || []).length === 0}
            style={{ 
              flex: 1, backgroundColor: 'var(--status-bar-bg)', color: 'var(--status-bar-text)', border: 'none', 
              borderTopLeftRadius: '3px', borderBottomLeftRadius: '3px', cursor: 'pointer',
              fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              opacity: (!commitMessage.trim() || (git.staged || []).length === 0) ? 0.6 : 1
            }}
          >
            <Check size={14} /> Commit
          </button>
          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <button 
            disabled={!commitMessage.trim() || (git.staged || []).length === 0}
            style={{ 
              width: '28px', backgroundColor: 'var(--status-bar-bg)', color: 'var(--status-bar-text)', border: 'none', 
              borderTopRightRadius: '3px', borderBottomRightRadius: '3px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (!commitMessage.trim() || (git.staged || []).length === 0) ? 0.6 : 1
            }}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, borderBottom: '1px solid var(--border-color)' }}>
        <SectionHeader 
          title="STAGED CHANGES" 
          count={(git.staged || []).length} 
          isExpanded={isStagedExpanded} 
          onToggle={() => setIsStagedExpanded(!isStagedExpanded)} 
        />
        <FileList items={git.staged || []} type="staged" isExpanded={isStagedExpanded} />
        
        <SectionHeader 
          title="CHANGES" 
          count={(git.changes || []).length} 
          isExpanded={isChangesExpanded} 
          onToggle={() => setIsChangesExpanded(!isChangesExpanded)} 
          showActions={true}
        />
        <FileList items={git.changes || []} type="changes" isExpanded={isChangesExpanded} />

        <div style={{ height: '8px' }}></div>
        
        <SectionHeader 
          title="GRAPH" 
          count={0} 
          isExpanded={isGraphExpanded} 
          onToggle={() => setIsGraphExpanded(!isGraphExpanded)} 
        />
        <CommitGraph />
      </div>
    </div>
  );
};

const Sidebar = ({ width }) => {
  const { fileTree, rootFolderName, activeView, expandedFolders } = useSelector(state => state.files);
  const dispatch = useDispatch();
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, items: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [creatingState, setCreatingState] = useState(null);
  const [rootCreateName, setRootCreateName] = useState('');
  const rootInputRef = useRef(null);

  const showMenu = (x, y, items) => setContextMenu({ visible: true, x, y, items });
  const closeMenu = () => setContextMenu({ ...contextMenu, visible: false });

  const refreshTree = async () => {
    const handle = window.rootDirectoryHandle;
    if (handle) {
      try {
        const tree = await readDirectory(handle);
        dispatch(setFileTree({ name: handle.name, tree }));
      } catch (err) { console.error(err); }
    }
  };

  const handleCreateFromHeader = (type) => {
    let targetPath = '';
    if (selectedNode) {
      targetPath = selectedNode.kind === 'directory' ? selectedNode.path : selectedNode.parentPath;
    }
    setCreatingState({ targetPath, type });
  };

  useEffect(() => {
    if (creatingState?.targetPath === '' && rootInputRef.current) rootInputRef.current.focus();
  }, [creatingState]);

  const handleRootCreateKeyDown = async (e) => {
    if (e.key === 'Escape') { setCreatingState(null); setRootCreateName(''); }
    else if (e.key === 'Enter') {
      if (!rootCreateName.trim()) { setCreatingState(null); return; }
      try {
        const handle = window.rootDirectoryHandle;
        if (handle) {
          if (creatingState.type === 'file') await handle.getFileHandle(rootCreateName, { create: true });
          else await handle.getDirectoryHandle(rootCreateName, { create: true });
          setCreatingState(null); setRootCreateName(''); refreshTree();
        }
      } catch (err) { console.error(err); }
    }
  };

  if (parseFloat(width) === 0) return null;

  return (
    <div 
      style={{ width: width || '260px', backgroundColor: 'var(--side-bar-bg)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', fontSize: 'var(--font-size-md)', overflowX: 'hidden', overflowY: 'auto' }}
      onClick={() => setSelectedNode(null)}
    >
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeMenu} />}
      {activeView === 'explorer' ? (
        <>
          <div style={{ padding: '10px 15px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.8px', opacity: 0.6, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Explorer
            <div style={{ display: 'flex', gap: '8px' }}>
              <FilePlus size={15} onClick={(e) => { e.stopPropagation(); handleCreateFromHeader('file'); }} />
              <FolderPlus size={15} onClick={(e) => { e.stopPropagation(); handleCreateFromHeader('directory'); }} />
              <ListTree size={15} onClick={(e) => { e.stopPropagation(); dispatch(expandAll()); }} />
              <ListFilter size={15} onClick={(e) => { e.stopPropagation(); dispatch(collapseAll()); }} />
            </div>
          </div>
          {fileTree ? (
            <>
              <div style={{ padding: '4px 8px', paddingLeft: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', opacity: 0.8 }}>
                <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}><ChevronDown size={14} /></div>
                {rootFolderName}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                {creatingState?.targetPath === '' && (
                  <div style={{ paddingLeft: '28px', display: 'flex', alignItems: 'center', padding: '2px 4px' }}>
                    <input ref={rootInputRef} value={rootCreateName} onChange={(e) => setRootCreateName(e.target.value)} onKeyDown={handleRootCreateKeyDown} onBlur={() => { setCreatingState(null); setRootCreateName(''); }} placeholder={`New ${creatingState.type}...`} style={{ width: '90%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--accent-primary)', color: 'var(--text-primary)', fontSize: '12px', padding: '2px 4px', outline: 'none' }} />
                  </div>
                )}
                {fileTree.map((item, idx) => (
                  <TreeItem key={idx} item={item} showMenu={showMenu} parentHandle={window.rootDirectoryHandle} refreshTree={refreshTree} selectedNode={selectedNode} setSelectedNode={setSelectedNode} creatingState={creatingState} setCreatingState={setCreatingState} />
                ))}
              </div>
            </>
          ) : <div style={{ padding: '20px', opacity: 0.5, textAlign: 'center' }}>No folder opened</div>}
        </>
      ) : activeView === 'search' ? <SearchView /> : activeView === 'git' ? <GitView /> : activeView === 'extensions' ? <ExtensionsView /> : null}
    </div>
  );
};

export default Sidebar;
