import type { Article, ConversionConfig } from "@/types";
import { ArticleStatus } from "@/types";
import type { IFileSystem } from "@/types/IFileSystem";
import { electronFileSystem } from "./ElectronFileSystem";
import { articleService as defaultArticleService, ArticleService } from "./ArticleService";
import { MarkdownService } from "./MarkdownService";
import { FrontmatterConverter, frontmatterConverter as defaultFrontmatterConverter } from "./FrontmatterConverter";
import { ConversionValidator, conversionValidator as defaultConversionValidator } from "./ConversionValidator";
import { ImageCopyService } from "./ImageCopyService";
import { logger } from "@/utils/logger";

/**
 * 轉換結果介面
 */
export interface ConversionResult {
  success: boolean;
  processedFiles: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
  warnings: Array<{
    file: string;
    warning: string;
  }>;
  completedAt?: Date;
}

/**
 * 進度回調函數類型
 */
export type ProgressCallback = (processed: number, total: number, currentFile?: string) => void;

/**
 * ConverterService（重構後作為協調者 Orchestrator）
 *
 * 職責：協調各子服務完成 Obsidian → Astro 文章轉換流程。
 * 子服務依賴：
 * - FrontmatterConverter: 前置資料格式轉換
 * - ConversionValidator: 安全性與完整性驗證（含 S5-02 路徑安全強化）
 * - ImageCopyService: 圖片複製與並發控制（含 P5-02 效能強化）
 * - MarkdownService: Markdown 語法轉換
 * - ArticleService: 文章掃描與載入
 * - IFileSystem: 基礎檔案操作
 */
export class ConverterService {
  private fileSystem: IFileSystem;
  private articleService: ArticleService;
  private markdownService: MarkdownService;
  private frontmatterConverter: FrontmatterConverter;
  private validator: ConversionValidator;
  private imageCopyService: ImageCopyService;

  /**
   * 建構子 - 使用依賴注入
   * @param fileSystem - 檔案系統介面（可選，預設 electronFileSystem）
   * @param articleService - 文章服務（可選）
   * @param markdownService - Markdown 服務（可選）
   * @param frontmatterConverter - Frontmatter 轉換服務（可選）
   * @param validator - 驗證服務（可選）
   */
  constructor(
    fileSystem?: IFileSystem,
    articleService?: ArticleService,
    markdownService?: MarkdownService,
    frontmatterConverter?: FrontmatterConverter,
    validator?: ConversionValidator,
  ) {
    this.fileSystem = fileSystem || electronFileSystem;
    this.articleService = articleService || defaultArticleService;
    this.markdownService = markdownService || new MarkdownService();
    this.frontmatterConverter = frontmatterConverter || defaultFrontmatterConverter;
    this.validator = validator || defaultConversionValidator;
    this.imageCopyService = new ImageCopyService(this.fileSystem);
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
      warnings: [],
    };

    try {
      // 掃描所有 status === Published 的文章
      const articles = await this.scanPublishedArticles(config.sourceDir);

      logger.debug(`Found ${articles.length} articles to convert`);

      // 轉換每篇文章
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];

        // 更新進度
        if (onProgress) {
          onProgress(i, articles.length, article.title);
        }

        try {
          const conversionResult = await this.convertSingleArticle(article, config);
          result.processedFiles++;
          result.warnings.push(...conversionResult.warnings);
          logger.debug(`Converted: ${article.title}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            file: article.filePath,
            error: errorMessage,
          });
          logger.error(`Failed to convert ${article.title}:`, errorMessage);
        }
      }

      // 最終進度更新
      if (onProgress) {
        onProgress(articles.length, articles.length);
      }

      // 如果有錯誤，標記為失敗
      if (result.errors.length > 0) {
        result.success = false;
      }

      logger.debug(`Conversion completed: ${result.processedFiles} files processed, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.success = false;
      result.errors.push({
        file: "conversion process",
        error: errorMessage,
      });
      logger.error("Conversion process failed:", errorMessage);
      return result;
    }
  }

  /**
   * 轉換單一文章
   * @param {Article} article - 要轉換的文章
   * @param {ConversionConfig} config - 轉換設定
   * @returns {Promise<{warnings: Array<{file: string, warning: string}>}>} 轉換警告
   */
  private async convertSingleArticle(
    article: Article,
    config: ConversionConfig,
  ): Promise<{
    warnings: Array<{ file: string; warning: string }>;
  }> {
    const warnings: Array<{ file: string; warning: string }> = [];

    try {
      // 0. 路徑安全驗證（S5-02：防止路徑穿越攻擊）
      const pathSafety = this.validator.validateArticlePathSafety(article);
      if (!pathSafety.valid) {
        const msg = `路徑安全驗證失敗: ${pathSafety.issues.join(", ")}`;
        throw new Error(msg);
      }

      // 1. 驗證文章基本資訊
      if (!article.title || !article.slug) {
        warnings.push({
          file: article.filePath,
          warning: "文章缺少標題或 slug，可能影響轉換結果",
        });
      }

      // 2. 轉換 Markdown 內容
      const convertedContent = this.convertMarkdownContent(article.content);

      // 3. 處理前置資料（委派給 FrontmatterConverter）
      const convertedFrontmatter = this.frontmatterConverter.convert(article.frontmatter);

      // 4. 建立目標目錄結構 (Leaf Bundle)
      const targetDir = this.createTargetPath(article, config.targetDir);
      await this.fileSystem.createDirectory(targetDir);

      // 5. 複製並處理圖片
      const imageProcessResult = await this.processImages(convertedContent, article, config, targetDir);
      const processedContent = imageProcessResult.content;
      warnings.push(...imageProcessResult.warnings);

      // 6. 生成最終的 Markdown 檔案
      const finalContent = this.markdownService.combineContent(convertedFrontmatter, processedContent);

      // 7. 寫入目標檔案
      const targetFilePath = this.joinPath(targetDir, "index.md");
      await this.fileSystem.writeFile(targetFilePath, finalContent);

      // 8. 驗證轉換結果（委派給 ConversionValidator）
      const imageReferences = this.markdownService.extractImageReferences(article.content);
      const validationResult = await this.validator.validateConversionResult(
        targetDir,
        article,
        imageReferences,
        (ref) => this.imageCopyService.extractImageName(ref),
        (p) => this.fileExists(p),
        (p) => this.fileSystem.readFile(p),
        (...parts) => this.joinPath(...parts),
      );
      if (!validationResult.valid) {
        warnings.push({
          file: article.filePath,
          warning: `轉換驗證失敗: ${validationResult.issues.join(", ")}`,
        });
      }

      return { warnings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to convert article:", errorMessage);
      throw error;
    }
  }

  /**
   * 掃描已發布文章
   * @param {string} publishPath - Publish 資料夾路徑
   * @returns {Promise<Article[]>} 文章陣列
   */
  private async scanPublishedArticles(sourceDir: string): Promise<Article[]> {
    const articles: Article[] = [];
    try {
      const entries = await this.fileSystem.readDirectory(sourceDir);
      for (const entry of entries) {
        const entryPath = `${sourceDir}/${entry}`;
        const stats = await this.fileSystem.getFileStats(entryPath);
        if (!stats?.isDirectory) {
          continue;
        }

        const files = await this.fileSystem.readDirectory(entryPath);
        const mdFiles = files.filter((f) => f.endsWith(".md"));

        for (const file of mdFiles) {
          const filePath = `${entryPath}/${file}`;
          try {
            const article = await this.articleService.loadArticle(filePath, entry);
            if (article.status === ArticleStatus.Published) {
              articles.push(article);
            }
          } catch (err) {
            logger.warn(`Failed to load article ${filePath}:`, err);
          }
        }
      }
    } catch (err) {
      logger.warn(`Failed to scan source dir ${sourceDir}:`, err);
    }
    return articles;
  }

  /**
   * 轉換 Markdown 內容格式
   * @param {string} content - 原始內容
   * @returns {string} 轉換後的內容
   */
  private convertMarkdownContent(content: string): string {
    let converted = content;

    // 1. 轉換 Wiki 連結 [[link]] 和 [[link|alias]] 為標準 markdown
    converted = this.convertWikiLinks(converted);

    // 2. 轉換高亮語法 ==text== 為 <mark>text</mark>
    converted = this.convertHighlightSyntax(converted);

    // 3. 轉換 Obsidian 圖片語法 ![[image.png]] 為標準格式
    converted = this.convertObsidianImages(converted);

    // 4. 轉換圖片路徑重寫 ../../images/ 為 ./images/
    converted = this.rewriteImagePaths(converted);

    // 5. 移除 Obsidian 註釋 %%comment%%
    converted = this.removeObsidianComments(converted);

    // 6. 轉換 Obsidian 標籤語法
    converted = this.convertObsidianTags(converted);

    // 7. 轉換 Obsidian 內部連結
    converted = this.convertInternalLinks(converted);

    return converted;
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
      const slug = this.markdownService.generateSlugFromTitle(link.trim());
      return `[${alias.trim()}](../${slug}/)`;
    });

    // 轉換 [[link]] 格式（不包含錨點的）
    // 使用負向後查找 (?<!!) 排除 Obsidian 圖片語法 ![[]]
    content = content.replace(/(?<!!)\[\[([^#\]]+)\]\]/g, (_, link) => {
      const trimmedLink = link.trim();
      const slug = this.markdownService.generateSlugFromTitle(trimmedLink);
      return `[${trimmedLink}](../${slug}/)`;
    });

    return content;
  }

  /**
   * 轉換高亮語法
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertHighlightSyntax(content: string): string {
    return content.replace(/==(.*?)==/g, "<mark>$1</mark>");
  }

  /**
   * 轉換 Obsidian 圖片語法
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertObsidianImages(content: string): string {
    return content.replace(/!\[\[([^\]]+)\]\]/g, (_, imageName) => {
      return `![${imageName}](./images/${imageName})`;
    });
  }

  /**
   * 移除 Obsidian 註釋
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private removeObsidianComments(content: string): string {
    return content.replace(/%%.*?%%/gs, "");
  }

  /**
   * 重寫圖片路徑從 ../../images/ 格式為 ./images/
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private rewriteImagePaths(content: string): string {
    // 轉換相對路徑格式的圖片引用
    content = content.replace(/!\[([^\]]*)\]\(\.\.\/\.\.\/images\/([^)]+)\)/g, "![$1](./images/$2)");

    // 轉換絕對路徑格式的圖片引用
    content = content.replace(/!\[([^\]]*)\]\([^)]*\/images\/([^)]+)\)/g, "![$1](./images/$2)");

    return content;
  }

  /**
   * 轉換 Obsidian 標籤語法
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertObsidianTags(content: string): string {
    // 將 #tag 格式轉換為適合 Astro 的格式（保持原樣，因為 Astro 支援標籤）
    // 但確保標籤不會與 Markdown 標題混淆
    return content.replace(/(?<!^|\n)(#)([a-zA-Z0-9\u4e00-\u9fff_-]+)/g, " $1$2");
  }

  /**
   * 轉換 Obsidian 內部連結
   * @param {string} content - 內容
   * @returns {string} 轉換後的內容
   */
  private convertInternalLinks(content: string): string {
    // 處理帶有錨點和別名的內部連結 [[file#section|alias]] (先處理這個，避免被下面的規則匹配)
    content = content.replace(/\[\[([^#\]|]+)#([^|\]]+)\|([^\]]+)\]\]/g, (_, file, section, alias) => {
      const slug = this.markdownService.generateSlugFromTitle(file.trim());
      const anchor = section.trim().toLowerCase().replace(/\s+/g, "-");
      return `[${alias.trim()}](../${slug}/#${anchor})`;
    });

    // 處理帶有錨點的內部連結 [[file#section]]
    content = content.replace(/\[\[([^#\]]+)#([^\]]+)\]\]/g, (_, file, section) => {
      const slug = this.markdownService.generateSlugFromTitle(file.trim());
      const anchor = section.trim().toLowerCase().replace(/\s+/g, "-");
      return `[${file.trim()}#${section.trim()}](../${slug}/#${anchor})`;
    });

    return content;
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
    targetDir: string,
  ): Promise<{
    content: string;
    warnings: Array<{ file: string; warning: string }>;
  }> {
    const warnings: Array<{ file: string; warning: string }> = [];

    // 提取所有圖片引用
    const imageReferences = this.markdownService.extractImageReferences(content);

    if (imageReferences.length === 0) {
      return { content, warnings };
    }

    // 建立目標圖片目錄
    const targetImagesDir = this.joinPath(targetDir, "images");
    await this.fileSystem.createDirectory(targetImagesDir);

    let processedContent = content;
    const processedImages: string[] = [];
    const failedImages: string[] = [];

    // 處理每個圖片引用（委派路徑解析給 ImageCopyService）
    for (const imageRef of imageReferences) {
      try {
        const imageName = this.imageCopyService.extractImageName(imageRef);

        if (imageName) {
          const sourceImagePath = this.joinPath(config.imageSourceDir, imageName);
          const targetImagePath = this.joinPath(targetImagesDir, imageName);

          const sourceExists = await this.fileExists(sourceImagePath);
          if (!sourceExists) {
            warnings.push({ file: article.filePath, warning: `圖片檔案不存在: ${imageName}` });
            failedImages.push(imageName);
            continue;
          }

          // 委派複製給 ImageCopyService
          await this.imageCopyService.copyImageFile(sourceImagePath, targetImagePath);

          // 委派路徑更新給 ImageCopyService
          processedContent = this.imageCopyService.updateImagePath(processedContent, imageRef, imageName);
          processedImages.push(imageName);
        } else {
          warnings.push({ file: article.filePath, warning: `無法解析圖片引用: ${imageRef}` });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        warnings.push({ file: article.filePath, warning: `處理圖片失敗 ${imageRef}: ${errorMessage}` });
        logger.warn(`Failed to process image ${imageRef}:`, error);
      }
    }

    if (processedImages.length > 0) {
      logger.debug(`Successfully processed ${processedImages.length} images for ${article.title}`);
    }

    if (failedImages.length > 0) {
      warnings.push({ file: article.filePath, warning: `${failedImages.length} 個圖片檔案處理失敗` });
    }

    return { content: processedContent, warnings };
  }

  /**
   * 建立目標路徑 (Leaf Bundle 結構)
   * @param {Article} article - 文章物件
   * @param {string} targetBlogDir - 目標部落格目錄
   * @returns {string} 目標路徑
   */
  private createTargetPath(article: Article, targetBlogDir: string): string {
    // target 直接是輸出資料夾，結構：{targetDir}/category/slug/
    return this.joinPath(targetBlogDir, article.category, article.slug);
  }

  /**
   * 路徑輔助方法 - 連接路徑
   * @param {...string} paths - 路徑片段
   * @returns {string} 連接後的路徑
   */
  private joinPath(...paths: string[]): string {
    return paths.join("/").replace(/\/+/g, "/").replace(/\\/g, "/");
  }

  /**

   * 驗證轉換設定（委派給 ConversionValidator）
   * @param {ConversionConfig} config - 轉換設定
   * @returns {boolean} 設定是否有效
   */
  validateConfig(config: ConversionConfig): boolean {
    return this.validator.validateConfig(config);
  }

  /**
   * 取得轉換統計資訊
   * @param {string} publishPath - Publish 資料夾路徑
   * @returns {Promise<{totalArticles: number, articlesByCategory: Record<string, number>}>} 統計資訊
   */
  async getConversionStats(sourceDir: string): Promise<{
    totalArticles: number;
    articlesByCategory: Record<string, number>;
  }> {
    const articles = await this.scanPublishedArticles(sourceDir);
    const articlesByCategory: Record<string, number> = {};
    articles.forEach((article) => {
      const cat = article.category || "uncategorized";
      articlesByCategory[cat] = (articlesByCategory[cat] ?? 0) + 1;
    });

    const stats = {
      totalArticles: articles.length,
      articlesByCategory,
    };

    return stats;
  }

  /**
   * 驗證轉換結果的完整性（委派給 ConversionValidator）
   * @param {string} targetDir - 目標目錄
   * @param {Article} article - 原始文章
   * @returns {Promise<{valid: boolean, issues: string[]}>} 驗證結果
   */
  async validateConversionResult(
    targetDir: string,
    article: Article,
  ): Promise<{ valid: boolean; issues: string[] }> {
    const imageReferences = this.markdownService.extractImageReferences(article.content);
    return this.validator.validateConversionResult(
      targetDir,
      article,
      imageReferences,
      (ref) => this.imageCopyService.extractImageName(ref),
      (p) => this.fileExists(p),
      (p) => this.fileSystem.readFile(p),
      (...parts) => this.joinPath(...parts),
    );
  }

  /**
   * 檢查檔案或目錄是否存在
   * @param {string} path - 檔案或目錄路徑
   * @returns {Promise<boolean>} 是否存在
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const stats = await window.electronAPI.getFileStats(path);
      return stats !== null;
    } catch {
      return false;
    }
  }

  /**
   * 批次複製圖片檔案（委派給 ImageCopyService，使用 worker queue 並發控制）
   * @param {string[]} imageNames - 圖片檔案名稱陣列
   * @param {string} sourceImagesDir - 來源圖片目錄
   * @param {string} targetImagesDir - 目標圖片目錄
   * @returns 複製結果
   */
  async batchCopyImages(
    imageNames: string[],
    sourceImagesDir: string,
    targetImagesDir: string,
  ): Promise<{
    successful: string[];
    failed: Array<{ name: string; error: string }>;
  }> {
    return this.imageCopyService.batchCopyImages(imageNames, sourceImagesDir, targetImagesDir);
  }

  /**
   * 清理目標目錄中未使用的圖片檔案（委派給 ImageCopyService）
   * @param {string} targetImagesDir - 目標圖片目錄
   * @param {string[]} usedImages - 使用中的圖片檔案名稱
   * @returns {Promise<string[]>} 已清理的檔案名稱陣列
   */
  async cleanupUnusedImages(targetImagesDir: string, usedImages: string[]): Promise<string[]> {
    return this.imageCopyService.cleanupUnusedImages(targetImagesDir, usedImages);
  }

  /**
   * 批次轉換指定分類的文章
   * @param {ConversionConfig} config - 轉換設定
   * @param {string} category - 要轉換的分類
   * @param {ProgressCallback} onProgress - 進度回調函數
   * @returns {Promise<ConversionResult>} 轉換結果
   */
  async convertArticlesByCategory(config: ConversionConfig, category: string, onProgress?: ProgressCallback): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      processedFiles: 0,
      errors: [],
      warnings: [],
    };

    try {
      // 掃描指定分類資料夾（直接在 sourceDir 下，不再有 publish/ 中間層）
      const categoryPath = this.joinPath(config.sourceDir, category);
      const articles = await this.scanCategoryArticles(categoryPath, category);

      logger.debug(`Found ${articles.length} articles in category ${category}`);

      // 轉換每篇文章
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];

        // 更新進度
        if (onProgress) {
          onProgress(i, articles.length, article.title);
        }

        try {
          const conversionResult = await this.convertSingleArticle(article, config);
          result.processedFiles++;
          result.warnings.push(...conversionResult.warnings);
          logger.debug(`Converted: ${article.title}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            file: article.filePath,
            error: errorMessage,
          });
          logger.error(`Failed to convert ${article.title}:`, errorMessage);
        }
      }

      // 最終進度更新
      if (onProgress) {
        onProgress(articles.length, articles.length);
      }

      // 如果有錯誤，標記為失敗
      if (result.errors.length > 0) {
        result.success = false;
      }

      logger.debug(`Category ${category} conversion completed: ${result.processedFiles} files processed, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.success = false;
      result.errors.push({
        file: `category: ${category}`,
        error: errorMessage,
      });
      logger.error(`Category ${category} conversion failed:`, errorMessage);
      return result;
    }
  }

  /**
   * 掃描指定分類的文章
   * @param {string} categoryPath - 分類資料夾路徑
   * @param {string} category - 分類名稱
   * @returns {Promise<Article[]>} 文章陣列
   */
  private async scanCategoryArticles(categoryPath: string, category: string): Promise<Article[]> {
    const articles: Article[] = [];

    try {
      const files = await this.fileSystem.readDirectory(categoryPath);

      for (const file of files) {
        if (file.endsWith(".md")) {
          const filePath = this.joinPath(categoryPath, file);
          try {
            const article = await this.articleService.loadArticle(filePath, category);
            if (article.status === ArticleStatus.Published) {
              articles.push(article);
            }
          } catch (err) {
            logger.warn(`Failed to load article ${filePath}:`, err);
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to scan category ${category}:`, error);
    }

    return articles;
  }

  /**
   * 驗證批次轉換的前置條件（委派給 ConversionValidator）
   * @param {ConversionConfig} config - 轉換設定
   * @returns {Promise<{valid: boolean, issues: string[]}>} 驗證結果
   */
  async validateBatchConversionPrerequisites(config: ConversionConfig): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    return this.validator.validateBatchPrerequisites(config, (p) => this.fileExists(p));
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
      warnings: [],
    };

    for (const result of results) {
      summary.processedFiles += result.processedFiles;
      summary.errors.push(...result.errors);
      summary.warnings.push(...result.warnings);

      if (!result.success) {
        summary.success = false;
      }
    }

    return summary;
  }
}
