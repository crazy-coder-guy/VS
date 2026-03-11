import React from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { useTheme } from '../../context/ThemeContext';

const DiffViewer = ({ oldValue, newValue, leftTitle, rightTitle }) => {
  const { theme } = useTheme();
  
  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--editor-bg)' }}>
      <ReactDiffViewer
        oldValue={oldValue || ''}
        newValue={newValue || ''}
        splitView={true}
        useDarkTheme={theme === 'dark'}
        leftTitle={leftTitle || 'Original (HEAD)'}
        rightTitle={rightTitle || 'Modified (Working Tree)'}
        styles={{
          variables: {
            dark: {
              diffViewerBackground: 'var(--editor-bg)',
              diffViewerColor: '#d4d4d4',
              addedBackground: '#044B53',
              addedColor: 'white',
              removedBackground: '#632F34',
              removedColor: 'white',
              wordAddedBackground: '#055d67',
              wordRemovedBackground: '#7d383f',
              addedGutterBackground: '#034148',
              removedGutterBackground: '#632b30',
              gutterBackground: 'var(--side-bar-bg)',
              gutterBackgroundDark: '#1e1e1e',
              highlightBackground: '#2a2a2a',
              highlightGutterBackground: '#2a2a2a',
              codeFoldGutterBackground: '#252526',
              codeFoldBackground: '#252526',
              emptyLineBackground: '#1e1e1e',
              gutterColor: '#858585',
              addedGutterColor: '#8c8c8c',
              removedGutterColor: '#8c8c8c',
              codeFoldContentColor: '#cccccc',
              diffViewerTitleBackground: '#2d2d2d',
              diffViewerTitleColor: '#cccccc',
              diffViewerTitleBorderColor: '#333',
            }
          },
          line: {
            fontFamily: 'Google Sans, Fira Code, monospace',
            fontSize: '13px'
          }
        }}
      />
    </div>
  );
};

export default DiffViewer;
