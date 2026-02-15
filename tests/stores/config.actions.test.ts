/**
 * Config Store Actions 補強測試
 * Q-05：補強 settingsStore 主要 actions 覆蓋率
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigStore } from '@/stores/config'

const mockElectronAPI = {
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  validateArticlesDir: vi.fn(),
  validateAstroBlog: vi.fn(),
  selectDirectory: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

const defaultConfig = {
  paths: { articlesDir: '', targetBlog: '', imagesDir: '' },
  editorConfig: { autoSave: true, autoSaveInterval: 30000, theme: 'light' as const }
}

describe('Config Store — Actions 補強', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('loadConfig', () => {
    it('從 electronAPI 載入設定後更新 config 與 isConfigured', async () => {
      const store = useConfigStore()
      mockElectronAPI.getConfig.mockResolvedValue({
        paths: { articlesDir: '/vault', targetBlog: '/blog', imagesDir: '' },
        editorConfig: { autoSave: true, autoSaveInterval: 30000, theme: 'dark' }
      })

      await store.loadConfig()

      expect(store.config.paths.articlesDir).toBe('/vault')
      expect(store.config.editorConfig.theme).toBe('dark')
      expect(store.isConfigured).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('articlesDir 為空時 isConfigured 為 false', async () => {
      const store = useConfigStore()
      mockElectronAPI.getConfig.mockResolvedValue({
        paths: { articlesDir: '', targetBlog: '/blog', imagesDir: '' },
        editorConfig: { autoSave: true, autoSaveInterval: 30000, theme: 'light' }
      })

      await store.loadConfig()

      expect(store.isConfigured).toBe(false)
    })

    it('getConfig 拋出錯誤時 fallback 為預設值', async () => {
      const store = useConfigStore()
      mockElectronAPI.getConfig.mockRejectedValue(new Error('IPC error'))

      await store.loadConfig()

      expect(store.isConfigured).toBe(false)
      expect(store.loading).toBe(false)
    })
  })

  describe('updatePaths', () => {
    it('更新 articlesDir 後 isConfigured 變為 true', async () => {
      const store = useConfigStore()
      mockElectronAPI.setConfig.mockResolvedValue(undefined)

      await store.updatePaths({ articlesDir: '/new/vault' })

      expect(store.config.paths.articlesDir).toBe('/new/vault')
      expect(store.isConfigured).toBe(true)
    })

    it('部分更新路徑時保留其他路徑欄位', async () => {
      const store = useConfigStore()
      mockElectronAPI.setConfig.mockResolvedValue(undefined)

      // 先設定完整路徑
      await store.saveConfig({
        ...defaultConfig,
        paths: { articlesDir: '/vault', targetBlog: '/blog', imagesDir: '/images' }
      })

      // 只更新 articlesDir
      await store.updatePaths({ articlesDir: '/new/vault' })

      expect(store.config.paths.articlesDir).toBe('/new/vault')
      expect(store.config.paths.targetBlog).toBe('/blog')
      expect(store.config.paths.imagesDir).toBe('/images')
    })
  })

  describe('updateEditorConfig', () => {
    it('更新 theme 時保留其他 editorConfig 欄位', async () => {
      const store = useConfigStore()
      mockElectronAPI.setConfig.mockResolvedValue(undefined)

      await store.updateEditorConfig({ theme: 'dark' })

      expect(store.config.editorConfig.theme).toBe('dark')
      expect(store.config.editorConfig.autoSave).toBe(true)
      expect(store.config.editorConfig.autoSaveInterval).toBe(30000)
    })

    it('更新 autoSave 設定', async () => {
      const store = useConfigStore()
      mockElectronAPI.setConfig.mockResolvedValue(undefined)

      await store.updateEditorConfig({ autoSave: false, autoSaveInterval: 60000 })

      expect(store.config.editorConfig.autoSave).toBe(false)
      expect(store.config.editorConfig.autoSaveInterval).toBe(60000)
    })
  })

  describe('saveConfig — 錯誤處理', () => {
    it('setConfig 拋出錯誤時應向上拋出', async () => {
      const store = useConfigStore()
      mockElectronAPI.setConfig.mockRejectedValue(new Error('save failed'))

      await expect(store.saveConfig(defaultConfig)).rejects.toThrow('save failed')
      expect(store.loading).toBe(false)
    })
  })
})
