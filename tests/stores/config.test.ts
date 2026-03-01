import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useConfigStore } from "@/stores/config"

// Mock the electronAPI
const mockElectronAPI = {
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  validateArticlesDir: vi.fn(),
  validateAstroBlog: vi.fn(),
  selectDirectory: vi.fn()
}

// Mock window.electronAPI
Object.defineProperty(window, "electronAPI", {
  value: mockElectronAPI,
  writable: true
})

describe("Config Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it("should initialize with default config", () => {
    const configStore = useConfigStore()
    
    expect(configStore.config.paths.articlesDir).toBe("")
    expect(configStore.config.paths.targetBlog).toBe("")
    expect(configStore.config.paths.imagesDir).toBe("")
    expect(configStore.config.editorConfig.autoSave).toBe(true)
    expect(configStore.config.editorConfig.autoSaveInterval).toBe(30000)
    expect(configStore.config.editorConfig.theme).toBe("light")
    expect(configStore.isConfigured).toBe(false)
  })

  it("should validate Obsidian vault path", async () => {
    const configStore = useConfigStore()
    
    mockElectronAPI.validateArticlesDir.mockResolvedValue({
      valid: true,
      message: "有效的 Obsidian Vault"
    })

    const result = await configStore.validateArticlesDir("/path/to/vault")
    
    expect(mockElectronAPI.validateArticlesDir).toHaveBeenCalledWith("/path/to/vault")
    expect(result.valid).toBe(true)
    expect(result.message).toBe("有效的 Obsidian Vault")
  })

  it("should validate Astro blog path", async () => {
    const configStore = useConfigStore()
    
    mockElectronAPI.validateAstroBlog.mockResolvedValue({
      valid: true,
      message: "有效的 Astro 部落格專案"
    })

    const result = await configStore.validateAstroBlog("/path/to/blog")
    
    expect(mockElectronAPI.validateAstroBlog).toHaveBeenCalledWith("/path/to/blog")
    expect(result.valid).toBe(true)
    expect(result.message).toBe("有效的 Astro 部落格專案")
  })

  it("should handle empty path validation", async () => {
    const configStore = useConfigStore()
    
    const articlesResult = await configStore.validateArticlesDir("")
    const blogResult = await configStore.validateAstroBlog("  ")
    
    expect(articlesResult.valid).toBe(false)
    expect(articlesResult.message).toBe("請選擇路徑")
    expect(blogResult.valid).toBe(false)
    expect(blogResult.message).toBe("請選擇路徑")
  })

  it("should save config and update configured state", async () => {
    const configStore = useConfigStore()
    
    mockElectronAPI.setConfig.mockResolvedValue(undefined)

    const newConfig = {
      paths: {
        articlesDir: "/path/to/vault",
        targetBlog: "/path/to/blog",
        imagesDir: "/path/to/images"
      },
      editorConfig: {
        autoSave: true,
        autoSaveInterval: 30000,
        theme: "dark" as const
      }
    }

    await configStore.saveConfig(newConfig)
    
    expect(mockElectronAPI.setConfig).toHaveBeenCalledWith(newConfig)
    expect(configStore.config).toEqual(newConfig)
    expect(configStore.isConfigured).toBe(true)
  })
})