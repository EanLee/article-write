import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
  
  // Directory operations
  readDirectory: (path: string) => ipcRenderer.invoke('read-directory', path),
  createDirectory: (path: string) => ipcRenderer.invoke('create-directory', path),
  getFileStats: (path: string) => ipcRenderer.invoke('get-file-stats', path),
  
  // Config operations
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config: any) => ipcRenderer.invoke('set-config', config),
  validateObsidianVault: (path: string) => ipcRenderer.invoke('validate-obsidian-vault', path),
  validateAstroBlog: (path: string) => ipcRenderer.invoke('validate-astro-blog', path),
  
  // Process management
  startDevServer: (projectPath: string) => ipcRenderer.invoke('start-dev-server', projectPath),
  stopDevServer: () => ipcRenderer.invoke('stop-dev-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // Directory selection
  selectDirectory: (options?: { title?: string, defaultPath?: string }) => 
    ipcRenderer.invoke('select-directory', options)
})