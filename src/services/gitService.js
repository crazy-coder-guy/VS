import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { NativeFS } from '../utils/nativeFs';

let fs; // Will hold the NativeFS instance

export const getFSHelper = (dirHandle) => {
  if (!fs || fs.root !== dirHandle) {
    fs = new NativeFS(dirHandle);
  }
  return { fs, dir: '.' }; // '.' represents the root of the selected directory
};

export const gitClone = async (url, dirHandle, token = '', onProgressCb) => {
  if (onProgressCb) onProgressCb('Initializing clone...');

  // Extract repo name from URL (e.g. "https://github.com/user/Repo.git" -> "Repo")
  let repoName = url.split('/').pop().replace(/\.git$/, '');
  if (!repoName) repoName = 'cloned-repo';

  // Create the root folder for the repo
  if (onProgressCb) onProgressCb(`Creating folder '${repoName}'...`);
  let repoDirHandle;
  try {
    repoDirHandle = await dirHandle.getDirectoryHandle(repoName, { create: true });
  } catch (err) {
    console.error('[GitClone] Failed to create repo folder:', err);
    throw new Error(`Could not create folder '${repoName}': ` + err.message);
  }

  // Use the newly created repository folder as the root for NativeFS
  const { fs, dir } = getFSHelper(repoDirHandle);

  // Step 1: Detect the default branch name dynamically
  if (onProgressCb) onProgressCb('Detecting default branch...');
  let defaultBranch = 'main';
  try {
    const info = await git.getRemoteInfo({
      http,
      url,
      corsProxy: 'https://cors.isomorphic-git.org',
    });
    if (info && info.HEAD) {
      defaultBranch = info.HEAD.replace('refs/heads/', '');
    }
  } catch (err) {
    console.warn('[GitClone] Failed to get remote info, falling back to main', err);
  }

  // Step 2: Fetch the repository data (no checkout)
  if (onProgressCb) onProgressCb(`Downloading repository (branch: ${defaultBranch})...`);
  try {
    await git.clone({
      fs,
      http,
      dir,
      corsProxy: 'https://cors.isomorphic-git.org',
      url,
      ref: defaultBranch,
      singleBranch: true,
      depth: 1,
      noCheckout: true, // We will checkout manually
      onMessage: (msg) => {
        if (onProgressCb) onProgressCb(msg.trim());
      },
      onProgress: (event) => {
        if (onProgressCb && event.phase) {
          if (event.total) {
            onProgressCb(`${event.phase}: ${Math.round((event.loaded / event.total) * 100)}%`);
          } else {
            onProgressCb(`${event.phase}: ${event.loaded}`);
          }
        }
      },
      onAuth: () => token ? { username: token } : undefined,
      onAuthFailure: () => {
        throw new Error('Authentication failed or required for this repository.');
      }
    });

    // Diagnostic logging
    try {
      const branches = await git.listBranches({ fs, dir, remote: 'origin' });
      console.log('[GitClone] Remote branches:', branches);
      const localBranches = await git.listBranches({ fs, dir });
      console.log('[GitClone] Local branches:', localBranches);
      const files = await fs.promises.readdir(dir);
      console.log('[GitClone] Files in dir after fetch:', files);
    } catch (e) {
      console.error('[GitClone] Diagnostic failed:', e);
    }

  } catch (err) {
    console.error('[GitClone] Clone failed:', err);
    throw new Error('Git clone failed: ' + err.message);
  }

  // Step 3: Manual extraction to bypass checkout bugs
  if (onProgressCb) onProgressCb(`Extracting files (${defaultBranch})...`);
  try {
    const headOid = await git.resolveRef({ fs, dir, ref: defaultBranch });
    let fileCount = 0;
    
    await git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref: headOid })],
      map: async function(filepath, [entry]) {
        if (!entry || filepath === '.' || filepath === '') return;
        
        const type = await entry.type();
        if (type === 'tree') {
          await fs.promises.mkdir(filepath, { recursive: true });
        } else if (type === 'blob') {
          fileCount++;
          if (onProgressCb && fileCount % 10 === 0) {
            onProgressCb(`Extracting file ${fileCount}...`);
          }
          const blob = await entry.content();
          await fs.promises.writeFile(filepath, blob);
        }
      }
    });

    console.log(`[GitClone] Successfully extracted ${fileCount} files manually.`);
    
    // Attempt to populate the git index so 'git status' isn't confused
    try {
      if (onProgressCb) onProgressCb('Finalizing Git index...');
      await git.checkout({ fs, dir, ref: defaultBranch, force: true });
    } catch (indexErr) {
      console.warn('[GitClone] Index finalization failed, but files were extracted:', indexErr);
    }
    
  } catch (err) {
    console.error('[GitClone] Extraction failed:', err);
    throw new Error('Fetch succeeded, but extraction failed: ' + err.message);
  }

  // Store the repoDirHandle globally for future git operations
  // We save the newly created repository folder, NOT the outer picked directory
  window.rootDirectoryHandle = repoDirHandle;
  if (onProgressCb) onProgressCb('Clone complete!');
  
  return repoDirHandle;
};

export const getGitStatus = async () => {
  if (!window.rootDirectoryHandle) return { changes: [], staged: [] };
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);

  try {
    const matrix = await git.statusMatrix({ fs, dir });
    const changes = [];
    const staged = [];

    matrix.forEach((row) => {
      const filepath = row[0];
      const head = row[1];
      const workdir = row[2];
      const stage = row[3];

      if (head === 1 && workdir === 1 && stage === 1) return;

      const isUnstaged = workdir !== stage;
      const isStaged = head !== stage;

      let uiStatus = 'M';
      if (head === 0 && workdir === 2) uiStatus = 'U';
      if (workdir === 0) uiStatus = 'D';
      
      let stagedUiStatus = 'M';
      if (head === 0 && stage === 2) stagedUiStatus = 'A';
      if (stage === 0) stagedUiStatus = 'D';

      if (isUnstaged) {
        changes.push({ id: filepath, name: filepath.split('/').pop(), path: filepath, status: uiStatus });
      }
      if (isStaged) {
        staged.push({ id: filepath, name: filepath.split('/').pop(), path: filepath, status: stagedUiStatus });
      }
    });

    return { changes, staged };
  } catch (err) {
    return { changes: [], staged: [] };
  }
};

export const gitAdd = async (filepath) => {
  if (!window.rootDirectoryHandle) return;
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  await git.add({ fs, dir, filepath });
};

export const gitRemove = async (filepath) => {
  if (!window.rootDirectoryHandle) return;
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  await git.remove({ fs, dir, filepath });
};

export const gitCommit = async (message, author = { name: 'AI IDE User', email: 'user@example.com' }) => {
  if (!window.rootDirectoryHandle) return;
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  const sha = await git.commit({ fs, dir, author, message });
  return sha;
};

export const gitPush = async (url, token) => {
  if (!window.rootDirectoryHandle) return;
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  await git.push({
    fs,
    http,
    dir,
    url,
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => token ? { username: token } : undefined,
    onAuthFailure: () => { throw new Error('Authentication failed or required to push.'); }
  });
};

export const gitPull = async (url, token) => {
  if (!window.rootDirectoryHandle) return;
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  await git.pull({
    fs,
    http,
    dir,
    url,
    corsProxy: 'https://cors.isomorphic-git.org',
    singleBranch: true,
    onAuth: () => token ? { username: token } : undefined,
    onAuthFailure: () => { throw new Error('Authentication failed or required to pull.'); }
  });
};

export const getBranches = async () => {
  if (!window.rootDirectoryHandle) return { branches: [], currentBranch: '' };
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  try {
    const branches = await git.listBranches({ fs, dir });
    const currentBranch = await git.currentBranch({ fs, dir, fullname: false });
    return { branches, currentBranch };
  } catch(e) {
    return { branches: [], currentBranch: '' };
  }
};

export const createBranch = async (branchName) => {
  if (!window.rootDirectoryHandle) return;
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  await git.branch({ fs, dir, ref: branchName });
};

export const getFileDiff = async (filepath) => {
  if (!window.rootDirectoryHandle) return { workdirContent: '', headContent: '' };
  const { fs, dir } = getFSHelper(window.rootDirectoryHandle);
  
  let workdirContent = '';
  let headContent = '';
  
  try {
    const content = await fs.readFile(filepath, 'utf8');
    workdirContent = content;
  } catch(e) { /* File might be deleted */ }

  try {
    const headCommitOid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    const { blob } = await git.readBlob({ fs, dir, oid: headCommitOid, filepath });
    headContent = new TextDecoder('utf8').decode(blob);
  } catch(e) { /* File might be untracked/new */ }

  return { workdirContent, headContent };
};
