<template>
  <div
    v-if="visible"
    class="absolute top-0 left-0 right-0 bg-base-100 border-b border-base-300 shadow-lg z-40 p-3"
  >
    <div class="flex flex-col gap-2">
      <!-- 搜尋列 -->
      <div class="flex items-center gap-2">
        <div class="flex-1 flex items-center gap-2">
          <!-- 搜尋輸入框 -->
          <div class="relative flex-1">
            <input
              ref="searchInputRef"
              v-model="searchText"
              type="text"
              class="input input-sm input-bordered w-full pr-24"
              :class="{ 'input-error': searchText && matchCount === 0 }"
              placeholder="搜尋..."
              @input="handleSearch"
              @keydown.enter="findNext"
              @keydown.shift.enter="findPrevious"
              @keydown.esc="close"
            />
            <!-- 匹配計數 -->
            <span
              v-if="searchText"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              :class="matchCount === 0 ? 'text-error' : 'text-base-content/60'"
            >
              {{ currentMatchIndex > 0 ? `${currentMatchIndex}/${matchCount}` : `${matchCount} 個匹配` }}
            </span>
          </div>

          <!-- 導航按鈕 -->
          <div class="btn-group">
            <button
              class="btn btn-sm btn-square"
              :disabled="matchCount === 0"
              @click="findPrevious"
              title="上一個 (Shift+Enter)"
            >
              <ChevronUp :size="16" />
            </button>
            <button
              class="btn btn-sm btn-square"
              :disabled="matchCount === 0"
              @click="findNext"
              title="下一個 (Enter)"
            >
              <ChevronDown :size="16" />
            </button>
          </div>

          <!-- 選項按鈕 -->
          <div class="btn-group">
            <button
              class="btn btn-sm"
              :class="{ 'btn-active': caseSensitive }"
              @click="caseSensitive = !caseSensitive"
              title="區分大小寫"
            >
              Aa
            </button>
            <button
              class="btn btn-sm"
              :class="{ 'btn-active': useRegex }"
              @click="useRegex = !useRegex"
              title="使用正則表達式"
            >
              .*
            </button>
            <button
              class="btn btn-sm"
              :class="{ 'btn-active': wholeWord }"
              @click="wholeWord = !wholeWord"
              title="全字匹配"
            >
              ab
            </button>
          </div>

          <!-- 替換切換 -->
          <button
            class="btn btn-sm btn-square"
            :class="{ 'btn-active': showReplace }"
            @click="showReplace = !showReplace"
            title="切換替換模式"
          >
            <Replace :size="16" />
          </button>

          <!-- 關閉按鈕 -->
          <button
            class="btn btn-sm btn-square btn-ghost"
            @click="close"
            title="關閉 (Esc)"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <!-- 替換列 -->
      <div v-if="showReplace" class="flex items-center gap-2">
        <div class="flex-1 flex items-center gap-2">
          <!-- 替換輸入框 -->
          <input
            v-model="replaceText"
            type="text"
            class="input input-sm input-bordered flex-1"
            placeholder="替換為..."
            @keydown.enter="replaceNext"
            @keydown.esc="close"
          />

          <!-- 替換按鈕 -->
          <button
            class="btn btn-sm"
            :disabled="matchCount === 0"
            @click="replaceNext"
          >
            替換
          </button>
          <button
            class="btn btn-sm"
            :disabled="matchCount === 0"
            @click="replaceAll"
          >
            全部替換
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ChevronUp, ChevronDown, Replace, X } from 'lucide-vue-next'

interface Props {
  visible: boolean
  content: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  replace: [searchText: string, replaceText: string, replaceAll: boolean]
  highlight: [matches: Array<{ start: number; end: number }>, currentIndex: number]
}>()

// Refs
const searchInputRef = ref<HTMLInputElement>()

// 搜尋狀態
const searchText = ref('')
const replaceText = ref('')
const showReplace = ref(false)
const caseSensitive = ref(false)
const useRegex = ref(false)
const wholeWord = ref(false)

// 匹配結果
const matches = ref<Array<{ start: number; end: number }>>([])
const currentMatchIndex = ref(0)
const matchCount = ref(0)

// 搜尋邏輯
function handleSearch() {
  if (!searchText.value) {
    matches.value = []
    matchCount.value = 0
    currentMatchIndex.value = 0
    return
  }

  try {
    findMatches()
  } catch (error) {
    console.error('搜尋錯誤:', error)
    matches.value = []
    matchCount.value = 0
  }
}

function findMatches() {
  matches.value = []
  
  let pattern: string | RegExp = searchText.value

  // 構建搜尋模式
  if (useRegex.value) {
    try {
      const flags = caseSensitive.value ? 'g' : 'gi'
      pattern = new RegExp(searchText.value, flags)
    } catch {
      return // 無效的正則表達式
    }
  } else {
    // 轉義特殊字元
    pattern = searchText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // 全字匹配
    if (wholeWord.value) {
      pattern = `\\b${pattern}\\b`
    }
    
    const flags = caseSensitive.value ? 'g' : 'gi'
    pattern = new RegExp(pattern, flags)
  }

  // 執行搜尋
  const content = props.content
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    matches.value.push({
      start: match.index,
      end: match.index + match[0].length,
    })
    
    // 防止無限迴圈（零長度匹配）
    if (match[0].length === 0) {
      pattern.lastIndex++
    }
  }

  matchCount.value = matches.value.length
  currentMatchIndex.value = matchCount.value > 0 ? 1 : 0

  // 通知父組件高亮匹配結果
  emit('highlight', matches.value, 0)
}

function findNext() {
  if (matchCount.value === 0) return

  currentMatchIndex.value = currentMatchIndex.value >= matchCount.value ? 1 : currentMatchIndex.value + 1
  emit('highlight', matches.value, currentMatchIndex.value - 1)
}

function findPrevious() {
  if (matchCount.value === 0) return

  currentMatchIndex.value = currentMatchIndex.value <= 1 ? matchCount.value : currentMatchIndex.value - 1
  emit('highlight', matches.value, currentMatchIndex.value - 1)
}

function replaceNext() {
  if (matchCount.value === 0) return
  emit('replace', searchText.value, replaceText.value, false)
  
  // 重新搜尋
  nextTick(() => {
    handleSearch()
  })
}

function replaceAll() {
  if (matchCount.value === 0) return
  
  const confirmed = confirm(`確定要替換全部 ${matchCount.value} 個匹配項嗎？`)
  if (!confirmed) return

  emit('replace', searchText.value, replaceText.value, true)
  
  // 重新搜尋
  nextTick(() => {
    handleSearch()
  })
}

function close() {
  emit('close')
}

// 監聽搜尋選項變化
watch([caseSensitive, useRegex, wholeWord], () => {
  if (searchText.value) {
    handleSearch()
  }
})

// 監聽 visible 變化，自動 focus
watch(() => props.visible, (visible) => {
  if (visible) {
    nextTick(() => {
      searchInputRef.value?.focus()
      searchInputRef.value?.select()
    })
  }
})

// 監聽內容變化，重新搜尋
watch(() => props.content, () => {
  if (searchText.value) {
    handleSearch()
  }
})
</script>

<style scoped>
/* 確保搜尋面板在編輯器上方 */
</style>
