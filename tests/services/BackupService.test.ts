import { describe, it, expect, beforeEach } from 'vitest'
import { BackupService } from '@/services/BackupService'
import type { Article } from '@/types'
import { ArticleStatus, ArticleCategory } from '@/types'

describe('BackupService', () => {
  let backupService: BackupService
  let mockArticle: Article

  beforeEach(() => {
    backupService = new BackupService()
    mockArticle = {
      id: 'test-id',
      title: 'Test Article',
      slug: 'test-article',
      filePath: '/test/path/test-article.md',
      status: ArticleStatus.Draft,
      category: ArticleCategory.Software,
      lastModified: new Date(),
      content: '# Test Content',
      frontmatter: {
        title: 'Test Article',
        date: '2024-01-01',
        tags: ['test'],
        categories: ['Software']
      }
    }
  })

  describe('建立備份', () => {
    it('應該成功建立文章備份', () => {
      backupService.createBackup(mockArticle)

      const backups = backupService.getBackups(mockArticle.filePath)
      expect(backups).toHaveLength(1)
      expect(backups[0].content).toBe(mockArticle.content)
    })

    it('應該保留多個備份版本', () => {
      // 建立多個備份
      for (let i = 0; i < 3; i++) {
        mockArticle.content = `Content version ${i}`
        backupService.createBackup(mockArticle)
      }

      const backups = backupService.getBackups(mockArticle.filePath)
      expect(backups).toHaveLength(3)
    })

    it('應該限制最大備份數量', () => {
      // 建立超過最大數量的備份
      for (let i = 0; i < 10; i++) {
        mockArticle.content = `Content version ${i}`
        backupService.createBackup(mockArticle)
      }

      const backups = backupService.getBackups(mockArticle.filePath)
      expect(backups.length).toBeLessThanOrEqual(5) // MAX_BACKUPS_PER_FILE = 5
    })
  })

  describe('還原備份', () => {
    it('應該能從備份還原文章', () => {
      const originalContent = mockArticle.content
      backupService.createBackup(mockArticle)

      const backups = backupService.getBackups(mockArticle.filePath)
      const restored = backupService.restoreFromBackup(mockArticle.filePath, backups[0].id)

      expect(restored).not.toBeNull()
      expect(restored?.content).toBe(originalContent)
    })

    it('當備份不存在時應該回傳 null', () => {
      const restored = backupService.restoreFromBackup('/nonexistent/path', 'invalid-id')
      expect(restored).toBeNull()
    })
  })

  describe('備份統計', () => {
    it('應該正確計算備份統計資訊', () => {
      backupService.createBackup(mockArticle)

      const stats = backupService.getStats()
      expect(stats.totalFiles).toBe(1)
      expect(stats.totalBackups).toBe(1)
      expect(stats.oldestBackup).not.toBeNull()
      expect(stats.newestBackup).not.toBeNull()
    })

    it('空備份時應該回傳正確統計', () => {
      const stats = backupService.getStats()
      expect(stats.totalFiles).toBe(0)
      expect(stats.totalBackups).toBe(0)
      expect(stats.oldestBackup).toBeNull()
      expect(stats.newestBackup).toBeNull()
    })
  })

  describe('清理備份', () => {
    it('應該能清除所有備份', () => {
      backupService.createBackup(mockArticle)
      backupService.clearAll()

      const backups = backupService.getBackups(mockArticle.filePath)
      expect(backups).toHaveLength(0)
    })

    it('應該能清除特定檔案的備份', () => {
      backupService.createBackup(mockArticle)

      // 建立另一個檔案的備份
      const anotherArticle = { ...mockArticle, filePath: '/another/path.md' }
      backupService.createBackup(anotherArticle)

      backupService.clearBackupsForFile(mockArticle.filePath)

      expect(backupService.getBackups(mockArticle.filePath)).toHaveLength(0)
      expect(backupService.getBackups(anotherArticle.filePath)).toHaveLength(1)
    })
  })
})
