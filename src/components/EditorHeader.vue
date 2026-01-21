<template>
  <header class="bg-base-200 border-b border-base-300 p-4">
    <div class="flex justify-between items-center">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-2">
          <h2 class="text-lg font-semibold truncate">{{ article?.title }}</h2>
          <!-- 儲存狀態指示器 -->
          <SaveStatusIndicator :show-save-button="true" />
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <div
            class="badge badge-sm"
            :class="article?.status === 'published' ? 'badge-success' : 'badge-info'"
          >
            {{ statusText }}
          </div>
          <span class="badge badge-sm badge-outline">{{ article?.category }}</span>
          <span class="text-base-content/70 text-xs whitespace-nowrap">
            最後修改: {{ formatDate(article?.lastModified) }}
          </span>
        </div>
      </div>

      <div class="flex gap-2">
        <!-- 編輯器模式切換 -->
        <div class="btn-group">
          <button
            class="btn btn-sm"
            :class="editorMode === 'compose' ? 'btn-active' : ''"
            @click="$emit('toggle-editor-mode')"
            title="撰寫模式"
          >
            <FileEdit :size="16" />
          </button>
          <button
            class="btn btn-sm"
            :class="editorMode === 'raw' ? 'btn-active' : ''"
            @click="$emit('toggle-editor-mode')"
            title="Raw 模式"
          >
            <FileCode :size="16" />
          </button>
        </div>

        <button
          v-if="editorMode === 'compose'"
          class="btn btn-sm btn-ghost"
          @click="$emit('toggle-frontmatter')"
          :title="showFrontmatter ? '隱藏 Frontmatter' : '顯示 Frontmatter'"
        >
          <Menu :size="16" />
        </button>
        <button
          v-if="editorMode === 'compose'"
          class="btn btn-sm btn-outline"
          @click="$emit('edit-frontmatter')"
        >
          <Edit3 :size="16" class="mr-1" />
          編輯前置資料
        </button>
        <button
          v-if="article?.status === 'draft'"
          class="btn btn-sm btn-success"
          @click="$emit('move-to-published')"
        >
          <Upload :size="16" class="mr-1" />
          移至發布
        </button>
        <button class="btn btn-sm btn-primary" @click="$emit('toggle-preview')">
          <Eye v-if="!showPreview" :size="16" class="mr-1" />
          <EyeOff v-else :size="16" class="mr-1" />
          {{ showPreview ? '隱藏預覽' : '顯示預覽' }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '@/types'
import { Menu, Edit3, Upload, Eye, EyeOff, FileCode, FileEdit } from 'lucide-vue-next'
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
