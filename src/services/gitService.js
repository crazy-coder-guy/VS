import { projectSocket } from './ProjectService';

/**
 * Git Service for Frontend
 * Communicates with the backend server for Git operations.
 */

export const gitClone = async (url, dirHandle, token = '', onProgressCb) => {
  // We'll keep this as a reminder if needed, but the backend handles local repo detection now.
  alert("Cloning moved to backend logic. Please use the backend Git features.");
  return null;
};

export const getGitStatus = () => {
  return new Promise((resolve) => {
    projectSocket.emit('git-refresh-status');
    projectSocket.once('git-status', (data) => {
      resolve(data);
    });
  });
};

export const gitAdd = async (filepath) => {
  projectSocket.emit('git-stage-file', { filepath });
};

export const gitRemove = async (filepath) => {
  // Not implemented yet on backend, but stubbing
  console.warn('gitRemove not implemented on backend');
};

export const gitReset = async (filepath) => {
  projectSocket.emit('git-unstage-file', { filepath });
};

export const gitCommit = async (message, author) => {
  projectSocket.emit('git-commit', { message, author });
};

export const gitPush = async (url, token) => {
  alert('Push functionality would go here (backend task).');
};

export const gitPull = async (url, token) => {
  alert('Pull functionality would go here (backend task).');
};

export const getBranches = () => {
  return new Promise((resolve) => {
    projectSocket.emit('git-refresh-status'); // This returns both status and branches
    projectSocket.once('git-status', (data) => {
      resolve({ branches: data.branches, currentBranch: data.currentBranch });
    });
  });
};

export const createBranch = async (branchName) => {
  alert('Branch creation would be handled on backend.');
};

export const getFileDiff = async (filepath) => {
  return new Promise((resolve) => {
    projectSocket.emit('git-get-diff', { filepath });
    projectSocket.once(`git-diff-${filepath}`, (data) => {
      resolve({ workdirContent: data.workdirContent, headContent: data.headContent });
    });
  });
};
