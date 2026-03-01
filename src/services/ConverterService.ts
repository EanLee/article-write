import type { Article, ConversionConfig } from "@/types"
import { ArticleStatus } from "@/types"
import type { IFileSystem } from "@/types/IFileSystem"
import { electronFileSystem } from "./ElectronFileSystem"
import { articleService as defaultArticleService, ArticleService } from "./ArticleService"
import { MarkdownService } from "./MarkdownService"

/**
 * 轉換結果介面
 */
export interface ConversionResult {
  success: boolean
  processedFiles: number
  errors: Array<{
    file: string
    error: string
  }>
  warnings: Array<{
    file: string
    warning: string
  }>
  completedAt?: Date
}

/**
 * 進度回調函數類型
 */
export type ProgressCallback = (processed: number, total: number, currentFile?: string) => void

/**
 * 轉換服務類別
 * 負責將 Obsidian 格式的文章轉換為 Astro 格式並部署到目標部落格
 *
 * 重構後使用依賴注入：
 * - IFileSystem: 基礎檔案操作
 * - ArticleService: 文章載入邏輯
 */
export class ConverterService {
  private fileSystem: IFileSystem
  private articleService: ArticleService
  private markdownService: MarkdownService

  /**
   * 建構子 - 使用依賴注入
   * @param fileSystem - 檔案系統介面（可選）
   * @param articleService - 文章服務（可選）
   * @param markdownService - Markdown 服務（可選）
   */
  constructor(
    fileSystem?: IFileSystem,
    articleService?: ArticleService,
    markdownService?: MarkdownService
  ) {
    this.fileSystem = fileSystem || electronFileSystem
    this.articleService = articleService || defaultArticleService
    this.markdownService = markdownService || new MarkdownService()
  }

  /**
   * 轉換所有已發布的文章到 Astro 部落格格式
   * @param {ConversionConfig} config - 轉換設定
   * @param {ProgressCallback} onProgress - 進度回調函數
   * @returns {Promise<ConversionResult>} 轉換結果
   */
  async convertAllArticles(config: ConversionConfig, onProgress?: ProgressCallback): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      processedFiles: 0,
      errors: [],
      warnings: []
    }

    try {
      // 掃描所有 status === Published 的文章
      const articles = await this.scanPublishedArticles(config.sourceDir)

      console.log(`Found ${articles.length} articles to convert`)

      // 轉換每篇文章
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i]
        
        // 更新進度
        if (onProgress) {
          onProgress(i, articles.length, article.title)
        }
        
        try {
          const conversionResult = await this.convertSingleArticle(article, config)
          result.processedFiles++
          result.warnings.push(...conversionResult.warnings)
          console.log(`Converted: ${article.title}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          result.errors.push({
            file: article.filePath,
            error: errorMessage
          })
          console.error(`Failed to convert ${article.title}:`, errorMessage)
        }
      }

      // 最終進度更新
      if (onProgress) {
        onProgress(articles.length, articles.length)
      }

      // 如果有錯誤，標記為失敗
      if (result.errors.length > 0) {
        result.success = false
      }

      console.log(`Conversion completed: ${result.processedFiles} files processed, ${result.errors.length} errors`)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.success = false
      result.errors.push({
        file: "conversion process",
        error: errorMessage
      })
      console.error("Conversion process failed:", errorMessage)
      return result
    }
  }

  /**
   * 轉換單一文章
   * @param {Article} article - 要轉換的文章
   * @param {ConversionConfig} config - 轉換設定
   * @returns {Promise<{warnings: Array<{file: string, warning: string}>}>} 轉換警告
   */
  private async convertSingleArticle(article: Article, config: ConversionConfig): Promise<{
    warnings: Array<{file: string, warning: string}>
  }> {
    const warnings: Array<{file: string, warning: string}> = []

    try {
      // 1. 驗證文章基本資訊
      if (!article.title || !article.slug) {
        warnings.push({
          file: article.filePath,
          warning: "文章缺少標題或 slug，可能影響轉換結果"
        })
      }

      // 2. 轉換 Markdown 內容
      const convertedContent = this.convertMarkdownContent(article.content)

      // 3. 處理前置資料
      const convertedFrontmatter = this.convertFrontmatter(article.frontmatter)

      // 4. 建立目標目錄結構 (Leaf Bundle)
      const targetDir = this.createTargetPath(article, config.targetDir)
      await this.fileSystem.createDirectory(targetDir)

      // 5. 複製並處理圖片
      const imageProcessResult = await this.processImages(convertedContent, article, config, targetDir)
      const processedContent = imageProcessResult.content
      warnings.push(...imageProcessResult.warnings)

      // 6. 生成最終的 Markdown 檔案
      const finalContent = this.markdownService.combineContent(convertedFrontmatter, processedContent)

      // 7. 寫入目標檔案
      const targetFilePath = this.joinPath(targetDir, "index.md")
      await this.fileSystem.writeFile(targetFilePath, finalContent)

      // 8. 驗證轉換結果
      const validationResult = await this.validateConversionResult(targetDir, article)
      if (!validationResult.valid) {
        warnings.push({
          file: article.filePath,
          warning: `轉換驗證失敗: ${validationResult.issues.join(", ")}`
        })
      }

      return { warnings }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Failed to convert article:", errorMessage)
      throw error
    }
  }

  /**
   * 掃描已發布文章
   * @param {string} publishPath - Publish 資料夾路徑
   * @returns {Promise<Article[]>} 文章陣列
   */
  private async scanPublishedArticles(sourceDir: string): Promise<Article[]> {
    const articles: Article[] = []
    try {
      const entries = await this.fileSystem.readDirectory(sourceDir)
      for (const entry of entries) {
        const entryPath = `${sourceDir}/${entry}`
        const stats = await this.fileSystem.getFileStats(entryPath)
        if (!stats?.isDirectory) {continue}

        const files = await this.fileSystem.readDirectory(entryPath)
        const mdFiles = files.filter((f) => f.endsWith(".md"))

        for (const file of mdFiles) {
          const filePath = `${entryPath}/${file}`
          try {
            const article = await this.articleService.loadArticle(filePath, entry)
            if (article.status === ArticleStatus.Published) {
              articles.push(article)
            }
          } catch (err) {
            console.warn(`Failed to load article ${filePath}:`, err)
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to scan source dir ${sourceDir}:`, err)
    }
    return articles
  }

  /**
   * 轉換 Markdown 內容格式
   * @param {string} content - 原始內容
   * @returns {string} 轉換後的內容
   */
  private convertMarkdownContent(content: string): string {
    let converted = content

    // 1. 轉換 Wiki 連結 [[link]] 和 [[link|alias]] 為標準 markdown
    converted = this.convertWikiLinks(converted)

    // 2. 轉換高亮語法 ==text== 為 <mark>text</mark>
    converted = this.convertHighlightSyntax(converted)

    // 3. 轉換 Obsidian 圖片語法 ![[image.png]] 為標準格式
    converted = this.convertObsidianImages(converted)

    // 4. 轉換圖片路徑重寫 ../../images/ 為 ./images/
    converted = this.rewriteImagePaths(converted)

    // 5. 移除 Obsidian 註釋 %%comment%%
    converted = this.removeObsidianComments(converted)

    // 6. 轉換 Obsidian 標籤語法
    converted = this.convertObsidianTags(converted)

    // 7. 轉換 Obsidian 內部連結
    converted = this.convertInternalLinks(converted)

    return converted
  }

  /**
   * 轉換 Wiki 連結為標準 Markdown 連結
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertWikiLinks(content: string): string {
    // 轉換 [[link|alias]] 格式（不包含錨點的）
    // 使用負向後查找 (?<!!) 排除 Obsidian 圖片語法 ![[]]
    content = content.replace(/(?<!!)\[\[([^#\]|]+)\|([^\]]+)\]\]/g, (_, link, alias) => {
      const slug = this.markdownService.generateSlugFromTitle(link.trim())
      return `[${alias.trim()}](../${slug}/)`
    })

    // 轉換 [[link]] 格式（不包含錨點的）
    // 使用負向後查找 (?<!!) 排除 Obsidian 圖片語法 ![[]]
    content = content.replace(/(?<!!)\[\[([^#\]]+)\]\]/g, (_, link) => {
      const trimmedLink = link.trim()
      const slug = this.markdownService.generateSlugFromTitle(trimmedLink)
      return `[${trimmedLink}](../${slug}/)`
    })

    return content
  }

  /**
   * 轉換高亮語法
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertHighlightSyntax(content: string): string {
    return content.replace(/==(.*?)==/g, "<mark>$1</mark>")
  }

  /**
   * 轉換 Obsidian 圖片語法
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertObsidianImages(content: string): string {
    return content.replace(/!\[\[([^\]]+)\]\]/g, (_, imageName) => {
      return `![${imageName}](./images/${imageName})`
    })
  }

  /**
   * 移除 Obsidian 註釋
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private removeObsidianComments(content: string): string {
    return content.replace(/%%.*?%%/gs, "")
  }

  /**
   * 重寫圖片路徑從 ../../images/ 格式為 ./images/
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private rewriteImagePaths(content: string): string {
    // 轉換相對路徑格式的圖片引用
    content = content.replace(/!\[([^\]]*)\]\(\.\.\/\.\.\/images\/([^)]+)\)/g, "![$1](./images/$2)")
    
    // 轉換絕對路徑格式的圖片引用
    content = content.replace(/!\[([^\]]*)\]\([^)]*\/images\/([^)]+)\)/g, "![$1](./images/$2)")
    
    return content
  }

  /**
   * 轉換 Obsidian 標籤語法
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertObsidianTags(content: string): string {
    // 將 #tag 格式轉換為適合 Astro 的格式（保持原樣，因為 Astro 支援標籤）
    // 但確保標籤不會與 Markdown 標題混淆
    return content.replace(/(?<!^|\n)(#)([a-zA-Z0-9\u4e00-\u9fff_-]+)/g, " $1$2")
  }

  /**
   * 轉換 Obsidian 內部連結
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertInternalLinks(content: string): string {
    // 處理帶有錨點和別名的內部連結 [[file#section|alias]] (先處理這個，避免被下面的規則匹配)
    content = content.replace(/\[\[([^#\]|]+)#([^|\]]+)\|([^\]]+)\]\]/g, (_, file, section, alias) => {
      const slug = this.markdownService.generateSlugFromTitle(file.trim())
      const anchor = section.trim().toLowerCase().replace(/\s+/g, "-")
      return `[${alias.trim()}](../${slug}/#${anchor})`
    })

    // 處理帶有錨點的內部連結 [[file#section]]
    content = content.replace(/\[\[([^#\]]+)#([^\]]+)\]\]/g, (_, file, section) => {
      const slug = this.markdownService.generateSlugFromTitle(file.trim())
      const anchor = section.trim().toLowerCase().replace(/\s+/g, "-")
      return `[${file.trim()}#${section.trim()}](../${slug}/#${anchor})`
    })

    return content
  }

  /**
   * 轉換前置資料格式
   * @param {any} frontmatter - 原始前置資料
   * @returns {any} 轉換後的前置資料
   */
  private convertFrontmatter(frontmatter: any): any {
    const converted = { ...frontmatter }

    // 確保必要欄位存在
    if (!converted.date) {
      converted.date = new Date().toISOString().split("T")[0]
    }

    // 更新 lastmod 為當前時間
    converted.lastmod = new Date().toISOString().split("T")[0]

    // 確保 tags 是陣列
    if (!Array.isArray(converted.tags)) {
      converted.tags = []
    }

    // 確保 categories 是陣列
    if (!Array.isArray(converted.categories)) {
      converted.categories = []
    }

    return converted
  }

  /**
   * 處理圖片複製和路徑轉換
   * @param {string} content - 內容
   * @param {Article} article - 文章物件
   * @param {ConversionConfig} config - 轉換設定
   * @param {string} targetDir - 目標目錄
   * @returns {Promise<{content: string, warnings: Array<{file: string, warning: string}>}>} 處理結果
   */
  private async processImages(
    content: string, 
    article: Article, 
    config: ConversionConfig, 
    targetDir: string
  ): Promise<{
    content: string
    warnings: Array<{file: string, warning: string}>
  }> {
    const warnings: Array<{file: string, warning: string}> = []
    
    // 提取所有圖片引用
    const imageReferences = this.markdownService.extractImageReferences(content)
    
    if (imageReferences.length === 0) {
      return { content, warnings }
    }

    // 建立目標圖片目錄
    const targetImagesDir = this.joinPath(targetDir, "images")
    await this.fileSystem.createDirectory(targetImagesDir)

    let processedContent = content
    const processedImages: string[] = []
    const failedImages: string[] = []

    // 處理每個圖片引用
    for (const imageRef of imageReferences) {
      try {
        // 解析圖片檔案名稱
        const imageName = this.extractImageName(imageRef)
        
        if (imageName) {
          // 來源圖片路徑
          const sourceImagePath = this.joinPath(config.imageSourceDir, imageName)
          
          // 目標圖片路徑
          const targetImagePath = this.joinPath(targetImagesDir, imageName)
          
          // 檢查來源圖片是否存在
          const sourceExists = await this.fileExists(sourceImagePath)
          if (!sourceExists) {
            warnings.push({
              file: article.filePath,
              warning: `圖片檔案不存在: ${imageName}`
            })
            failedImages.push(imageName)
            continue
          }
          
          // 複製圖片檔案
          await this.copyImageFile(sourceImagePath, targetImagePath)
          
          // 更新內容中的圖片路徑
          processedContent = this.updateImagePath(processedContent, imageRef, imageName)
          processedImages.push(imageName)
        } else {
          warnings.push({
            file: article.filePath,
            warning: `無法解析圖片引用: ${imageRef}`
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        warnings.push({
          file: article.filePath,
          warning: `處理圖片失敗 ${imageRef}: ${errorMessage}`
        })
        console.warn(`Failed to process image ${imageRef}:`, error)
      }
    }

    // 添加處理摘要警告
    if (processedImages.length > 0) {
      console.log(`Successfully processed ${processedImages.length} images for ${article.title}`)
    }
    
    if (failedImages.length > 0) {
      warnings.push({
        file: article.filePath,
        warning: `${failedImages.length} 個圖片檔案處理失敗`
      })
    }

    return { content: processedContent, warnings }
  }

  /**
   * 從圖片引用中提取檔案名稱
   * @param {string} imageRef - 圖片引用
   * @returns {string | null} 檔案名稱
   */
  private extractImageName(imageRef: string): string | null {
    // 處理不同格式的圖片引用
    let imageName: string | null = null
    
    if (imageRef.includes("/")) {
      // 路徑格式：../../images/image.png
      imageName = imageRef.split("/").pop() || null
    } else {
      // 直接檔案名稱：image.png
      imageName = imageRef
    }

    // 驗證是否為有效的圖片檔案名稱
    if (imageName && this.isValidImageFile(imageName)) {
      return imageName
    }

    return null
  }

  /**
   * 檢查是否為有效的圖片檔案
   * @param {string} fileName - 檔案名稱
   * @returns {boolean} 是否為有效圖片檔案
   */
  private isValidImageFile(fileName: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".avif"]
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
    return imageExtensions.includes(ext)
  }

  /**
   * 複製圖片檔案
   * @param {string} sourcePath - 來源路徑
   * @param {string} targetPath - 目標路徑
   */
  private async copyImageFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      // 檢查來源檔案是否存在
      const sourceExists = await this.fileExists(sourcePath)
      if (!sourceExists) {
        throw new Error(`Source image file not found: ${sourcePath}`)
      }

      // 確保目標目錄存在
      const targetDir = this.getDirname(targetPath)
      await this.fileSystem.createDirectory(targetDir)

      // 使用 Electron API 複製檔案
      await (window.electronAPI as any).copyFile(sourcePath, targetPath)
      
      console.log(`Successfully copied image: ${sourcePath} -> ${targetPath}`)
    } catch (error) {
      console.error(`Failed to copy image from ${sourcePath} to ${targetPath}:`, error)
      throw error
    }
  }

  /**
   * 更新內容中的圖片路徑
   * @param {string} content - 內容
   * @param {string} oldPath - 舊路徑
   * @param {string} imageName - 圖片檔案名稱
   * @returns {string} 更新後的內容
   */
  private updateImagePath(content: string, oldPath: string, imageName: string): string {
    const newPath = `./images/${imageName}`
    
    // 替換所有出現的舊路徑
    return content.replace(new RegExp(this.escapeRegExp(oldPath), "g"), newPath)
  }

  /**
   * 建立目標路徑 (Leaf Bundle 結構)
   * @param {Article} article - 文章物件
   * @param {string} targetBlogDir - 目標部落格目錄
   * @returns {string} 目標路徑
   */
  private createTargetPath(article: Article, targetBlogDir: string): string {
    // target 直接是輸出資料夾，結構：{targetDir}/category/slug/
    return this.joinPath(targetBlogDir, article.category, article.slug)
  }

  /**
   * 轉義正規表達式特殊字符
   * @param {string} string - 要轉義的字串
   * @returns {string} 轉義後的字串
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  /**
   * 路徑輔助方法 - 連接路徑
   * @param {...string} paths - 路徑片段
   * @returns {string} 連接後的路徑
   */
  private joinPath(...paths: string[]): string {
    return paths.join("/").replace(/\/+/g, "/").replace(/\\/g, "/")
  }

  /**
   * 路徑輔助方法 - 取得目錄名稱
   * @param {string} filePath - 檔案路徑
   * @returns {string} 目錄路徑
   */
  private getDirname(filePath: string): string {
    const parts = filePath.split(/[/\\]/)
    parts.pop()
    return parts.join("/")
  }

  /**
   * 驗證轉換設定
   * @param {ConversionConfig} config - 轉換設定
   * @returns {boolean} 設定是否有效
   */
  validateConfig(config: ConversionConfig): boolean {
    return !!(
      config.sourceDir &&
      config.targetDir &&
      config.imageSourceDir
    )
  }

  /**
   * 取得轉換統計資訊
   * @param {string} publishPath - Publish 資料夾路徑
   * @returns {Promise<{totalArticles: number, articlesByCategory: Record<string, number>}>} 統計資訊
   */
  async getConversionStats(sourceDir: string): Promise<{
    totalArticles: number
    articlesByCategory: Record<string, number>
  }> {
    const articles = await this.scanPublishedArticles(sourceDir)
    const articlesByCategory: Record<string, number> = {}
    articles.forEach(article => {
      const cat = article.category || "uncategorized"
      articlesByCategory[cat] = (articlesByCategory[cat] ?? 0) + 1
    })

    const stats = {
      totalArticles: articles.length,
      articlesByCategory,
    }

    return stats
  }

  /**
   * 驗證轉換結果的完整性
   * @param {string} targetDir - 目標目錄
   * @param {Article} article - 原始文章
   * @returns {Promise<{valid: boolean, issues: string[]}>} 驗證結果
   */
  async validateConversionResult(targetDir: string, article: Article): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 檢查 index.md 檔案是否存在
      const indexPath = this.joinPath(targetDir, "index.md")
      const indexExists = await this.fileExists(indexPath)
      if (!indexExists) {
        issues.push("index.md file not found")
      }

      // 檢查圖片目錄和檔案
      const imageReferences = this.markdownService.extractImageReferences(article.content)
      if (imageReferences.length > 0) {
        const imagesDir = this.joinPath(targetDir, "images")
        const imagesDirExists = await this.fileExists(imagesDir)
        
        if (!imagesDirExists) {
          issues.push("images directory not found")
        } else {
          // 檢查每個引用的圖片是否存在
          for (const imageRef of imageReferences) {
            const imageName = this.extractImageName(imageRef)
            if (imageName) {
              const imagePath = this.joinPath(imagesDir, imageName)
              const imageExists = await this.fileExists(imagePath)
              if (!imageExists) {
                issues.push(`Image file not found: ${imageName}`)
              }
            }
          }
        }
      }

      // 檢查轉換後的內容是否包含未轉換的 Obsidian 語法
      if (indexExists) {
        const convertedContent = await this.fileSystem.readFile(indexPath)
        
        // 檢查是否還有未轉換的 Wiki 連結
        if (convertedContent.includes("[[") && convertedContent.includes("]]")) {
          issues.push("Unconverted wiki links found")
        }

        // 檢查是否還有未轉換的 Obsidian 圖片語法
        if (convertedContent.includes("![[") && convertedContent.includes("]]")) {
          issues.push("Unconverted Obsidian image syntax found")
        }

        // 檢查是否還有未轉換的高亮語法
        if (convertedContent.includes("==") && convertedContent.match(/==.*?==/)) {
          issues.push("Unconverted highlight syntax found")
        }
      }

    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * 檢查檔案或目錄是否存在
   * @param {string} path - 檔案或目錄路徑
   * @returns {Promise<boolean>} 是否存在
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const stats = await (window.electronAPI as any).getFileStats(path)
      return stats !== null
    } catch {
      return false
    }
  }

  /**
   * 批次複製圖片檔案並建立正確的相對路徑
   * @param {string[]} imageNames - 圖片檔案名稱陣列
   * @param {string} sourceImagesDir - 來源圖片目錄
   * @param {string} targetImagesDir - 目標圖片目錄
   * @returns {Promise<{successful: string[], failed: Array<{name: string, error: string}>}>} 複製結果
   */
  async batchCopyImages(
    imageNames: string[], 
    sourceImagesDir: string, 
    targetImagesDir: string
  ): Promise<{
    successful: string[]
    failed: Array<{name: string, error: string}>
  }> {
    const result = {
      successful: [] as string[],
      failed: [] as Array<{name: string, error: string}>
    }

    // 確保目標目錄存在
    await this.fileSystem.createDirectory(targetImagesDir)

    // 並行複製圖片（限制並發數量以避免系統負載過高）
    const concurrencyLimit = 5
    const chunks = this.chunkArray(imageNames, concurrencyLimit)

    for (const chunk of chunks) {
      const promises = chunk.map(async (imageName) => {
        try {
          const sourcePath = this.joinPath(sourceImagesDir, imageName)
          const targetPath = this.joinPath(targetImagesDir, imageName)
          
          await this.copyImageFile(sourcePath, targetPath)
          result.successful.push(imageName)
        } catch (error) {
          result.failed.push({
            name: imageName,
            error: error instanceof Error ? error.message : "Unknown error"
          })
        }
      })

      await Promise.all(promises)
    }

    return result
  }

  /**
   * 將陣列分割成指定大小的塊
   * @param {T[]} array - 要分割的陣列
   * @param {number} size - 每塊的大小
   * @returns {T[][]} 分割後的陣列
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 清理目標目錄中未使用的圖片檔案
   * @param {string} targetImagesDir - 目標圖片目錄
   * @param {string[]} usedImages - 使用中的圖片檔案名稱
   * @returns {Promise<string[]>} 已清理的檔案名稱陣列
   */
  async cleanupUnusedImages(targetImagesDir: string, usedImages: string[]): Promise<string[]> {
    const cleanedFiles: string[] = []

    try {
      const existingFiles = await this.fileSystem.readDirectory(targetImagesDir)
      
      for (const file of existingFiles) {
        if (this.isValidImageFile(file) && !usedImages.includes(file)) {
          const filePath = this.joinPath(targetImagesDir, file)
          await this.fileSystem.deleteFile(filePath)
          cleanedFiles.push(file)
          console.log(`Cleaned up unused image: ${file}`)
        }
      }
    } catch (error) {
      console.warn("Failed to cleanup unused images:", error)
    }

    return cleanedFiles
  }

  /**
   * 批次轉換指定分類的文章
   * @param {ConversionConfig} config - 轉換設定
   * @param {string} category - 要轉換的分類
   * @param {ProgressCallback} onProgress - 進度回調函數
   * @returns {Promise<ConversionResult>} 轉換結果
   */
  async convertArticlesByCategory(
    config: ConversionConfig, 
    category: string, 
    onProgress?: ProgressCallback
  ): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      processedFiles: 0,
      errors: [],
      warnings: []
    }

    try {
      // 掃描指定分類資料夾（直接在 sourceDir 下，不再有 publish/ 中間層）
      const categoryPath = this.joinPath(config.sourceDir, category)
      const articles = await this.scanCategoryArticles(categoryPath, category)

      console.log(`Found ${articles.length} articles in category ${category}`)

      // 轉換每篇文章
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i]
        
        // 更新進度
        if (onProgress) {
          onProgress(i, articles.length, article.title)
        }
        
        try {
          const conversionResult = await this.convertSingleArticle(article, config)
          result.processedFiles++
          result.warnings.push(...conversionResult.warnings)
          console.log(`Converted: ${article.title}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          result.errors.push({
            file: article.filePath,
            error: errorMessage
          })
          console.error(`Failed to convert ${article.title}:`, errorMessage)
        }
      }

      // 最終進度更新
      if (onProgress) {
        onProgress(articles.length, articles.length)
      }

      // 如果有錯誤，標記為失敗
      if (result.errors.length > 0) {
        result.success = false
      }

      console.log(`Category ${category} conversion completed: ${result.processedFiles} files processed, ${result.errors.length} errors`)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.success = false
      result.errors.push({
        file: `category: ${category}`,
        error: errorMessage
      })
      console.error(`Category ${category} conversion failed:`, errorMessage)
      return result
    }
  }

  /**
   * 掃描指定分類的文章
   * @param {string} categoryPath - 分類資料夾路徑
   * @param {string} category - 分類名稱
   * @returns {Promise<Article[]>} 文章陣列
   */
  private async scanCategoryArticles(categoryPath: string, category: string): Promise<Article[]> {
    const articles: Article[] = []
    
    try {
      const files = await this.fileSystem.readDirectory(categoryPath)
      
      for (const file of files) {
        if (file.endsWith(".md")) {
          const filePath = this.joinPath(categoryPath, file)
          try {
            const article = await this.articleService.loadArticle(filePath, category)
            if (article.status === ArticleStatus.Published) {
              articles.push(article)
            }
          } catch (err) {
            console.warn(`Failed to load article ${filePath}:`, err)
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan category ${category}:`, error)
    }

    return articles
  }

  /**
   * 驗證批次轉換的前置條件
   * @param {ConversionConfig} config - 轉換設定
   * @returns {Promise<{valid: boolean, issues: string[]}>} 驗證結果
   */
  async validateBatchConversionPrerequisites(config: ConversionConfig): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 檢查來源目錄
      if (!config.sourceDir) {
        issues.push("來源目錄未設定")
      } else {
        const sourceExists = await this.fileExists(config.sourceDir)
        if (!sourceExists) {
          issues.push("來源目錄不存在")
        }
      }

      // 檢查目標目錄
      if (!config.targetDir) {
        issues.push("目標目錄未設定")
      } else {
        const targetExists = await this.fileExists(config.targetDir)
        if (!targetExists) {
          issues.push("目標目錄不存在")
        }
      }

      // 檢查圖片目錄
      if (!config.imageSourceDir) {
        issues.push("圖片來源目錄未設定")
      } else {
        const imagesExists = await this.fileExists(config.imageSourceDir)
        if (!imagesExists) {
          issues.push("圖片來源目錄不存在")
        }
      }

    } catch (error) {
      issues.push(`驗證過程發生錯誤: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * 取得批次轉換摘要
   * @param {ConversionResult[]} results - 轉換結果陣列
   * @returns {ConversionResult} 合併後的結果摘要
   */
  getBatchConversionSummary(results: ConversionResult[]): ConversionResult {
    const summary: ConversionResult = {
      success: true,
      processedFiles: 0,
      errors: [],
      warnings: []
    }

    for (const result of results) {
      summary.processedFiles += result.processedFiles
      summary.errors.push(...result.errors)
      summary.warnings.push(...result.warnings)
      
      if (!result.success) {
        summary.success = false
      }
    }

    return summary
  }
}