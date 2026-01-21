// Core data structures
export interface Article {
  id: string
  title: string
  slug: string
  filePath: string
  status: 'draft' | 'published'
  frontmatter: Frontmatter
  content: string
  lastModified: Date
  category: 'Software' | 'growth' | 'management'
}

export interface Frontmatter {
  title: string
  description?: string
  date: string
  lastmod?: string
  tags: string[]
  categories: string[]
  slug?: string
  keywords?: string[]
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
    obsidianVault: string
    targetBlog: string
    imagesDir: string
  }
  editorConfig: {
    autoSave: boolean
    autoSaveInterval: number
    theme: 'light' | 'dark'
  }
}

// Filter and UI state
export interface ArticleFilter {
  status: 'all' | 'draft' | 'published'
  category: 'all' | 'Software' | 'growth' | 'management'
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
export type SaveStatus = 'saved' | 'saving' | 'modified' | 'error'

export interface SaveState {
  status: SaveStatus
  lastSavedAt: Date | null
  error: string | null
}