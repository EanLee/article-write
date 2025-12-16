/**
 * Electron API 類型定義
 */
export interface ElectronAPI {
  // 檔案操作
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  
  // 目錄操作
  readDirectory: (path: string) => Promise<string[]>
  createDirectory: (path: string) => Promise<void>
  getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: string } | null>
  
  // 設定操作
  getConfig: () => Promise<any>
  setConfig: (config: any) => Promise<void>
  validateObsidianVault: (path: string) => Promise<{ valid: boolean; message: string }>
  validateAstroBlog: (path: string) => Promise<{ valid: boolean; message: string }>
  
  // 程序管理
  startDevServer: (projectPath: string) => Promise<any>
  stopDevServer: () => Promise<void>
  getServerStatus: () => Promise<any>
  
  // 目錄選擇
  selectDirectory: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>
}

/**
 * Extended Electron API with additional methods
 */
export interface ExtendedElectronAPI extends ElectronAPI {
  getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: string } | null>
}

declare global {
  interface Window {
    electronAPI: ExtendedElectronAPI
  }
}