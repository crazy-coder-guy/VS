export class NativeFS {
  constructor(rootHandle) {
    this.root = rootHandle;
    this.promises = {
      readFile: this.readFile.bind(this),
      writeFile: this.writeFile.bind(this),
      unlink: this.unlink.bind(this),
      readdir: this.readdir.bind(this),
      mkdir: this.mkdir.bind(this),
      rmdir: this.rmdir.bind(this),
      stat: this.stat.bind(this),
      lstat: this.stat.bind(this),
      readlink: async () => { const e = new Error("ENOSYS"); e.code = 'ENOSYS'; throw e; },
      symlink: async () => { const e = new Error("ENOSYS"); e.code = 'ENOSYS'; throw e; },
      chmod: async () => {},
    };
  }

  _cleanPath(path) {
    if (path === null || path === undefined) return '';
    if (typeof path !== 'string') path = String(path);
    return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
  }

  async _getHandle(path, create = false, isFile = true) {
    path = this._cleanPath(path);
    if (path === '' || path === '.') return this.root;
    
    const parts = path.split('/').filter(p => p !== '' && p !== '.');
    let curr = this.root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      if (isLast && isFile) {
        try {
          curr = await curr.getFileHandle(part, { create });
        } catch (err) {
          if (err.name === 'NotFoundError') {
            const e = new Error(`ENOENT: '${path}'`);
            e.code = 'ENOENT';
            throw e;
          }
          throw err;
        }
      } else {
        // Directory part
        try {
          curr = await curr.getDirectoryHandle(part, { create });
        } catch (err) {
          if (err.name === 'NotFoundError') {
            const e = new Error(`ENOENT: '${path}'`);
            e.code = 'ENOENT';
            throw e;
          }
          throw err;
        }
      }
    }
    return curr;
  }

  async readFile(filepath, opts) {
    const path = this._cleanPath(filepath);
    if (!path) {
      const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e;
    }
    
    if (!path.startsWith('.git/')) console.log(`[NativeFS] 📖 readFile: ${path}`);
    
    try {
      const handle = await this._getHandle(path, false, true);
      const file = await handle.getFile();
      const buf = await file.arrayBuffer();
      if ((typeof opts === 'string' && opts === 'utf8') || (opts && opts.encoding === 'utf8')) {
        return new TextDecoder('utf-8').decode(buf);
      }
      return new Uint8Array(buf);
    } catch(err) {
      if (!path.startsWith('.git/')) {
        console.error(`[NativeFS] ❌ readFile FAILED: ${path} - ${err.message}`);
      }
      throw err;
    }
  }

  async writeFile(filepath, data, opts) {
    const path = this._cleanPath(filepath);
    
    if (!path.startsWith('.git/')) console.log(`[NativeFS] ✍️ writeFile: ${path}`);
    
    try {
      const handle = await this._getHandle(path, true, true);
      const writable = await handle.createWritable();
      
      let writableData = data;
      if (typeof data === 'string') {
        writableData = new TextEncoder().encode(data);
      } else if (data && data.buffer && data.buffer instanceof ArrayBuffer) {
        writableData = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      } else if (data instanceof Uint8Array) {
        writableData = data;
      } else if (Array.isArray(data)) {
        writableData = new Uint8Array(data);
      }
      
      await writable.write(writableData);
      await writable.close();
      
      if (!path.startsWith('.git/')) {
        console.log(`[NativeFS] ✅ writeFile OK: ${path}`);
      }
    } catch(err) {
      console.error(`[NativeFS] ❌ writeFile FAILED: ${path} - ${err.message}`);
      throw err;
    }
  }

  async unlink(filepath) {
    const path = this._cleanPath(filepath);
    if (!path.startsWith('.git/')) console.log(`[NativeFS] 🗑️ unlink: ${path}`);
    
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) throw new Error("EPERM: Cannot unlink root");
    const fileName = parts.pop();
    const parentDir = parts.join('/');
    const dirHandle = parentDir ? await this._getHandle(parentDir, false, false) : this.root;
    try {
      await dirHandle.removeEntry(fileName);
    } catch (err) {
      if (err.name === 'NotFoundError') {
        const e = new Error("ENOENT"); e.code = 'ENOENT'; throw e;
      }
      throw err;
    }
  }

  async readdir(filepath) {
    const path = this._cleanPath(filepath);
    if (!path.startsWith('.git/')) console.log(`[NativeFS] 📂 readdir: ${path}`);
    
    try {
      const dirHandle = path ? await this._getHandle(path, false, false) : this.root;
      const entries = [];
      for await (const [name] of dirHandle.entries()) {
        entries.push(name);
      }
      return entries;
    } catch(err) {
      if (err.name === 'NotFoundError') {
        const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e;
      }
      if (err.name === 'TypeMismatchError') {
        const e = new Error('ENOTDIR'); e.code = 'ENOTDIR'; throw e;
      }
      if (!path.startsWith('.git/')) console.error(`[NativeFS] ❌ readdir FAILED: ${path} - ${err.message}`);
      throw err;
    }
  }

  async mkdir(filepath, opts) {
    const path = this._cleanPath(filepath);
    if (!path) return;
    
    if (!path.startsWith('.git/')) console.log(`[NativeFS] 📁 mkdir: ${path}`);
    
    // Always recursively create all intermediate dirs (like mkdir -p)
    try {
      const parts = path.split('/').filter(Boolean);
      let curr = this.root;
      for (const part of parts) {
        curr = await curr.getDirectoryHandle(part, { create: true });
      }
    } catch (err) {
      console.error(`[NativeFS] ❌ mkdir FAILED: ${path} - ${err.message}`);
      throw err;
    }
  }

  async rmdir(filepath) {
    const path = this._cleanPath(filepath);
    if (!path.startsWith('.git/')) console.log(`[NativeFS] 💥 rmdir: ${path}`);
    
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) throw new Error("EPERM: Cannot rmdir root");
    const dirName = parts.pop();
    const parentDir = parts.join('/');
    const parentHandle = parentDir ? await this._getHandle(parentDir, false, false) : this.root;
    try {
      await parentHandle.removeEntry(dirName, { recursive: true });
    } catch (err) {
      if (err.name === 'NotFoundError') {
        const e = new Error("ENOENT"); e.code = 'ENOENT'; throw e;
      }
      throw err;
    }
  }

  _makeStat(type, size, lastModified) {
    const isDir = type === 'dir';
    const mode = isDir ? 0o40000 | 0o755 : 0o100000 | 0o644;
    return {
      type,
      mode,
      size,
      ino: 0,
      mtimeMs: lastModified,
      ctimeMs: lastModified,
      dev: 1,
      uid: 1,
      gid: 1,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isSymbolicLink: () => false,
    };
  }

  async stat(filepath) {
    const path = this._cleanPath(filepath);
    if (!path.startsWith('.git/')) console.log(`[NativeFS] 🔍 stat: ${path}`);
    
    if (path === '' || path === '.') {
      return this._makeStat('dir', 0, Date.now());
    }
    
    try {
      const parts = path.split('/').filter(Boolean);
      let curr = this.root;
      for (let i = 0; i < parts.length - 1; i++) {
        curr = await curr.getDirectoryHandle(parts[i]);
      }
      const lastPart = parts[parts.length - 1];
      
      try {
        const fileHandle = await curr.getFileHandle(lastPart);
        const file = await fileHandle.getFile();
        return this._makeStat('file', file.size, file.lastModified);
      } catch (fileErr) {
        if (fileErr.name === 'TypeMismatchError') {
          // It's a directory, return dir stats
          await curr.getDirectoryHandle(lastPart);
          return this._makeStat('dir', 0, Date.now());
        }
        if (fileErr.name === 'NotFoundError') {
           // Not a file, try directory as a fallback, just in case
           try {
             await curr.getDirectoryHandle(lastPart);
             return this._makeStat('dir', 0, Date.now());
           } catch (dirErr) {
             const e = new Error(`ENOENT: '${path}'`);
             e.code = 'ENOENT';
             throw e; 
           }
        }
        throw fileErr;
      }
    } catch(err) {
      if (err.name === 'TypeMismatchError' || err.code === 'ENOTDIR') {
        const e = new Error(`ENOTDIR: NOT A DIRECTORY '${path}'`);
        e.code = 'ENOTDIR';
        throw e;
      }
      
      // isomorphic-git swallows ENOENT during its tree traversal checks
      if (err.code !== 'ENOENT' && err.name !== 'NotFoundError') {
        const e = new Error(`ENOENT: '${path}'`);
        e.code = 'ENOENT';
        throw e;
      }
      
      if (err.name === 'NotFoundError') {
        const e = new Error(`ENOENT: '${path}'`);
        e.code = 'ENOENT';
        throw e;
      }
      
      throw err;
    }
  }
}
