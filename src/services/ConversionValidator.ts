import type { Article, ConversionConfig } from "@/types";
import { logger } from "@/utils/logger";

/**
 * ConversionValidator
 *
 * 單一職責：負責所有轉換相關的驗證邏輯。
 * 從 ConverterService 提取，解決 SRP 違反問題（SOLID5-01）。
 *
 * 安全強化（S5-02）：
 * - 驗證 slug 和 category 不含路徑穿越字元（防止 path traversal 攻擊）
 * - 驗證不含 null byte（防止 null byte injection）
 * - 驗證不為絕對路徑
 */
export class ConversionValidator {
  /**
   * 危險路徑字元黑名單正規式
   * 涵蓋：路徑穿越 (../), null bytes (\0), 絕對 UNIX 路徑 (/), 絕對 Windows 路徑 (C:\)
   */
  private static readonly DANGEROUS_PATH_PATTERN =
    /(\.\.|[\x00/\\]|^[a-zA-Z]:)/; // eslint-disable-line no-control-regex

  // ── 安全驗證（S5-02）────────────────────────────────────────────────────

  /**
   * 驗證 slug 不含路徑穿越或危險字元（S5-02）
   * @param slug - 要驗證的 slug 字串
   * @returns true 表示安全，false 表示包含危險字元
   */
  validateSlug(slug: string | undefined): boolean {
    if (!slug || slug.trim() === "") {
      return false;
    }
    return !ConversionValidator.DANGEROUS_PATH_PATTERN.test(slug);
  }

  /**
   * 驗證 category 不含路徑穿越或危險字元（S5-02）
   * @param category - 要驗證的分類字串
   * @returns true 表示安全，false 表示包含危險字元
   */
  validateCategory(category: string | undefined): boolean {
    if (!category || category.trim() === "") {
      return false;
    }
    return !ConversionValidator.DANGEROUS_PATH_PATTERN.test(category);
  }

  /**
   * 驗證文章路徑安全性（S5-02）
   * 同時驗證 slug 和 category
   * @param article - 要驗證的文章物件
   * @returns 驗證結果與問題描述
   */
  validateArticlePathSafety(article: Article): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!this.validateSlug(article.slug)) {
      issues.push(`不安全的 slug 值: "${article.slug}"（含路徑穿越字元或為空）`);
      logger.warn(`[Security] Unsafe slug detected in article: "${article.title}" → slug="${article.slug}"`);
    }

    if (!this.validateCategory(article.category)) {
      issues.push(`不安全的 category 值: "${article.category}"（含路徑穿越字元或為空）`);
      logger.warn(`[Security] Unsafe category detected in article: "${article.title}" → category="${article.category}"`);
    }

    return { valid: issues.length === 0, issues };
  }

  // ── 設定驗證 ─────────────────────────────────────────────────────────────

  /**
   * 驗證轉換設定
   * @param config - 轉換設定
   * @returns 設定是否有效
   */
  validateConfig(config: ConversionConfig): boolean {
    return !!(config.sourceDir && config.targetDir && config.imageSourceDir);
  }

  /**
   * 驗證批次轉換的前置條件（目錄存在性）
   * @param config - 轉換設定
   * @param fileExistsFn - 檢查檔案/目錄是否存在的非同步函式（由 ConverterService 注入）
   * @returns 驗證結果
   */
  async validateBatchPrerequisites(
    config: ConversionConfig,
    fileExistsFn: (path: string) => Promise<boolean>,
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // 檢查來源目錄
      if (!config.sourceDir) {
        issues.push("來源目錄未設定");
      } else if (!(await fileExistsFn(config.sourceDir))) {
        issues.push("來源目錄不存在");
      }

      // 檢查目標目錄
      if (!config.targetDir) {
        issues.push("目標目錄未設定");
      } else if (!(await fileExistsFn(config.targetDir))) {
        issues.push("目標目錄不存在");
      }

      // 檢查圖片目錄
      if (!config.imageSourceDir) {
        issues.push("圖片來源目錄未設定");
      } else if (!(await fileExistsFn(config.imageSourceDir))) {
        issues.push("圖片來源目錄不存在");
      }
    } catch (error) {
      issues.push(`驗證過程發生錯誤: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return { valid: issues.length === 0, issues };
  }

  // ── 轉換結果驗證 ──────────────────────────────────────────────────────────

  /**
   * 驗證轉換結果的完整性
   * @param targetDir - 目標目錄
   * @param article - 原始文章
   * @param imageReferences - 文章內的圖片引用清單
   * @param extractImageNameFn - 從圖片引用取得名稱的函式（由 ConverterService 注入）
   * @param fileExistsFn - 檢查路徑是否存在的函式（由 ConverterService 注入）
   * @param readFileFn - 讀取檔案的函式（由 ConverterService 注入）
   * @param joinPathFn - 路徑組合函式（由 ConverterService 注入）
   * @returns 驗證結果
   */
  async validateConversionResult(
    targetDir: string,
    _article: Article,
    imageReferences: string[],
    extractImageNameFn: (ref: string) => string | null,
    fileExistsFn: (path: string) => Promise<boolean>,
    readFileFn: (path: string) => Promise<string>,
    joinPathFn: (...parts: string[]) => string,
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // 檢查 index.md 檔案是否存在
      const indexPath = joinPathFn(targetDir, "index.md");
      const indexExists = await fileExistsFn(indexPath);
      if (!indexExists) {
        issues.push("找不到 index.md 檔案");
      }

      // 檢查圖片目錄和檔案
      if (imageReferences.length > 0) {
        const imagesDir = joinPathFn(targetDir, "images");
        const imagesDirExists = await fileExistsFn(imagesDir);

        if (!imagesDirExists) {
          issues.push("找不到 images 目錄");
        } else {
          // 檢查每個引用的圖片是否存在
          for (const imageRef of imageReferences) {
            const imageName = extractImageNameFn(imageRef);
            if (imageName) {
              const imagePath = joinPathFn(imagesDir, imageName);
              const imageExists = await fileExistsFn(imagePath);
              if (!imageExists) {
                issues.push(`找不到圖片檔案：${imageName}`);
              }
            }
          }
        }
      }

      // 檢查轉換後的內容是否包含未轉換的 Obsidian 語法
      if (indexExists) {
        const convertedContent = await readFileFn(indexPath);

        if (convertedContent.includes("[[") && convertedContent.includes("]]")) {
          issues.push("Unconverted wiki links found");
        }

        if (convertedContent.includes("![[") && convertedContent.includes("]]")) {
          issues.push("Unconverted Obsidian image syntax found");
        }

        if (convertedContent.includes("==") && convertedContent.match(/==.*?==/)) {
          issues.push("Unconverted highlight syntax found");
        }
      }
    } catch (error) {
      issues.push(
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return { valid: issues.length === 0, issues };
  }

  /** 驗證是否為有效的圖片副檔名 */
  isValidImageFile(fileName: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".avif"];
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
    return imageExtensions.includes(ext);
  }
}

/** 預設單例實例 */
export const conversionValidator = new ConversionValidator();
