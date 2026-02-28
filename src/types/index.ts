// Enums - 集中定義所有列舉類型

/**
 * 文章狀態
 */
export enum ArticleStatus {
  Draft = "draft",
  Published = "published",
}

/**
 * 文章分類
 */
export enum ArticleCategory {
  Software = "Software",
  Growth = "growth",
  Management = "management",
}

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
 */
export enum EditorTheme {
  Light = "light",
  Dark = "dark",
}

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
  category: ArticleCategory;
}

export interface Frontmatter {
  title?: string; // 草稿可能尚未填寫標題
  description?: string;
  /**
   * @deprecated 舊有欄位，已由 `pubDate`（發佈時間）和 `created`（建立時間）取代。
   * 保留此欄位僅供讀取磁碟上的舊文件進行遷移（migrateArticleFrontmatter）。
   * 新建文章請勿使用此欄位。
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
export interface AppConfig {
  paths: {
    articlesDir: string;
    targetBlog: string;
    imagesDir: string;
  };
  editorConfig: {
    autoSave: boolean;
    autoSaveInterval: number;
    // 實際儲存在磁碟的字串值；EditorTheme enum 成員值與此相同（Light='light', Dark='dark'）
    theme: "light" | "dark";
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
