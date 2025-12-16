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
      <div v-if="showPreview" class="w-1/2 border-l border-base-300 bg-base-50">
        <div class="bg-base-200 p-3 border-b border-base-300">
          <h3 class="text-sm font-semibold">預覽</h3>
        </div>
        <div class="p-4 h-full overflow-y-auto prose prose-sm max-w-none" v-html="renderedContent"></div>
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
import { ref, computed, watch, onUnmounted, onMounted, nextTick } from 'vue'
import { useArticleStore } from '@/stores/article'
import { useConfigStore } from '@/stores/config'
import FrontmatterEditor from './FrontmatterEditor.vue'
import type { Article } from '@/types'

// Obsidian syntax support interfaces (inline to avoid import issues)
interface SuggestionItem {
  text: string
  displayText: string
  type: 'wikilink' | 'image' | 'tag'
  description?: string
}

interface SyntaxError {
  line: number
  column: number
  message: string
  type: 'warning' | 'error'
  suggestion?: string
}

const articleStore = useArticleStore()
const configStore = useConfigStore()

// Reactive data
const content = ref('')
const showPreview = ref(false)
const showFrontmatterEditor = ref(false)
const renderedContent = ref('')
const autoSaveTimer = ref<NodeJS.Timeout | null>(null)

// Obsidian syntax support data
const editorRef = ref<HTMLTextAreaElement>()
const suggestions = ref<SuggestionItem[]>([])
const showSuggestions = ref(false)
const selectedSuggestionIndex = ref(0)
const syntaxErrors = ref<SyntaxError[]>([])
const dropdownPosition = ref({ top: 0, left: 0 })
const imageFiles = ref<string[]>([])
const allTags = ref<string[]>([])

// Validation timer
let validationTimeout: NodeJS.Timeout | null = null

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
  // Basic markdown rendering - will be enhanced later
  renderedContent.value = content.value
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>')
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

// Obsidian syntax support methods
function handleKeydown(event: KeyboardEvent) {
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
  }
}

function updateAutocomplete() {
  if (!editorRef.value) {
    return
  }

  const textarea = editorRef.value
  const cursorPosition = textarea.selectionStart
  const text = textarea.value
  const beforeCursor = text.substring(0, cursorPosition)

  // Check for Wiki link pattern [[
  const wikiLinkMatch = beforeCursor.match(/\[\[([^\]]*?)$/)
  if (wikiLinkMatch) {
    const query = wikiLinkMatch[1].toLowerCase()
    suggestions.value = getWikiLinkSuggestions(query)
    if (suggestions.value.length > 0) {
      selectedSuggestionIndex.value = 0
      showSuggestions.value = true
      updateDropdownPosition()
      return
    }
  }

  // Check for image pattern ![[
  const imageMatch = beforeCursor.match(/!\[\[([^\]]*?)$/)
  if (imageMatch) {
    const query = imageMatch[1].toLowerCase()
    suggestions.value = getImageSuggestions(query)
    if (suggestions.value.length > 0) {
      selectedSuggestionIndex.value = 0
      showSuggestions.value = true
      updateDropdownPosition()
      return
    }
  }

  // Check for tag pattern #
  const tagMatch = beforeCursor.match(/#([a-zA-Z0-9\u4e00-\u9fff]*?)$/)
  if (tagMatch) {
    const query = tagMatch[1].toLowerCase()
    suggestions.value = getTagSuggestions(query)
    if (suggestions.value.length > 0) {
      selectedSuggestionIndex.value = 0
      showSuggestions.value = true
      updateDropdownPosition()
      return
    }
  }

  hideSuggestions()
}

function getWikiLinkSuggestions(query: string): SuggestionItem[] {
  return articleStore.articles
    .filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.slug.toLowerCase().includes(query)
    )
    .map(article => ({
      text: `[[${article.title}]]`,
      displayText: article.title,
      type: 'wikilink' as const,
      description: `${article.category} - ${article.status}`
    }))
    .slice(0, 10)
}

function getImageSuggestions(query: string): SuggestionItem[] {
  return imageFiles.value
    .filter(filename => filename.toLowerCase().includes(query))
    .map(filename => ({
      text: `![[${filename}]]`,
      displayText: filename,
      type: 'image' as const,
      description: '圖片檔案'
    }))
    .slice(0, 10)
}

function getTagSuggestions(query: string): SuggestionItem[] {
  return allTags.value
    .filter(tag => tag.toLowerCase().includes(query))
    .map(tag => ({
      text: `#${tag}`,
      displayText: tag,
      type: 'tag' as const,
      description: '標籤'
    }))
    .slice(0, 10)
}

function updateDropdownPosition() {
  if (!editorRef.value) {
    return
  }

  const textarea = editorRef.value
  const cursorPosition = textarea.selectionStart
  
  // Create a temporary element to measure text dimensions
  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.visibility = 'hidden'
  tempDiv.style.whiteSpace = 'pre-wrap'
  tempDiv.style.font = window.getComputedStyle(textarea).font
  tempDiv.style.padding = window.getComputedStyle(textarea).padding
  tempDiv.style.border = window.getComputedStyle(textarea).border
  tempDiv.style.width = textarea.clientWidth + 'px'
  
  const textBeforeCursor = textarea.value.substring(0, cursorPosition)
  tempDiv.textContent = textBeforeCursor
  
  document.body.appendChild(tempDiv)
  
  const textRect = tempDiv.getBoundingClientRect()
  
  document.body.removeChild(tempDiv)
  
  // Calculate position relative to textarea
  const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20
  dropdownPosition.value = {
    top: textRect.height + lineHeight,
    left: 0
  }
}

function applySuggestion(suggestion: SuggestionItem) {
  if (!editorRef.value) {
    return
  }

  const textarea = editorRef.value
  const cursorPosition = textarea.selectionStart
  const text = textarea.value
  const beforeCursor = text.substring(0, cursorPosition)
  const afterCursor = text.substring(cursorPosition)

  // Find the start of the current input pattern
  let startPos = cursorPosition
  
  // Check for different patterns
  if (beforeCursor.match(/\[\[([^\]]*?)$/)) {
    // Wiki link pattern
    const match = beforeCursor.match(/\[\[([^\]]*?)$/)
    if (match) {
      startPos = cursorPosition - match[0].length
    }
  } else if (beforeCursor.match(/!\[\[([^\]]*?)$/)) {
    // Image pattern
    const match = beforeCursor.match(/!\[\[([^\]]*?)$/)
    if (match) {
      startPos = cursorPosition - match[0].length
    }
  } else if (beforeCursor.match(/#([a-zA-Z0-9\u4e00-\u9fff]*?)$/)) {
    // Tag pattern
    const match = beforeCursor.match(/#([a-zA-Z0-9\u4e00-\u9fff]*?)$/)
    if (match) {
      startPos = cursorPosition - match[0].length
    }
  }

  // Replace the text
  const newText = text.substring(0, startPos) + suggestion.text + afterCursor
  content.value = newText
  
  if (articleStore.currentArticle) {
    articleStore.currentArticle.content = newText
  }

  // Set cursor position after the inserted text
  nextTick(() => {
    const newCursorPos = startPos + suggestion.text.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })

  hideSuggestions()
}

function hideSuggestions() {
  showSuggestions.value = false
  suggestions.value = []
  selectedSuggestionIndex.value = 0
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
  const errors: SyntaxError[] = []
  const lines = content.value.split('\n')

  lines.forEach((line, lineIndex) => {
    // Check invalid Wiki links
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
    let match
    while ((match = wikiLinkRegex.exec(line)) !== null) {
      const linkText = match[1]
      const linkTitle = linkText.split('|')[0] // Handle alias format [[title|alias]]
      
      // Check if article exists
      const articleExists = articleStore.articles.some(article => 
        article.title === linkTitle || article.slug === linkTitle
      )

      if (!articleExists) {
        errors.push({
          line: lineIndex + 1,
          column: match.index! + 1,
          message: `找不到文章: "${linkTitle}"`,
          type: 'warning',
          suggestion: `建議檢查文章標題是否正確，或建立新文章`
        })
      }
    }

    // Check invalid image references
    const imageRegex = /!\[\[([^\]]+)\]\]/g
    while ((match = imageRegex.exec(line)) !== null) {
      const imageName = match[1]
      
      // Check if image file exists
      const imageExists = imageFiles.value.some(filename => 
        filename === imageName || filename.includes(imageName)
      )

      if (!imageExists) {
        errors.push({
          line: lineIndex + 1,
          column: match.index! + 1,
          message: `找不到圖片檔案: "${imageName}"`,
          type: 'error',
          suggestion: `請確認圖片檔案存在於 Images 資料夾中`
        })
      }
    }
  })

  syntaxErrors.value = errors
}

async function initializeObsidianSupport() {
  try {
    // Update tags from articles
    const tagSet = new Set<string>()
    articleStore.articles.forEach(article => {
      article.frontmatter.tags.forEach(tag => tagSet.add(tag))
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
      } catch {
        // Images directory might not exist
        imageFiles.value = []
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

// Watch for articles changes to update tags
watch(() => articleStore.articles, () => {
  const tagSet = new Set<string>()
  articleStore.articles.forEach(article => {
    article.frontmatter.tags.forEach(tag => tagSet.add(tag))
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
    } catch {
      // Images directory might not exist or failed to read
      imageFiles.value = []
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
/* Custom styles if needed */
</style>