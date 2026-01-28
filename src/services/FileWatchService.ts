/**
 * FileWatchService - 檔案監聽服務
 *
 * 職責：
 * - 監聽指定目錄的檔案變化
 * - 提供檔案變化事件的訂閱機制
 * - 防止重複觸發（去抖機制）
 *
 * 單一職責：只負責檔案監聽，不包含任何商業邏輯
 */

import { normalizePath } from '@/utils/path'

export type FileChangeEvent = {
  event: 'add' | 'change' | 'unlink'
  path: string
}

export type FileChangeCallback = (event: FileChangeEvent) => void

export class FileWatchService {
  private isWatching = false
  private watchedPath: string | null = null
  private callbacks: Set<FileChangeCallback> = new Set()
  private unsubscribeElectron: (() => void) | null = null

  // 去抖機制：記錄最近處理過的檔案事件
  private recentEvents = new Map<string, { event: string; timestamp: number }>()
  private readonly DEBOUNCE_MS = 1000 // 1 秒內的重複事件會被忽略

  /**
   * 開始監聽目錄
   */
  async startWatching(path: string): Promise<void> {
    if (this.isWatching && this.watchedPath === path) {
      console.log('Already watching this path:', path)
      return
    }

    if (this.isWatching) {
      await this.stopWatching()
    }

    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    try {
      await window.electronAPI.startFileWatching(path)

      this.unsubscribeElectron = window.electronAPI.onFileChange((data) => {
        this.handleFileChange(data.event, data.path)
      })

      this.isWatching = true
      this.watchedPath = path

      console.log('FileWatchService: Started watching', path)
    } catch (error) {
      console.error('Failed to start file watching:', error)
      throw error
    }
  }

  /**
   * 停止監聽
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      return
    }

    if (this.unsubscribeElectron) {
      this.unsubscribeElectron()
      this.unsubscribeElectron = null
    }

    if (window.electronAPI) {
      try {
        await window.electronAPI.stopFileWatching()
      } catch (error) {
        console.error('Failed to stop file watching:', error)
      }
    }

    this.isWatching = false
    this.watchedPath = null
    this.recentEvents.clear()

    console.log('FileWatchService: Stopped watching')
  }

  /**
   * 訂閱檔案變化事件
   */
  subscribe(callback: FileChangeCallback): () => void {
    this.callbacks.add(callback)

    // 返回取消訂閱函數
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * 忽略特定檔案的變化（用於避免自己儲存觸發的事件）
   */
  ignoreNextChange(filePath: string, durationMs: number = 3000): void {
    const normalized = normalizePath(filePath)

    this.recentEvents.set(normalized, {
      event: 'ignore',
      timestamp: Date.now()
    })

    setTimeout(() => {
      this.recentEvents.delete(normalized)
    }, durationMs)

    console.log(`FileWatchService: Will ignore changes to ${filePath} for ${durationMs}ms`)
  }

  /**
   * 處理檔案變化事件
   */
  private handleFileChange(event: string, path: string): void {
    const normalized = normalizePath(path)

    // 去抖檢查
    const recent = this.recentEvents.get(normalized)
    if (recent) {
      const timeSinceLastEvent = Date.now() - recent.timestamp

      if (timeSinceLastEvent < this.DEBOUNCE_MS) {
        console.log(`FileWatchService: Debounced ${event} for ${normalized} (${timeSinceLastEvent}ms ago)`)
        return
      }
    }

    // 記錄此事件
    this.recentEvents.set(normalized, {
      event,
      timestamp: Date.now()
    })

    // 清理過期記錄（超過 5 秒的）
    this.cleanupRecentEvents()

    // 通知所有訂閱者
    const fileEvent: FileChangeEvent = {
      event: event as 'add' | 'change' | 'unlink',
      path: normalized
    }

    console.log('FileWatchService: File changed', fileEvent)

    this.callbacks.forEach(callback => {
      try {
        callback(fileEvent)
      } catch (error) {
        console.error('Error in file change callback:', error)
      }
    })
  }

  /**
   * 清理過期的事件記錄
   */
  private cleanupRecentEvents(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.recentEvents.forEach((value, key) => {
      if (now - value.timestamp > 5000) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach(key => this.recentEvents.delete(key))
  }

  /**
   * 取得當前監聽狀態
   */
  getStatus(): { isWatching: boolean; watchedPath: string | null } {
    return {
      isWatching: this.isWatching,
      watchedPath: this.watchedPath
    }
  }
}

// 單例實例
export const fileWatchService = new FileWatchService()
