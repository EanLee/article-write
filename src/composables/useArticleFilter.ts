/**
 * useArticleFilter — 文章過濾與排序 Composable
 *
 * SOLID6-01: 從 article.ts 上帝 Store 中提取「過濾/排序」關注點。
 *
 * 職責：
 * - 管理 ArticleFilter 狀態（status、category、tags、searchText）
 * - 依照過濾條件計算 filteredArticles（單次遍歷，O(n)）
 * - 防抖搜尋文字（300ms）避免每字鍵擊觸發全量重算
 * - 提供衍生 computed：draftArticles、publishedArticles、allTags
 * - 使用預建 Intl.Collator 實例進行中文排序（避免重複建立）
 *
 * 此 composable 純粹依賴 Vue 響應式系統，不依賴其他 Store 或 Electron API，
 * 可獨立測試。
 */

import { ref, computed, watch, type Ref } from "vue";
import type { Article, ArticleFilter } from "@/types";
import { ArticleStatus, ArticleFilterStatus, ArticleFilterCategory } from "@/types";

// 模組層級 Collator 單例（zh-TW 排序成本高，避免每次 computed 重建）
const zhCollator = new Intl.Collator("zh-TW", { sensitivity: "base" });

/** 文章過濾器預設值 */
export const DEFAULT_ARTICLE_FILTER: ArticleFilter = {
  status: ArticleFilterStatus.All,
  category: ArticleFilterCategory.All,
  tags: [],
  searchText: "",
};

/**
 * 文章過濾與排序 Composable
 * @param articles - 原始文章清單（來自父 Store）
 */
export function useArticleFilter(articles: Ref<Article[]>) {
  // ── 過濾狀態 ────────────────────────────────────────────────────────────
  const filter = ref<ArticleFilter>({ ...DEFAULT_ARTICLE_FILTER });

  // P6-01: 防抖搜尋文字，停止輸入 300ms 後才更新，避免每字鍵擊觸發全量重算
  const debouncedSearchText = ref("");
  let _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // 監聴 searchText 變化，防抖 300ms 後才更新 debouncedSearchText
  // 使用 watch 而非在 updateFilter 裡處理，可捕捉所有修改路徑（包含 v-model 直接綁定）
  watch(
    () => filter.value.searchText,
    (newText) => {
      if (_searchDebounceTimer !== null) {
        clearTimeout(_searchDebounceTimer);
      }
      _searchDebounceTimer = setTimeout(() => {
        debouncedSearchText.value = (newText ?? "").toLowerCase();
        _searchDebounceTimer = null;
      }, 300);
    },
  );

  // ── 衍生 Computed ────────────────────────────────────────────────────────

  /**
   * 依照 filter 條件過濾並排序後的文章清單
   * 單次遍歷，O(n)，合併所有過濾條件
   */
  const filteredArticles = computed(() => {
    const statusFilter = filter.value.status;
    const categoryFilter = filter.value.category;
    const tagsFilter = filter.value.tags;
    // P6-01: 使用防抖後的搜尋文字
    const searchText = debouncedSearchText.value.toLowerCase();

    return articles.value
      .filter((article) => {
        // 狀態過濾 - 早期返回
        if (statusFilter !== ArticleFilterStatus.All && article.status !== (statusFilter as unknown as ArticleStatus)) {
          return false;
        }

        // 分類過濾 - 早期返回
        if (categoryFilter !== ArticleFilterCategory.All && article.category !== categoryFilter) {
          return false;
        }

        // 標籤過濾 - 早期返回
        if (tagsFilter.length > 0) {
          const hasMatchingTag =
            article.frontmatter.tags &&
            Array.isArray(article.frontmatter.tags) &&
            tagsFilter.some((tag) => article.frontmatter.tags!.includes(tag));
          if (!hasMatchingTag) {
            return false;
          }
        }

        // 搜尋文字過濾 - 早期返回優化
        if (searchText) {
          const titleMatch = article.title.toLowerCase().includes(searchText);
          if (titleMatch) {
            return true; // 早期返回，避免不必要的內容搜尋
          }
          const contentMatch = (article.content || "").toLowerCase().includes(searchText);
          if (!contentMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // P6-01: 使用預建 Collator 實例，避免每次排序建立新物件
        return zhCollator.compare(a.title, b.title);
      });
  });

  const draftArticles = computed(() => articles.value.filter((article) => article.status === ArticleStatus.Draft));

  const publishedArticles = computed(() => articles.value.filter((article) => article.status === ArticleStatus.Published));

  const allTags = computed(() => {
    // 使用 flatMap 優化：O(n×m) 但常數更小
    return [
      ...new Set(
        articles.value.flatMap((article) =>
          article.frontmatter.tags && Array.isArray(article.frontmatter.tags) ? article.frontmatter.tags : [],
        ),
      ),
    ].sort();
  });

  // ── Actions ─────────────────────────────────────────────────────────────

  /** 部分更新過濾條件 */
  function updateFilter(newFilter: Partial<ArticleFilter>) {
    filter.value = { ...filter.value, ...newFilter };
  }

  return {
    // State
    filter,
    // Computed
    filteredArticles,
    draftArticles,
    publishedArticles,
    allTags,
    // Actions
    updateFilter,
  };
}
