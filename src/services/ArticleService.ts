/**
 * ArticleService - 集中管理所有文章相關的商業邏輯和檔案操作
 *
 * 職責：
 * - 文章的 CRUD 操作
 * - 檔案的讀取/寫入
 * - Frontmatter 解析與組合
 * - 備份與衝突檢測
 * - 所有檔案操作的單一入口
 *
 * 原則：
 * - 所有檔案操作必須經過此 service
 * - Store 只負責狀態管理，不直接操作檔案
 * - Vue 組件只調用此 service，不直接操作檔案或解析資料
 */

import type { Article, Frontmatter } from '@/types'
import { ArticleStatus, ArticleCategory } from '@/types'
import { MarkdownService } from './MarkdownService'
import { backupService } from './BackupService'
import type { BackupService } from './BackupService'

export class ArticleService {
  private markdownService: MarkdownService
  private backupService: BackupService

  constructor() {
    this.markdownService = new MarkdownService()
    this.backupService = backupService
  }

  /**
   * 讀取文章內容（從磁碟）
   * @param filePath - 檔案路徑
   * @returns 解析後的文章資料
   */
  async readArticle(filePath: string): Promise<{ frontmatter: Partial<Frontmatter>; content: string }> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const rawContent = await window.electronAPI.readFile(filePath)
    const parsed = this.markdownService.parseFrontmatter(rawContent)

    return {
      frontmatter: parsed.frontmatter,
      content: parsed.body
    }
  }

  /**
   * 儲存文章（寫入磁碟）
   *
   * ⚠️ 重要：這是唯一應該寫入文章檔案的方法
   *
   * @param article - 要儲存的文章
   * @param options - 儲存選項
   * @returns 儲存結果
   */
  async saveArticle(
    article: Article,
    options: {
      skipConflictCheck?: boolean
      skipBackup?: boolean
    } = {}
  ): Promise<{ success: boolean; conflict?: boolean; error?: Error }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }

      // 1. 衝突檢測（除非跳過）
      if (!options.skipConflictCheck) {
        const conflictResult = await this.backupService.detectConflict(article)
        if (conflictResult.hasConflict) {
          return {
            success: false,
            conflict: true
          }
        }
      }

      // 2. 建立備份（除非跳過）
      if (!options.skipBackup) {
        await this.backupService.createBackup(article)
      }

      // 3. 組合 markdown 內容
      const markdownContent = this.markdownService.combineContent(
        article.frontmatter,
        article.content
      )

      // 4. 寫入檔案（這是唯一的寫入點）
      await window.electronAPI.writeFile(article.filePath, markdownContent)

      return { success: true }
    } catch (error) {
      console.error('[ArticleService] Failed to save article:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      }
    }
  }

  /**
   * 更新文章內容（僅記憶體中）
   *
   * ⚠️ 注意：這個方法不會寫入檔案，只是更新資料
   * 需要明確調用 saveArticle() 才會寫入
   *
   * @param article - 原始文章
   * @param updates - 要更新的欄位
   * @returns 更新後的文章
   */
  updateArticleData(
    article: Article,
    updates: {
      content?: string
      frontmatter?: Partial<Frontmatter>
    }
  ): Article {
    return {
      ...article,
      content: updates.content ?? article.content,
      frontmatter: {
        ...article.frontmatter,
        ...updates.frontmatter
      },
      lastModified: new Date()
    }
  }

  /**
   * 從 Raw 模式的內容解析出 frontmatter 和 content
   *
   * @param rawContent - 完整的 markdown 內容（包含 frontmatter）
   * @returns 解析後的資料
   */
  parseRawContent(rawContent: string): {
    frontmatter: Partial<Frontmatter>
    content: string
    hasValidFrontmatter: boolean
    errors: string[]
  } {
    const parsed = this.markdownService.parseFrontmatter(rawContent)
    return {
      frontmatter: parsed.frontmatter,
      content: parsed.body,
      hasValidFrontmatter: parsed.hasValidFrontmatter || false,
      errors: parsed.errors || []
    }
  }

  /**
   * 組合 frontmatter 和 content 成 Raw 模式的完整內容
   *
   * @param frontmatter - frontmatter 資料
   * @param content - markdown 內容
   * @returns 完整的 markdown 字串
   */
  combineToRawContent(frontmatter: Partial<Frontmatter>, content: string): string {
    return this.markdownService.combineContent(frontmatter, content)
  }

  /**
   * 載入所有文章（從磁碟掃描）
   * 
   * @param vaultPath - Obsidian vault 根目錄路徑
   * @returns 載入的所有文章
   */
  async loadAllArticles(vaultPath: string): Promise<Article[]> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const loadedArticles: Article[] = []
    
    // 掃描 Drafts 和 Publish 兩個資料夾
    const folders = [
      { path: `${vaultPath}/Drafts`, status: ArticleStatus.Draft },
      { path: `${vaultPath}/Publish`, status: ArticleStatus.Published }
    ]
    
    for (const folder of folders) {
      try {
        // 檢查資料夾是否存在
        const stats = await window.electronAPI.getFileStats(folder.path)
        if (!stats?.isDirectory) {
          continue
        }
        
        // 讀取分類資料夾 (Software, growth, management)
        const categories = await window.electronAPI.readDirectory(folder.path)
        
        for (const category of categories) {
          const categoryPath = `${folder.path}/${category}`
          const catStats = await window.electronAPI.getFileStats(categoryPath)
          if (!catStats?.isDirectory) {
            continue
          }
          
          // 讀取分類下的 markdown 檔案
          const files = await window.electronAPI.readDirectory(categoryPath)
          const mdFiles = files.filter(f => f.endsWith('.md'))
          
          for (const file of mdFiles) {
            const filePath = `${categoryPath}/${file}`
            try {
              const article = await this.loadArticle(filePath, folder.status, category as ArticleCategory)
              loadedArticles.push(article)
            } catch (err) {
              console.warn(`Failed to load article ${filePath}:`, err)
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to scan ${folder.path}:`, err)
      }
    }
    
    return loadedArticles
  }

  /**
   * 載入單一文章（從磁碟）
   * 
   * @param filePath - 檔案路徑
   * @param status - 文章狀態 (draft/published)
   * @param categoryFolder - 分類資料夾名稱
   * @returns 載入的文章
   */
  async loadArticle(
    filePath: string,
    status: ArticleStatus,
    categoryFolder: ArticleCategory
  ): Promise<Article> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    // 讀取檔案內容
    const content = await window.electronAPI.readFile(filePath)
    const { frontmatter, content: articleContent } = this.markdownService.parseMarkdown(content)
    
    // 取得檔案的最後修改時間
    const fileStats = await window.electronAPI.getFileStats(filePath)
    const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date()
    
    // 決定文章分類：優先從 frontmatter.categories 取得，其次使用資料夾名稱
    let articleCategory: ArticleCategory
    if (frontmatter.categories && frontmatter.categories.length > 0) {
      // 從 frontmatter.categories 陣列取第一個有效值
      const firstCategory = frontmatter.categories[0]
      if (Object.values(ArticleCategory).includes(firstCategory as ArticleCategory)) {
        articleCategory = firstCategory as ArticleCategory
      } else {
        // 如果 categories 值不在 enum 中，使用資料夾名稱或預設值
        articleCategory = (Object.values(ArticleCategory).includes(categoryFolder as ArticleCategory) 
          ? categoryFolder 
          : ArticleCategory.Software) as ArticleCategory
      }
    } else {
      // 沒有 frontmatter.categories，使用資料夾名稱或預設值
      articleCategory = (Object.values(ArticleCategory).includes(categoryFolder as ArticleCategory) 
        ? categoryFolder 
        : ArticleCategory.Software) as ArticleCategory
    }
    
    // 從檔案路徑取得檔案名稱（不含副檔名）
    const fileName = filePath.split('/').pop()?.replace('.md', '') || 'untitled'
    
    const article: Article = {
      id: this.generateId(),
      title: frontmatter.title || fileName,
      slug: frontmatter.slug || fileName,
      filePath,
      status,
      category: articleCategory,
      lastModified,
      content: articleContent,
      frontmatter
    }
    
    return article
  }

  /**
   * 刪除文章
   *
   * @param article - 要刪除的文章
   */
  async deleteArticle(article: Article): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    // 刪除前先備份
    await this.backupService.createBackup(article)

    // 刪除檔案
    await window.electronAPI.deleteFile(article.filePath)
  }

  /**
   * 移動文章（例如從草稿到已發布）
   *
   * @param article - 要移動的文章
   * @param newFilePath - 新的檔案路徑
   */
  async moveArticle(article: Article, newFilePath: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    // 讀取原始內容
    const content = await window.electronAPI.readFile(article.filePath)

    // 寫入新位置
    await window.electronAPI.writeFile(newFilePath, content)

    // 刪除舊檔案
    await window.electronAPI.deleteFile(article.filePath)
  }

  /**
   * 產生唯一 ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  /**
   * 從標題產生 slug
   * 
   * @param title - 文章標題
   * @returns URL-safe 的 slug
   */
  /**
   * 從標題產生 slug
   * 
   * @param title - 文章標題
   * @returns URL-safe 的 slug
   */
  generateSlug(title: string): string {
    return title
      .trim()  // 先 trim 前後空格
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')  // 移除前後的 -
  }

  /**
   * 驗證文章資料是否有效
   *
   * @param article - 要驗證的文章
   * @returns 驗證結果
   */
  validateArticle(article: Article): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!article.title || article.title.trim() === '') {
      errors.push('標題不能為空')
    }

    if (!article.filePath || article.filePath.trim() === '') {
      errors.push('檔案路徑不能為空')
    }

    if (!article.frontmatter) {
      errors.push('缺少 frontmatter')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// 單例模式
let articleServiceInstance: ArticleService | null = null

export function getArticleService(): ArticleService {
  if (!articleServiceInstance) {
    articleServiceInstance = new ArticleService()
  }
  return articleServiceInstance
}

// 導出單例實例（與其他服務保持一致）
export const articleService = getArticleService()
