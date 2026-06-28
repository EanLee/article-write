import { defineStore } from "pinia"
import { ref } from "vue"
import type { AppConfig } from "@/types"
import { logger } from "@/utils/logger"

// S7721: 提取到 store 外層，避免 async function 定義在另一個 function 內
async function doValidateArticlesDir(path: string) {
  if (!path.trim()) {
    return { valid: false, message: "請選擇路徑" }
  }

  if (!globalThis.electronAPI || typeof globalThis.electronAPI.validateArticlesDir !== "function") {
    return { valid: true, message: "瀏覽器模式 - 跳過驗證" }
  }

  return await globalThis.electronAPI.validateArticlesDir(path)
}

// S7721: 提取到 store 外層，避免 async function 定義在另一個 function 內
async function doValidateAstroBlog(path: string) {
  if (!path.trim()) {
    return { valid: false, message: "請選擇路徑" }
  }

  if (!globalThis.electronAPI || typeof globalThis.electronAPI.validateAstroBlog !== "function") {
    return { valid: true, message: "瀏覽器模式 - 跳過驗證" }
  }

  return await globalThis.electronAPI.validateAstroBlog(path)
}

export const useConfigStore = defineStore("config", () => {
  // State
  const config = ref<AppConfig>({
    paths: {
      articlesDir: "",
      targetDir: "",
      imagesDir: ""
    },
    editorConfig: {
      autoSave: true,
      autoSaveInterval: 30000,
      theme: "light"
    }
  })

  const isConfigured = ref(false)
  const loading = ref(false)

  // Actions
  async function loadConfig() {
    loading.value = true
    try {
      // Check if we're running in Electron environment
      if (typeof window === "undefined" || !globalThis.electronAPI || typeof globalThis.electronAPI.getConfig !== "function") {
        logger.warn("Running in browser mode - using default config")
        // Use default config for browser/development mode
        isConfigured.value = false
        loading.value = false
        return
      }

      const loadedConfig = await globalThis.electronAPI.getConfig()
      if (loadedConfig) {
        config.value = loadedConfig
        // 只需要文章資料夾即可開始使用，部落格路徑可稍後設定
        isConfigured.value = !!loadedConfig.paths.articlesDir
      }
    } catch (error) {
      logger.error("Failed to load config:", error)
      // Fallback to default config
      isConfigured.value = false
    } finally {
      loading.value = false
    }
  }

  async function saveConfig(newConfig: AppConfig) {
    loading.value = true
    try {
      if (typeof window === "undefined" || !globalThis.electronAPI || typeof globalThis.electronAPI.setConfig !== "function") {
        logger.warn("Running in browser mode - config not saved")
        config.value = newConfig
        // 只需要文章資料夾即可開始使用，部落格路徑可稍後設定
        isConfigured.value = !!newConfig.paths.articlesDir
        loading.value = false
        return
      }

      // Create a plain object copy to avoid cloning issues
      const plainConfig = JSON.parse(JSON.stringify(newConfig))
      await globalThis.electronAPI.setConfig(plainConfig)
      config.value = newConfig
      // 只需要文章資料夾即可開始使用，部落格路徑可稍後設定
      isConfigured.value = !!newConfig.paths.articlesDir
    } catch (error) {
      logger.error("Failed to save config:", error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updatePaths(paths: Partial<AppConfig["paths"]>) {
    const updatedConfig = {
      ...config.value,
      paths: { ...config.value.paths, ...paths }
    }
    await saveConfig(updatedConfig)
  }

  async function updateEditorConfig(editorConfig: Partial<AppConfig["editorConfig"]>) {
    const updatedConfig = {
      ...config.value,
      editorConfig: { ...config.value.editorConfig, ...editorConfig }
    }
    await saveConfig(updatedConfig)
  }

  function validateArticlesDir(path: string) {
    return doValidateArticlesDir(path)
  }

  function validateAstroBlog(path: string) {
    return doValidateAstroBlog(path)
  }

  return {
    // State
    config,
    isConfigured,
    loading,

    // Actions
    loadConfig,
    saveConfig,
    updatePaths,
    updateEditorConfig,
    validateArticlesDir,
    validateAstroBlog
  }
})