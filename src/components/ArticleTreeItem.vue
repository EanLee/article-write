<template>
  <div
    class="article-tree-item flex items-center gap-1 px-2 py-1 cursor-pointer select-none transition-colors"
    :id="'article-' + article.slug.replace(/\s+/g, '-')"
    :class="{
      'bg-primary/10 text-primary font-medium': isCurrent,
      'hover:bg-base-200': !isCurrent
    }"
    :style="{ paddingLeft: `${indentLevel * 12 + 8}px` }"
    @click="$emit('select', article)"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 狀態圖示 -->
    <span v-if="showStatusIcons" class="shrink-0 w-4 text-center" :title="statusTooltip">
      <span v-if="isCurrent" class="text-primary">●</span>
      <span v-else-if="hasUnsavedChanges" class="text-warning">*</span>
      <span v-else-if="article.status === 'published'" class="text-success">✓</span>
      <span v-else class="text-base-content/30">○</span>
    </span>

    <!-- 檔案圖示 -->
    <FileText :size="14" class="shrink-0 text-base-content/50" />

    <!-- 標題 -->
    <span class="flex-1 truncate text-xs" :title="article.title">
      <template v-if="article.frontmatter.series && article.frontmatter.seriesOrder">
        <span class="text-base-content/50">#{{ article.frontmatter.seriesOrder }}</span>
        <span class="mx-1">·</span>
      </template>
      {{ article.title }}
    </span>

    <!-- 狀態徽章（緊湊模式） -->
    <span
      v-if="!showStatusIcons"
      class="shrink-0 text-xs"
      :class="{
        'text-success': article.status === 'published',
        'text-info': article.status === 'draft'
      }"
    >
      {{ article.status === 'published' ? '✓' : '' }}
    </span>

    <!-- 日期（Hover 顯示） -->
    <span
      v-if="showDate"
      class="shrink-0 text-xs text-base-content/40 hidden group-hover:inline"
    >
      {{ formatDate(article.lastModified) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileText } from 'lucide-vue-next'
import type { Article } from '@/types'

interface Props {
  article: Article
  isCurrent: boolean
  showStatusIcons?: boolean
  indentLevel?: number
  showDate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStatusIcons: true,
  indentLevel: 0,
  showDate: false
})

defineEmits<{
  select: [article: Article]
}>()

// Computed
const hasUnsavedChanges = computed(() => {
  // TODO: 從 AutoSaveService 獲取未儲存狀態
  return false
})

const statusTooltip = computed(() => {
  if (props.isCurrent) {return '當前編輯'}
  if (hasUnsavedChanges.value) {return '有未儲存的變更'}
  if (props.article.status === 'published') {return '已發布'}
  return '草稿'
})

// Methods
function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return ''
  }

  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {return '今天'}
  if (diffDays === 1) {return '昨天'}
  if (diffDays < 7) {return `${diffDays}天前`}

  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

function handleContextMenu(_e: MouseEvent) {
  // TODO: 實作右鍵菜單
  console.log('Right click on:', props.article.title)
}
</script>

<style scoped>
.article-tree-item {
  min-height: 24px;
}

.article-tree-item:focus-within {
  outline: 1px solid oklch(var(--p));
  outline-offset: -1px;
}
</style>
