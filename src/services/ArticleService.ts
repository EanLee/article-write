/**
 * ArticleService - 集中管理所有文章相關的商業邏輯
 *
 * 重構後的職責（符合 SOLID 原則）：
 * - 文章的商業邏輯（驗證、轉換、協調）
 * - 委派檔案操作給 IFileSystem
 * - 委派 Markdown 解析給 MarkdownService
 * - 委派備份管理給 BackupService
 *
 * 依賴注入原則：
 * - 依賴介面而非具體實作（Dependency Inversion Principle）
 * - 透過 constructor 注入依賴
 * - 方便單元測試（可注入 Mock 物件）
 */

import type { Article, Frontmatter } from "@/types";
import { ArticleStatus, ArticleCategory } from "@/types";
import type { IFileSystem } from "@/types/IFileSystem";
import { MarkdownService } from "./MarkdownService";
import { backupService as defaultBackupService } from "./BackupService";
import type { BackupService } from "./BackupService";
import { electronFileSystem } from "./ElectronFileSystem";

export class ArticleService {
  private fileSystem: IFileSystem;
  private markdownService: MarkdownService;
  private backupService: BackupService;

  /**
   * 建構子 - 使用依賴注入
   * @param fileSystem - 檔案系統介面（可選，預設使用 ElectronFileSystem）
   * @param markdownService - Markdown 服務（可選）
   * @param backupService - 備份服務（可選）
   */
  constructor(fileSystem?: IFileSystem, markdownService?: MarkdownService, backupService?: BackupService) {
    this.fileSystem = fileSystem || electronFileSystem;
    this.markdownService = markdownService || new MarkdownService();
    this.backupService = backupService || defaultBackupService;
  }

  /**
   * 讀取文章內容（從磁碟）
   * @param filePath - 檔案路徑
   * @returns 解析後的文章資料
   */
  async readArticle(filePath: string): Promise<{ frontmatter: Partial<Frontmatter>; content: string }> {
    const rawContent = await this.fileSystem.readFile(filePath);
    const parsed = this.markdownService.parseFrontmatter(rawContent);

    return {
      frontmatter: parsed.frontmatter,
      content: parsed.body,
    };
  }

  /**
   * 儲存文章（寫入磁碟）
   *
   * ⚠️ 重要：這是唯一應該寫入文章檔案的方法
   *
   * @param article - 要儲存的文章
   * @param options - 儲存選項
   * @returns 儲存結果
   */
  async saveArticle(
    article: Article,
    options: {
      skipConflictCheck?: boolean;
      skipBackup?: boolean;
    } = {},
  ): Promise<{ success: boolean; conflict?: boolean; error?: Error }> {
    try {
      // 1. 衝突檢測（除非跳過）
      if (!options.skipConflictCheck) {
        const conflictResult = await this.backupService.detectConflict(article);
        if (conflictResult.hasConflict) {
          return {
            success: false,
            conflict: true,
          };
        }
      }

      // 2. 建立備份（除非跳過）
      if (!options.skipBackup) {
        await this.backupService.createBackup(article);
      }

      // 3. 組合 markdown 內容
      const markdownContent = this.markdownService.combineContent(article.frontmatter, article.content);

      // 4. 寫入檔案（透過抽象介面）
      await this.fileSystem.writeFile(article.filePath, markdownContent);

      return { success: true };
    } catch (error) {
      console.error("[ArticleService] Failed to save article:", error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 更新文章內容（僅記憶體中）
   *
   * ⚠️ 注意：這個方法不會寫入檔案，只是更新資料
   * 需要明確調用 saveArticle() 才會寫入
   *
   * @param article - 原始文章
   * @param updates - 要更新的欄位
   * @returns 更新後的文章
   */
  updateArticleData(
    article: Article,
    updates: {
      content?: string;
      frontmatter?: Partial<Frontmatter>;
    },
  ): Article {
    return {
      ...article,
      content: updates.content ?? article.content,
      frontmatter: {
        ...article.frontmatter,
        ...updates.frontmatter,
      },
      lastModified: new Date(),
    };
  }

  /**
   * 從 Raw 模式的內容解析出 frontmatter 和 content
   *
   * @param rawContent - 完整的 markdown 內容（包含 frontmatter）
   * @returns 解析後的資料
   */
  parseRawContent(rawContent: string): {
    frontmatter: Partial<Frontmatter>;
    content: string;
    hasValidFrontmatter: boolean;
    errors: string[];
  } {
    const parsed = this.markdownService.parseFrontmatter(rawContent);
    return {
      frontmatter: parsed.frontmatter,
      content: parsed.body,
      hasValidFrontmatter: parsed.hasValidFrontmatter || false,
      errors: parsed.errors || [],
    };
  }

  /**
   * 組合 frontmatter 和 content 成 Raw 模式的完整內容
   *
   * @param frontmatter - frontmatter 資料
   * @param content - markdown 內容
   * @returns 完整的 markdown 字串
   */
  combineToRawContent(frontmatter: Partial<Frontmatter>, content: string): string {
    return this.markdownService.combineContent(frontmatter, content);
  }

  /**
   * 載入所有文章（從磁碟掃描）
   *
   * @param vaultPath - Obsidian vault 根目錄路徑
   * @returns 載入的所有文章
   */
  async loadAllArticles(vaultPath: string): Promise<Article[]> {
    // 收集所有載入任務，稍後並行執行
    const loadTasks: Promise<Article | null>[] = [];

    // 掃描 Drafts 和 Publish 兩個資料夾
    const folders = [
      { path: `${vaultPath}/Drafts`, status: ArticleStatus.Draft },
      { path: `${vaultPath}/Publish`, status: ArticleStatus.Published },
    ];

    // 第一階段：收集所有檔案路徑和元資料
    for (const folder of folders) {
      try {
        // 檢查資料夾是否存在
        const stats = await this.fileSystem.getFileStats(folder.path);
        if (!stats?.isDirectory) {
          continue;
        }

        // 讀取分類資料夾 (Software, growth, management)
        const categories = await this.fileSystem.readDirectory(folder.path);

        for (const category of categories) {
          const categoryPath = `${folder.path}/${category}`;
          const catStats = await this.fileSystem.getFileStats(categoryPath);
          if (!catStats?.isDirectory) {
            continue;
          }

          // 讀取分類下的 markdown 檔案
          const files = await this.fileSystem.readDirectory(categoryPath);
          const mdFiles = files.filter((f) => f.endsWith(".md"));

          // 為每個檔案建立載入任務（不立即執行）
          for (const file of mdFiles) {
            const filePath = `${categoryPath}/${file}`;
            // 建立 Promise 並加入任務列表
            const loadTask = this.loadArticle(filePath, folder.status, category as ArticleCategory).catch((err) => {
              console.warn(`Failed to load article ${filePath}:`, err);
              return null; // 載入失敗返回 null
            });
            loadTasks.push(loadTask);
          }
        }
      } catch (err) {
        console.warn(`Failed to scan ${folder.path}:`, err);
      }
    }

    // 第二階段：並行執行所有載入任務（限制並發數避免過載）
    const loadedArticles = await this.loadInBatches(loadTasks, 10);

    // 過濾掉載入失敗的文章 (null 值)
    return loadedArticles.filter((article): article is Article => article !== null);
  }

  /**
   * 批次並行載入，避免同時開啟過多檔案
   *
   * @param tasks - 載入任務陣列
   * @param batchSize - 每批次並行載入的數量
   * @returns 載入結果陣列
   */
  private async loadInBatches<T>(tasks: Promise<T>[], batchSize: number): Promise<T[]> {
    const results: T[] = [];

    // 分批執行任務
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 載入單一文章（從磁碟）
   *
   * @param filePath - 檔案路徑
   * @param status - 文章狀態 (draft/published)
   * @param categoryFolder - 分類資料夾名稱
   * @returns 載入的文章
   */
  async loadArticle(filePath: string, status: ArticleStatus, categoryFolder: ArticleCategory): Promise<Article> {
    // 讀取檔案內容
    const content = await this.fileSystem.readFile(filePath);
    const { frontmatter, content: articleContent } = this.markdownService.parseMarkdown(content);

    // 取得檔案的最後修改時間
    const fileStats = await this.fileSystem.getFileStats(filePath);
    const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date();

    // 決定文章分類：優先從 frontmatter.categories 取得，其次使用資料夾名稱
    let articleCategory: ArticleCategory;
    if (frontmatter.categories && frontmatter.categories.length > 0) {
      // 從 frontmatter.categories 陣列取第一個有效值
      const firstCategory = frontmatter.categories[0];
      if (Object.values(ArticleCategory).includes(firstCategory as ArticleCategory)) {
        articleCategory = firstCategory as ArticleCategory;
      } else {
        // 如果 categories 值不在 enum 中，使用資料夾名稱或預設值
        articleCategory = (
          Object.values(ArticleCategory).includes(categoryFolder as ArticleCategory) ? categoryFolder : ArticleCategory.Software
        ) as ArticleCategory;
      }
    } else {
      // 沒有 frontmatter.categories，使用資料夾名稱或預設值
      articleCategory = (
        Object.values(ArticleCategory).includes(categoryFolder as ArticleCategory) ? categoryFolder : ArticleCategory.Software
      ) as ArticleCategory;
    }

    // 從檔案路徑取得檔案名稱（不含副檔名）
    const fileName = filePath.split("/").pop()?.replace(".md", "") || "untitled";

    const article: Article = {
      id: this.generateId(),
      title: frontmatter.title || fileName,
      slug: frontmatter.slug || fileName,
      filePath,
      status,
      category: articleCategory,
      lastModified,
      content: articleContent,
      frontmatter,
    };

    return article;
  }

  /**
   * 刪除文章
   *
   * @param article - 要刪除的文章
   */
  async deleteArticle(article: Article): Promise<void> {
    // 刪除前先備份
    await this.backupService.createBackup(article);

    // 刪除檔案
    await this.fileSystem.deleteFile(article.filePath);
  }

  /**
   * 移動文章（例如從草稿到已發布）
   *
   * @param article - 要移動的文章
   * @param newFilePath - 新的檔案路徑
   */
  async moveArticle(article: Article, newFilePath: string): Promise<void> {
    // 讀取原始內容
    const content = await this.fileSystem.readFile(article.filePath);

    // 寫入新位置
    await this.fileSystem.writeFile(newFilePath, content);

    // 刪除舊檔案
    await this.fileSystem.deleteFile(article.filePath);
  }

  /**
   * 產生唯一 ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * 從標題產生 slug
   *
   * @param title - 文章標題
   * @returns URL-safe 的 slug
   */
  /**
   * 從標題產生 slug
   *
   * @param title - 文章標題
   * @returns URL-safe 的 slug
   */
  generateSlug(title: string): string {
    return title
      .trim() // 先 trim 前後空格
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, ""); // 移除前後的 -
  }

  /**
   * 驗證文章資料是否有效
   *
   * @param article - 要驗證的文章
   * @returns 驗證結果
   */
  validateArticle(article: Article): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!article.title || article.title.trim() === "") {
      errors.push("標題不能為空");
    }

    if (!article.filePath || article.filePath.trim() === "") {
      errors.push("檔案路徑不能為空");
    }

    if (!article.frontmatter) {
      errors.push("缺少 frontmatter");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 單例模式
let articleServiceInstance: ArticleService | null = null;

export function getArticleService(): ArticleService {
  if (!articleServiceInstance) {
    articleServiceInstance = new ArticleService();
  }
  return articleServiceInstance;
}

// 導出單例實例（與其他服務保持一致）
export const articleService = getArticleService();
