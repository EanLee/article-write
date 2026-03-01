<template>
  <div class="article-management h-full flex flex-col bg-base-100">
    <!-- 頂部統計列 -->
    <div class="stats-bar">
      <div class="stat-item">
        <FileText :size="18" />
        <span class="stat-label">總計</span>
        <span class="stat-value">{{ articleStore.articles.length }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <FilePenLine :size="18" />
        <span class="stat-label">草稿</span>
        <span class="stat-value stat-draft">{{ draftCount }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <CheckCircle2 :size="18" />
        <span class="stat-label">已發布</span>
        <span class="stat-value stat-published">{{ publishedCount }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <Folder :size="18" />
        <span class="stat-label">分類</span>
        <span class="stat-value">{{ categoryCount }}</span>
      </div>

      <div class="flex-1"></div>

      <button class="btn btn-outline btn-sm gap-2" :class="{ 'loading': isSyncing }" :disabled="isSyncing"
        @click="handleSyncToBlog">
        <RefreshCw v-if="!isSyncing" :size="16" />
        {{ isSyncing ? `同步中 ${syncProgress.current}/${syncProgress.total}` : '同步到 Blog' }}
      </button>

      <button class="btn btn-primary btn-sm gap-2" @click="handleCreateArticle">
        <FilePlus :size="16" />
        新增文章
      </button>
    </div>

    <!-- 篩選與搜尋列 -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-label">
          <Filter :size="14" />
          <span>篩選</span>
        </label>

        <select v-model="filters.status" class="select select-sm select-bordered">
          <option :value="ArticleFilterStatus.All">所有狀態</option>
          <option :value="ArticleFilterStatus.Draft">草稿</option>
          <option :value="ArticleFilterStatus.Published">已發布</option>
        </select>

        <select v-model="filters.category" class="select select-sm select-bordered">
          <option :value="ArticleFilterCategory.All">所有分類</option>
          <option v-for="cat in articleStore.allCategories" :key="cat" :value="cat">{{ cat }}</option>
        </select>

        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input v-model="filters.searchText" type="text" placeholder="搜尋標題或內容..."
            class="input input-sm input-bordered" />
        </div>

        <button v-if="hasActiveFilters" class="btn btn-sm btn-ghost gap-1" @click="resetFilters">
          <RotateCcw :size="14" />
          重置
        </button>
      </div>

      <div class="result-count">
        找到 <strong>{{ filteredArticles.length }}</strong> 篇文章
      </div>
    </div>

    <!-- 文章表格 -->
    <div ref="tableContainerRef" class="table-container">
      <table class="table table-sm table-pin-rows table-zebra">
        <thead>
          <tr>
            <th class="w-12">#</th>
            <th class="w-2/5">標題</th>
            <th class="w-20">狀態</th>
            <th class="w-24">分類</th>
            <th class="w-32">標籤</th>
            <th class="w-40">最後修改</th>
            <th class="w-20 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(article, index) in paginatedArticles" :key="article.id" class="hover cursor-pointer"
            @click="handleRowClick(article)">
            <td class="text-base-content/50">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td>
              <div class="flex items-center gap-2">
                <FileText :size="14" class="text-base-content/50 flex-shrink-0" />
                <span class="font-medium truncate">{{ article.title || '未命名文章' }}</span>
              </div>
            </td>
            <td>
              <span class="badge badge-sm"
                :class="article.status === ArticleStatus.Published ? 'badge-success' : 'badge-info'">
                {{ article.status === ArticleStatus.Published ? '已發布' : '草稿' }}
              </span>
            </td>
            <td>
              <span class="badge badge-sm badge-outline">{{ article.category }}</span>
            </td>
            <td>
              <div class="flex flex-wrap gap-1">
                <span v-for="tag in (article.frontmatter.tags || []).slice(0, 2)" :key="tag"
                  class="badge badge-xs badge-ghost">
                  {{ tag }}
                </span>
                <span v-if="article.frontmatter.tags && article.frontmatter.tags.length > 2"
                  class="badge badge-xs badge-ghost">
                  +{{ article.frontmatter.tags.length - 2 }}
                </span>
              </div>
            </td>
            <td class="text-sm text-base-content/70">
              {{ formatDate(article.lastModified) }}
            </td>
            <td @click.stop>
              <div class="flex gap-1 justify-center">
                <button class="btn btn-xs btn-ghost" @click="handleEditArticle(article)" title="編輯">
                  <Edit2 :size="14" />
                </button>
                <button class="btn btn-xs btn-ghost text-error" @click="handleDeleteArticle(article)" title="刪除">
                  <Trash2 :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 空狀態 -->
      <div v-if="filteredArticles.length === 0" class="empty-state">
        <FileText :size="64" class="empty-icon" />
        <p class="empty-title">沒有找到相符的文章</p>
        <p class="empty-subtitle">嘗試調整篩選條件或建立新文章</p>
      </div>
    </div>

    <!-- 分頁 -->
    <div v-if="totalPages > 1" class="pagination-bar">
      <div class="join">
        <button class="join-item btn btn-sm" :disabled="currentPage === 1" @click="currentPage--">
          «
        </button>
        <button class="join-item btn btn-sm">
          頁面 {{ currentPage }} / {{ totalPages }}
        </button>
        <button class="join-item btn btn-sm" :disabled="currentPage === totalPages" @click="currentPage++">
          »
        </button>
      </div>

      <select v-model="pageSize" class="select select-sm select-bordered">
        <option :value="25">25 / 頁</option>
        <option :value="50">50 / 頁</option>
        <option :value="100">100 / 頁</option>
      </select>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue"
import { useArticleStore } from "@/stores/article"
import { useConfigStore } from "@/stores/config"
import { ArticleStatus, ArticleFilterStatus, ArticleFilterCategory } from "@/types"
import type { Article } from "@/types"
import { notificationService } from "@/services/NotificationService"

import {
  FileText,
  FilePenLine,
  CheckCircle2,
  Folder,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  FilePlus,
  Filter,
  RefreshCw
} from "lucide-vue-next"


const articleStore = useArticleStore()
const configStore = useConfigStore()

const emit = defineEmits<{
  "edit-article": []
}>()

const isSyncing = ref(false)
const syncProgress = ref({ current: 0, total: 0 })

// 分頁
const currentPage = ref(1)
const pageSize = ref(50)

// 表格容器和滾動位置
const tableContainerRef = ref<HTMLElement | null>(null)
const savedScrollTop = ref(0)

// 使用 store 的 filter 狀態
const filters = computed({
  get: () => articleStore.filter,
  set: (value) => articleStore.updateFilter(value)
})

// 檢查是否有啟用的篩選條件
const hasActiveFilters = computed(() => {
  return filters.value.status !== ArticleFilterStatus.All ||
    filters.value.category !== ArticleFilterCategory.All ||
    filters.value.searchText !== ""
})

// 直接使用 store 的 filteredArticles，避免重複過濾
const filteredArticles = computed(() => articleStore.filteredArticles)

// 分頁計算
const totalPages = computed(() => Math.ceil(filteredArticles.value.length / pageSize.value))

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredArticles.value.slice(start, end)
})

// 當篩選條件改變時，重置到第一頁
watch([filters, pageSize], () => {
  currentPage.value = 1
}, { deep: true })

// 統計資訊
const draftCount = computed(() => {
  return articleStore.articles.filter(a => a.status === ArticleStatus.Draft).length
})

const publishedCount = computed(() => {
  return articleStore.articles.filter(a => a.status === ArticleStatus.Published).length
})

const categoryCount = computed(() => {
  const categories = new Set(articleStore.articles.map(a => a.category))
  return categories.size
})

// 重置篩選器
function resetFilters() {
  articleStore.updateFilter({
    status: ArticleFilterStatus.All,
    category: ArticleFilterCategory.All,
    tags: [],
    searchText: ""
  })
}

// 處理列點擊
function handleRowClick(article: Article) {
  handleEditArticle(article)
}

// 處理編輯文章
function handleEditArticle(article: Article) {
  // 保存當前滾動位置
  if (tableContainerRef.value) {
    savedScrollTop.value = tableContainerRef.value.scrollTop
  }

  articleStore.setCurrentArticle(article)
  emit("edit-article")

  // 使用 nextTick 確保 DOM 更新後恢復滾動位置
  nextTick(() => {
    if (tableContainerRef.value) {
      tableContainerRef.value.scrollTop = savedScrollTop.value
    }
  })
}

// 處理刪除文章
function handleDeleteArticle(article: Article) {
  if (confirm(`確定要刪除文章「${article.title}」嗎？`)) {
    articleStore.deleteArticle(article.id)
  }
}

// 同步所有已發布文章到 Blog
async function handleSyncToBlog() {
  const config = configStore.config
  if (!config.paths.articlesDir || !config.paths.targetBlog) {
    notificationService.error("請先在設定中配置文章目錄和部落格路徑")
    return
  }

  isSyncing.value = true
  syncProgress.value = { current: 0, total: 0 }

  const unsubscribe = window.electronAPI.onSyncProgress((data) => {
    syncProgress.value = { current: data.current, total: data.total }
  })

  try {
    const result = await window.electronAPI.syncAllPublished({
      articlesDir: config.paths.articlesDir,
      targetBlogDir: config.paths.targetBlog,
      imagesDir: config.paths.imagesDir
    })

    if (result.failed === 0) {
      notificationService.success(`同步完成：${result.succeeded} 篇文章已輸出`)
    } else {
      notificationService.warning(`同步完成：${result.succeeded} 篇成功，${result.failed} 篇失敗`)
      result.errors.forEach(err => notificationService.error(err))
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(w => notificationService.warning(w))
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "未知錯誤"
    notificationService.error(`同步失敗：${msg}`)
  } finally {
    isSyncing.value = false
    syncProgress.value = { current: 0, total: 0 }
    unsubscribe()
  }
}

// 處理新增文章
async function handleCreateArticle() {
  // 保存滾動位置
  if (tableContainerRef.value) {
    savedScrollTop.value = tableContainerRef.value.scrollTop
  }

  // 創建新文章（需要提供標題和分類，這裡使用預設值）
  const newArticle = await articleStore.createArticle("未命名文章", "Software" as any)

  // 設為當前文章
  articleStore.setCurrentArticle(newArticle)
  emit("edit-article")

  // 恢復滾動位置
  nextTick(() => {
    if (tableContainerRef.value) {
      tableContainerRef.value.scrollTop = savedScrollTop.value
    }
  })
}

// 格式化日期
function formatDate(date: Date | string): string {
  if (!date) { return "-" }
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d)
}
</script>

<style scoped>
.article-management {
  background: oklch(var(--b1));
}

/* 統計列 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: oklch(var(--b2));
  border-bottom: 1px solid oklch(var(--bc) / 0.1);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: oklch(var(--bc) / 0.7);
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: oklch(var(--bc));
}

.stat-draft {
  color: oklch(var(--in));
}

.stat-published {
  color: oklch(var(--su));
}

.stat-divider {
  width: 1px;
  height: 1.5rem;
  background: oklch(var(--bc) / 0.1);
}

/* 篩選列 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: oklch(var(--b1));
  border-bottom: 1px solid oklch(var(--bc) / 0.1);
}

.filter-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex: 1;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: oklch(var(--bc) / 0.7);
  white-space: nowrap;
}

.search-box {
  position: relative;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: oklch(var(--bc) / 0.4);
  pointer-events: none;
}

.search-box input {
  padding-left: 2.5rem;
}

.result-count {
  font-size: 0.875rem;
  color: oklch(var(--bc) / 0.6);
  white-space: nowrap;
}

.result-count strong {
  color: oklch(var(--bc));
  font-weight: 700;
}

/* 表格容器 */
.table-container {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.table {
  width: 100%;
}

.table th {
  background: oklch(var(--b2));
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(var(--bc) / 0.7);
  padding: 0.75rem 1rem;
}

.table td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.table tbody tr {
  transition: background 0.15s ease;
}

.table tbody tr:hover {
  background: oklch(var(--b2) / 0.5);
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  color: oklch(var(--bc) / 0.2);
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: oklch(var(--bc) / 0.7);
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: oklch(var(--bc) / 0.5);
}

/* 分頁列 */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: oklch(var(--b2));
  border-top: 1px solid oklch(var(--bc) / 0.1);
}

/* 滾動條 */
.table-container::-webkit-scrollbar {
  width: 0.5rem;
  height: 0.5rem;
}

.table-container::-webkit-scrollbar-track {
  background: oklch(var(--b2));
}

.table-container::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 0.25rem;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}
</style>
