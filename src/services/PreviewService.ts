import { logger } from "@/utils/logger"
import { MarkdownService } from "./MarkdownService"
import type { Article } from "@/types"

/**
 * 預覽渲染選項介面
 */
export interface PreviewOptions {
  enableObsidianSyntax: boolean
  enableImagePreview: boolean
  enableWikiLinks: boolean
  baseImagePath?: string
  articleList?: Article[]
  articleFilePath?: string
}

/**
 * 預覽引擎服務類別
 * 負責渲染 Obsidian 格式內容並顯示轉換後的外觀
 */
export class PreviewService {
  private readonly markdownService: MarkdownService
  private articles: Article[] = []
  private imageBasePath: string = ""
  private articleDir: string = ""

  /**
   * 建構子 - 初始化預覽服務
   */
  constructor() {
    this.markdownService = new MarkdownService()
  }

  /**
   * 更新文章清單，用於 Wiki 連結解析
   * @param {Article[]} articles - 文章陣列
   */
  updateArticles(articles: Article[]): void {
    this.articles = articles
  }

  /**
   * 設定圖片基礎路徑
   * @param {string} basePath - 圖片基礎路徑
   */
  setImageBasePath(basePath: string): void {
    this.imageBasePath = basePath
  }

  setArticleFilePath(filePath: string): void {
    if (!filePath) {
      this.articleDir = ""
      return
    }
    const normalized = filePath.replace(/\\/g, "/")
    const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`
    this.articleDir = withSlash.substring(0, withSlash.lastIndexOf("/"))
  }

  /**
   * 渲染 Obsidian 格式內容為預覽 HTML
   * @param {string} content - Markdown 內容
   * @param {PreviewOptions} options - 預覽選項
   * @returns {string} 渲染後的 HTML
   */
  private static readonly DEFAULT_PREVIEW_OPTIONS: PreviewOptions = {
    enableObsidianSyntax: true,
    enableImagePreview: true,
    enableWikiLinks: true,
  }

  renderPreview(content: string, options: PreviewOptions = PreviewService.DEFAULT_PREVIEW_OPTIONS): string {
    // Handle null or undefined content
    if (!content || typeof content !== "string") {
      return ""
    }

    try {
      // 預處理 Obsidian 語法
      let processedContent = content

      if (options.enableObsidianSyntax) {
        processedContent = this.preprocessObsidianSyntax(processedContent)
      }

      if (options.enableWikiLinks) {
        processedContent = this.processWikiLinks(processedContent, options.articleList || this.articles)
      }

      if (options.enableImagePreview) {
        processedContent = this.processImageReferences(processedContent, options.baseImagePath || this.imageBasePath)
      }

      // 將標準 Markdown 圖片語法 ![alt](relative/path) 的相對路徑解析為 local-file:/// 絕對 URL
      if (options.articleFilePath) {
        processedContent = this.resolveStandardMarkdownImagePaths(processedContent, options.articleFilePath)
      }

      // 使用 MarkdownService 渲染
      const html = this.markdownService.renderForPreview(processedContent, true)

      // 後處理 HTML 以增強預覽效果
      return this.postProcessHtml(html)
    } catch (error) {
      // Log error for debugging but don't use console in production
      if (typeof globalThis !== "undefined" && (globalThis as unknown as Record<string, unknown>).__DEV__) {
         
        logger.error("Preview rendering error:", error)
      }
      return this.renderErrorFallback(content, error)
    }
  }

  /**
   * 預處理 Obsidian 特殊語法
   * @param {string} content - 原始內容
   * @returns {string} 處理後的內容
   */
  private preprocessObsidianSyntax(content: string): string {
    if (!content || typeof content !== "string") {
      return ""
    }

    let processed = content

    // 處理 Obsidian 高亮語法 ==text== 轉換為 <mark>text</mark>
    processed = processed.replace(/==([^=\n]*)==/g, '<mark class="obsidian-highlight">$1</mark>')

    // 處理 Obsidian 註釋 %%comment%% （在預覽中隱藏）
    processed = processed.replace(/%%[^%]*%%/g, "")

    // 處理 Obsidian 標籤 #tag (支援中文和英文)
    processed = processed.replace(/#([a-zA-Z0-9\u4e00-\u9fff_-]+)/g, '<span class="obsidian-tag">#$1</span>')

    // 處理 Obsidian 圖片語法 ![[image.png]] (必須在 wiki 連結之前處理)
    processed = processed.replace(/!\[\[([^\]]+)\]\]/g, (_, imageName) => {
      if (this.isImageFile(imageName)) {
        const imagePath = this.resolveImagePath(imageName)
        return `<img src="${imagePath}" alt="${this.escapeHtml(imageName)}" class="obsidian-image" title="圖片: ${this.escapeHtml(imageName)}" />`
      } else {
        // 處理 Obsidian 嵌入語法 ![[note]] (非圖片)
        return `<div class="obsidian-embed" data-embed="${this.escapeHtml(imageName)}">
          <div class="obsidian-embed-header">📄 ${this.escapeHtml(imageName)}</div>
          <div class="obsidian-embed-content">嵌入內容預覽</div>
        </div>`
      }
    })

    // 處理 Obsidian 任務清單增強語法
    processed = processed.replace(/- \[([x\s])\] ([^\n]+)/g, (_, checked, text) => {
      const isChecked = checked.toLowerCase() === "x"
      return `- <input type="checkbox" ${isChecked ? "checked" : ""} disabled class="obsidian-task"> ${text}`
    })

    // 處理 Obsidian 引用塊增強
    processed = processed.replace(/^> \[!(\w+)\]([^\n]*)$/gm, (_, type, content) => {
      const calloutClass = `obsidian-callout obsidian-callout-${type.toLowerCase()}`
      return `> <div class="${calloutClass}"><strong>${type.toUpperCase()}</strong>${content}</div>`
    })

    return processed
  }

  /**
   * 處理 Wiki 連結
   * @param {string} content - 內容
   * @param {Article[]} articles - 文章清單
   * @returns {string} 處理後的內容
   */
  private processWikiLinks(content: string, articles: Article[]): string {
    return content.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, link, __, alias) => {
      const displayText = alias || link
      const article = articles.find(a => a.title === link || a.slug === link)
      
      if (article) {
        return `<a href="#" class="obsidian-wikilink obsidian-wikilink-valid" data-link="${this.escapeHtml(link)}" data-article-id="${article.id}" title="連結到: ${this.escapeHtml(article.title)}">${this.escapeHtml(displayText)}</a>`
      } else {
        return `<a href="#" class="obsidian-wikilink obsidian-wikilink-invalid" data-link="${this.escapeHtml(link)}" title="找不到文章: ${this.escapeHtml(link)}">${this.escapeHtml(displayText)}</a>`
      }
    })
  }

  /**
   * 處理圖片引用
   * @param {string} content - 內容
   * @param {string} basePath - 圖片基礎路徑
   * @returns {string} 處理後的內容
   */
  private processImageReferences(content: string, basePath: string): string {
    return content.replace(/!\[\[([^\]]+)\]\]/g, (_, imageName) => {
      const imagePath = this.resolveImagePath(imageName, basePath)
      return `<img src="${imagePath}" alt="${this.escapeHtml(imageName)}" class="obsidian-image" title="圖片: ${this.escapeHtml(imageName)}" loading="lazy" />`
    })
  }

  /**
   * 解析圖片路徑
   * @param {string} imageName - 圖片名稱
   * @param {string} basePath - 基礎路徑
   * @returns {string} 完整的圖片路徑
   */
  private resolveImagePath(imageName: string, basePath?: string): string {
    const base = basePath || this.imageBasePath
    
    // 如果已經是完整路徑，直接返回
    if (imageName.startsWith("http") || imageName.startsWith("/") || imageName.startsWith("./")) {
      return imageName
    }

    // 構建本地檔案 URL
    // 必須用三斜線（local-file:///path）確保路徑成為 URL pathname。
    // 若用兩斜線（local-file://C:/path），URL 規範會把 C 解析為 hostname，
    // 磁碟代號在 protocol handler 取 url.pathname 時遺失。
    if (base) {
      const normalizedBase = base.replace(/\\/g, "/").replace(/^\/+/, "")
      return `local-file:///${normalizedBase}/${imageName}`
    }

    // 預設使用相對路徑
    return `./images/${imageName}`
  }

  /**
   * 將標準 Markdown 圖片語法 ![alt](relative/path) 的相對路徑解析為 local-file:/// 絕對 URL。
   * 使用瀏覽器原生 URL API 做相對路徑解析，不依賴 Node path 模組。
   * @param {string} content - Markdown 內容
   * @param {string} articleFilePath - 文章絕對路徑（用於計算相對路徑的 base）
   * @returns {string} 圖片 src 已轉為 local-file:/// 的 Markdown 內容
   */
  private resolveStandardMarkdownImagePaths(content: string, articleFilePath: string): string {
    if (!articleFilePath) {return content}

    const normalized = articleFilePath.replace(/\\/g, "/")
    const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`
    const articleDir = withLeadingSlash.substring(0, withLeadingSlash.lastIndexOf("/"))
    const base = encodeURI(`file://${articleDir}/`)

    return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (src.startsWith("http") || src.startsWith("local-file:") || src.startsWith("data:") || src.startsWith("file:") || src.startsWith("/")) {
        return match
      }
      try {
        const resolved = new URL(src, base)
        const resolvedPath = resolved.pathname.replace(/^\/+/, "")
        return `![${alt}](local-file:///${resolvedPath})`
      } catch {
        return match
      }
    })
  }

  /**
   * 檢查是否為圖片檔案
   * @param {string} filename - 檔案名稱
   * @returns {boolean} 是否為圖片檔案
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".avif"]
    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."))
    return imageExtensions.includes(ext)
  }

  /**
   * 後處理 HTML 以增強預覽效果
   * @param {string} html - 原始 HTML
   * @returns {string} 處理後的 HTML
   */
  private postProcessHtml(html: string): string {
    let processed = html

    // 將殘留的相對路徑 <img src="..."> 轉換為 local-file:/// 絕對 URL
    // （source-level 轉換失敗時的安全防線，例如 vault 路徑含空格導致 URL 建構錯誤）
    if (this.articleDir) {
      const base = encodeURI(`file://${this.articleDir}/`)
      processed = processed.replace(/<img\b([^>]*)\bsrc="([^"]+)"([^>]*)>/g, (match, before, src, after) => {
        if (src.startsWith("http") || src.startsWith("local-file:") || src.startsWith("data:") || src.startsWith("file:") || src.startsWith("/")) {
          return match
        }
        try {
          const resolved = new URL(src, base)
          const resolvedPath = resolved.pathname.replace(/^\/+/, "")
          return `<img${before}src="local-file:///${resolvedPath}"${after}>`
        } catch {
          return match
        }
      })
    }

    // 為程式碼區塊添加複製按鈕
    processed = processed.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (_, attrs, code) => {
      return `<div class="code-block-wrapper">
        <div class="code-block-header">
          <button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)">
            📋 複製
          </button>
        </div>
        <pre><code${attrs}>${code}</code></pre>
      </div>`
    })

    // 為表格添加響應式包裝
    processed = processed.replaceAll("<table>", '<div class="table-wrapper"><table>')
    processed = processed.replaceAll("</table>", "</table></div>")

    // 為外部連結添加圖示
    processed = processed.replace(/<a href="(https?:\/\/[^"]+)"([^>]*)>/g, '<a href="$1"$2 class="external-link" target="_blank" rel="noopener noreferrer">🔗 ')
    processed = processed.replaceAll("</a>", "</a>")

    // 為標題添加錨點連結
    processed = processed.replace(/<h([1-6])([^>]*)>([^<]*)<\/h[1-6]>/g, (_, level, attrs, content) => {
      const id = this.generateHeaderId(content)
      return `<h${level}${attrs} id="${id}">
        <a href="#${id}" class="header-anchor" aria-hidden="true">#</a>
        ${content}
      </h${level}>`
    })

    return processed
  }

  /**
   * 產生標題 ID
   * @param {string} text - 標題文字
   * @returns {string} 標題 ID
   */
  private generateHeaderId(text: string): string {
    return text
      .toLowerCase()
      .replace(/<[^>]*>/g, "") // 移除 HTML 標籤
      .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, "") // 保留字母、數字、中文和空格
      .replace(/\s+/g, "-") // 空格轉換為連字號
      .replace(/-+/g, "-") // 多個連字號合併為一個
      .replace(/^-+|-+$/g, "") // 移除開頭和結尾的連字號
  }

  /**
   * 渲染錯誤回退內容
   * @param {string} originalContent - 原始內容
   * @param {unknown} error - 錯誤物件
   * @returns {string} 錯誤回退 HTML
   */
  private renderErrorFallback(originalContent: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : "未知錯誤"
    
    return `
      <div class="preview-error">
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>預覽渲染錯誤</h3>
            <div class="text-xs">${this.escapeHtml(errorMessage)}</div>
          </div>
        </div>
        <div class="mt-4">
          <h4 class="text-sm font-semibold mb-2">原始內容：</h4>
          <pre class="text-xs bg-base-200 p-2 rounded overflow-auto max-h-64">${this.escapeHtml(originalContent)}</pre>
        </div>
      </div>
    `
  }

  /**
   * 轉義 HTML 特殊字符
   * @param {string} text - 要轉義的文字
   * @returns {string} 轉義後的文字
   */
  private escapeHtml(text: string): string {
    if (!text || typeof text !== "string") {
      return ""
    }
    
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }

  /**
   * 取得預覽統計資訊
   * @param {string} content - Markdown 內容
   * @returns {object} 統計資訊
   */
  getPreviewStats(content: string): {
    wordCount: number
    characterCount: number
    readingTime: number
    imageCount: number
    linkCount: number
  } {
    if (!content || typeof content !== "string") {
      return {
        wordCount: 0,
        characterCount: 0,
        readingTime: 0,
        imageCount: 0,
        linkCount: 0
      }
    }

    // 移除 Markdown 語法計算純文字
    const plainText = content
      .replace(/```[\s\S]*?```/g, "") // 移除程式碼區塊
      .replace(/`[^`]+`/g, "") // 移除行內程式碼
      .replace(/!\[\[([^\]]+)\]\]/g, "") // 移除 Obsidian 圖片
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 移除標準圖片
      .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, "") // 移除 Obsidian 連結
      .replace(/\[[^\]]*\]\([^)]*\)/g, "") // 移除標準連結
      .replace(/[#*_~`]/g, "") // 移除 Markdown 標記
      .replace(/\s+/g, " ") // 標準化空白
      .trim()

    const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length
    const characterCount = plainText.length
    const readingTime = Math.ceil(wordCount / 200) // 假設每分鐘閱讀 200 字

    // 計算圖片數量 (Obsidian 和標準格式)
    const obsidianImages = (content.match(/!\[\[([^\]]+)\]\]/g) || []).length
    const standardImages = (content.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length
    const imageCount = obsidianImages + standardImages

    // 計算連結數量 (Obsidian 和標準格式)
    const obsidianLinks = (content.match(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g) || []).length
    const standardLinks = (content.match(/\[[^\]]*\]\([^)]*\)/g) || []).length
    const linkCount = obsidianLinks + standardLinks

    return {
      wordCount,
      characterCount,
      readingTime,
      imageCount,
      linkCount
    }
  }

  /**
   * 驗證預覽內容中的連結和圖片
   * @param {string} content - Markdown 內容
   * @returns {object} 驗證結果
   */
  validatePreviewContent(content: string): {
    validImages: string[]
    invalidImages: string[]
    validLinks: string[]
    invalidLinks: string[]
  } {
    const validImages: string[] = []
    const invalidImages: string[] = []
    const validLinks: string[] = []
    const invalidLinks: string[] = []

    // 檢查圖片引用
    const imageMatches = content.match(/!\[\[([^\]]+)\]\]/g) || []
    imageMatches.forEach(match => {
      const imageName = /!\[\[([^\]]+)\]\]/.exec(match)![1]
      if (this.isImageFile(imageName)) {
        validImages.push(imageName)
      } else {
        invalidImages.push(imageName)
      }
    })

    // 檢查 Wiki 連結
    const linkMatches = content.match(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g) || []
    linkMatches.forEach(match => {
      const linkMatch = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/.exec(match)!
      const linkName = linkMatch[1]
      const article = this.articles.find(a => a.title === linkName || a.slug === linkName)
      
      if (article) {
        validLinks.push(linkName)
      } else {
        invalidLinks.push(linkName)
      }
    })

    return {
      validImages,
      invalidImages,
      validLinks,
      invalidLinks
    }
  }
}