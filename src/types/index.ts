// Enums - 集中定義所有列舉類型

/**
 * 文章狀態
 */
export enum ArticleStatus {
  Draft = "draft",
  Published = "published",
}

/**
 * 文章分類（向後相容常數，實際值為 string）
 * @deprecated 分類改由 frontmatter.category 自由定義，此常數僅作為參考預設值
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
 * 實際分類清單由文章的 frontmatter.category 動態決定
 */
export enum ArticleFilterCategory {
  All = "all",
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
  /** 文章分類，來自 frontmatter.category（任意字串） */
  category: string;
}

export interface Frontmatter {
  title?: string; // 草稿可能尚未填寫標題
  description?: string;
  /**
   * 建立 / 編輯時間（磁碟存放欄位）。
   * 新文章建立時寫入此欄位；首次在 WriteFlow 開啟時，
   * `migrateArticleFrontmatter` 會讀取此值並分拆至 `created`（建立時間）與 `pubDate`（發布時間），
   * 之後從 frontmatter 中刪除此欄位。
   * 因此：讀磁碟舊文件時可能存在，新建文章寫入時仍使用此欄位。
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
  /** 文章分類（單一字串，由使用者自由定義；取代 folder-based 分類） */
  category?: string;
  slug?: string;
  keywords?: string[];
  draft?: boolean; // Astro/Hugo frontmatter 發布標記
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
  /** 分類篩選器；ArticleFilterCategory.All ("all") 表示顯示全部 */
  category: string;
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
