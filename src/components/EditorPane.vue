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
        :class="{ 
          'border-error': hasErrors,
          'border-warning': hasWarnings && !hasErrors,
          'editor-with-problems': problemLines.size > 0
        }"
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

      <!-- Syntax Errors and Image Validation Panel -->
      <div
        v-if="syntaxErrors.length > 0 || imageValidationWarnings.length > 0"
        class="absolute bottom-0 left-0 right-0 bg-base-200 border-t border-base-300 max-h-40 overflow-y-auto"
      >
        <div class="p-2">
          <!-- Syntax Errors -->
          <div v-if="syntaxErrors.length > 0" class="mb-2">
            <div class="text-xs font-semibold text-error mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              語法問題 ({{ syntaxErrors.length }})
            </div>
            <div
              v-for="(error, index) in syntaxErrors"
              :key="index"
              class="text-xs mb-1 p-2 rounded border-l-2"
              :class="error.type === 'error' ? 'bg-error/10 border-error text-error' : 'bg-warning/10 border-warning text-warning'"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <span class="font-mono font-semibold">第 {{ error.line }} 行:</span>
                  <span class="ml-1">{{ error.message }}</span>
                </div>
                <div class="ml-2">
                  <div class="badge badge-xs" :class="error.type === 'error' ? 'badge-error' : 'badge-warning'">
                    {{ error.type === 'error' ? '錯誤' : '警告' }}
                  </div>
                </div>
              </div>
              <div v-if="error.suggestion" class="text-xs opacity-70 mt-1 pl-2 border-l border-current/20">
                💡 {{ error.suggestion }}
              </div>
            </div>
          </div>

          <!-- Image Validation Warnings -->
          <div v-if="imageValidationWarnings.length > 0">
            <div class="text-xs font-semibold text-warning mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              圖片驗證 ({{ imageValidationWarnings.length }})
            </div>
            <div
              v-for="(warning, index) in imageValidationWarnings"
              :key="index"
              class="text-xs mb-1 p-2 rounded border-l-2"
              :class="warning.severity === 'error' ? 'bg-error/10 border-error text-error' : 'bg-warning/10 border-warning text-warning'"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <span class="font-mono font-semibold">第 {{ warning.line }} 行:</span>
                  <span class="ml-1">{{ warning.message }}</span>
                </div>
                <div class="ml-2 flex items-center gap-1">
                  <div class="badge badge-xs" :class="warning.type === 'missing-file' ? 'badge-error' : 'badge-warning'">
                    {{ warning.type === 'missing-file' ? '缺失' : '格式' }}
                  </div>
                  <div class="badge badge-xs" :class="warning.severity === 'error' ? 'badge-error' : 'badge-warning'">
                    {{ warning.severity === 'error' ? '錯誤' : '警告' }}
                  </div>
                </div>
              </div>
              <div class="text-xs opacity-70 mt-1 pl-2 border-l border-current/20">
                🖼️ {{ warning.imageName }}
              </div>
              <div v-if="warning.suggestion" class="text-xs opacity-70 mt-1 pl-2 border-l border-current/20">
                💡 {{ warning.suggestion }}
              </div>
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
import type { ImageValidationWarning } from '@/services/ImageService'

interface Props {
  modelValue: string
  showPreview: boolean
  suggestions: SuggestionItem[]
  showSuggestions: boolean
  selectedSuggestionIndex: number
  syntaxErrors: SyntaxError[]
  imageValidationWarnings: ImageValidationWarning[]
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

const hasErrors = computed(() => 
  props.syntaxErrors.some(error => error.type === 'error') ||
  props.imageValidationWarnings.some(warning => warning.severity === 'error')
)

const hasWarnings = computed(() => 
  props.syntaxErrors.some(error => error.type === 'warning') ||
  props.imageValidationWarnings.some(warning => warning.severity === 'warning')
)

const dropdownStyle = computed(() => ({
  top: `${props.dropdownPosition.top}px`,
  left: `${props.dropdownPosition.left}px`
}))

const problemLines = computed(() => {
  const lines = new Set<number>()
  
  // Add syntax error lines
  props.syntaxErrors.forEach(error => {
    lines.add(error.line)
  })
  
  // Add image validation warning lines
  props.imageValidationWarnings.forEach(warning => {
    lines.add(warning.line)
  })
  
  return lines
})

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

.editor-with-problems {
  position: relative;
}

/* Add subtle background highlighting for problematic lines */
.editor-with-problems::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

/* Custom scrollbar for validation panel */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Enhanced validation panel styling */
.border-l-2 {
  transition: all 0.2s ease;
}

.border-l-2:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
