/**
 * ArticleService 單元測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ArticleService } from '@/services/ArticleService'
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

// Mock 全域 electronAPI
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockGetFileStats = vi.fn()
const mockReadDirectory = vi.fn()
const mockCreateDirectory = vi.fn()
const mockDeleteFile = vi.fn()

global.window = {
  electronAPI: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    getFileStats: mockGetFileStats,
    readDirectory: mockReadDirectory,
    createDirectory: mockCreateDirectory,
    deleteFile: mockDeleteFile
  }
} as any

describe('ArticleService', () => {
  let service: ArticleService
  let mockParseMarkdown: any
  let mockDetectConflict: any

  beforeEach(async () => {
    // 取得 mocked functions
    const markdownMod = await import('@/services/MarkdownService')
    const backupMod = await import('@/services/BackupService')

    mockParseMarkdown = (markdownMod as any).markdownService.parseMarkdown
    mockDetectConflict = (backupMod as any).backupService.detectConflict

    service = new ArticleService()
    vi.clearAllMocks()

    // 預設的 mock 行為
    mockReadFile.mockResolvedValue('---\ntitle: Test\n---\nContent')
    mockWriteFile.mockResolvedValue(undefined)
    mockGetFileStats.mockResolvedValue({
      isDirectory: false,
      mtime: new Date('2026-01-26').getTime()
    })
  })

  describe('loadArticle', () => {
    it('should load a single article from disk', async () => {
      const filePath = '/vault/Drafts/Software/test.md'

      mockReadFile.mockResolvedValue(`---
title: Test Article
slug: test-article
tags:
  - test
categories:
  - Software
---

This is test content`)

      mockGetFileStats.mockResolvedValue({
        isDirectory: false,
        mtime: new Date('2026-01-26T10:00:00Z').getTime()
      })

      const article = await service.loadArticle(
        filePath,
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      expect(mockReadFile).toHaveBeenCalledWith(filePath)
      expect(mockGetFileStats).toHaveBeenCalledWith(filePath)

      expect(article.filePath).toBe(filePath)
      expect(article.status).toBe(ArticleStatus.Draft)
      expect(article.category).toBe(ArticleCategory.Software)
      expect(article.title).toBe('Test Article')
      expect(article.content).toBe('Test content')
    })

    it('should use folder name as category if frontmatter.categories is missing', async () => {
      const filePath = '/vault/Drafts/growth/test.md'

      // Mock parseMarkdown to return no categories in frontmatter
      mockParseMarkdown.mockReturnValueOnce({
        frontmatter: {
          title: 'Test Article',
          date: '2026-01-26',
          tags: ['test']
          // No categories field
        },
        content: 'Test content'
      })

      const article = await service.loadArticle(
        filePath,
        ArticleStatus.Draft,
        ArticleCategory.Growth
      )

      expect(article.category).toBe(ArticleCategory.Growth)
    })

    it('should use file name as title if frontmatter.title is missing', async () => {
      const filePath = '/vault/Drafts/Software/my-article.md'

      // Mock parseMarkdown to return no title
      mockParseMarkdown.mockReturnValueOnce({
        frontmatter: {
          date: '2026-01-26',
          tags: ['test'],
          categories: ['Software']
        },
        content: 'Test content'
      })

      const article = await service.loadArticle(
        filePath,
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      expect(article.title).toBe('my-article')
      expect(article.slug).toBe('my-article')
    })
  })

  describe('loadAllArticles', () => {
    it('should load all articles from Drafts and Publish folders', async () => {
      const vaultPath = '/vault'

      // Mock 資料夾結構
      mockGetFileStats.mockImplementation(async (path: string) => {
        if (path.includes('Drafts') || path.includes('Publish')) {
          return { isDirectory: true }
        }
        if (path.includes('Software') || path.includes('growth')) {
          return { isDirectory: true }
        }
        return { isDirectory: false, mtime: Date.now() }
      })

      mockReadDirectory.mockImplementation(async (path: string) => {
        if (path === '/vault/Drafts') {
          return ['Software', 'growth']
        }
        if (path === '/vault/Publish') {
          return ['Software']
        }
        if (path === '/vault/Drafts/Software') {
          return ['article1.md', 'article2.md']
        }
        if (path === '/vault/Drafts/growth') {
          return ['article3.md']
        }
        if (path === '/vault/Publish/Software') {
          return ['published1.md']
        }
        return []
      })

      mockReadFile.mockResolvedValue(`---
title: Test Article
categories:
  - Software
---

Content`)

      const articles = await service.loadAllArticles(vaultPath)

      // 應該載入 4 篇文章
      expect(articles.length).toBe(4)

      // 驗證呼叫次數
      expect(mockReadDirectory).toHaveBeenCalledTimes(5) // 2 folders + 3 categories
      expect(mockReadFile).toHaveBeenCalledTimes(4) // 4 articles
    })

    it('should handle missing folders gracefully', async () => {
      const vaultPath = '/vault'

      // Mock Drafts 存在但 Publish 不存在
      mockGetFileStats.mockImplementation(async (path: string) => {
        if (path === '/vault/Drafts') {
          return { isDirectory: true }
        }
        if (path === '/vault/Publish') {
          return { isDirectory: false }  // 不是資料夾
        }
        if (path.includes('Software')) {
          return { isDirectory: true }
        }
        return { isDirectory: false, mtime: Date.now() }
      })

      mockReadDirectory.mockImplementation(async (path: string) => {
        if (path === '/vault/Drafts') {
          return ['Software']
        }
        if (path === '/vault/Drafts/Software') {
          return ['article1.md']
        }
        return []
      })

      mockReadFile.mockResolvedValue(`---
title: Test Article
---
Content`)

      const articles = await service.loadAllArticles(vaultPath)

      // 應該只載入 Drafts 的文章
      expect(articles.length).toBe(1)
    })

    it('should skip files that fail to load', async () => {
      const vaultPath = '/vault'

      mockGetFileStats.mockResolvedValue({ isDirectory: true })
      mockReadDirectory.mockImplementation(async (path: string) => {
        if (path === '/vault/Drafts') {
          return ['Software']
        }
        if (path === '/vault/Publish') {
          return []
        }
        if (path === '/vault/Drafts/Software') {
          return ['good.md', 'bad.md']
        }
        return []
      })

      // good.md 成功，bad.md 失敗
      mockReadFile.mockImplementation(async (path: string) => {
        if (path.includes('bad.md')) {
          throw new Error('Failed to read file')
        }
        return `---
title: Good Article
---
Content`
      })

      const articles = await service.loadAllArticles(vaultPath)

      // 應該只載入成功的文章
      expect(articles.length).toBe(1)
      expect(articles[0].title).toBe('Test Article')  // from mock
    })
  })

  describe('generateSlug', () => {
    it('should generate URL-safe slug from title', () => {
      expect(service.generateSlug('Hello World')).toBe('hello-world')
      expect(service.generateSlug('Test 123')).toBe('test-123')
      expect(service.generateSlug('Special!@#$%Characters')).toBe('specialcharacters')
      expect(service.generateSlug('Multiple   Spaces')).toBe('multiple-spaces')
      expect(service.generateSlug('  Trimmed  ')).toBe('trimmed')
    })
  })

  describe('saveArticle', () => {
    it('should save article to disk', async () => {
      const article: Article = {
        id: '1',
        title: 'Test Article',
        slug: 'test-article',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Test content',
        frontmatter: {
          title: 'Test Article',
          date: '2026-01-26',
          tags: ['test'],
          categories: ['Software']
        }
      }

      const result = await service.saveArticle(article)

      expect(result.success).toBe(true)
      expect(mockWriteFile).toHaveBeenCalledWith(
        article.filePath,
        expect.stringContaining('title: Test Article')
      )
    })

    it('should detect conflicts if not skipped', async () => {
      const article: Article = {
        id: '1',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: { title: 'Test' }
      }

      // Mock conflict detection
      mockDetectConflict.mockResolvedValueOnce({
        hasConflict: true,
        message: 'File modified externally'
      })

      const result = await service.saveArticle(article)

      expect(result.success).toBe(false)
      expect(result.conflict).toBe(true)
      expect(mockWriteFile).not.toHaveBeenCalled()
    })
  })

  describe('deleteArticle', () => {
    it('should delete article file', async () => {
      const article: Article = {
        id: '1',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: { title: 'Test' }
      }

      await service.deleteArticle(article)

      expect(mockDeleteFile).toHaveBeenCalledWith(article.filePath)
    })
  })

  describe('moveArticle', () => {
    it('should move article to new location', async () => {
      const article: Article = {
        id: '1',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: { title: 'Test' }
      }

      const newPath = '/vault/Publish/Software/test.md'
      const fileContent = '---\ntitle: Test\n---\nContent'

      mockReadFile.mockResolvedValue(fileContent)

      await service.moveArticle(article, newPath)

      expect(mockReadFile).toHaveBeenCalledWith(article.filePath)
      expect(mockWriteFile).toHaveBeenCalledWith(newPath, fileContent)
      expect(mockDeleteFile).toHaveBeenCalledWith(article.filePath)
    })
  })

  describe('validateArticle', () => {
    it('should validate article data', () => {
      const validArticle: Article = {
        id: '1',
        title: 'Test',
        slug: 'test',
        filePath: '/vault/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: { title: 'Test' }
      }

      const result = service.validateArticle(validArticle)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing title', () => {
      const invalidArticle: Article = {
        id: '1',
        title: '',
        slug: 'test',
        filePath: '/vault/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: { title: '' }
      }

      const result = service.validateArticle(invalidArticle)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('標題不能為空')
    })
  })
})
