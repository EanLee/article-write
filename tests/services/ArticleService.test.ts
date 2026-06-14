/**
 * ArticleService 單元測試
 *
 * 使用 MockFileSystem 進行依賴注入測試
 * 不再依賴 global.window mock
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ArticleService } from "@/services/ArticleService";
import { MockFileSystem } from "../mocks/MockFileSystem";
import { ArticleStatus, ArticleCategory } from "@/types";
import type { Article } from "@/types";

// Mock MarkdownService
vi.mock("@/services/MarkdownService", () => {
  const mockParseMarkdown = vi.fn((_content: string) => ({
    frontmatter: {
      title: "Test Article",
      date: "2026-01-26",
      status: "draft",
      tags: ["test"],
      categories: ["Software"],
    },
    content: "Test content",
  }));

  const mockParseFrontmatter = vi.fn((_content: string) => ({
    frontmatter: {
      title: "Test Article",
      date: "2026-01-26",
      tags: ["test"],
      categories: ["Software"],
    },
    body: "Test content",
    hasValidFrontmatter: true,
    errors: [],
  }));

  const mockCombineContent = vi.fn((frontmatter, content) => {
    return `---\ntitle: ${frontmatter.title}\n---\n\n${content}`;
  });

  return {
    MarkdownService: class MockMarkdownService {
      parseMarkdown = mockParseMarkdown;
      parseFrontmatter = mockParseFrontmatter;
      combineContent = mockCombineContent;
    },
    markdownService: {
      parseMarkdown: mockParseMarkdown,
      parseFrontmatter: mockParseFrontmatter,
      combineContent: mockCombineContent,
    },
  };
});

// Mock BackupService
vi.mock("@/services/BackupService", () => {
  const mockDetectConflict = vi.fn().mockResolvedValue({ hasConflict: false });
  const mockCreateBackup = vi.fn().mockResolvedValue(undefined);

  return {
    BackupService: class MockBackupService {
      detectConflict = mockDetectConflict;
      createBackup = mockCreateBackup;
    },
    backupService: {
      detectConflict: mockDetectConflict,
      createBackup: mockCreateBackup,
    },
  };
});

describe("ArticleService with MockFileSystem", () => {
  let service: ArticleService;
  let mockFileSystem: MockFileSystem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockParseMarkdown: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCombineContent: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDetectConflict: any;

  beforeEach(async () => {
    // 建立新的 MockFileSystem
    mockFileSystem = new MockFileSystem();

    // 取得 mocked functions
    const markdownMod = await import("@/services/MarkdownService");
    const backupMod = await import("@/services/BackupService");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockParseMarkdown = (markdownMod as any).markdownService.parseMarkdown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCombineContent = (markdownMod as any).markdownService.combineContent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDetectConflict = (backupMod as any).backupService.detectConflict;

    // 重置 mock
    vi.clearAllMocks();

    // 使用 MockFileSystem 注入創建 service
    service = new ArticleService(mockFileSystem);
  });

  describe("loadArticle", () => {
    it("應該成功載入文章", async () => {
      // 準備測試資料
      const filePath = "/vault/Drafts/Software/test-article.md";
      const fileContent = `---
title: Test Article
date: 2026-01-26
tags: [test]
categories: [Software]
---

Test content`;

      // 設定 MockFileSystem
      await mockFileSystem.createDirectory("/vault/Drafts/Software");
      await mockFileSystem.writeFile(filePath, fileContent);

      // 執行測試
      const result = await service.loadArticle(filePath, ArticleCategory.Software);

      // 驗證
      expect(result.title).toBe("Test Article");
      expect(result.filePath).toBe(filePath);
      expect(result.status).toBe(ArticleStatus.Draft);
      expect(result.category).toBe(ArticleCategory.Software);
      expect(mockParseMarkdown).toHaveBeenCalledWith(fileContent);
    });

    it("應該處理檔案不存在的情況", async () => {
      const filePath = "/vault/Drafts/Software/non-existent.md";

      await expect(service.loadArticle(filePath, ArticleCategory.Software)).rejects.toThrow("File not found");
    });

    it("載入後應記錄磁碟內容作為衝突偵測基準（topic-020）", async () => {
      const filePath = "/vault/Drafts/Software/test-article.md";
      const fileContent = `---
title: Test Article
date: 2026-01-26
tags: [test]
categories: [Software]
---

Test content`;

      await mockFileSystem.createDirectory("/vault/Drafts/Software");
      await mockFileSystem.writeFile(filePath, fileContent);

      const article = await service.loadArticle(filePath, ArticleCategory.Software);
      await service.saveArticle(article);

      expect(mockDetectConflict).toHaveBeenCalledWith(filePath, fileContent);
    });
  });

  describe("loadAllArticles", () => {
    it("應該掃描並載入所有文章", async () => {
      // 準備測試資料
      await mockFileSystem.seed({
        directories: ["/vault", "/vault/Software", "/vault/growth"],
        files: {
          "/vault/Software/article1.md": "content1",
          "/vault/Software/article2.md": "content2",
          "/vault/growth/article3.md": "content3",
          "/vault/Software/article4.md": "content4",
        },
      });

      // 執行測試
      const articles = await service.loadAllArticles("/vault");

      // 驗證
      expect(articles).toHaveLength(4);
      expect(mockParseMarkdown).toHaveBeenCalledTimes(4);
    });

    it("應該處理空 vault 的情況", async () => {
      await mockFileSystem.createDirectory("/vault");

      const articles = await service.loadAllArticles("/vault");

      expect(articles).toHaveLength(0);
    });

    it("應該略過不存在的資料夾", async () => {
      // 只建立部分資料夾
      await mockFileSystem.createDirectory("/vault");
      await mockFileSystem.createDirectory("/vault/Software");
      await mockFileSystem.writeFile("/vault/Software/article1.md", "content");

      // 其他分類資料夾不存在

      const articles = await service.loadAllArticles("/vault");

      expect(articles).toHaveLength(1);
    });
  });

  describe("saveArticle", () => {
    it("應該成功儲存文章", async () => {
      const article: Article = {
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Test content",
        frontmatter: {
          title: "Test",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      // 準備目錄
      await mockFileSystem.createDirectory("/vault/Drafts/Software");

      // 執行測試
      const result = await service.saveArticle(article);

      // 驗證
      expect(result.success).toBe(true);
      expect(mockCombineContent).toHaveBeenCalled();
      expect(mockDetectConflict).toHaveBeenCalledWith(article.filePath, undefined);

      // 驗證檔案已寫入
      const exists = await mockFileSystem.exists(article.filePath);
      expect(exists).toBe(true);
    });

    it("應該處理衝突情況", async () => {
      const fileModifiedTime = new Date("2026-01-27T00:00:00Z");
      mockDetectConflict.mockResolvedValueOnce({
        hasConflict: true,
        currentFileContent: "外部程式改過的內容",
        fileModifiedTime,
      });

      const article: Article = {
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Test content",
        frontmatter: {
          title: "Test",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      const result = await service.saveArticle(article);

      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.conflictDetails?.currentFileContent).toBe("外部程式改過的內容");
      expect(result.conflictDetails?.fileModifiedTime).toBe(fileModifiedTime);
    });

    it("應該支援跳過衝突檢查和備份", async () => {
      const article: Article = {
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Test content",
        frontmatter: {
          title: "Test",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      await mockFileSystem.createDirectory("/vault/Drafts/Software");

      const result = await service.saveArticle(article, {
        skipConflictCheck: true,
        skipBackup: true,
      });

      expect(result.success).toBe(true);
      expect(mockDetectConflict).not.toHaveBeenCalled();
    });

    it("並行儲存同一檔案時必須序列化，後發起的內容為最終結果（topic-020）", async () => {
      const makeArticle = (content: string): Article => ({
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content,
        frontmatter: {
          title: "Test",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      });

      await mockFileSystem.createDirectory("/vault/Drafts/Software");

      // 模擬第一個儲存（舊內容）的備份步驟很慢——重現 frontmatter 移轉回寫的延遲
      const backupMod = await import("@/services/BackupService");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockCreateBackup = (backupMod as any).backupService.createBackup;
      mockCreateBackup.mockImplementationOnce(
        () => new Promise<void>((resolve) => setTimeout(resolve, 50)),
      );

      // 第一個儲存先發起（舊內容、備份慢），第二個儲存隨後發起（新內容、無延遲）
      const firstSave = service.saveArticle(makeArticle("OLD content"));
      const secondSave = service.saveArticle(makeArticle("NEW content"));
      await Promise.all([firstSave, secondSave]);

      // 序列化保證：後發起的儲存內容必須是磁碟最終狀態（不被先發起的慢寫入覆蓋）
      const finalContent = await mockFileSystem.readFile("/vault/Drafts/Software/test.md");
      expect(finalContent).toContain("NEW content");
      expect(finalContent).not.toContain("OLD content");
    });

    it("儲存成功後，下次衝突偵測會以剛寫入的內容作為基準（topic-020 hash 比對基準）", async () => {
      const makeArticle = (content: string): Article => ({
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content,
        frontmatter: { title: "Test", date: "2026-01-26", tags: [], categories: ["Software"] },
      });

      await mockFileSystem.createDirectory("/vault/Drafts/Software");

      // 第一筆儲存成功，service 記錄自己寫入的內容作為下次衝突偵測的基準
      const first = await service.saveArticle(makeArticle("FIRST content"));
      expect(first.success).toBe(true);
      const writtenByUs = await mockFileSystem.readFile("/vault/Drafts/Software/test.md");

      await service.saveArticle(makeArticle("SECOND content"));
      expect(mockDetectConflict).toHaveBeenLastCalledWith("/vault/Drafts/Software/test.md", writtenByUs);
    });

    it("磁碟內容與自己上次寫入不同時維持衝突判定（真外部修改）", async () => {
      const makeArticle = (content: string): Article => ({
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content,
        frontmatter: { title: "Test", date: "2026-01-26", tags: [], categories: ["Software"] },
      });

      await mockFileSystem.createDirectory("/vault/Drafts/Software");
      await service.saveArticle(makeArticle("FIRST content"));

      mockDetectConflict.mockResolvedValueOnce({
        hasConflict: true,
        currentFileContent: "外部程式改過的內容",
      });
      const result = await service.saveArticle(makeArticle("SECOND content"));
      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
    });

    it("不同檔案的儲存不互相阻塞", async () => {
      const makeArticle = (filePath: string, content: string): Article => ({
        id: filePath,
        title: "Test",
        slug: "test",
        filePath,
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content,
        frontmatter: { title: "Test", date: "2026-01-26", tags: [], categories: ["Software"] },
      });

      await mockFileSystem.createDirectory("/vault/Drafts/Software");

      const results = await Promise.all([
        service.saveArticle(makeArticle("/vault/Drafts/Software/a.md", "content A")),
        service.saveArticle(makeArticle("/vault/Drafts/Software/b.md", "content B")),
      ]);

      expect(results.every((r) => r.success)).toBe(true);
      expect(await mockFileSystem.readFile("/vault/Drafts/Software/a.md")).toContain("content A");
      expect(await mockFileSystem.readFile("/vault/Drafts/Software/b.md")).toContain("content B");
    });
  });

  describe("deleteArticle", () => {
    it("應該成功刪除文章", async () => {
      const article: Article = {
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Test content",
        frontmatter: {
          title: "Test",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      // 先建立檔案
      await mockFileSystem.createDirectory("/vault/Drafts/Software");
      await mockFileSystem.writeFile(article.filePath, "content");

      // 刪除
      await service.deleteArticle(article);

      // 驗證
      const exists = await mockFileSystem.exists(article.filePath);
      expect(exists).toBe(false);
    });
  });

  describe("moveArticle", () => {
    it("應該成功移動文章", async () => {
      const article: Article = {
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Test content",
        frontmatter: {
          title: "Test",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      const newFilePath = "/vault/Publish/Software/test.md";

      // 準備測試
      await mockFileSystem.createDirectory("/vault/Drafts/Software");
      await mockFileSystem.createDirectory("/vault/Publish/Software");
      await mockFileSystem.writeFile(article.filePath, "original content");

      // 移動
      await service.moveArticle(article, newFilePath);

      // 驗證
      const oldExists = await mockFileSystem.exists(article.filePath);
      const newExists = await mockFileSystem.exists(newFilePath);

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);

      const newContent = await mockFileSystem.readFile(newFilePath);
      expect(newContent).toBe("original content");
    });
  });

  describe("generateSlug", () => {
    it("應該產生正確的 slug", () => {
      expect(service.generateSlug("Hello World")).toBe("hello-world");
      expect(service.generateSlug("  Trim Spaces  ")).toBe("trim-spaces");
      expect(service.generateSlug("Remove@Special#Chars")).toBe("removespecialchars");
      expect(service.generateSlug("Multiple   Spaces")).toBe("multiple-spaces");
      expect(service.generateSlug("Multiple---Dashes")).toBe("multiple-dashes");
    });
  });

  describe("validateArticle", () => {
    it("應該驗證有效的文章", () => {
      const article: Article = {
        id: "test-id",
        title: "Valid Article",
        slug: "valid-article",
        filePath: "/vault/Drafts/Software/valid.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Content",
        frontmatter: {
          title: "Valid Article",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      const result = service.validateArticle(article);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("應該偵測缺少標題", () => {
      const article: Article = {
        id: "test-id",
        title: "",
        slug: "test",
        filePath: "/vault/Drafts/Software/test.md",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Content",
        frontmatter: {
          title: "",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      const result = service.validateArticle(article);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("標題不能為空");
    });

    it("應該偵測缺少檔案路徑", () => {
      const article: Article = {
        id: "test-id",
        title: "Test",
        slug: "test",
        filePath: "",
        status: ArticleStatus.Draft,
        category: ArticleCategory.Software,
        lastModified: new Date(),
        content: "Content",
        frontmatter: {
          title: "Test",
          date: "2026-01-26",
          tags: [],
          categories: ["Software"],
        },
      };

      const result = service.validateArticle(article);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("檔案路徑不能為空");
    });
  });
});
