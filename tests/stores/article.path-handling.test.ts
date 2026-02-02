/**
 * Article Store - 路徑處理測試
 * 專門測試 Windows 路徑格式不一致問題，確保不會產生重複文章
 *
 * Bug 參考: docs/fix-bug/2026-01-26-article-list-issues-root-cause.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleStore } from '@/stores/article'
import { useConfigStore } from '@/stores/config'
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
    onFileChange: vi.fn()
  }
} as any

describe.skip('Article Store - 路徑處理測試 (需要重構)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = 'C:/test/vault'

    vi.clearAllMocks()

    // 預設成功的 mock 實作
    window.electronAPI.writeFile.mockResolvedValue(undefined)
    window.electronAPI.createDirectory.mockResolvedValue(undefined)
    window.electronAPI.getFileStats.mockResolvedValue({
      isDirectory: false,
      mtime: new Date('2024-01-01').getTime()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('路徑格式一致性', () => {
    it('loadArticles 應該使用正斜線格式的路徑', async () => {
      // Mock 檔案系統
      window.electronAPI.getFileStats.mockImplementation(async (path: string) => {
        if (path.includes('Drafts') || path.includes('Software')) {
          return { isDirectory: true, mtime: Date.now() }
        }
        return { isDirectory: false, mtime: Date.now() }
      })

      window.electronAPI.readDirectory.mockImplementation(async (path: string) => {
        if (path.includes('Drafts')) {
          return ['Software']
        }
        if (path.includes('Software')) {
          return ['test-article.md']
        }
        return []
      })

      window.electronAPI.readFile.mockResolvedValue(`---
title: Test Article
---
Content`)

      const store = useArticleStore()
      await store.loadArticles()

      expect(store.articles).toHaveLength(1)
      const article = store.articles[0]

      // 驗證路徑使用正斜線
      expect(article.filePath).toMatch(/^C:\/test\/vault\/Drafts\/Software\/test-article\.md$/)
      expect(article.filePath).not.toContain('\\')
    })
  })

  describe('reloadArticleByPath - 不同路徑格式的處理', () => {
    it('應該正確更新現有文章（正斜線路徑）', async () => {
      const store = useArticleStore()

      // 手動建立一個文章（模擬 loadArticles 載入的結果）
      store.articles.push({
        id: 'test-id-123',
        title: 'Original Title',
        slug: 'test-article',
        filePath: 'C:/test/vault/Drafts/Software/test-article.md', // 正斜線
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date('2024-01-01'),
        content: 'Original content',
        frontmatter: {
          title: 'Original Title',
          date: '2024-01-01',
          tags: [],
          categories: ['Software']
        }
      })

      // Mock 檔案讀取（更新後的內容）
      window.electronAPI.readFile.mockResolvedValue(`---
title: Updated Title
---
Updated content`)

      window.electronAPI.getFileStats.mockResolvedValue({
        isDirectory: false,
        mtime: new Date('2024-01-02').getTime()
      })

      // 使用正斜線路徑呼叫 reloadArticleByPath
      await store['reloadArticleByPath'](
        'C:/test/vault/Drafts/Software/test-article.md',
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      // 驗證：應該更新現有文章，不應該新增
      expect(store.articles).toHaveLength(1)
      expect(store.articles[0].id).toBe('test-id-123') // ID 不變
      expect(store.articles[0].title).toBe('Updated Title')
      expect(store.articles[0].content).toBe('\nUpdated content')
    })

    it('應該正確更新現有文章（反斜線路徑）', async () => {
      const store = useArticleStore()

      // 手動建立一個文章（正斜線格式）
      store.articles.push({
        id: 'test-id-456',
        title: 'Original Title',
        slug: 'test-article',
        filePath: 'C:/test/vault/Drafts/Software/test-article.md', // 正斜線
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date('2024-01-01'),
        content: 'Original content',
        frontmatter: {
          title: 'Original Title',
          date: '2024-01-01',
          tags: [],
          categories: ['Software']
        }
      })

      window.electronAPI.readFile.mockResolvedValue(`---
title: Updated Title
---
Updated content`)

      window.electronAPI.getFileStats.mockResolvedValue({
        isDirectory: false,
        mtime: new Date('2024-01-02').getTime()
      })

      // ⚠️ 關鍵測試：使用反斜線路徑呼叫（模擬 Windows 檔案監聽）
      await store['reloadArticleByPath'](
        'C:\\test\\vault\\Drafts\\Software\\test-article.md', // 反斜線！
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      // 驗證：應該正確找到並更新現有文章，不應該新增重複文章
      expect(store.articles).toHaveLength(1) // ✅ 關鍵：不應該是 2
      expect(store.articles[0].id).toBe('test-id-456') // ID 不變
      expect(store.articles[0].title).toBe('Updated Title')
    })

    it('應該正確處理混合斜線的路徑', async () => {
      const store = useArticleStore()

      store.articles.push({
        id: 'test-id-789',
        title: 'Original Title',
        slug: 'test-article',
        filePath: 'C:/test/vault/Drafts/Software/test-article.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date('2024-01-01'),
        content: 'Original content',
        frontmatter: {
          title: 'Original Title',
          date: '2024-01-01',
          tags: [],
          categories: ['Software']
        }
      })

      window.electronAPI.readFile.mockResolvedValue(`---
title: Updated Title
---
Updated content`)

      window.electronAPI.getFileStats.mockResolvedValue({
        isDirectory: false,
        mtime: new Date('2024-01-02').getTime()
      })

      // 混合斜線
      await store['reloadArticleByPath'](
        'C:\\test/vault\\Drafts/Software\\test-article.md',
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      expect(store.articles).toHaveLength(1)
      expect(store.articles[0].id).toBe('test-id-789')
    })

    it('應該新增真正不存在的文章', async () => {
      const store = useArticleStore()

      // 已有一篇文章
      store.articles.push({
        id: 'existing-id',
        title: 'Existing Article',
        slug: 'existing',
        filePath: 'C:/test/vault/Drafts/Software/existing.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date('2024-01-01'),
        content: 'Content',
        frontmatter: { title: 'Existing Article', date: '2024-01-01', tags: [], categories: ['Software'] }
      })

      window.electronAPI.readFile.mockResolvedValue(`---
title: New Article
---
New content`)

      window.electronAPI.getFileStats.mockResolvedValue({
        isDirectory: false,
        mtime: new Date('2024-01-02').getTime()
      })

      // 載入一篇真的不存在的文章
      await store['reloadArticleByPath'](
        'C:/test/vault/Drafts/Software/new-article.md',
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      // 應該新增文章
      expect(store.articles).toHaveLength(2)
      expect(store.articles[1].title).toBe('New Article')
    })
  })

  describe('removeArticleByPath - 路徑格式處理', () => {
    it('應該能用反斜線路徑刪除正斜線路徑的文章', () => {
      const store = useArticleStore()

      store.articles.push({
        id: 'remove-test-id',
        title: 'To Be Removed',
        slug: 'remove-test',
        filePath: 'C:/test/vault/Drafts/Software/remove-test.md', // 正斜線
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: '',
        frontmatter: { title: 'To Be Removed', date: '2024-01-01', tags: [], categories: ['Software'] }
      })

      // 使用反斜線路徑刪除
      store['removeArticleByPath']('C:\\test\\vault\\Drafts\\Software\\remove-test.md')

      // 應該成功刪除
      expect(store.articles).toHaveLength(0)
    })
  })

  describe('防止重複文章產生', () => {
    it('連續多次 reload 相同文章不應產生重複', async () => {
      const store = useArticleStore()

      // 初始文章
      store.articles.push({
        id: 'original-id',
        title: 'Article',
        slug: 'article',
        filePath: 'C:/test/vault/Drafts/Software/article.md',
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date('2024-01-01'),
        content: 'Content',
        frontmatter: { title: 'Article', date: '2024-01-01', tags: [], categories: ['Software'] }
      })

      window.electronAPI.readFile.mockResolvedValue(`---
title: Article
---
Content`)

      window.electronAPI.getFileStats.mockResolvedValue({
        isDirectory: false,
        mtime: new Date('2024-01-02').getTime()
      })

      // 模擬多次檔案監聽觸發（使用不同路徑格式）
      await store['reloadArticleByPath'](
        'C:/test/vault/Drafts/Software/article.md',
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      await store['reloadArticleByPath'](
        'C:\\test\\vault\\Drafts\\Software\\article.md', // 反斜線
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      await store['reloadArticleByPath'](
        'C:/test\\vault/Drafts\\Software/article.md', // 混合
        ArticleStatus.Draft,
        ArticleCategory.Software
      )

      // 應該始終只有一篇文章
      expect(store.articles).toHaveLength(1)
      expect(store.articles[0].id).toBe('original-id')
    })
  })
})
