<template>
  <div :class="showPreview ? 'w-1/2' : 'w-full'" class="flex flex-col">
    <!-- Formatting Toolbar -->
    <div class="bg-base-100 border-b border-base-300 p-2 flex items-center gap-1 flex-wrap">
      <div class="tooltip" data-tip="粗體 (Ctrl+B)">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('**', '**', '粗體文字')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h4.5a3.5 3.5 0 013.5 3.5v.5a3 3 0 01-1.5 2.6A3 3 0 0112 12v.5a3.5 3.5 0 01-3.5 3.5H4a1 1 0 01-1-1V4zm2 1v4h3.5a1.5 1.5 0 000-3H5zm0 6v4h4.5a1.5 1.5 0 000-3H5z"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="斜體 (Ctrl+I)">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('*', '*', '斜體文字')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 1a1 1 0 011 1v1h2a1 1 0 110 2h-.5l-1 8H11a1 1 0 110 2H7a1 1 0 110-2h.5l1-8H8a1 1 0 110-2h2V2a1 1 0 011-1z"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="高亮 (Ctrl+E)">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('==', '==', '高亮文字')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/>
            <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div class="divider divider-horizontal"></div>

      <div class="tooltip" data-tip="Wiki 連結 (Ctrl+K)">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('[[', ']]', '連結文字')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z" clip-rule="evenodd"/>
            <path fill-rule="evenodd" d="M7.414 15.414a2 2 0 01-2.828-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="圖片">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('![[', ']]', '圖片名稱.png')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="程式碼">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('`', '`', '程式碼')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="程式碼區塊">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('```\n', '\n```', '程式碼區塊')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
          </svg>
        </button>
      </div>

      <div class="divider divider-horizontal"></div>

      <div class="tooltip" data-tip="標題 1">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('# ', '', '標題 1')">H1</button>
      </div>

      <div class="tooltip" data-tip="標題 2">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('## ', '', '標題 2')">H2</button>
      </div>

      <div class="tooltip" data-tip="標題 3">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('### ', '', '標題 3')">H3</button>
      </div>

      <div class="divider divider-horizontal"></div>

      <div class="tooltip" data-tip="清單">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('- ', '', '清單項目')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="編號清單">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('1. ', '', '編號項目')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 000 2h.01a1 1 0 100-2H3zM8 5a1 1 0 011-1h8a1 1 0 110 2H9a1 1 0 01-1-1zM3 8a1 1 0 000 2h.01a1 1 0 000-2H3zM9 9a1 1 0 011-1h7a1 1 0 110 2h-7a1 1 0 01-1-1zM3 12a1 1 0 100 2h.01a1 1 0 100-2H3zM9 13a1 1 0 011-1h7a1 1 0 110 2h-7a1 1 0 01-1-1z"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="任務清單">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('- [ ] ', '', '任務項目')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div class="divider divider-horizontal"></div>

      <div class="tooltip" data-tip="表格">
        <button class="btn btn-xs btn-ghost" @click="insertTable">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div class="tooltip" data-tip="目錄">
        <button class="btn btn-xs btn-ghost" @click="insertMarkdown('[[toc]]\n\n', '', '')">TOC</button>
      </div>
    </div>

    <!-- Editor Textarea -->
    <div class="flex-1 p-4 relative">
      <textarea
        ref="editorRef"
        :value="modelValue"
        class="textarea textarea-bordered w-full h-full resize-none font-mono text-sm leading-relaxed"
        :class="{ 'border-error': hasErrors }"
        placeholder="開始撰寫您的文章..."
        @input="handleInput"
        @keydown="handleKeydown"
        @click="handleCursorChange"
        @keyup="handleCursorChange"
      ></textarea>

      <!-- Autocomplete Dropdown -->
      <div
        v-if="showSuggestions && suggestions.length > 0"
        class="absolute bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        :style="dropdownStyle"
      >
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          class="px-3 py-2 cursor-pointer hover:bg-base-200 flex items-center justify-between"
          :class="{ 'bg-primary text-primary-content': index === selectedSuggestionIndex }"
          @click="applySuggestion(suggestion)"
        >
          <div class="flex items-center">
            <span class="mr-2">
              <svg v-if="suggestion.type === 'wikilink'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z"/>
                <path d="M7.414 15.414a2 2 0 01-2.828-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5z"/>
              </svg>
              <svg v-else-if="suggestion.type === 'image'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
              </svg>
              <svg v-else-if="suggestion.type === 'tag'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
              </svg>
            </span>
            <div>
              <div class="font-medium">{{ suggestion.displayText }}</div>
              <div v-if="suggestion.description" class="text-xs opacity-70">{{ suggestion.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Syntax Errors Panel -->
      <div
        v-if="syntaxErrors.length > 0"
        class="absolute bottom-0 left-0 right-0 bg-error/10 border-t border-error/20 max-h-32 overflow-y-auto"
      >
        <div class="p-2">
          <div class="text-xs font-semibold text-error mb-1">語法問題</div>
          <div
            v-for="(error, index) in syntaxErrors"
            :key="index"
            class="text-xs mb-1 p-1 rounded"
            :class="error.type === 'error' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'"
          >
            <span class="font-mono">第 {{ error.line }} 行:</span>
            {{ error.message }}
            <div v-if="error.suggestion" class="text-xs opacity-70 mt-1">
              💡 {{ error.suggestion }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SuggestionItem, SyntaxError } from '@/services/ObsidianSyntaxService'

interface Props {
  modelValue: string
  showPreview: boolean
  suggestions: SuggestionItem[]
  showSuggestions: boolean
  selectedSuggestionIndex: number
  syntaxErrors: SyntaxError[]
  dropdownPosition: { top: number; left: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'insert-markdown': [before: string, after: string, placeholder: string]
  'insert-table': []
  'keydown': [event: KeyboardEvent]
  'cursor-change': []
  'apply-suggestion': [suggestion: SuggestionItem]
}>()

const editorRef = ref<HTMLTextAreaElement>()

const hasErrors = computed(() => props.syntaxErrors.some(error => error.type === 'error'))

const dropdownStyle = computed(() => ({
  top: `${props.dropdownPosition.top}px`,
  left: `${props.dropdownPosition.left}px`
}))

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event)
}

function handleCursorChange() {
  emit('cursor-change')
}

function insertMarkdown(before: string, after: string, placeholder: string) {
  emit('insert-markdown', before, after, placeholder)
}

function insertTable() {
  emit('insert-table')
}

function applySuggestion(suggestion: SuggestionItem) {
  emit('apply-suggestion', suggestion)
}

defineExpose({
  editorRef
})
</script>

<style scoped>
.textarea {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  line-height: 1.6;
}
</style>
