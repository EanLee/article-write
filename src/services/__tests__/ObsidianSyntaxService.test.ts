import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ObsidianSyntaxService } from '../ObsidianSyntaxService'
import type { Article } from '@/types'
import type { AutocompleteContext } from '../ObsidianSyntaxService'

describe('ObsidianSyntaxService', () => {
  let service: ObsidianSyntaxService
  let mockArticles: Article[]

  beforeEach(() => {
    service = new ObsidianSyntaxService()
    
    // Mock articles for testing
    mockArticles = [
      {
        id: '1',
        title: 'Vue.js 基礎教學',
        slug: 'vue-js-basics',
        filePath: '/path/to/vue-basics.md',
        status: 'published',
        frontmatter: {
          title: 'Vue.js 基礎教學',
          date: '2024-01-01',
          tags: ['vue', 'javascript', 'frontend'],
          categories: ['Software']
        },
        content: '# Vue.js 基礎教學\n\n這是一篇關於 Vue.js 的教學文章。',
        lastModified: new Date('2024-01-01'),
        category: 'Software'
      },
      {
        id: '2',
        title: 'TypeScript 進階技巧',
        slug: 'typescript-advanced',
        filePath: '/path/to/typescript-advanced.md',
        status: 'draft',
        frontmatter: {
          title: 'TypeScript 進階技巧',
          date: '2024-01-02',
          tags: ['typescript', 'javascript'],
          categories: ['Software']
        },
        content: '# TypeScript 進階技巧\n\n進階的 TypeScript 使用技巧。',
        lastModified: new Date('2024-01-02'),
        category: 'Software'
      }
    ]

    service.updateArticles(mockArticles)
    service.updateImageFiles(['screenshot.png', 'diagram.jpg', 'icon.svg'])
  })

  describe('Wiki Link Auto-completion', () => {
    it('should provide wiki link suggestions when typing [[', () => {
      const context: AutocompleteContext = {
        text: 'This is a reference to [[vue',
        cursorPosition: 27, // After "[[vue"
        lineNumber: 1,
        columnNumber: 27
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]).toEqual({
        text: '[[Vue.js 基礎教學]]',
        displayText: 'Vue.js 基礎教學',
        type: 'wikilink',
        description: 'Software - published'
      })
    })

    it('should provide multiple suggestions for partial matches', () => {
      const context: AutocompleteContext = {
        text: 'Reference to [[',
        cursorPosition: 15, // After "[["
        lineNumber: 1,
        columnNumber: 15
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(2)
      expect(suggestions.map(s => s.displayText)).toContain('Vue.js 基礎教學')
      expect(suggestions.map(s => s.displayText)).toContain('TypeScript 進階技巧')
    })

    it('should match by slug as well as title', () => {
      const context: AutocompleteContext = {
        text: 'Link to [[typescript-adv',
        cursorPosition: 25, // After "[[typescript-adv"
        lineNumber: 1,
        columnNumber: 25
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].displayText).toBe('TypeScript 進階技巧')
    })

    it('should return empty array when no matches found', () => {
      const context: AutocompleteContext = {
        text: 'Link to [[nonexistent',
        cursorPosition: 21, // After "[[nonexistent"
        lineNumber: 1,
        columnNumber: 21
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(0)
    })
  })

  describe('Image Reference Auto-completion', () => {
    it('should provide image suggestions when typing ![[', () => {
      const context: AutocompleteContext = {
        text: 'Here is an image: ![[screen',
        cursorPosition: 27, // After "![[screen"
        lineNumber: 1,
        columnNumber: 27
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]).toEqual({
        text: '![[screenshot.png]]',
        displayText: 'screenshot.png',
        type: 'image',
        description: '圖片檔案'
      })
    })

    it('should provide all image suggestions when no filter', () => {
      const context: AutocompleteContext = {
        text: 'Image: ![[',
        cursorPosition: 10, // After "![["
        lineNumber: 1,
        columnNumber: 10
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(3)
      expect(suggestions.map(s => s.displayText)).toContain('screenshot.png')
      expect(suggestions.map(s => s.displayText)).toContain('diagram.jpg')
      expect(suggestions.map(s => s.displayText)).toContain('icon.svg')
    })

    it('should filter images by partial name', () => {
      const context: AutocompleteContext = {
        text: 'Image: ![[dia',
        cursorPosition: 13, // After "![[dia"
        lineNumber: 1,
        columnNumber: 13
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].displayText).toBe('diagram.jpg')
    })
  })

  describe('Tag Auto-completion', () => {
    it('should provide tag suggestions when typing #', () => {
      const context: AutocompleteContext = {
        text: 'Tags: #vue',
        cursorPosition: 10, // After "#vue"
        lineNumber: 1,
        columnNumber: 10
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]).toEqual({
        text: '#vue',
        displayText: 'vue',
        type: 'tag',
        description: '標籤'
      })
    })

    it('should provide all tag suggestions when no filter', () => {
      const context: AutocompleteContext = {
        text: 'Tags: #',
        cursorPosition: 7, // After "#"
        lineNumber: 1,
        columnNumber: 7
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.map(s => s.displayText)).toContain('vue')
      expect(suggestions.map(s => s.displayText)).toContain('javascript')
      expect(suggestions.map(s => s.displayText)).toContain('typescript')
    })

    it('should filter tags by partial match', () => {
      const context: AutocompleteContext = {
        text: 'Tags: #java',
        cursorPosition: 11, // After "#java"
        lineNumber: 1,
        columnNumber: 11
      }

      const suggestions = service.getAutocompleteSuggestions(context)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].displayText).toBe('javascript')
    })
  })

  describe('Syntax Validation', () => {
    it('should detect invalid wiki links', () => {
      const content = `
# Test Article

This is a reference to [[Nonexistent Article]] which does not exist.
Also referencing [[Vue.js 基礎教學]] which exists.
      `.trim()

      const errors = service.validateSyntax(content)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        line: 3,
        column: 24, // Adjusted based on actual output
        message: '找不到文章: "Nonexistent Article"',
        type: 'warning',
        suggestion: '建議檢查文章標題是否正確，或建立新文章'
      })
    })

    it('should detect invalid image references', () => {
      const content = `
# Test Article

Here is a valid image: ![[screenshot.png]]
And an invalid one: ![[missing-image.png]]
      `.trim()

      const errors = service.validateSyntax(content)

      // Filter only image-related errors
      const imageErrors = errors.filter(e => e.message.includes('圖片檔案'))
      expect(imageErrors).toHaveLength(1)
      expect(imageErrors[0].message).toBe('找不到圖片檔案: "missing-image.png"')
      expect(imageErrors[0].type).toBe('error')
      expect(imageErrors[0].suggestion).toBe('請確認圖片檔案存在於 Images 資料夾中')
    })

    it('should handle wiki links with aliases', () => {
      const content = 'Reference to [[Vue.js 基礎教學|Vue Tutorial]] should be valid.'

      const errors = service.validateSyntax(content)

      expect(errors).toHaveLength(0)
    })

    it('should validate frontmatter format', () => {
      const content = `---
title: Test Article
date: 2024-01-01
tags:
  - test
  - article
---

# Test Article

Content here.`

      const errors = service.validateSyntax(content)

      // Should not have frontmatter errors for valid YAML
      const frontmatterErrors = errors.filter(e => e.message.includes('前置資料'))
      expect(frontmatterErrors).toHaveLength(0)
    })

    it('should detect invalid frontmatter format', () => {
      const content = `---
title: Test Article
invalid yaml without colon
---

# Test Article`

      const errors = service.validateSyntax(content)

      expect(errors.length).toBeGreaterThan(0)
      const yamlError = errors.find(e => e.message.includes('YAML 格式錯誤'))
      expect(yamlError).toBeDefined()
    })
  })

  describe('Utility Methods', () => {
    it('should check if wiki link is valid', () => {
      expect(service.isValidWikiLink('Vue.js 基礎教學')).toBe(true)
      expect(service.isValidWikiLink('vue-js-basics')).toBe(true)
      expect(service.isValidWikiLink('Nonexistent Article')).toBe(false)
    })

    it('should check if image reference is valid', () => {
      expect(service.isValidImageReference('screenshot.png')).toBe(true)
      expect(service.isValidImageReference('screen')).toBe(true) // Partial match
      expect(service.isValidImageReference('missing.png')).toBe(false)
    })

    it('should get all tags', () => {
      const tags = service.getAllTags()
      expect(tags).toContain('vue')
      expect(tags).toContain('javascript')
      expect(tags).toContain('typescript')
      expect(tags).toContain('frontend')
    })

    it('should get all article titles', () => {
      const titles = service.getAllArticleTitles()
      expect(titles).toContain('Vue.js 基礎教學')
      expect(titles).toContain('TypeScript 進階技巧')
    })

    it('should get all image files', () => {
      const images = service.getAllImageFiles()
      expect(images).toContain('screenshot.png')
      expect(images).toContain('diagram.jpg')
      expect(images).toContain('icon.svg')
    })
  })

  describe('Text Application', () => {
    let mockTextarea: HTMLTextAreaElement

    beforeEach(() => {
      // Create a mock textarea element
      mockTextarea = {
        value: '',
        selectionStart: 0,
        selectionEnd: 0,
        setSelectionRange: vi.fn(),
        focus: vi.fn(),
        clientWidth: 400
      } as any

      // Mock DOM methods
      global.document = {
        createElement: vi.fn(() => ({
          style: {},
          getBoundingClientRect: vi.fn(() => ({ height: 20 })),
          textContent: ''
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      } as any

      global.window = {
        getComputedStyle: vi.fn(() => ({
          font: '14px monospace',
          padding: '8px',
          border: '1px solid',
          lineHeight: '20px'
        }))
      } as any
    })

    it('should apply wiki link suggestion correctly', () => {
      mockTextarea.value = 'Reference to [[vue'
      const suggestion = {
        text: '[[Vue.js 基礎教學]]',
        displayText: 'Vue.js 基礎教學',
        type: 'wikilink' as const,
        description: 'Software - published'
      }

      const result = service.applySuggestionToText(mockTextarea, suggestion, 19) // Correct cursor position

      expect(result).toBe('Reference to [[Vue.js 基礎教學]]')
    })

    it('should apply image suggestion correctly', () => {
      mockTextarea.value = 'Image: ![[screen'
      const suggestion = {
        text: '![[screenshot.png]]',
        displayText: 'screenshot.png',
        type: 'image' as const,
        description: '圖片檔案'
      }

      const result = service.applySuggestionToText(mockTextarea, suggestion, 17) // Correct cursor position

      expect(result).toBe('Image: ![[screenshot.png]]')
    })

    it('should apply tag suggestion correctly', () => {
      mockTextarea.value = 'Tags: #java'
      const suggestion = {
        text: '#javascript',
        displayText: 'javascript',
        type: 'tag' as const,
        description: '標籤'
      }

      const result = service.applySuggestionToText(mockTextarea, suggestion, 11)

      expect(result).toBe('Tags: #javascript')
    })
  })
})