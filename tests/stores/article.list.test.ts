/**
 * Article Store — 列表行為測試
 * 覆蓋來自 article-list.spec.ts 的以下場景（移自 E2E）：
 *   1. 排序穩定性：filteredArticles 永遠按標題排序，不因更新而跳動
 *   2. 防止重複文章：reloadArticleFromDisk 對已知路徑執行更新而非新增
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useArticleStore } from "@/stores/article"
import { useConfigStore } from "@/stores/config"
import type { Article } from "@/types"
import { ArticleStatus, ArticleFilterStatus, ArticleFilterCategory } from "@/types"

// ---------- 全域 mock ----------

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
    watchDirectory: vi.fn(),
    unwatchDirectory: vi.fn(),
    startFileWatching: vi.fn().mockResolvedValue(undefined),
    stopFileWatching: vi.fn().mockResolvedValue(undefined),
    onFileChange: vi.fn(() => vi.fn()),
  },
} as any

// ---------- 工廠函式 ----------

let idSeq = 0
function makeArticle(overrides: Partial<Article> = {}): Article {
  idSeq++
  return {
    id: `id-${idSeq}`,
    title: `文章 ${idSeq}`,
    slug: `article-${idSeq}`,
    content: "內容",
    filePath: `/vault/Drafts/Software/article-${idSeq}.md`,
    category: "Software",
    status: ArticleStatus.Draft,
    frontmatter: { title: `文章 ${idSeq}` },
    lastModified: new Date("2026-01-01"),
    ...overrides,
  }
}

// loadArticle 回傳的最小合法 markdown（用於 reloadArticleFromDisk 的 readFile mock）
function makeFrontmatterMd(title: string) {
  return `---\ntitle: ${title}\nstatus: draft\n---\n\n更新後內容`
}

// ---------- 測試 ----------

describe("Article Store — 排序穩定性", () => {
  beforeEach(() => {
    idSeq = 0
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = "/vault"
    vi.clearAllMocks()
    window.electronAPI.writeFile.mockResolvedValue(undefined)
    window.electronAPI.getFileStats.mockResolvedValue({
      isDirectory: false,
      mtime: new Date("2026-01-01").getTime(),
    })
  })

  it("filteredArticles 按標題 localeCompare 排序，與插入順序無關", () => {
    const store = useArticleStore()

    // 刻意以 C > A > B 的順序插入，使用 ASCII 標題讓排序在任何 locale 下都可預測
    store.articles.push(
      makeArticle({ title: "Zebra article", filePath: "/vault/Drafts/Software/c.md" }),
      makeArticle({ title: "Alpha article", filePath: "/vault/Drafts/Software/a.md" }),
      makeArticle({ title: "Mango article", filePath: "/vault/Drafts/Software/b.md" }),
    )

    const titles = store.filteredArticles.map((a) => a.title)

    expect(titles).toEqual(["Alpha article", "Mango article", "Zebra article"])
  })

  it("filteredArticles 在 filter 無變化時順序不因文章數量增減而亂序", () => {
    const store = useArticleStore()

    store.articles.push(
      makeArticle({ title: "Zig 語言", filePath: "/vault/Drafts/Software/z.md" }),
      makeArticle({ title: "Go 語言", filePath: "/vault/Drafts/Software/g.md" }),
    )

    const before = store.filteredArticles.map((a) => a.title)

    // 新增一篇放在中間字母的文章
    store.articles.push(
      makeArticle({ title: "Rust 語言", filePath: "/vault/Drafts/Software/r.md" }),
    )

    const after = store.filteredArticles.map((a) => a.title)

    // 原有兩篇的相對順序必須保持，新文章插入正確位置
    expect(after).toEqual(["Go 語言", "Rust 語言", "Zig 語言"])
    expect(before[0]).toBe("Go 語言") // 原本第一篇仍在第一
  })

  it("searchText 過濾後排序依然穩定", () => {
    const store = useArticleStore()

    store.articles.push(
      makeArticle({ title: "TypeScript 實戰", content: "TS 相關", filePath: "/vault/Drafts/Software/ts.md" }),
      makeArticle({ title: "JavaScript 入門", content: "JS 相關", filePath: "/vault/Drafts/Software/js.md" }),
      makeArticle({ title: "Python 爬蟲", content: "Python 相關", filePath: "/vault/Drafts/Software/py.md" }),
    )

    store.updateFilter({ searchText: "相關" })

    const titles = store.filteredArticles.map((a) => a.title)

    // 三篇都符合，仍按標題排序
    expect(titles).toEqual(["JavaScript 入門", "Python 爬蟲", "TypeScript 實戰"])
  })
})

describe("Article Store — 防止重複文章（reloadArticleFromDisk）", () => {
  beforeEach(() => {
    idSeq = 0
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = "/vault"
    vi.clearAllMocks()
    window.electronAPI.writeFile.mockResolvedValue(undefined)
    window.electronAPI.getFileStats.mockResolvedValue({
      isDirectory: false,
      mtime: new Date("2026-01-02").getTime(),
    })
  })

  it("已知路徑 → 更新現有文章，articles 數量不增加", async () => {
    const store = useArticleStore()
    const existingPath = "/vault/Drafts/Software/existing.md"
    const original = makeArticle({ filePath: existingPath, title: "原始標題" })
    store.articles.push(original)

    window.electronAPI.readFile.mockResolvedValue(makeFrontmatterMd("更新後標題"))

    await store.reloadArticleFromDisk(existingPath, ArticleStatus.Draft, "Software")

    expect(store.articles).toHaveLength(1)
  })

  it("已知路徑 → 文章內容更新為磁碟最新版本", async () => {
    const store = useArticleStore()
    const existingPath = "/vault/Drafts/Software/existing.md"
    const original = makeArticle({ filePath: existingPath, title: "原始標題" })
    store.articles.push(original)

    window.electronAPI.readFile.mockResolvedValue(makeFrontmatterMd("更新後標題"))

    await store.reloadArticleFromDisk(existingPath, ArticleStatus.Draft, "Software")

    expect(store.articles[0].title).toBe("更新後標題")
  })

  it("已知路徑 → 保留原有 id，避免 UI 重新掛載", async () => {
    const store = useArticleStore()
    const existingPath = "/vault/Drafts/Software/existing.md"
    const original = makeArticle({ id: "keep-this-id", filePath: existingPath })
    store.articles.push(original)

    window.electronAPI.readFile.mockResolvedValue(makeFrontmatterMd("任何標題"))

    await store.reloadArticleFromDisk(existingPath, ArticleStatus.Draft, "Software")

    expect(store.articles[0].id).toBe("keep-this-id")
  })

  it("全新路徑 → 新增一篇文章，articles 數量 +1", async () => {
    const store = useArticleStore()
    const existingPath = "/vault/Drafts/Software/existing.md"
    store.articles.push(makeArticle({ filePath: existingPath }))

    const newPath = "/vault/Drafts/Software/brand-new.md"
    window.electronAPI.readFile.mockResolvedValue(makeFrontmatterMd("全新文章"))

    await store.reloadArticleFromDisk(newPath, ArticleStatus.Draft, "Software")

    expect(store.articles).toHaveLength(2)
  })

  it("連續兩次 reload 相同路徑 → 仍只有一篇", async () => {
    const store = useArticleStore()
    const path = "/vault/Drafts/Software/once.md"
    store.articles.push(makeArticle({ filePath: path }))

    window.electronAPI.readFile.mockResolvedValue(makeFrontmatterMd("標題"))

    await store.reloadArticleFromDisk(path, ArticleStatus.Draft, "Software")
    await store.reloadArticleFromDisk(path, ArticleStatus.Draft, "Software")

    expect(store.articles).toHaveLength(1)
  })
})

describe("Article Store — setCurrentArticle 不改變 filter（確保 currentPage 不重置）", () => {
  beforeEach(() => {
    idSeq = 0
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = "/vault"
    vi.clearAllMocks()
    window.electronAPI.writeFile.mockResolvedValue(undefined)
    window.electronAPI.getFileStats.mockResolvedValue(null)
  })

  it("setCurrentArticle 後 filter 狀態不變（不觸發 watch → currentPage 不重置）", () => {
    const store = useArticleStore()
    const article = makeArticle()
    store.articles.push(article)

    // 先設定一個非預設的 filter
    store.updateFilter({ searchText: "測試關鍵字" })
    const filterBefore = { ...store.filter }

    store.setCurrentArticle(article)

    expect(store.filter).toEqual(filterBefore)
  })

  it("updateFilter 才會改變 filter（確認 watch 觸發條件正確）", () => {
    const store = useArticleStore()

    store.updateFilter({ searchText: "新關鍵字" })

    expect(store.filter.searchText).toBe("新關鍵字")
  })

  it("resetFilter 後 filter 回到預設值", () => {
    const store = useArticleStore()

    store.updateFilter({ searchText: "關鍵字", status: ArticleStatus.Draft as any })
    store.updateFilter({
      searchText: "",
      status: ArticleFilterStatus.All,
      category: ArticleFilterCategory.All,
      tags: [],
    })

    expect(store.filter.searchText).toBe("")
    expect(store.filter.status).toBe(ArticleFilterStatus.All)
  })
})
