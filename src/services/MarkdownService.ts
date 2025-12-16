import MarkdownIt from 'markdown-it'
import * as yaml from 'js-yaml'
import type { Frontmatter } from '@/types'

/**
 * 解析後的 Markdown 內容介面
 */
export interface ParsedMarkdown {
  frontmatter: Partial<Frontmatter>
  body: string
  hasValidFrontmatter: boolean
  errors: string[]
}

/**
 * Markdown 服務類別
 * 負責 Markdown 內容的解析、渲染和前置資料處理
 */
export class MarkdownService {
  private md: MarkdownIt

  /**
   * 建構子 - 初始化 MarkdownService
   */
  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    })
  }

  /**
   * 渲染 Markdown 內容為 HTML
   * @param {string} content - Markdown 內容
   * @returns {string} 渲染後的 HTML
   */
  render(content: string): string {
    return this.md.render(content)
  }

  /**
   * 從 Markdown 內容中解析前置資料，包含完整的錯誤處理
   * @param {string} content - Markdown 內容
   * @returns {ParsedMarkdown} 解析結果
   */
  parseFrontmatter(content: string): ParsedMarkdown {
    const errors: string[] = []
    let frontmatter: Partial<Frontmatter> = {}
    let body = content
    let hasValidFrontmatter = false

    // Match frontmatter pattern
    const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (match) {
      const yamlContent = match[1]
      body = match[2]

      try {
        const parsed = yaml.load(yamlContent) as any
        
        if (parsed && typeof parsed === 'object') {
          frontmatter = this.validateAndNormalizeFrontmatter(parsed, errors)
          hasValidFrontmatter = errors.length === 0
        } else {
          errors.push('Frontmatter must be a valid YAML object')
        }
      } catch (error) {
        errors.push(`YAML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (content.trim().startsWith('---')) {
      errors.push('Frontmatter format is invalid - missing closing ---')
    }

    return {
      frontmatter,
      body,
      hasValidFrontmatter,
      errors
    }
  }

  /**
   * 驗證並標準化前置資料
   * @param {any} data - 原始前置資料
   * @param {string[]} errors - 錯誤訊息陣列
   * @returns {Partial<Frontmatter>} 標準化後的前置資料
   */
  private validateAndNormalizeFrontmatter(data: any, errors: string[]): Partial<Frontmatter> {
    const frontmatter: Partial<Frontmatter> = {}

    // Title validation
    if (data.title) {
      if (typeof data.title === 'string') {
        frontmatter.title = data.title.trim()
      } else {
        errors.push('Title must be a string')
      }
    }

    // Description validation
    if (data.description !== undefined) {
      if (typeof data.description === 'string') {
        frontmatter.description = data.description.trim()
      } else {
        errors.push('Description must be a string')
      }
    }

    // Date validation
    if (data.date) {
      const dateStr = String(data.date)
      if (this.isValidDateString(dateStr)) {
        frontmatter.date = dateStr
      } else {
        errors.push('Date must be in YYYY-MM-DD format')
      }
    }

    // Last modified validation
    if (data.lastmod) {
      const lastmodStr = String(data.lastmod)
      if (this.isValidDateString(lastmodStr)) {
        frontmatter.lastmod = lastmodStr
      } else {
        errors.push('lastmod must be in YYYY-MM-DD format')
      }
    }

    // Tags validation
    if (data.tags !== undefined) {
      if (Array.isArray(data.tags)) {
        frontmatter.tags = data.tags
          .filter(tag => typeof tag === 'string')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
        
        if (data.tags.length !== frontmatter.tags.length) {
          errors.push('Some tags are invalid - tags must be non-empty strings')
        }
      } else {
        errors.push('Tags must be an array')
      }
    } else {
      frontmatter.tags = []
    }

    // Categories validation
    if (data.categories !== undefined) {
      if (Array.isArray(data.categories)) {
        const validCategories = ['Software', 'growth', 'management']
        frontmatter.categories = data.categories
          .filter(cat => typeof cat === 'string' && validCategories.includes(cat))
        
        if (data.categories.length !== frontmatter.categories.length) {
          errors.push('Some categories are invalid - must be one of: Software, growth, management')
        }
      } else {
        errors.push('Categories must be an array')
      }
    } else {
      frontmatter.categories = []
    }

    // Slug validation
    if (data.slug !== undefined) {
      if (typeof data.slug === 'string') {
        const slug = data.slug.trim()
        if (this.isValidSlug(slug)) {
          frontmatter.slug = slug
        } else {
          errors.push('Slug must contain only lowercase letters, numbers, and hyphens')
        }
      } else {
        errors.push('Slug must be a string')
      }
    }

    // Keywords validation
    if (data.keywords !== undefined) {
      if (Array.isArray(data.keywords)) {
        frontmatter.keywords = data.keywords
          .filter(keyword => typeof keyword === 'string')
          .map(keyword => keyword.trim())
          .filter(keyword => keyword.length > 0)
        
        if (data.keywords.length !== frontmatter.keywords.length) {
          errors.push('Some keywords are invalid - keywords must be non-empty strings')
        }
      } else {
        errors.push('Keywords must be an array')
      }
    } else {
      frontmatter.keywords = []
    }

    return frontmatter
  }

  /**
   * 從資料物件產生 YAML 前置資料
   * @param {Partial<Frontmatter>} data - 前置資料物件
   * @returns {string} YAML 格式的前置資料字串
   */
  generateFrontmatter(data: Partial<Frontmatter>): string {
    try {
      // Create a clean object with only defined values
      const cleanData: any = {}
      
      if (data.title) cleanData.title = data.title
      if (data.description) cleanData.description = data.description
      if (data.date) cleanData.date = data.date
      if (data.lastmod) cleanData.lastmod = data.lastmod
      if (data.tags && data.tags.length > 0) cleanData.tags = data.tags
      if (data.categories && data.categories.length > 0) cleanData.categories = data.categories
      if (data.slug) cleanData.slug = data.slug
      if (data.keywords && data.keywords.length > 0) cleanData.keywords = data.keywords

      const yamlString = yaml.dump(cleanData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      })

      return `---\n${yamlString}---\n`
    } catch (error) {
      console.error('Failed to generate frontmatter:', error)
      return '---\n# Error generating frontmatter\n---\n'
    }
  }

  /**
   * 結合前置資料和內容為完整的 Markdown
   * @param {Partial<Frontmatter>} frontmatter - 前置資料
   * @param {string} body - 內容主體
   * @returns {string} 完整的 Markdown 內容
   */
  combineContent(frontmatter: Partial<Frontmatter>, body: string): string {
    const frontmatterString = this.generateFrontmatter(frontmatter)
    return frontmatterString + body
  }

  /**
   * 驗證日期字串格式 (YYYY-MM-DD)
   * @param {string} dateStr - 日期字串
   * @returns {boolean} 是否為有效日期格式
   */
  private isValidDateString(dateStr: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateStr)) return false
    
    const date = new Date(dateStr)
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr)
  }

  /**
   * 驗證 slug 格式（僅允許小寫字母、數字和連字號）
   * @param {string} slug - URL slug
   * @returns {boolean} 是否為有效 slug 格式
   */
  private isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/
    return slugRegex.test(slug) && !slug.startsWith('-') && !slug.endsWith('-')
  }

  /**
   * 從標題產生有效的 slug
   * @param {string} title - 文章標題
   * @returns {string} 產生的 slug
   */
  generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * 從 Markdown 內容中提取所有圖片引用
   * @param {string} content - Markdown 內容
   * @returns {string[]} 圖片路徑陣列
   */
  extractImageReferences(content: string): string[] {
    const images: string[] = []
    
    // Standard markdown images: ![alt](path)
    const standardImageRegex = /!\[.*?\]\(([^)]+)\)/g
    let match
    while ((match = standardImageRegex.exec(content)) !== null) {
      images.push(match[1])
    }
    
    // Obsidian style images: ![[image.png]]
    const obsidianImageRegex = /!\[\[([^\]]+)\]\]/g
    while ((match = obsidianImageRegex.exec(content)) !== null) {
      images.push(match[1])
    }
    
    return [...new Set(images)] // Remove duplicates
  }

  /**
   * 從 Markdown 內容中提取所有 Wiki 連結
   * @param {string} content - Markdown 內容
   * @returns {Array<{ link: string; alias?: string }>} Wiki 連結陣列
   */
  extractWikiLinks(content: string): Array<{ link: string; alias?: string }> {
    const links: Array<{ link: string; alias?: string }> = []
    
    // Wiki links: [[link]] or [[link|alias]]
    const wikiLinkRegex = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g
    let match
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      links.push({
        link: match[1],
        alias: match[3]
      })
    }
    
    return links
  }
}