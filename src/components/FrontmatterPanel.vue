<template>
  <div
    v-if="visible && article"
    class="frontmatter-panel bg-base-100 border-b border-base-300"
  >
    <!-- 折疊/展開控制列 -->
    <div class="panel-header flex items-center justify-between px-4 py-2 bg-base-200 cursor-pointer hover:bg-base-300" @click="toggleExpanded">
      <div class="flex items-center gap-2">
        <component :is="expanded ? ChevronDown : ChevronRight" :size="16" />
        <span class="font-semibold text-sm">Frontmatter</span>
      </div>
      <span class="text-xs text-base-content/60">{{ expanded ? '點擊收合' : '點擊展開' }}</span>
    </div>

    <!-- 表格內容 -->
    <div v-if="expanded" class="overflow-x-auto">
      <table class="table table-sm table-zebra w-full">
        <thead>
          <tr>
            <th class="w-1/5">欄位</th>
            <th>內容</th>
          </tr>
        </thead>
        <tbody>
          <!-- 標題 -->
          <tr>
            <td class="font-semibold">
              <FileText :size="14" class="inline mr-1" />
              標題
            </td>
            <td>{{ article.title }}</td>
          </tr>

          <!-- 描述 -->
          <tr v-if="article.frontmatter.description">
            <td class="font-semibold">
              <AlignLeft :size="14" class="inline mr-1" />
              描述
            </td>
            <td>{{ article.frontmatter.description }}</td>
          </tr>

          <!-- 日期 -->
          <tr>
            <td class="font-semibold">
              <Calendar :size="14" class="inline mr-1" />
              日期
            </td>
            <td>{{ article.frontmatter.date }}</td>
          </tr>

          <!-- 最後修改 -->
          <tr>
            <td class="font-semibold">
              <Clock :size="14" class="inline mr-1" />
              最後修改
            </td>
            <td>{{ formatDate(article.lastModified) }}</td>
          </tr>

          <!-- 分類 -->
          <tr>
            <td class="font-semibold">
              <Folder :size="14" class="inline mr-1" />
              分類
            </td>
            <td>
              <span class="badge badge-sm badge-outline">{{ article.category }}</span>
            </td>
          </tr>

          <!-- 標籤 -->
          <tr v-if="article.frontmatter.tags.length > 0">
            <td class="font-semibold">
              <Tag :size="14" class="inline mr-1" />
              標籤
            </td>
            <td>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="tag in article.frontmatter.tags"
                  :key="tag"
                  class="badge badge-sm badge-primary badge-outline"
                >
                  {{ tag }}
                </span>
              </div>
            </td>
          </tr>

          <!-- 狀態 -->
          <tr>
            <td class="font-semibold">
              <CircleDot :size="14" class="inline mr-1" />
              狀態
            </td>
            <td>
              <span
                class="badge badge-sm"
                :class="article.status === 'published' ? 'badge-success' : 'badge-info'"
              >
                {{ article.status === 'published' ? '已發布' : '草稿' }}
              </span>
            </td>
          </tr>





   

          <!-- 檔案路徑 -->
          <tr>
            <td class="font-semibold">
              <FolderOpen :size="14" class="inline mr-1" />
              路徑
            </td>
            <td class="text-xs text-base-content/60 font-mono">{{ article.filePath }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Article } from '@/types'
import {
  FileText,
  AlignLeft,
  Calendar,
  Clock,
  Folder,
  Tag,
  CircleDot,
  FolderOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-vue-next'

defineProps<{
  visible: boolean
  article: Article | null
}>()

const expanded = ref(true)

// 從 localStorage 載入展開狀態
onMounted(() => {
  const savedExpanded = localStorage.getItem('frontmatter-panel-expanded')
  if (savedExpanded !== null) {
    expanded.value = savedExpanded === 'true'
  }
})

function toggleExpanded() {
  expanded.value = !expanded.value
  localStorage.setItem('frontmatter-panel-expanded', expanded.value.toString())
}

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
.frontmatter-panel {
  max-height: 400px;
}

.panel-header {
  user-select: none;
  transition: background-color 0.2s ease;
}

.overflow-x-auto {
  max-height: 350px;
  overflow-y: auto;
}

/* 滾動條樣式 */
.frontmatter-panel::-webkit-scrollbar {
  width: 0.5rem;
  height: 0.5rem;
}

.frontmatter-panel::-webkit-scrollbar-track {
  background: oklch(var(--b2));
}

.frontmatter-panel::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 0.25rem;
}

.frontmatter-panel::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}

/* 表格樣式優化 */
.table th {
  background: oklch(var(--b2));
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.table td {
  vertical-align: middle;
}

.table tbody tr:hover {
  background: oklch(var(--b2) / 0.5);
}
</style>
