<template>
  <div class="space-y-4">
    <!-- Articles Directory Card -->
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <div class="flex items-start gap-3">
          <div class="rounded-full bg-primary/10 p-2 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h4 class="font-semibold text-lg">文章資料夾</h4>
              <span class="badge badge-error badge-sm">必填</span>
            </div>
            <p class="text-sm text-base-content/70 mb-3">
              存放您的 Markdown 文章的資料夾（支援 Wiki Link 語法）
            </p>
            <div class="join w-full">
              <input v-model="localPaths.articlesDir" type="text"
                placeholder="例如：C:\Users\你的名字\Documents\Blog\articles"
                class="input input-bordered join-item flex-1"
                :class="{ 'input-error': localPaths.articlesDir && !articlesValidation.valid }" />
              <button class="btn btn-primary join-item" @click="selectArticlesPath">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                選擇資料夾
              </button>
            </div>
            <div v-if="localPaths.articlesDir" class="flex items-center gap-2 mt-2">
              <div class="w-3 h-3 rounded-full" :class="articlesValidation.valid ? 'bg-success' : 'bg-warning'"></div>
              <span class="text-xs" :class="articlesValidation.valid ? 'text-success' : 'text-warning'">
                {{ articlesValidation.message }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Blog Directory Card -->
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <div class="flex items-start gap-3">
          <div class="rounded-full bg-secondary/10 p-2 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h4 class="font-semibold text-lg">部落格專案路徑</h4>
              <span class="badge badge-ghost badge-sm">選填</span>
            </div>
            <p class="text-sm text-base-content/70 mb-3">
              文章輸出目標資料夾（直接指向 content 資料夾，例如 Astro 的
              <code class="font-mono text-xs bg-base-300 px-1 rounded">src/content/blog</code>）
            </p>
            <div class="join w-full">
              <input v-model="localPaths.targetBlog" type="text"
                placeholder="例如：C:\Users\你的名字\Projects\my-blog\src\content\blog"
                class="input input-bordered join-item flex-1"
                :class="{ 'input-error': localPaths.targetBlog && !blogValidation.valid && !blogValidation.warning }" />
              <button class="btn btn-primary join-item" @click="selectBlogPath">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                選擇資料夾
              </button>
            </div>
            <div v-if="localPaths.targetBlog" class="flex items-center gap-2 mt-2">
              <div class="w-3 h-3 rounded-full"
                :class="blogValidation.valid && !blogValidation.warning ? 'bg-success' : blogValidation.warning ? 'bg-warning' : 'bg-error'">
              </div>
              <span class="text-xs"
                :class="blogValidation.valid && !blogValidation.warning ? 'text-success' : blogValidation.warning ? 'text-warning' : 'text-error'">
                {{ blogValidation.message }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Images Directory Card -->
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <div class="flex items-start gap-3">
          <div class="rounded-full bg-accent/10 p-2 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h4 class="font-semibold text-lg">圖片資料夾</h4>
              <span class="badge badge-ghost badge-sm">選填</span>
            </div>
            <p class="text-sm text-base-content/70 mb-3">
              統一管理您的文章圖片（留空則自動使用 文章資料夾/images）
            </p>
            <div class="join w-full">
              <input v-model="localPaths.imagesDir" type="text" placeholder="留空使用預設路徑"
                class="input input-bordered join-item flex-1" />
              <button class="btn btn-outline join-item" @click="selectImagesPath">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                選擇資料夾
              </button>
            </div>
            <div v-if="!localPaths.imagesDir && localPaths.articlesDir" class="alert alert-info mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                class="stroke-current shrink-0 w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm">將使用預設路徑：{{ localPaths.articlesDir }}\images</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Setup Guide -->
    <div class="alert">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <h4 class="font-bold">快速設定提示</h4>
        <div class="text-xs mt-1 space-y-1">
          <p>1. 選擇一個資料夾存放您的 Markdown 文章（可使用 Wiki Link 語法）</p>
          <p>2. 部落格專案路徑可稍後設定（需要時再指定用於發布）</p>
          <p>3. 圖片資料夾可選填，留空會自動建立</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue"
import { useConfigStore } from "@/stores/config"
import type { AppConfig } from "@/types"
import { logger } from "@/utils/logger"

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  paths: AppConfig["paths"]
}>()

const emit = defineEmits<{
  "update:paths": [paths: AppConfig["paths"]]
}>()

// ── Local State ───────────────────────────────────────────────────────────────

const configStore = useConfigStore()

const localPaths = reactive<AppConfig["paths"]>({ ...props.paths })

const articlesValidation = ref({ valid: false, message: "請選擇路徑" })
const blogValidation = ref<{ valid: boolean; warning?: boolean; message: string }>({
  valid: false,
  message: "請選擇路徑",
})

// ── Sync: props → local ───────────────────────────────────────────────────────

watch(
  () => props.paths,
  (newPaths) => {
    Object.assign(localPaths, newPaths)
  },
  { deep: true }
)

// ── Sync: local → parent + auto-validate ─────────────────────────────────────

watch(
  localPaths,
  (newPaths) => {
    emit("update:paths", { ...newPaths })
    validatePaths()
  },
  { deep: true }
)

// ── Validation ────────────────────────────────────────────────────────────────

async function validatePaths() {
  if (localPaths.articlesDir) {
    try {
      const result = await configStore.validateArticlesDir(localPaths.articlesDir)
      articlesValidation.value = result
    } catch {
      articlesValidation.value = { valid: false, message: "驗證失敗" }
    }
  } else {
    articlesValidation.value = { valid: false, message: "請選擇路徑" }
  }

  if (localPaths.targetBlog) {
    try {
      const result = await configStore.validateAstroBlog(localPaths.targetBlog)
      blogValidation.value = result
    } catch {
      blogValidation.value = { valid: false, message: "驗證失敗" }
    }
  } else {
    blogValidation.value = { valid: false, message: "請選擇路徑" }
  }
}

// ── Path Selection ────────────────────────────────────────────────────────────

async function selectArticlesPath() {
  try {
    if (!window.electronAPI) {
      logger.warn("瀏覽器模式下無法選擇資料夾")
      return
    }
    const selectedPath = await window.electronAPI.selectDirectory({
      title: "選擇文章資料夾",
      defaultPath: localPaths.articlesDir,
    })
    if (selectedPath) {
      localPaths.articlesDir = selectedPath
      if (!localPaths.imagesDir) {
        localPaths.imagesDir = selectedPath + "/images"
      }
    }
  } catch (error) {
    logger.error("選擇資料夾失敗:", error)
  }
}

async function selectBlogPath() {
  try {
    if (!window.electronAPI) {
      logger.warn("瀏覽器模式下無法選擇資料夾")
      return
    }
    const selectedPath = await window.electronAPI.selectDirectory({
      title: "選擇部落格專案資料夾",
      defaultPath: localPaths.targetBlog,
    })
    if (selectedPath) {
      localPaths.targetBlog = selectedPath
    }
  } catch (error) {
    logger.error("選擇資料夾失敗:", error)
  }
}

async function selectImagesPath() {
  try {
    if (!window.electronAPI) {
      logger.warn("瀏覽器模式下無法選擇資料夾")
      return
    }
    const selectedPath = await window.electronAPI.selectDirectory({
      title: "選擇圖片資料夾",
      defaultPath: localPaths.imagesDir,
    })
    if (selectedPath) {
      localPaths.imagesDir = selectedPath
    }
  } catch (error) {
    logger.error("選擇資料夾失敗:", error)
  }
}

// ── Initial Validation ────────────────────────────────────────────────────────

validatePaths()
</script>
