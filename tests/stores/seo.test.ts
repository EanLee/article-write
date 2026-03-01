import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSeoStore } from "@/stores/seo";
import type { Article } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockElectronAPI = {
  aiGetActiveProvider: vi.fn(),
  aiGenerateSEO: vi.fn(),
};

Object.defineProperty(window, "electronAPI", {
  value: mockElectronAPI,
  writable: true,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "article-001",
    title: "SEO 測試文章標題",
    slug: "seo-test-article",
    filePath: "/vault/tech/seo-test.md",
    status: "draft",
    frontmatter: {
      title: "SEO 測試文章標題",
      slug: "old-slug",
      description: "舊版描述",
      keywords: ["舊關鍵字"],
    },
    content: "這是一篇關於 SEO 最佳化的測試文章。".repeat(20), // 超過 300 字元
    lastModified: new Date("2024-01-01"),
    category: "tech",
    ...overrides,
  };
}

const successSEOResponse = {
  success: true,
  data: {
    slug: "seo-best-practices-2024",
    metaDescription: "學習 SEO 最佳化技巧，提升搜尋引擎排名。",
    keywords: ["SEO", "搜尋引擎最佳化", "網站排名"],
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Seo Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ── 初始狀態 ──────────────────────────────────────────────────────────────

  describe("初始狀態", () => {
    it("isGenerating 應為 false", () => {
      const seoStore = useSeoStore();
      expect(seoStore.isGenerating).toBe(false);
    });

    it("error 應為 null", () => {
      const seoStore = useSeoStore();
      expect(seoStore.error).toBeNull();
    });
  });

  // ── generateSEO ───────────────────────────────────────────────────────────

  describe("generateSEO()", () => {
    it("成功時：回傳 SEO 資料物件", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue(successSEOResponse);

      const result = await seoStore.generateSEO(makeMockArticle());

      expect(result).toEqual(successSEOResponse.data);
      expect(seoStore.error).toBeNull();
    });

    it("成功時：isGenerating 最終應回到 false", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue(successSEOResponse);

      await seoStore.generateSEO(makeMockArticle());

      expect(seoStore.isGenerating).toBe(false);
    });

    it("成功時：以文章前 300 字元傳送給 API", async () => {
      const seoStore = useSeoStore();
      const article = makeMockArticle();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue(successSEOResponse);

      await seoStore.generateSEO(article);

      expect(mockElectronAPI.aiGenerateSEO).toHaveBeenCalledWith(
        expect.objectContaining({
          title: article.title,
          contentPreview: article.content.slice(0, 300),
          existingSlug: article.frontmatter.slug,
        }),
        "openai"
      );
    });

    it("provider 為 null 時：以 undefined 傳入", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue(null);
      mockElectronAPI.aiGenerateSEO.mockResolvedValue(successSEOResponse);

      await seoStore.generateSEO(makeMockArticle());

      expect(mockElectronAPI.aiGenerateSEO).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });

    it("API 回傳 success: false 時：設定 error 並回傳 null", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({
        success: false,
        message: "API 金鑰無效",
      });

      const result = await seoStore.generateSEO(makeMockArticle());

      expect(result).toBeNull();
      expect(seoStore.error).toBe("API 金鑰無效");
    });

    it("API 回傳 success: false 且無 message 時：使用預設訊息", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({ success: false });

      await seoStore.generateSEO(makeMockArticle());

      expect(seoStore.error).toBe("生成失敗");
    });

    it("API 拋出例外時：isGenerating 仍應回到 false (finally)", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockRejectedValue(new Error("網路錯誤"));

      await expect(seoStore.generateSEO(makeMockArticle())).rejects.toThrow("網路錯誤");

      expect(seoStore.isGenerating).toBe(false);
    });

    it("生成前先清除上次的 error", async () => {
      const seoStore = useSeoStore();
      // 模擬已有 error 狀態
      mockElectronAPI.aiGetActiveProvider.mockResolvedValueOnce("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValueOnce({ success: false, message: "舊錯誤" });
      await seoStore.generateSEO(makeMockArticle());
      expect(seoStore.error).toBe("舊錯誤");

      // 第二次呼叫成功
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue(successSEOResponse);
      await seoStore.generateSEO(makeMockArticle());

      expect(seoStore.error).toBeNull();
    });
  });

  // ── hasApiKey ─────────────────────────────────────────────────────────────

  describe("hasApiKey()", () => {
    it("有 provider 時回傳 true", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");

      const result = await seoStore.hasApiKey();

      expect(result).toBe(true);
    });

    it("provider 為 null 時回傳 false", async () => {
      const seoStore = useSeoStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue(null);

      const result = await seoStore.hasApiKey();

      expect(result).toBe(false);
    });
  });
});
