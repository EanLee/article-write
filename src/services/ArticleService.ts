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
import { MarkdownService } from './MarkdownService'
import { BackupService } from './BackupService'

export class ArticleService {
  private markdownService: MarkdownService
  private backupService: BackupService

  constructor() {
    this.markdownService = new MarkdownService()
    this.backupService = BackupService.getInstance()
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
