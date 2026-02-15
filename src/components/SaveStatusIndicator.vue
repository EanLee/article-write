<template>
  <div class="flex items-center gap-2" :class="compact ? 'text-xs' : 'text-sm'">
    <!-- Icon Only 模式：僅顯示圖示 -->
    <div v-if="iconOnly" class="tooltip tooltip-bottom" :data-tip="statusText">
      <component :is="statusIcon" :size="compact ? 14 : 16" :class="[iconClass, statusColorClass]" />
    </div>

    <!-- 一般模式：顯示圖示和文字 -->
    <div
      v-else
      class="flex items-center gap-1.5 rounded-lg transition-all font-medium"
      :class="[
        statusClass,
        compact ? 'px-2 py-0.5' : 'px-3 py-1.5 shadow-sm'
      ]"
    >
      <component :is="statusIcon" :size="compact ? 12 : 16" :class="iconClass" />
      <span :class="compact ? 'text-xs' : 'text-sm'">{{ statusText }}</span>
    </div>

    <!-- 最後儲存時間（非緊湊模式且非 icon-only） -->
    <span v-if="!compact && !iconOnly && lastSavedText" class="text-base-content/50 text-xs">
      {{ lastSavedText }}
    </span>

    <!-- 手動儲存按鈕（非 icon-only 模式） -->
    <div v-if="showSaveButton && !iconOnly" class="tooltip tooltip-bottom" data-tip="手動儲存 (Ctrl+S)">
      <button
        :class="[
          compact ? 'btn btn-xs gap-0.5' : 'btn btn-sm gap-1',
          {
            'btn-warning': saveState.status === 'modified',
            'btn-ghost': saveState.status !== 'modified'
          }
        ]"
        :disabled="isSaving"
        @click="handleSave"
      >
        <Save :size="compact ? 12 : 14" />
        <span v-if="!compact" class="hidden sm:inline">儲存</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { Check, Loader2, AlertCircle, FileEdit, Save } from 'lucide-vue-next'
import { autoSaveService } from '@/services/AutoSaveService'

withDefaults(defineProps<{
  showSaveButton?: boolean
  compact?: boolean
  iconOnly?: boolean
}>(), {
  showSaveButton: true,
  compact: false,
  iconOnly: false
})

const emit = defineEmits<{
  save: []
}>()

// 取得儲存狀態
const saveState = computed(() => autoSaveService.saveState.value)

const isSaving = computed(() => saveState.value.status === 'saving')

const statusIcon = computed(() => {
  switch (saveState.value.status) {
    case 'saved':
      return Check
    case 'saving':
      return Loader2
    case 'modified':
      return FileEdit
    case 'error':
      return AlertCircle
    default:
      return Check
  }
})

const statusClass = computed(() => {
  switch (saveState.value.status) {
    case 'saved':
      return 'bg-success/20 text-success border border-success/30'
    case 'saving':
      return 'bg-info/20 text-info border border-info/30'
    case 'modified':
      return 'bg-warning/25 text-warning border border-warning/40'
    case 'error':
      return 'bg-error/20 text-error border border-error/30'
    default:
      return 'bg-base-200 text-base-content/70 border border-base-300'
  }
})

const statusColorClass = computed(() => {
  switch (saveState.value.status) {
    case 'saved':
      return 'text-success'
    case 'saving':
      return 'text-info'
    case 'modified':
      return 'text-warning'
    case 'error':
      return 'text-error'
    default:
      return 'text-base-content/70'
  }
})

const iconClass = computed(() => {
  return saveState.value.status === 'saving' ? 'animate-spin' : ''
})

const statusText = computed(() => {
  switch (saveState.value.status) {
    case 'saved':
      return '已儲存'
    case 'saving':
      return '儲存中...'
    case 'modified':
      return '未儲存'
    case 'error':
      return '儲存失敗'
    default:
      return '已儲存'
  }
})

const lastSavedText = computed(() => {
  if (!saveState.value.lastSavedAt) {
    return ''
  }
  return formatRelativeTime(saveState.value.lastSavedAt)
})

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 10) {
    return '剛剛儲存'
  } else if (diffSec < 60) {
    return `${diffSec} 秒前儲存`
  } else if (diffMin < 60) {
    return `${diffMin} 分鐘前儲存`
  } else if (diffHour < 24) {
    return `${diffHour} 小時前儲存`
  } else {
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

async function handleSave() {
  try {
    await autoSaveService.saveCurrentArticle()
    emit('save')
  } catch (error) {
    console.error('手動儲存失敗:', error)
  }
}

// 監聽鍵盤快捷鍵 Ctrl+S
function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
