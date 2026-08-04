/**
 * PropertiesTab 組件測試
 *
 * PropertiesTab.vue 改寫自 FrontmatterEditor.vue 的表單欄位邏輯
 * （標題/slug/描述/日期/分類/系列/系列順序/標籤/關鍵字），
 * 但拿掉 Modal 外殼與「儲存」按鈕：欄位 blur／change 時即直接呼叫 articleStore.updateArticleInMemory()
 * 寫回記憶體（比照 MainEditor.vue 既有的 handleFrontmatterUpdate 寫回路徑）。
 *
 * 涵蓋：
 *   (a) 傳入文章後表單欄位顯示對應值
 *   (b) 修改標題欄位（blur）觸發 articleStore 更新
 *   (c) 新增／移除標籤
 *   (d) 無文章時顯示空狀態
 *   (e) 修改網址代稱（slug）欄位應同步寫入 frontmatter.slug（不只是頂層 slug，否則不會被存進檔案，
 *       因為 ArticleService.performSave 是用 article.frontmatter 序列化 YAML，見 combineContent 呼叫）
 *   (f) 描述／系列名稱／系列順序（FrontmatterEditor.vue 原有但先前遺漏的 3 個欄位）blur 後寫回
 *   (g) 【資料遺失防護】在標題欄位輸入尚未 blur 時，若其他欄位觸發 commit（例如新增標籤），
 *       不應該讓 watch(currentArticle) 把使用者尚未送出的草稿蓋回舊值
 *   (h) 【悄悄改網址防護】文章已經有 frontmatter.slug 時，修改標題不應該自動覆蓋 slugDraft／
 *       frontmatter.slug——否則使用者之後讓 slug 欄位失焦一次，就會把自動產生的新值寫回
 *       frontmatter.slug，等同於悄悄改掉文章已發布的網址
 *   (i) 文章原本沒有 frontmatter.slug 時，修改標題仍應自動產生並寫回 slug（確認沒有把自動產生
 *       功能整個關掉）
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
      description: "原始描述",
      date: "2026-01-01",
      tags: ["tag1", "tag2"],
      keywords: ["kw1"],
      categories: ["Software"],
      slug: "original-slug",
      series: "原始系列",
      seriesOrder: 1,
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
    expect((wrapper.find("#properties-description-input").element as HTMLTextAreaElement).value).toBe("原始描述");
    expect((wrapper.find("#properties-series-input").element as HTMLInputElement).value).toBe("原始系列");
    expect((wrapper.find("#properties-series-order-input").element as HTMLInputElement).value).toBe("1");
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

  it("(e) 修改網址代稱欄位並 blur 後，應同步寫入 frontmatter.slug（存檔序列化用的是 frontmatter，不是頂層 slug）", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle();

    const wrapper = mount(PropertiesTab);
    const slugInput = wrapper.find("#properties-slug-input");
    await slugInput.setValue("manually-edited-slug");
    await slugInput.trigger("blur");

    expect(articleStore.currentArticle?.slug).toBe("manually-edited-slug");
    expect(articleStore.currentArticle?.frontmatter.slug).toBe("manually-edited-slug");
  });

  it("(f) 修改描述／系列名稱／系列順序欄位並 blur 後，應寫回對應的 frontmatter 欄位", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle();

    const wrapper = mount(PropertiesTab);

    const descriptionInput = wrapper.find("#properties-description-input");
    await descriptionInput.setValue("新描述");
    await descriptionInput.trigger("blur");
    expect(articleStore.currentArticle?.frontmatter.description).toBe("新描述");

    const seriesInput = wrapper.find("#properties-series-input");
    await seriesInput.setValue("新系列");
    await seriesInput.trigger("blur");
    expect(articleStore.currentArticle?.frontmatter.series).toBe("新系列");

    const seriesOrderInput = wrapper.find("#properties-series-order-input");
    await seriesOrderInput.setValue("3");
    await seriesOrderInput.trigger("blur");
    expect(articleStore.currentArticle?.frontmatter.seriesOrder).toBe(3);
  });

  it("(g) 標題欄位輸入尚未 blur 時，其他欄位觸發 commit 不應覆蓋標題草稿（防止資料遺失）", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle();

    const wrapper = mount(PropertiesTab);
    const titleInput = wrapper.find("#properties-title-input");

    // 使用者正在輸入標題，但尚未 blur（草稿只存在本地，還沒送回 store）
    await titleInput.setValue("使用者正在輸入的新標題");

    // 這時候另一個欄位觸發了一次獨立的 commit（例如新增標籤），
    // 這會讓 articleStore.currentArticle 指向一個新物件，觸發 watch(currentArticle, ...)
    const tagInput = wrapper.find("#properties-tags-input");
    await tagInput.setValue("race-tag");
    await tagInput.trigger("keyup.enter");

    // 標題草稿不應該被 watch 回填成 store 裡的舊標題
    expect((titleInput.element as HTMLInputElement).value).toBe("使用者正在輸入的新標題");

    // 最終 blur 時，應該把使用者剛剛輸入的標題寫回，而不是被回退的舊值
    await titleInput.trigger("blur");
    expect(articleStore.currentArticle?.frontmatter.title).toBe("使用者正在輸入的新標題");
  });

  it("(h) 文章已有 frontmatter.slug 時，修改標題並 blur 不應自動覆蓋既有 slug", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle({
      slug: "existing-slug",
      frontmatter: {
        title: "原始標題",
        slug: "existing-slug",
      },
    });

    const wrapper = mount(PropertiesTab);
    const titleInput = wrapper.find("#properties-title-input");
    await titleInput.setValue("全新的標題文字");
    await titleInput.trigger("blur");

    // 畫面上的網址代稱欄位不應該被悄悄換成標題自動產生的新值
    expect((wrapper.find("#properties-slug-input").element as HTMLInputElement).value).toBe("existing-slug");
    expect(articleStore.currentArticle?.slug).toBe("existing-slug");
    expect(articleStore.currentArticle?.frontmatter.slug).toBe("existing-slug");

    // 即使使用者之後讓 slug 欄位失焦一次（例如 Tab 過去，沒有實際修改內容），
    // 也不應該把任何自動產生的值寫回 frontmatter.slug —— 這是這個問題實際會造成
    // 「悄悄改掉已發布網址」的完整鏈路，光看第一次 blur 之後的狀態還不夠。
    await wrapper.find("#properties-slug-input").trigger("blur");
    expect(articleStore.currentArticle?.frontmatter.slug).toBe("existing-slug");
  });

  it("(i) 文章原本沒有 frontmatter.slug 時，修改標題並 blur 仍應自動產生並寫回 slug", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle({
      slug: "",
      frontmatter: {
        title: "原始標題",
      },
    });

    const wrapper = mount(PropertiesTab);
    const titleInput = wrapper.find("#properties-title-input");
    await titleInput.setValue("Hello World");
    await titleInput.trigger("blur");

    expect(articleStore.currentArticle?.slug).toBe("hello-world");
    expect(articleStore.currentArticle?.frontmatter.slug).toBe("hello-world");
    expect((wrapper.find("#properties-slug-input").element as HTMLInputElement).value).toBe("hello-world");
  });
});
