/**
 * Electron API 完整型別定義 ─ 唯一真相來源
 *
 * ⚠️ 規則：所有新增 IPC 方法必須同步更新此檔案。
 * env.d.ts 的 Window 宣告僅參照 ElectronAPI，勿在兩處維護相同清單。
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

// ─── 主要 API 介面 ───────────────────────────────────────────────────────────

/**
 * 透過 contextBridge 暴露給 Renderer process 的所有 Electron API。
 * 對應 src/main/preload.ts 的 contextBridge.exposeInMainWorld("electronAPI", ...) 物件結構。
 */
export interface ElectronAPI {
  // ── 檔案操作 ──────────────────────────────────────────────────────────────
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  writeFileBuffer: (path: string, buffer: Uint8Array) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>;

  // ── 目錄操作 ──────────────────────────────────────────────────────────────
  readDirectory: (path: string) => Promise<string[]>;
  createDirectory: (path: string) => Promise<void>;
  /**
   * @returns mtime 為 Unix 毫秒時間戳（number），由 FileService 的 stat().mtimeMs 提供
   */
  getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: number } | null>;

  // ── 設定操作 ──────────────────────────────────────────────────────────────
  getConfig: () => Promise<import("./index").AppConfig>;
  setConfig: (config: import("./index").AppConfig) => Promise<void>;
  validateArticlesDir: (path: string) => Promise<{ valid: boolean; message: string }>;
  validateAstroBlog: (path: string) => Promise<{ valid: boolean; warning?: boolean; message: string }>;

  // ── 目錄選擇 ──────────────────────────────────────────────────────────────
  selectDirectory: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>;

  // ── 發佈操作 ──────────────────────────────────────────────────────────────
  /** article 使用 Record<string, unknown>：Renderer 端無法直接引用 Article 型別 */
  publishArticle: (article: Record<string, unknown>, config: PublishConfig) => Promise<PublishResult>;
  onPublishProgress: (callback: (data: { step: string; progress: number }) => void) => () => void;
  syncAllPublished: (config: PublishConfig) => Promise<SyncResult>;
  onSyncProgress: (callback: (data: { current: number; total: number; title: string }) => void) => () => void;

  // ── Dev Server 管理 ────────────────────────────────────────────────────────
  startDevServer: (projectPath: string) => Promise<void>;
  stopDevServer: () => Promise<void>;
  getServerStatus: () => Promise<ServerStatusResult>;
  onServerLog: (callback: (data: ServerLogData) => void) => () => void;

  // ── 檔案監聽 ──────────────────────────────────────────────────────────────
  startFileWatching: (watchPath: string) => Promise<boolean>;
  stopFileWatching: () => Promise<boolean>;
  isFileWatching: () => Promise<boolean>;
  onFileChange: (callback: (data: FileChangeData) => void) => () => void;

  // ── Git 操作 ──────────────────────────────────────────────────────────────
  gitStatus: (repoPath: string) => Promise<GitResult>;
  gitAdd: (repoPath: string, paths?: string[]) => Promise<GitResult>;
  gitCommit: (repoPath: string, options: { message: string; addAll?: boolean }) => Promise<GitResult>;
  gitPush: (repoPath: string, options?: { remote?: string; branch?: string }) => Promise<GitResult>;
  gitAddCommitPush: (
    repoPath: string,
    commitMessage: string,
  ) => Promise<{ success: boolean; steps: { name: string; result: GitResult }[]; error?: string }>;
  gitLog: (repoPath: string, count?: number) => Promise<GitResult>;

  // ── Auto-Update ────────────────────────────────────────────────────────────
  onUpdateAvailable: (callback: (data: { version: string }) => void) => () => void;
  onUpdateDownloaded: (callback: (data: { version: string }) => void) => () => void;
  installUpdate: () => Promise<void>;

  // ── 搜尋 ──────────────────────────────────────────────────────────────────
  searchQuery: (query: import("./index").SearchQuery) => Promise<import("./index").SearchResult[]>;
  searchBuildIndex: (articlesDir: string) => Promise<number>;

  // ── AI ────────────────────────────────────────────────────────────────────
  aiGenerateSEO: (
    input: { title: string; contentPreview: string; existingSlug?: string },
    provider?: "claude" | "gemini" | "openai",
  ) => Promise<{
    success: boolean;
    data?: { slug: string; metaDescription: string; keywords: string[] };
    code?: string;
    message?: string;
  }>;
  aiSetApiKey: (provider: string, key: string) => Promise<void>;
  aiHasApiKey: (provider: string) => Promise<boolean>;
  aiGetActiveProvider: () => Promise<"claude" | "gemini" | "openai" | null>;
}

// ─── 全域 Window 型別擴增 ────────────────────────────────────────────────────

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
