import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarWidth } from './store/fileSlice';
import TitleBar from './components/layout/TitleBar';
import ActivityBar from './components/layout/ActivityBar';
import Sidebar from './components/layout/Sidebar';
import Editor from './components/layout/Editor';
import StatusBar from './components/layout/StatusBar';
import { initBrowserFS } from './utils/gitFs';
import './App.css';

function App() {
  const { isSidebarOpen, sidebarWidth } = useSelector(state => state.files);
  const dispatch = useDispatch();
  const isResizing = useRef(false);

  useEffect(() => {
    initBrowserFS().then(() => {
      console.log('BrowserFS Initialized');
    }).catch(console.error);
  }, []);

  const startResizing = (e) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;

    // Calculate new width: mouse X - ActivityBar width (50px)
    const newWidth = e.clientX - 50;

    if (newWidth < 50) {
      dispatch(setSidebarWidth(0));
    } else if (newWidth > 150 && newWidth < 600) {
      dispatch(setSidebarWidth(newWidth));
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <TitleBar />
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        <ActivityBar />
        {isSidebarOpen && (
          <>
            <Sidebar width={`${sidebarWidth}px`} />
            <div
              onMouseDown={startResizing}
              style={{
                width: '4px',
                cursor: 'col-resize',
                backgroundColor: 'transparent',
                zIndex: 100,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            />
          </>
        )}

        <Editor />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;


