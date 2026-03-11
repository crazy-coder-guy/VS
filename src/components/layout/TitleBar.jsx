import React, { useState, useEffect, useRef } from 'react';
import { Box, PanelLeft, PanelRight, PanelBottom } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { openFile, setFileTree, toggleSidebar } from '../../store/fileSlice';
import { readDirectory } from '../../utils/fileSystem';

const TitleBar = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector(state => state.files);

  const handleOpenFileClick = () => {
    fileInputRef.current?.click();
    setActiveMenu(null);
  };
  const handleOpenFolderClick = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      window.rootDirectoryHandle = dirHandle; // Save globally so Sidebar can refresh
      const tree = await readDirectory(dirHandle);
      dispatch(setFileTree({ name: dirHandle.name, tree }));
      setActiveMenu(null);
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const fileId = `${file.name}-${Date.now()}`;
        const extension = file.name.split('.').pop();
        const languageMap = {
          'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
          'css': 'css', 'html': 'html', 'json': 'json', 'md': 'markdown'
        };
        dispatch(openFile({
          id: fileId,
          name: file.name,
          content: content,
          language: languageMap[extension] || 'plaintext'
        }));
      };
      reader.readAsText(file);
    }
  };

  const menus = {
    'File': [
      { label: 'New Text File', action: () => { } },
      { label: 'New File...', action: () => { } },
      { label: '---' },
      { label: 'Open File...', action: handleOpenFileClick },
      { label: 'Open Folder...', action: handleOpenFolderClick },
      { label: '---' },
      { label: 'Save', action: () => { } },
      { label: 'Save As...', action: () => { } },
      { label: '---' },
      { label: 'Exit', action: () => { } }
    ],
    'Edit': [
      { label: 'Undo' }, { label: 'Redo' }, { label: '---' },
      { label: 'Cut' }, { label: 'Copy' }, { label: 'Paste' }
    ],
    'Selection': [{ label: 'Select All' }],
    'View': [{ label: 'Command Palette...' }],
    'Go': [{ label: 'Go to File...' }],
    'Run': [{ label: 'Start Debugging' }],
    'Terminal': [{ label: 'New Terminal' }],
    'Help': [{ label: 'About' }]
  };

  const menuNames = Object.keys(menus);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuMouseEnter = (menu) => {
    if (activeMenu) {
      setActiveMenu(menu);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        height: '35px',
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        fontSize: '13px',
        userSelect: 'none',
        zIndex: 1000,
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Box size={18} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
        <div style={{ display: 'flex', gap: '2px' }}>
          {menuNames.map((name) => (
            <div key={name} style={{ position: 'relative' }}>
              <div
                onClick={() => handleMenuClick(name)}
                onMouseEnter={() => handleMenuMouseEnter(name)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: activeMenu === name ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                {name}
              </div>

              {activeMenu === name && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  minWidth: '200px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  padding: '5px 0',
                  zIndex: 1100,
                  marginTop: '1px'
                }}>
                  {menus[name].map((item, idx) => (
                    item.label === '---' ? (
                      <div key={idx} style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 10px' }} />
                    ) : (
                      <div
                        key={idx}
                        onClick={() => item.action && item.action()}
                        style={{
                          padding: '6px 20px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span>{item.label}</span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        opacity: 0.6,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>v-AI IDE - Project</span>
      </div>

      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <div
          onClick={() => dispatch(toggleSidebar())}
          style={{
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isSidebarOpen ? 'var(--bg-secondary)' : 'transparent',
            opacity: isSidebarOpen ? 1 : 0.6,
            transition: 'all 0.2s'
          }}
          title="Toggle Primary Sidebar (Ctrl+B)"
        >
          <PanelLeft size={18} />
        </div>
        <PanelBottom size={18} style={{ opacity: 0.3, padding: '4px 6px', cursor: 'not-allowed' }} title="Toggle Bottom Panel (Disabled)" />
        <PanelRight size={18} style={{ opacity: 0.3, padding: '4px 6px', cursor: 'not-allowed' }} title="Toggle Secondary Sidebar (Disabled)" />
      </div>
    </div>
  );
};

export default TitleBar;
