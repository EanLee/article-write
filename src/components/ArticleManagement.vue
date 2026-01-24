<template>
  <div class="project-management h-full flex flex-col bg-base-100">
    <!-- 頂部工具列 -->
    <div class="toolbar bg-base-200 border-b border-base-300 p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <List :size="28" />
          Article Management
        </h1>
        <button class="btn btn-primary gap-2" @click="handleCreateArticle">
          <FilePlus :size="18" />
          新增文章
        </button>
      </div>

      <!-- 統計資訊 -->
      <div class="stats stats-horizontal shadow w-full mb-4">
        <div class="stat">
          <div class="stat-figure text-primary">
            <FileText :size="32" />
          </div>
          <div class="stat-title">總文章數</div>
          <div class="stat-value text-primary">{{ filteredArticles.length }}</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-info">
            <FilePenLine :size="32" />
          </div>
          <div class="stat-title">草稿</div>
          <div class="stat-value text-info">{{ draftCount }}</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-success">
            <CheckCircle2 :size="32" />
          </div>
          <div class="stat-title">已發布</div>
          <div class="stat-value text-success">{{ publishedCount }}</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-secondary">
            <Folder :size="32" />
          </div>
          <div class="stat-title">分類</div>
          <div class="stat-value text-secondary">{{ categoryCount }}</div>
        </div>
      </div>

      <!-- 過濾器 -->
      <div class="filters flex flex-wrap gap-2">
        <select v-model="filters.status" class="select select-sm select-bordered">
          <option value="all">所有狀態</option>
          <option value="draft">草稿</option>
          <option value="published">已發布</option>
        </select>

        <select v-model="filters.category" class="select select-sm select-bordered">
          <option value="all">所有分類</option>
          <option value="Software">Software</option>
          <option value="growth">Growth</option>
          <option value="management">Management</option>
        </select>

        <div class="form-control">
          <div class="input-group input-group-sm">
            <input
              v-model="filters.searchText"
              type="text"
              placeholder="搜尋文章..."
              class="input input-sm input-bordered"
            />
            <button class="btn btn-sm btn-square">
              <Search :size="16" />
            </button>
          </div>
        </div>

        <button class="btn btn-sm btn-ghost" @click="resetFilters">
          <RotateCcw :size="16" />
          重置
        </button>
      </div>
    </div>

    <!-- 列表視圖 -->
    <div class="content flex-1 overflow-hidden p-4">
      <div class="list-view h-full overflow-y-auto">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-pin-rows">
            <thead>
              <tr>
                <th>標題</th>
                <th>狀態</th>
                <th>分類</th>
                <th>標籤</th>
                <th>最後修改</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="article in filteredArticles" :key="article.id" class="hover">
                <td>
                  <div class="flex items-center gap-2">
                    <FileText :size="16" />
                    <span class="font-medium">{{ article.title }}</span>
                  </div>
                </td>
                <td>
                  <span
                    class="badge badge-sm"
                    :class="article.status === 'published' ? 'badge-success' : 'badge-info'"
                  >
                    {{ article.status === 'published' ? '已發布' : '草稿' }}
                  </span>
                </td>
                <td>
                  <span class="badge badge-sm badge-outline">{{ article.category }}</span>
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in (article.frontmatter.tags || []).slice(0, 3)"
                      :key="tag"
                      class="badge badge-xs badge-ghost"
                    >
                      {{ tag }}
                    </span>
                    <span
                      v-if="article.frontmatter.tags && article.frontmatter.tags.length > 3"
                      class="badge badge-xs badge-ghost"
                    >
                      +{{ article.frontmatter.tags.length - 3 }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="text-sm text-base-content/70">
                    {{ formatDate(article.lastModified) }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button
                      class="btn btn-xs btn-ghost"
                      @click="handleArticleClick(article)"
                      title="編輯"
                    >
                      <Edit2 :size="14" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost text-error"
                      @click="handleDeleteArticle(article)"
                      title="刪除"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 空狀態 -->
          <div
            v-if="filteredArticles.length === 0"
            class="flex flex-col items-center justify-center py-16 text-base-content/50"
          >
            <FileText :size="64" class="mb-4 opacity-30" />
            <p class="text-lg">找不到符合條件的文章</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useArticleStore } from '@/stores/article'
import type { Article } from '@/types'
import {
  List,
  FileText,
  FilePenLine,
  CheckCircle2,
  Folder,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  FilePlus
} from 'lucide-vue-next'

const articleStore = useArticleStore()

const emit = defineEmits<{
  'edit-article': []
}>()

// 過濾器
const filters = ref({
  status: 'all' as 'all' | 'draft' | 'published',
  category: 'all' as 'all' | 'Software' | 'growth' | 'management',
  tags: [] as string[],
  searchText: ''
})

// 計算過濾後的文章
const filteredArticles = computed(() => {
  return articleStore.articles.filter(article => {
    // 狀態過濾
    if (filters.value.status !== 'all' && article.status !== filters.value.status) {
      return false
    }

    // 分類過濾
    if (filters.value.category !== 'all' && article.category !== filters.value.category) {
      return false
    }

    // 搜尋文字過濾
    if (filters.value.searchText) {
      const searchLower = filters.value.searchText.toLowerCase()
      const titleMatch = article.title.toLowerCase().includes(searchLower)
      // 空內容安全處理：使用 || '' 確保不會對 undefined 調用方法
      const contentMatch = (article.content || '').toLowerCase().includes(searchLower)
      if (!titleMatch && !contentMatch) {
        return false
      }
    }

    return true
  })
})

// 統計資訊
const draftCount = computed(() => {
  return articleStore.articles.filter(a => a.status === 'draft').length
})

const publishedCount = computed(() => {
  return articleStore.articles.filter(a => a.status === 'published').length
})

const categoryCount = computed(() => {
  const categories = new Set(articleStore.articles.map(a => a.category))
  return categories.size
})

// 重置過濾器
function resetFilters() {
  filters.value = {
    status: 'all',
    category: 'all',
    tags: [],
    searchText: ''
  }
}

// 處理文章點擊
function handleArticleClick(article: Article) {
  articleStore.setCurrentArticle(article)
  emit('edit-article')
}

// 處理刪除文章
function handleDeleteArticle(article: Article) {
  if (confirm(`確定要刪除文章「${article.title}」嗎？`)) {
    articleStore.deleteArticle(article.id)
  }
}

// 處理新增文章
async function handleCreateArticle() {
  await articleStore.createNewArticle()
  emit('edit-article')
}

// 格式化日期
function formatDate(date: Date | string): string {
  if (!date) {return '-'}
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}
</script>

<style scoped>
.project-management {
  background: oklch(var(--b1));
}

.list-view {
  padding-bottom: 1rem;
}

.stats {
  grid-auto-flow: column;
}

/* 滾動條樣式 */
.list-view::-webkit-scrollbar {
  height: 0.5rem;
  width: 0.5rem;
}

.list-view::-webkit-scrollbar-track {
  background: oklch(var(--b2));
}

.list-view::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 0.25rem;
}

.list-view::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}
</style>
