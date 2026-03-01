import { describe, it, expect, vi } from "vitest";
import { ConversionValidator } from "@/services/ConversionValidator";
import type { Article, ConversionConfig } from "@/types";
import { ArticleStatus } from "@/types";

describe("ConversionValidator", () => {
  const validator = new ConversionValidator();

  function makeArticle(overrides: Partial<Article> = {}): Article {
    return {
      id: "test-id",
      title: "測試文章",
      slug: "test-article",
      filePath: "/vault/tech/test.md",
      status: ArticleStatus.Draft,
      frontmatter: { title: "測試文章" },
      content: "文章內容",
      lastModified: new Date(),
      category: "tech",
      ...overrides,
    };
  }

  // ── validateSlug（S5-02）─────────────────────────────────────────────────

  describe("validateSlug()（S5-02 路徑安全）", () => {
    it("一般合法 slug 應通過", () => {
      expect(validator.validateSlug("my-article-2024")).toBe(true);
      expect(validator.validateSlug("chinese-article")).toBe(true);
      expect(validator.validateSlug("article123")).toBe(true);
    });

    it("空字串應失敗", () => {
      expect(validator.validateSlug("")).toBe(false);
    });

    it("undefined 應失敗", () => {
      expect(validator.validateSlug(undefined)).toBe(false);
    });

    it("含 ../ 路徑穿越字元應失敗（S5-02）", () => {
      expect(validator.validateSlug("../etc/passwd")).toBe(false);
      expect(validator.validateSlug("../../secret")).toBe(false);
    });

    it("含 .. 雙點應失敗（S5-02）", () => {
      expect(validator.validateSlug("article..evil")).toBe(false);
    });

    it("含 / 斜線應失敗（S5-02）", () => {
      expect(validator.validateSlug("path/to/article")).toBe(false);
    });

    it("含 \\ 反斜線應失敗（S5-02）", () => {
      expect(validator.validateSlug("windows\\path")).toBe(false);
    });

    it("null byte 應失敗（S5-02）", () => {
      expect(validator.validateSlug("article\x00evil")).toBe(false);
    });

    it("含 Windows 磁碟路徑應失敗（S5-02）", () => {
      expect(validator.validateSlug("C:path")).toBe(false);
    });
  });

  // ── validateCategory（S5-02）─────────────────────────────────────────────

  describe("validateCategory()（S5-02 路徑安全）", () => {
    it("一般合法分類名稱應通過", () => {
      expect(validator.validateCategory("tech")).toBe(true);
      expect(validator.validateCategory("software")).toBe(true);
      expect(validator.validateCategory("life-style")).toBe(true);
    });

    it("空字串或 undefined 應失敗", () => {
      expect(validator.validateCategory("")).toBe(false);
      expect(validator.validateCategory(undefined)).toBe(false);
    });

    it("含路徑穿越字元應失敗（S5-02）", () => {
      expect(validator.validateCategory("../secret")).toBe(false);
      expect(validator.validateCategory("tech/sub")).toBe(false);
    });
  });

  // ── validateArticlePathSafety（S5-02）────────────────────────────────────

  describe("validateArticlePathSafety()（S5-02）", () => {
    it("合法 slug 和 category 應通過", () => {
      const article = makeArticle({ slug: "safe-slug", category: "tech" });
      const result = validator.validateArticlePathSafety(article);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("不安全的 slug 應收集問題描述", () => {
      const article = makeArticle({ slug: "../evil", category: "tech" });
      const result = validator.validateArticlePathSafety(article);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("slug"))).toBe(true);
    });

    it("不安全的 category 應收集問題描述", () => {
      const article = makeArticle({ slug: "safe-slug", category: "../etc" });
      const result = validator.validateArticlePathSafety(article);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("category"))).toBe(true);
    });

    it("slug 和 category 都不安全時收集兩個問題", () => {
      const article = makeArticle({ slug: "../../evil", category: "../secret" });
      const result = validator.validateArticlePathSafety(article);

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(2);
    });
  });

  // ── validateConfig ────────────────────────────────────────────────────────

  describe("validateConfig()", () => {
    const validConfig: ConversionConfig = {
      sourceDir: "/vault",
      targetDir: "/blog/src/content",
      imageSourceDir: "/vault/images",
      preserveStructure: true,
    };

    it("完整設定應通過", () => {
      expect(validator.validateConfig(validConfig)).toBe(true);
    });

    it("缺少 sourceDir 應失敗", () => {
      expect(validator.validateConfig({ ...validConfig, sourceDir: "" })).toBe(false);
    });

    it("缺少 targetDir 應失敗", () => {
      expect(validator.validateConfig({ ...validConfig, targetDir: "" })).toBe(false);
    });

    it("缺少 imageSourceDir 應失敗", () => {
      expect(validator.validateConfig({ ...validConfig, imageSourceDir: "" })).toBe(false);
    });
  });

  // ── validateBatchPrerequisites ────────────────────────────────────────────

  describe("validateBatchPrerequisites()", () => {
    const validConfig: ConversionConfig = {
      sourceDir: "/vault",
      targetDir: "/blog",
      imageSourceDir: "/images",
      preserveStructure: true,
    };

    it("所有目錄存在時應通過", async () => {
      const fileExistsFn = vi.fn().mockResolvedValue(true);
      const result = await validator.validateBatchPrerequisites(validConfig, fileExistsFn);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(fileExistsFn).toHaveBeenCalledTimes(3);
    });

    it("sourceDir 不存在時應收集問題", async () => {
      const fileExistsFn = vi.fn()
        .mockResolvedValueOnce(false)  // sourceDir
        .mockResolvedValue(true);
      const result = await validator.validateBatchPrerequisites(validConfig, fileExistsFn);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("來源目錄"))).toBe(true);
    });

    it("targetDir 不存在時應收集問題", async () => {
      const fileExistsFn = vi.fn()
        .mockResolvedValueOnce(true)   // sourceDir
        .mockResolvedValueOnce(false)  // targetDir
        .mockResolvedValue(true);
      const result = await validator.validateBatchPrerequisites(validConfig, fileExistsFn);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("目標目錄"))).toBe(true);
    });

    it("imageSourceDir 不存在時應收集問題", async () => {
      const fileExistsFn = vi.fn()
        .mockResolvedValueOnce(true)   // sourceDir
        .mockResolvedValueOnce(true)   // targetDir
        .mockResolvedValueOnce(false); // imageSourceDir
      const result = await validator.validateBatchPrerequisites(validConfig, fileExistsFn);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("圖片"))).toBe(true);
    });

    it("sourceDir 為空字串時直接標記問題（不呼叫 fileExistsFn）", async () => {
      const fileExistsFn = vi.fn().mockResolvedValue(true);
      const config = { ...validConfig, sourceDir: "" };
      const result = await validator.validateBatchPrerequisites(config, fileExistsFn);

      expect(result.valid).toBe(false);
      expect(fileExistsFn).not.toHaveBeenCalledWith("");
    });
  });

  // ── isValidImageFile ──────────────────────────────────────────────────────

  describe("isValidImageFile()", () => {
    it("支援的圖片副檔名應通過", () => {
      expect(validator.isValidImageFile("photo.jpg")).toBe(true);
      expect(validator.isValidImageFile("image.jpeg")).toBe(true);
      expect(validator.isValidImageFile("logo.png")).toBe(true);
      expect(validator.isValidImageFile("animation.gif")).toBe(true);
      expect(validator.isValidImageFile("icon.svg")).toBe(true);
      expect(validator.isValidImageFile("photo.webp")).toBe(true);
      expect(validator.isValidImageFile("photo.avif")).toBe(true);
    });

    it("大寫副檔名也應通過（不區分大小寫）", () => {
      expect(validator.isValidImageFile("photo.JPG")).toBe(true);
      expect(validator.isValidImageFile("logo.PNG")).toBe(true);
    });

    it("非圖片副檔名應失敗", () => {
      expect(validator.isValidImageFile("document.pdf")).toBe(false);
      expect(validator.isValidImageFile("script.js")).toBe(false);
      expect(validator.isValidImageFile("data.json")).toBe(false);
      expect(validator.isValidImageFile("style.css")).toBe(false);
    });
  });
});
