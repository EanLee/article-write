import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchQuery, SearchResult } from '@/types'

export const useSearchStore = defineStore('search', () => {
  const isOpen = ref(false)
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const selectedIndex = ref(0)
  const isLoading = ref(false)

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

  function open() {
    isOpen.value = true
    query.value = ''
    results.value = []
    selectedIndex.value = 0
  }

  function close() {
    isOpen.value = false
  }

  function selectNext() {
    if (selectedIndex.value < results.value.length - 1) {
      selectedIndex.value++
    }
  }

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
    search,
    open,
    close,
    selectNext,
    selectPrev
  }
})
