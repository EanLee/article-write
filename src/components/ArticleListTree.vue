<template>
  <div class="h-full flex flex-col bg-base-100">
    <!-- Toolbar -->
    <div class="p-2 border-b border-base-300 flex items-center gap-2">
      <div class="flex-1 relative">
        <input
          ref="searchInputRef"
          v-model="searchText"
          type="text"
          placeholder="搜尋文章... (Ctrl+F)"
          class="input input-bordered input-xs w-full pl-7"
          @input="handleSearch"
          @keydown="handleSearchKeydown"
        />
        <Search :size="14" class="absolute left-2 top-1/2 -translate-y-1/2 text-base-content/50" />
      </div>

      <!-- View Toggle -->
      <div class="dropdown dropdown-end">
        <button tabindex="0" class="btn btn-ghost btn-xs btn-square" title="視圖選項">
          <SlidersHorizontal :size="14" />
        </button>
        <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-52 text-xs">
          <li>
            <label class="label cursor-pointer justify-start gap-2 p-2">
              <input
                v-model="groupBySeries"
                type="checkbox"
                class="checkbox checkbox-xs"
              />
              <span>依系列分組</span>
            </label>
          </li>
          <li>
            <label class="label cursor-pointer justify-start gap-2 p-2">
              <input
                v-model="showStatusIcons"
                type="checkbox"
                class="checkbox checkbox-xs"
              />
              <span>顯示狀態圖示</span>
            </label>
          </li>
          <div class="divider my-1"></div>
          <li><a @click="expandAll">全部展開</a></li>
          <li><a @click="collapseAll">全部收合</a></li>
        </ul>
      </div>
    </div>

    <!-- Tree View -->
    <div
      ref="treeContainerRef"
      class="flex-1 overflow-y-auto text-sm"
      @keydown="handleKeydown"
      tabindex="0"
    >
      <!-- 依系列分組視圖 -->
      <template v-if="groupBySeries">
        <!-- 系列分組 -->
        <div v-for="group in seriesGroups" :key="group.name">
          <!-- 系列標題 -->
          <div
            class="flex items-center gap-1 px-2 py-1 hover:bg-base-200 cursor-pointer select-none"
            @click="toggleGroup(group.name)"
          >
            <ChevronRight
              :size="14"
              class="transition-transform shrink-0"
              :class="{ 'rotate-90': !collapsedGroups.has(group.name) }"
            />
            <FolderClosed
              v-if="collapsedGroups.has(group.name)"
              :size="14"
              class="text-warning shrink-0"
            />
            <FolderOpen
              v-else
              :size="14"
              class="text-warning shrink-0"
            />
            <span class="font-medium text-xs truncate">
              {{ group.displayName }}
            </span>
            <span class="text-xs text-base-content/50 ml-auto shrink-0">
              ({{ group.articles.length }})
            </span>
          </div>

          <!-- 系列文章列表 -->
          <div v-show="!collapsedGroups.has(group.name)">
            <ArticleTreeItem
              v-for="article in group.articles"
              :key="article.id"
              :article="article"
              :is-current="article.id === articleStore.currentArticle?.id"
              :show-status-icons="showStatusIcons"
              :indent-level="1"
              @select="selectArticle"
            />
          </div>
        </div>
      </template>

      <!-- 平面列表視圖 -->
      <template v-else>
        <ArticleTreeItem
          v-for="article in filteredArticles"
          :key="article.id"
          :article="article"
          :is-current="article.id === articleStore.currentArticle?.id"
          :show-status-icons="showStatusIcons"
          :indent-level="0"
          @select="selectArticle"
        />
      </template>

      <!-- 空狀態 -->
      <div
        v-if="filteredArticles.length === 0"
        class="flex flex-col items-center justify-center h-32 text-base-content/50"
      >
        <FileQuestion :size="32" class="mb-2" />
        <p class="text-xs">沒有找到文章</p>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="p-2 border-t border-base-300 text-xs text-base-content/60 flex items-center justify-between">
      <span>{{ filteredArticles.length }} 篇文章</span>
      <span v-if="searchText">搜尋結果</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useArticleStore } from '@/stores/article'
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  FolderOpen,
  FolderClosed,
  FileQuestion
} from 'lucide-vue-next'
import ArticleTreeItem from './ArticleTreeItem.vue'
import type { Article } from '@/types'

const articleStore = useArticleStore()

// Refs
const searchInputRef = ref<HTMLInputElement>()
const treeContainerRef = ref<HTMLElement>()

// State
const searchText = ref('')
const groupBySeries = ref(true)
const showStatusIcons = ref(true)
const collapsedGroups = ref(new Set<string>())

// Computed
const filteredArticles = computed(() => {
  let articles = articleStore.filteredArticles

  // 搜尋過濾
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    articles = articles.filter(article =>
      article.title.toLowerCase().includes(search) ||
      article.frontmatter.series?.toLowerCase().includes(search) ||
      article.frontmatter.tags?.some(tag => tag.toLowerCase().includes(search))
    )
  }

  return articles
})

interface SeriesGroup {
  name: string
  displayName: string
  articles: Article[]
}

const seriesGroups = computed(() => {
  const groups = new Map<string, Article[]>()

  filteredArticles.value.forEach(article => {
    const seriesName = article.frontmatter.series || '_standalone'
    if (!groups.has(seriesName)) {
      groups.set(seriesName, [])
    }
    groups.get(seriesName)!.push(article)
  })

  // 排序並格式化
  const result: SeriesGroup[] = []

  // 先添加有系列的
  Array.from(groups.entries())
    .filter(([name]) => name !== '_standalone')
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([name, articles]) => {
      // 按 seriesOrder 排序（使用副本避免修改原陣列）
      const sorted = [...articles].sort((a, b) => {
        const orderA = a.frontmatter.seriesOrder || 999
        const orderB = b.frontmatter.seriesOrder || 999
        return orderA - orderB
      })

      result.push({
        name,
        displayName: `📚 ${name}`,
        articles: sorted
      })
    })

  // 最後添加獨立文章
  if (groups.has('_standalone')) {
    // 使用副本避免修改原陣列
    const standaloneArticles = groups.get('_standalone')!
    result.push({
      name: '_standalone',
      displayName: '📄 獨立文章',
      articles: [...standaloneArticles].sort((a, b) =>
        a.title.localeCompare(b.title, 'zh-TW')
      )
    })
  }

  return result
})

// Methods
function handleSearch() {
  // 搜尋時自動展開所有分組
  if (searchText.value && groupBySeries.value) {
    collapsedGroups.value.clear()
  }
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    searchText.value = ''
    searchInputRef.value?.blur()
  } else if (e.key === 'Enter') {
    // Enter 聚焦到第一個結果
    nextTick(() => {
      treeContainerRef.value?.focus()
    })
  }
}

function toggleGroup(groupName: string) {
  if (collapsedGroups.value.has(groupName)) {
    collapsedGroups.value.delete(groupName)
  } else {
    collapsedGroups.value.add(groupName)
  }
}

function expandAll() {
  collapsedGroups.value.clear()
}

function collapseAll() {
  seriesGroups.value.forEach(group => {
    collapsedGroups.value.add(group.name)
  })
}

function selectArticle(article: Article) {
  articleStore.setCurrentArticle(article)
}

function handleKeydown(e: KeyboardEvent) {
  // 全域快捷鍵處理
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

// 儲存/載入設定
function loadSettings() {
  const saved = localStorage.getItem('article-list-settings')
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      groupBySeries.value = settings.groupBySeries ?? true
      showStatusIcons.value = settings.showStatusIcons ?? true
      if (settings.collapsedGroups) {
        collapsedGroups.value = new Set(settings.collapsedGroups)
      }
    } catch (e) {
      console.error('Failed to load article list settings:', e)
    }
  }
}

function saveSettings() {
  const settings = {
    groupBySeries: groupBySeries.value,
    showStatusIcons: showStatusIcons.value,
    collapsedGroups: Array.from(collapsedGroups.value)
  }
  localStorage.setItem('article-list-settings', JSON.stringify(settings))
}

onMounted(() => {
  loadSettings()

  // 監聽設定變化並儲存
  const saveTimer = setInterval(saveSettings, 1000)
  onUnmounted(() => {
    clearInterval(saveTimer)
    saveSettings()
  })
})
</script>

<style scoped>
/* 自定義捲軸 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}
</style>
