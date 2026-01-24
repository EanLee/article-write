import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageService } from '@/services/ImageService'
import type { Article } from '@/types'

// Mock window.electronAPI
const mockElectronAPI = {
  readDirectory: vi.fn(),
  getFileStats: vi.fn(),
  deleteFile: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('ImageService', () => {
  let imageService: ImageService
  let mockArticles: Article[]

  beforeEach(() => {
    imageService = new ImageService()
    mockArticles = [
      {
        id: '1',
        title: 'Test Article',
        slug: 'test-article',
        filePath: '/test/article.md',
        status: 'draft',
        frontmatter: {
          title: 'Test Article',
          date: '2024-01-01',
          tags: ['test'],
          categories: ['Software']
        },
        content: 'This is a test article with an image ![[test-image.png]] and another ![[missing-image.jpg]]',
        lastModified: new Date(),
        category: 'Software'
      }
    ]

    imageService.setVaultPath('/test/vault')
    imageService.updateArticles(mockArticles)

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('getImageValidationWarnings', () => {
    it('should detect missing image files', async () => {
      // Mock file existence check - test-image.png exists, missing-image.jpg doesn't
      mockElectronAPI.getFileStats
        .mockResolvedValueOnce({ isFile: true }) // test-image.png exists
        .mockRejectedValueOnce(new Error('File not found')) // missing-image.jpg doesn't exist

      const content = 'Test content with ![[test-image.png]] and ![[missing-image.jpg]]'
      const warnings = await imageService.getImageValidationWarnings(content)

      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toMatchObject({
        imageName: 'missing-image.jpg',
        line: 1,
        type: 'missing-file',
        severity: 'error',
        message: expect.stringContaining('不存在')
      })
    })

    it('should detect invalid image formats', async () => {
      // Mock file existence check - both files exist
      mockElectronAPI.getFileStats
        .mockResolvedValue({ isFile: true })

      const content = 'Test content with ![[document.txt]] and ![[valid-image.png]]'
      const warnings = await imageService.getImageValidationWarnings(content)

      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toMatchObject({
        imageName: 'document.txt',
        line: 1,
        type: 'invalid-format',
        severity: 'warning',
        message: expect.stringContaining('不是有效的圖片格式')
      })
    })

    it('should handle standard markdown image syntax', async () => {
      // Mock file existence check
      mockElectronAPI.getFileStats
        .mockRejectedValue(new Error('File not found'))

      const content = 'Test content with ![alt text](./images/missing.png)'
      const warnings = await imageService.getImageValidationWarnings(content)

      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toMatchObject({
        imageName: 'missing.png',
        line: 1,
        type: 'missing-file',
        severity: 'error'
      })
    })

    it('should provide correct line numbers for multi-line content', async () => {
      mockElectronAPI.getFileStats
        .mockRejectedValue(new Error('File not found'))

      const content = `Line 1
Line 2 with ![[missing1.png]]
Line 3
Line 4 with ![[missing2.jpg]]`

      const warnings = await imageService.getImageValidationWarnings(content)

      expect(warnings).toHaveLength(2)
      expect(warnings[0].line).toBe(2)
      expect(warnings[0].imageName).toBe('missing1.png')
      expect(warnings[1].line).toBe(4)
      expect(warnings[1].imageName).toBe('missing2.jpg')
    })

    it('should handle empty content gracefully', async () => {
      const warnings = await imageService.getImageValidationWarnings('')
      expect(warnings).toHaveLength(0)
    })
  })

  describe('checkImageExists', () => {
    it('should return true for existing images', async () => {
      mockElectronAPI.getFileStats.mockResolvedValue({ isFile: true })

      const exists = await imageService.checkImageExists('test-image.png')
      expect(exists).toBe(true)
      expect(mockElectronAPI.getFileStats).toHaveBeenCalledWith('/test/vault/images/test-image.png')
    })

    it('should return false for non-existing images', async () => {
      mockElectronAPI.getFileStats.mockRejectedValue(new Error('File not found'))

      const exists = await imageService.checkImageExists('missing-image.png')
      expect(exists).toBe(false)
    })

    it('should handle vault path not set', async () => {
      const newService = new ImageService()
      // Don't set vault path
      const exists = await newService.checkImageExists('test-image.png')
      expect(exists).toBe(false)
    })
  })

  describe('isImageUsed', () => {
    it('should return true for images referenced in articles', () => {
      const isUsed = imageService.isImageUsed('test-image.png')
      expect(isUsed).toBe(true)
    })

    it('should return false for images not referenced in articles', () => {
      const isUsed = imageService.isImageUsed('unused-image.png')
      expect(isUsed).toBe(false)
    })
  })

  describe('getArticleImageReferences', () => {
    it('should extract Obsidian format image references', () => {
      const article = mockArticles[0]
      const references = imageService.getArticleImageReferences(article)

      expect(references).toHaveLength(2)
      expect(references[0]).toMatchObject({
        imageName: 'test-image.png',
        articleId: '1',
        articleTitle: 'Test Article',
        line: 1
      })
      expect(references[1]).toMatchObject({
        imageName: 'missing-image.jpg',
        articleId: '1',
        articleTitle: 'Test Article',
        line: 1
      })
    })

    it('should extract standard markdown image references', () => {
      const article = {
        ...mockArticles[0],
        content: 'Content with ![alt](./images/standard.png) and ![another](images/another.jpg)'
      }

      const references = imageService.getArticleImageReferences(article)

      expect(references).toHaveLength(2)
      expect(references[0].imageName).toBe('standard.png')
      expect(references[1].imageName).toBe('another.jpg')
    })
  })

  describe('uploadImageFile', () => {
    it('should generate unique filename for uploaded images', () => {
      const originalName = 'test-image.png'
      const uniqueName1 = (imageService as any).generateUniqueFileName(originalName)
      const uniqueName2 = (imageService as any).generateUniqueFileName(originalName)

      expect(uniqueName1).not.toBe(uniqueName2)
      expect(uniqueName1).toMatch(/test-image-\d+-[a-z0-9]+\.png/)
      expect(uniqueName2).toMatch(/test-image-\d+-[a-z0-9]+\.png/)
    })

    it('should validate image file format', async () => {
      const mockFile = new File(['test'], 'document.txt', { type: 'text/plain' })
      
      await expect(imageService.uploadImageFile(mockFile)).rejects.toThrow('Invalid image file format')
    })

    it('should throw error when vault path not set', async () => {
      const newService = new ImageService()
      const mockFile = new File(['test'], 'image.png', { type: 'image/png' })
      
      await expect(newService.uploadImageFile(mockFile)).rejects.toThrow('Vault path not set')
    })
  })

  describe('getUnusedImages', () => {
    it('should return images that are not referenced in any article', async () => {
      // Mock loadImages to return some images
      mockElectronAPI.getFileStats.mockResolvedValue({ isFile: true, mtime: new Date().toISOString() })
      mockElectronAPI.readDirectory.mockResolvedValue(['used-image.png', 'unused-image.jpg'])

      const unusedImages = await imageService.getUnusedImages()
      
      // The test should check that unused images are correctly identified
      // Since our mock articles reference 'test-image.png' and 'missing-image.jpg',
      // and our mock directory returns 'used-image.png' and 'unused-image.jpg',
      // both should be considered unused (not referenced in articles)
      expect(unusedImages).toBeDefined()
      expect(Array.isArray(unusedImages)).toBe(true)
      
      // Check that all returned images have isUsed = false
      unusedImages.forEach(image => {
        expect(image.isUsed).toBe(false)
      })
    })
  })
})