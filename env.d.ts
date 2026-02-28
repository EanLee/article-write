/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// ─── IPC 型態（與 main process 結構保持一致；因 env.d.ts 為 ambient 檔不可 import） ───

/** 對應 main/services/GitService.GitResult */
interface GitResult {
  success: boolean;
  output: string;
  error?: string;
}

/** 對應 main/services/PublishService.PublishResult */
interface PublishResult {
  success: boolean;
  message: string;
  targetPath?: string;
  errors?: string[];
  warnings?: string[];
}

/** 對應 main/services/PublishService.PublishConfig */
interface PublishConfig {
  articlesDir: string;
  targetBlogDir: string;
  imagesDir?: string;
}

/** 對應 main/services/PublishService.SyncResult */
interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

/** 對應 src/types/index.AppConfig（因 ambient 不可 import，此處 inline） */
interface AppConfigShape {
  paths: {
    articlesDir: string;
    targetBlog: string;
    imagesDir: string;
  };
  editorConfig: {
    autoSave: boolean;
    autoSaveInterval: number;
    theme: "light" | "dark";
  };
}

interface Window {
  electronAPI: {
    // File operations
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    deleteFile: (path: string) => Promise<void>;
    copyFile: (sourcePath: string, targetPath: string) => Promise<void>;

    // Directory operations
    readDirectory: (path: string) => Promise<string[]>;
    createDirectory: (path: string) => Promise<void>;
    getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: number } | null>;

    // Config operations
    getConfig: () => Promise<AppConfigShape>;
    setConfig: (config: AppConfigShape) => Promise<void>;
    validateArticlesDir: (path: string) => Promise<{ valid: boolean; message: string }>;
    validateAstroBlog: (path: string) => Promise<{ valid: boolean; message: string }>;

    // Directory selection
    selectDirectory: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>;

    // Publish operations
    // article 使用 Record<string, unknown>：無法在 ambient 檔引入 Article 型別
    publishArticle: (article: Record<string, unknown>, config: PublishConfig) => Promise<PublishResult>;
    onPublishProgress: (callback: (data: { step: string; progress: number }) => void) => () => void;
    syncAllPublished: (config: PublishConfig) => Promise<SyncResult>;
    onSyncProgress: (callback: (data: { current: number; total: number; title: string }) => void) => () => void;

    // Process management
    startDevServer: (projectPath: string) => Promise<void>;
    stopDevServer: () => Promise<void>;
    getServerStatus: () => Promise<{ running: boolean; url?: string; logs: string[] }>;
    onServerLog: (callback: (data: { log: string; type: "stdout" | "stderr"; timestamp: string }) => void) => () => void;

    // File watching
    startFileWatching: (watchPath: string) => Promise<boolean>;
    stopFileWatching: () => Promise<boolean>;
    isFileWatching: () => Promise<boolean>;
    onFileChange: (callback: (data: { event: string; path: string }) => void) => () => void;

    // Git operations
    gitStatus: (repoPath: string) => Promise<GitResult>;
    gitAdd: (repoPath: string, paths?: string[]) => Promise<GitResult>;
    gitCommit: (repoPath: string, options: { message: string; addAll?: boolean }) => Promise<GitResult>;
    gitPush: (repoPath: string, options?: { remote?: string; branch?: string }) => Promise<GitResult>;
    gitAddCommitPush: (repoPath: string, commitMessage: string) => Promise<{ success: boolean; steps: { name: string; result: GitResult }[]; error?: string }>;
    gitLog: (repoPath: string, count?: number) => Promise<GitResult>;
  };
}
