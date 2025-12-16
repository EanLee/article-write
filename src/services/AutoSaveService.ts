import type { Article } from '@/types'

/**
 * 自動儲存服務類別
 * 負責管理文章的自動儲存功能，包括定時儲存和切換文章時的儲存
 */
export class AutoSaveService {
  private saveCallback: ((article: Article) => Promise<void>) | null = null
  private getCurrentArticleCallback: (() => Article | null) | null = null
  private autoSaveTimer: NodeJS.Timeout | null = null
  private autoSaveInterval: number = 30000 // 30 seconds
  private isEnabled: boolean = true
  private lastSavedContent: string = ''
  private lastSavedFrontmatter: string = ''

  /**
   * 初始化自動儲存服務
   * @param {(article: Article) => Promise<void>} saveCallback - 儲存文章的回調函數
   * @param {() => Article | null} getCurrentArticleCallback - 取得當前文章的回調函數
   * @param {number} interval - 自動儲存間隔（毫秒），預設 30 秒
   */
  initialize(
    saveCallback: (article: Article) => Promise<void>,
    getCurrentArticleCallback: () => Article | null,
    interval: number = 30000
  ): void {
    this.saveCallback = saveCallback
    this.getCurrentArticleCallback = getCurrentArticleCallback
    this.autoSaveInterval = interval
    
    if (this.isEnabled) {
      this.startAutoSave()
    }
  }

  /**
   * 啟動自動儲存定時器
   */
  startAutoSave(): void {
    if (!this.isEnabled || !this.saveCallback || !this.getCurrentArticleCallback) {
      return
    }

    // 清除現有的定時器
    this.stopAutoSave()

    // 設定新的定時器
    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave()
    }, this.autoSaveInterval)

    console.log(`自動儲存已啟動，間隔: ${this.autoSaveInterval / 1000} 秒`)
  }

  /**
   * 停止自動儲存定時器
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
      console.log('自動儲存已停止')
    }
  }

  /**
   * 執行自動儲存
   * 檢查當前文章是否有變更，如果有則儲存
   */
  private async performAutoSave(): Promise<void> {
    if (!this.saveCallback || !this.getCurrentArticleCallback) {
      return
    }

    const currentArticle = this.getCurrentArticleCallback()
    if (!currentArticle) {
      return
    }

    // 檢查內容是否有變更
    if (this.hasContentChanged(currentArticle)) {
      console.log(`自動儲存文章: ${currentArticle.title}`)
      try {
        await this.saveCallback(currentArticle)
        this.updateLastSavedContent(currentArticle)
      } catch (error) {
        console.error('自動儲存失敗:', error)
        // 不重新拋出錯誤，讓自動儲存繼續運行
      }
    }
  }

  /**
   * 文章切換時的自動儲存
   * 在切換到新文章前儲存當前文章
   * @param {Article | null} previousArticle - 前一篇文章
   */
  async saveOnArticleSwitch(previousArticle: Article | null): Promise<void> {
    if (!this.saveCallback || !previousArticle) {
      return
    }

    try {
      // 檢查前一篇文章是否有變更
      if (this.hasContentChanged(previousArticle)) {
        console.log(`切換文章時自動儲存: ${previousArticle.title}`)
        await this.saveCallback(previousArticle)
      }
    } catch (error) {
      console.error('切換文章時自動儲存失敗:', error)
    }
  }

  /**
   * 手動觸發儲存當前文章
   */
  async saveCurrentArticle(): Promise<void> {
    if (!this.saveCallback || !this.getCurrentArticleCallback) {
      return
    }

    try {
      const currentArticle = this.getCurrentArticleCallback()
      if (currentArticle) {
        console.log(`手動儲存文章: ${currentArticle.title}`)
        await this.saveCallback(currentArticle)
        this.updateLastSavedContent(currentArticle)
      }
    } catch (error) {
      console.error('手動儲存失敗:', error)
      throw error
    }
  }

  /**
   * 檢查文章內容是否有變更
   * @param {Article} article - 要檢查的文章
   * @returns {boolean} 是否有變更
   */
  private hasContentChanged(article: Article): boolean {
    const currentContent = article.content
    const currentFrontmatter = JSON.stringify(article.frontmatter)
    
    return (
      currentContent !== this.lastSavedContent ||
      currentFrontmatter !== this.lastSavedFrontmatter
    )
  }

  /**
   * 更新最後儲存的內容記錄
   * @param {Article} article - 已儲存的文章
   */
  private updateLastSavedContent(article: Article): void {
    this.lastSavedContent = article.content
    this.lastSavedFrontmatter = JSON.stringify(article.frontmatter)
  }

  /**
   * 設定新文章時重置儲存狀態
   * @param {Article | null} article - 新的當前文章
   */
  setCurrentArticle(article: Article | null): void {
    if (article) {
      this.updateLastSavedContent(article)
    } else {
      this.lastSavedContent = ''
      this.lastSavedFrontmatter = ''
    }
  }

  /**
   * 啟用或停用自動儲存
   * @param {boolean} enabled - 是否啟用
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    
    if (enabled) {
      this.startAutoSave()
    } else {
      this.stopAutoSave()
    }
  }

  /**
   * 設定自動儲存間隔
   * @param {number} interval - 間隔時間（毫秒）
   */
  setInterval(interval: number): void {
    this.autoSaveInterval = interval
    
    // 如果自動儲存正在運行，重新啟動以套用新間隔
    if (this.autoSaveTimer) {
      this.startAutoSave()
    }
  }

  /**
   * 取得當前自動儲存狀態
   * @returns {object} 自動儲存狀態資訊
   */
  getStatus(): {
    enabled: boolean
    interval: number
    running: boolean
  } {
    return {
      enabled: this.isEnabled,
      interval: this.autoSaveInterval,
      running: this.autoSaveTimer !== null
    }
  }

  /**
   * 清理資源，停止所有定時器
   */
  destroy(): void {
    this.stopAutoSave()
    this.saveCallback = null
    this.getCurrentArticleCallback = null
    this.lastSavedContent = ''
    this.lastSavedFrontmatter = ''
  }
}

// 建立單例實例
export const autoSaveService = new AutoSaveService()