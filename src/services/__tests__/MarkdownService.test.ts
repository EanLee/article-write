import { describe, it, expect } from 'vitest'
import { MarkdownService } from '../MarkdownService'

describe('MarkdownService Enhanced Features', () => {
  const markdownService = new MarkdownService()

  it('should render basic markdown with syntax highlighting', () => {
    const content = '# 標題\n\n```javascript\nconst hello = "world";\n```'
    const result = markdownService.render(content)
    
    expect(result).toContain('<h1>')
    expect(result).toContain('<pre>')
    expect(result).toContain('<code')
  })

  it('should process Obsidian highlight syntax', () => {
    const content = '這是 ==高亮文字== 的範例'
    const result = markdownService.renderForPreview(content, true)
    
    expect(result).toContain('<mark>高亮文字</mark>')
  })

  it('should process Obsidian comments', () => {
    const content = '這是文字 %%這是註釋%% 更多文字'
    const result = markdownService.renderForPreview(content, true)
    
    expect(result).not.toContain('%%這是註釋%%')
    expect(result).toContain('這是文字')
    expect(result).toContain('更多文字')
  })

  it('should process Obsidian tags', () => {
    const content = '這是 #標籤 的範例'
    const result = markdownService.renderForPreview(content, true)
    
    expect(result).toContain('<span class="tag">#標籤</span>')
  })

  it('should validate markdown syntax and return errors', () => {
    const content = '[[未閉合的連結\n==未閉合的高亮\n![[未閉合的圖片'
    const errors = markdownService.validateMarkdownSyntax(content)
    
    expect(errors.length).toBeGreaterThanOrEqual(3)
    expect(errors.some(e => e.message.includes('未閉合的 Wiki 連結'))).toBe(true)
    expect(errors.some(e => e.message.includes('未閉合的高亮語法'))).toBe(true)
    expect(errors.some(e => e.message.includes('未閉合的圖片語法'))).toBe(true)
  })

  it('should extract image references correctly', () => {
    const content = '![標準圖片](image1.png)\n![[Obsidian圖片.jpg]]'
    const images = markdownService.extractImageReferences(content)
    
    expect(images).toContain('image1.png')
    expect(images).toContain('Obsidian圖片.jpg')
  })

  it('should extract wiki links correctly', () => {
    const content = '[[連結1]] 和 [[連結2|別名]]'
    const links = markdownService.extractWikiLinks(content)
    
    expect(links).toHaveLength(2)
    expect(links[0]).toEqual({ link: '連結1' })
    expect(links[1]).toEqual({ link: '連結2', alias: '別名' })
  })

  it('should get supported languages for syntax highlighting', () => {
    const languages = markdownService.getSupportedLanguages()
    
    expect(Array.isArray(languages)).toBe(true)
    expect(languages.length).toBeGreaterThan(0)
    expect(languages).toContain('javascript')
  })
})