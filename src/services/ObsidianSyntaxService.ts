import type { Article } from '@/types'

/**
 * Obsidian 語法建議介面
 */
export interface SuggestionItem {
  text: string
  displayText: string
  type: 'wikilink' | 'image' | 'tag'
  description?: string
}

/**
 * 語法驗證錯誤介面
 */
export interface SyntaxError {
  line: number
  column: number
  message: string
  type: 'warning' | 'error'
  suggestion?: string
}

/**
 * 自動完成上下文介面
 */
export interface AutocompleteContext {
  text: string
  cursorPosition: number
  lineNumber: number
  columnNumber: number
}

/**
 * Obsidian 語法服務類別
 * 提供 Wiki 連結、圖片引用的自動完成功能，以及語法驗證
 */
export class ObsidianSyntaxService {
  private articles: Article[] = []
  private imageFiles: string[] = []
  private tags: Set<string> = new Set()

  /**
   * 更新文章清單，用於 Wiki 連結自動完成
   * @param {Article[]} articles - 文章陣列
   */
  updateArticles(articles: Article[]): void {
    this.articles = articles
    this.updateTags()
  }

  /**
   * 更新圖片檔案清單，用於圖片引用自動完成
   * @param {string[]} imageFiles - 圖片檔案名稱陣列
   */
  updateImageFiles(imageFiles: string[]): void {
    this.imageFiles = imageFiles
  }

  /**
   * 取得自動完成建議
   * @param {AutocompleteContext} context - 自動完成上下文
   * @returns {SuggestionItem[]} 建議項目陣列
   */
  getAutocompleteSuggestions(context: AutocompleteContext): SuggestionItem[] {
    const { text, cursorPosition } = context
    const beforeCursor = text.substring(0, cursorPosition)
    
    // 檢查 Wiki 連結模式 [[
    const wikiLinkMatch = beforeCursor.match(/\[\[([^\]]*?)$/)
    if (wikiLinkMatch) {
      const query = wikiLinkMatch[1].toLowerCase()
      return this.getWikiLinkSuggestions(query)
    }

    // 檢查圖片引用模式 ![[
    const imageMatch = beforeCursor.match(/!\[\[([^\]]*?)$/)
    if (imageMatch) {
      const query = imageMatch[1].toLowerCase()
      return this.getImageSuggestions(query)
    }

    // 檢查標籤模式 #
    const tagMatch = beforeCursor.match(/#([a-zA-Z0-9\u4e00-\u9fff]*?)$/)
    if (tagMatch) {
      const query = tagMatch[1].toLowerCase()
      return this.getTagSuggestions(query)
    }

    return []
  }

  /**
   * 取得 Wiki 連結建議
   * @param {string} query - 搜尋查詢
   * @returns {SuggestionItem[]} Wiki 連結建議
   */
  private getWikiLinkSuggestions(query: string): SuggestionItem[] {
    return this.articles
      .filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.slug.toLowerCase().includes(query)
      )
      .map(article => ({
        text: `[[${article.title}]]`,
        displayText: article.title,
        type: 'wikilink' as const,
        description: `${article.category} - ${article.status}`
      }))
      .slice(0, 10) // 限制建議數量
  }

  /**
   * 取得圖片引用建議
   * @param {string} query - 搜尋查詢
   * @returns {SuggestionItem[]} 圖片引用建議
   */
  private getImageSuggestions(query: string): SuggestionItem[] {
    return this.imageFiles
      .filter(filename => filename.toLowerCase().includes(query))
      .map(filename => ({
        text: `![[${filename}]]`,
        displayText: filename,
        type: 'image' as const,
        description: '圖片檔案'
      }))
      .slice(0, 10) // 限制建議數量
  }

  /**
   * 取得標籤建議
   * @param {string} query - 搜尋查詢
   * @returns {SuggestionItem[]} 標籤建議
   */
  private getTagSuggestions(query: string): SuggestionItem[] {
    return Array.from(this.tags)
      .filter(tag => tag.toLowerCase().includes(query))
      .map(tag => ({
        text: `#${tag}`,
        displayText: tag,
        type: 'tag' as const,
        description: '標籤'
      }))
      .slice(0, 10) // 限制建議數量
  }

  /**
   * 驗證 Markdown 語法
   * @param {string} content - Markdown 內容
   * @returns {SyntaxError[]} 語法錯誤陣列
   */
  validateSyntax(content: string): SyntaxError[] {
    const errors: SyntaxError[] = []
    const lines = content.split('\n')

    lines.forEach((line, lineIndex) => {
      // 檢查無效的 Wiki 連結
      const invalidWikiLinks = this.validateWikiLinks(line, lineIndex)
      errors.push(...invalidWikiLinks)

      // 檢查無效的圖片引用
      const invalidImages = this.validateImageReferences(line, lineIndex)
      errors.push(...invalidImages)

      // 檢查前置資料格式
      if (lineIndex === 0 && line.trim() === '---') {
        const frontmatterErrors = this.validateFrontmatter(lines)
        errors.push(...frontmatterErrors)
      }
    })

    return errors
  }

  /**
   * 驗證 Wiki 連結
   * @param {string} line - 行內容
   * @param {number} lineIndex - 行號
   * @returns {SyntaxError[]} Wiki 連結錯誤
   */
  private validateWikiLinks(line: string, lineIndex: number): SyntaxError[] {
    const errors: SyntaxError[] = []
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
    let match

    while ((match = wikiLinkRegex.exec(line)) !== null) {
      const linkText = match[1]
      const linkTitle = linkText.split('|')[0] // 處理別名格式 [[title|alias]]
      
      // 檢查文章是否存在
      const articleExists = this.articles.some(article => 
        article.title === linkTitle || article.slug === linkTitle
      )

      if (!articleExists) {
        errors.push({
          line: lineIndex + 1,
          column: match.index! + 1,
          message: `找不到文章: "${linkTitle}"`,
          type: 'warning',
          suggestion: `建議檢查文章標題是否正確，或建立新文章`
        })
      }
    }

    return errors
  }

  /**
   * 驗證圖片引用
   * @param {string} line - 行內容
   * @param {number} lineIndex - 行號
   * @returns {SyntaxError[]} 圖片引用錯誤
   */
  private validateImageReferences(line: string, lineIndex: number): SyntaxError[] {
    const errors: SyntaxError[] = []
    const imageRegex = /!\[\[([^\]]+)\]\]/g
    let match

    while ((match = imageRegex.exec(line)) !== null) {
      const imageName = match[1]
      
      // 檢查圖片檔案是否存在
      const imageExists = this.imageFiles.some(filename => 
        filename === imageName || filename.includes(imageName)
      )

      if (!imageExists) {
        errors.push({
          line: lineIndex + 1,
          column: match.index! + 1,
          message: `找不到圖片檔案: "${imageName}"`,
          type: 'error',
          suggestion: `請確認圖片檔案存在於 Images 資料夾中`
        })
      }
    }

    return errors
  }

  /**
   * 驗證前置資料格式
   * @param {string[]} lines - 所有行內容
   * @returns {SyntaxError[]} 前置資料錯誤
   */
  private validateFrontmatter(lines: string[]): SyntaxError[] {
    const errors: SyntaxError[] = []
    
    // 找到前置資料結束位置
    let frontmatterEnd = -1
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        frontmatterEnd = i
        break
      }
    }

    if (frontmatterEnd === -1) {
      errors.push({
        line: 1,
        column: 1,
        message: '前置資料格式錯誤：缺少結束標記 ---',
        type: 'error',
        suggestion: '請在前置資料結尾加上 ---'
      })
      return errors
    }

    // 驗證 YAML 格式
    const frontmatterContent = lines.slice(1, frontmatterEnd).join('\n')
    try {
      // 簡單的 YAML 格式檢查
      const yamlLines = frontmatterContent.split('\n')
      yamlLines.forEach((line, index) => {
        if (line.trim() && !line.includes(':') && !line.startsWith('-')) {
          errors.push({
            line: index + 2, // +2 因為跳過第一個 ---
            column: 1,
            message: `YAML 格式錯誤：缺少冒號分隔符`,
            type: 'error',
            suggestion: '請確保每行都有 key: value 格式'
          })
        }
      })
    } catch {
      errors.push({
        line: 2,
        column: 1,
        message: '前置資料 YAML 格式錯誤',
        type: 'error',
        suggestion: '請檢查 YAML 語法是否正確'
      })
    }

    return errors
  }

  /**
   * 更新標籤集合
   */
  private updateTags(): void {
    this.tags.clear()
    this.articles.forEach(article => {
      article.frontmatter.tags.forEach(tag => {
        this.tags.add(tag)
      })
    })
  }

  /**
   * 取得所有可用的標籤
   * @returns {string[]} 標籤陣列
   */
  getAllTags(): string[] {
    return Array.from(this.tags)
  }

  /**
   * 取得所有文章標題（用於 Wiki 連結）
   * @returns {string[]} 文章標題陣列
   */
  getAllArticleTitles(): string[] {
    return this.articles.map(article => article.title)
  }

  /**
   * 取得所有圖片檔案名稱
   * @returns {string[]} 圖片檔案名稱陣列
   */
  getAllImageFiles(): string[] {
    return [...this.imageFiles]
  }

  /**
   * 檢查 Wiki 連結是否有效
   * @param {string} linkText - 連結文字
   * @returns {boolean} 連結是否有效
   */
  isValidWikiLink(linkText: string): boolean {
    const title = linkText.split('|')[0] // 處理別名格式
    return this.articles.some(article => 
      article.title === title || article.slug === title
    )
  }

  /**
   * 檢查圖片引用是否有效
   * @param {string} imageName - 圖片名稱
   * @returns {boolean} 圖片引用是否有效
   */
  isValidImageReference(imageName: string): boolean {
    return this.imageFiles.some(filename => 
      filename === imageName || filename.includes(imageName)
    )
  }
}