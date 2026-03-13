import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TitleBar from './components/layout/TitleBar';
import ActivityBar from './components/layout/ActivityBar';
import Sidebar from './components/layout/Sidebar';
import RightSidebar from './components/layout/RightSidebar';
import Editor from './components/layout/Editor';
import StatusBar from './components/layout/StatusBar';
import ProjectService from './services/ProjectService';
import { initBrowserFS } from './utils/gitFs';
import './App.css';

import { setSidebarWidth, setRightSidebarWidth } from './store/fileSlice';

function App() {
  const { isSidebarOpen, sidebarWidth, isRightSidebarOpen, rightSidebarWidth } = useSelector(state => state.files);
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
    if (isResizing.current) {
      const newWidth = e.clientX - 50;
      if (newWidth < 50) {
        dispatch(setSidebarWidth(0));
      } else if (newWidth > 150 && newWidth < 600) {
        dispatch(setSidebarWidth(newWidth));
      }
    } else if (isRightResizing.current) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth < 50) {
        dispatch(setRightSidebarWidth(0));
      } else if (newWidth > 150 && newWidth < 800) {
        dispatch(setRightSidebarWidth(newWidth));
      }
    }
  };

  const isRightResizing = useRef(false);

  const startRightResizing = (e) => {
    isRightResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
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
      <ProjectService />
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

        {isRightSidebarOpen && (
          <>
            <div
              onMouseDown={startRightResizing}
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
            <RightSidebar width={`${rightSidebarWidth}px`} />
          </>
        )}
      </div>
      <StatusBar />
    </div>
  );
}

export default App;


