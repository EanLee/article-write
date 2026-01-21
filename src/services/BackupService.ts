import type { Article } from '@/types'

/**
 * 備份服務
 * 負責檔案備份、衝突偵測和復原功能
 */
export class BackupService {
  private backups: Map<string, ArticleBackup> = new Map()
  private static MAX_BACKUPS_PER_FILE = 5
  private static BACKUP_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * 建立文章備份
   */
  createBackup(article: Article): void {
    const key = article.filePath
    const existingBackups = this.backups.get(key) || {
      filePath: key,
      versions: []
    }

    // 加入新版本
    existingBackups.versions.push({
      content: article.content,
      frontmatter: JSON.stringify(article.frontmatter),
      timestamp: new Date(),
      id: this.generateBackupId()
    })

    // 限制備份數量
    if (existingBackups.versions.length > BackupService.MAX_BACKUPS_PER_FILE) {
      existingBackups.versions = existingBackups.versions.slice(-BackupService.MAX_BACKUPS_PER_FILE)
    }

    this.backups.set(key, existingBackups)
    this.cleanupExpiredBackups()
  }

  /**
   * 取得文章的備份列表
   */
  getBackups(filePath: string): BackupVersion[] {
    const backup = this.backups.get(filePath)
    return backup?.versions || []
  }

  /**
   * 從備份還原文章
   */
  restoreFromBackup(filePath: string, backupId: string): { content: string; frontmatter: any } | null {
    const backup = this.backups.get(filePath)
    if (!backup) return null

    const version = backup.versions.find(v => v.id === backupId)
    if (!version) return null

    return {
      content: version.content,
      frontmatter: JSON.parse(version.frontmatter)
    }
  }

  /**
   * 檢測衝突（檔案是否在外部被修改）
   */
  async detectConflict(article: Article): Promise<ConflictResult> {
    try {
      if (!window.electronAPI) {
        return { hasConflict: false }
      }

      const stats = await window.electronAPI.getFileStats(article.filePath)
      if (!stats) {
        return { hasConflict: false }
      }

      const fileModTime = new Date(stats.mtime)
      const articleModTime = article.lastModified

      // 如果檔案修改時間比記錄的還要新，可能有衝突
      if (fileModTime > articleModTime) {
        const currentContent = await window.electronAPI.readFile(article.filePath)
        return {
          hasConflict: true,
          fileModifiedTime: fileModTime,
          currentFileContent: currentContent
        }
      }

      return { hasConflict: false }
    } catch {
      return { hasConflict: false }
    }
  }

  /**
   * 清理過期的備份
   */
  private cleanupExpiredBackups(): void {
    const now = Date.now()

    this.backups.forEach((backup, key) => {
      backup.versions = backup.versions.filter(v => {
        const age = now - v.timestamp.getTime()
        return age < BackupService.BACKUP_EXPIRY_MS
      })

      if (backup.versions.length === 0) {
        this.backups.delete(key)
      }
    })
  }

  /**
   * 生成備份 ID
   */
  private generateBackupId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  }

  /**
   * 取得備份統計資訊
   */
  getStats(): BackupStats {
    let totalBackups = 0
    let oldestBackup: Date | null = null
    let newestBackup: Date | null = null

    this.backups.forEach(backup => {
      totalBackups += backup.versions.length
      backup.versions.forEach(v => {
        if (!oldestBackup || v.timestamp < oldestBackup) {
          oldestBackup = v.timestamp
        }
        if (!newestBackup || v.timestamp > newestBackup) {
          newestBackup = v.timestamp
        }
      })
    })

    return {
      totalFiles: this.backups.size,
      totalBackups,
      oldestBackup,
      newestBackup
    }
  }

  /**
   * 清除所有備份
   */
  clearAll(): void {
    this.backups.clear()
  }

  /**
   * 清除特定檔案的備份
   */
  clearBackupsForFile(filePath: string): void {
    this.backups.delete(filePath)
  }
}

// 類型定義
interface ArticleBackup {
  filePath: string
  versions: BackupVersion[]
}

export interface BackupVersion {
  id: string
  content: string
  frontmatter: string
  timestamp: Date
}

export interface ConflictResult {
  hasConflict: boolean
  fileModifiedTime?: Date
  currentFileContent?: string
}

export interface BackupStats {
  totalFiles: number
  totalBackups: number
  oldestBackup: Date | null
  newestBackup: Date | null
}

// 建立單例實例
export const backupService = new BackupService()
