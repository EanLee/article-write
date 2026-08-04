/**
 * MainEditor 組件測試
 *
 * 涵蓋 IA Phase 3 子專案 1（Task 6）code review 發現的資料遺失回歸：
 * watch(() => articleStore.currentArticle, ...) 原本只要參考換了就重置 content.value，
 * 但 PropertiesTab.vue／AIPanelContent.vue 對 frontmatter 中繼資料的更新
 * （透過 articleStore.updateArticleInMemory()）也會換新整個物件參考、觸發同一個 watcher——
 * 而這些呼叫 clone 的基底是 store 目前的 currentArticle，其 content 欄位可能落後於使用者
 * 正在編輯器裡打字中、尚未存檔的即時緩衝區。一旦 InspectorView 掛進 App.vue、PropertiesTab
 * 第一次真正跟 MainEditor 同時活著，使用者打字中若讓任何屬性欄位觸發一次 commit，就會被
 * watcher 用落後的內容悄悄蓋掉尚未儲存的按鍵輸入（與 topic-020 同一類問題）。
 *
 * 涵蓋：
 *   (a) 【資料遺失防護】只更新 frontmatter（content 不變）的 updateArticleInMemory() 呼叫，
 *       不應該把使用者尚未儲存的編輯器內容蓋掉
 *   (b) 真正切換到不同文章（id 改變）時，仍應正常載入新文章的內容
 *   (c) 同一篇文章但 content 欄位本身真的變了（例如 FileWatch 偵測到外部檔案異動、或衝突
 *       解決時選擇保留磁碟版本，兩者都刻意保留原有 id），編輯器內容仍應同步更新——
 *       確認修法沒有把這個既有合法路徑也一併鎖死
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { useArticleStore } from "@/stores/article";
import MainEditor from "@/components/MainEditor.vue";
import type { Article } from "@/types";
import { ArticleStatus } from "@/types";

// ---------- 全域 mock（比照 PropertiesTab.test.ts／InspectorView.test.ts 慣例） ----------

Object.defineProperty(window, "electronAPI", {
  value: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDirectory: vi.fn().mockResolvedValue([]),
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
  configurable: true,
});

// ---------- CodeMirrorEditor 替身：只保留測試需要的 v-model 行為，避免真的初始化 CodeMirror 6 ----------

const CodeMirrorEditorStub = {
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template:
    '<textarea data-testid="cm-stub" :value="modelValue" @input="$emit(\'update:modelValue\', ($event.target).value)"></textarea>',
  // MainEditor 掛載時會透過 editorPaneRef watch(immediate) 呼叫這兩個方法（見 MainEditor.vue
  // 的 setImagePasteHandler／setSuggestionsProvider 注入邏輯），替身需提供空實作避免噴錯
  methods: {
    setImagePasteHandler: () => {},
    setSuggestionsProvider: () => {},
    scrollToLine: () => {},
  },
};

const mountOptions = {
  global: {
    stubs: {
      EditorHeader: true,
      SearchReplace: true,
      PreviewPane: true,
      CodeMirrorEditor: CodeMirrorEditorStub,
    },
  },
};

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
      tags: ["tag1"],
    },
    content: "# 原始內容",
    lastModified: new Date("2026-01-01"),
    category: "Software",
    ...overrides,
  };
}

describe("MainEditor", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("(a) 只更新 frontmatter 的 updateArticleInMemory() 呼叫不應蓋掉使用者尚未儲存的編輯器內容", async () => {
    const articleStore = useArticleStore();
    const original = makeArticle();
    articleStore.currentArticle = original;

    const wrapper = mount(MainEditor, mountOptions);
    const cmStub = wrapper.find('[data-testid="cm-stub"]');
    expect((cmStub.element as HTMLTextAreaElement).value).toBe("# 原始內容");

    // 使用者在編輯器裡打字，但還沒觸發自動儲存（content 只存在即時緩衝區）
    await cmStub.setValue("# 原始內容\n\n使用者尚未儲存的新段落");

    // 模擬 PropertiesTab.commit()：以 store 目前的 currentArticle 為基礎 clone，
    // 只改 frontmatter，不動 content —— 這正是會觸發舊版 watcher 誤判的呼叫形態。
    const propertiesUpdate: Article = JSON.parse(JSON.stringify(original));
    propertiesUpdate.frontmatter.title = "使用者改的新標題";
    articleStore.updateArticleInMemory(propertiesUpdate);
    await wrapper.vm.$nextTick();

    // 編輯器裡使用者剛打的字不應該被回退成 store 裡（落後的）舊內容
    expect((cmStub.element as HTMLTextAreaElement).value).toBe("# 原始內容\n\n使用者尚未儲存的新段落");
  });

  it("(b) 切換到不同文章（id 改變）時，應正常載入新文章的內容", async () => {
    const articleStore = useArticleStore();
    articleStore.currentArticle = makeArticle();

    const wrapper = mount(MainEditor, mountOptions);
    const cmStub = wrapper.find('[data-testid="cm-stub"]');
    expect((cmStub.element as HTMLTextAreaElement).value).toBe("# 原始內容");

    articleStore.currentArticle = makeArticle({
      id: "article-2",
      content: "# 另一篇文章的內容",
    });
    await wrapper.vm.$nextTick();

    expect((cmStub.element as HTMLTextAreaElement).value).toBe("# 另一篇文章的內容");
  });

  it("(c) 同一篇文章但 content 本身真的變了（外部檔案異動／保留磁碟版本），編輯器內容仍應同步更新", async () => {
    const articleStore = useArticleStore();
    const original = makeArticle();
    articleStore.currentArticle = original;

    const wrapper = mount(MainEditor, mountOptions);
    const cmStub = wrapper.find('[data-testid="cm-stub"]');
    expect((cmStub.element as HTMLTextAreaElement).value).toBe("# 原始內容");

    // 比照 articleStore.reloadArticleFromDisk() / reloadArticle()：刻意保留原有 id，
    // 但 content 是真的從磁碟重新讀回來的新內容
    articleStore.currentArticle = { ...original, content: "# 外部修改後的內容" };
    await wrapper.vm.$nextTick();

    expect((cmStub.element as HTMLTextAreaElement).value).toBe("# 外部修改後的內容");
  });
});
