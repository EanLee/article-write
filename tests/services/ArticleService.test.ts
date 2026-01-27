/**
 * ArticleService 單元測試
 *
 * 使用 MockFileSystem 進行依賴注入測試
 * 不再依賴 global.window mock
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ArticleService } from '@/services/ArticleService'
import { MockFileSystem } from '@/services/MockFileSystem'
import { ArticleStatus, ArticleCategory } from '@/types'
import type { Article } from '@/types'

// Mock MarkdownService
vi.mock('@/services/MarkdownService', () => {
  const mockParseMarkdown = vi.fn((_content: string) => ({
    frontmatter: {
      title: 'Test Article',
      date: '2026-01-26',
      tags: ['test'],
      categories: ['Software']
    },
    content: 'Test content'
  }))

  const mockParseFrontmatter = vi.fn((_content: string) => ({
    frontmatter: {
      title: 'Test Article',
      date: '2026-01-26',
      tags: ['test'],
      categories: ['Software']
    },
    body: 'Test content',
    hasValidFrontmatter: true,
    errors: []
  }))

  const mockCombineContent = vi.fn((frontmatter, content) => {
    return `---\ntitle: ${frontmatter.title}\n---\n\n${content}`
  })

  return {
    MarkdownService: class MockMarkdownService {
      parseMarkdown = mockParseMarkdown
      parseFrontmatter = mockParseFrontmatter
      combineContent = mockCombineContent
    },
    markdownService: {
      parseMarkdown: mockParseMarkdown,
      parseFrontmatter: mockParseFrontmatter,
      combineContent: mockCombineContent
    }
  }
})

// Mock BackupService
vi.mock('@/services/BackupService', () => {
  const mockDetectConflict = vi.fn().mockResolvedValue({ hasConflict: false })
  const mockCreateBackup = vi.fn().mockResolvedValue(undefined)

  return {
    BackupService: class MockBackupService {
      detectConflict = mockDetectConflict
      createBackup = mockCreateBackup
    },
    backupService: {
      detectConflict: mockDetectConflict,
      createBackup: mockCreateBackup
    }
  }
})

describe('ArticleService with MockFileSystem', () => {
  let service: ArticleService
  let mockFileSystem: MockFileSystem
  let mockParseMarkdown: any
  let mockCombineContent: any
  let mockDetectConflict: any

  beforeEach(async () => {
    // 建立新的 MockFileSystem
    mockFileSystem = new MockFileSystem()

    // 取得 mocked functions
    const markdownMod = await import('@/services/MarkdownService')
    const backupMod = await import('@/services/BackupService')

    mockParseMarkdown = (markdownMod as any).markdownService.parseMarkdown
    mockCombineContent = (markdownMod as any).markdownService.combineContent
    mockDetectConflict = (backupMod as any).backupService.detectConflict

    // 重置 mock
    vi.clearAllMocks()

    // 使用 MockFileSystem 注入創建 service
    service = new ArticleService(mockFileSystem)
  })

  describe('loadArticle', () => {
    it('應該成功載入文章', async () => {
      // 準備測試資料
      const filePath = '/vault/Drafts/Software/test-article.md'
      const fileContent = `---
title: Test Article
date: 2026-01-26
tags: [test]
categories: [Software]
---

Test content`

      // 設定 MockFileSystem
      await mockFileSystem.createDirectory('/vault/Drafts/Software')
      await mockFileSystem.writeFile(filePath, fileContent)

      // 執行測試
      const result = await service.loadArticle(filePath, ArticleStatus.Draft, ArticleCategory.Software)

      // 驗證
      expect(result.title).toBe('Test Article')
      expect(result.filePath).toBe(filePath)
      expect(result.status).toBe(ArticleStatus.Draft)
      expect(result.category).toBe(ArticleCategory.Software)
      expect(mockParseMarkdown).toHaveBeenCalledWith(fileContent)
    })

    it('應該處理檔案不存在的情況', async () => {
      const filePath = '/vault/Drafts/Software/non-existent.md'

      await expect(
        service.loadArticle(filePath, ArticleStatus.Draft, ArticleCategory.Software)
      ).rejects.toThrow('File not found')
    })
  })

  describe('loadAllArticles', () => {
    it('應該掃描並載入所有文章', async () => {
      // 準備測試資料
      await mockFileSystem.seed({
        directories: [
          '/vault',
          '/vault/Drafts',
          '/vault/Drafts/Software',
          '/vault/Drafts/growth',
          '/vault/Publish',
          '/vault/Publish/Software'
        ],
        files: {
          '/vault/Drafts/Software/article1.md': 'content1',
          '/vault/Drafts/Software/article2.md': 'content2',
          '/vault/Drafts/growth/article3.md': 'content3',
          '/vault/Publish/Software/article4.md': 'content4'
        }
      })

      // 執行測試
      const articles = await service.loadAllArticles('/vault')

      // 驗證
      expect(articles).toHaveLength(4)
      expect(mockParseMarkdown).toHaveBeenCalledTimes(4)
    })

    it('應該處理空 vault 的情況', async () => {
      await mockFileSystem.createDirectory('/vault')
      await mockFileSystem.createDirectory('/vault/Drafts')
      await mockFileSystem.createDirectory('/vault/Publish')

      const articles = await service.loadAllArticles('/vault')

      expect(articles).toHaveLength(0)
    })

    it('應該略過不存在的資料夾', async () => {
      // 只建立部分資料夾
      await mockFileSystem.createDirectory('/vault')
      await mockFileSystem.createDirectory('/vault/Drafts')
      await mockFileSystem.createDirectory('/vault/Drafts/Software')
      await mockFileSystem.writeFile('/vault/Drafts/Software/article1.md', 'content')

      // Publish 資料夾不存在

      const articles = await service.loadAllArticles('/vault')

      expect(articles).toHaveLength(1)
    })
  })

  describe('saveArticle', () => {
    it('應該成功儲存文章', async () => {
      const article: Article = {
        id: 'test-id',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Test content',
        frontmatter: {
          title: 'Test',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      // 準備目錄
      await mockFileSystem.createDirectory('/vault/Drafts/Software')

      // 執行測試
      const result = await service.saveArticle(article)

      // 驗證
      expect(result.success).toBe(true)
      expect(mockCombineContent).toHaveBeenCalled()
      expect(mockDetectConflict).toHaveBeenCalledWith(article)

      // 驗證檔案已寫入
      const exists = await mockFileSystem.exists(article.filePath)
      expect(exists).toBe(true)
    })

    it('應該處理衝突情況', async () => {
      mockDetectConflict.mockResolvedValueOnce({ hasConflict: true })

      const article: Article = {
        id: 'test-id',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Test content',
        frontmatter: {
          title: 'Test',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      const result = await service.saveArticle(article)

      expect(result.success).toBe(false)
      expect(result.conflict).toBe(true)
    })

    it('應該支援跳過衝突檢查和備份', async () => {
      const article: Article = {
        id: 'test-id',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Test content',
        frontmatter: {
          title: 'Test',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      await mockFileSystem.createDirectory('/vault/Drafts/Software')

      const result = await service.saveArticle(article, {
        skipConflictCheck: true,
        skipBackup: true
      })

      expect(result.success).toBe(true)
      expect(mockDetectConflict).not.toHaveBeenCalled()
    })
  })

  describe('deleteArticle', () => {
    it('應該成功刪除文章', async () => {
      const article: Article = {
        id: 'test-id',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Test content',
        frontmatter: {
          title: 'Test',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      // 先建立檔案
      await mockFileSystem.createDirectory('/vault/Drafts/Software')
      await mockFileSystem.writeFile(article.filePath, 'content')

      // 刪除
      await service.deleteArticle(article)

      // 驗證
      const exists = await mockFileSystem.exists(article.filePath)
      expect(exists).toBe(false)
    })
  })

  describe('moveArticle', () => {
    it('應該成功移動文章', async () => {
      const article: Article = {
        id: 'test-id',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Test content',
        frontmatter: {
          title: 'Test',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      const newFilePath = '/vault/Publish/Software/test.md'

      // 準備測試
      await mockFileSystem.createDirectory('/vault/Drafts/Software')
      await mockFileSystem.createDirectory('/vault/Publish/Software')
      await mockFileSystem.writeFile(article.filePath, 'original content')

      // 移動
      await service.moveArticle(article, newFilePath)

      // 驗證
      const oldExists = await mockFileSystem.exists(article.filePath)
      const newExists = await mockFileSystem.exists(newFilePath)

      expect(oldExists).toBe(false)
      expect(newExists).toBe(true)

      const newContent = await mockFileSystem.readFile(newFilePath)
      expect(newContent).toBe('original content')
    })
  })

  describe('generateSlug', () => {
    it('應該產生正確的 slug', () => {
      expect(service.generateSlug('Hello World')).toBe('hello-world')
      expect(service.generateSlug('  Trim Spaces  ')).toBe('trim-spaces')
      expect(service.generateSlug('Remove@Special#Chars')).toBe('removespecialchars')
      expect(service.generateSlug('Multiple   Spaces')).toBe('multiple-spaces')
      expect(service.generateSlug('Multiple---Dashes')).toBe('multiple-dashes')
    })
  })

  describe('validateArticle', () => {
    it('應該驗證有效的文章', () => {
      const article: Article = {
        id: 'test-id',
        title: 'Valid Article',
        slug: 'valid-article',
        filePath: '/vault/Drafts/Software/valid.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: {
          title: 'Valid Article',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      const result = service.validateArticle(article)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('應該偵測缺少標題', () => {
      const article: Article = {
        id: 'test-id',
        title: '',
        slug: 'test',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: {
          title: '',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      const result = service.validateArticle(article)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('標題不能為空')
    })

    it('應該偵測缺少檔案路徑', () => {
      const article: Article = {
        id: 'test-id',
        title: 'Test',
        slug: 'test',
        filePath: '',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: {
          title: 'Test',
          date: '2026-01-26',
          tags: [],
          categories: ['Software']
        }
      }

      const result = service.validateArticle(article)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('檔案路徑不能為空')
    })
  })
})
