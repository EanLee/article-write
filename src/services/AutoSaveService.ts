import type { Article, SaveState, Frontmatter } from '@/types'
import { SaveStatus } from '@/types'
import { ref, type Ref } from 'vue'
import { isEqual } from 'lodash-es'

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
  private lastSavedFrontmatter: Partial<Frontmatter> = {}
  private initialized: boolean = false // 初始化標誌

  // 儲存狀態（響應式）
  public readonly saveState: Ref<SaveState> = ref({
    status: SaveStatus.Saved,
    lastSavedAt: null,
    error: null
  })

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
    this.initialized = true // 標記為已初始化
    
    if (this.isEnabled) {
      this.startAutoSave()
    }
  }

  /**
   * 啟動自動儲存定時器
   */
  startAutoSave(): void {
    if (!this.initialized) {
      console.warn('AutoSaveService: Cannot start auto-save before initialization')
      return
    }
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
      this.updateSaveState(SaveStatus.Saving)
      try {
        await this.saveCallback(currentArticle)
        this.updateLastSavedContent(currentArticle)
        this.updateSaveState(SaveStatus.Saved)
      } catch (error) {
        console.error('自動儲存失敗:', error)
        this.updateSaveState(SaveStatus.Error, error instanceof Error ? error.message : '儲存失敗')
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
    if (!this.initialized) {
      console.warn('AutoSaveService: Cannot save on article switch before initialization')
      return
    }
    if (!this.saveCallback || !previousArticle) {
      return
    }

    try {
      // 檢查前一篇文章是否有變更
      const hasChanged = this.hasContentChanged(previousArticle)
      const currentContent = previousArticle.content
      const currentFrontmatter = JSON.stringify(previousArticle.frontmatter)

      console.group(`🔍 切換文章檢查: ${previousArticle.title}`)
      console.log('hasChanged:', hasChanged)
      console.log('currentContent length:', currentContent?.length)
      console.log('lastSavedContent length:', this.lastSavedContent?.length)
      console.log('content相等?:', currentContent === this.lastSavedContent)
      console.log('currentFrontmatter:', currentFrontmatter)
      console.log('lastSavedFrontmatter:', this.lastSavedFrontmatter)
      console.log('frontmatter相等?:', currentFrontmatter === this.lastSavedFrontmatter)
      console.groupEnd()

      if (hasChanged) {
        console.log(`✅ 內容已變更，執行自動儲存: ${previousArticle.title}`)
        this.updateSaveState(SaveStatus.Saving)
        await this.saveCallback(previousArticle)
        this.updateSaveState(SaveStatus.Saved)
      } else {
        console.log(`⏭️  內容無變更，跳過儲存: ${previousArticle.title}`)
      }
    } catch (error) {
      console.error('切換文章時自動儲存失敗:', error)
      this.updateSaveState(SaveStatus.Error, error instanceof Error ? error.message : '儲存失敗')
    }
  }

  /**
   * 手動觸發儲存當前文章
   */
  async saveCurrentArticle(): Promise<void> {
    if (!this.initialized) {
      console.warn('AutoSaveService: Cannot save before initialization')
      return
    }
    if (!this.saveCallback || !this.getCurrentArticleCallback) {
      return
    }

    this.updateSaveState(SaveStatus.Saving)
    try {
      const currentArticle = this.getCurrentArticleCallback()
      if (currentArticle) {
        console.log(`手動儲存文章: ${currentArticle.title}`)
        await this.saveCallback(currentArticle)
        this.updateLastSavedContent(currentArticle)
        this.updateSaveState(SaveStatus.Saved)
      }
    } catch (error) {
      console.error('手動儲存失敗:', error)
      this.updateSaveState(SaveStatus.Error, error instanceof Error ? error.message : '儲存失敗')
      throw error
    }
  }

  /**
   * 檢查文章內容是否有變更
   * 使用 lodash isEqual 進行深度比較，比 JSON.stringify 效能更好
   * @param {Article} article - 要檢查的文章
   * @returns {boolean} 是否有變更
   */
  private hasContentChanged(article: Article): boolean {
    return (
      article.content !== this.lastSavedContent ||
      !isEqual(article.frontmatter, this.lastSavedFrontmatter)
    )
  }

  /**
   * 更新最後儲存的內容記錄
   * @param {Article} article - 已儲存的文章
   */
  private updateLastSavedContent(article: Article): void {
    this.lastSavedContent = article.content
    this.lastSavedFrontmatter = { ...article.frontmatter }
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
      this.lastSavedFrontmatter = {}
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
   * 更新儲存狀態
   * @param {SaveStatus} status - 新的儲存狀態
   * @param {string | null} error - 錯誤訊息（僅當狀態為 error 時）
   */
  private updateSaveState(status: SaveStatus, error: string | null = null): void {
    this.saveState.value = {
      status,
      lastSavedAt: status === SaveStatus.Saved ? new Date() : this.saveState.value.lastSavedAt,
      error: status === SaveStatus.Error ? error : null
    }
  }

  private markAsModifiedDebounceTimer: NodeJS.Timeout | null = null
  private static DEBOUNCE_DELAY = 100 // 100ms debounce

  /**
   * 標記內容已修改
   * 當使用者編輯內容時呼叫此方法
   * 使用防抖避免頻繁更新狀態
   */
  markAsModified(): void {
    // 清除現有的防抖計時器
    if (this.markAsModifiedDebounceTimer) {
      clearTimeout(this.markAsModifiedDebounceTimer)
    }

    // 設定新的防抖計時器
    this.markAsModifiedDebounceTimer = setTimeout(() => {
      if (this.saveState.value.status === SaveStatus.Saved) {
        this.saveState.value = {
          ...this.saveState.value,
          status: SaveStatus.Modified,
          error: null
        }
      }
      this.markAsModifiedDebounceTimer = null
    }, AutoSaveService.DEBOUNCE_DELAY)
  }

  /**
   * 檢查是否有未儲存的變更
   * @returns {boolean} 是否有未儲存的變更
   */
  hasUnsavedChanges(): boolean {
    if (!this.getCurrentArticleCallback) {
      return false
    }
    const currentArticle = this.getCurrentArticleCallback()
    return currentArticle ? this.hasContentChanged(currentArticle) : false
  }

  /**
   * 清理資源，停止所有定時器
   */
  destroy(): void {
    this.stopAutoSave()
    if (this.markAsModifiedDebounceTimer) {
      clearTimeout(this.markAsModifiedDebounceTimer)
      this.markAsModifiedDebounceTimer = null
    }
    this.saveCallback = null
    this.getCurrentArticleCallback = null
    this.lastSavedContent = ''
    this.lastSavedFrontmatter = ''
    this.saveState.value = {
      status: SaveStatus.Saved,
      lastSavedAt: null,
      error: null
    }
  }
}

// 建立單例實例
export const autoSaveService = new AutoSaveService()