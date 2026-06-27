import { defineStore } from "pinia"
import { ref } from "vue"
import type { SearchQuery, SearchResult } from "@/types"

export const useSearchStore = defineStore("search", () => {
  const isOpen = ref(false)
  const query = ref("")
  const results = ref<SearchResult[]>([])
  const selectedIndex = ref(0)
  const isLoading = ref(false)
  /** 待捲動的搜尋關鍵字；編輯器載入文章後讀取並捲動至第一個匹配位置，完成後清為 null */
  const pendingScrollQuery = ref<string | null>(null)

  /**
   * 設定待捲動的搜尋關鍵字，供編輯器在文章載入後捲動至第一個匹配位置
   * @param q 搜尋關鍵字，傳 null 表示清除
   */
  function requestScrollToQuery(q: string | null) {
    pendingScrollQuery.value = q
  }

  /**
   * 執行全文搜尋，空字串時清空結果不呼叫 API
   * @param q 搜尋字串
   */
  async function search(q: string) {
    if (!q.trim()) {
      results.value = []
      selectedIndex.value = 0
      return
    }
    isLoading.value = true
    try {
      const searchQuery: SearchQuery = { query: q }
      results.value = await window.electronAPI.searchQuery(searchQuery)
      selectedIndex.value = 0
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 開啟全域搜尋面板，並重置所有搜尋狀態
   */
  function open() {
    isOpen.value = true
    query.value = ""
    results.value = []
    selectedIndex.value = 0
    pendingScrollQuery.value = null
  }

  /**
   * 關閉全域搜尋面板
   */
  function close() {
    isOpen.value = false
  }

  /**
   * 遞增 selectedIndex，最大值為 results.length - 1
   */
  function selectNext() {
    if (selectedIndex.value < results.value.length - 1) {
      selectedIndex.value++
    }
  }

  /**
   * 遞減 selectedIndex，最小值為 0
   */
  function selectPrev() {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  }

  return {
    isOpen,
    query,
    results,
    selectedIndex,
    isLoading,
    pendingScrollQuery,
    search,
    open,
    close,
    selectNext,
    selectPrev,
    requestScrollToQuery,
  }
})
