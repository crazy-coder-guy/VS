import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gitClone, getGitStatus, gitAdd, gitCommit, gitPush, gitPull, getBranches, createBranch, getFileDiff } from '../services/gitService';
import { openFile } from './fileSlice';

const initialState = {
  repoUrl: '',
  githubToken: '',
  currentBranch: 'main',
  branches: [],
  commits: [],
  changes: [], // { filepath, status }
  staged: [],  // { filepath, status }
  isCloning: false,
  cloneProgress: '',
  isPushing: false,
  isPulling: false,
  error: null,
};

export const cloneRepoThunk = createAsyncThunk(
  'git/cloneRepo',
  async ({ url, token, dirHandle }, { dispatch }) => {
    const repoDirHandle = await gitClone(url, dirHandle, token, (progressStr) => {
      dispatch(setCloneProgress(progressStr));
    });
    dispatch(setRepoUrl(url));
    if (token) dispatch(setGithubToken(token));
    // The UI handles setting the active workspace dirHandle after clone
    return { url, repoDirHandle };
  }
);

export const refreshGitStatusThunk = createAsyncThunk(
  'git/refreshStatus',
  async () => {
    const statusResult = await getGitStatus();
    const branchesResult = await getBranches();
    return {
      changes: statusResult.changes,
      staged: statusResult.staged,
      branches: branchesResult.branches,
      currentBranch: branchesResult.currentBranch
    };
  }
);

export const stageFileThunk = createAsyncThunk(
  'git/stageFile',
  async ({ filepath }, { dispatch }) => {
    await gitAdd(filepath);
    dispatch(refreshGitStatusThunk());
  }
);

export const commitChangesThunk = createAsyncThunk(
  'git/commitChanges',
  async ({ message, author }, { dispatch }) => {
    await gitCommit(message, author);
    dispatch(refreshGitStatusThunk());
  }
);

export const pushRepoThunk = createAsyncThunk(
  'git/pushRepo',
  async ({ url, token, branch }) => {
    await gitPush(url, token);
  }
);

export const openDiffThunk = createAsyncThunk(
  'git/openDiff',
  async ({ filepath, name }, { dispatch }) => {
    const { workdirContent, headContent } = await getFileDiff(filepath);
    dispatch(openFile({
      id: `diff-${filepath}`,
      name: `${name} (Diff)`,
      content: workdirContent,
      originalContent: headContent,
      isDiff: true,
      language: filepath.split('.').pop() || 'plaintext'
    }));
  }
);

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setRepoUrl: (state, action) => {
      state.repoUrl = action.payload;
    },
    setGithubToken: (state, action) => {
      state.githubToken = action.payload;
    },
    setCloneProgress: (state, action) => {
      state.cloneProgress = action.payload;
    },
    clearGitError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Clone
      .addCase(cloneRepoThunk.pending, (state) => {
        state.isCloning = true;
        state.cloneProgress = 'Initializing clone...';
        state.error = null;
      })
      .addCase(cloneRepoThunk.fulfilled, (state, action) => {
        state.isCloning = false;
        state.cloneProgress = '';
        state.repoUrl = action.payload;
      })
      .addCase(cloneRepoThunk.rejected, (state, action) => {
        state.isCloning = false;
        state.cloneProgress = '';
        state.error = action.error.message;
      })
      // Refresh Status
      .addCase(refreshGitStatusThunk.fulfilled, (state, action) => {
        state.changes = action.payload.changes;
        state.staged = action.payload.staged;
        state.branches = action.payload.branches;
        state.currentBranch = action.payload.currentBranch;
      })
      // Push
      .addCase(pushRepoThunk.pending, (state) => {
        state.isPushing = true;
        state.error = null;
      })
      .addCase(pushRepoThunk.fulfilled, (state) => {
        state.isPushing = false;
      })
      .addCase(pushRepoThunk.rejected, (state, action) => {
        state.isPushing = false;
        state.error = action.error.message;
      });
  }
});

export const { setRepoUrl, setGithubToken, setCloneProgress, clearGitError } = gitSlice.actions;
export default gitSlice.reducer;
