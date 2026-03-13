import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  openFiles: [], // Array of { id, name, content, language, isDirty }
  activeFileId: null,
  fileTree: null, // Recursive tree structure
  rootFolderName: null,
  rootFolderPath: null, // Absolute path for backend sync
  activeView: 'explorer', // 'explorer', 'search', 'chat'
  isSidebarOpen: true,
  sidebarWidth: 260,
  isRightSidebarOpen: false,
  rightSidebarWidth: 300,
  expandedFolders: {}, // { path: boolean }
  autoSave: false, // Auto-save toggle state
  // Terminal tracking
  terminals: [{ id: 'term-1', name: 'powershell', cwd: 'C:\\' }],
  activeTerminalId: 'term-1',
  terminalCounter: 1,
  cursorPosition: { lineNumber: 1, column: 1 },
  problems: [], // Editor local markers
  projectProblems: [] // Backend project-wide diagnostics
};

const fileSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    openFile: (state, action) => {
      const { id, name, content, language, handle } = action.payload;
      const existingFile = state.openFiles.find(f => f.id === id);
      
      if (!existingFile) {
        state.openFiles.push({ id, name, content, language, handle, isDirty: false });
      } else {
        existingFile.isDirty = false;
        existingFile.content = content;
        if (handle) existingFile.handle = handle;
      }
      state.activeFileId = id || (existingFile ? existingFile.id : id);
    },
    closeFile: (state, action) => {
      const id = action.payload;
      state.openFiles = state.openFiles.filter(f => f.id !== id);
      if (state.activeFileId === id) {
        state.activeFileId = state.openFiles.length > 0 ? state.openFiles[state.openFiles.length - 1].id : null;
      }
    },
    closeAllFiles: (state) => {
      state.openFiles = [];
      state.activeFileId = null;
    },
    closeSavedFiles: (state) => {
      state.openFiles = state.openFiles.filter(f => f.isDirty);
      if (state.activeFileId && !state.openFiles.find(f => f.id === state.activeFileId)) {
        state.activeFileId = state.openFiles.length > 0 ? state.openFiles[state.openFiles.length - 1].id : null;
      }
    },
    closeOtherFiles: (state, action) => {
      const id = action.payload || state.activeFileId;
      state.openFiles = state.openFiles.filter(f => f.id === id);
      state.activeFileId = id;
    },
    setActiveFile: (state, action) => {
      state.activeFileId = action.payload;
    },
    updateFileContent: (state, action) => {
      const { id, content } = action.payload;
      const file = state.openFiles.find(f => f.id === id);
      if (file && file.content !== content) {
        file.content = content;
        file.isDirty = true;
      }
    },
    markFileSaved: (state, action) => {
      const id = action.payload;
      const file = state.openFiles.find(f => f.id === id);
      if (file) {
        file.isDirty = false;
      }
    },
    toggleAutoSave: (state) => {
      state.autoSave = !state.autoSave;
    },
    setFileTree: (state, action) => {
      state.fileTree = action.payload.tree;
      state.rootFolderName = action.payload.name;
      state.rootFolderPath = action.payload.path;
      // Update terminal path dynamically
      if (action.payload.path) {
        state.terminals.forEach(t => {
          if (t.cwd === 'D:\\AICODE\\ai-ide' || t.cwd === 'C:\\' || t.cwd.startsWith('D:\\AICODE')) {
            t.cwd = action.payload.path;
          }
        });
      }
    },
    setActiveView: (state, action) => {
      if (state.activeView === action.payload && state.isSidebarOpen) {
        state.isSidebarOpen = false;
      } else {
        state.activeView = action.payload;
        state.isSidebarOpen = true;
      }
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarWidth: (state, action) => {
      state.sidebarWidth = action.payload;
      if (action.payload > 0) {
        state.isSidebarOpen = true;
      } else {
        state.isSidebarOpen = false;
      }
    },
    toggleRightSidebar: (state) => {
      state.isRightSidebarOpen = !state.isRightSidebarOpen;
    },
    setRightSidebarWidth: (state, action) => {
      state.rightSidebarWidth = action.payload;
      if (action.payload > 0) {
        state.isRightSidebarOpen = true;
      } else {
        state.isRightSidebarOpen = false;
      }
    },
    toggleFolder: (state, action) => {
      const path = action.payload;
      state.expandedFolders[path] = !state.expandedFolders[path];
    },
    expandAll: (state) => {
      const expandRecursive = (items, parentPath = '') => {
        items.forEach(item => {
          if (item.kind === 'directory') {
            const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            state.expandedFolders[currentPath] = true;
            if (item.children) expandRecursive(item.children, currentPath);
          }
        });
      };
      if (state.fileTree) expandRecursive(state.fileTree);
    },
    collapseAll: (state) => {
      state.expandedFolders = {};
    },
    createTerminal: (state, action) => {
      const { cwd } = action.payload || {};
      state.terminalCounter += 1;
      const newId = `term-${state.terminalCounter}`;
      state.terminals.push({
        id: newId,
        name: action.payload?.name || 'powershell',
        cwd: cwd || (state.rootFolderName ? `D:\\${state.rootFolderName}` : 'C:\\')
      });
      state.activeTerminalId = newId;
    },
    closeTerminal: (state, action) => {
      const id = action.payload;
      state.terminals = state.terminals.filter(t => t.id !== id);
      if (state.activeTerminalId === id) {
        state.activeTerminalId = state.terminals.length > 0 ? state.terminals[state.terminals.length - 1].id : null;
      }
    },
    setActiveTerminal: (state, action) => {
      state.activeTerminalId = action.payload;
    },
    setCursorPosition: (state, action) => {
      state.cursorPosition = action.payload;
    },
    setProblems: (state, action) => {
      state.problems = action.payload;
    },
    setProjectProblems: (state, action) => {
      state.projectProblems = action.payload;
    }
  },
});

export const { 
  openFile, closeFile, setActiveFile, updateFileContent, 
  setFileTree, setActiveView, toggleSidebar, setSidebarWidth,
  toggleRightSidebar, setRightSidebarWidth,
  toggleFolder, expandAll, collapseAll,
  createTerminal, closeTerminal, setActiveTerminal, toggleAutoSave, markFileSaved,
  setCursorPosition, setProblems, setProjectProblems,
  closeAllFiles, closeSavedFiles, closeOtherFiles
} = fileSlice.actions;
export default fileSlice.reducer;
