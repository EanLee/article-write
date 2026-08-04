/**
 * PropertiesTab 組件測試
 *
 * PropertiesTab.vue 改寫自 FrontmatterEditor.vue 的表單欄位邏輯（標題/slug/日期/分類/標籤/關鍵字），
 * 但拿掉 Modal 外殼與「儲存」按鈕：欄位 blur／change 時即直接呼叫 articleStore.updateArticleInMemory()
 * 寫回記憶體（比照 MainEditor.vue 既有的 handleFrontmatterUpdate 寫回路徑）。
 *
 * 涵蓋：
 *   (a) 傳入文章後表單欄位顯示對應值
 *   (b) 修改標題欄位（blur）觸發 articleStore 更新
 *   (c) 新增／移除標籤
 *   (d) 無文章時顯示空狀態
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { useArticleStore } from "@/stores/article";
import PropertiesTab from "@/components/PropertiesTab.vue";
import type { Article } from "@/types";
import { ArticleStatus } from "@/types";

// ---------- 全域 mock（比照 ArticleManagement.list.test.ts 慣例） ----------

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
});

// ---------- 工廠函式 ----------

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "article-1",
    title: "原始標題",
    slug: "original-slug",
    filePath: "/vault/Drafts/Software/original.md",
    status: ArticleStatus.Draft,
    frontmatter: {
      title: "原始標題",
      date: "2026-01-01",
      tags: ["tag1", "tag2"],
      keywords: ["kw1"],
      categories: ["Software"],
      slug: "original-slug",
    },
    content: "# 內容",
    lastModified: new Date("2026-01-01"),
    category: "Software",
    ...overrides,
  };
}

describe("PropertiesTab", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("(a) 傳入文章後，表單欄位應顯示對應的 frontmatter 值", () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle();

    const wrapper = mount(PropertiesTab);

    expect((wrapper.find("#properties-title-input").element as HTMLInputElement).value).toBe("原始標題");
    expect((wrapper.find("#properties-slug-input").element as HTMLInputElement).value).toBe("original-slug");
    expect((wrapper.find("#properties-date-input").element as HTMLInputElement).value).toBe("2026-01-01");
    expect((wrapper.find("#properties-category-input").element as HTMLSelectElement).value).toBe("Software");
    expect(wrapper.text()).toContain("tag1");
    expect(wrapper.text()).toContain("tag2");
    expect(wrapper.text()).toContain("kw1");
  });

  it("(b) 修改標題欄位並 blur 後，應呼叫 articleStore 寫回更新後的標題（同步更新 title 與 frontmatter.title）", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle();
    const updateSpy = vi.spyOn(articleStore, "updateArticleInMemory");

    const wrapper = mount(PropertiesTab);
    const titleInput = wrapper.find("#properties-title-input");
    await titleInput.setValue("新標題");
    await titleInput.trigger("blur");

    expect(updateSpy).toHaveBeenCalled();
    expect(articleStore.currentArticle?.frontmatter.title).toBe("新標題");
    expect(articleStore.currentArticle?.title).toBe("新標題");
  });

  it("(c) 新增標籤後應加入 frontmatter.tags，點擊移除按鈕後應從 frontmatter.tags 移除", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle();

    const wrapper = mount(PropertiesTab);

    const tagInput = wrapper.find("#properties-tags-input");
    await tagInput.setValue("new-tag");
    await tagInput.trigger("keyup.enter");

    expect(articleStore.currentArticle?.frontmatter.tags).toContain("new-tag");
    expect(wrapper.text()).toContain("new-tag");

    const tagBadges = wrapper.findAll(".badge-primary");
    const tag1Badge = tagBadges.find((badge) => badge.text().includes("tag1"));
    expect(tag1Badge).toBeTruthy();
    await tag1Badge!.find("button").trigger("click");

    expect(articleStore.currentArticle?.frontmatter.tags).not.toContain("tag1");
    expect(wrapper.text()).not.toContain("tag1");
  });

  it("(d) 無文章時應顯示空狀態，不顯示表單欄位", () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = null;

    const wrapper = mount(PropertiesTab);

    expect(wrapper.find(".empty-state").exists()).toBe(true);
    expect(wrapper.find("#properties-title-input").exists()).toBe(false);
  });
});
