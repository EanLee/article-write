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
        <div class="flex-1 p-4">
          <textarea
            v-model="content"
            class="textarea textarea-bordered w-full h-full resize-none font-mono text-sm leading-relaxed"
            placeholder="開始撰寫您的文章..."
            @input="handleContentChange"
          ></textarea>
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
import { ref, computed, watch, onUnmounted } from 'vue'
import { useArticleStore } from '@/stores/article'
import FrontmatterEditor from './FrontmatterEditor.vue'
import type { Article } from '@/types'

const articleStore = useArticleStore()

// Reactive data
const content = ref('')
const showPreview = ref(false)
const showFrontmatterEditor = ref(false)
const renderedContent = ref('')
const autoSaveTimer = ref<NodeJS.Timeout | null>(null)

// Computed properties
const statusText = computed(() => {
  return articleStore.currentArticle?.status === 'published' ? '已發布' : '草稿'
})

// Methods
function handleContentChange() {
  if (articleStore.currentArticle) {
    articleStore.currentArticle.content = content.value
    scheduleAutoSave()
  }
  
  if (showPreview.value) {
    updatePreview()
  }
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
    } catch (error) {
      console.error('Failed to save article:', error)
    }
  }
}

async function moveToPublished() {
  if (articleStore.currentArticle) {
    try {
      await articleStore.moveToPublished(articleStore.currentArticle.id)
    } catch (error) {
      console.error('Failed to move article to published:', error)
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

// Cleanup
onUnmounted(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
})
</script>

<style scoped>
/* Custom styles if needed */
</style>