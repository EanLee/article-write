import type { Article } from '@/types'
import { FileScannerService } from './FileScannerService'
import { MarkdownService } from './MarkdownService'

/**
 * 檔案服務類別
 * 提供檔案系統操作和文章管理功能
 */
export class FileService {
  private scannerService: FileScannerService
  private markdownService: MarkdownService

  /**
   * 建構子 - 初始化 FileService
   */
  constructor() {
    this.scannerService = new FileScannerService()
    this.markdownService = new MarkdownService()
  }

  /**
   * 讀取檔案內容
   * @param {string} path - 檔案路徑
   * @returns {Promise<string>} 檔案內容
   */
  async readFile(path: string): Promise<string> {
    return await window.electronAPI.readFile(path)
  }

  /**
   * 寫入檔案內容
   * @param {string} path - 檔案路徑
   * @param {string} content - 檔案內容
   */
  async writeFile(path: string, content: string): Promise<void> {
    await window.electronAPI.writeFile(path, content)
  }

  /**
   * 刪除檔案
   * @param {string} path - 檔案路徑
   */
  async deleteFile(path: string): Promise<void> {
    await window.electronAPI.deleteFile(path)
  }

  /**
   * 讀取目錄內容
   * @param {string} path - 目錄路徑
   * @returns {Promise<string[]>} 目錄內容陣列
   */
  async readDirectory(path: string): Promise<string[]> {
    return await window.electronAPI.readDirectory(path)
  }

  /**
   * 建立目錄
   * @param {string} path - 目錄路徑
   */
  async createDirectory(path: string): Promise<void> {
    await window.electronAPI.createDirectory(path)
  }

  /**
   * 掃描 Obsidian vault 中的所有文章
   * @param {string} vaultPath - Vault 路徑
   * @returns {Promise<Article[]>} 文章陣列
   */
  async scanArticles(vaultPath: string): Promise<Article[]> {
    try {
      const articles: Article[] = []
      
      // Scan drafts folder
      const draftsPath = this.joinPath(vaultPath, 'draft')
      const draftArticles = await this.scannerService.scanMarkdownFiles(draftsPath, 'draft')
      articles.push(...draftArticles)
      
      // Scan published folder
      const publishPath = this.joinPath(vaultPath, 'publish')
      const publishedArticles = await this.scannerService.scanMarkdownFiles(publishPath, 'published')
      articles.push(...publishedArticles)
      
      return articles
    } catch (error) {
      console.error('Failed to scan articles:', error)
      return []
    }
  }

  /**
   * 掃描 Images 資料夾中的所有圖片檔案
   * @param {string} vaultPath - Vault 路徑
   * @returns {Promise<string[]>} 圖片檔案名稱陣列
   */
  async scanImageFiles(vaultPath: string): Promise<string[]> {
    try {
      const imagesPath = this.joinPath(vaultPath, 'images')
      const files = await this.readDirectory(imagesPath)
      
      // 過濾出圖片檔案
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']
      const imageFiles = files.filter(file => {
        const ext = this.getExtname(file).toLowerCase()
        return imageExtensions.includes(ext)
      })
      
      return imageFiles
    } catch (error) {
      console.error('Failed to scan image files:', error)
      return []
    }
  }

  /**
   * 儲存文章到檔案系統
   * @param {Article} article - 要儲存的文章
   */
  async saveArticle(article: Article): Promise<void> {
    try {
      const content = this.markdownService.combineContent(article.frontmatter, article.content)
      await this.writeFile(article.filePath, content)
    } catch (error) {
      console.error('Failed to save article:', error)
      throw new Error(`Failed to save article: ${article.title}`)
    }
  }

  /**
   * 從檔案路徑載入單一文章
   * @param {string} filePath - 檔案路徑
   * @returns {Promise<Article | null>} 文章物件或 null
   */
  async loadArticle(filePath: string): Promise<Article | null> {
    try {
      // Determine status from file path
      const status = filePath.includes('/draft/') ? 'draft' : 'published'
      return await this.scannerService.parseMarkdownFile(filePath, status)
    } catch (error) {
      console.error('Failed to load article:', error)
      return null
    }
  }

  /**
   * 建立新的文章檔案
   * @param {Article} article - 文章物件
   * @param {string} vaultPath - Vault 路徑
   * @returns {Promise<string>} 建立的檔案路徑
   */
  async createArticle(article: Article, vaultPath: string): Promise<string> {
    try {
      // Determine the target directory based on status and category
      const statusFolder = article.status === 'draft' ? 'draft' : 'publish'
      const targetDir = this.joinPath(vaultPath, statusFolder, article.category)
      
      // Ensure directory exists
      await this.createDirectory(targetDir)
      
      // Generate file path
      const fileName = `${article.slug}.md`
      const filePath = this.joinPath(targetDir, fileName)
      
      // Check if file already exists and generate unique name if needed
      const uniqueFilePath = await this.generateUniqueFilePath(filePath)
      
      // Create the content
      const content = this.markdownService.combineContent(article.frontmatter, article.content)
      
      // Write the file
      await this.writeFile(uniqueFilePath, content)
      
      return uniqueFilePath
    } catch (error) {
      console.error('Failed to create article:', error)
      throw new Error(`Failed to create article: ${article.title}`)
    }
  }

  /**
   * 移動文章從草稿到已發布或反之
   * @param {Article} article - 文章物件
   * @param {'draft' | 'published'} newStatus - 新狀態
   * @param {string} vaultPath - Vault 路徑
   * @returns {Promise<string>} 新的檔案路徑
   */
  async moveArticle(article: Article, newStatus: 'draft' | 'published', vaultPath: string): Promise<string> {
    try {
      // Delete the old file
      await this.deleteFile(article.filePath)
      
      // Create the article in the new location
      const updatedArticle = { ...article, status: newStatus }
      const newFilePath = await this.createArticle(updatedArticle, vaultPath)
      
      return newFilePath
    } catch (error) {
      console.error('Failed to move article:', error)
      throw new Error(`Failed to move article: ${article.title}`)
    }
  }

  /**
   * 刪除文章檔案
   * @param {Article} article - 要刪除的文章
   */
  async deleteArticle(article: Article): Promise<void> {
    try {
      await this.deleteFile(article.filePath)
    } catch {
      throw new Error(`Failed to delete article: ${article.title}`)
    }
  }

  /**
   * 如果目標檔案已存在，產生唯一的檔案路徑
   * @param {string} basePath - 基礎路徑
   * @returns {Promise<string>} 唯一的檔案路徑
   */
  private async generateUniqueFilePath(basePath: string): Promise<string> {
    let counter = 1
    let filePath = basePath
    
    while (await this.fileExists(filePath)) {
      const ext = this.getExtname(basePath)
      const nameWithoutExt = this.getBasename(basePath, ext)
      const dir = this.getDirname(basePath)
      filePath = this.joinPath(dir, `${nameWithoutExt}-${counter}${ext}`)
      counter++
    }
    
    return filePath
  }

  /**
   * 檢查檔案是否存在
   * @param {string} filePath - 檔案路徑
   * @returns {Promise<boolean>} 檔案是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await window.electronAPI.getFileStats(filePath)
      return stats !== null
    } catch {
      return false
    }
  }

  /**
   * 開始監控檔案變更
   * @param {string} vaultPath - Vault 路徑
   * @param {Function} callback - 檔案變更回調函數
   */
  startWatching(vaultPath: string, callback: (filePath: string, event: 'add' | 'change' | 'unlink') => void): void {
    this.scannerService.startWatching(vaultPath, callback)
  }

  /**
   * 停止監控檔案變更
   * @param {string} vaultPath - Vault 路徑
   */
  stopWatching(vaultPath: string): void {
    this.scannerService.stopWatching(vaultPath)
  }

  /**
   * 停止所有檔案監控器
   */
  stopAllWatchers(): void {
    this.scannerService.stopAllWatchers()
  }

  /**
   * 路徑輔助方法 - 連接路徑
   * @param {...string} paths - 路徑片段
   * @returns {string} 連接後的路徑
   */
  private joinPath(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/').replace(/\\/g, '/')
  }

  /**
   * 路徑輔助方法 - 取得檔案名稱
   * @param {string} filePath - 檔案路徑
   * @param {string} ext - 要移除的副檔名
   * @returns {string} 檔案名稱
   */
  private getBasename(filePath: string, ext?: string): string {
    const name = filePath.split(/[/\\]/).pop() || ''
    if (ext && name.endsWith(ext)) {
      return name.slice(0, -ext.length)
    }
    return name
  }

  /**
   * 路徑輔助方法 - 取得副檔名
   * @param {string} filePath - 檔案路徑
   * @returns {string} 副檔名
   */
  private getExtname(filePath: string): string {
    const name = filePath.split(/[/\\]/).pop() || ''
    const lastDot = name.lastIndexOf('.')
    return lastDot > 0 ? name.substring(lastDot) : ''
  }

  /**
   * 路徑輔助方法 - 取得目錄名稱
   * @param {string} filePath - 檔案路徑
   * @returns {string} 目錄路徑
   */
  private getDirname(filePath: string): string {
    const parts = filePath.split(/[/\\]/)
    parts.pop()
    return parts.join('/')
  }
}