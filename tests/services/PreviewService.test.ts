import { describe, it, expect, beforeEach } from "vitest"
import { PreviewService } from "@/services/PreviewService"
import type { Article } from "@/types"
import { ArticleStatus, ArticleCategory } from "@/types"

describe("PreviewService", () => {
  let previewService: PreviewService
  let mockArticles: Article[]

  beforeEach(() => {
    previewService = new PreviewService()
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
          categories: ["Software"]
        },
        content: "Test content",
        lastModified: new Date(),
        category: ArticleCategory.Software
      }
    ]
    previewService.updateArticles(mockArticles)
  })

  describe("renderPreview", () => {
    it("should render basic markdown content", () => {
      const content = "# Test Header\n\nThis is a test paragraph."
      const result = previewService.renderPreview(content)
      
      expect(result).toContain("<h1")
      expect(result).toContain("Test Header")
      expect(result).toContain("<p>")
      expect(result).toContain("test paragraph")
    })

    it("should process Obsidian highlight syntax", () => {
      const content = "This is ==highlighted text== in the content."
      const result = previewService.renderPreview(content)
      
      expect(result).toContain('<mark class="obsidian-highlight">highlighted text</mark>')
    })

    it("should process Obsidian wiki links", () => {
      const content = "Link to [[Test Article]] in the text."
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: mockArticles
      })
      
      expect(result).toContain("obsidian-wikilink-valid")
      expect(result).toContain('data-link="Test Article"')
      expect(result).toContain("Test Article")
    })

    it("should handle invalid wiki links", () => {
      const content = "Link to [[Nonexistent Article]] in the text."
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: mockArticles
      })
      
      expect(result).toContain("obsidian-wikilink-invalid")
      expect(result).toContain('data-link="Nonexistent Article"')
    })

    it("should process wiki links with aliases", () => {
      const content = "Link to [[Test Article|Custom Alias]] in the text."
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: mockArticles
      })
      
      expect(result).toContain('data-link="Test Article"')
      expect(result).toContain("Custom Alias")
    })

    it("should process Obsidian image syntax", () => {
      const content = "Image: ![[test-image.png]]"
      const result = previewService.renderPreview(content)
      
      expect(result).toContain("<img")
      expect(result).toContain('class="obsidian-image"')
      expect(result).toContain("test-image.png")
    })

    it("should process Obsidian tags", () => {
      const content = "This has a #test-tag in it."
      const result = previewService.renderPreview(content)
      
      expect(result).toContain("obsidian-tag")
      expect(result).toContain("#test-tag")
    })

    it("should remove Obsidian comments", () => {
      const content = "This is visible %%this is hidden%% text."
      const result = previewService.renderPreview(content)
      
      expect(result).not.toContain("this is hidden")
      expect(result).toContain("This is visible")
      expect(result).toContain("text.")
    })

    it("should handle rendering errors gracefully", () => {
      // Mock a scenario that might cause an error
      const invalidContent = null as any
      const result = previewService.renderPreview(invalidContent)
      
      // Should return empty string for null input
      expect(result).toBe("")
    })
  })

  describe("getPreviewStats", () => {
    it("should calculate basic statistics", () => {
      const content = "This is a test content with multiple words and some [[links]] and ![[image.png]]."
      const stats = previewService.getPreviewStats(content)
      
      expect(stats.wordCount).toBeGreaterThan(0)
      expect(stats.characterCount).toBeGreaterThan(0)
      expect(stats.readingTime).toBeGreaterThan(0)
      expect(stats.imageCount).toBe(1)
      expect(stats.linkCount).toBeGreaterThanOrEqual(1) // Could be 1 or 2 depending on regex matching
    })

    it("should exclude code blocks from word count", () => {
      const content = `
# Title
This is regular text.
\`\`\`javascript
const code = "this should not be counted";
console.log(code);
\`\`\`
More regular text.
      `
      const stats = previewService.getPreviewStats(content)
      
      expect(stats.wordCount).toBeLessThan(20) // Should not count code block words
    })

    it("should handle empty content", () => {
      const stats = previewService.getPreviewStats("")
      
      expect(stats.wordCount).toBe(0)
      expect(stats.characterCount).toBe(0)
      expect(stats.readingTime).toBe(0)
      expect(stats.imageCount).toBe(0)
      expect(stats.linkCount).toBe(0)
    })
  })

  describe("validatePreviewContent", () => {
    it("should validate wiki links correctly", () => {
      const content = "Valid: [[Test Article]] Invalid: [[Nonexistent]]"
      const validation = previewService.validatePreviewContent(content)
      
      expect(validation.validLinks).toContain("Test Article")
      expect(validation.invalidLinks).toContain("Nonexistent")
    })

    it("should validate image references", () => {
      const content = "Image: ![[test.png]] and ![[document.txt]]"
      const validation = previewService.validatePreviewContent(content)
      
      expect(validation.validImages).toContain("test.png")
      expect(validation.invalidImages).toContain("document.txt")
    })

    it("should handle content with no links or images", () => {
      const content = "Just plain text with no special syntax."
      const validation = previewService.validatePreviewContent(content)
      
      expect(validation.validLinks).toHaveLength(0)
      expect(validation.invalidLinks).toHaveLength(0)
      expect(validation.validImages).toHaveLength(0)
      expect(validation.invalidImages).toHaveLength(0)
    })
  })

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
            categories: ["growth"]
          },
          content: "New content",
          lastModified: new Date(),
          category: ArticleCategory.Growth
        }
      ]
      
      previewService.updateArticles(newArticles)
      
      const content = "Link to [[New Article]]"
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        articleList: newArticles
      })
      
      expect(result).toContain("obsidian-wikilink-valid")
      expect(result).toContain("New Article")
    })

    it("should set image base path", () => {
      const basePath = "/custom/images"
      previewService.setImageBasePath(basePath)
      
      const content = "Image: ![[test.png]]"
      const result = previewService.renderPreview(content, {
        enableObsidianSyntax: true,
        enableImagePreview: true,
        enableWikiLinks: true,
        baseImagePath: basePath
      })
      
      expect(result).toContain(`src="${basePath}/test.png"`)
    })
  })
})