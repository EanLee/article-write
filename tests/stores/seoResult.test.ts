import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSeoResultStore } from "@/stores/seoResult";
import { useSeoStore } from "@/stores/seo";
import type { Article } from "@/types";
import { ArticleStatus } from "@/types";
import type { SEOGenerationResult } from "@/main/services/AIProvider/types";

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
    title: "AI Panel 測試文章",
    slug: "ai-panel-test",
    filePath: "/vault/tech/ai-panel-test.md",
    status: ArticleStatus.Draft,
    frontmatter: {
      title: "AI Panel 測試文章",
      slug: "old-slug",
      description: "舊版描述",
      keywords: ["舊", "關鍵字"],
    },
    content: "這是 AI Panel 測試用的文章內容。".repeat(20),
    lastModified: new Date("2024-01-01"),
    category: "tech",
    ...overrides,
  };
}

const mockSEOResult: SEOGenerationResult = {
  slug: "ai-panel-best-guide-2024",
  metaDescription: "完整的 AI Panel 使用指南，幫助你快速上手。",
  keywords: ["AI", "Panel", "指南", "2024"],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SeoResult Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ── 初始狀態 ──────────────────────────────────────────────────────────────

  describe("初始狀態", () => {
    it("seoResult 應為 null", () => {
      const seoResultStore = useSeoResultStore();
      expect(seoResultStore.seoResult).toBeNull();
    });

    it("seoError 應為 null", () => {
      const seoResultStore = useSeoResultStore();
      expect(seoResultStore.seoError).toBeNull();
    });
  });

  // ── generateSEO ───────────────────────────────────────────────────────────

  describe("generateSEO(article)", () => {
    it("成功時：seoResult 應被設定", async () => {
      const seoResultStore = useSeoResultStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({
        success: true,
        data: mockSEOResult,
      });

      await seoResultStore.generateSEO(makeMockArticle());

      expect(seoResultStore.seoResult).toEqual(mockSEOResult);
      expect(seoResultStore.seoError).toBeNull();
    });

    it("成功時：呼叫前先重置 seoResult 和 seoError", async () => {
      const seoResultStore = useSeoResultStore();
      // 預置舊資料
      seoResultStore.seoResult = mockSEOResult;
      seoResultStore.seoError = "舊錯誤";

      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({
        success: true,
        data: mockSEOResult,
      });

      await seoResultStore.generateSEO(makeMockArticle());

      expect(seoResultStore.seoResult).toEqual(mockSEOResult);
      expect(seoResultStore.seoError).toBeNull();
    });

    it("seoStore 回傳 null 時：設定 seoError，seoResult 仍為 null", async () => {
      const seoResultStore = useSeoResultStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({
        success: false,
        message: "Token 超出限制",
      });

      await seoResultStore.generateSEO(makeMockArticle());

      expect(seoResultStore.seoResult).toBeNull();
      expect(seoResultStore.seoError).toBe("Token 超出限制");
    });

    it("seoStore 回傳 null 且無 message 時：使用預設錯誤訊息", async () => {
      const seoResultStore = useSeoResultStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({ success: false });

      await seoResultStore.generateSEO(makeMockArticle());

      expect(seoResultStore.seoError).toBe("生成失敗");
    });

    it("透過 seoStore 協調：seoStore.isGenerating 在成功後應恢復 false", async () => {
      const seoResultStore = useSeoResultStore();
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({
        success: true,
        data: mockSEOResult,
      });

      await seoResultStore.generateSEO(makeMockArticle());

      // seoStore 的 isGenerating 應在操作完成後回到 false
      const seoStore = useSeoStore();
      expect(seoStore.isGenerating).toBe(false);
    });

    it("不直接依賴 articleStore（解耦驗證）：由外部傳入 article", async () => {
      // 這個測試驗證 M-07 解耦成果：不需要 articleStore 即可呼叫 generateSEO
      const seoResultStore = useSeoResultStore();
      const customArticle = makeMockArticle({ title: "自訂文章標題", id: "custom-id" });
      mockElectronAPI.aiGetActiveProvider.mockResolvedValue("openai");
      mockElectronAPI.aiGenerateSEO.mockResolvedValue({
        success: true,
        data: mockSEOResult,
      });

      // 不需要任何 articleStore 初始化，直接傳入 article 物件即可
      await seoResultStore.generateSEO(customArticle);

      expect(mockElectronAPI.aiGenerateSEO).toHaveBeenCalledWith(expect.objectContaining({ title: "自訂文章標題" }), "openai");
      expect(seoResultStore.seoResult).toEqual(mockSEOResult);
    });
  });

  // ── applySEOResult ────────────────────────────────────────────────────────

  describe("applySEOResult(article)", () => {
    it("有 seoResult 時：回傳更新後的文章物件", () => {
      const seoResultStore = useSeoResultStore();
      seoResultStore.seoResult = mockSEOResult;

      const article = makeMockArticle();
      const updatedArticle = seoResultStore.applySEOResult(article);

      expect(updatedArticle).not.toBeNull();
      expect(updatedArticle?.frontmatter.slug).toBe(mockSEOResult.slug);
      expect(updatedArticle?.frontmatter.description).toBe(mockSEOResult.metaDescription);
      expect(updatedArticle?.frontmatter.keywords).toEqual(mockSEOResult.keywords);
    });

    it("有 seoResult 時：不修改其他 frontmatter 欄位", () => {
      const seoResultStore = useSeoResultStore();
      seoResultStore.seoResult = mockSEOResult;

      const article = makeMockArticle();
      const updatedArticle = seoResultStore.applySEOResult(article);

      expect(updatedArticle?.frontmatter.title).toBe(article.frontmatter.title);
      expect(updatedArticle?.frontmatter.draft).toBe(article.frontmatter.draft);
    });

    it("有 seoResult 時：不修改原始文章物件（immutable）", () => {
      const seoResultStore = useSeoResultStore();
      seoResultStore.seoResult = mockSEOResult;

      const article = makeMockArticle();
      const originalSlug = article.frontmatter.slug;
      seoResultStore.applySEOResult(article);

      // 原始物件不應被修改
      expect(article.frontmatter.slug).toBe(originalSlug);
    });

    it("seoResult 為 null 時：回傳 null", () => {
      const seoResultStore = useSeoResultStore();
      expect(seoResultStore.seoResult).toBeNull();

      const result = seoResultStore.applySEOResult(makeMockArticle());

      expect(result).toBeNull();
    });

    it("applySEOResult 保留文章其他頂層欄位不變", () => {
      const seoResultStore = useSeoResultStore();
      seoResultStore.seoResult = mockSEOResult;

      const article = makeMockArticle();
      const updatedArticle = seoResultStore.applySEOResult(article);

      expect(updatedArticle?.id).toBe(article.id);
      expect(updatedArticle?.title).toBe(article.title);
      expect(updatedArticle?.filePath).toBe(article.filePath);
      expect(updatedArticle?.status).toBe(article.status);
      expect(updatedArticle?.content).toBe(article.content);
    });
  });

  // ── clearSEO ──────────────────────────────────────────────────────────────

  describe("clearSEO()", () => {
    it("清除 seoResult 和 seoError", () => {
      const seoResultStore = useSeoResultStore();
      seoResultStore.seoResult = mockSEOResult;
      seoResultStore.seoError = "某錯誤";

      seoResultStore.clearSEO();

      expect(seoResultStore.seoResult).toBeNull();
      expect(seoResultStore.seoError).toBeNull();
    });

    it("在已清除狀態再次呼叫：應保持 null", () => {
      const seoResultStore = useSeoResultStore();
      seoResultStore.clearSEO();
      seoResultStore.clearSEO();

      expect(seoResultStore.seoResult).toBeNull();
      expect(seoResultStore.seoError).toBeNull();
    });
  });
});
