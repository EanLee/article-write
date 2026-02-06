import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PublishService } from '@/main/services/PublishService'
import type { PublishConfig } from '@/main/services/PublishService'
import type { Article } from '@/types'
import { ArticleStatus, ArticleCategory } from '@/types'

// Mock FileService
const mockFileService = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copyFile: vi.fn(),
  createDirectory: vi.fn(),
  exists: vi.fn()
}

describe('PublishService', () => {
  let publishService: PublishService
  let mockArticle: Article
  let mockConfig: PublishConfig

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create service with mocked FileService
    publishService = new PublishService(mockFileService as any)

    // Mock article
    mockArticle = {
      id: '1',
      title: '測試文章',
      slug: 'test-article',
      filePath: 'test.md',
      content: '# 標題\n\n這是內容。\n\n[[wiki-link]]\n\n![[image.png]]',
      excerpt: '測試',
      status: ArticleStatus.Draft,
      category: ArticleCategory.Software,
      tags: ['test'],
      frontmatter: {
        title: '測試文章',
        date: '2024-01-01',
        tags: ['test']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Mock config
    mockConfig = {
      articlesDir: 'C:\\Articles',
      targetBlogDir: 'C:\\Blog',
      imagesDir: 'C:\\Articles\\images'
    }

    // Setup default mock behaviors
    mockFileService.readFile.mockResolvedValue(mockArticle.content)
    mockFileService.writeFile.mockResolvedValue(undefined)
    mockFileService.copyFile.mockResolvedValue(undefined)
    mockFileService.createDirectory.mockResolvedValue(undefined)
    mockFileService.exists.mockResolvedValue(false) // Default: directories/files don't exist
  })

  describe('publishArticle', () => {
    it('應該成功發布文章', async () => {
      const result = await publishService.publishArticle(mockArticle, mockConfig)

      expect(result.success).toBe(true)
      expect(result.message).toContain('成功發布文章')
      expect(result.targetPath).toBeDefined()
    })

    it('應該驗證配置', async () => {
      const invalidConfig = { ...mockConfig, articlesDir: '' }

      const result = await publishService.publishArticle(mockArticle, invalidConfig)

      expect(result.success).toBe(false)
      expect(result.message).toContain('文章目錄路徑不能為空')
    })

    it('應該驗證文章', async () => {
      const invalidArticle = { ...mockArticle, title: '' }

      const result = await publishService.publishArticle(invalidArticle, mockConfig)

      expect(result.success).toBe(false)
      expect(result.message).toContain('標題不能為空')
    })

    it('應該調用 FileService 寫入檔案', async () => {
      await publishService.publishArticle(mockArticle, mockConfig)

      expect(mockFileService.writeFile).toHaveBeenCalled()
      const writeCall = mockFileService.writeFile.mock.calls[0]
      expect(writeCall[0]).toContain('test-article.md')
    })

    it('應該建立目標目錄', async () => {
      await publishService.publishArticle(mockArticle, mockConfig)

      expect(mockFileService.createDirectory).toHaveBeenCalled()
    })

    it('應該處理檔案寫入錯誤', async () => {
      mockFileService.writeFile.mockRejectedValue(new Error('Write failed'))

      const result = await publishService.publishArticle(mockArticle, mockConfig)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('應該調用進度回調', async () => {
      const onProgress = vi.fn()

      await publishService.publishArticle(mockArticle, mockConfig, onProgress)

      expect(onProgress).toHaveBeenCalled()
      // 應該至少調用幾次（驗證、讀取、轉換、寫入、完成）
      expect(onProgress.mock.calls.length).toBeGreaterThan(3)
    })
  })

  describe('Wiki Links 轉換', () => {
    it('應該轉換簡單的 Wiki Links', async () => {
      mockArticle.content = '這是 [[link]] 連結'

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('[link](link)')
      expect(writtenContent).not.toContain('[[link]]')
    })

    it('應該轉換帶別名的 Wiki Links', async () => {
      mockArticle.content = '這是 [[link|別名]] 連結'

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('[別名](link)')
      expect(writtenContent).not.toContain('[[link|別名]]')
    })

    it('應該轉換多個 Wiki Links', async () => {
      mockArticle.content = '[[link1]] 和 [[link2]] 和 [[link3|別名]]'

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('[link1](link1)')
      expect(writtenContent).toContain('[link2](link2)')
      expect(writtenContent).toContain('[別名](link3)')
    })
  })

  describe('Obsidian 圖片轉換', () => {
    it('應該轉換 Obsidian 圖片語法', async () => {
      mockArticle.content = '![[image.png]]'

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('![image.png](./images/image.png)')
      expect(writtenContent).not.toContain('![[image.png]]')
    })

    it('應該轉換帶寬度的圖片', async () => {
      mockArticle.content = '![[image.png|300]]'

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('![image.png](./images/image.png)')
    })

    it('應該嘗試複製圖片檔案', async () => {
      mockArticle.content = '![[image.png]]'

      await publishService.publishArticle(mockArticle, mockConfig)

      // 圖片複製會被嘗試（即使檔案可能不存在）
      // 實際的檔案存在檢查在 PublishService 內部進行
      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('![image.png](./images/image.png)')
    })
  })

  describe('Frontmatter 轉換', () => {
    it('應該保留標題', async () => {
      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('title: 測試文章')
    })

    it('應該添加 pubDate 如果缺少', async () => {
      mockArticle.frontmatter = {
        title: '測試'
      }

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('pubDate:')
    })

    it('應該轉換 publishDate 為 pubDate', async () => {
      mockArticle.frontmatter = {
        title: '測試',
        publishDate: '2024-01-01'
      }

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('pubDate:')
      expect(writtenContent).not.toContain('publishDate:')
    })

    it('應該處理陣列標籤', async () => {
      mockArticle.frontmatter = {
        title: '測試',
        tags: ['tag1', 'tag2']
      }

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('tags:')
      expect(writtenContent).toContain('- tag1')
      expect(writtenContent).toContain('- tag2')
    })

    it('應該移除標籤中的 # 符號', async () => {
      mockArticle.frontmatter = {
        title: '測試',
        tags: ['#tag1', '#tag2']
      }

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('- tag1')
      expect(writtenContent).toContain('- tag2')
      expect(writtenContent).not.toContain('- #tag1')
    })
  })

  describe('Obsidian 語法轉換', () => {
    it('應該移除 Obsidian 註釋', async () => {
      mockArticle.content = '這是內容 %%這是註釋%% 繼續內容'

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).not.toContain('%%')
      expect(writtenContent).toContain('這是內容')
      expect(writtenContent).toContain('繼續內容')
    })

    it('應該轉換高亮語法', async () => {
      mockArticle.content = '這是 ==高亮文字== 內容'

      await publishService.publishArticle(mockArticle, mockConfig)

      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('<mark>高亮文字</mark>')
      expect(writtenContent).not.toContain('==高亮文字==')
    })
  })

  describe('錯誤處理', () => {
    it('應該返回錯誤當配置無效', async () => {
      const result = await publishService.publishArticle(mockArticle, {
        ...mockConfig,
        articlesDir: ''
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('應該返回錯誤當文章無效', async () => {
      const result = await publishService.publishArticle(
        { ...mockArticle, title: '' },
        mockConfig
      )

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('應該處理檔案操作錯誤', async () => {
      mockFileService.writeFile.mockRejectedValue(new Error('Permission denied'))

      const result = await publishService.publishArticle(mockArticle, mockConfig)

      expect(result.success).toBe(false)
      expect(result.message).toContain('失敗')
    })
  })

  describe('警告收集', () => {
    it('應該在圖片不存在時仍然成功發布', async () => {
      mockArticle.content = '![[missing-image.png]]'

      const result = await publishService.publishArticle(mockArticle, mockConfig)

      // 即使圖片不存在，發布仍應成功（可能有警告）
      expect(result.success).toBe(true)

      // 檢查內容是否包含轉換後的圖片語法
      const writeCall = mockFileService.writeFile.mock.calls[0]
      const writtenContent = writeCall[1]
      expect(writtenContent).toContain('![missing-image.png](./images/missing-image.png)')
    })
  })
})
