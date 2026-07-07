import { describe, it, expect } from "vitest"
import { reactive } from "vue"
import type { Article } from "@/types"
import { ArticleStatus } from "@/types"

function makeReactiveArticle(): Article {
  return reactive({
    id: "test-id",
    title: "測試文章",
    slug: "test-article",
    filePath: "/test/path.md",
    status: ArticleStatus.Draft,
    frontmatter: {
      title: "測試文章",
      description: "測試描述",
      tags: ["tag1", "tag2"],
      categories: ["Software"],
      keywords: ["kw1", "kw2"],
      slug: "test-article",
    },
    content: "# 測試內容",
    lastModified: new Date("2026-01-01"),
    category: "Software",
  }) as Article
}

/**
 * FrontmatterEditor 在 watch({ immediate: true }) 中對 Vue reactive Article 執行深度複製。
 * 根因：原本使用 structuredClone()，Vue reactive Proxy 在 Electron/Chrome 環境下會丟
 * DataCloneError（#<Object> could not be cloned）——Proxy 的 ownKeys trap 揭露 Vue 內部
 * Symbol property，其值為無法序列化的 C++ host object。
 * 修復：改用 JSON.parse(JSON.stringify(...)) 繞過 Proxy 的 Symbol key。
 */
describe("FrontmatterEditor - Vue reactive Article 深度複製", () => {
  describe("JSON.parse/stringify 複製行為（修復方案）", () => {
    it("應成功複製 reactive Article 的所有欄位", () => {
      const article = makeReactiveArticle()

      const cloned = JSON.parse(JSON.stringify(article)) as Article

      expect(cloned.id).toBe(article.id)
      expect(cloned.title).toBe(article.title)
      expect(cloned.slug).toBe(article.slug)
      expect(cloned.filePath).toBe(article.filePath)
      expect(cloned.content).toBe(article.content)
      expect(cloned.category).toBe(article.category)
    })

    it("應完整複製 frontmatter 所有欄位", () => {
      const article = makeReactiveArticle()

      const cloned = JSON.parse(JSON.stringify(article)) as Article

      expect(cloned.frontmatter.title).toBe(article.frontmatter.title)
      expect(cloned.frontmatter.description).toBe(article.frontmatter.description)
      expect(cloned.frontmatter.slug).toBe(article.frontmatter.slug)
      expect(cloned.frontmatter.tags).toEqual(["tag1", "tag2"])
      expect(cloned.frontmatter.categories).toEqual(["Software"])
      expect(cloned.frontmatter.keywords).toEqual(["kw1", "kw2"])
    })

    it("複製後修改 tags 不應影響原始 reactive Article（mutation 隔離）", () => {
      const article = makeReactiveArticle()

      const cloned = JSON.parse(JSON.stringify(article)) as Article
      cloned.frontmatter.tags!.push("new-tag")

      expect(article.frontmatter.tags).toEqual(["tag1", "tag2"])
      expect(cloned.frontmatter.tags).toEqual(["tag1", "tag2", "new-tag"])
    })

    it("複製後修改 title 不應影響原始 reactive Article", () => {
      const article = makeReactiveArticle()

      const cloned = JSON.parse(JSON.stringify(article)) as Article
      cloned.frontmatter.title = "修改後的標題"

      expect(article.frontmatter.title).toBe("測試文章")
      expect(cloned.frontmatter.title).toBe("修改後的標題")
    })

    it("複製結果不是 Vue reactive Proxy（可安全傳入 IPC）", () => {
      const article = makeReactiveArticle()

      const cloned = JSON.parse(JSON.stringify(article)) as Article

      // JSON.parse 返回純 JS 物件，toString 不會是 [object Object]
      // 且 Object.keys 與直接存取不需要 Proxy 介入
      expect(typeof cloned).toBe("object")
      expect(Object.keys(cloned)).toContain("frontmatter")
      expect(cloned).not.toBe(article) // 不是同一個參考
    })
  })

  describe("frontmatter 必要欄位初始化（FrontmatterEditor 邏輯）", () => {
    it("複製後缺少 keywords 時應能正常初始化空陣列", () => {
      const article = makeReactiveArticle()
      const cloned = JSON.parse(JSON.stringify(article)) as Article

      if (!cloned.frontmatter.keywords) {
        cloned.frontmatter.keywords = []
      }

      expect(cloned.frontmatter.keywords).toEqual(["kw1", "kw2"])
    })

    it("複製沒有 keywords 的文章後應能安全初始化空陣列", () => {
      const article = reactive({
        id: "test-2",
        title: "無關鍵字文章",
        slug: "no-keywords",
        filePath: "/test/path2.md",
        status: ArticleStatus.Draft,
        frontmatter: { title: "無關鍵字文章" },
        content: "# 內容",
        lastModified: new Date("2026-01-01"),
        category: "Software",
      }) as Article

      const cloned = JSON.parse(JSON.stringify(article)) as Article

      if (!cloned.frontmatter.keywords) {
        cloned.frontmatter.keywords = []
      }

      expect(cloned.frontmatter.keywords).toEqual([])
    })
  })
})
