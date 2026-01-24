import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppConfig } from '@/types'

export const useConfigStore = defineStore('config', () => {
  // State
  const config = ref<AppConfig>({
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

  const isConfigured = ref(false)
  const loading = ref(false)

  // Actions
  async function loadConfig() {
    loading.value = true
    try {
      // Check if we're running in Electron environment
      if (typeof window === 'undefined' || !window.electronAPI || typeof window.electronAPI.getConfig !== 'function') {
        console.warn('Running in browser mode - using default config')
        // Use default config for browser/development mode
        isConfigured.value = false
        loading.value = false
        return
      }

      const loadedConfig = await window.electronAPI.getConfig()
      if (loadedConfig) {
        config.value = loadedConfig
        // 只需要文章資料夾即可開始使用，部落格路徑可稍後設定
        isConfigured.value = !!loadedConfig.paths.articlesDir
      }
    } catch (error) {
      console.error('Failed to load config:', error)
      // Fallback to default config
      isConfigured.value = false
    } finally {
      loading.value = false
    }
  }

  async function saveConfig(newConfig: AppConfig) {
    loading.value = true
    try {
      if (typeof window === 'undefined' || !window.electronAPI || typeof window.electronAPI.setConfig !== 'function') {
        console.warn('Running in browser mode - config not saved')
        config.value = newConfig
        // 只需要文章資料夾即可開始使用，部落格路徑可稍後設定
        isConfigured.value = !!newConfig.paths.articlesDir
        loading.value = false
        return
      }

      // Create a plain object copy to avoid cloning issues
      const plainConfig = JSON.parse(JSON.stringify(newConfig))
      await window.electronAPI.setConfig(plainConfig)
      config.value = newConfig
      // 只需要文章資料夾即可開始使用，部落格路徑可稍後設定
      isConfigured.value = !!newConfig.paths.articlesDir
    } catch (error) {
      console.error('Failed to save config:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updatePaths(paths: Partial<AppConfig['paths']>) {
    const updatedConfig = {
      ...config.value,
      paths: { ...config.value.paths, ...paths }
    }
    await saveConfig(updatedConfig)
  }

  async function updateEditorConfig(editorConfig: Partial<AppConfig['editorConfig']>) {
    const updatedConfig = {
      ...config.value,
      editorConfig: { ...config.value.editorConfig, ...editorConfig }
    }
    await saveConfig(updatedConfig)
  }

  async function validateArticlesDir(path: string) {
    if (!path.trim()) {
      return { valid: false, message: '請選擇路徑' }
    }

    if (!window.electronAPI || typeof window.electronAPI.validateArticlesDir !== 'function') {
      return { valid: true, message: '瀏覽器模式 - 跳過驗證' }
    }

    return await window.electronAPI.validateArticlesDir(path)
  }

  async function validateAstroBlog(path: string) {
    if (!path.trim()) {
      return { valid: false, message: '請選擇路徑' }
    }

    if (!window.electronAPI || typeof window.electronAPI.validateAstroBlog !== 'function') {
      return { valid: true, message: '瀏覽器模式 - 跳過驗證' }
    }

    return await window.electronAPI.validateAstroBlog(path)
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