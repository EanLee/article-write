<template>
  <div v-if="modelValue" class="modal modal-open" data-testid="settings-modal">
    <div class="modal-box w-11/12 max-w-5xl h-[82vh] max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h3 class="text-2xl font-bold">部落格設定</h3>
          <p class="text-sm text-base-content/60 mt-1">配置您的部落格寫作與發布環境</p>
        </div>
        <button class="btn btn-sm btn-circle btn-ghost" data-testid="settings-close-button" @click="handleClose">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-boxed mb-6 bg-base-200 flex-shrink-0">
        <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'basic' }" @click="activeTab = 'basic'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          基本設定
        </a>
        <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'framework' }" @click="activeTab = 'framework'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          部落格框架
        </a>
        <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'editor' }" @click="activeTab = 'editor'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          編輯器
        </a>
        <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'ai' }" @click="activeTab = 'ai'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI 設定
        </a>
        <a role="tab" class="tab relative" :class="{ 'tab-active': activeTab === 'git' }" @click="activeTab = 'git'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Git 發布
          <span class="badge badge-xs badge-warning ml-1">即將推出</span>
        </a>
      </div>

      <!-- Tab Content：由 KeepAlive 快取各頁籤元件，v-if 取代原本 v-show -->
      <div class="flex-1 overflow-y-auto">
        <KeepAlive>
          <BasicSettings v-if="activeTab === 'basic'" v-model:paths="localConfig.paths" />
          <FrameworkSettings v-else-if="activeTab === 'framework'" />
          <EditorSettings v-else-if="activeTab === 'editor'" v-model:editor-config="localConfig.editorConfig" />
          <AISettings v-else-if="activeTab === 'ai'" />
          <GitSettings v-else-if="activeTab === 'git'" />
        </KeepAlive>
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-between items-center mt-6 pt-4 border-t border-base-300 flex-shrink-0">
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost" @click="resetToDefaults">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重設為預設值
          </button>
          <button class="btn btn-ghost btn-sm" @click="rescanMetadata" :disabled="isScanning">
            <svg v-if="isScanning" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新掃描 Metadata
          </button>
          <span v-if="scanMessage" class="text-xs text-base-content/60">{{ scanMessage }}</span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleSave" :disabled="!canSave">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            儲存設定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useConfigStore } from "@/stores/config"
import { useArticleStore } from "@/stores/article"
import { metadataCacheService } from "@/services/MetadataCacheService"
import type { AppConfig } from "@/types"
import { logger } from "@/utils/logger"
import BasicSettings from "@/components/settings/BasicSettings.vue"
import FrameworkSettings from "@/components/settings/FrameworkSettings.vue"
import EditorSettings from "@/components/settings/EditorSettings.vue"
import AISettings from "@/components/settings/AISettings.vue"
import GitSettings from "@/components/settings/GitSettings.vue"

interface Props {
  modelValue: boolean
  initialTab?: string
}

interface Emits {
  (e: "update:modelValue", value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const configStore = useConfigStore()
const articleStore = useArticleStore()
const activeTab = ref("basic")

const localConfig = ref<AppConfig>({
  paths: {
    articlesDir: "",
    targetBlog: "",
    imagesDir: ""
  },
  editorConfig: {
    autoSave: true,
    autoSaveInterval: 30000,
    theme: "light"
  }
})

const canSave = computed(() => {
  // 只需要文章資料夾即可儲存，部落格路徑為選填
  return !!localConfig.value.paths.articlesDir
})

// Metadata scan
const isScanning = ref(false)
const scanMessage = ref("")

async function rescanMetadata() {
  const articlesDir = configStore.config.paths.articlesDir
  if (!articlesDir) {
    scanMessage.value = "請先設定文章資料夾"
    return
  }
  isScanning.value = true
  scanMessage.value = ""
  try {
    const result = await metadataCacheService.scan(articlesDir)
    scanMessage.value = `完成：${result.categories.length} 個分類、${result.tags.length} 個標籤`
  } catch (e) {
    scanMessage.value = "掃描失敗，請確認文章資料夾是否正確"
    logger.error(e)
  } finally {
    isScanning.value = false
  }
}

async function handleSave() {
  try {
    await configStore.saveConfig(localConfig.value)

    // 如果設定了文章資料夾路徑，重新載入文章
    if (localConfig.value.paths.articlesDir) {
      await articleStore.loadArticles()
    }

    emit("update:modelValue", false)
  } catch (error) {
    logger.error("儲存設定失敗", error)
  }
}

function resetToDefaults() {
  localConfig.value = {
    paths: {
      articlesDir: "",
      targetBlog: "",
      imagesDir: ""
    },
    editorConfig: {
      autoSave: true,
      autoSaveInterval: 30000,
      theme: "light"
    }
  }
}

function handleClose() {
  emit("update:modelValue", false)
}

// Watch for dialog open/close
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      // Set active tab (from initialTab prop or default to 'basic')
      activeTab.value = props.initialTab ?? "basic"
      // Load current config when dialog opens
      localConfig.value = JSON.parse(JSON.stringify(configStore.config))
    }
  }
)
</script>

<style scoped>
/* Custom styles if needed */
</style>
