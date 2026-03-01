/**
 * 伺服器日誌資料
 */
export interface ServerLogData {
  log: string
  type: "stdout" | "stderr"
  timestamp: string
}

/**
 * 檔案變更事件資料
 */
export interface FileChangeData {
  event: "add" | "change" | "unlink"
  path: string
}

/**
 * 伺服器狀態
 */
export interface ServerStatusResult {
  running: boolean
  url?: string
  logs: string[]
}

/**
 * Electron API 類型定義
 */
export interface ElectronAPI {
  // 檔案操作
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  writeFileBuffer: (path: string, buffer: Uint8Array) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>

  // 目錄操作
  readDirectory: (path: string) => Promise<string[]>
  createDirectory: (path: string) => Promise<void>
  getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: string } | null>

  // 設定操作
  getConfig: () => Promise<any>
  setConfig: (config: any) => Promise<void>
  validateArticlesDir: (path: string) => Promise<{ valid: boolean; message: string }>
  validateAstroBlog: (path: string) => Promise<{ valid: boolean; warning?: boolean; message: string }>

  // 程序管理
  startDevServer: (projectPath: string) => Promise<void>
  stopDevServer: () => Promise<void>
  getServerStatus: () => Promise<ServerStatusResult>

  // 伺服器日誌事件
  onServerLog: (callback: (data: ServerLogData) => void) => () => void

  // 檔案監聽
  startFileWatching: (watchPath: string) => Promise<boolean>
  stopFileWatching: () => Promise<boolean>
  isFileWatching: () => Promise<boolean>
  onFileChange: (callback: (data: FileChangeData) => void) => () => void

  // 目錄選擇
  selectDirectory: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>

  // Auto-Update
  onUpdateAvailable: (callback: (data: { version: string }) => void) => () => void
  onUpdateDownloaded: (callback: (data: { version: string }) => void) => () => void
  installUpdate: () => Promise<void>

  // Search
  searchQuery: (query: import("./index").SearchQuery) => Promise<import("./index").SearchResult[]>
  searchBuildIndex: (articlesDir: string) => Promise<number>

  // AI
  aiGenerateSEO: (input: { title: string; contentPreview: string; existingSlug?: string }, provider?: "claude" | "gemini" | "openai") => Promise<{
    success: boolean
    data?: { slug: string; metaDescription: string; keywords: string[] }
    code?: string
    message?: string
  }>
  aiSetApiKey: (provider: string, key: string) => Promise<void>
  aiHasApiKey: (provider: string) => Promise<boolean>
  aiGetActiveProvider: () => Promise<"claude" | "gemini" | "openai" | null>
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