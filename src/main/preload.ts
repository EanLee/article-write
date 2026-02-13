import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
  copyFile: (sourcePath: string, targetPath: string) => ipcRenderer.invoke('copy-file', sourcePath, targetPath),

  // Directory operations
  readDirectory: (path: string) => ipcRenderer.invoke('read-directory', path),
  createDirectory: (path: string) => ipcRenderer.invoke('create-directory', path),
  getFileStats: (path: string) => ipcRenderer.invoke('get-file-stats', path),

  // Config operations
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config: any) => ipcRenderer.invoke('set-config', config),
  validateArticlesDir: (path: string) => ipcRenderer.invoke('validate-articles-dir', path),
  validateAstroBlog: (path: string) => ipcRenderer.invoke('validate-astro-blog', path),

  // Publish operations
  publishArticle: (article: any, config: any, onProgress?: any) =>
    ipcRenderer.invoke('publish-article', article, config, onProgress),

  // Process management
  startDevServer: (projectPath: string) => ipcRenderer.invoke('start-dev-server', projectPath),
  stopDevServer: () => ipcRenderer.invoke('stop-dev-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),

  // Server log events
  onServerLog: (callback: (data: { log: string; type: 'stdout' | 'stderr'; timestamp: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { log: string; type: 'stdout' | 'stderr'; timestamp: string }) => {
      callback(data)
    }
    ipcRenderer.on('server-log', listener)
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('server-log', listener)
    }
  },

  // 檔案監聽
  startFileWatching: (watchPath: string) => ipcRenderer.invoke('start-file-watching', watchPath),
  stopFileWatching: () => ipcRenderer.invoke('stop-file-watching'),
  isFileWatching: () => ipcRenderer.invoke('is-file-watching'),
  onFileChange: (callback: (data: { event: string; path: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { event: string; path: string }) => {
      callback(data)
    }
    ipcRenderer.on('file-change', listener)
    return () => {
      ipcRenderer.removeListener('file-change', listener)
    }
  },

  // Git operations
  gitStatus: (repoPath: string) => ipcRenderer.invoke('git-status', repoPath),
  gitAdd: (repoPath: string, paths?: string[]) => ipcRenderer.invoke('git-add', repoPath, paths),
  gitCommit: (repoPath: string, options: { message: string; addAll?: boolean }) =>
    ipcRenderer.invoke('git-commit', repoPath, options),
  gitPush: (repoPath: string, options?: { remote?: string; branch?: string }) =>
    ipcRenderer.invoke('git-push', repoPath, options),
  gitAddCommitPush: (repoPath: string, commitMessage: string) =>
    ipcRenderer.invoke('git-add-commit-push', repoPath, commitMessage),
  gitLog: (repoPath: string, count?: number) => ipcRenderer.invoke('git-log', repoPath, count),

  // Directory selection
  selectDirectory: (options?: { title?: string, defaultPath?: string }) =>
    ipcRenderer.invoke('select-directory', options)
})