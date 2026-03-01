import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from './ipc-channels.js'

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke(IPC.READ_FILE, path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke(IPC.WRITE_FILE, path, content),
  deleteFile: (path: string) => ipcRenderer.invoke(IPC.DELETE_FILE, path),
  copyFile: (sourcePath: string, targetPath: string) => ipcRenderer.invoke(IPC.COPY_FILE, sourcePath, targetPath),

  // Directory operations
  readDirectory: (path: string) => ipcRenderer.invoke(IPC.READ_DIRECTORY, path),
  createDirectory: (path: string) => ipcRenderer.invoke(IPC.CREATE_DIRECTORY, path),
  getFileStats: (path: string) => ipcRenderer.invoke(IPC.GET_FILE_STATS, path),

  // Config operations
  getConfig: () => ipcRenderer.invoke(IPC.GET_CONFIG),
  setConfig: (config: any) => ipcRenderer.invoke(IPC.SET_CONFIG, config),
  validateArticlesDir: (path: string) => ipcRenderer.invoke(IPC.VALIDATE_ARTICLES_DIR, path),
  validateAstroBlog: (path: string) => ipcRenderer.invoke(IPC.VALIDATE_ASTRO_BLOG, path),

  // Publish operations
  publishArticle: (article: any, config: any, onProgress?: any) =>
    ipcRenderer.invoke(IPC.PUBLISH_ARTICLE, article, config, onProgress),
  syncAllPublished: (config: any) =>
    ipcRenderer.invoke(IPC.SYNC_ALL_PUBLISHED, config),
  onSyncProgress: (callback: (data: { current: number; total: number; title: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { current: number; total: number; title: string }) => {
      callback(data)
    }
    ipcRenderer.on(IPC.EVENT_SYNC_PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC.EVENT_SYNC_PROGRESS, listener)
    }
  },

  // Process management
  startDevServer: (projectPath: string) => ipcRenderer.invoke(IPC.START_DEV_SERVER, projectPath),
  stopDevServer: () => ipcRenderer.invoke(IPC.STOP_DEV_SERVER),
  getServerStatus: () => ipcRenderer.invoke(IPC.GET_SERVER_STATUS),

  // Server log events
  onServerLog: (callback: (data: { log: string; type: 'stdout' | 'stderr'; timestamp: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { log: string; type: 'stdout' | 'stderr'; timestamp: string }) => {
      callback(data)
    }
    ipcRenderer.on(IPC.EVENT_SERVER_LOG, listener)
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(IPC.EVENT_SERVER_LOG, listener)
    }
  },

  // 檔案監聽
  startFileWatching: (watchPath: string) => ipcRenderer.invoke(IPC.START_FILE_WATCHING, watchPath),
  stopFileWatching: () => ipcRenderer.invoke(IPC.STOP_FILE_WATCHING),
  isFileWatching: () => ipcRenderer.invoke(IPC.IS_FILE_WATCHING),
  onFileChange: (callback: (data: { event: string; path: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { event: string; path: string }) => {
      callback(data)
    }
    ipcRenderer.on(IPC.EVENT_FILE_CHANGE, listener)
    return () => {
      ipcRenderer.removeListener(IPC.EVENT_FILE_CHANGE, listener)
    }
  },

  // Git operations
  gitStatus: (repoPath: string) => ipcRenderer.invoke(IPC.GIT_STATUS, repoPath),
  gitAdd: (repoPath: string, paths?: string[]) => ipcRenderer.invoke(IPC.GIT_ADD, repoPath, paths),
  gitCommit: (repoPath: string, options: { message: string; addAll?: boolean }) =>
    ipcRenderer.invoke(IPC.GIT_COMMIT, repoPath, options),
  gitPush: (repoPath: string, options?: { remote?: string; branch?: string }) =>
    ipcRenderer.invoke(IPC.GIT_PUSH, repoPath, options),
  gitAddCommitPush: (repoPath: string, commitMessage: string) =>
    ipcRenderer.invoke(IPC.GIT_ADD_COMMIT_PUSH, repoPath, commitMessage),
  gitLog: (repoPath: string, count?: number) => ipcRenderer.invoke(IPC.GIT_LOG, repoPath, count),

  // Directory selection
  selectDirectory: (options?: { title?: string, defaultPath?: string }) =>
    ipcRenderer.invoke(IPC.SELECT_DIRECTORY, options),

  // Auto-Update
  onUpdateAvailable: (callback: (data: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { version: string }) => callback(data)
    ipcRenderer.on(IPC.EVENT_UPDATE_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(IPC.EVENT_UPDATE_AVAILABLE, listener)
  },
  onUpdateDownloaded: (callback: (data: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { version: string }) => callback(data)
    ipcRenderer.on(IPC.EVENT_UPDATE_DOWNLOADED, listener)
    return () => ipcRenderer.removeListener(IPC.EVENT_UPDATE_DOWNLOADED, listener)
  },
  installUpdate: () => ipcRenderer.invoke(IPC.INSTALL_UPDATE),

  // Search
  searchQuery: (query: { query: string; filters?: { category?: string; status?: string; tags?: string[] } }) =>
    ipcRenderer.invoke(IPC.SEARCH_QUERY, query),
  searchBuildIndex: (articlesDir: string) =>
    ipcRenderer.invoke(IPC.SEARCH_BUILD_INDEX, articlesDir),

  // AI
  aiGenerateSEO: (input: { title: string; contentPreview: string; existingSlug?: string }, provider?: 'claude' | 'gemini' | 'openai') =>
    ipcRenderer.invoke(IPC.AI_GENERATE_SEO, input, provider),
  aiSetApiKey: (provider: string, key: string) =>
    ipcRenderer.invoke(IPC.AI_SET_API_KEY, provider, key),
  aiHasApiKey: (provider: string) =>
    ipcRenderer.invoke(IPC.AI_GET_HAS_API_KEY, provider),
  aiGetActiveProvider: () =>
    ipcRenderer.invoke(IPC.AI_GET_ACTIVE_PROVIDER)
})