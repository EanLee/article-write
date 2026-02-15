/**
 * 檔案操作相關測試
 * 測試所有與檔案讀寫相關的功能，確保資料不會遺失或損壞
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleStore } from '@/stores/article'
import { useConfigStore } from '@/stores/config'
import type { Article } from '@/types'
import { ArticleStatus, ArticleCategory } from '@/types'

// Mock 全域 electronAPI
global.window = {
  electronAPI: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    getFileStats: vi.fn(),
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    watchDirectory: vi.fn(),
    unwatchDirectory: vi.fn(),
    startFileWatching: vi.fn().mockResolvedValue(undefined),
    stopFileWatching: vi.fn().mockResolvedValue(undefined),
    onFileChange: vi.fn(() => vi.fn()) // Returns unsubscribe function
  }
} as any

describe('Article Store - 檔案操作測試', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = '/test/vault'

    vi.clearAllMocks()

    // 預設成功的 mock 實作
    window.electronAPI.writeFile.mockResolvedValue(undefined)
    window.electronAPI.deleteFile.mockResolvedValue(undefined)
    window.electronAPI.createDirectory.mockResolvedValue(undefined)
    window.electronAPI.getFileStats.mockResolvedValue({
      isDirectory: false,
      mtime: new Date('2024-01-01').getTime()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadArticles - 載入文章', () => {
    it('應該正確載入包含系列資訊的文章', async () => {
      // Mock 檔案系統結構
      window.electronAPI.getFileStats.mockImplementation(async (path: string) => {
        if (path === '/test/vault/Software') {
          return { isDirectory: true, mtime: Date.now() }
        }
        return { isDirectory: false, mtime: Date.now() }
      })

      window.electronAPI.readDirectory.mockImplementation(async (path: string) => {
        if (path === '/test/vault') {
          return ['Software']
        }
        if (path === '/test/vault/Software') {
          return ['test-article.md']
        }
        return []
      })

      window.electronAPI.readFile.mockResolvedValue(`---
title: Test Article
description: Test Description
date: 2024-01-01
tags:
  - test
  - vitest
categories:
  - Software
series: Vue 3 進階教學
seriesOrder: 3
---

Test content here`)

      const store = useArticleStore()
      await store.loadArticles()

      expect(store.articles).toHaveLength(1)
      const article = store.articles[0]
      expect(article.frontmatter.series).toBe('Vue 3 進階教學')
      expect(article.frontmatter.seriesOrder).toBe(3)
      expect(article.content).toBe('Test content here')
    })

    it('應該正確載入沒有系列資訊的文章', async () => {
      window.electronAPI.getFileStats.mockImplementation(async (path: string) => {
        if (path === '/test/vault/Software') {
          return { isDirectory: true, mtime: Date.now() }
        }
        return { isDirectory: false, mtime: Date.now() }
      })

      window.electronAPI.readDirectory.mockImplementation(async (path: string) => {
        if (path === '/test/vault') {
          return ['Software']
        }
        if (path === '/test/vault/Software') {
          return ['no-series.md']
        }
        return []
      })

      window.electronAPI.readFile.mockResolvedValue(`---
title: No Series Article
date: 2024-01-01
tags: []
categories: []
---

Content without series`)

      const store = useArticleStore()
      await store.loadArticles()

      expect(store.articles).toHaveLength(1)
      const article = store.articles[0]
      expect(article.frontmatter.series).toBeUndefined()
      expect(article.frontmatter.seriesOrder).toBeUndefined()
    })

    it('當檔案讀取失敗時應該繼續載入其他文章', async () => {
      window.electronAPI.getFileStats.mockImplementation(async (path: string) => {
        if (path === '/test/vault/Software') {
          return { isDirectory: true, mtime: Date.now() }
        }
        return { isDirectory: false, mtime: Date.now() }
      })

      window.electronAPI.readDirectory.mockImplementation(async (path: string) => {
        if (path === '/test/vault') {
          return ['Software']
        }
        if (path === '/test/vault/Software') {
          return ['good.md', 'bad.md', 'another-good.md']
        }
        return []
      })

      window.electronAPI.readFile.mockImplementation(async (path: string) => {
        if (path.includes('bad.md')) {
          throw new Error('Read error')
        }
        return `---
title: Good Article
date: 2024-01-01
tags: []
categories: []
---

Content`
      })

      const store = useArticleStore()
      await store.loadArticles()

      // 應該載入 2 篇文章（跳過 bad.md）
      expect(store.articles).toHaveLength(2)
    })
  })

  describe('saveArticle - 儲存文章', () => {
    it('應該正確儲存包含系列資訊的文章', async () => {
      const store = useArticleStore()

      const article: Article = {
        id: 'test-1',
        title: 'Test Article',
        slug: 'test-article',
        filePath: '/test/vault/Drafts/Software/test-article.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Test content',
        frontmatter: {
          title: 'Test Article',
          date: '2024-01-01',
          tags: ['test'],
          categories: ['Software'],
          series: 'Vue 3 進階教學',
          seriesOrder: 3
        }
      }

      // 手動添加到 store（模擬已載入的文章）
      store.articles.push(article)

      await store.saveArticle(article)

      expect(window.electronAPI.writeFile).toHaveBeenCalledOnce()
      const [filePath, content] = window.electronAPI.writeFile.mock.calls[0]

      expect(filePath).toBe('/test/vault/Drafts/Software/test-article.md')
      expect(content).toContain('series: Vue 3 進階教學')
      expect(content).toContain('seriesOrder: 3')
      expect(content).toContain('Test content')
    })

    it('應該保留所有 frontmatter 欄位', async () => {
      const store = useArticleStore()

      const article: Article = {
        id: 'test-2',
        title: 'Full Frontmatter Test',
        slug: 'full-frontmatter-test',
        filePath: '/test/vault/Drafts/Software/full-frontmatter-test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: {
          title: 'Full Frontmatter Test',
          description: 'Test Description',
          date: '2024-01-01',
          lastmod: '2024-01-02',
          tags: ['tag1', 'tag2'],
          categories: ['Software', 'Tutorial'],
          slug: 'custom-slug',
          keywords: ['keyword1', 'keyword2'],
          series: 'Test Series',
          seriesOrder: 1
        }
      }

      store.articles.push(article)
      await store.saveArticle(article)

      const [, content] = window.electronAPI.writeFile.mock.calls[0]

      // 驗證所有欄位都被保存
      expect(content).toContain('title: Full Frontmatter Test')
      expect(content).toContain('description: Test Description')
      expect(content).toContain('date: \'2024-01-01\'')
      expect(content).toContain('lastmod: \'2024-01-02\'')
      expect(content).toContain('tag1')
      expect(content).toContain('tag2')
      expect(content).toContain('Software')
      expect(content).toContain('Tutorial')
      expect(content).toContain('slug: custom-slug')
      expect(content).toContain('keyword1')
      expect(content).toContain('keyword2')
      expect(content).toContain('series: Test Series')
      expect(content).toContain('seriesOrder: 1')
    })

    it('更新文章後應該更新 store 中的資料', async () => {
      const store = useArticleStore()

      const article: Article = {
        id: 'test-3',
        title: 'Original Title',
        slug: 'original',
        filePath: '/test/vault/Drafts/Software/original.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date('2024-01-01'),
        content: 'Original content',
        frontmatter: {
          title: 'Original Title',
          date: '2024-01-01',
          tags: [],
          categories: []
        }
      }

      store.articles.push(article)

      // 更新文章
      article.title = 'Updated Title'
      article.content = 'Updated content'
      article.frontmatter.title = 'Updated Title'

      await store.saveArticle(article)

      // 檢查 store 中的資料已更新
      expect(store.articles[0].title).toBe('Updated Title')
      expect(store.articles[0].content).toBe('Updated content')
      // lastModified 應該被更新
      expect(store.articles[0].lastModified.getTime()).toBeGreaterThan(
        new Date('2024-01-01').getTime()
      )
    })

    it('寫入檔案失敗時應該拋出錯誤', async () => {
      const store = useArticleStore()

      const article: Article = {
        id: 'test-4',
        title: 'Test',
        slug: 'test',
        filePath: '/test/vault/Drafts/Software/test.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: {
          title: 'Test',
          date: '2024-01-01',
          tags: [],
          categories: []
        }
      }

      store.articles.push(article)

      // Mock 寫入失敗
      window.electronAPI.writeFile.mockRejectedValue(new Error('Write failed'))

      await expect(store.saveArticle(article)).rejects.toThrow()
    })
  })

  describe('createArticle - 創建文章', () => {
    it('應該創建新文章並寫入檔案', async () => {
      const store = useArticleStore()

      const article = await store.createArticle('New Article', 'Software')

      expect(window.electronAPI.writeFile).toHaveBeenCalledOnce()
      expect(article.title).toBe('New Article')
      expect(article.category).toBe('Software')
      expect(article.status).toBe('draft')
      expect(store.articles).toHaveLength(1)
      expect(store.articles[0].id).toBe(article.id)
    })

    it('創建的文章應該包含完整的 frontmatter 結構', async () => {
      const store = useArticleStore()

      await store.createArticle('Complete Frontmatter', 'growth')

      const [, content] = window.electronAPI.writeFile.mock.calls[0]

      expect(content).toContain('---')
      expect(content).toContain('title: Complete Frontmatter')
      expect(content).toContain('date:')
      expect(content).toContain('categories:')
      expect(content).toContain('growth')
    })

    it('創建檔案失敗時應該拋出錯誤', async () => {
      const store = useArticleStore()

      window.electronAPI.writeFile.mockRejectedValue(new Error('Create failed'))

      await expect(
        store.createArticle('Fail Article', 'Software')
      ).rejects.toThrow('Create failed')
    })
  })

  describe('deleteArticle - 刪除文章', () => {
    it('應該刪除文章檔案並從 store 移除', async () => {
      const store = useArticleStore()

      const article: Article = {
        id: 'delete-test',
        title: 'To Delete',
        slug: 'to-delete',
        filePath: '/test/vault/Drafts/Software/to-delete.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Will be deleted',
        frontmatter: {
          title: 'To Delete',
          date: '2024-01-01',
          tags: [],
          categories: []
        }
      }

      store.articles.push(article)
      expect(store.articles).toHaveLength(1)

      await store.deleteArticle('delete-test')

      expect(window.electronAPI.deleteFile).toHaveBeenCalledWith(
        '/test/vault/Drafts/Software/to-delete.md'
      )
      expect(store.articles).toHaveLength(0)
    })

    it('刪除檔案失敗時應該拋出錯誤', async () => {
      const store = useArticleStore()

      const article: Article = {
        id: 'delete-fail',
        title: 'Delete Fail',
        slug: 'delete-fail',
        filePath: '/test/vault/Drafts/Software/delete-fail.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content',
        frontmatter: {
          title: 'Delete Fail',
          date: '2024-01-01',
          tags: [],
          categories: []
        }
      }

      store.articles.push(article)

      window.electronAPI.deleteFile.mockRejectedValue(new Error('Delete failed'))

      await expect(store.deleteArticle('delete-fail')).rejects.toThrow('Delete failed')
    })
  })

  describe('toggleStatus - 切換發布狀態', () => {
    it('應該更新 frontmatter status 並保持檔案位置不變', async () => {
      const store = useArticleStore()

      // Mock readFile 以模擬讀取原始檔案（saveArticle 內部會讀取）
      window.electronAPI.readFile.mockResolvedValue(`---
title: To Publish
date: 2024-01-01
status: draft
tags: []
categories:
  - Software
---

Content to publish`)

      const article: Article = {
        id: 'move-test',
        title: 'To Publish',
        slug: 'to-publish',
        filePath: '/test/vault/Software/to-publish.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Content to publish',
        frontmatter: {
          title: 'To Publish',
          date: '2024-01-01',
          status: ArticleStatus.Draft,
          tags: [],
          categories: ['Software']
        }
      }

      store.articles.push(article)

      await store.toggleStatus('move-test')

      // 應該寫入同一個路徑（不移動檔案）
      expect(window.electronAPI.writeFile).toHaveBeenCalled()
      const [writtenPath, writtenContent] = window.electronAPI.writeFile.mock.calls[0]
      expect(writtenPath).toBe('/test/vault/Software/to-publish.md')

      // 應該寫入 published status
      expect(writtenContent).toContain('status: published')

      // 不應該刪除檔案
      expect(window.electronAPI.deleteFile).not.toHaveBeenCalled()

      // 應該更新 store 中的文章狀態
      expect(store.articles[0].status).toBe(ArticleStatus.Published)
      expect(store.articles[0].filePath).toBe('/test/vault/Software/to-publish.md')
    })
  })

  describe('setCurrentArticle - 切換文章', () => {
    it('切換文章時不應該意外儲存未修改的文章', async () => {
      const store = useArticleStore()

      const article1: Article = {
        id: 'article-1',
        title: 'Article 1',
        slug: 'article-1',
        filePath: '/test/vault/Drafts/Software/article-1.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Original content 1',
        frontmatter: {
          title: 'Article 1',
          date: '2024-01-01',
          tags: [],
          categories: []
        }
      }

      const article2: Article = {
        id: 'article-2',
        title: 'Article 2',
        slug: 'article-2',
        filePath: '/test/vault/Drafts/Software/article-2.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: 'Original content 2',
        frontmatter: {
          title: 'Article 2',
          date: '2024-01-01',
          tags: [],
          categories: []
        }
      }

      store.articles.push(article1, article2)

      // 設置第一篇文章為當前文章
      store.setCurrentArticle(article1)

      // 清除 mock 計數
      vi.clearAllMocks()

      // 切換到第二篇文章（沒有修改第一篇）
      store.setCurrentArticle(article2)

      // 不應該調用 writeFile（因為沒有修改）
      expect(window.electronAPI.writeFile).not.toHaveBeenCalled()
    })
  })
})
