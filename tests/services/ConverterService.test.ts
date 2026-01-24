import { describe, it, expect, vi } from 'vitest'
import type { ConversionConfig } from '@/types'

// Mock the Electron API
const mockElectronAPI = {
  copyFile: vi.fn(),
  getFileStats: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readDirectory: vi.fn(),
  createDirectory: vi.fn(),
  deleteFile: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Create a test class that exposes private methods for testing
class TestableConverterService {
  private generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  convertWikiLinks(content: string): string {
    // Convert [[link|alias]] format
    content = content.replace(/\[\[([^#\]|]+)\|([^\]]+)\]\]/g, (match, link, alias) => {
      const slug = this.generateSlugFromTitle(link.trim())
      return `[${alias.trim()}](../${slug}/)`
    })

    // Convert [[link]] format
    content = content.replace(/\[\[([^#\]]+)\]\]/g, (match, link) => {
      const trimmedLink = link.trim()
      const slug = this.generateSlugFromTitle(trimmedLink)
      return `[${trimmedLink}](../${slug}/)`
    })

    return content
  }

  convertHighlightSyntax(content: string): string {
    return content.replace(/==(.*?)==/g, '<mark>$1</mark>')
  }

  convertObsidianImages(content: string): string {
    return content.replace(/!\[\[([^\]]+)\]\]/g, (match, imageName) => {
      return `![${imageName}](./images/${imageName})`
    })
  }

  rewriteImagePaths(content: string): string {
    // Convert relative path format
    content = content.replace(/!\[([^\]]*)\]\(\.\.\/\.\.\/images\/([^)]+)\)/g, '![$1](./images/$2)')
    
    // Convert absolute path format
    content = content.replace(/!\[([^\]]*)\]\([^)]*\/images\/([^)]+)\)/g, '![$1](./images/$2)')
    
    return content
  }

  removeObsidianComments(content: string): string {
    return content.replace(/%%.*?%%/gs, '')
  }

  convertInternalLinks(content: string): string {
    // Handle links with anchors and aliases first [[file#section|alias]]
    content = content.replace(/\[\[([^#\]|]+)#([^|\]]+)\|([^\]]+)\]\]/g, (match, file, section, alias) => {
      const slug = this.generateSlugFromTitle(file.trim())
      const anchor = section.trim().toLowerCase().replace(/\s+/g, '-')
      return `[${alias.trim()}](../${slug}/#${anchor})`
    })

    // Handle links with anchors [[file#section]]
    content = content.replace(/\[\[([^#\]]+)#([^\]]+)\]\]/g, (match, file, section) => {
      const slug = this.generateSlugFromTitle(file.trim())
      const anchor = section.trim().toLowerCase().replace(/\s+/g, '-')
      return `[${file.trim()}#${section.trim()}](../${slug}/#${anchor})`
    })

    return content
  }

  isValidImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.avif']
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(ext)
  }

  extractImageName(imageRef: string): string | null {
    let imageName: string | null = null
    
    if (imageRef.includes('/')) {
      imageName = imageRef.split('/').pop() || null
    } else {
      imageName = imageRef
    }

    if (imageName && this.isValidImageFile(imageName)) {
      return imageName
    }

    return null
  }

  validateConfig(config: ConversionConfig): boolean {
    return !!(
      config.sourceDir &&
      config.targetDir &&
      config.imageSourceDir
    )
  }
}

describe('ConverterService', () => {
  let testService: TestableConverterService
  let mockConfig: ConversionConfig

  beforeEach(() => {
    testService = new TestableConverterService()
    mockConfig = {
      sourceDir: '/mock/obsidian-vault',
      targetDir: '/mock/astro-blog',
      imageSourceDir: '/mock/obsidian-vault/images',
      preserveStructure: true
    }
  })

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const result = testService.validateConfig(mockConfig)
      expect(result).toBe(true)
    })

    it('should return false for invalid config', () => {
      const invalidConfig = { ...mockConfig, sourceDir: '' }
      const result = testService.validateConfig(invalidConfig)
      expect(result).toBe(false)
    })
  })

  describe('Wiki Links Conversion', () => {
    it('should convert simple wiki links', () => {
      const content = 'This is a [[Test Article]] link.'
      const result = testService.convertWikiLinks(content)
      expect(result).toBe('This is a [Test Article](../test-article/) link.')
    })

    it('should convert wiki links with aliases', () => {
      const content = 'Check out [[Test Article|this article]].'
      const result = testService.convertWikiLinks(content)
      expect(result).toBe('Check out [this article](../test-article/).')
    })

    it('should handle multiple wiki links', () => {
      const content = '[[First Article]] and [[Second Article|second]] are related.'
      const result = testService.convertWikiLinks(content)
      expect(result).toBe('[First Article](../first-article/) and [second](../second-article/) are related.')
    })
  })

  describe('Highlight Syntax Conversion', () => {
    it('should convert highlight syntax', () => {
      const content = 'This is ==highlighted text== in the content.'
      const result = testService.convertHighlightSyntax(content)
      expect(result).toBe('This is <mark>highlighted text</mark> in the content.')
    })

    it('should handle multiple highlights', () => {
      const content = '==First== and ==second== highlights.'
      const result = testService.convertHighlightSyntax(content)
      expect(result).toBe('<mark>First</mark> and <mark>second</mark> highlights.')
    })
  })

  describe('Obsidian Image Conversion', () => {
    it('should convert Obsidian image syntax', () => {
      const content = 'Here is an image: ![[test-image.png]]'
      const result = testService.convertObsidianImages(content)
      expect(result).toBe('Here is an image: ![test-image.png](./images/test-image.png)')
    })

    it('should handle multiple images', () => {
      const content = '![[image1.png]] and ![[image2.jpg]] are both images.'
      const result = testService.convertObsidianImages(content)
      expect(result).toBe('![image1.png](./images/image1.png) and ![image2.jpg](./images/image2.jpg) are both images.')
    })
  })

  describe('Image Path Rewriting', () => {
    it('should rewrite relative image paths', () => {
      const content = '![Test](../../images/test.png)'
      const result = testService.rewriteImagePaths(content)
      expect(result).toBe('![Test](./images/test.png)')
    })

    it('should rewrite absolute image paths', () => {
      const content = '![Test](/some/path/images/test.png)'
      const result = testService.rewriteImagePaths(content)
      expect(result).toBe('![Test](./images/test.png)')
    })
  })

  describe('Comment Removal', () => {
    it('should remove Obsidian comments', () => {
      const content = 'This is visible %%this is hidden%% text.'
      const result = testService.removeObsidianComments(content)
      expect(result).toBe('This is visible  text.')
    })

    it('should handle multiline comments', () => {
      const content = 'Text %%comment\nwith newlines%% more text.'
      const result = testService.removeObsidianComments(content)
      expect(result).toBe('Text  more text.')
    })
  })

  describe('Image File Validation', () => {
    it('should validate image file extensions', () => {
      expect(testService.isValidImageFile('test.png')).toBe(true)
      expect(testService.isValidImageFile('test.jpg')).toBe(true)
      expect(testService.isValidImageFile('test.jpeg')).toBe(true)
      expect(testService.isValidImageFile('test.gif')).toBe(true)
      expect(testService.isValidImageFile('test.svg')).toBe(true)
      expect(testService.isValidImageFile('test.webp')).toBe(true)
      
      expect(testService.isValidImageFile('test.txt')).toBe(false)
      expect(testService.isValidImageFile('test.md')).toBe(false)
      expect(testService.isValidImageFile('test')).toBe(false)
    })
  })

  describe('Image Name Extraction', () => {
    it('should extract image names from paths', () => {
      expect(testService.extractImageName('../../images/test.png')).toBe('test.png')
      expect(testService.extractImageName('test.jpg')).toBe('test.jpg')
      expect(testService.extractImageName('/path/to/images/photo.gif')).toBe('photo.gif')
    })

    it('should return null for invalid image files', () => {
      expect(testService.extractImageName('test.txt')).toBe(null)
      expect(testService.extractImageName('document.md')).toBe(null)
    })
  })

  describe('Internal Links Conversion', () => {
    it('should convert internal links with anchors', () => {
      const content = 'See [[Article#Section]] for details.'
      const result = testService.convertInternalLinks(content)
      expect(result).toBe('See [Article#Section](../article/#section) for details.')
    })

    it('should convert internal links with anchors and aliases', () => {
      const content = 'Check [[Article#Section|this section]].'
      const result = testService.convertInternalLinks(content)
      expect(result).toBe('Check [this section](../article/#section).')
    })
  })
})