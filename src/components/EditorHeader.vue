<template>
  <header class="bg-base-200 border-b border-base-300 p-4">
    <div class="flex justify-between items-center">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-1">
          <h2 class="text-lg font-semibold truncate">{{ article?.title }}</h2>
          <!-- 儲存狀態指示器 -->
          <SaveStatusIndicator :show-save-button="true" />
        </div>
        <!-- 文件路徑 -->
        <div 
          v-if="article?.filePath" 
          class="text-xs text-base-content/50 mb-2 flex items-center gap-1 font-mono"
          :title="article.filePath"
        >
          <FileText :size="12" />
          <span class="truncate">{{ article.filePath }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <div
            class="badge badge-sm"
            :class="article?.status === 'published' ? 'badge-success' : 'badge-info'"
          >
            {{ statusText }}
          </div>
          <span class="badge badge-sm badge-outline">{{ article?.category }}</span>
          <!-- 系列名稱 -->
          <span 
            v-if="article?.frontmatter.series" 
            class="badge badge-sm badge-primary badge-outline"
            :title="`系列: ${article.frontmatter.series}${article.frontmatter.seriesOrder ? ` (${article.frontmatter.seriesOrder})` : ''}`"
          >
            📚 {{ article.frontmatter.series }}
            <span v-if="article.frontmatter.seriesOrder" class="ml-1">#{{ article.frontmatter.seriesOrder }}</span>
          </span>
          <span class="text-base-content/70 text-xs whitespace-nowrap">
            最後修改: {{ formatDate(article?.lastModified) }}
          </span>
        </div>
      </div>

      <div class="flex gap-2 items-center">
        <!-- 編輯器模式切換 -->
        <div class="btn-group">
          <button
            class="btn btn-sm gap-1"
            :class="editorMode === 'compose' ? 'btn-active' : ''"
            @click="$emit('toggle-editor-mode')"
          >
            <FileEdit :size="16" />
            <span class="hidden sm:inline">撰寫</span>
          </button>
          <button
            class="btn btn-sm gap-1"
            :class="editorMode === 'raw' ? 'btn-active' : ''"
            @click="$emit('toggle-editor-mode')"
          >
            <FileCode :size="16" />
            <span class="hidden sm:inline">Raw</span>
          </button>
        </div>

        <div class="divider divider-horizontal mx-0"></div>

        <!-- Frontmatter 控制 -->
        <div v-if="editorMode === 'compose'" class="flex gap-1">
          <div class="tooltip tooltip-bottom" :data-tip="showFrontmatter ? '隱藏 Frontmatter' : '顯示 Frontmatter'">
            <button
              class="btn btn-sm btn-ghost btn-square"
              @click="$emit('toggle-frontmatter')"
            >
              <Menu :size="18" />
            </button>
          </div>
          
          <div class="tooltip tooltip-bottom" data-tip="編輯前置資料">
            <button
              class="btn btn-sm btn-ghost btn-square"
              @click="$emit('edit-frontmatter')"
            >
              <Edit3 :size="18" />
            </button>
          </div>
        </div>

        <div class="divider divider-horizontal mx-0"></div>

        <!-- 發佈按鈕 -->
        <div
          v-if="article?.status === 'draft'"
          class="tooltip tooltip-bottom"
          data-tip="移至已發布資料夾"
        >
          <button
            class="btn btn-sm btn-success gap-1"
            @click="$emit('move-to-published')"
          >
            <Upload :size="16" />
            <span class="hidden sm:inline">發佈</span>
          </button>
        </div>

        <!-- 預覽切換 -->
        <div class="tooltip tooltip-bottom" :data-tip="showPreview ? '隱藏預覽' : '顯示預覽 (Ctrl+/)'" >
          <button
            class="btn btn-sm btn-primary gap-1"
            @click="$emit('toggle-preview')"
          >
            <Eye v-if="!showPreview" :size="16" />
            <EyeOff v-else :size="16" />
            <span class="hidden sm:inline">{{ showPreview ? '隱藏' : '預覽' }}</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '@/types'
import { Menu, Edit3, Upload, Eye, EyeOff, FileCode, FileEdit, FileText } from 'lucide-vue-next'
import SaveStatusIndicator from '@/components/SaveStatusIndicator.vue'

interface Props {
  article: Article | null
  showPreview: boolean
  showFrontmatter?: boolean
  editorMode?: 'compose' | 'raw'
}

const props = withDefaults(defineProps<Props>(), {
  showFrontmatter: true,
  editorMode: 'compose'
})

defineEmits<{
  'toggle-preview': []
  'toggle-frontmatter': []
  'edit-frontmatter': []
  'move-to-published': []
  'toggle-editor-mode': []
}>()

const statusText = computed(() => {
  return props.article?.status === 'published' ? '已發布' : '草稿'
})

function formatDate(date?: Date): string {
  if (!date) {return ''}
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>
