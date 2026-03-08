import type { Article } from "@/types";
import { logger } from "@/utils/logger";
// QUAL6-06: 型別定義已提取至 @/types/image，避免消費端耦合實作細節
export type { ImageInfo, ImageReference, ImageValidationResult, ImageValidationDetails, ImageValidationWarning } from "@/types/image";
import type { ImageInfo, ImageReference, ImageValidationResult, ImageValidationDetails, ImageValidationWarning } from "@/types/image";

/**
 * 圖片服務類別
 * 負責管理圖片檔案、驗證圖片引用，以及提供圖片相關功能
 */
export class ImageService {
  private vaultPath: string = "";
  private imagesPath: string = "";
  private articles: Article[] = [];

  /**
   * 設定 Vault 路徑
   * @param {string} path - Obsidian Vault 路徑
   */
  setVaultPath(path: string): void {
    this.vaultPath = path;
  }

  /**
   * 設定圖片目錄路徑（對應 config.paths.imagesDir）
   * 若未設定，getImagesPath() 將回退到 vaultPath/images
   * @param {string} path - 圖片目錄絕對路徑
   */
  setImagesPath(path: string): void {
    this.imagesPath = path;
  }

  /**
   * 更新文章清單
   * @param {Article[]} articles - 文章陣列
   */
  updateArticles(articles: Article[]): void {
    this.articles = articles;
  }

  /**
   * 取得圖片目錄路徑
   * 優先使用使用者設定的 imagesPath（config.paths.imagesDir），
   * 未設定時回退到 vaultPath/images
   * @returns {string} 圖片目錄路徑
   */
  getImagesPath(): string {
    return this.imagesPath || `${this.vaultPath}/images`;
  }

  /**
   * 掃描並載入所有圖片資訊
   * @returns {Promise<ImageInfo[]>} 圖片資訊陣列
   */
  async loadImages(): Promise<ImageInfo[]> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return [];
    }

    try {
      const imagesPath = this.getImagesPath();

      // Check if images directory exists

      const stats = await window.electronAPI.getFileStats(imagesPath);
      if (!stats?.isDirectory) {
        return [];
      }

      const files = await window.electronAPI.readDirectory(imagesPath);

      // Filter image files
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"];
      const imageFiles = files.filter((file) => {
        const ext = file.toLowerCase().substring(file.lastIndexOf("."));
        return imageExtensions.includes(ext);
      });

      const imageInfos: ImageInfo[] = [];

      for (const fileName of imageFiles) {
        const filePath = `${imagesPath}/${fileName}`;

        try {
          const fileStats = await window.electronAPI.getFileStats(filePath);

          const imageInfo: ImageInfo = {
            name: fileName,
            path: filePath,
            size: 0, // File size not available from current API
            lastModified: fileStats?.mtime ? new Date(fileStats.mtime) : new Date(),
            isUsed: this.isImageUsed(fileName),
            exists: true,
            preview: `file://${filePath}`,
          };

          imageInfos.push(imageInfo);
        } catch {
          // If we can't get stats, still include the image but mark as potentially problematic
          const imageInfo: ImageInfo = {
            name: fileName,
            path: filePath,
            size: 0,
            lastModified: new Date(),
            isUsed: this.isImageUsed(fileName),
            exists: false,
            preview: undefined,
          };

          imageInfos.push(imageInfo);
        }
      }

      return imageInfos;
    } catch (error) {
      logger.error("Failed to load images:", error);
      return [];
    }
  }

  /**
   * 檢查圖片是否被文章引用
   * @param {string} imageName - 圖片檔名
   * @returns {boolean} 是否被使用
   */
  isImageUsed(imageName: string): boolean {
    return this.articles.some((article) => {
      const imageRegex = /!\[\[([^\]]+)\]\]/g;
      let match;
      while ((match = imageRegex.exec(article.content)) !== null) {
        if (match[1] === imageName) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * 取得文章中引用的所有圖片
   * @param {Article} article - 文章物件
   * @returns {ImageReference[]} 圖片引用陣列
   */
  getArticleImageReferences(article: Article): ImageReference[] {
    const references: ImageReference[] = [];
    const lines = article.content.split("\n");

    lines.forEach((line, index) => {
      // Obsidian 格式圖片: ![[image.png]]
      const obsidianImageRegex = /!\[\[([^\]]+)\]\]/g;
      let match;

      while ((match = obsidianImageRegex.exec(line)) !== null) {
        const imageName = match[1];

        references.push({
          imageName,
          articleId: article.id,
          articleTitle: article.title,
          line: index + 1,
          exists: false, // Will be updated by validation methods
        });
      }

      // 標準 Markdown 格式圖片: ![alt](path)
      const standardImageRegex = /!\[.*?\]\(([^)]+)\)/g;
      while ((match = standardImageRegex.exec(line)) !== null) {
        const imagePath = match[1];
        // 提取檔名（如果是相對路徑）
        const imageName = imagePath.includes("/") ? imagePath.split("/").pop() || imagePath : imagePath;

        references.push({
          imageName,
          articleId: article.id,
          articleTitle: article.title,
          line: index + 1,
          exists: false, // Will be updated by validation methods
        });
      }
    });

    return references;
  }

  /**
   * 檢查圖片檔案是否存在
   * @param {string} imageName - 圖片檔名
   * @returns {Promise<boolean>} 檔案是否存在
   */
  async checkImageExists(imageName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return false;
    }

    try {
      const filePath = `${this.getImagesPath()}/${imageName}`;

      const stats = await window.electronAPI.getFileStats(filePath);
      return stats !== null && !stats.isDirectory;
    } catch {
      return false;
    }
  }

  /**
   * 批量檢查多個圖片檔案是否存在
   * @param {string[]} imageNames - 圖片檔名陣列
   * @returns {Promise<Map<string, boolean>>} 圖片存在性對照表
   */
  async checkMultipleImagesExist(imageNames: string[]): Promise<Map<string, boolean>> {
    // 並行查詢，避免 N 次序列 IPC 呼叫 (P6-05)
    const entries = await Promise.all(
      imageNames.map(async (imageName) => {
        const exists = await this.checkImageExists(imageName);
        return [imageName, exists] as const;
      }),
    );
    return new Map(entries);
  }

  /**
   * 驗證所有圖片引用
   * @returns {Promise<ImageValidationResult>} 驗證結果
   */
  async validateImageReferences(): Promise<ImageValidationResult> {
    const allImages = await this.loadImages();
    const validImages: string[] = [];
    const invalidImages: string[] = [];
    const unusedImages: string[] = [];

    // Check each image
    for (const image of allImages) {
      if (image.exists) {
        if (image.isUsed) {
          validImages.push(image.name);
        } else {
          unusedImages.push(image.name);
        }
      } else {
        invalidImages.push(image.name);
      }
    }

    // Check for referenced images that don't exist
    for (const article of this.articles) {
      const references = this.getArticleImageReferences(article);
      for (const ref of references) {
        if (!ref.exists && !invalidImages.includes(ref.imageName)) {
          invalidImages.push(ref.imageName);
        }
      }
    }

    return {
      validImages,
      invalidImages,
      unusedImages,
      totalImages: allImages.length,
    };
  }

  /**
   * 取得詳細的圖片驗證結果
   * @returns {Promise<ImageValidationDetails[]>} 詳細驗證結果
   */
  async getDetailedImageValidation(): Promise<ImageValidationDetails[]> {
    const results: ImageValidationDetails[] = [];
    const referencedImages = new Set<string>();
    const imageReferences = new Map<string, string[]>();

    // 收集所有被引用的圖片
    for (const article of this.articles) {
      const references = this.getArticleImageReferences(article);
      for (const ref of references) {
        referencedImages.add(ref.imageName);

        if (!imageReferences.has(ref.imageName)) {
          imageReferences.set(ref.imageName, []);
        }
        imageReferences.get(ref.imageName)!.push(article.title);
      }
    }

    // 檢查所有被引用的圖片
    for (const imageName of referencedImages) {
      const exists = await this.checkImageExists(imageName);
      const referencedIn = imageReferences.get(imageName) || [];

      results.push({
        imageName,
        exists,
        isUsed: true,
        referencedIn,
        filePath: exists ? `${this.getImagesPath()}/${imageName}` : undefined,
        errorMessage: exists ? undefined : "圖片檔案不存在",
      });
    }

    // 檢查未被引用的圖片
    const allImages = await this.loadImages();
    for (const image of allImages) {
      if (!referencedImages.has(image.name)) {
        results.push({
          imageName: image.name,
          exists: image.exists,
          isUsed: false,
          referencedIn: [],
          filePath: image.path,
          errorMessage: undefined,
        });
      }
    }

    return results.sort((a, b) => a.imageName.localeCompare(b.imageName));
  }

  /**
   * 驗證特定文章中的圖片引用
   * @param {Article} article - 要驗證的文章
   * @returns {Promise<ImageValidationDetails[]>} 該文章的圖片驗證結果
   */
  async validateArticleImages(article: Article): Promise<ImageValidationDetails[]> {
    const references = this.getArticleImageReferences(article);
    const results: ImageValidationDetails[] = [];

    for (const ref of references) {
      const exists = await this.checkImageExists(ref.imageName);

      results.push({
        imageName: ref.imageName,
        exists,
        isUsed: true,
        referencedIn: [article.title],
        filePath: exists ? `${this.getImagesPath()}/${ref.imageName}` : undefined,
        errorMessage: exists ? undefined : "圖片檔案不存在",
      });
    }

    return results;
  }

  /**
   * 取得文章內容中的圖片驗證警告
   * @param {string} content - 文章內容
   * @param {string} articleFilePath - 文章檔案的絕對路徑（用於解析相對路徑圖片）
   * @returns {Promise<ImageValidationWarning[]>} 圖片驗證警告陣列
   */
  async getImageValidationWarnings(content: string, articleFilePath: string = ""): Promise<ImageValidationWarning[]> {
    const warnings: ImageValidationWarning[] = [];
    const lines = content.split("\n");

    // 第一遍：僅用 regex 掃描，收集所有圖片引用（不呼叫 IPC）(P6-05)
    type ImageRef = { imageName: string; lineIndex: number; colIndex: number; type: "obsidian" | "standard" };
    const refs: ImageRef[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Obsidian 格式: ![[image.png]] — imageName 為 vault 內名稱，查找 imagesPath 目錄
      const obsidianImageRegex = /!\[\[([^\]]+)\]\]/g;
      let match;
      while ((match = obsidianImageRegex.exec(line)) !== null) {
        refs.push({ imageName: match[1], lineIndex, colIndex: match.index, type: "obsidian" });
      }

      // 標準 Markdown 格式: ![alt](path) — path 為相對或絕對路徑
      const standardImageRegex = /!\[.*?\]\(([^)]+)\)/g;
      while ((match = standardImageRegex.exec(line)) !== null) {
        const imagePath = match[1];
        // 跳過外部 URL（http/https/data URI）
        if (/^https?:\/\/|^data:/i.test(imagePath)) {continue;}
        refs.push({ imageName: imagePath, lineIndex, colIndex: match.index, type: "standard" });
      }
    }

    if (refs.length === 0) {
      return warnings;
    }

    // 第二步：Obsidian wiki links — 去重後批量查詢 imagesPath 目錄（P6-05）
    const obsidianRefs = refs.filter((r) => r.type === "obsidian");
    const uniqueObsidianNames = [...new Set(obsidianRefs.map((r) => r.imageName))];
    const obsidianExistsMap =
      uniqueObsidianNames.length > 0
        ? await this.checkMultipleImagesExist(uniqueObsidianNames)
        : new Map<string, boolean>();

    // 第三步：標準 Markdown — 解析完整路徑後並行查詢
    const articleDir = articleFilePath
      ? articleFilePath.replace(/\\/g, "/").replace(/\/[^/]+$/, "")
      : "";
    const standardRefs = refs.filter((r) => r.type === "standard");
    const uniqueStandardPaths = [...new Set(standardRefs.map((r) => r.imageName))];
    const standardExistsMap = new Map<string, boolean>(
      await Promise.all(
        uniqueStandardPaths.map(async (imagePath) => {
          const resolved = this.resolveImagePath(imagePath, articleDir);
          // resolved 為空字串代表相對路徑但無文章路徑可解析，跳過不報假陽性
          const exists = resolved ? await this.checkImageExistsByPath(resolved) : true;
          return [imagePath, exists] as const;
        }),
      ),
    );

    // 第四遍：利用查詢結果建立警告
    for (const { imageName, lineIndex, colIndex, type } of refs) {
      if (type === "obsidian") {
        const exists = obsidianExistsMap.get(imageName) ?? false;
        if (!exists) {
          warnings.push({
            imageName,
            line: lineIndex + 1,
            column: colIndex + 1,
            type: "missing-file",
            message: `圖片檔案 "${imageName}" 不存在`,
            suggestion: "請檢查圖片檔案是否存在於 images 資料夾中",
            severity: "error",
          });
        } else if (!this.isImageFile(imageName)) {
          warnings.push({
            imageName,
            line: lineIndex + 1,
            column: colIndex + 1,
            type: "invalid-format",
            message: `"${imageName}" 不是有效的圖片格式`,
            suggestion: "支援的格式: .jpg, .jpeg, .png, .gif, .bmp, .svg, .webp",
            severity: "warning",
          });
        }
      } else {
        const exists = standardExistsMap.get(imageName) ?? false;
        if (!exists) {
          warnings.push({
            imageName,
            line: lineIndex + 1,
            column: colIndex + 1,
            type: "missing-file",
            message: `圖片檔案 "${imageName}" 不存在`,
            suggestion: "請確認圖片路徑正確",
            severity: "error",
          });
        }
      }
    }

    return warnings;
  }

  /**
   * 解析圖片路徑（相對或絕對）為絕對路徑
   * @param {string} imagePath - 圖片路徑（相對或絕對）
   * @param {string} articleDir - 文章所在目錄的絕對路徑
   * @returns {string} 解析後的絕對路徑
   */
  private resolveImagePath(imagePath: string, articleDir: string): string {
    const normalized = imagePath.replace(/\\/g, "/");
    // 絕對路徑：Unix（/...）或 Windows（C:/...）
    if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
      return normalized;
    }
    // 相對路徑：無文章目錄時無法解析，回傳空字串讓呼叫端跳過驗證
    if (!articleDir) {return "";}
    const parts = (articleDir + "/" + normalized).split("/");
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === "..") {resolved.pop();}
      else if (part !== ".") {resolved.push(part);}
    }
    return resolved.join("/");
  }

  /**
   * 依完整絕對路徑檢查圖片是否存在
   * @param {string} absolutePath - 圖片的絕對路徑
   * @returns {Promise<boolean>} 檔案是否存在
   */
  async checkImageExistsByPath(absolutePath: string): Promise<boolean> {
    if (!absolutePath || typeof window === "undefined" || !window.electronAPI) {
      return false;
    }
    try {
      const stats = await window.electronAPI.getFileStats(absolutePath);
      return stats !== null && !stats.isDirectory;
    } catch {
      return false;
    }
  }

  /**
   * 檢查檔案名稱是否為有效的圖片格式
   * @param {string} filename - 檔案名稱
   * @returns {boolean} 是否為有效的圖片格式
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".avif"];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
    return imageExtensions.includes(ext);
  }

  /**
   * 刪除未使用的圖片
   * @param {string} imageName - 圖片檔名
   * @returns {Promise<boolean>} 是否成功刪除
   */
  async deleteUnusedImage(imageName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return false;
    }

    // Double check that image is not used
    if (this.isImageUsed(imageName)) {
      throw new Error("無法刪除使用中的圖片");
    }

    try {
      const filePath = `${this.getImagesPath()}/${imageName}`;
      await window.electronAPI.deleteFile(filePath);
      return true;
    } catch (error) {
      logger.error("Failed to delete image:", error);
      return false;
    }
  }

  /**
   * 複製圖片到 images 目錄
   * @param {string} sourcePath - 來源檔案路徑
   * @param {string} fileName - 目標檔案名稱
   * @returns {Promise<boolean>} 是否成功複製
   */
  async copyImageToVault(sourcePath: string, fileName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return false;
    }

    try {
      const targetPath = `${this.getImagesPath()}/${fileName}`;

      // S6-07: 使用 importExternalFile 允許從白名單外部路徑（拖放/暫存目錄）複製
      // copyFile 會驗證兩端路徑，外部圖片 sourcePath 必然在白名單外
      await window.electronAPI.importExternalFile(sourcePath, targetPath);
      return true;
    } catch (error) {
      logger.error("Failed to copy image:", error);
      return false;
    }
  }

  /**
   * 上傳圖片檔案到 images 目錄
   * @param {File} file - 要上傳的檔案
   * @param {string} customName - 自訂檔案名稱（可選）
   * @returns {Promise<string>} 上傳後的檔案名稱
   */
  async uploadImageFile(file: File, customName?: string): Promise<string> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      throw new Error("Vault path not set or Electron API not available");
    }

    // Validate file type
    if (!this.isImageFile(file.name)) {
      throw new Error("Invalid image file format");
    }

    // Generate unique filename
    const fileName = customName || this.generateUniqueFileName(file.name);
    const targetPath = `${this.getImagesPath()}/${fileName}`;

    try {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Write file using Electron API
      await window.electronAPI.writeFileBuffer(targetPath, buffer);

      return fileName;
    } catch (error) {
      logger.error("圖片上傳失敗：", error);
      throw new Error(`圖片上傳失敗：${(error as Error).message}`);
    }
  }

  /**
   * 產生唯一的檔案名稱
   * @param {string} originalName - 原始檔案名稱
   * @returns {string} 唯一的檔案名稱
   */
  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalName.substring(originalName.lastIndexOf("."));
    const baseName = originalName.substring(0, originalName.lastIndexOf("."));

    return `${baseName}-${timestamp}-${randomSuffix}${extension}`;
  }

  /**
   * 清理未使用的圖片檔案
   * @returns {Promise<string[]>} 被清理的檔案名稱陣列
   */
  async cleanupUnusedImages(): Promise<string[]> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return [];
    }

    try {
      const allImages = await this.loadImages();
      const unusedImages = allImages.filter((image) => !image.isUsed);
      const cleanedFiles: string[] = [];

      for (const image of unusedImages) {
        try {
          await window.electronAPI.deleteFile(image.path);
          cleanedFiles.push(image.name);
        } catch (error) {
          logger.warn(`Failed to delete unused image ${image.name}:`, error);
        }
      }

      return cleanedFiles;
    } catch (error) {
      logger.error("Failed to cleanup unused images:", error);
      return [];
    }
  }

  /**
   * 取得未使用的圖片清單
   * @returns {Promise<ImageInfo[]>} 未使用的圖片陣列
   */
  async getUnusedImages(): Promise<ImageInfo[]> {
    const allImages = await this.loadImages();
    return allImages.filter((image) => !image.isUsed);
  }

  /**
   * 批量刪除圖片檔案
   * @param {string[]} imageNames - 要刪除的圖片檔案名稱陣列
   * @returns {Promise<{ success: string[], failed: string[] }>} 刪除結果
   */
  async batchDeleteImages(imageNames: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const imageName of imageNames) {
      try {
        const deleteSuccess = await this.deleteUnusedImage(imageName);
        if (deleteSuccess) {
          success.push(imageName);
        } else {
          failed.push(imageName);
        }
      } catch {
        failed.push(imageName);
      }
    }

    return { success, failed };
  }

  /**
   * 產生圖片的 Obsidian 引用語法
   * @param {string} imageName - 圖片檔名
   * @returns {string} Obsidian 引用語法
   */
  generateImageReference(imageName: string): string {
    return `![[${imageName}]]`;
  }

  /**
   * 從文章內容中移除圖片引用
   * @param {string} content - 文章內容
   * @param {string} imageName - 要移除的圖片檔名
   * @returns {string} 移除引用後的內容
   */
  removeImageReference(content: string, imageName: string): string {
    const regex = new RegExp(`!\\[\\[${imageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]`, "g");
    return content.replace(regex, "");
  }
}
