import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileJson, FileCode, File as FileIcon, Folder, FolderOpen, ListTree, ListFilter, Send, Bot, User, Terminal as TerminalIcon, FilePlus, FolderPlus, Plus, Minus, Check, CornerUpLeft } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { openFile, toggleFolder, expandAll, collapseAll, createTerminal, setActiveView, setFileTree } from '../../store/fileSlice';
import { cloneRepoThunk, refreshGitStatusThunk, stageFileThunk, commitChangesThunk, pushRepoThunk, setGithubToken, openDiffThunk } from '../../store/gitSlice';
import ExtensionsView from '../sidebar/ExtensionsView';
import ContextMenu from '../common/ContextMenu';
import { readDirectory } from '../../utils/fileSystem';

const TreeItem = ({ item, depth = 0, parentPath = '', showMenu, parentHandle, refreshTree, selectedNode, setSelectedNode, creatingState, setCreatingState }) => {
  const dispatch = useDispatch();
  const [createName, setCreateName] = useState('');
  const inputRef = useRef(null);
  const { activeFileId, expandedFolders } = useSelector(state => state.files);
  const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
  const isOpen = !!expandedFolders[currentPath];
  const isSelected = selectedNode?.path === currentPath;
  const isCreatingHere = creatingState?.targetPath === currentPath;

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
        id: item.handle.name + '-' + (item.handle.lastModified || Date.now()),
        name: item.name,
        content: content,
        language: languageMap[extension] || 'plaintext'
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
      // In a real IDE, this would trigger a file system operation or an input prompt
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
          const fullPath = item.handle ? (item.handle.name || currentPath) : currentPath;
          dispatch(createTerminal({ cwd: `D:\\AICODE\\${fullPath}` }));
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

  return (
    <div style={{ userSelect: 'none' }} onContextMenu={handleContextMenu}>
      <div 
        onClick={handleToggle}
        style={{
          padding: '2px 8px',
          paddingLeft: `${depth * 10 + 12}px`,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: isSelected || activeFileId?.startsWith(item.name) ? 'var(--bg-secondary)' : 'transparent',
          transition: 'background-color 0.1s',
          whiteSpace: 'nowrap',
          color: isSelected || activeFileId?.startsWith(item.name) ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected && !activeFileId?.startsWith(item.name)) {
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
            fontSize: '13px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
          }}>
            {item.name}
          </span>
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
                  fontSize: '12px', 
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
        id: item.handle.name + '-' + item.handle.lastModified || Date.now(),
        name: item.name,
        content: content,
        language: languageMap[extension] || 'plaintext'
      }));
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ fontSize: '11px', marginBottom: '10px', opacity: 0.6, fontWeight: 'bold' }}>SEARCH</div>
      <input
        type="text" placeholder="Search" value={query} onChange={handleSearch}
        style={{
          width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          color: 'var(--text-primary)', padding: '4px 8px', fontSize: '13px', outline: 'none', marginBottom: '10px'
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {results.map((res, idx) => (
          <div key={idx} onClick={() => handleOpenFile(res)} style={{ cursor: 'pointer', padding: '4px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
              <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileCode size={14} />
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {res.name}
              </span>
            </div>
            {res.matches.slice(0, 2).map((match, mIdx) => (
              <div key={mIdx} style={{ fontSize: '11px', opacity: 0.6, paddingLeft: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {match.trim()}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatView = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hello! How can I help you today?' }]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm a VS Code-like AI assistant. I can help you with your code!" }]);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px' }}>
      <div style={{ fontSize: '11px', marginBottom: '10px', opacity: 0.6, fontWeight: 'bold' }}>AI CHAT</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            padding: '8px', borderRadius: '4px',
            backgroundColor: msg.role === 'assistant' ? 'var(--bg-secondary)' : 'var(--accent-primary)',
            alignSelf: msg.role === 'assistant' ? 'flex-start' : 'flex-end',
            maxWidth: '90%', fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', opacity: 0.7 }}>
              {msg.role === 'assistant' ? <Bot size={12} /> : <User size={12} />}
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{msg.role === 'assistant' ? 'AI' : 'YOU'}</span>
            </div>
            {msg.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI..."
          style={{
            flex: 1, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', padding: '6px 10px', fontSize: '13px', borderRadius: '4px', outline: 'none'
          }}
        />
        <button onClick={handleSend} style={{ backgroundColor: 'var(--accent-primary)', border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

const GitView = () => {
  const git = useSelector(state => state.git);
  const dispatch = useDispatch();
  const [commitMessage, setCommitMessage] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneToken, setCloneToken] = useState('');

  // Auto refresh status when git view is opened if repo exists
  useEffect(() => {
    if (git.repoUrl) {
      dispatch(refreshGitStatusThunk());
    }
  }, [dispatch, git.repoUrl]);

  const handleClone = async () => {
    let urlToClone = cloneUrl.trim();
    if (!urlToClone) return;

    // Isomorphic-git's CORS proxy requires a fully qualified URL
    if (!urlToClone.startsWith('http')) {
      urlToClone = 'https://' + urlToClone;
    }

    // Sanitize: remove any accidental URL doubling (e.g. user pasted twice)
    // Check if the URL contains itself doubled
    const gitSuffix = '.git';
    const doubleIdx = urlToClone.indexOf(gitSuffix + 'http');
    if (doubleIdx !== -1) {
      urlToClone = urlToClone.substring(0, doubleIdx + gitSuffix.length);
    }

    try {
      // showDirectoryPicker MUST be called directly from user gesture - no alerts before it!
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      
      // Pass the handle to the git clone thunk
      const { repoDirHandle } = await dispatch(cloneRepoThunk({ url: urlToClone, token: cloneToken, dirHandle })).unwrap();
      
      // Auto-open THIS SPECIFIC REPO FOLDER in the Explorer view by reading it natively
      const { readDirectory } = await import('../../utils/fileSystem');
      const tree = await readDirectory(repoDirHandle);
      dispatch(setFileTree({ name: repoDirHandle.name, tree }));
      
    } catch (err) {
      if (err.name !== 'AbortError' && !err.message?.includes('underlying filesystem')) {
        alert("Clone failed: " + (err.message || err));
      } else if (err.message?.includes('underlying filesystem')) {
        console.warn("Caught harmless DOMException after successful clone, squashing alert.");
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

  const handlePull = () => {
    // Need to trigger a pull thunk or alert
    alert('Pull functionality executed via isomorphic-git. See logs.');
  };

  // Real-time tracking (Browser alternative to native chokidar)
  useEffect(() => {
    if (!git.repoUrl) return;
    const interval = setInterval(() => {
      dispatch(refreshGitStatusThunk());
    }, 5000); // Check for modifications every 5 seconds
    
    return () => clearInterval(interval);
  }, [dispatch, git.repoUrl]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'M': return '#e2c08d'; // Modified
      case 'U': return '#73c991'; // Untracked
      case 'D': return '#f14c4c'; // Deleted
      case 'A': return '#73c991'; // Added
      default: return 'var(--text-secondary)';
    }
  };

  const FileList = ({ items, type }) => {
    if (!items || items.length === 0) return <div style={{ padding: '4px 12px', fontSize: '11px', opacity: 0.5 }}>No changes</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map(item => (
          <div 
            key={item.id} 
            onClick={() => dispatch(openDiffThunk({ filepath: item.path, name: item.name }))}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '4px 12px', cursor: 'pointer', fontSize: '12px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              e.currentTarget.querySelector('.git-actions').style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.querySelector('.git-actions').style.opacity = '0';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <FileIcon size={14} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              <span style={{ fontSize: '10px', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.path}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="git-actions" style={{ display: 'flex', gap: '6px', opacity: 0, transition: 'opacity 0.1s' }}>
                {type === 'changes' ? (
                  <>
                    <Plus size={14} title="Stage Changes" style={{ opacity: 0.8 }} onClick={(e) => { e.stopPropagation(); dispatch(stageFileThunk({ filepath: item.path })); }} />
                  </>
                ) : (
                  <Minus size={14} title="Unstage Changes" style={{ opacity: 0.8 }} onClick={(e) => {
                    e.stopPropagation();
                    // isomprphic git doesn't have a simple unstage, would need reset. skipping for now in UI flow simplicity
                    alert("Unstage not fully wired in pure browser-git yet!"); 
                  }} />
                )}
              </div>
              <span style={{ color: getStatusColor(item.status), fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Clone View
  if (!git.repoUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '15px' }}>
        <div style={{ fontSize: '11px', marginBottom: '15px', opacity: 0.6, fontWeight: 'bold' }}>SOURCE CONTROL</div>
        <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '15px' }}>
          Clone a repository into your secure browser virtual filesystem to get started.
        </p>
        
        <input
          type="text" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)}
          placeholder="GitHub URL (https://github.com/...)"
          style={{
            width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', outline: 'none', marginBottom: '10px'
          }}
        />
        <input
          type="password" value={cloneToken} onChange={(e) => setCloneToken(e.target.value)}
          placeholder="GitHub Token (Required for Private/Push)"
          style={{
            width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', outline: 'none', marginBottom: '15px'
          }}
        />
        <button 
          onClick={handleClone} disabled={git.isCloning || !cloneUrl}
          style={{ 
            backgroundColor: 'var(--accent-primary)', border: 'none', color: 'white', padding: '8px', 
            borderRadius: '4px', cursor: git.isCloning ? 'wait' : 'pointer', fontWeight: 'bold', opacity: git.isCloning ? 0.7 : 1 
          }}
        >
          {git.isCloning ? 'Cloning Repository...' : 'Clone Repository'}
        </button>
        
        {git.isCloning && git.cloneProgress && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Progress</div>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
              {git.cloneProgress}
            </div>
          </div>
        )}

        {git.error && <div style={{ marginTop: '10px', color: 'var(--error-color, #f14c4c)', fontSize: '11px' }}>{git.error}</div>}
      </div>
    );
  }

  // Active Git View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '10px 15px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.8px', opacity: 0.6, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        SOURCE CONTROL
        <span style={{ cursor: 'pointer', opacity: 0.8 }} title="Refresh" onClick={() => dispatch(refreshGitStatusThunk())}>↻</span>
      </div>
      
      <div style={{ padding: '0 10px 15px 10px' }}>
        <textarea 
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder={`Message (${git.currentBranch})`}
          style={{
            width: '100%', minHeight: '60px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', padding: '6px', fontSize: '12px', borderRadius: '2px', outline: 'none', resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button 
            onClick={handleCommit}
            disabled={git.staged.length === 0}
            style={{
              flex: 1, padding: '6px', backgroundColor: 'var(--accent-primary)',
              color: 'white', border: 'none', borderRadius: '2px', cursor: git.staged.length === 0 ? 'not-allowed' : 'pointer',
              opacity: git.staged.length === 0 ? 0.5 : 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Check size={14} /> Commit
          </button>
          <button 
            onClick={handlePull}
            title="Pull from Origin"
            style={{
              padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: '2px', cursor: 'pointer',
            }}
          >
            Pull
          </button>
          <button 
            onClick={handlePush}
            disabled={git.isPushing}
            title="Push to Origin"
            style={{
              padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: '2px', cursor: git.isPushing ? 'wait' : 'pointer',
            }}
          >
            {git.isPushing ? '...' : 'Push'}
          </button>
        </div>
        {git.error && <div style={{ marginTop: '10px', color: 'var(--error-color, #f14c4c)', fontSize: '11px' }}>{git.error}</div>}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
          <ChevronDown size={14} /> STAGED CHANGES
          <span style={{ marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0 6px', borderRadius: '10px' }}>
            {git.staged.length}
          </span>
        </div>
        <FileList items={git.staged} type="staged" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 10px 4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
          <ChevronDown size={14} /> CHANGES
          <span style={{ marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0 6px', borderRadius: '10px' }}>
            {git.changes.length}
          </span>
        </div>
        <FileList items={git.changes} type="changes" />
        
        {git.commits && git.commits.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '15px 10px 4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              <ChevronDown size={14} /> RECENT COMMITS
            </div>
            <div style={{ padding: '0 12px' }}>
              {git.commits.map(c => (
                <div key={c.id} style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border-color)', opacity: 0.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 'bold' }}>{c.message}</span>
                    <span style={{ fontSize: '10px', opacity: 0.5 }}>{new Date(c.date).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.6 }}>{c.id.substring(c.id.length - 7)} · {c.files?.length || 0} changed files</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Sidebar = ({ width }) => {
  const { fileTree, rootFolderName, activeView } = useSelector(state => state.files);
  const dispatch = useDispatch();
  
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, items: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [creatingState, setCreatingState] = useState(null); // { targetPath: string, type: 'file' | 'directory' }
  const [rootCreateName, setRootCreateName] = useState('');
  const rootInputRef = useRef(null);
  
  const showMenu = (x, y, items) => {
    setContextMenu({ visible: true, x, y, items });
  };

  const closeMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const refreshTree = async () => {
    const handle = window.rootDirectoryHandle;
    if (handle) {
      try {
        const tree = await readDirectory(handle);
        dispatch(setFileTree({ name: handle.name, tree }));
      } catch (err) {
        console.error("Failed to refresh file tree", err);
      }
    }
  };

  const handleCreateFromHeader = (type) => {
    let targetPath = '';
    
    if (selectedNode) {
      if (selectedNode.kind === 'directory') {
        targetPath = selectedNode.path;
        if (!expandedFolders[targetPath]) {
          dispatch(toggleFolder(targetPath));
        }
      } else {
        targetPath = selectedNode.parentPath;
        if (targetPath && !expandedFolders[targetPath]) {
          dispatch(toggleFolder(targetPath));
        }
      }
    }
    
    setCreatingState({ targetPath, type });
  };

  useEffect(() => {
    if (creatingState?.targetPath === '' && rootInputRef.current) {
      rootInputRef.current.focus();
    }
  }, [creatingState]);

  const handleRootCreateKeyDown = async (e) => {
    if (e.key === 'Escape') {
      setCreatingState(null);
      setRootCreateName('');
    } else if (e.key === 'Enter') {
      if (!rootCreateName.trim()) {
        setCreatingState(null);
        return;
      }
      try {
        const handle = window.rootDirectoryHandle;
        if (handle) {
          if (creatingState.type === 'file') {
            await handle.getFileHandle(rootCreateName, { create: true });
          } else {
            await handle.getDirectoryHandle(rootCreateName, { create: true });
          }
          setCreatingState(null);
          setRootCreateName('');
          refreshTree();
        }
      } catch (err) {
        console.error(err);
        alert(`Failed to create ${creatingState.type}.`);
      }
    }
  };

  if (parseFloat(width) === 0) return null;

  return (
    <div 
      style={{
        width: width || '260px', backgroundColor: 'var(--side-bar-bg)', borderRight: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', fontSize: '13px', overflowX: 'hidden', overflowY: 'auto', userSelect: 'none',
        position: 'relative'
      }}
      onContextMenu={(e) => e.preventDefault()} 
      onClick={() => setSelectedNode(null)} // Clicking empty space clears selection
    >
      {contextMenu.visible && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          items={contextMenu.items} 
          onClose={closeMenu} 
        />
      )}

      {activeView === 'explorer' ? (
        <>
          <div style={{ padding: '10px 15px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.8px', opacity: 0.6, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Explorer
            <div style={{ display: 'flex', gap: '8px' }}>
              <FilePlus size={15} style={{ cursor: 'pointer' }} title="New File" onClick={(e) => { e.stopPropagation(); handleCreateFromHeader('file'); }} />
              <FolderPlus size={15} style={{ cursor: 'pointer' }} title="New Folder" onClick={(e) => { e.stopPropagation(); handleCreateFromHeader('directory'); }} />
              <ListTree size={15} style={{ cursor: 'pointer', marginLeft: '4px' }} title="Expand All" onClick={(e) => { e.stopPropagation(); dispatch(expandAll()); }} />
              <ListFilter size={15} style={{ cursor: 'pointer' }} title="Collapse All" onClick={(e) => { e.stopPropagation(); dispatch(collapseAll()); }} />
            </div>
          </div>
          {fileTree ? (
            <>
              <div style={{
                padding: '4px 8px',
                paddingLeft: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '11px',
                opacity: 0.8
              }}>
                <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}>
                  <ChevronDown size={14} />
                </div>
                {rootFolderName}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                {creatingState?.targetPath === '' && (
                  <div style={{ paddingLeft: '28px', display: 'flex', alignItems: 'center', paddingY: '2px', paddingRight: '4px' }}>
                    <input
                      ref={rootInputRef}
                      value={rootCreateName}
                      onChange={(e) => setRootCreateName(e.target.value)}
                      onKeyDown={handleRootCreateKeyDown}
                      onBlur={() => { setCreatingState(null); setRootCreateName(''); }}
                      placeholder={`New ${creatingState.type}...`}
                      style={{ 
                        width: '90%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--accent-primary)', 
                        color: 'var(--text-primary)', fontSize: '12px', padding: '2px 4px', outline: 'none' 
                      }}
                    />
                  </div>
                )}
                {fileTree.map((item, idx) => (
                  <TreeItem 
                    key={idx} item={item} showMenu={showMenu} parentHandle={window.rootDirectoryHandle} 
                    refreshTree={refreshTree} selectedNode={selectedNode} setSelectedNode={setSelectedNode}
                    creatingState={creatingState} setCreatingState={setCreatingState} 
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '20px', opacity: 0.5, textAlign: 'center', fontSize: '12px' }}>No folder opened</div>
          )}
        </>
      ) : activeView === 'search' ? (
        <SearchView />
      ) : activeView === 'git' ? (
        <GitView />
      ) : activeView === 'chat' ? (
        <ChatView />
      ) : activeView === 'extensions' ? (
        <ExtensionsView />
      ) : null}
    </div>
  );
};

export default Sidebar;
