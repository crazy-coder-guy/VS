import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

/**
 * Git Service for Backend
 * Performs Git operations using the system filesystem.
 */
class GitService {
  constructor(rootDir) {
    this.rootDir = rootDir;
  }

  setRootDir(rootDir) {
    this.rootDir = rootDir;
  }

  /**
   * Get git status matrix
   */
  async getStatus() {
    try {
      // Check if it's a git repo
      let isRepo = true;
      try {
        await git.resolveRef({ fs, dir: this.rootDir, ref: 'HEAD' });
      } catch (e) {
        isRepo = false;
      }

      if (!isRepo) {
        return { isRepo: false, changes: [], staged: [] };
      }

      const matrix = await git.statusMatrix({
        fs,
        dir: this.rootDir,
      });

      const changes = [];
      const staged = [];

      matrix.forEach((row) => {
        const filepath = row[0];
        const head = row[1];
        const workdir = row[2];
        const stage = row[3];

        // 1,1,1 means unchanged
        if (head === 1 && workdir === 1 && stage === 1) return;

        const isUnstaged = workdir !== stage;
        const isStaged = head !== stage;

        let uiStatus = 'M';
        if (head === 0 && workdir === 2) uiStatus = 'U'; // Untracked
        if (workdir === 0) uiStatus = 'D'; // Deleted

        let stagedUiStatus = 'M';
        if (head === 0 && stage === 2) stagedUiStatus = 'A'; // Added
        if (stage === 0) stagedUiStatus = 'D'; // Deleted in stage

        if (isUnstaged) {
          changes.push({
            id: filepath,
            name: path.basename(filepath),
            path: filepath,
            status: uiStatus
          });
        }
        if (isStaged) {
          staged.push({
            id: filepath,
            name: path.basename(filepath),
            path: filepath,
            status: stagedUiStatus
          });
        }
      });

      return { isRepo: true, changes, staged };
    } catch (err) {
      console.error('[GitService] Failed to get status:', err);
      return { isRepo: false, changes: [], staged: [] };
    }
  }

  /**
   * Stage a file
   */
  async add(filepath) {
    try {
      await git.add({
        fs,
        dir: this.rootDir,
        filepath,
      });
      return true;
    } catch (err) {
      console.error('[GitService] Add failed:', err);
      throw err;
    }
  }

  /**
   * Unstage a file
   */
  async reset(filepath) {
    try {
      await git.resetIndex({
        fs,
        dir: this.rootDir,
        filepath,
      });
      return true;
    } catch (err) {
      console.error('[GitService] Reset failed:', err);
      throw err;
    }
  }

  /**
   * Create a commit
   */
  async commit(message, author) {
    try {
      const sha = await git.commit({
        fs,
        dir: this.rootDir,
        message,
        author: author || {
          name: 'AI IDE User',
          email: 'user@example.com',
        },
      });
      return sha;
    } catch (err) {
      console.error('[GitService] Commit failed:', err);
      throw err;
    }
  }

  /**
   * Get file diff (HEAD vs Workdir)
   */
  async getDiff(filepath) {
    try {
      let headContent = '';
      let workdirContent = '';

      try {
        const headCommitOid = await git.resolveRef({ fs, dir: this.rootDir, ref: 'HEAD' });
        const { blob } = await git.readBlob({ fs, dir: this.rootDir, oid: headCommitOid, filepath });
        headContent = new TextDecoder().decode(blob);
      } catch (e) {
        // Might be a new/untracked file
      }

      try {
        const fullPath = path.join(this.rootDir, filepath);
        workdirContent = fs.readFileSync(fullPath, 'utf8');
      } catch (e) {
        // Might be a deleted file
      }

      return { headContent, workdirContent };
    } catch (err) {
      console.error('[GitService] Diff failed:', err);
      throw err;
    }
  }

  /**
   * Get git log (commit history)
   */
  async getLog() {
    try {
      if (!(await this._isRepoCheck())) {
        return [];
      }
      
      const log = await git.log({
        fs,
        dir: this.rootDir,
        depth: 50, // Fetch last 50 commits
      });

      return log.map(commit => ({
        oid: commit.oid,
        message: commit.commit.message,
        author: commit.commit.author.name,
        timestamp: commit.commit.author.timestamp,
        parent: commit.commit.parent
      }));
    } catch (err) {
      console.error('[GitService] Get log failed:', err);
      return [];
    }
  }

  async _isRepoCheck() {
    try {
      await git.resolveRef({ fs, dir: this.rootDir, ref: 'HEAD' });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get branches and current branch
   */
  async getBranches() {
    try {
      if (!(await this._isRepoCheck())) {
        return { branches: [], currentBranch: '' };
      }
      
      const branches = await git.listBranches({ fs, dir: this.rootDir });
      const currentBranch = await git.currentBranch({
        fs,
        dir: this.rootDir,
        fullname: false,
      });
      return { branches, currentBranch };
    } catch (err) {
      console.error('[GitService] Get branches failed:', err);
      return { branches: [], currentBranch: '' };
    }
  }
}

export default GitService;
