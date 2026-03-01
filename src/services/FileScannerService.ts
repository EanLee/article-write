import * as chokidar from "chokidar";
import type { Article, FileSystemItem } from "@/types";
import { ArticleStatus } from "@/types";
import type { IFileSystem } from "@/types/IFileSystem";
import { MarkdownService } from "./MarkdownService";
import { electronFileSystem } from "./ElectronFileSystem";

/**
 * 檔案掃描服務類別
 * 負責掃描 Markdown 檔案、解析文章內容，以及監控檔案系統變更
 */
export class FileScannerService {
  private markdownService: MarkdownService;
  private fileSystem: IFileSystem;
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private changeCallbacks: Map<string, (filePath: string, event: "add" | "change" | "unlink") => void> = new Map();

  /**
   * 建構子 - 使用依賴注入
   * @param fileSystem - 檔案系統介面（可選，預設使用 ElectronFileSystem）
   * @param markdownService - Markdown 服務（可選）
   */
  constructor(fileSystem?: IFileSystem, markdownService?: MarkdownService) {
    this.fileSystem = fileSystem || electronFileSystem;
    this.markdownService = markdownService || new MarkdownService();
  }

  /**
   * 掃描目錄中的 Markdown 檔案並解析為 Article 物件
   * @param {string} directoryPath - 要掃描的目錄路徑
   * @param {'draft' | 'published'} status - 文章狀態（草稿或已發布）
   * @returns {Promise<Article[]>} 解析後的文章陣列
   */
  async scanMarkdownFiles(directoryPath: string, status: ArticleStatus): Promise<Article[]> {
    try {
      const files = await this.getMarkdownFiles(directoryPath);
      const articles: Article[] = [];

      for (const filePath of files) {
        try {
          const article = await this.parseMarkdownFile(filePath, status, directoryPath);
          if (article) {
            articles.push(article);
          }
        } catch (error) {
          console.error(`Failed to parse file ${filePath}:`, error);
          // Continue processing other files even if one fails
        }
      }

      return articles;
    } catch (error) {
      console.error(`Failed to scan directory ${directoryPath}:`, error);
      return [];
    }
  }

  /**
   * 解析單一 Markdown 檔案為 Article 物件
   * @param {string} filePath - 檔案路徑
   * @param {'draft' | 'published'} status - 文章狀態
   * @returns {Promise<Article | null>} 解析後的文章物件，失敗時返回 null
   */
  async parseMarkdownFile(filePath: string, status: ArticleStatus, rootDir?: string): Promise<Article | null> {
    try {
      const content = await this.fileSystem.readFile(filePath);
      const parsed = this.markdownService.parseFrontmatter(content);

      const fileName = this.getBasename(filePath, ".md");
      const category = this.extractCategoryFromPath(filePath, rootDir);
      const stats = await this.fileSystem.getFileStats(filePath);

      // Log parsing errors but continue processing
      if (parsed.errors.length > 0) {
        console.warn(`Frontmatter parsing errors in ${filePath}:`, parsed.errors);
      }

      const article: Article = {
        id: this.generateIdFromPath(filePath),
        title: parsed.frontmatter.title || fileName,
        slug: parsed.frontmatter.slug || this.generateSlug(parsed.frontmatter.title || fileName),
        filePath,
        status,
        category,
        content: parsed.body,
        frontmatter: {
          title: parsed.frontmatter.title || fileName,
          description: parsed.frontmatter.description || "",
          date: parsed.frontmatter.date || new Date().toISOString().split("T")[0],
          lastmod: parsed.frontmatter.lastmod,
          tags: parsed.frontmatter.tags || [],
          categories: parsed.frontmatter.categories || [category],
          slug: parsed.frontmatter.slug,
          keywords: parsed.frontmatter.keywords || [],
        },
        lastModified: stats ? new Date(stats.mtime) : new Date(),
      };

      return article;
    } catch (error) {
      console.error(`Failed to parse markdown file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 遞迴取得目錄中所有 Markdown 檔案
   * @param {string} directoryPath - 目錄路徑
   * @returns {Promise<string[]>} Markdown 檔案路徑陣列
   */
  private async getMarkdownFiles(directoryPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const items = await this.fileSystem.readDirectory(directoryPath);

      for (const item of items) {
        const fullPath = this.joinPath(directoryPath, item);
        const stats = await this.fileSystem.getFileStats(fullPath);

        if (stats?.isDirectory) {
          // Recursively scan subdirectories
          const subFiles = await this.getMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (item.endsWith(".md")) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Failed to read directory ${directoryPath}:`, error);
    }

    return files;
  }

  /**
   * 從檔案路徑中提取分類
   * @param {string} filePath - 檔案路徑
   * @returns {'Software' | 'growth' | 'management'} 文章分類
   */
  private extractCategoryFromPath(filePath: string, rootDir?: string): string {
    const normalized = filePath.replace(/\\/g, "/");

    if (rootDir) {
      const root = rootDir.replace(/\\/g, "/").replace(/\/$/, "");
      const relative = normalized.startsWith(root)
        ? normalized.slice(root.length + 1)
        : normalized;
      // 第一個路徑片段就是分類資料夾
      const firstSegment = relative.split("/")[0];
      // 若第一段就是檔案（含 .md），代表文章在根目錄下，無分類
      if (firstSegment && !firstSegment.endsWith(".md")) {
        return firstSegment;
      }
      return "";
    }

    // 無 rootDir 時回退：取倒數第二個路徑片段
    const parts = normalized.split("/");
    const fileIndex = parts.length - 1;
    return fileIndex >= 1 ? parts[fileIndex - 1] : "";
  }

  /**
   * 從檔案路徑產生唯一 ID
   * @param {string} filePath - 檔案路徑
   * @returns {string} 唯一識別碼
   */
  private generateIdFromPath(filePath: string): string {
    // Use normalized file path hash as ID for consistency
    // 正規化：統一斜線方向並轉為小寫，確保跨平台相同路徑產生相同 ID
    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
    return Buffer.from(normalizedPath)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 16);
  }

  /**
   * 從標題產生 URL 友善的 slug
   * @param {string} title - 文章標題
   * @returns {string} URL slug
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  /**
   * 開始監控目錄的檔案變更
   * @param {string} directoryPath - 要監控的目錄路徑
   * @param {Function} callback - 檔案變更時的回調函數
   */
  startWatching(directoryPath: string, callback: (filePath: string, event: "add" | "change" | "unlink") => void): void {
    // Stop existing watcher if any
    this.stopWatching(directoryPath);

    const watcher = chokidar.watch(this.joinPath(directoryPath, "**/*.md"), {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on("add", (filePath) => callback(filePath, "add"))
      .on("change", (filePath) => callback(filePath, "change"))
      .on("unlink", (filePath) => callback(filePath, "unlink"))
      .on("error", (error) => console.error("File watcher error:", error));

    this.watchers.set(directoryPath, watcher);
    this.changeCallbacks.set(directoryPath, callback);
  }

  /**
   * 停止監控指定目錄
   * @param {string} directoryPath - 目錄路徑
   */
  stopWatching(directoryPath: string): void {
    const watcher = this.watchers.get(directoryPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(directoryPath);
      this.changeCallbacks.delete(directoryPath);
    }
  }

  /**
   * 停止所有檔案監控器
   */
  stopAllWatchers(): void {
    for (const [directoryPath] of this.watchers) {
      this.stopWatching(directoryPath);
    }
  }

  /**
   * 取得目錄結構用於顯示
   * @param {string} directoryPath - 目錄路徑
   * @returns {Promise<FileSystemItem[]>} 目錄結構陣列
   */
  async getDirectoryStructure(directoryPath: string): Promise<FileSystemItem[]> {
    try {
      const items = await this.fileSystem.readDirectory(directoryPath);
      const structure: FileSystemItem[] = [];

      for (const item of items) {
        const fullPath = this.joinPath(directoryPath, item);
        const stats = await this.fileSystem.getFileStats(fullPath);

        structure.push({
          name: item,
          path: fullPath,
          isDirectory: stats?.isDirectory || false,
          lastModified: stats ? new Date(stats.mtime) : undefined,
        });
      }

      return structure.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory) {
          return -1;
        }
        if (!a.isDirectory && b.isDirectory) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error(`Failed to get directory structure for ${directoryPath}:`, error);
      return [];
    }
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
   * 路徑輔助方法 - 取得檔案名稱
   * @param {string} filePath - 檔案路徑
   * @param {string} ext - 要移除的副檔名
   * @returns {string} 檔案名稱
   */
  private getBasename(filePath: string, ext?: string): string {
    const name = filePath.split(/[/\\]/).pop() || "";
    if (ext && name.endsWith(ext)) {
      return name.slice(0, -ext.length);
    }
    return name;
  }
}
