import type { IFileSystem } from "@/types/IFileSystem";
import { logger } from "@/utils/logger";

/**
 * ImageCopyService
 *
 * 單一職責：負責圖片的複製、路徑解析與清理邏輯。
 * 從 ConverterService 提取，解決 SRP 違反問題（SOLID5-01）。
 *
 * 效能強化（P5-02）：
 * - batchCopyImages 改用並發控制替代串列執行
 * - 預設最大並發數為 5（避免系統負載過高）
 */
export class ImageCopyService {
  private fileSystem: IFileSystem;

  /** 預設最大並發複製數量（P5-02） */
  private readonly defaultConcurrencyLimit = 5;

  /** 支援的圖片副檔名 */
  private static readonly IMAGE_EXTENSIONS = [
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".avif",
  ];

  constructor(fileSystem: IFileSystem) {
    this.fileSystem = fileSystem;
  }

  // ── 路徑解析 ──────────────────────────────────────────────────────────────

  /**
   * 從圖片引用字串中提取檔案名稱
   * @param imageRef - 圖片引用字串（如 `../../images/photo.png` 或 `photo.png`）
   * @returns 檔案名稱，若無效則回傳 null
   */
  extractImageName(imageRef: string): string | null {
    let imageName: string | null = null;

    if (imageRef.includes("/")) {
      imageName = imageRef.split("/").pop() || null;
    } else {
      imageName = imageRef;
    }

    if (imageName && this.isValidImageFile(imageName)) {
      return imageName;
    }

    return null;
  }

  /**
   * 檢查是否為有效的圖片檔案名稱
   * @param fileName - 檔案名稱
   * @returns true 表示有效的圖片副檔名
   */
  isValidImageFile(fileName: string): boolean {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
    return ImageCopyService.IMAGE_EXTENSIONS.includes(ext);
  }

  /**
   * 更新 Markdown 內容中的圖片路徑
   * @param content - 原始 Markdown 內容
   * @param oldPath - 舊路徑字串（如 `../../images/photo.png`）
   * @param imageName - 新圖片檔案名稱（如 `photo.png`）
   * @returns 更新後的 Markdown 內容
   */
  updateImagePath(content: string, oldPath: string, imageName: string): string {
    const newPath = `./images/${imageName}`;
    return content.replace(new RegExp(this.escapeRegExp(oldPath), "g"), newPath);
  }

  // ── 單一圖片複製 ──────────────────────────────────────────────────────────

  /**
   * 複製單一圖片檔案
   * @param sourcePath - 來源圖片完整路徑
   * @param targetPath - 目標圖片完整路徑
   */
  async copyImageFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      // 確保目標目錄存在
      const targetDir = this.getDirname(targetPath);
      await this.fileSystem.createDirectory(targetDir);

      // 複製檔案
      await (window.electronAPI as unknown as { copyFile: (s: string, t: string) => Promise<void> }).copyFile(sourcePath, targetPath);

      logger.debug(`Copied image: ${sourcePath} → ${targetPath}`);
    } catch (error) {
      logger.error(`Failed to copy image ${sourcePath} → ${targetPath}:`, error);
      throw error;
    }
  }

  // ── 批次圖片複製（P5-02）─────────────────────────────────────────────────

  /**
   * 批次複製圖片，以並發控制取代串列執行（P5-02）
   * 使用 semaphore 模式限制最大同時執行的複製操作數量。
   *
   * @param imageNames - 要複製的圖片檔案名稱陣列
   * @param sourceImagesDir - 來源圖片目錄路徑
   * @param targetImagesDir - 目標圖片目錄路徑
   * @param concurrencyLimit - 最大並發數（預設 5）
   * @returns 成功與失敗的結果摘要
   */
  async batchCopyImages(
    imageNames: string[],
    sourceImagesDir: string,
    targetImagesDir: string,
    concurrencyLimit: number = this.defaultConcurrencyLimit,
  ): Promise<{
    successful: string[];
    failed: Array<{ name: string; error: string }>;
  }> {
    const result = {
      successful: [] as string[],
      failed: [] as Array<{ name: string; error: string }>,
    };

    // 確保目標目錄存在
    await this.fileSystem.createDirectory(targetImagesDir);

    // Worker queue 並發控制（P5-02）：
    // 建立 N 個 worker，各自從共享佇列持續取任務，直到佇列為空。
    // 比原本 chunkArray 串列執行更有效率（不需等待最慢的 chunk）。
    const queue = [...imageNames];

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const imageName = queue.shift()!;
        try {
          const sourcePath = this.joinPath(sourceImagesDir, imageName);
          const targetPath = this.joinPath(targetImagesDir, imageName);
          await this.copyImageFile(sourcePath, targetPath);
          result.successful.push(imageName);
        } catch (error) {
          result.failed.push({
            name: imageName,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    };

    // 啟動 min(concurrencyLimit, 圖片數量) 個 worker 並等待全部完成
    const workerCount = Math.min(concurrencyLimit, imageNames.length);
    if (workerCount > 0) {
      await Promise.all(Array.from({ length: workerCount }, worker));
    }

    return result;
  }

  // ── 清理 ────────────────────────────────────────────────────────────────

  /**
   * 清理目標目錄中未使用的圖片檔案
   * @param targetImagesDir - 目標圖片目錄
   * @param usedImages - 目前使用中的圖片檔案名稱陣列
   * @returns 已刪除的檔案名稱陣列
   */
  async cleanupUnusedImages(targetImagesDir: string, usedImages: string[]): Promise<string[]> {
    const cleanedFiles: string[] = [];

    try {
      const existingFiles = await this.fileSystem.readDirectory(targetImagesDir);

      for (const file of existingFiles) {
        if (this.isValidImageFile(file) && !usedImages.includes(file)) {
          const filePath = this.joinPath(targetImagesDir, file);
          await this.fileSystem.deleteFile(filePath);
          cleanedFiles.push(file);
          logger.debug(`Cleaned up unused image: ${file}`);
        }
      }
    } catch (error) {
      logger.warn("Failed to cleanup unused images:", error);
    }

    return cleanedFiles;
  }

  // ── 私有工具方法 ──────────────────────────────────────────────────────────

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private joinPath(...paths: string[]): string {
    return paths.join("/").replace(/\/+/g, "/").replace(/\\/g, "/");
  }

  private getDirname(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    parts.pop();
    return parts.join("/");
  }
}
