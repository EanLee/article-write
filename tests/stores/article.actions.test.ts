/**
 * Article Store Actions 補強測試
 * Q-05：補強 articleStore 主要 actions 覆蓋率
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleStore } from '@/stores/article'
import { useConfigStore } from '@/stores/config'
import type { Article } from '@/types'
import { ArticleStatus } from '@/types'

const mockElectronAPI = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  readDirectory: vi.fn(),
  createDirectory: vi.fn(),
  getFileStats: vi.fn(),
  getConfig: vi.fn(),
  setConfig: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'test-id',
    title: '測試文章',
    slug: 'test-article',
    content: '內容',
    filePath: '/vault/Drafts/Software/test-article.md',
    category: 'Software',
    status: ArticleStatus.Draft,
    frontmatter: { title: '測試文章' },
    lastModified: new Date(),
    ...overrides,
  }
}

describe('Article Store — Actions 補強', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // 設定 configStore
    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = '/vault'

    mockElectronAPI.writeFile.mockResolvedValue(undefined)
    mockElectronAPI.createDirectory.mockResolvedValue(undefined)
    mockElectronAPI.getFileStats.mockResolvedValue(null)
    mockElectronAPI.getConfig.mockResolvedValue({
      paths: { articlesDir: '/vault', targetBlog: '', imagesDir: '' },
      editorConfig: { autoSave: true, autoSaveInterval: 30000, theme: 'light' },
    })
  })

  describe('setCurrentArticle', () => {
    it('設定當前文章後 currentArticle 更新', () => {
      const store = useArticleStore()
      const article = makeArticle()
      store.articles.push(article)

      store.setCurrentArticle(article)

      expect(store.currentArticle?.id).toBe('test-id')
    })

    it('設定 null 時 currentArticle 變為 null', () => {
      const store = useArticleStore()
      const article = makeArticle()
      store.setCurrentArticle(article)

      store.setCurrentArticle(null)

      expect(store.currentArticle).toBeNull()
    })

    it('切換文章時不崩潰（前一篇文章自動儲存觸發）', () => {
      const store = useArticleStore()
      const article1 = makeArticle({ id: 'a1', filePath: '/vault/Drafts/Software/a1.md' })
      const article2 = makeArticle({ id: 'a2', filePath: '/vault/Drafts/Software/a2.md' })
      store.articles.push(article1, article2)

      store.setCurrentArticle(article1)
      // 不應拋出例外
      expect(() => store.setCurrentArticle(article2)).not.toThrow()
      expect(store.currentArticle?.id).toBe('a2')
    })
  })

  describe('updateFilter', () => {
    it('更新 status filter', () => {
      const store = useArticleStore()

      store.updateFilter({ status: ArticleStatus.Published })

      expect(store.filter.status).toBe(ArticleStatus.Published)
    })

    it('部分更新 filter 時保留其他欄位', () => {
      const store = useArticleStore()
      // 先設定 category
      store.updateFilter({ category: 'Software' })

      // 只更新 status
      store.updateFilter({ status: ArticleStatus.Draft })

      expect(store.filter.category).toBe('Software')
      expect(store.filter.status).toBe(ArticleStatus.Draft)
    })

    it('更新 search 關鍵字', () => {
      const store = useArticleStore()

      store.updateFilter({ search: '關鍵字' })

      expect(store.filter.search).toBe('關鍵字')
    })
  })

  describe('saveCurrentArticle', () => {
    it('無 currentArticle 時不拋出錯誤', async () => {
      const store = useArticleStore()
      expect(store.currentArticle).toBeNull()

      await expect(store.saveCurrentArticle()).resolves.not.toThrow()
    })

    it('有 currentArticle 時呼叫 writeFile', async () => {
      const store = useArticleStore()
      const article = makeArticle()
      store.articles.push(article)
      store.setCurrentArticle(article)

      await store.saveCurrentArticle()

      expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
        article.filePath,
        expect.any(String)
      )
    })
  })
})
