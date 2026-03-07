// Enums - 集中定義所有列舉類型

/**
 * 文章狀態
 */
export enum ArticleStatus {
  Draft = "draft",
  Published = "published",
}

/**
 * 內建分類常數（供參考，不作為型別限制）
 */
export const ArticleCategory = {
  Software: "Software",
  Growth: "growth",
  Management: "management",
} as const;

/**
 * 篩選器狀態選項（包含 "全部"）
 */
export enum ArticleFilterStatus {
  All = "all",
  Draft = "draft",
  Published = "published",
}

/**
 * 篩選器分類選項（包含 "全部"）
 */
export enum ArticleFilterCategory {
  All = "all",
  Software = "Software",
  Growth = "growth",
  Management = "management",
}

/**
 * 編輯器主題
 * 使用字面型別聯集（非 enum），確保與 Zod schema z.enum(["light","dark"]) 推論型別相容
 * 修正 A4-01：AppConfig 雙重定義造成 TypeScript 錯誤
 */
export type EditorTheme = "light" | "dark";

/**
 * 儲存狀態
 */
export enum SaveStatus {
  Saved = "saved",
  Saving = "saving",
  Modified = "modified",
  Error = "error",
}

/**
 * 視圖模式（編輯 vs 管理）
 */
export enum ViewMode {
  Editor = "editor",
  Management = "management",
}

/**
 * 側邊欄視圖類型（編輯模式下使用）
 */
export enum SidebarView {
  Articles = "articles",
  Frontmatter = "frontmatter",
}

// Core data structures
export interface Article {
  id: string;
  title: string;
  slug: string;
  filePath: string;
  status: ArticleStatus;
  frontmatter: Frontmatter;
  content: string;
  lastModified: Date;
  category: string;
}

export interface Frontmatter {
  title?: string; // 草稿可能尚未填寫標題
  description?: string;
  /**
   * 舊版 YAML date 欄位（ISO 8601 字串）。
   * ⚠️ 已棄用：新文章應使用 `created` 與 `pubDate`。
   * WriteFlow 在 `migrateArticleFrontmatter()` 中會將此欄位遷移至 `created` / `pubDate`，
   * 遷移完成後即刪除此欄位。保留此型別宣告是為了讓舊有 YAML 能正確解析。
   * @deprecated 使用 `pubDate` 代替
   */
  date?: string;
  /**
   * 建立時間。
   * WriteFlow 首次開啟文章時自動填入：
   * - 若原有 `date` 欄位有值 → 沿用 `date` 的值（date 是最接近建立時間的資訊）
   * - 若無任何時間資訊 → 填入當下時間
   */
  created?: string;
  /**
   * 公開/發佈時間。
   * ⚠️ 欄位名稱 `pubDate` 符合 Astro 等部落格框架慣例（圓桌 #007）。
   * 發佈前可能為空；PublishService 同步時若為空則自動填入當日日期。
   */
  pubDate?: string;
  lastmod?: string;
  /**
   * 草稿旗標（Astro / Hugo 等框架慣例）。
   * true = 建置時不公開；false 或未設定 = 正常發佈。
   * WriteFlow 使用 `status` 管理狀態，此欄位保留供靜態框架讀取。
   */
  draft?: boolean;
  status?: ArticleStatus; // 文章狀態，未設定預設為 draft
  tags?: string[]; // 改為可選，防止 undefined 導致崩潰
  categories?: string[]; // 改為可選，防止 undefined 導致崩潰
  slug?: string;
  keywords?: string[];
  series?: string; // 系列名稱
  seriesOrder?: number; // 系列順序
}

export interface ConversionConfig {
  sourceDir: string;
  targetDir: string;
  imageSourceDir: string;
  preserveStructure: boolean;
}

// Configuration interfaces

/** 文章/部落格路徑設定（AppConfig 的子型別，集中管理，避免各元件個別宣告） */
export interface AppConfigPaths {
  articlesDir: string;
  targetDir: string;
  imagesDir: string;
}

/** 編輯器設定（AppConfig 的子型別） */
export interface AppEditorConfig {
  autoSave: boolean;
  autoSaveInterval: number;
  theme: EditorTheme;
}

export interface AppConfig {
  paths: AppConfigPaths;
  editorConfig: AppEditorConfig;
}

/**
 * 建立預設 AppConfig 物件（factory，每次回傳新實例避免 reactive 共用參照）
 * 所有元件/store 的初始值、resetToDefaults 應統一使用此函式
 */
export function createDefaultAppConfig(): AppConfig {
  return {
    paths: { articlesDir: "", targetDir: "", imagesDir: "" },
    editorConfig: { autoSave: true, autoSaveInterval: 30000, theme: "light" },
  };
}

// Filter and UI state
export interface ArticleFilter {
  status: ArticleFilterStatus;
  category: ArticleFilterCategory;
  tags: string[];
  searchText: string;
}

// File system types
export interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
  lastModified?: Date;
}

// Server status
export interface ServerStatus {
  running: boolean;
  url?: string;
  logs?: string[];
}

// Path validation
export interface PathValidationResult {
  valid: boolean;
  message: string;
}

// Save status
export interface SaveState {
  status: SaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
}

// ===== Domain type re-exports（讓消費者可從單一入口 import）=====
export type { PublishConfig, PublishResult, PublishProgressCallback, SyncResult } from "./publish.js";
export type { GitResult, GitCommitOptions, GitPushOptions } from "./git.js";

// ===== Search =====

export interface SearchQuery {
  query: string;
  filters?: {
    category?: string;
    status?: ArticleStatus;
    tags?: string[];
  };
}

export interface SearchResult {
  id: string;
  filePath: string;
  title: string;
  matchSnippet: string; // 第一個命中片段，含前後文（約 100 字）
  updatedAt: string; // ISO 8601，排序依據
  category: string;
  status: ArticleStatus;
}
