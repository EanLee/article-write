import { describe, it, expect, beforeEach } from "vitest";
import { PreviewService } from "@/services/PreviewService";
import type { Article } from "@/types";
import { ArticleStatus, ArticleCategory } from "@/types";

describe("PreviewService", () => {
  let previewService: PreviewService;
  let mockArticles: Article[];

  beforeEach(() => {
    previewService = new PreviewService();
    mockArticles = [
      {
        id: "1",
        title: "Test Article",
        slug: "test-article",
        filePath: "/test/path",
        status: ArticleStatus.Draft,
        frontmatter: {
          title: "Test Article",
          date: "2024-01-01",
          tags: ["test"],
          categories: ["Software"],
        },
        content: "Test content",
        lastModified: new Date(),
        category: ArticleCategory.Software,
      },
    ];
    previewService.updateArticles(mockArticles);
  });

  describe("renderPreview", () => {
    it("should render basic markdown content", () => {
      const content = "# Test Header\n\nThis is a test paragraph.";
      const result = previewService.renderPreview(content);

      expect(result).toContain("<h1");
      expect(result).toContain("Test Header");
      expect(result).toContain("<p>");
      expect(result).toContain("test paragraph");
    });

    it("should process Obsidian highlight syntax", () => {
      const content = "This is ==highlighted text== in the content.";
      const result = previewService.renderPreview(content);

      expect(result).toContain('<mark class="obsidian-highlight">highlighted text</mark>');
    });

    it("should process Obsidian wiki links", () => {
      const content = "Link to [[Test Article]] in the text.";
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: mockArticles,
      });

      expect(result).toContain("obsidian-wikilink-valid");
      expect(result).toContain('data-link="Test Article"');
      expect(result).toContain("Test Article");
    });

    it("should handle invalid wiki links", () => {
      const content = "Link to [[Nonexistent Article]] in the text.";
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: mockArticles,
      });

      expect(result).toContain("obsidian-wikilink-invalid");
      expect(result).toContain('data-link="Nonexistent Article"');
    });

    it("should process wiki links with aliases", () => {
      const content = "Link to [[Test Article|Custom Alias]] in the text.";
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: mockArticles,
      });

      expect(result).toContain('data-link="Test Article"');
      expect(result).toContain("Custom Alias");
    });

    it("should process Obsidian image syntax", () => {
      const content = "Image: ![[test-image.png]]";
      const result = previewService.renderPreview(content);

      expect(result).toContain("<img");
      expect(result).toContain('class="obsidian-image"');
      expect(result).toContain("test-image.png");
    });

    it("![[image.png|300]] 應解析 Obsidian 縮圖語法為 width=300", () => {
      const result = previewService.renderPreview("![[test-image.png|300]]");

      expect(result).toContain("<img");
      expect(result).toContain('width="300"');
      expect(result).toContain("test-image.png");
      expect(result).not.toContain("test-image.png|300");
    });

    it("![[image.png|300x200]] 應同時解析 width 與 height", () => {
      const result = previewService.renderPreview("![[test-image.png|300x200]]");

      expect(result).toContain('width="300"');
      expect(result).toContain('height="200"');
    });

    it("沒有縮圖語法時不應產生 width/height 屬性", () => {
      const result = previewService.renderPreview("![[test-image.png]]");

      expect(result).not.toContain("width=");
      expect(result).not.toContain("height=");
    });

    it("should process Obsidian tags", () => {
      const content = "This has a #test-tag in it.";
      const result = previewService.renderPreview(content);

      expect(result).toContain("obsidian-tag");
      expect(result).toContain("#test-tag");
    });

    it("#tag 不應被 preprocessObsidianSyntax 重複處理成巢狀 span（renderPreview 內部管線只應跑一次 Obsidian 語法預處理）", () => {
      const content = "This has a #test-tag in it.";
      const result = previewService.renderPreview(content);

      const obsidianTagCount = (result.match(/class="obsidian-tag"/g) || []).length;
      expect(obsidianTagCount).toBe(1);
      expect(result).not.toContain('class="tag"');
    });

    it("should remove Obsidian comments", () => {
      const content = "This is visible %%this is hidden%% text.";
      const result = previewService.renderPreview(content);

      expect(result).not.toContain("this is hidden");
      expect(result).toContain("This is visible");
      expect(result).toContain("text.");
    });

    it("should handle rendering errors gracefully", () => {
      // Mock a scenario that might cause an error
      const invalidContent = null as unknown as string;
      const result = previewService.renderPreview(invalidContent);

      // Should return empty string for null input
      expect(result).toBe("");
    });
  });

  describe("getPreviewStats", () => {
    it("should calculate basic statistics", () => {
      const content = "This is a test content with multiple words and some [[links]] and ![[image.png]].";
      const stats = previewService.getPreviewStats(content);

      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.characterCount).toBeGreaterThan(0);
      expect(stats.readingTime).toBeGreaterThan(0);
      expect(stats.imageCount).toBe(1);
      expect(stats.linkCount).toBeGreaterThanOrEqual(1); // Could be 1 or 2 depending on regex matching
    });

    it("should exclude code blocks from word count", () => {
      const content = `
# Title
This is regular text.
\`\`\`javascript
const code = "this should not be counted";
console.log(code);
\`\`\`
More regular text.
      `;
      const stats = previewService.getPreviewStats(content);

      expect(stats.wordCount).toBeLessThan(20); // Should not count code block words
    });

    it("should handle empty content", () => {
      const stats = previewService.getPreviewStats("");

      expect(stats.wordCount).toBe(0);
      expect(stats.characterCount).toBe(0);
      expect(stats.readingTime).toBe(0);
      expect(stats.imageCount).toBe(0);
      expect(stats.linkCount).toBe(0);
    });
  });

  describe("validatePreviewContent", () => {
    it("should validate wiki links correctly", () => {
      const content = "Valid: [[Test Article]] Invalid: [[Nonexistent]]";
      const validation = previewService.validatePreviewContent(content);

      expect(validation.validLinks).toContain("Test Article");
      expect(validation.invalidLinks).toContain("Nonexistent");
    });

    it("should validate image references", () => {
      const content = "Image: ![[test.png]] and ![[document.txt]]";
      const validation = previewService.validatePreviewContent(content);

      expect(validation.validImages).toContain("test.png");
      expect(validation.invalidImages).toContain("document.txt");
    });

    it("should handle content with no links or images", () => {
      const content = "Just plain text with no special syntax.";
      const validation = previewService.validatePreviewContent(content);

      expect(validation.validLinks).toHaveLength(0);
      expect(validation.invalidLinks).toHaveLength(0);
      expect(validation.validImages).toHaveLength(0);
      expect(validation.invalidImages).toHaveLength(0);
    });
  });

  describe("configuration", () => {
    it("should update articles list", () => {
      const newArticles: Article[] = [
        {
          id: "2",
          title: "New Article",
          slug: "new-article",
          filePath: "/new/path",
          status: ArticleStatus.Published,
          frontmatter: {
            title: "New Article",
            date: "2024-01-02",
            tags: ["new"],
            categories: ["growth"],
          },
          content: "New content",
          lastModified: new Date(),
          category: ArticleCategory.Growth,
        },
      ];

      previewService.updateArticles(newArticles);

      const content = "Link to [[New Article]]";
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: newArticles,
      });

      expect(result).toContain("obsidian-wikilink-valid");
      expect(result).toContain("New Article");
    });

    it("should set image base path", () => {
      const basePath = "/custom/images";
      previewService.setImageBasePath(basePath);

      const content = "Image: ![[test.png]]";
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        baseImagePath: basePath,
      });

      expect(result).toContain(`src="local-file:///${basePath.replace(/^\/+/, "")}/test.png"`);
    });
  });

  describe("resolveImagePath - Windows 路徑相容性", () => {
    it("Windows 絕對路徑應生成 local-file:/// 三斜線 URL，避免磁碟代號被解析為 hostname", () => {
      previewService.setImageBasePath("C:/Users/user/vault/images");
      const html = previewService.renderPreview("![[photo.png]]");
      // local-file://C:/... 會把 C 解析為 hostname，protocol handler 收到的 pathname 遺失磁碟代號
      expect(html).toContain('src="local-file:///C:/Users/user/vault/images/photo.png"');
      expect(html).not.toContain("local-file://C:/");
    });

    it("Windows 反斜線路徑應正規化為正斜線", () => {
      previewService.setImageBasePath("C:\\Users\\user\\vault\\images");
      const html = previewService.renderPreview("![[photo.png]]");
      expect(html).toContain('src="local-file:///C:/Users/user/vault/images/photo.png"');
    });

    it("Unix 絕對路徑應生成正確 local-file:/// URL", () => {
      previewService.setImageBasePath("/home/user/vault/images");
      const html = previewService.renderPreview("![[photo.png]]");
      expect(html).toContain('src="local-file:///home/user/vault/images/photo.png"');
    });

    it("未設定 imageBasePath 時應 fallback 為相對路徑 ./images/", () => {
      const html = previewService.renderPreview("![[photo.png]]");
      expect(html).toContain("./images/photo.png");
    });
  });

  describe("setArticleFilePath + HTML post-processing - 相對路徑安全防線", () => {
    it("setArticleFilePath 後渲染時應在 HTML 層轉換相對 img src（Windows）", () => {
      previewService.setArticleFilePath("C:/vault/Drafts/Engineering/article.md")
      const html = previewService.renderPreview("![圖片](../../images/photo.png)")
      expect(html).toContain("local-file:///C:/vault/images/photo.png")
    })

    it("setArticleFilePath 後渲染時應在 HTML 層轉換相對 img src（Unix）", () => {
      previewService.setArticleFilePath("/home/vault/Drafts/Engineering/article.md")
      const html = previewService.renderPreview("![圖片](../../images/photo.png)")
      expect(html).toContain("local-file:///home/vault/images/photo.png")
    })

    it("setArticleFilePath 為空時不轉換 img src", () => {
      previewService.setArticleFilePath("")
      const html = previewService.renderPreview("![圖片](../../images/photo.png)")
      expect(html).toContain("../../images/photo.png")
      expect(html).not.toContain("local-file:")
    })

    it("http 圖片路徑不應被 HTML post-processing 修改", () => {
      previewService.setArticleFilePath("C:/vault/article.md")
      const html = previewService.renderPreview("![圖片](https://example.com/image.png)")
      expect(html).toContain("https://example.com/image.png")
      expect(html).not.toContain("local-file:")
    })
  })

  describe("resolveStandardMarkdownImagePaths - 標準 Markdown 圖片相對路徑解析", () => {
    it("相對路徑 ../../images/... 應解析為 local-file:/// 絕對路徑（Windows）", () => {
      const html = previewService.renderPreview(
        "![圖片](../../images/grafana_k6_dashboard_mock.png)",
        {
          enableObsidianSyntax: true,
          enableImagePreview: true,
          enableWikiLinks: true,
          articleFilePath: "C:/vault/Drafts/Engineering/article.md",
        }
      );
      expect(html).toContain("local-file:///C:/vault/images/grafana_k6_dashboard_mock.png");
    });

    it("相對路徑 ../../images/... 應解析為 local-file:/// 絕對路徑（Unix）", () => {
      const html = previewService.renderPreview(
        "![圖片](../../images/photo.png)",
        {
          enableObsidianSyntax: true,
          enableImagePreview: true,
          enableWikiLinks: true,
          articleFilePath: "/home/vault/Drafts/Engineering/article.md",
        }
      );
      expect(html).toContain("local-file:///home/vault/images/photo.png");
    });

    it("http 圖片路徑不應被修改", () => {
      const html = previewService.renderPreview(
        "![圖片](https://example.com/image.png)",
        { enableObsidianSyntax: true, enableImagePreview: true, enableWikiLinks: true, articleFilePath: "C:/vault/article.md" }
      );
      expect(html).toContain("https://example.com/image.png");
      expect(html).not.toContain("local-file:");
    });

    it("未提供 articleFilePath 時相對路徑保持原樣", () => {
      const html = previewService.renderPreview(
        "![圖片](../../images/photo.png)",
        { enableObsidianSyntax: true, enableImagePreview: true, enableWikiLinks: true }
      );
      expect(html).toContain("../../images/photo.png");
    });
  });
});
