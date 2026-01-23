<template>
  <div class="bg-base-200 border-t border-base-300 px-4 py-2 flex items-center justify-between text-xs">
    <!-- 左側：游標位置 -->
    <div class="flex items-center gap-4">
      <!-- 行列位置 -->
      <div class="flex items-center gap-1 text-base-content/70">
        <span>第 {{ lineNumber }} 行</span>
        <span class="text-base-content/40">|</span>
        <span>第 {{ columnNumber }} 列</span>
      </div>

      <!-- 選取資訊 -->
      <div v-if="selectionLength > 0" class="flex items-center gap-1 text-base-content/70">
        <span class="text-base-content/40">|</span>
        <span>已選取 {{ selectionLength }} 字元</span>
      </div>
    </div>

    <!-- 中間：統計資訊 -->
    <div class="flex items-center gap-4">
      <!-- 字數統計 -->
      <div 
        class="tooltip tooltip-top cursor-help" 
        :data-tip="wordCountTooltip"
      >
        <div class="flex items-center gap-1 text-base-content/70">
          <FileText :size="14" />
          <span>{{ wordCount }} 字</span>
        </div>
      </div>

      <!-- 段落數 -->
      <div class="flex items-center gap-1 text-base-content/70">
        <AlignLeft :size="14" />
        <span>{{ paragraphCount }} 段</span>
      </div>

      <!-- 閱讀時間 -->
      <div class="flex items-center gap-1 text-base-content/70">
        <Clock :size="14" />
        <span>約 {{ readingTime }} 分鐘</span>
      </div>
    </div>

    <!-- 右側：編輯器選項 -->
    <div class="flex items-center gap-3">
      <!-- 同步滾動 -->
      <button
        v-if="showPreview"
        class="btn btn-xs btn-ghost gap-1"
        :class="{ 'text-primary': syncScroll }"
        @click="toggleSyncScroll"
        :title="syncScroll ? '停用同步滾動' : '啟用同步滾動'"
      >
        <component :is="syncScroll ? Link : LinkOff" :size="14" />
        <span class="hidden sm:inline">同步滾動</span>
      </button>

      <!-- 顯示行號 -->
      <button
        class="btn btn-xs btn-ghost gap-1"
        :class="{ 'text-primary': showLineNumbers }"
        @click="toggleLineNumbers"
        :title="showLineNumbers ? '隱藏行號' : '顯示行號'"
      >
        <Hash :size="14" />
        <span class="hidden sm:inline">行號</span>
      </button>

      <!-- 自動換行 -->
      <button
        class="btn btn-xs btn-ghost gap-1"
        :class="{ 'text-primary': wordWrap }"
        @click="toggleWordWrap"
        :title="wordWrap ? '停用自動換行' : '啟用自動換行'"
      >
        <WrapText :size="14" />
        <span class="hidden sm:inline">換行</span>
      </button>

      <!-- 編碼 -->
      <div class="text-base-content/50">
        UTF-8
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileText, AlignLeft, Clock, Link, LinkOff, Hash, WrapText } from 'lucide-vue-next'

interface Props {
  content: string
  cursorPosition: number
  selectionStart?: number
  selectionEnd?: number
  showPreview?: boolean
  syncScroll?: boolean
  showLineNumbers?: boolean
  wordWrap?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectionStart: 0,
  selectionEnd: 0,
  showPreview: false,
  syncScroll: false,
  showLineNumbers: false,
  wordWrap: true,
})

const emit = defineEmits<{
  'toggle-sync-scroll': []
  'toggle-line-numbers': []
  'toggle-word-wrap': []
}>()

// 計算游標位置
const lineNumber = computed(() => {
  const textBeforeCursor = props.content.substring(0, props.cursorPosition)
  return (textBeforeCursor.match(/\n/g) || []).length + 1
})

const columnNumber = computed(() => {
  const textBeforeCursor = props.content.substring(0, props.cursorPosition)
  const lastLineBreak = textBeforeCursor.lastIndexOf('\n')
  return props.cursorPosition - lastLineBreak
})

// 選取長度
const selectionLength = computed(() => {
  return Math.abs((props.selectionEnd || 0) - (props.selectionStart || 0))
})

// 字數統計
const wordCount = computed(() => {
  // 移除 Markdown 語法後計算字數
  const cleanText = props.content
    .replace(/```[\s\S]*?```/g, '') // 移除程式碼區塊
    .replace(/`[^`]+`/g, '') // 移除行內程式碼
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除圖片
    .replace(/\[.*?\]\(.*?\)/g, '') // 移除連結
    .replace(/#{1,6}\s/g, '') // 移除標題符號
    .replace(/[*_~`]/g, '') // 移除格式符號
    .trim()

  // 計算中文字數 + 英文單字數
  const chineseChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = cleanText
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0).length

  return chineseChars + englishWords
})

// 段落數
const paragraphCount = computed(() => {
  const paragraphs = props.content
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
  return paragraphs.length
})

// 閱讀時間（假設每分鐘閱讀 300 字）
const readingTime = computed(() => {
  const minutes = Math.ceil(wordCount.value / 300)
  return minutes || 1
})

// Tooltip 詳細資訊
const wordCountTooltip = computed(() => {
  const chars = props.content.length
  const charsNoSpace = props.content.replace(/\s/g, '').length
  return `字數: ${wordCount.value}\n字元: ${chars} (含空格)\n字元: ${charsNoSpace} (不含空格)`
})

function toggleSyncScroll() {
  emit('toggle-sync-scroll')
}

function toggleLineNumbers() {
  emit('toggle-line-numbers')
}

function toggleWordWrap() {
  emit('toggle-word-wrap')
}
</script>
