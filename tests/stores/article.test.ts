import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useArticleStore } from "@/stores/article";
import { useConfigStore } from "@/stores/config";
import { ArticleCategory } from "@/types";

// Mock the window.electronAPI
global.window = {
  electronAPI: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    getFileStats: vi.fn(),
    getConfig: vi.fn(),
    setConfig: vi.fn(),
  },
} as unknown as Window & typeof globalThis;
(global as unknown as Record<string, unknown>).electronAPI = window.electronAPI;
// Typed mock accessor: env.d.ts types window.electronAPI as the real API; at test time these are vi.fn() mocks
const api = window.electronAPI as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe("Article Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    // Setup config store with mock vault path
    const configStore = useConfigStore();
    configStore.config.paths.articlesDir = "/mock/vault/path";

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    api.writeFile.mockResolvedValue(undefined);
    api.createDirectory.mockResolvedValue(undefined);
    api.getFileStats.mockResolvedValue(null);
  });

  it("should initialize with empty articles array", () => {
    const store = useArticleStore();
    expect(store.articles).toEqual([]);
    expect(store.currentArticle).toBeNull();
  });

  it("should create a new article", async () => {
    const store = useArticleStore();
    const article = await store.createArticle("Test Article", ArticleCategory.Software);

    expect(article.title).toBe("Test Article");
    expect(article.category).toBe("Software");
    expect(article.status).toBe("draft");
    expect(store.articles).toHaveLength(1);
  });

  it("should generate slug from title", async () => {
    const store = useArticleStore();
    const article = await store.createArticle("Hello World Test", ArticleCategory.Software);

    expect(article.slug).toBe("hello-world-test");
  });

  it("should filter articles by status", async () => {
    const store = useArticleStore();
    await store.createArticle("Draft Article", ArticleCategory.Software);
    const publishedArticle = await store.createArticle("Published Article", ArticleCategory.Growth);

    // Move one to published
    await store.toggleStatus(publishedArticle.id);

    expect(store.draftArticles).toHaveLength(1);
    expect(store.publishedArticles).toHaveLength(1);
  });

  describe("updateCurrentArticleContent（topic-020 儲存來源單一化）", () => {
    it("即時同步編輯器內容到 currentArticle，不更新 lastModified", async () => {
      const store = useArticleStore();
      const article = await store.createArticle("Live Sync", ArticleCategory.Software);
      store.setCurrentArticle(article);
      const lastModifiedBefore = store.currentArticle!.lastModified;

      store.updateCurrentArticleContent("使用者剛打的新內容");

      expect(store.currentArticle!.content).toBe("使用者剛打的新內容");
      expect(store.currentArticle!.lastModified).toBe(lastModifiedBefore);
    });

    it("無當前文章時靜默忽略", () => {
      const store = useArticleStore();
      expect(() => store.updateCurrentArticleContent("any")).not.toThrow();
      expect(store.currentArticle).toBeNull();
    });

    it("內容相同時不重複賦值（避免不必要的響應式觸發）", async () => {
      const store = useArticleStore();
      const article = await store.createArticle("No-op", ArticleCategory.Software);
      store.setCurrentArticle(article);
      const ref = store.currentArticle;

      store.updateCurrentArticleContent(store.currentArticle!.content);

      expect(store.currentArticle).toBe(ref);
    });
  });
});
