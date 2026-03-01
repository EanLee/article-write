/**
 * ArticleManagement 組件 — 分頁行為測試
 * 覆蓋來自 article-list.spec.ts 的以下場景（移自 E2E）：
 *   - 切換文章（setCurrentArticle）不重置 currentPage
 *   - 變更篩選條件（updateFilter）重置 currentPage 到第 1 頁
 *
 * 策略：shallowMount 組件，透過 DOM text "頁面 N / M" 驗證 currentPage
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { shallowMount } from "@vue/test-utils"
import { setActivePinia, createPinia } from "pinia"
import { useArticleStore } from "@/stores/article"
import { useConfigStore } from "@/stores/config"
import ArticleManagement from "@/components/ArticleManagement.vue"
import type { Article } from "@/types"
import { ArticleStatus } from "@/types"

// ---------- 全域 mock ----------

Object.defineProperty(window, "electronAPI", {
  value: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    getFileStats: vi.fn().mockResolvedValue(null),
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    watchDirectory: vi.fn(),
    unwatchDirectory: vi.fn(),
    startFileWatching: vi.fn().mockResolvedValue(undefined),
    stopFileWatching: vi.fn().mockResolvedValue(undefined),
    onFileChange: vi.fn(() => vi.fn()),
    onSyncProgress: vi.fn(() => vi.fn()),
    syncAllPublished: vi.fn().mockResolvedValue({ succeeded: 0, failed: 0, errors: [], warnings: [] }),
  },
  writable: true,
})

// ---------- 工廠函式 ----------

let idSeq = 0
function makeArticle(overrides: Partial<Article> = {}): Article {
  idSeq++
  const n = idSeq
  return {
    id: `id-${n}`,
    title: `文章 ${String(n).padStart(3, "0")}`, // "文章 001" ... 確保字母順序穩定
    slug: `article-${n}`,
    content: "內容",
    filePath: `/vault/Drafts/Software/article-${n}.md`,
    category: "Software",
    status: ArticleStatus.Draft,
    frontmatter: { title: `文章 ${n}` },
    lastModified: new Date("2026-01-01"),
    ...overrides,
  }
}

/** 預設 pageSize = 50，產生 51 篇文章讓 totalPages = 2 */
function make51Articles(): Article[] {
  idSeq = 0
  return Array.from({ length: 51 }, () => makeArticle())
}

// ---------- 輔助：取得目前頁碼文字（如 "頁面 2 / 2"） ----------

function getPageText(wrapper: ReturnType<typeof shallowMount>): string {
  return wrapper.find(".pagination-bar").text().replace(/\s+/g, " ").trim()
}

// ---------- 測試 ----------

describe("ArticleManagement 組件 — 分頁行為", () => {
  beforeEach(() => {
    idSeq = 0
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.config.paths.articlesDir = "/vault"
    vi.clearAllMocks()
  })

  it("有足夠文章時，分頁列顯示「頁面 1 / 2」", async () => {
    const articleStore = useArticleStore()
    articleStore.articles.push(...make51Articles())

    const wrapper = shallowMount(ArticleManagement)
    await wrapper.vm.$nextTick()

    expect(getPageText(wrapper)).toContain("頁面 1 / 2")
  })

  it("點擊下一頁按鈕後，分頁列顯示「頁面 2 / 2」", async () => {
    const articleStore = useArticleStore()
    articleStore.articles.push(...make51Articles())

    const wrapper = shallowMount(ArticleManagement)
    await wrapper.vm.$nextTick()

    // 點擊「下一頁」按鈕（disabled="currentPage === totalPages" → 第 1 頁時不 disabled）
    const buttons = wrapper.findAll(".pagination-bar .join-item.btn")
    const nextBtn = buttons[buttons.length - 1] // 最後一個按鈕是「»」
    await nextBtn.trigger("click")
    await wrapper.vm.$nextTick()

    expect(getPageText(wrapper)).toContain("頁面 2 / 2")
  })

  it("在第 2 頁執行 setCurrentArticle → currentPage 保持第 2 頁", async () => {
    const articleStore = useArticleStore()
    const articles = make51Articles()
    articleStore.articles.push(...articles)

    const wrapper = shallowMount(ArticleManagement)
    await wrapper.vm.$nextTick()

    // 前往第 2 頁
    const buttons = wrapper.findAll(".pagination-bar .join-item.btn")
    const nextBtn = buttons[buttons.length - 1]
    await nextBtn.trigger("click")
    await wrapper.vm.$nextTick()
    expect(getPageText(wrapper)).toContain("頁面 2 / 2")

    // 點擊文章（不改變 filter）
    articleStore.setCurrentArticle(articles[0])
    await wrapper.vm.$nextTick()

    expect(getPageText(wrapper)).toContain("頁面 2 / 2")
  })

  it("在第 2 頁執行 updateFilter → currentPage 重置為第 1 頁", async () => {
    const articleStore = useArticleStore()
    const articles = make51Articles()
    articleStore.articles.push(...articles)

    const wrapper = shallowMount(ArticleManagement)
    await wrapper.vm.$nextTick()

    // 前往第 2 頁（第 2 頁只有 1 篇文章：article 51）
    const buttons = wrapper.findAll(".pagination-bar .join-item.btn")
    const nextBtn = buttons[buttons.length - 1]
    await nextBtn.trigger("click")
    await wrapper.vm.$nextTick()
    expect(getPageText(wrapper)).toContain("頁面 2 / 2")

    // 變更篩選條件 → 只剩 1 篇，totalPages = 1，pagination bar 隱藏
    // currentPage 若沒有重置，slice(50, 100) 會回傳空陣列 → tbody 沒有 <tr>
    // currentPage 正確重置為 1 → slice(0, 50) 回傳 1 篇 → tbody 有 1 個 <tr>
    articleStore.updateFilter({ searchText: "文章 001" })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll("tbody tr")
    expect(rows.length).toBe(1)
  })
})
