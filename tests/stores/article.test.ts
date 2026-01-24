import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleStore } from '@/stores/article'
import { useConfigStore } from '@/stores/config'

// Mock the window.electronAPI
global.window = {
  electronAPI: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    getFileStats: vi.fn(),
    getConfig: vi.fn(),
    setConfig: vi.fn()
  }
} as any

describe('Article Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Setup config store with mock vault path
    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = '/mock/vault/path'
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup default mock implementations
    window.electronAPI.writeFile.mockResolvedValue(undefined)
    window.electronAPI.createDirectory.mockResolvedValue(undefined)
    window.electronAPI.getFileStats.mockResolvedValue(null)
  })

  it('should initialize with empty articles array', () => {
    const store = useArticleStore()
    expect(store.articles).toEqual([])
    expect(store.currentArticle).toBeNull()
  })

  it('should create a new article', async () => {
    const store = useArticleStore()
    const article = await store.createArticle('Test Article', 'Software')
    
    expect(article.title).toBe('Test Article')
    expect(article.category).toBe('Software')
    expect(article.status).toBe('draft')
    expect(store.articles).toHaveLength(1)
  })

  it('should generate slug from title', async () => {
    const store = useArticleStore()
    const article = await store.createArticle('Hello World Test', 'Software')
    
    expect(article.slug).toBe('hello-world-test')
  })

  it('should filter articles by status', async () => {
    const store = useArticleStore()
    await store.createArticle('Draft Article', 'Software')
    const publishedArticle = await store.createArticle('Published Article', 'growth')
    
    // Move one to published
    await store.moveToPublished(publishedArticle.id)
    
    expect(store.draftArticles).toHaveLength(1)
    expect(store.publishedArticles).toHaveLength(1)
  })
})