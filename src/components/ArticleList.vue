<template>
  <div class="h-full flex flex-col">
    <!-- Search and Filter -->
    <div class="p-4 border-b border-base-300">
      <div class="form-control mb-3">
        <div class="input-group">
          <input
            v-model="searchText"
            type="text"
            placeholder="搜尋文章..."
            class="input input-bordered input-sm flex-1"
            @input="updateSearch"
          />
          <button class="btn btn-square btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="flex gap-2 mb-3">
        <select
          v-model="statusFilter"
          class="select select-bordered select-sm flex-1"
          @change="updateFilters"
        >
          <option value="all">全部狀態</option>
          <option value="draft">草稿</option>
          <option value="published">已發布</option>
        </select>

        <select
          v-model="categoryFilter"
          class="select select-bordered select-sm flex-1"
          @change="updateFilters"
        >
          <option value="all">全部分類</option>
          <option value="Software">Software</option>
          <option value="growth">Growth</option>
          <option value="management">Management</option>
        </select>
      </div>
    </div>

    <!-- Article List -->
    <div class="flex-1 overflow-y-auto p-2">
      <div
        v-for="article in articleStore.filteredArticles"
        :key="article.id"
        class="card bg-base-100 shadow-sm mb-2 cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
        :class="{
          'bg-primary/5 border-l-4 border-l-primary shadow-md': article.id === articleStore.currentArticle?.id,
          'border border-base-300': article.id !== articleStore.currentArticle?.id
        }"
        @click="selectArticle(article)"
      >
        <div class="card-body p-3">
          <div class="flex justify-between items-start gap-2 mb-2">
            <h3 
              class="card-title text-sm transition-all flex-1 min-w-0 line-clamp-2"
              :class="{ 'font-bold text-primary': article.id === articleStore.currentArticle?.id }"
              :title="article.title"
            >
              {{ article.title }}
            </h3>
            <div 
              class="badge badge-sm shrink-0"
              :class="article.status === 'published' ? 'badge-success' : 'badge-info'"
            >
              {{ article.status === 'published' ? '已發布' : '草稿' }}
            </div>
          </div>
          
          <!-- 系列資訊 -->
          <div 
            v-if="article.frontmatter.series" 
            class="text-xs text-primary mb-2 flex items-center gap-1 truncate"
            :title="`系列: ${article.frontmatter.series}${article.frontmatter.seriesOrder ? ` #${article.frontmatter.seriesOrder}` : ''}`"
          >
            <span>📚</span>
            <span class="truncate">{{ article.frontmatter.series }}</span>
            <span v-if="article.frontmatter.seriesOrder" class="shrink-0">#{{ article.frontmatter.seriesOrder }}</span>
          </div>
          
          <div class="flex justify-between text-xs text-base-content/70 mb-2">
            <span class="badge badge-outline badge-xs shrink-0">{{ article.category }}</span>
            <span class="shrink-0">{{ formatDate(article.lastModified) }}</span>
          </div>

          <div class="flex flex-wrap gap-1" v-if="article.frontmatter.tags && article.frontmatter.tags.length > 0">
            <div
              v-for="tag in article.frontmatter.tags.slice(0, 3)"
              :key="tag"
              class="badge badge-ghost badge-xs truncate max-w-[80px]"
              :title="tag"
            >
              {{ tag }}
            </div>
            <span v-if="article.frontmatter.tags.length > 3" class="text-xs text-base-content/50 shrink-0">
              +{{ article.frontmatter.tags.length - 3 }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="articleStore.filteredArticles.length === 0"
        class="flex flex-col items-center justify-center h-32 text-base-content/50"
      >
        <div class="text-4xl mb-2">📄</div>
        <p>沒有找到文章</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useArticleStore } from '@/stores/article'
import type { Article } from '@/types'

const articleStore = useArticleStore()

// Reactive data
const searchText = ref('')
const statusFilter = ref('all')
const categoryFilter = ref('all')

// Methods
function updateSearch() {
  articleStore.updateFilter({ searchText: searchText.value })
}

function updateFilters() {
  articleStore.updateFilter({
    status: statusFilter.value as any,
    category: categoryFilter.value as any
  })
}

function selectArticle(article: Article) {
  articleStore.setCurrentArticle(article)
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '無效日期'
  }
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

onMounted(() => {
  // Initialize filters from store
  searchText.value = articleStore.filter.searchText
  statusFilter.value = articleStore.filter.status
  categoryFilter.value = articleStore.filter.category
})
</script>

<style scoped>
/* Custom styles if needed */
</style>