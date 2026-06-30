<script setup lang="ts">
import { watch, nextTick, ref } from "vue"
import { Search } from "@lucide/vue"
import { useSearchStore } from "@/stores/search"
import { useArticleStore } from "@/stores/article"
import { highlightKeyword } from "@/utils/dom"
import type { SearchResult } from "@/types"

const searchStore = useSearchStore()
const articleStore = useArticleStore()

const inputRef = ref<HTMLInputElement | null>(null)

// 開啟時自動 focus
watch(() => searchStore.isOpen, async (open) => {
  if (open) {
    await nextTick()
    inputRef.value?.focus()
  }
})

/** debounce timer，避免每次按鍵都觸發搜尋 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 處理搜尋輸入，debounce 200ms 後執行搜尋
 * @param e 輸入事件
 */
function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  searchStore.query = val
  if (debounceTimer) { clearTimeout(debounceTimer) }
  debounceTimer = setTimeout(() => searchStore.search(val), 200)
}

/**
 * 處理鍵盤導航：↑↓ 選擇結果、Enter 開啟、Esc 關閉
 * @param e 鍵盤事件
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault()
    searchStore.selectNext()
  } else if (e.key === "ArrowUp") {
    e.preventDefault()
    searchStore.selectPrev()
  } else if (e.key === "Enter") {
    openSelected()
  } else if (e.key === "Escape") {
    searchStore.close()
  }
}

/**
 * 開啟目前選中的搜尋結果
 */
function openSelected() {
  const result = searchStore.results[searchStore.selectedIndex]
  if (result) { openResult(result) }
}

/**
 * 開啟指定搜尋結果對應的文章，並請求編輯器捲動至關鍵字位置
 * @param result 搜尋結果
 */
function openResult(result: SearchResult) {
  const article = articleStore.articles.find((a) => a.filePath === result.filePath)
  if (article) {
    articleStore.setCurrentArticle(article)
  }
  searchStore.requestScrollToQuery(searchStore.query)
  searchStore.close()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="searchStore.isOpen" class="fixed inset-0 z-50 flex items-start justify-center pt-20"
      @click.self="searchStore.close()">
      <div class="bg-base-100 border border-base-300 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        <!-- 搜尋輸入 -->
        <div class="flex items-center px-4 py-3 border-b border-base-300">
          <Search :size="20" class="text-base-content/50 mr-3 shrink-0" />
          <input ref="inputRef" type="text" :value="searchStore.query" placeholder="搜尋文章內容..."
            class="flex-1 bg-transparent outline-none text-base-content text-base" @input="onInput"
            @keydown="onKeydown" />
          <kbd class="kbd kbd-sm ml-2">Esc</kbd>
        </div>

        <!-- 搜尋結果 -->
        <div class="max-h-96 overflow-y-auto">
          <!-- Loading -->
          <div v-if="searchStore.isLoading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md" />
          </div>

          <!-- 無結果 -->
          <div v-else-if="searchStore.query && !searchStore.results.length"
            class="text-center py-8 text-base-content/50">
            找不到「{{ searchStore.query }}」的相關文章
          </div>

          <!-- 結果列表 -->
          <ul v-else>
            <li v-for="(result, index) in searchStore.results" :key="result.id" :class="[
              'px-4 py-3 cursor-pointer border-b border-base-200 last:border-0',
              index === searchStore.selectedIndex ? 'bg-primary/10' : 'hover:bg-base-200'
            ]" @click="openResult(result)" @mouseenter="searchStore.selectedIndex = index">
              <!-- 標題 + 日期 -->
              <div class="flex items-center justify-between mb-1">
                <span
                  :class="['font-medium', index === searchStore.selectedIndex ? 'text-base-content' : 'text-base-content/50']"
                  v-html="highlightKeyword(result.title, searchStore.query)" />
                <span class="text-xs text-base-content/40 ml-2 shrink-0">
                  {{ new Date(result.updatedAt).toLocaleDateString('zh-TW') }}
                </span>
              </div>
              <!-- Snippet -->
              <p :class="['text-sm line-clamp-2', index === searchStore.selectedIndex ? 'text-base-content/60' : 'text-base-content/35']"
                v-html="highlightKeyword(result.matchSnippet, searchStore.query)" />
            </li>
          </ul>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-4 py-2 border-t border-base-300 text-xs text-base-content/40">
          <span v-if="searchStore.results.length">{{ searchStore.results.length }} 篇文章</span>
          <span v-else />
          <div class="flex gap-3">
            <span><kbd class="kbd kbd-xs">↑↓</kbd> 選擇</span>
            <span><kbd class="kbd kbd-xs">Enter</kbd> 開啟</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
