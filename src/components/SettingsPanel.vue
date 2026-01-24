<template>
  <div v-if="modelValue" class="modal modal-open">
    <div class="modal-box w-11/12 max-w-4xl">
      <h3 class="font-bold text-lg mb-4">應用程式設定</h3>
      
      <div class="tabs tabs-lifted">
        <input 
          type="radio" 
          name="settings_tabs" 
          role="tab" 
          class="tab" 
          aria-label="路徑設定"
          :checked="activeTab === 'paths'"
          @change="activeTab = 'paths'"
        />
        <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
          <div class="space-y-6">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">文章資料夾</span>
              </label>
              <div class="join">
                <input
                  v-model="localConfig.paths.articlesDir"
                  type="text"
                  placeholder="選擇文章存放資料夾"
                  class="input input-bordered join-item flex-1"
                />
                <button class="btn btn-outline join-item" @click="selectArticlesPath">
                  瀏覽
                </button>
              </div>
              <label class="label">
                <span class="label-text-alt">存放部落格文章的資料夾</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Astro 部落格</span>
              </label>
              <div class="join">
                <input
                  v-model="localConfig.paths.targetBlog"
                  type="text"
                  placeholder="選擇 Astro 部落格專案路徑"
                  class="input input-bordered join-item flex-1"
                />
                <button class="btn btn-outline join-item" @click="selectBlogPath">
                  瀏覽
                </button>
              </div>
              <label class="label">
                <span class="label-text-alt">應包含 src/content/blog 結構</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">圖片目錄</span>
              </label>
              <div class="join">
                <input
                  v-model="localConfig.paths.imagesDir"
                  type="text"
                  placeholder="圖片存放路徑（可選）"
                  class="input input-bordered join-item flex-1"
                />
                <button class="btn btn-outline join-item" @click="selectImagesPath">
                  瀏覽
                </button>
              </div>
              <label class="label">
                <span class="label-text-alt">留空則使用文章資料夾中的 images 子資料夾</span>
              </label>
            </div>

            <!-- Path Validation -->
            <div class="bg-base-200 p-4 rounded-lg">
              <h4 class="font-semibold mb-3">路徑驗證（選填）</h4>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div 
                    class="w-4 h-4 rounded-full"
                    :class="articlesValidation.valid ? 'bg-success' : (localConfig.paths.articlesDir ? 'bg-warning' : 'bg-base-300')"
                  ></div>
                  <span class="text-sm">文章資料夾: {{ articlesValidation.message }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div 
                    class="w-4 h-4 rounded-full"
                    :class="blogValidation.valid ? 'bg-success' : (localConfig.paths.targetBlog ? 'bg-warning' : 'bg-base-300')"
                  ></div>
                  <span class="text-sm">Astro 部落格: {{ blogValidation.message }}</span>
                </div>
              </div>
              <p class="text-xs text-base-content/60 mt-2">
                提示：可以先儲存部分設定，之後再補充其他路徑
              </p>
            </div>
          </div>
        </div>

        <input 
          type="radio" 
          name="settings_tabs" 
          role="tab" 
          class="tab" 
          aria-label="編輯器設定"
          :checked="activeTab === 'editor'"
          @change="activeTab = 'editor'"
        />
        <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
          <div class="space-y-6">
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text font-semibold">自動儲存</span>
                <input 
                  v-model="localConfig.editorConfig.autoSave"
                  type="checkbox" 
                  class="toggle toggle-primary" 
                />
              </label>
              <label class="label">
                <span class="label-text-alt">啟用自動儲存功能</span>
              </label>
            </div>

            <div v-if="localConfig.editorConfig.autoSave" class="form-control">
              <label class="label">
                <span class="label-text font-semibold">儲存間隔</span>
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="autoSaveSeconds"
                  type="number"
                  min="10"
                  max="300"
                  step="10"
                  class="input input-bordered w-24"
                />
                <span class="text-sm text-base-content/70">秒</span>
              </div>
              <label class="label">
                <span class="label-text-alt">自動儲存的時間間隔（10-300秒）</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">主題</span>
              </label>
              <div class="flex gap-4">
                <label class="label cursor-pointer">
                  <input 
                    v-model="localConfig.editorConfig.theme"
                    type="radio" 
                    name="theme" 
                    value="light"
                    class="radio radio-primary" 
                  />
                  <span class="label-text ml-2">淺色</span>
                </label>
                <label class="label cursor-pointer">
                  <input 
                    v-model="localConfig.editorConfig.theme"
                    type="radio" 
                    name="theme" 
                    value="dark"
                    class="radio radio-primary" 
                  />
                  <span class="label-text ml-2">深色</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="handleClose">取消</button>
        <button class="btn btn-outline" @click="resetToDefaults">重設為預設值</button>
        <button 
          class="btn btn-primary"
          @click="handleSave"
        >
          儲存設定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useArticleStore } from '@/stores/article'
import type { AppConfig } from '@/types'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const configStore = useConfigStore()
const articleStore = useArticleStore()
const activeTab = ref('paths')
const localConfig = ref<AppConfig>({
  paths: {
    articlesDir: '',
    targetBlog: '',
    imagesDir: ''
  },
  editorConfig: {
    autoSave: true,
    autoSaveInterval: 30000,
    theme: 'light'
  }
})

// Convert milliseconds to seconds for UI
const autoSaveSeconds = computed({
  get: () => Math.floor(localConfig.value.editorConfig.autoSaveInterval / 1000),
  set: (value: number) => {
    localConfig.value.editorConfig.autoSaveInterval = value * 1000
  }
})

// Validation
const articlesValidation = ref({ valid: false, message: '請選擇路徑' })
const blogValidation = ref({ valid: false, message: '請選擇路徑' })

const _isConfigValid = computed(() => {
  return articlesValidation.value.valid && blogValidation.value.valid
})

// Methods
async function selectArticlesPath() {
  try {
    if (!window.electronAPI) {
      console.warn('瀏覽器模式下無法選擇資料夾')
      return
    }

    const selectedPath = await window.electronAPI.selectDirectory({
      title: '選擇文章資料夾',
      defaultPath: localConfig.value.paths.articlesDir
    })

    if (selectedPath) {
      localConfig.value.paths.articlesDir = selectedPath
      // Auto-set images directory if not already set
      if (!localConfig.value.paths.imagesDir) {
        localConfig.value.paths.imagesDir = selectedPath + '/images'
      }
    }
  } catch (error) {
    console.error('選擇資料夾失敗:', error)
  }
}

async function selectBlogPath() {
  try {
    if (!window.electronAPI) {
      console.warn('瀏覽器模式下無法選擇資料夾')
      return
    }

    const selectedPath = await window.electronAPI.selectDirectory({
      title: '選擇 Astro 部落格專案資料夾',
      defaultPath: localConfig.value.paths.targetBlog
    })

    if (selectedPath) {
      localConfig.value.paths.targetBlog = selectedPath
    }
  } catch (error) {
    console.error('選擇資料夾失敗:', error)
  }
}

async function selectImagesPath() {
  try {
    if (!window.electronAPI) {
      console.warn('瀏覽器模式下無法選擇資料夾')
      return
    }

    const selectedPath = await window.electronAPI.selectDirectory({
      title: '選擇圖片資料夾',
      defaultPath: localConfig.value.paths.imagesDir
    })

    if (selectedPath) {
      localConfig.value.paths.imagesDir = selectedPath
    }
  } catch (error) {
    console.error('選擇資料夾失敗:', error)
  }
}

async function validatePaths() {
  // Validate Articles Directory
  if (localConfig.value.paths.articlesDir) {
    try {
      const result = await configStore.validateArticlesDir(localConfig.value.paths.articlesDir)
      articlesValidation.value = result
    } catch {
      articlesValidation.value = { valid: false, message: '驗證失敗' }
    }
  } else {
    articlesValidation.value = { valid: false, message: '請選擇路徑' }
  }

  // Validate Astro Blog
  if (localConfig.value.paths.targetBlog) {
    try {
      const result = await configStore.validateAstroBlog(localConfig.value.paths.targetBlog)
      blogValidation.value = result
    } catch {
      blogValidation.value = { valid: false, message: '驗證失敗' }
    }
  } else {
    blogValidation.value = { valid: false, message: '請選擇路徑' }
  }
}

async function handleSave() {
  try {
    await configStore.saveConfig(localConfig.value)
    
    // 如果設定了文章資料夾路徑，重新載入文章
    if (localConfig.value.paths.articlesDir) {
      await articleStore.loadArticles()
    }
    
    emit('update:modelValue', false)
  } catch (error) {
    console.error('儲存設定失敗', error)
  }
}

function resetToDefaults() {
  localConfig.value = {
    paths: {
      articlesDir: '',
      targetBlog: '',
      imagesDir: ''
    },
    editorConfig: {
      autoSave: true,
      autoSaveInterval: 30000,
      theme: 'light'
    }
  }
  validatePaths()
}

function handleClose() {
  emit('update:modelValue', false)
}

// Watch for path changes to trigger validation
watch(
  () => [localConfig.value.paths.articlesDir, localConfig.value.paths.targetBlog],
  async () => {
    await validatePaths()
  }
)

// Watch for dialog open/close
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      // Load current config when dialog opens
      localConfig.value = JSON.parse(JSON.stringify(configStore.config))
      await validatePaths()
    }
  }
)
</script>

<style scoped>
/* Custom styles if needed */
</style>