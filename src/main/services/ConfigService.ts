import { promises as fs } from "node:fs"
import { join } from "node:path"
import { app, safeStorage } from "electron"

interface PathValidationResult {
  valid: boolean
  message: string
}

type EditorTheme = "light" | "dark"

interface AppConfig {
  paths: {
    articlesDir: string
    targetDir: string
    imagesDir: string
  }
  editorConfig: {
    autoSave: boolean
    autoSaveInterval: number
    theme: EditorTheme
  }
}

export class ConfigService {
  private readonly configPath: string
  private readonly apiKeys: Map<string, Buffer> = new Map()

  constructor() {
    const userDataPath = app.getPath("userData")
    this.configPath = join(userDataPath, "config.json")
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const configData = await fs.readFile(this.configPath, "utf-8")
      const raw = JSON.parse(configData)
      return this.migrate(raw)
    } catch {
      // Return default config if file doesn"t exist
      return this.getDefaultConfig()
    }
  }

  /** 處理舊版 config 欄位名稱（targetBlog → targetDir） */
  private migrate(raw: Record<string, unknown>): AppConfig {
    const paths = (raw.paths ?? {}) as Record<string, unknown>
    if ("targetBlog" in paths && !("targetDir" in paths)) {
      paths.targetDir = paths.targetBlog
      delete paths.targetBlog
    }
    return raw as unknown as AppConfig
  }

  async setConfig(config: AppConfig): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), "utf-8")
    } catch {
      throw new Error("Failed to save configuration")
    }
  }

  async validateArticlesDir(path: string): Promise<PathValidationResult> {
    try {
      const stats = await fs.stat(path)
      if (!stats.isDirectory()) {
        return { valid: false, message: "路徑不是資料夾" }
      }

      // 檢查讀寫權限
      try {
        await fs.access(path, fs.constants.R_OK | fs.constants.W_OK)
      } catch {
        return { valid: false, message: "沒有讀寫權限" }
      }

      // 檢查是否為 Obsidian Vault（可選，有 .obsidian 資料夾更好）
      const obsidianPath = join(path, ".obsidian")
      let isObsidianVault = false
      try {
        const obsidianStats = await fs.stat(obsidianPath)
        isObsidianVault = obsidianStats.isDirectory()
      } catch {
        // .obsidian 不存在也沒關係，只是普通的 Markdown 資料夾
        isObsidianVault = false
      }

      if (isObsidianVault) {
        return { valid: true, message: "✓ 有效的 Obsidian Vault" }
      } else {
        return { valid: true, message: "✓ 有效的 Markdown 資料夾" }
      }
    } catch {
      return { valid: false, message: "無法存取路徑" }
    }
  }

  async validateAstroBlog(path: string): Promise<PathValidationResult> {
    try {
      const stats = await fs.stat(path)
      if (!stats.isDirectory()) {
        return { valid: false, message: "路徑不是資料夾" }
      }

      // target 就是直接輸出的資料夾，不需要驗證 Astro 專案結構
      return { valid: true, message: "✓ 有效的輸出資料夾" }
    } catch {
      return { valid: false, message: "無法存取路徑" }
    }
  }

  setApiKey(provider: string, key: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("系統加密功能不可用")
    }
    this.apiKeys.set(provider, safeStorage.encryptString(key))
  }

  getApiKey(provider: string): string | null {
    const encrypted = this.apiKeys.get(provider)
    if (!encrypted) {return null}
    try {
      return safeStorage.decryptString(encrypted)
    } catch {
      return null
    }
  }

  hasApiKey(provider: string): boolean {
    return this.apiKeys.has(provider) && this.getApiKey(provider) !== null
  }

  private getDefaultConfig(): AppConfig {
    return {
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
    }
  }
}