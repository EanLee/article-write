/**
 * Electron API 完整型別定義 ─ 唯一真相來源
 *
 * ⚠️ 規則：所有新增 IPC 方法必須同步更新此檔案。
 * env.d.ts 的 Window 宣告僅參照 ElectronAPI，勿在兩處維護相同清單。
 *
 * 架構說明（SOLID6-08）：
 * ElectronAPI 由多個領域子介面組成，每個子介面只包含單一關注點。
 * 這樣元件可精準宣告自己依賴哪個子介面，而非對整個 ElectronAPI 產生耦合。
 */

// ─── 共用事件資料型別 ───────────────────────────────────────────────────────

/** 伺服器即時日誌事件 */
export interface ServerLogData {
  log: string;
  type: "stdout" | "stderr";
  timestamp: string;
}

/** 檔案系統變更事件 */
export interface FileChangeData {
  event: "add" | "change" | "unlink";
  path: string;
}

/** Dev Server 狀態快照 */
export interface ServerStatusResult {
  running: boolean;
  url?: string;
  logs: string[];
}

// ─── Git 操作結果型別 ────────────────────────────────────────────────────────

/** 對應 main/services/GitService.GitResult */
export interface GitResult {
  success: boolean;
  output: string;
  error?: string;
}

// ─── 發佈操作結果型別 ────────────────────────────────────────────────────────

/** 對應 main/services/PublishService.PublishResult */
export interface PublishResult {
  success: boolean;
  message: string;
  targetPath?: string;
  errors?: string[];
  warnings?: string[];
}

/** 對應 main/services/PublishService.PublishConfig */
export interface PublishConfig {
  articlesDir: string;
  targetBlogDir: string;
  imagesDir?: string;
}

/** 對應 main/services/PublishService.SyncResult */
export interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// ─── 領域子介面 ─────────────────────────────────────────────────────────────

/** 檔案 I/O 操作（讀取、寫入、刪除、複製） */
export interface IFileApi {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  writeFileBuffer: (path: string, buffer: Uint8Array) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>;
  readDirectory: (path: string) => Promise<string[]>;
  createDirectory: (path: string) => Promise<void>;
  /**
   * @returns mtime 為 Unix 毫秒時間戳（number），由 FileService 的 stat().mtimeMs 提供
   */
  getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: number } | null>;
  selectDirectory: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>;
}

/** 應用程式設定操作 */
export interface IConfigApi {
  getConfig: () => Promise<import("./index").AppConfig>;
  setConfig: (config: import("./index").AppConfig) => Promise<void>;
  validateArticlesDir: (path: string) => Promise<{ valid: boolean; message: string }>;
  validateAstroBlog: (path: string) => Promise<{ valid: boolean; warning?: boolean; message: string }>;
}

/** 文章發佈操作 */
export interface IPublishApi {
  /** article 使用 Record<string, unknown>：Renderer 端無法直接引用 Article 型別 */
  publishArticle: (article: Record<string, unknown>, config: PublishConfig) => Promise<PublishResult>;
  onPublishProgress: (callback: (data: { step: string; progress: number }) => void) => () => void;
  syncAllPublished: (config: PublishConfig) => Promise<SyncResult>;
  onSyncProgress: (callback: (data: { current: number; total: number; title: string }) => void) => () => void;
}

/** Astro Dev Server 管理 */
export interface IDevServerApi {
  startDevServer: (projectPath: string) => Promise<void>;
  stopDevServer: () => Promise<void>;
  getServerStatus: () => Promise<ServerStatusResult>;
  onServerLog: (callback: (data: ServerLogData) => void) => () => void;
}

/** 檔案系統監聽 */
export interface IFileWatchApi {
  startFileWatching: (watchPath: string) => Promise<boolean>;
  stopFileWatching: () => Promise<boolean>;
  isFileWatching: () => Promise<boolean>;
  onFileChange: (callback: (data: FileChangeData) => void) => () => void;
}

/** Git 版本控制操作 */
export interface IGitApi {
  gitStatus: (repoPath: string) => Promise<GitResult>;
  gitAdd: (repoPath: string, paths?: string[]) => Promise<GitResult>;
  gitCommit: (repoPath: string, options: { message: string; addAll?: boolean }) => Promise<GitResult>;
  gitPush: (repoPath: string, options?: { remote?: string; branch?: string }) => Promise<GitResult>;
  gitAddCommitPush: (repoPath: string, commitMessage: string) => Promise<{ success: boolean; steps: { name: string; result: GitResult }[]; error?: string }>;
  gitLog: (repoPath: string, count?: number) => Promise<GitResult>;
}

/** 應用程式自動更新 */
export interface IUpdaterApi {
  onUpdateAvailable: (callback: (data: { version: string }) => void) => () => void;
  onUpdateDownloaded: (callback: (data: { version: string }) => void) => () => void;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

/** 全文搜尋 */
export interface ISearchApi {
  searchQuery: (query: import("./index").SearchQuery) => Promise<import("./index").SearchResult[]>;
  searchBuildIndex: (articlesDir: string) => Promise<number>;
}

/** AI 輔助功能 */
export interface IAiApi {
  aiGenerateSEO: (
    input: { title: string; contentPreview: string; existingSlug?: string },
    provider?: "claude" | "gemini" | "openai",
  ) => Promise<{
    success: boolean;
    data?: { slug: string; metaDescription: string; keywords: string[] };
    code?: string;
    message?: string;
  }>;
  aiSetApiKey: (provider: string, key: string) => Promise<{ success: boolean; error?: string }>;
  aiHasApiKey: (provider: string) => Promise<boolean>;
  aiGetActiveProvider: () => Promise<"claude" | "gemini" | "openai" | null>;
}

// ─── 主要 API 介面 ───────────────────────────────────────────────────────────

/**
 * 透過 contextBridge 暴露給 Renderer process 的所有 Electron API。
 * 對應 src/main/preload.ts 的 contextBridge.exposeInMainWorld("electronAPI", ...) 物件結構。
 *
 * 由領域子介面組合而成，每個子介面可獨立用於精準型別約束。
 */
export interface ElectronAPI
  extends IFileApi,
    IConfigApi,
    IPublishApi,
    IDevServerApi,
    IFileWatchApi,
    IGitApi,
    IUpdaterApi,
    ISearchApi,
    IAiApi {}

// ─── 全域 Window 型別擴增 ────────────────────────────────────────────────────

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

