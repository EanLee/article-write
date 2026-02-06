import { join } from 'path'
import type { Article } from '../../types'
import { FileService } from './FileService'

/**
 * 發布配置
 */
export interface PublishConfig {
  /** 文章來源目錄 */
  articlesDir: string
  /** Astro 部落格目錄 */
  targetBlogDir: string
  /** 圖片來源目錄 */
  imagesDir?: string
}

/**
 * 發布結果
 */
export interface PublishResult {
  success: boolean
  message: string
  targetPath?: string
  errors?: string[]
  warnings?: string[]
}

/**
 * 發布進度回調
 */
export type PublishProgressCallback = (step: string, progress: number) => void

/**
 * PublishService - 負責將文章從 Obsidian 發布到 Astro 部落格
 *
 * 主要職責:
 * 1. 讀取 Obsidian 文章
 * 2. 轉換 Markdown 語法 (Wiki Links, 圖片語法, Frontmatter)
 * 3. 複製圖片檔案
 * 4. 寫入到 Astro 部落格目錄
 */
export class PublishService {
  private fileService: FileService

  constructor(fileService?: FileService) {
    this.fileService = fileService || new FileService()
  }

  /**
   * 發布單篇文章
   * @param article 文章物件
   * @param config 發布配置
   * @param onProgress 進度回調
   */
  async publishArticle(
    article: Article,
    config: PublishConfig,
    onProgress?: PublishProgressCallback
  ): Promise<PublishResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 驗證配置
      this.validateConfig(config)
      onProgress?.('驗證配置', 10)

      // 驗證文章
      this.validateArticle(article)
      onProgress?.('驗證文章', 20)

      // 讀取文章內容
      onProgress?.('讀取文章', 30)
      const articleContent = await this.readArticleContent(article, config)

      // 轉換 Markdown 內容
      onProgress?.('轉換內容', 50)
      const convertedContent = this.convertMarkdownContent(articleContent)

      // 轉換 Frontmatter
      const convertedFrontmatter = this.convertFrontmatter(article.frontmatter)

      // 處理圖片
      onProgress?.('處理圖片', 70)
      const { content: finalContent, imageWarnings } = await this.processImages(
        convertedContent,
        article,
        config
      )
      warnings.push(...imageWarnings)

      // 生成最終內容
      const finalMarkdown = this.combineContent(convertedFrontmatter, finalContent)

      // 寫入到 Astro 目錄
      onProgress?.('寫入文章', 90)
      const targetPath = await this.writeToAstro(article, finalMarkdown, config)

      onProgress?.('完成', 100)

      return {
        success: true,
        message: `成功發布文章: ${article.title}`,
        targetPath,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      errors.push(errorMessage)
      console.error('Failed to publish article:', error)

      return {
        success: false,
        message: `發布失敗: ${errorMessage}`,
        errors
      }
    }
  }

  /**
   * 驗證配置
   */
  private validateConfig(config: PublishConfig): void {
    if (!config.articlesDir) {
      throw new Error('文章目錄路徑不能為空')
    }
    if (!config.targetBlogDir) {
      throw new Error('Astro 部落格目錄路徑不能為空')
    }
  }

  /**
   * 驗證文章
   */
  private validateArticle(article: Article): void {
    if (!article.title) {
      throw new Error('文章標題不能為空')
    }
    if (!article.slug) {
      throw new Error('文章 slug 不能為空')
    }
    if (!article.filePath) {
      throw new Error('文章檔案路徑不能為空')
    }
  }

  /**
   * 讀取文章內容
   */
  private async readArticleContent(article: Article, config: PublishConfig): Promise<string> {
    // 如果 article 已經有 content，直接使用
    if (article.content) {
      return article.content
    }

    // 否則從檔案讀取
    const fullPath = join(config.articlesDir, article.filePath)
    const exists = await this.fileExists(fullPath)

    if (!exists) {
      throw new Error(`找不到文章檔案: ${fullPath}`)
    }

    return await this.fileService.readFile(fullPath)
  }

  /**
   * 轉換 Markdown 內容
   */
  private convertMarkdownContent(content: string): string {
    let converted = content

    // 1. 轉換 Obsidian 圖片語法 (必須在 Wiki Links 之前): ![[image.png]] → ![image.png](./images/image.png)
    converted = this.convertObsidianImages(converted)

    // 2. 轉換 Wiki Links: [[link]] → [link](link)
    converted = this.convertWikiLinks(converted)

    // 3. 轉換 Obsidian 標籤: #tag → tag (在 frontmatter tags)
    // (標籤轉換在 frontmatter 處理中進行)

    // 4. 移除 Obsidian 註釋: %%comment%%
    converted = this.removeObsidianComments(converted)

    // 5. 轉換高亮語法: ==highlight== → <mark>highlight</mark>
    converted = this.convertHighlightSyntax(converted)

    return converted
  }

  /**
   * 轉換 Wiki Links
   * [[link]] → [link](link)
   * [[link|alias]] → [alias](link)
   */
  private convertWikiLinks(content: string): string {
    // 匹配 [[link|alias]] 或 [[link]]
    return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, link, alias) => {
      const displayText = alias || link
      const url = link.trim()
      return `[${displayText}](${url})`
    })
  }

  /**
   * 轉換 Obsidian 圖片語法
   * ![[image.png]] → ![image.png](./images/image.png)
   * ![[image.png|width]] → ![image.png](./images/image.png)
   */
  private convertObsidianImages(content: string): string {
    return content.replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_, imageName) => {
      const cleanImageName = imageName.trim()
      return `![${cleanImageName}](./images/${cleanImageName})`
    })
  }

  /**
   * 移除 Obsidian 註釋
   * %%comment%% → (empty)
   */
  private removeObsidianComments(content: string): string {
    return content.replace(/%%[\s\S]*?%%/g, '')
  }

  /**
   * 轉換高亮語法
   * ==highlight== → <mark>highlight</mark>
   */
  private convertHighlightSyntax(content: string): string {
    return content.replace(/==([^=]+)==/g, '<mark>$1</mark>')
  }

  /**
   * 轉換 Frontmatter
   */
  private convertFrontmatter(frontmatter: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = { ...frontmatter }

    // 確保必要欄位存在
    if (!converted.pubDate && !converted.publishDate) {
      converted.pubDate = new Date().toISOString()
    }

    // 標準化日期格式
    if (converted.publishDate && !converted.pubDate) {
      converted.pubDate = converted.publishDate
      delete converted.publishDate
    }

    // 處理標籤
    if (converted.tags) {
      if (typeof converted.tags === 'string') {
        // 如果是字串，分割成陣列
        converted.tags = converted.tags.split(',').map((tag: string) => tag.trim())
      }
      // 移除 Obsidian 標籤的 # 符號
      converted.tags = converted.tags.map((tag: string) => tag.replace(/^#/, ''))
    }

    return converted
  }

  /**
   * 處理圖片 - 複製圖片並更新路徑
   */
  private async processImages(
    content: string,
    article: Article,
    config: PublishConfig
  ): Promise<{ content: string; imageWarnings: string[] }> {
    const warnings: string[] = []
    const processedContent = content

    // 提取所有圖片引用
    const imageRegex = /!\[([^\]]*)\]\(\.\/images\/([^)]+)\)/g
    const images = [...content.matchAll(imageRegex)]

    if (images.length === 0) {
      return { content: processedContent, imageWarnings: warnings }
    }

    // 決定圖片來源目錄
    const imageSourceDir = config.imagesDir || join(config.articlesDir, 'images')

    // 確定目標圖片目錄
    const targetImageDir = join(config.targetBlogDir, 'public', 'images')

    // 確保目標目錄存在
    await this.ensureDirectoryExists(targetImageDir)

    // 複製每張圖片
    for (const match of images) {
      const imageName = match[2]
      const sourceImagePath = join(imageSourceDir, imageName)
      const targetImagePath = join(targetImageDir, imageName)

      try {
        // 檢查來源圖片是否存在
        const exists = await this.fileExists(sourceImagePath)
        if (!exists) {
          warnings.push(`找不到圖片: ${imageName}`)
          continue
        }

        // 複製圖片
        await this.fileService.copyFile(sourceImagePath, targetImagePath)
        console.log(`Copied image: ${imageName}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤'
        warnings.push(`複製圖片失敗 ${imageName}: ${errorMessage}`)
      }
    }

    return { content: processedContent, imageWarnings: warnings }
  }

  /**
   * 合併 Frontmatter 和內容
   */
  private combineContent(frontmatter: Record<string, any>, content: string): string {
    const frontmatterYaml = this.stringifyFrontmatter(frontmatter)
    return `---\n${frontmatterYaml}---\n\n${content}`
  }

  /**
   * 將 Frontmatter 物件轉為 YAML 字串
   */
  private stringifyFrontmatter(frontmatter: Record<string, any>): string {
    let yaml = ''

    for (const [key, value] of Object.entries(frontmatter)) {
      if (value === undefined || value === null) {
        continue
      }

      if (Array.isArray(value)) {
        yaml += `${key}:\n`
        value.forEach(item => {
          yaml += `  - ${item}\n`
        })
      } else if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
        // 包含特殊字元的字串需要用引號
        yaml += `${key}: "${value}"\n`
      } else {
        yaml += `${key}: ${value}\n`
      }
    }

    return yaml
  }

  /**
   * 寫入到 Astro 目錄
   */
  private async writeToAstro(
    article: Article,
    content: string,
    config: PublishConfig
  ): Promise<string> {
    // 目標路徑: {targetBlogDir}/src/content/blog/{slug}.md
    const targetDir = join(config.targetBlogDir, 'src', 'content', 'blog')
    await this.ensureDirectoryExists(targetDir)

    const targetPath = join(targetDir, `${article.slug}.md`)

    // 寫入檔案
    await this.fileService.writeFile(targetPath, content)

    console.log(`Published article to: ${targetPath}`)
    return targetPath
  }

  /**
   * 確保目錄存在，不存在則建立
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const exists = await this.fileService.exists(dirPath)
    if (!exists) {
      await this.fileService.createDirectory(dirPath)
    }
  }

  /**
   * 檢查檔案是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    return await this.fileService.exists(filePath)
  }
}
