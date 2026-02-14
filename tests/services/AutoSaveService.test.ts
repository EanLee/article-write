import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AutoSaveService } from '@/services/AutoSaveService'
import type { Article } from '@/types'
import { ArticleStatus, ArticleCategory } from '@/types'

// Mock article for testing
const mockArticle: Article = {
  id: 'test-1',
  title: 'Test Article',
  slug: 'test-article',
  filePath: '/test/path.md',
  status: ArticleStatus.Draft,
  category: ArticleCategory.Software,
  lastModified: new Date(),
  content: 'Test content',
  frontmatter: {
    title: 'Test Article',
    date: '2024-01-01',
    tags: ['test'],
    categories: ['Software']
  }
}

describe('AutoSaveService', () => {
  let autoSaveService: AutoSaveService
  let mockSaveCallback: vi.MockedFunction<(article: Article) => Promise<void>>
  let mockGetCurrentArticleCallback: vi.MockedFunction<() => Article | null>

  beforeEach(() => {
    vi.useFakeTimers()
    autoSaveService = new AutoSaveService()
    mockSaveCallback = vi.fn().mockResolvedValue(undefined)
    mockGetCurrentArticleCallback = vi.fn().mockReturnValue(mockArticle)
  })

  afterEach(() => {
    autoSaveService.destroy()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('初始化和基本功能', () => {
    it('應該正確初始化自動儲存服務', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback, 5000)
      
      const status = autoSaveService.getStatus()
      expect(status.enabled).toBe(true)
      expect(status.interval).toBe(5000)
      expect(status.running).toBe(true)
    })

    it('應該能夠啟用和停用自動儲存', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback)
      
      autoSaveService.setEnabled(false)
      expect(autoSaveService.getStatus().enabled).toBe(false)
      expect(autoSaveService.getStatus().running).toBe(false)
      
      autoSaveService.setEnabled(true)
      expect(autoSaveService.getStatus().enabled).toBe(true)
      expect(autoSaveService.getStatus().running).toBe(true)
    })

    it('應該能夠設定自動儲存間隔', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback)
      
      autoSaveService.setInterval(10000)
      expect(autoSaveService.getStatus().interval).toBe(10000)
    })
  })

  describe('自動儲存功能', () => {
    it('應該在指定間隔後自動儲存', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback, 1000)
      autoSaveService.setCurrentArticle(mockArticle)
      
      // 模擬內容變更（需呼叫 markAsModified 以更新 dirty flag）
      const modifiedArticle = { ...mockArticle, content: 'Modified content' }
      mockGetCurrentArticleCallback.mockReturnValue(modifiedArticle)
      autoSaveService.markAsModified()
      vi.advanceTimersByTime(200) // 等待 debounce

      // 快進時間到自動儲存間隔
      vi.advanceTimersByTime(1000)
      
      expect(mockSaveCallback).toHaveBeenCalledWith(modifiedArticle)
    })

    it('如果內容沒有變更，不應該觸發儲存', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback, 1000)
      autoSaveService.setCurrentArticle(mockArticle)
      
      // 快進時間但不修改內容
      vi.advanceTimersByTime(1000)
      
      expect(mockSaveCallback).not.toHaveBeenCalled()
    })

    it('應該在文章切換時自動儲存前一篇文章', async () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback)
      
      const modifiedArticle = { ...mockArticle, content: 'Modified content' }
      await autoSaveService.saveOnArticleSwitch(modifiedArticle)
      
      expect(mockSaveCallback).toHaveBeenCalledWith(modifiedArticle)
    })

    it('應該能夠手動觸發儲存', async () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback)
      
      await autoSaveService.saveCurrentArticle()
      
      expect(mockSaveCallback).toHaveBeenCalledWith(mockArticle)
    })
  })

  describe('內容變更檢測', () => {
    it('應該檢測到內容變更', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback, 1000)
      autoSaveService.setCurrentArticle(mockArticle)
      
      // 修改內容（需呼叫 markAsModified 以更新 dirty flag）
      const modifiedArticle = { ...mockArticle, content: 'New content' }
      mockGetCurrentArticleCallback.mockReturnValue(modifiedArticle)
      autoSaveService.markAsModified()
      vi.advanceTimersByTime(200) // 等待 debounce

      vi.advanceTimersByTime(1000)
      
      expect(mockSaveCallback).toHaveBeenCalledWith(modifiedArticle)
    })

    it('應該檢測到前置資料變更', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback, 1000)
      autoSaveService.setCurrentArticle(mockArticle)
      
      // 修改前置資料（需呼叫 markAsModified 以更新 dirty flag）
      const modifiedArticle = {
        ...mockArticle,
        frontmatter: { ...mockArticle.frontmatter, tags: ['new-tag'] }
      }
      mockGetCurrentArticleCallback.mockReturnValue(modifiedArticle)
      autoSaveService.markAsModified()
      vi.advanceTimersByTime(200) // 等待 debounce

      vi.advanceTimersByTime(1000)
      
      expect(mockSaveCallback).toHaveBeenCalledWith(modifiedArticle)
    })
  })

  describe('錯誤處理', () => {
    it('應該處理儲存錯誤而不中斷服務', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockSaveCallback.mockRejectedValue(new Error('Save failed'))
      
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback, 1000)
      autoSaveService.setCurrentArticle(mockArticle)
      
      const modifiedArticle = { ...mockArticle, content: 'Modified content' }
      mockGetCurrentArticleCallback.mockReturnValue(modifiedArticle)
      autoSaveService.markAsModified()
      vi.advanceTimersByTime(200) // 等待 debounce

      // 直接調用 performAutoSave 來測試錯誤處理
      await (autoSaveService as any).performAutoSave()
      
      expect(consoleSpy).toHaveBeenCalledWith('自動儲存失敗:', expect.any(Error))
      expect(autoSaveService.getStatus().running).toBe(true)
      
      consoleSpy.mockRestore()
    })

    it('手動儲存失敗時應該拋出錯誤', async () => {
      mockSaveCallback.mockRejectedValue(new Error('Save failed'))
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback)
      
      await expect(autoSaveService.saveCurrentArticle()).rejects.toThrow('Save failed')
    })
  })

  describe('清理和銷毀', () => {
    it('應該正確清理資源', () => {
      autoSaveService.initialize(mockSaveCallback, mockGetCurrentArticleCallback)
      
      autoSaveService.destroy()
      
      const status = autoSaveService.getStatus()
      expect(status.running).toBe(false)
    })
  })
})