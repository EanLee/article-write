<template>
  <div class="editorial-dashboard h-full flex flex-col overflow-hidden">
    <!-- Header Section -->
    <header class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">編輯台</h1>
          <p class="dashboard-subtitle">內容管理與發布控制中心</p>
        </div>
        <button class="btn-new-article" @click="handleCreateArticle">
          <FilePlus :size="20" />
          <span>新增文章</span>
        </button>
      </div>
    </header>

    <!-- Main Dashboard Area -->
    <div class="dashboard-body">
      <!-- Statistics Grid -->
      <section class="stats-grid">
        <!-- Featured Stat - Total Articles -->
        <div class="stat-card stat-featured" style="--stagger: 0">
          <div class="stat-icon-wrapper stat-icon-primary">
            <FileText :size="32" />
          </div>
          <div class="stat-content">
            <div class="stat-label">總文章數</div>
            <div class="stat-value">{{ articleStore.articles.length }}</div>
            <div class="stat-trend">
              <TrendingUp :size="14" />
              <span>本月 +{{ Math.floor(articleStore.articles.length * 0.15) }}</span>
            </div>
          </div>
        </div>

        <!-- Draft Stats -->
        <div class="stat-card stat-draft" style="--stagger: 1">
          <div class="stat-header">
            <FilePenLine :size="20" class="stat-icon" />
            <span class="stat-label">草稿箱</span>
          </div>
          <div class="stat-value-compact">{{ draftCount }}</div>
          <div class="stat-footer">待完成創作</div>
        </div>

        <!-- Published Stats -->
        <div class="stat-card stat-published" style="--stagger: 2">
          <div class="stat-header">
            <CheckCircle2 :size="20" class="stat-icon" />
            <span class="stat-label">已發布</span>
          </div>
          <div class="stat-value-compact">{{ publishedCount }}</div>
          <div class="stat-footer">線上可見內容</div>
        </div>

        <!-- Category Distribution -->
        <div class="stat-card stat-categories" style="--stagger: 3">
          <div class="stat-header">
            <Folder :size="20" class="stat-icon" />
            <span class="stat-label">分類統計</span>
          </div>
          <div class="category-pills">
            <div 
              v-for="(count, category) in categoryDistribution" 
              :key="category"
              class="category-pill"
            >
              <span class="category-name">{{ category }}</span>
              <span class="category-count">{{ count }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Filters & Search Section -->
      <section class="filter-section">
        <div class="filter-group">
          <div class="filter-label">
            <Filter :size="16" />
            <span>篩選條件</span>
          </div>
          <div class="filter-controls">
            <select v-model="filters.status" class="filter-select">
              <option value="all">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
            </select>

            <select v-model="filters.category" class="filter-select">
              <option value="all">全部分類</option>
              <option value="Software">Software</option>
              <option value="growth">Growth</option>
              <option value="management">Management</option>
            </select>

            <div class="search-box">
              <Search :size="18" class="search-icon" />
              <input
                v-model="filters.searchText"
                type="text"
                placeholder="搜尋標題或內容..."
                class="search-input"
              />
            </div>

            <button 
              v-if="hasActiveFilters" 
              class="btn-reset" 
              @click="resetFilters"
            >
              <RotateCcw :size="16" />
              <span>重置</span>
            </button>
          </div>
        </div>

        <div class="results-info">
          找到 <strong>{{ filteredArticles.length }}</strong> 篇文章
        </div>
      </section>

      <!-- Article Cards Grid -->
      <section class="articles-section">
        <div v-if="filteredArticles.length === 0" class="empty-state">
          <FileText :size="64" class="empty-icon" />
          <p class="empty-title">沒有找到相符的文章</p>
          <p class="empty-subtitle">嘗試調整篩選條件或建立新文章</p>
        </div>

        <div v-else class="articles-grid">
          <article 
            v-for="(article, index) in filteredArticles" 
            :key="article.id"
            class="article-card"
            :style="{ '--card-index': index }"
            @click="handleArticleClick(article)"
          >
            <div class="article-status-badge" :class="`badge-${article.status}`">
              {{ article.status === 'published' ? '已發布' : '草稿' }}
            </div>

            <div class="article-header">
              <h3 class="article-title">{{ article.title || '未命名文章' }}</h3>
              <div class="article-meta">
                <span class="article-category">{{ article.category }}</span>
                <span class="article-date">{{ formatDateRelative(article.lastModified) }}</span>
              </div>
            </div>

            <div v-if="article.frontmatter.tags && article.frontmatter.tags.length > 0" class="article-tags">
              <span 
                v-for="tag in article.frontmatter.tags.slice(0, 4)" 
                :key="tag"
                class="tag"
              >
                #{{ tag }}
              </span>
              <span 
                v-if="article.frontmatter.tags.length > 4" 
                class="tag tag-more"
              >
                +{{ article.frontmatter.tags.length - 4 }}
              </span>
            </div>

            <div class="article-footer">
              <div class="article-stats">
                <div class="stat-item">
                  <Clock :size="14" />
                  <span>{{ formatTime(article.lastModified) }}</span>
                </div>
              </div>

              <div class="article-actions" @click.stop>
                <button 
                  class="action-btn action-edit" 
                  @click="handleArticleClick(article)"
                  title="編輯"
                >
                  <Edit2 :size="16" />
                </button>
                <button 
                  class="action-btn action-delete" 
                  @click="handleDeleteArticle(article)"
                  title="刪除"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useArticleStore } from '@/stores/article'
import type { Article } from '@/types'
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
  Clock,
  TrendingUp
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

// 檢查是否有啟用的篩選條件
const hasActiveFilters = computed(() => {
  return filters.value.status !== 'all' || 
         filters.value.category !== 'all' || 
         filters.value.searchText !== ''
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

const categoryDistribution = computed(() => {
  const dist: Record<string, number> = {}
  articleStore.articles.forEach(article => {
    dist[article.category] = (dist[article.category] || 0) + 1
  })
  return dist
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

// 格式化相對時間
function formatDateRelative(date: Date | string): string {
  if (!date) {return '-'}
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {return '剛剛'}
  if (diffMins < 60) {return `${diffMins} 分鐘前`}
  if (diffHours < 24) {return `${diffHours} 小時前`}
  if (diffDays < 7) {return `${diffDays} 天前`}
  
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric'
  }).format(d)
}

// 格式化時間
function formatTime(date: Date | string): string {
  if (!date) {return '-'}
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}
</script>

<style scoped>
/* Import Editorial Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

.editorial-dashboard {
  --color-amber: 245 40% 50%;
  --color-amber-light: 48 96% 89%;
  --color-blue: 217 91% 60%;
  --color-blue-light: 214 95% 93%;
  --color-slate: 215 20% 65%;
  --color-charcoal: 222 47% 11%;
  
  background: oklch(var(--b1));
  font-family: 'Inter', sans-serif;
}

/* ===== HEADER ===== */
.dashboard-header {
  padding: 2rem 2.5rem 1.5rem;
  border-bottom: 1px solid oklch(var(--bc) / 0.1);
  background: linear-gradient(to bottom, oklch(var(--b1)), oklch(var(--b2) / 0.3));
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-section {
  flex: 1;
}

.dashboard-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  background: linear-gradient(135deg, oklch(var(--bc)) 0%, oklch(var(--bc) / 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dashboard-subtitle {
  font-size: 0.875rem;
  color: oklch(var(--bc) / 0.6);
  margin-top: 0.25rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.btn-new-article {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.75rem;
  background: oklch(var(--p));
  color: oklch(var(--pc));
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px oklch(var(--p) / 0.2);
}

.btn-new-article:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px oklch(var(--p) / 0.3);
}

/* ===== DASHBOARD BODY ===== */
.dashboard-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* ===== STATISTICS GRID ===== */
.stats-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 1.25rem;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card {
  background: oklch(var(--b2));
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid oklch(var(--bc) / 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideIn 0.5s ease-out backwards;
  animation-delay: calc(var(--stagger) * 0.1s);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px oklch(var(--bc) / 0.1);
  border-color: oklch(var(--bc) / 0.15);
}

/* Featured Stat Card */
.stat-featured {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: linear-gradient(135deg, oklch(var(--p) / 0.1) 0%, oklch(var(--p) / 0.05) 100%);
}

.stat-icon-wrapper {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(var(--p));
  color: oklch(var(--pc));
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: oklch(var(--bc) / 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: oklch(var(--bc));
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: oklch(var(--su));
  font-weight: 500;
}

/* Compact Stat Cards */
.stat-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
}

.stat-icon {
  color: oklch(var(--bc) / 0.5);
}

.stat-draft .stat-icon {
  color: oklch(var(--in));
}

.stat-published .stat-icon {
  color: oklch(var(--su));
}

.stat-categories .stat-icon {
  color: oklch(var(--wa));
}

.stat-value-compact {
  font-family: 'Playfair Display', serif;
  font-size: 2.25rem;
  font-weight: 700;
  color: oklch(var(--bc));
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-footer {
  font-size: 0.75rem;
  color: oklch(var(--bc) / 0.5);
  font-weight: 500;
}

/* Category Pills */
.category-pills {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.category-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: oklch(var(--b1));
  border-radius: 0.5rem;
  font-size: 0.8125rem;
}

.category-name {
  font-weight: 500;
  color: oklch(var(--bc) / 0.8);
}

.category-count {
  font-weight: 700;
  color: oklch(var(--bc));
  background: oklch(var(--bc) / 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
}

/* ===== FILTER SECTION ===== */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: oklch(var(--b2));
  border-radius: 0.75rem;
  border: 1px solid oklch(var(--bc) / 0.08);
}

.filter-group {
  flex: 1;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: oklch(var(--bc) / 0.7);
  white-space: nowrap;
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid oklch(var(--bc) / 0.2);
  background: oklch(var(--b1));
  color: oklch(var(--bc));
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-select:hover {
  border-color: oklch(var(--bc) / 0.3);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: oklch(var(--bc) / 0.4);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.875rem 0.5rem 2.75rem;
  border-radius: 0.5rem;
  border: 1px solid oklch(var(--bc) / 0.2);
  background: oklch(var(--b1));
  color: oklch(var(--bc));
  font-size: 0.875rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: oklch(var(--p));
  box-shadow: 0 0 0 3px oklch(var(--p) / 0.1);
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  color: oklch(var(--bc) / 0.6);
  border: 1px solid oklch(var(--bc) / 0.2);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-reset:hover {
  background: oklch(var(--b1));
  color: oklch(var(--bc));
  border-color: oklch(var(--bc) / 0.3);
}

.results-info {
  font-size: 0.875rem;
  color: oklch(var(--bc) / 0.6);
  white-space: nowrap;
}

.results-info strong {
  color: oklch(var(--bc));
  font-weight: 700;
}

/* ===== ARTICLES SECTION ===== */
.articles-section {
  flex: 1;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
}

.article-card {
  background: oklch(var(--b2));
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid oklch(var(--bc) / 0.08);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: cardFadeIn 0.5s ease-out backwards;
  animation-delay: calc(var(--card-index) * 0.05s);
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
}

.article-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, oklch(var(--p)), oklch(var(--s)));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.article-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px oklch(var(--bc) / 0.12);
  border-color: oklch(var(--bc) / 0.15);
}

.article-card:hover::before {
  transform: scaleX(1);
}

.article-status-badge {
  display: inline-block;
  padding: 0.375rem 0.875rem;
  border-radius: 2rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.badge-published {
  background: oklch(var(--su) / 0.15);
  color: oklch(var(--su));
}

.badge-draft {
  background: oklch(var(--in) / 0.15);
  color: oklch(var(--in));
}

.article-header {
  margin-bottom: 1rem;
}

.article-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.375rem;
  font-weight: 700;
  color: oklch(var(--bc));
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.8125rem;
}

.article-category {
  padding: 0.25rem 0.625rem;
  background: oklch(var(--bc) / 0.08);
  border-radius: 0.25rem;
  font-weight: 600;
  color: oklch(var(--bc) / 0.7);
}

.article-date {
  color: oklch(var(--bc) / 0.5);
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  padding: 0.25rem 0.625rem;
  background: oklch(var(--b1));
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: oklch(var(--bc) / 0.7);
  font-weight: 500;
}

.tag-more {
  background: oklch(var(--bc) / 0.1);
  color: oklch(var(--bc) / 0.6);
  font-weight: 600;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid oklch(var(--bc) / 0.08);
}

.article-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: oklch(var(--bc) / 0.5);
}

.article-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  border: none;
  background: oklch(var(--b1));
  color: oklch(var(--bc) / 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: oklch(var(--bc) / 0.1);
  color: oklch(var(--bc));
}

.action-delete:hover {
  background: oklch(var(--er) / 0.1);
  color: oklch(var(--er));
}

/* ===== EMPTY STATE ===== */
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
  margin-bottom: 1.5rem;
}

.empty-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: oklch(var(--bc) / 0.7);
  margin: 0 0 0.5rem 0;
}

.empty-subtitle {
  font-size: 0.9375rem;
  color: oklch(var(--bc) / 0.5);
  margin: 0;
}

/* ===== SCROLLBAR ===== */
.dashboard-body::-webkit-scrollbar {
  width: 0.5rem;
}

.dashboard-body::-webkit-scrollbar-track {
  background: oklch(var(--b2));
}

.dashboard-body::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 0.25rem;
}

.dashboard-body::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: 2fr 1fr 1fr;
  }
  
  .stat-categories {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 1.5rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .dashboard-body {
    padding: 1.5rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  
  .filter-controls {
    width: 100%;
  }
  
  .search-box {
    min-width: 100%;
  }
  
  .articles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
