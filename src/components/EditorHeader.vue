<template>
  <header class="bg-base-200 border-b border-base-300 p-4">
    <div class="flex justify-between items-center">
      <div class="flex-1">
        <h2 class="text-lg font-semibold mb-2">{{ article?.title }}</h2>
        <div class="flex items-center gap-3 text-sm">
          <div
            class="badge"
            :class="article?.status === 'published' ? 'badge-success' : 'badge-info'"
          >
            {{ statusText }}
          </div>
          <span class="badge badge-outline">{{ article?.category }}</span>
          <span class="text-base-content/70">
            最後修改: {{ formatDate(article?.lastModified) }}
          </span>
        </div>
      </div>

      <div class="flex gap-2">
        <button class="btn btn-sm btn-outline" @click="$emit('edit-frontmatter')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          編輯前置資料
        </button>
        <button
          v-if="article?.status === 'draft'"
          class="btn btn-sm btn-success"
          @click="$emit('move-to-published')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          移至發布
        </button>
        <button class="btn btn-sm btn-primary" @click="$emit('toggle-preview')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {{ showPreview ? '隱藏預覽' : '顯示預覽' }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '@/types'

interface Props {
  article: Article | null
  showPreview: boolean
}

const props = defineProps<Props>()

defineEmits<{
  'toggle-preview': []
  'edit-frontmatter': []
  'move-to-published': []
}>()

const statusText = computed(() => {
  return props.article?.status === 'published' ? '已發布' : '草稿'
})

function formatDate(date?: Date): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>
