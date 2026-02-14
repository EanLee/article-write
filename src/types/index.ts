// Enums - 集中定義所有列舉類型

/**
 * 文章狀態
 */
export enum ArticleStatus {
  Draft = 'draft',
  Published = 'published'
}

/**
 * 文章分類
 */
export enum ArticleCategory {
  Software = 'Software',
  Growth = 'growth',
  Management = 'management'
}

/**
 * 篩選器狀態選項（包含 "全部"）
 */
export enum ArticleFilterStatus {
  All = 'all',
  Draft = 'draft',
  Published = 'published'
}

/**
 * 篩選器分類選項（包含 "全部"）
 */
export enum ArticleFilterCategory {
  All = 'all',
  Software = 'Software',
  Growth = 'growth',
  Management = 'management'
}

/**
 * 編輯器主題
 */
export enum EditorTheme {
  Light = 'light',
  Dark = 'dark'
}

/**
 * 儲存狀態
 */
export enum SaveStatus {
  Saved = 'saved',
  Saving = 'saving',
  Modified = 'modified',
  Error = 'error'
}

/**
 * 視圖模式（編輯 vs 管理）
 */
export enum ViewMode {
  Editor = 'editor',
  Management = 'management'
}

/**
 * 側邊欄視圖類型（編輯模式下使用）
 */
export enum SidebarView {
  Articles = 'articles',
  Frontmatter = 'frontmatter'
}

// Core data structures
export interface Article {
  id: string
  title: string
  slug: string
  filePath: string
  status: ArticleStatus
  frontmatter: Frontmatter
  content: string
  lastModified: Date
  category: ArticleCategory
}

export interface Frontmatter {
  title: string
  description?: string
  /**
   * 公開/發佈時間。
   * ⚠️ 欄位名稱 `date` 沿用自現有部落格框架，無法更改。
   * 語意上代表「文章對外公開的時間」，非建立時間。
   * 發佈前可能為空；PublishService 同步時若為空則自動填入當下時間。
   */
  date?: string
  lastmod?: string
  status?: ArticleStatus     // 文章狀態，未設定預設為 draft
  tags?: string[]        // 改為可選，防止 undefined 導致崩潰
  categories?: string[]  // 改為可選，防止 undefined 導致崩潰
  slug?: string
  keywords?: string[]
  series?: string  // 系列名稱
  seriesOrder?: number  // 系列順序
}

export interface ConversionConfig {
  sourceDir: string
  targetDir: string
  imageSourceDir: string
  preserveStructure: boolean
}

// Configuration interfaces
export interface AppConfig {
  paths: {
    articlesDir: string
    targetBlog: string
    imagesDir: string
  }
  editorConfig: {
    autoSave: boolean
    autoSaveInterval: number
    theme: EditorTheme
  }
}

// Filter and UI state
export interface ArticleFilter {
  status: ArticleFilterStatus
  category: ArticleFilterCategory
  tags: string[]
  searchText: string
}

// File system types
export interface FileSystemItem {
  name: string
  path: string
  isDirectory: boolean
  lastModified?: Date
}

// Server status
export interface ServerStatus {
  running: boolean
  url?: string
  logs?: string[]
}

// Path validation
export interface PathValidationResult {
  valid: boolean
  message: string
}

// Save status
export interface SaveState {
  status: SaveStatus
  lastSavedAt: Date | null
  error: string | null
}