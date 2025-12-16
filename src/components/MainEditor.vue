<template>
  <div class="h-full flex flex-col">
    <!-- Editor Header -->
    <header class="bg-base-200 border-b border-base-300 p-4">
      <div class="flex justify-between items-center">
        <div class="flex-1">
          <h2 class="text-lg font-semibold mb-2">{{ articleStore.currentArticle?.title }}</h2>
          <div class="flex items-center gap-3 text-sm">
            <div 
              class="badge"
              :class="articleStore.currentArticle?.status === 'published' ? 'badge-success' : 'badge-info'"
            >
              {{ statusText }}
            </div>
            <span class="badge badge-outline">{{ articleStore.currentArticle?.category }}</span>
            <span class="text-base-content/70">
              最後修改: {{ formatDate(articleStore.currentArticle?.lastModified) }}
            </span>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button class="btn btn-sm btn-outline" @click="showFrontmatterEditor = true">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            編輯前置資料
          </button>
          <button 
            v-if="articleStore.currentArticle?.status === 'draft'"
            class="btn btn-sm btn-success"
            @click="moveToPublished"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            移至發布
          </button>
          <button class="btn btn-sm btn-primary" @click="togglePreview">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {{ showPreview ? '隱藏預覽' : '顯示預覽' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Editor Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Markdown Editor -->
      <div :class="showPreview ? 'w-1/2' : 'w-full'" class="flex flex-col">
        <!-- Formatting Toolbar -->
        <div class="bg-base-100 border-b border-base-300 p-2 flex items-center gap-1 flex-wrap">
          <div class="tooltip" data-tip="粗體 (Ctrl+B)">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('**', '**', '粗體文字')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h4.5a3.5 3.5 0 013.5 3.5v.5a3 3 0 01-1.5 2.6A3 3 0 0112 12v.5a3.5 3.5 0 01-3.5 3.5H4a1 1 0 01-1-1V4zm2 1v4h3.5a1.5 1.5 0 000-3H5zm0 6v4h4.5a1.5 1.5 0 000-3H5z"/>
              </svg>
            </button>
          </div>
          
          <div class="tooltip" data-tip="斜體 (Ctrl+I)">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('*', '*', '斜體文字')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 1a1 1 0 011 1v1h2a1 1 0 110 2h-.5l-1 8H11a1 1 0 110 2H7a1 1 0 110-2h.5l1-8H8a1 1 0 110-2h2V2a1 1 0 011-1z"/>
              </svg>
            </button>
          </div>
          
          <div class="tooltip" data-tip="高亮 (Ctrl+E)">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('==', '==', '高亮文字')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/>
                <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <div class="divider divider-horizontal"></div>
          
          <div class="tooltip" data-tip="Wiki 連結 (Ctrl+K)">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('[[', ']]', '連結文字')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z" clip-rule="evenodd"/>
                <path fill-rule="evenodd" d="M7.414 15.414a2 2 0 01-2.828-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <div class="tooltip" data-tip="圖片">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('![[', ']]', '圖片名稱.png')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <div class="tooltip" data-tip="程式碼">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('`', '`', '程式碼')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <div class="tooltip" data-tip="程式碼區塊">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('```\n', '\n```', '程式碼區塊')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
            </button>
          </div>
          
          <div class="divider divider-horizontal"></div>
          
          <div class="tooltip" data-tip="標題 1">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('# ', '', '標題 1')">
              H1
            </button>
          </div>
          
          <div class="tooltip" data-tip="標題 2">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('## ', '', '標題 2')">
              H2
            </button>
          </div>
          
          <div class="tooltip" data-tip="標題 3">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('### ', '', '標題 3')">
              H3
            </button>
          </div>
          
          <div class="divider divider-horizontal"></div>
          
          <div class="tooltip" data-tip="清單">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('- ', '', '清單項目')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <div class="tooltip" data-tip="編號清單">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('1. ', '', '編號項目')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 000 2h.01a1 1 0 100-2H3zM8 5a1 1 0 011-1h8a1 1 0 110 2H9a1 1 0 01-1-1zM3 8a1 1 0 000 2h.01a1 1 0 000-2H3zM9 9a1 1 0 011-1h7a1 1 0 110 2h-7a1 1 0 01-1-1zM3 12a1 1 0 100 2h.01a1 1 0 100-2H3zM9 13a1 1 0 011-1h7a1 1 0 110 2h-7a1 1 0 01-1-1z"/>
              </svg>
            </button>
          </div>
          
          <div class="tooltip" data-tip="任務清單">
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('- [ ] ', '', '任務項目')">
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
            <button class="btn btn-xs btn-ghost" @click="insertMarkdownSyntax('[[toc]]\n\n', '', '')">
              TOC
            </button>
          </div>
        </div>
        
        <div class="flex-1 p-4 relative">
          <textarea
            ref="editorRef"
            v-model="content"
            class="textarea textarea-bordered w-full h-full resize-none font-mono text-sm leading-relaxed"
            :class="{ 'border-error': hasErrors }"
            placeholder="開始撰寫您的文章..."
            @input="handleContentChange"
            @keydown="handleKeydown"
            @click="updateAutocomplete"
            @keyup="updateAutocomplete"
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

      <!-- Preview Pane -->
      <div v-if="showPreview" class="w-1/2 border-l border-base-300 bg-base-50 flex flex-col">
        <!-- Preview Header with Stats -->
        <div class="bg-base-200 p-3 border-b border-base-300">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-semibold">預覽</h3>
            <div class="flex gap-2 text-xs">
              <span class="badge badge-outline">{{ previewStats.wordCount }} 字</span>
              <span class="badge badge-outline">{{ previewStats.readingTime }} 分鐘</span>
            </div>
          </div>
          
          <!-- Validation Status -->
          <div v-if="previewValidation.invalidImages.length > 0 || previewValidation.invalidLinks.length > 0" class="flex gap-2 text-xs">
            <div v-if="previewValidation.invalidImages.length > 0" class="badge badge-error badge-sm">
              {{ previewValidation.invalidImages.length }} 無效圖片
            </div>
            <div v-if="previewValidation.invalidLinks.length > 0" class="badge badge-warning badge-sm">
              {{ previewValidation.invalidLinks.length }} 無效連結
            </div>
          </div>
        </div>

        <!-- Preview Content -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-4 prose prose-sm max-w-none markdown-preview obsidian-preview" v-html="renderedContent"></div>
        </div>

        <!-- Preview Footer with Detailed Stats -->
        <div class="bg-base-200 border-t border-base-300 p-2 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="text-base-content/70">字符: </span>
              <span>{{ previewStats.characterCount }}</span>
            </div>
            <div>
              <span class="text-base-content/70">圖片: </span>
              <span>{{ previewStats.imageCount }}</span>
            </div>
            <div>
              <span class="text-base-content/70">連結: </span>
              <span>{{ previewStats.linkCount }}</span>
            </div>
            <div>
              <span class="text-base-content/70">閱讀: </span>
              <span>~{{ previewStats.readingTime }}min</span>
            </div>
          </div>
          
          <!-- Validation Details (Collapsible) -->
          <div v-if="previewValidation.invalidImages.length > 0 || previewValidation.invalidLinks.length > 0" class="mt-2">
            <details class="collapse collapse-arrow bg-base-100">
              <summary class="collapse-title text-xs font-medium">驗證詳情</summary>
              <div class="collapse-content text-xs">
                <div v-if="previewValidation.invalidImages.length > 0" class="mb-2">
                  <div class="font-medium text-error">無效圖片:</div>
                  <ul class="list-disc list-inside ml-2">
                    <li v-for="img in previewValidation.invalidImages" :key="img" class="text-error">{{ img }}</li>
                  </ul>
                </div>
                <div v-if="previewValidation.invalidLinks.length > 0">
                  <div class="font-medium text-warning">無效連結:</div>
                  <ul class="list-disc list-inside ml-2">
                    <li v-for="link in previewValidation.invalidLinks" :key="link" class="text-warning">{{ link }}</li>
                  </ul>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>

    <!-- Frontmatter Editor Modal -->
    <FrontmatterEditor 
      v-model="showFrontmatterEditor"
      :article="articleStore.currentArticle"
      @update="handleFrontmatterUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useArticleStore } from '@/stores/article'
import { useConfigStore } from '@/stores/config'
import FrontmatterEditor from './FrontmatterEditor.vue'
import { ObsidianSyntaxService } from '@/services/ObsidianSyntaxService'
import { MarkdownService } from '@/services/MarkdownService'
import { PreviewService } from '@/services/PreviewService'
import type { Article } from '@/types'
import type { SuggestionItem, SyntaxError, AutocompleteContext } from '@/services/ObsidianSyntaxService'

const articleStore = useArticleStore()
const configStore = useConfigStore()

// Initialize services
const obsidianSyntax = new ObsidianSyntaxService()
const markdownService = new MarkdownService()
const previewService = new PreviewService()

// Reactive data
const content = ref('')
const showPreview = ref(false)
const showFrontmatterEditor = ref(false)
const renderedContent = ref('')
const autoSaveTimer = ref<number | null>(null)

// Obsidian syntax support data
const editorRef = ref<HTMLTextAreaElement>()
const suggestions = ref<SuggestionItem[]>([])
const showSuggestions = ref(false)
const selectedSuggestionIndex = ref(0)
const syntaxErrors = ref<SyntaxError[]>([])
const dropdownPosition = ref({ top: 0, left: 0 })
const imageFiles = ref<string[]>([])
const allTags = ref<string[]>([])

// Preview statistics and validation
const previewStats = ref({
  wordCount: 0,
  characterCount: 0,
  readingTime: 0,
  imageCount: 0,
  linkCount: 0
})
const previewValidation = ref({
  validImages: [] as string[],
  invalidImages: [] as string[],
  validLinks: [] as string[],
  invalidLinks: [] as string[]
})

// Validation timer
let validationTimeout: number | null = null

// Computed properties
const statusText = computed(() => {
  return articleStore.currentArticle?.status === 'published' ? '已發布' : '草稿'
})

const hasErrors = computed(() => syntaxErrors.value.some(error => error.type === 'error'))

const dropdownStyle = computed(() => ({
  top: `${dropdownPosition.value.top}px`,
  left: `${dropdownPosition.value.left}px`
}))

// Methods
function handleContentChange(event?: Event) {
  const target = event?.target as HTMLTextAreaElement
  if (target) {
    content.value = target.value
  }
  
  if (articleStore.currentArticle) {
    articleStore.currentArticle.content = content.value
    scheduleAutoSave()
  }
  
  if (showPreview.value) {
    updatePreview()
  }
  
  // Trigger autocomplete and validation
  updateAutocomplete()
  debounceValidation()
}

function scheduleAutoSave() {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  autoSaveTimer.value = setTimeout(() => {
    saveArticle()
  }, 2000) // Auto-save after 2 seconds of inactivity
}

async function saveArticle() {
  if (articleStore.currentArticle) {
    try {
      await articleStore.updateArticle(articleStore.currentArticle)
    } catch {
      // 靜默處理錯誤，自動儲存失敗不需要通知用戶
    }
  }
}

async function moveToPublished() {
  if (articleStore.currentArticle) {
    try {
      await articleStore.moveToPublished(articleStore.currentArticle.id)
    } catch {
      // Failed to move article to published
    }
  }
}

function togglePreview() {
  showPreview.value = !showPreview.value
  if (showPreview.value) {
    updatePreview()
  }
}

function updatePreview() {
  // Use enhanced PreviewService for rendering Obsidian format content
  try {
    const vaultPath = configStore.config.paths.obsidianVault
    const imageBasePath = vaultPath ? `${vaultPath}/images` : './images'
    
    // Update preview service with current context
    previewService.updateArticles(articleStore.articles)
    previewService.setImageBasePath(imageBasePath)
    
    // Render with full Obsidian syntax support
    renderedContent.value = previewService.renderPreview(content.value, {
      enableObsidianSyntax: true,
      enableImagePreview: true,
      enableWikiLinks: true,
      baseImagePath: imageBasePath,
      articleList: articleStore.articles
    })

    // Update preview statistics and validation
    previewStats.value = previewService.getPreviewStats(content.value)
    previewValidation.value = previewService.validatePreviewContent(content.value)
  } catch (error) {
    
    // Fallback to basic MarkdownService rendering
    try {
      renderedContent.value = markdownService.renderForPreview(content.value, true)
    } catch {
      // Final fallback to simple HTML conversion
      renderedContent.value = content.value
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/gim, '<br>')
    }
    
    // Reset stats on error
    previewStats.value = {
      wordCount: 0,
      characterCount: 0,
      readingTime: 0,
      imageCount: 0,
      linkCount: 0
    }
    previewValidation.value = {
      validImages: [],
      invalidImages: [],
      validLinks: [],
      invalidLinks: []
    }
  }
}

function handleFrontmatterUpdate(updatedArticle: Article) {
  articleStore.updateArticle(updatedArticle)
}

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

// Enhanced keyboard handling with shortcuts
function handleKeydown(event: KeyboardEvent) {
  // Handle autocomplete suggestions first
  if (showSuggestions.value && suggestions.value.length > 0) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedSuggestionIndex.value = Math.min(
          selectedSuggestionIndex.value + 1,
          suggestions.value.length - 1
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
        break
      case 'Enter':
      case 'Tab':
        event.preventDefault()
        applySuggestion(suggestions.value[selectedSuggestionIndex.value])
        break
      case 'Escape':
        hideSuggestions()
        break
    }
    return
  }

  // Enhanced keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 's':
        event.preventDefault()
        saveArticle()
        break
      case 'b':
        event.preventDefault()
        insertMarkdownSyntax('**', '**', '粗體文字')
        break
      case 'i':
        event.preventDefault()
        insertMarkdownSyntax('*', '*', '斜體文字')
        break
      case 'k':
        event.preventDefault()
        insertMarkdownSyntax('[[', ']]', '連結文字')
        break
      case 'e':
        event.preventDefault()
        insertMarkdownSyntax('==', '==', '高亮文字')
        break
      case '/':
        event.preventDefault()
        togglePreview()
        break
    }
  }

  // Auto-pairing for brackets and quotes
  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    const textarea = event.target as HTMLTextAreaElement
    const { selectionStart } = textarea
    
    switch (event.key) {
      case '[':
        if (textarea.value[selectionStart - 1] === '[') {
          event.preventDefault()
          insertMarkdownSyntax('', ']]', '')
        }
        break
      case '(':
        event.preventDefault()
        insertMarkdownSyntax('(', ')', '')
        break
      case '"':
        event.preventDefault()
        insertMarkdownSyntax('"', '"', '')
        break
      case "'":
        event.preventDefault()
        insertMarkdownSyntax("'", "'", '')
        break
      case '`':
        event.preventDefault()
        if (selectionStart > 0 && textarea.value[selectionStart - 1] === '`') {
          insertMarkdownSyntax('`', '```', '')
        } else {
          insertMarkdownSyntax('`', '`', '')
        }
        break
    }
  }
}

function updateAutocomplete() {
  if (!editorRef.value) {
    return
  }

  const textarea = editorRef.value
  const cursorPosition = textarea.selectionStart
  const text = textarea.value
  
  // 建立自動完成上下文
  const context: AutocompleteContext = {
    text,
    cursorPosition,
    lineNumber: text.substring(0, cursorPosition).split('\n').length,
    columnNumber: cursorPosition - text.lastIndexOf('\n', cursorPosition - 1)
  }

  // 使用 ObsidianSyntaxService 取得建議
  suggestions.value = obsidianSyntax.getAutocompleteSuggestions(context)
  
  if (suggestions.value.length > 0) {
    selectedSuggestionIndex.value = 0
    showSuggestions.value = true
    updateDropdownPosition()
  } else {
    hideSuggestions()
  }
}

// These functions are now handled by ObsidianSyntaxService

function updateDropdownPosition() {
  if (!editorRef.value) {
    return
  }

  const textarea = editorRef.value
  const cursorPosition = textarea.selectionStart
  
  // 使用 ObsidianSyntaxService 計算下拉選單位置
  dropdownPosition.value = obsidianSyntax.calculateDropdownPosition(textarea, cursorPosition)
}

function applySuggestion(suggestion: SuggestionItem) {
  if (!editorRef.value) {
    return
  }

  const textarea = editorRef.value
  const cursorPosition = textarea.selectionStart
  
  // 使用 ObsidianSyntaxService 應用建議
  const newText = obsidianSyntax.applySuggestionToText(textarea, suggestion, cursorPosition)
  content.value = newText
  
  if (articleStore.currentArticle) {
    articleStore.currentArticle.content = newText
  }

  hideSuggestions()
}

function hideSuggestions() {
  showSuggestions.value = false
  suggestions.value = []
  selectedSuggestionIndex.value = 0
}

function insertMarkdownSyntax(before: string, after: string, placeholder: string) {
  if (!editorRef.value) {return}

  const textarea = editorRef.value
  const { selectionStart, selectionEnd } = textarea
  const selectedText = textarea.value.substring(selectionStart, selectionEnd)
  const textToInsert = selectedText || placeholder
  
  const beforeText = textarea.value.substring(0, selectionStart)
  const afterText = textarea.value.substring(selectionEnd)
  
  const newText = beforeText + before + textToInsert + after + afterText
  content.value = newText
  
  if (articleStore.currentArticle) {
    articleStore.currentArticle.content = newText
  }
  
  // Set cursor position
  const newCursorStart = selectionStart + before.length
  const newCursorEnd = newCursorStart + textToInsert.length
  
  setTimeout(() => {
    textarea.setSelectionRange(newCursorStart, newCursorEnd)
    textarea.focus()
  }, 0)
  
  handleContentChange()
}

function insertTable() {
  const tableTemplate = `| 標題1 | 標題2 | 標題3 |
|-------|-------|-------|
| 內容1 | 內容2 | 內容3 |
| 內容4 | 內容5 | 內容6 |

`
  insertMarkdownSyntax('', '', tableTemplate)
}

function debounceValidation() {
  if (validationTimeout) {
    clearTimeout(validationTimeout)
  }
  
  validationTimeout = setTimeout(() => {
    validateSyntax()
  }, 500) // 500ms debounce
}

function validateSyntax() {
  // 使用 ObsidianSyntaxService 和 MarkdownService 進行語法驗證
  const obsidianErrors = obsidianSyntax.validateSyntax(content.value)
  const markdownErrors = markdownService.validateMarkdownSyntax(content.value)
  
  // 合併兩種驗證結果
  syntaxErrors.value = [
    ...obsidianErrors,
    ...markdownErrors.map(error => ({
      line: error.line,
      column: 0, // MarkdownService doesn't provide column info
      message: error.message,
      type: error.type as 'error' | 'warning',
      suggestion: ''
    }))
  ]
}

async function initializeObsidianSupport() {
  try {
    // 更新 ObsidianSyntaxService 的文章清單
    obsidianSyntax.updateArticles(articleStore.articles)
    
    // Update tags from articles
    const tagSet = new Set<string>()
    articleStore.articles.forEach((article: Article) => {
      article.frontmatter.tags.forEach((tag: string) => tagSet.add(tag))
    })
    allTags.value = Array.from(tagSet)
    
    // Update image files using Electron API
    const vaultPath = configStore.config.paths.obsidianVault
    if (vaultPath && window.electronAPI) {
      const imagesPath = `${vaultPath}/images`
      try {
        const files = await window.electronAPI.readDirectory(imagesPath)
        // Filter image files
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']
        imageFiles.value = files.filter(file => {
          const ext = file.toLowerCase().substring(file.lastIndexOf('.'))
          return imageExtensions.includes(ext)
        })
        
        // 更新 ObsidianSyntaxService 的圖片檔案清單
        obsidianSyntax.updateImageFiles(imageFiles.value)
      } catch {
        // Images directory might not exist
        imageFiles.value = []
        obsidianSyntax.updateImageFiles([])
      }
    }
  } catch {
    // Failed to initialize Obsidian support
  }
}

// Watch for article changes
watch(
  () => articleStore.currentArticle,
  (newArticle) => {
    if (newArticle) {
      content.value = newArticle.content
      if (showPreview.value) {
        updatePreview()
      }
    }
  },
  { immediate: true }
)

// Watch for articles changes to update tags and ObsidianSyntaxService
watch(() => articleStore.articles, () => {
  // 更新 ObsidianSyntaxService 的文章清單
  obsidianSyntax.updateArticles(articleStore.articles)
  
  const tagSet = new Set<string>()
  articleStore.articles.forEach((article: Article) => {
    article.frontmatter.tags.forEach((tag: string) => tagSet.add(tag))
  })
  allTags.value = Array.from(tagSet)
}, { deep: true })

// Watch for vault path changes to update image files
watch(() => configStore.config.paths.obsidianVault, async (newPath) => {
  if (newPath && window.electronAPI) {
    try {
      const imagesPath = `${newPath}/images`
      const files = await window.electronAPI.readDirectory(imagesPath)
      // Filter image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']
      imageFiles.value = files.filter(file => {
        const ext = file.toLowerCase().substring(file.lastIndexOf('.'))
        return imageExtensions.includes(ext)
      })
      
      // 更新 ObsidianSyntaxService 的圖片檔案清單
      obsidianSyntax.updateImageFiles(imageFiles.value)
    } catch {
      // Images directory might not exist or failed to read
      imageFiles.value = []
      obsidianSyntax.updateImageFiles([])
    }
  }
})

// Lifecycle
onMounted(() => {
  initializeObsidianSupport()
  
  // Initial syntax validation
  validateSyntax()
  
  // Click outside to hide suggestions
  document.addEventListener('click', (event) => {
    if (!editorRef.value?.contains(event.target as Node)) {
      hideSuggestions()
    }
  })
})

// Cleanup
onUnmounted(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  if (validationTimeout) {
    clearTimeout(validationTimeout)
  }
})
</script>

<style scoped>
/* Enhanced Markdown Editor Styles */

/* Syntax highlighting for code blocks */
.markdown-preview :deep(pre) {
  background-color: #f2f2f2;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

.markdown-preview :deep(code) {
  background-color: #f2f2f2;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

/* Enhanced Obsidian-style elements */
.obsidian-preview :deep(.obsidian-wikilink) {
  color: #3b82f6;
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
  transition: all 0.2s ease;
}

.obsidian-preview :deep(.obsidian-wikilink:hover) {
  text-decoration-style: solid;
  background-color: rgba(59, 130, 246, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.obsidian-preview :deep(.obsidian-wikilink-valid) {
  color: #059669;
  border-bottom: 1px solid #059669;
}

.obsidian-preview :deep(.obsidian-wikilink-invalid) {
  color: #dc2626;
  border-bottom: 1px dashed #dc2626;
}

.obsidian-preview :deep(.obsidian-image) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.obsidian-preview :deep(.obsidian-image:hover) {
  transform: scale(1.02);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.obsidian-preview :deep(.obsidian-tag) {
  display: inline-block;
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0.125rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.obsidian-preview :deep(.obsidian-highlight) {
  background-color: rgba(251, 191, 36, 0.3);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  box-decoration-break: clone;
}

/* Obsidian embed blocks */
.obsidian-preview :deep(.obsidian-embed) {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin: 1rem 0;
  overflow: hidden;
  background-color: #f9fafb;
}

.obsidian-preview :deep(.obsidian-embed-header) {
  background-color: #f3f4f6;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 1px solid #e5e7eb;
}

.obsidian-preview :deep(.obsidian-embed-content) {
  padding: 0.75rem;
  font-style: italic;
  color: #6b7280;
}

/* Obsidian callouts */
.obsidian-preview :deep(.obsidian-callout) {
  border-left: 4px solid #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0 0.5rem 0.5rem 0;
}

.obsidian-preview :deep(.obsidian-callout-note) {
  border-left-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
}

.obsidian-preview :deep(.obsidian-callout-warning) {
  border-left-color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.05);
}

.obsidian-preview :deep(.obsidian-callout-error) {
  border-left-color: #dc2626;
  background-color: rgba(220, 38, 38, 0.05);
}

.obsidian-preview :deep(.obsidian-callout-success) {
  border-left-color: #059669;
  background-color: rgba(5, 150, 105, 0.05);
}

/* Enhanced task lists */
.obsidian-preview :deep(.obsidian-task) {
  margin-right: 0.5rem;
  transform: scale(1.1);
}

/* Code block enhancements */
.obsidian-preview :deep(.code-block-wrapper) {
  position: relative;
  margin: 1rem 0;
}

.obsidian-preview :deep(.code-block-header) {
  background-color: #374151;
  padding: 0.5rem;
  border-radius: 0.5rem 0.5rem 0 0;
  display: flex;
  justify-content: flex-end;
}

.obsidian-preview :deep(.code-copy-btn) {
  background-color: #4b5563;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.obsidian-preview :deep(.code-copy-btn:hover) {
  background-color: #6b7280;
}

/* Table enhancements */
.obsidian-preview :deep(.table-wrapper) {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.obsidian-preview :deep(.table-wrapper table) {
  margin: 0;
  border-radius: 0;
}

/* External links */
.obsidian-preview :deep(.external-link) {
  color: #059669;
  text-decoration: none;
}

.obsidian-preview :deep(.external-link:hover) {
  text-decoration: underline;
}

/* Task lists */
.markdown-preview :deep(.task-list-item) {
  list-style: none;
}

.markdown-preview :deep(.task-list-item input) {
  margin-right: 0.5rem;
}

/* Table of contents */
.markdown-preview :deep(.table-of-contents) {
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.markdown-preview :deep(.table-of-contents ul) {
  list-style: none;
  padding-left: 0;
}

.markdown-preview :deep(.table-of-contents li) {
  margin-bottom: 0.25rem;
}

.markdown-preview :deep(.table-of-contents a) {
  color: inherit;
}

.markdown-preview :deep(.table-of-contents a:hover) {
  color: #3b82f6;
}

/* Footnotes */
.markdown-preview :deep(.footnote-ref) {
  color: #3b82f6;
  font-size: 0.75rem;
  vertical-align: super;
}

.markdown-preview :deep(.footnotes) {
  border-top: 1px solid #e5e7eb;
  margin-top: 2rem;
  padding-top: 1rem;
}

/* Headers with anchors */
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  position: relative;
}

.markdown-preview :deep(.header-anchor) {
  position: absolute;
  left: -1.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.markdown-preview :deep(h1:hover .header-anchor),
.markdown-preview :deep(h2:hover .header-anchor),
.markdown-preview :deep(h3:hover .header-anchor),
.markdown-preview :deep(h4:hover .header-anchor),
.markdown-preview :deep(h5:hover .header-anchor),
.markdown-preview :deep(h6:hover .header-anchor) {
  opacity: 1;
}

/* Enhanced editor textarea */
.textarea {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  line-height: 1.6;
}

/* Autocomplete dropdown enhancements */
.autocomplete-dropdown {
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Syntax error panel */
.syntax-errors {
  backdrop-filter: blur(4px);
}

/* Loading states */
.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 8rem;
  color: rgba(0, 0, 0, 0.5);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .markdown-preview {
    font-size: 14px;
  }
  
  .markdown-preview :deep(pre) {
    font-size: 12px;
  }
}
</style>