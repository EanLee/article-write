import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSearchStore } from "@/stores/search";
import type { SearchResult } from "@/types";
import { ArticleStatus } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSearchQuery = vi.fn();

Object.defineProperty(window, "electronAPI", {
  value: { searchQuery: mockSearchQuery },
  writable: true,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: "result-001",
    filePath: "/vault/tech/sample.md",
    title: "範例文章",
    matchSnippet: "這是比對到的段落，包含前後文約 100 字元。",
    updatedAt: "2024-01-15T10:00:00Z",
    category: "tech",
    status: ArticleStatus.Published,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Search Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ── 初始狀態 ──────────────────────────────────────────────────────────────

  describe("初始狀態", () => {
    it("應有正確的預設值", () => {
      const store = useSearchStore();
      expect(store.isOpen).toBe(false);
      expect(store.query).toBe("");
      expect(store.results).toEqual([]);
      expect(store.selectedIndex).toBe(0);
      expect(store.isLoading).toBe(false);
    });
  });

  // ── open() ────────────────────────────────────────────────────────────────

  describe("open()", () => {
    it("應設定 isOpen 為 true", () => {
      const store = useSearchStore();
      store.open();
      expect(store.isOpen).toBe(true);
    });

    it("應重置 query 為空字串", () => {
      const store = useSearchStore();
      store.query = "之前的查詢";
      store.open();
      expect(store.query).toBe("");
    });

    it("應重置 results 為空陣列", () => {
      const store = useSearchStore();
      store.results = [makeSearchResult()];
      store.open();
      expect(store.results).toEqual([]);
    });

    it("應重置 selectedIndex 為 0", () => {
      const store = useSearchStore();
      store.selectedIndex = 3;
      store.open();
      expect(store.selectedIndex).toBe(0);
    });
  });

  // ── close() ───────────────────────────────────────────────────────────────

  describe("close()", () => {
    it("應設定 isOpen 為 false", () => {
      const store = useSearchStore();
      store.open();
      store.close();
      expect(store.isOpen).toBe(false);
    });

    it("不應清除 query 或 results", () => {
      const store = useSearchStore();
      store.query = "測試查詢";
      store.results = [makeSearchResult()];
      store.close();
      expect(store.query).toBe("測試查詢");
      expect(store.results).toHaveLength(1);
    });
  });

  // ── search() ──────────────────────────────────────────────────────────────

  describe("search()", () => {
    it("空查詢應清空 results 並重置 selectedIndex，不呼叫 API", async () => {
      const store = useSearchStore();
      store.results = [makeSearchResult()];
      store.selectedIndex = 2;

      await store.search("");
      expect(store.results).toEqual([]);
      expect(store.selectedIndex).toBe(0);
      expect(mockSearchQuery).not.toHaveBeenCalled();
    });

    it("純空白查詢應視同空查詢", async () => {
      const store = useSearchStore();
      await store.search("   ");
      expect(mockSearchQuery).not.toHaveBeenCalled();
      expect(store.results).toEqual([]);
    });

    it("應呼叫 electronAPI.searchQuery 並存入結果", async () => {
      const results = [makeSearchResult(), makeSearchResult({ id: "result-002", title: "第二篇文章" })];
      mockSearchQuery.mockResolvedValueOnce(results);
      const store = useSearchStore();

      await store.search("Vue");
      expect(mockSearchQuery).toHaveBeenCalledOnce();
      expect(mockSearchQuery).toHaveBeenCalledWith({ query: "Vue" });
      expect(store.results).toEqual(results);
    });

    it("成功後應重置 selectedIndex 為 0", async () => {
      mockSearchQuery.mockResolvedValueOnce([makeSearchResult(), makeSearchResult({ id: "r2" })]);
      const store = useSearchStore();
      store.selectedIndex = 2;

      await store.search("Vue");
      expect(store.selectedIndex).toBe(0);
    });

    it("呼叫期間 isLoading 應為 true，完成後恢復 false", async () => {
      let resolveSearch: (v: SearchResult[]) => void;
      const searchPromise = new Promise<SearchResult[]>((r) => { resolveSearch = r; });
      mockSearchQuery.mockReturnValueOnce(searchPromise);
      const store = useSearchStore();

      const searchCall = store.search("async test");
      expect(store.isLoading).toBe(true);

      resolveSearch!([]);
      await searchCall;
      expect(store.isLoading).toBe(false);
    });

    it("API 拋出錯誤後 isLoading 仍應恢復 false", async () => {
      mockSearchQuery.mockRejectedValueOnce(new Error("搜尋失敗"));
      const store = useSearchStore();

      await expect(store.search("失敗查詢")).rejects.toThrow("搜尋失敗");
      expect(store.isLoading).toBe(false);
    });
  });

  // ── selectNext() ──────────────────────────────────────────────────────────

  describe("selectNext()", () => {
    it("應遞增 selectedIndex", () => {
      const store = useSearchStore();
      store.results = [makeSearchResult(), makeSearchResult({ id: "r2" }), makeSearchResult({ id: "r3" })];
      store.selectedIndex = 0;

      store.selectNext();
      expect(store.selectedIndex).toBe(1);
    });

    it("已在最後一筆時不應超過 results.length - 1", () => {
      const store = useSearchStore();
      store.results = [makeSearchResult(), makeSearchResult({ id: "r2" })];
      store.selectedIndex = 1;

      store.selectNext();
      expect(store.selectedIndex).toBe(1);
    });

    it("results 為空時不應遞增", () => {
      const store = useSearchStore();
      store.results = [];
      store.selectedIndex = 0;

      store.selectNext();
      expect(store.selectedIndex).toBe(0);
    });
  });

  // ── selectPrev() ──────────────────────────────────────────────────────────

  describe("selectPrev()", () => {
    it("應遞減 selectedIndex", () => {
      const store = useSearchStore();
      store.results = [makeSearchResult(), makeSearchResult({ id: "r2" })];
      store.selectedIndex = 1;

      store.selectPrev();
      expect(store.selectedIndex).toBe(0);
    });

    it("已在第一筆時不應低於 0", () => {
      const store = useSearchStore();
      store.results = [makeSearchResult()];
      store.selectedIndex = 0;

      store.selectPrev();
      expect(store.selectedIndex).toBe(0);
    });
  });

  // ── requestScrollToQuery() ────────────────────────────────────────────────

  describe("requestScrollToQuery()", () => {
    // 案例：store 初始化後 pendingScrollQuery 應為 null
    // 情境：確保初始狀態不會意外觸發編輯器捲動
    it("初始狀態 pendingScrollQuery 應為 null", () => {
      const store = useSearchStore();
      expect(store.pendingScrollQuery).toBeNull();
    });

    // 案例：傳入關鍵字時 pendingScrollQuery 應被設定
    // 情境：SearchPanel openResult() 呼叫後，MainEditor 的 watcher 應能讀到待捲動查詢
    it("requestScrollToQuery 應設定 pendingScrollQuery", () => {
      const store = useSearchStore();
      store.requestScrollToQuery("Vue 3");
      expect(store.pendingScrollQuery).toBe("Vue 3");
    });

    // 案例：傳入 null 時應清除 pendingScrollQuery
    // 情境：編輯器捲動完成後呼叫 requestScrollToQuery(null) 清除狀態，避免重複捲動
    it("傳入 null 應清除 pendingScrollQuery", () => {
      const store = useSearchStore();
      store.requestScrollToQuery("Vue 3");
      store.requestScrollToQuery(null);
      expect(store.pendingScrollQuery).toBeNull();
    });

    // 案例：close() 後 pendingScrollQuery 不被清除
    // 情境：SearchPanel 先呼叫 requestScrollToQuery 再呼叫 close()；
    //       若 close() 清除查詢，MainEditor watcher 將永遠收不到捲動請求
    it("close() 不應清除 pendingScrollQuery", () => {
      const store = useSearchStore();
      store.requestScrollToQuery("測試關鍵字");
      store.close();
      expect(store.pendingScrollQuery).toBe("測試關鍵字");
    });

    // 案例：open() 應重置 pendingScrollQuery
    // 情境：開啟新一輪搜尋時，上次遺留的 pendingScrollQuery 應被清除，避免舊查詢污染
    it("open() 應重置 pendingScrollQuery 為 null", () => {
      const store = useSearchStore();
      store.requestScrollToQuery("舊查詢");
      store.open();
      expect(store.pendingScrollQuery).toBeNull();
    });
  });
});
