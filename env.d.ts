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

// ─── Window.electronAPI 全域型別宣告 ─────────────────────────────────────────
// 完整型別定義請見 src/types/electron.d.ts（唯一真相來源）。
// 以下只保留給 env.d.ts 自身（ambient 環境）使用的輔助介面；
// Window.electronAPI 已由 electron.d.ts 的 declare global 覆蓋，此處無需重複宣告。

