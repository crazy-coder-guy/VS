import * as BrowserFS from 'browserfs';

let isConfigured = false;
let fsWrapper = null;

export const initBrowserFS = () => {
  return new Promise((resolve, reject) => {
    if (isConfigured) {
      resolve(fsWrapper);
      return;
    }

    BrowserFS.configure(
      {
        fs: 'IndexedDB',
        options: {
          storeName: 'ai-ide-git-repo',
        },
      },
      (e) => {
        if (e) {
          console.error('Failed to configure BrowserFS', e);
          reject(e);
          return;
        }
        
        // Correctly extract the fs CommonJS module
        const bfs = BrowserFS.BFSRequire('fs');
        
        // Isomorphic-git v1.x strictly requires a promises API
        fsWrapper = {
          promises: {
            readFile: (path, opts) => new Promise((res, rej) => bfs.readFile(path, opts, (err, data) => err ? rej(err) : res(data))),
            writeFile: (path, data, opts) => new Promise((res, rej) => bfs.writeFile(path, data, opts, (err) => err ? rej(err) : res())),
            unlink: (path) => new Promise((res, rej) => bfs.unlink(path, (err) => err ? rej(err) : res())),
            readdir: (path) => new Promise((res, rej) => bfs.readdir(path, (err, data) => err ? rej(err) : res(data))),
            mkdir: (path) => new Promise((res, rej) => bfs.mkdir(path, (err) => err ? rej(err) : res())),
            rmdir: (path) => new Promise((res, rej) => bfs.rmdir(path, (err) => err ? rej(err) : res())),
            stat: (path) => new Promise((res, rej) => bfs.stat(path, (err, data) => err ? rej(err) : res(data))),
            lstat: (path) => new Promise((res, rej) => bfs.lstat(path, (err, data) => err ? rej(err) : res(data))),
            readlink: (path) => new Promise((res, rej) => bfs.readlink(path, (err, data) => err ? rej(err) : res(data))),
            symlink: (target, path) => new Promise((res, rej) => bfs.symlink(target, path, (err) => err ? rej(err) : res())),
            chmod: (path, mode) => new Promise((res, rej) => bfs.chmod(path, mode, (err) => err ? rej(err) : res()))
          },
          mkdirSync: bfs.mkdirSync.bind(bfs),
          readFileSync: bfs.readFileSync.bind(bfs),
          writeFileSync: bfs.writeFileSync.bind(bfs)
        };

        isConfigured = true;
        resolve(fsWrapper);
      }
    );
  });
};

export const getFS = () => {
  if (!isConfigured || !fsWrapper) {
    throw new Error("BrowserFS has not been initialized. Call initBrowserFS() first.");
  }
  return fsWrapper;
};
