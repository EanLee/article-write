import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface PathValidationResult {
  valid: boolean
  message: string
}

interface AppConfig {
  paths: {
    articlesDir: string
    targetBlog: string
    imagesDir: string
  }
  editorConfig: {
    autoSave: boolean
    autoSaveInterval: number
    theme: 'light' | 'dark'
  }
}

export class ConfigService {
  private configPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.configPath = join(userDataPath, 'config.json')
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8')
      return JSON.parse(configData)
    } catch {
      // Return default config if file doesn't exist
      return this.getDefaultConfig()
    }
  }

  async setConfig(config: AppConfig): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
    } catch {
      throw new Error('Failed to save configuration')
    }
  }

  async validateArticlesDir(path: string): Promise<PathValidationResult> {
    try {
      const stats = await fs.stat(path)
      if (!stats.isDirectory()) {
        return { valid: false, message: '路徑不是資料夾' }
      }

      // 檢查讀寫權限
      try {
        await fs.access(path, fs.constants.R_OK | fs.constants.W_OK)
      } catch {
        return { valid: false, message: '沒有讀寫權限' }
      }

      // 檢查是否為 Obsidian Vault（可選，有 .obsidian 資料夾更好）
      const obsidianPath = join(path, '.obsidian')
      let isObsidianVault = false
      try {
        const obsidianStats = await fs.stat(obsidianPath)
        isObsidianVault = obsidianStats.isDirectory()
      } catch {
        // .obsidian 不存在也沒關係，只是普通的 Markdown 資料夾
        isObsidianVault = false
      }

      if (isObsidianVault) {
        return { valid: true, message: '✓ 有效的 Obsidian Vault' }
      } else {
        return { valid: true, message: '✓ 有效的 Markdown 資料夾' }
      }
    } catch {
      return { valid: false, message: '無法存取路徑' }
    }
  }

  async validateAstroBlog(path: string): Promise<PathValidationResult> {
    try {
      const stats = await fs.stat(path)
      if (!stats.isDirectory()) {
        return { valid: false, message: '路徑不是資料夾' }
      }

      // 檢查是否為 Astro 專案（檢查 astro.config.*)
      const configFiles = ['astro.config.js', 'astro.config.ts', 'astro.config.mjs']
      let hasAstroConfig = false
      
      for (const configFile of configFiles) {
        try {
          const configPath = join(path, configFile)
          await fs.access(configPath, fs.constants.R_OK)
          hasAstroConfig = true
          break
        } catch {
          // 檔案不存在，繼續檢查下一個
          continue
        }
      }

      if (!hasAstroConfig) {
        return { valid: false, message: '找不到 astro.config.* 檔案' }
      }

      // 檢查 src/content/blog 結構（可選，沒有也可以手動建立）
      const blogPath = join(path, 'src', 'content', 'blog')
      let hasBlogStructure = false
      try {
        const blogStats = await fs.stat(blogPath)
        hasBlogStructure = blogStats.isDirectory()
      } catch {
        hasBlogStructure = false
      }

      if (hasBlogStructure) {
        return { valid: true, message: '✓ 有效的 Astro 部落格專案（已有 blog 資料夾）' }
      } else {
        return { valid: true, message: '✓ 有效的 Astro 專案（需要建立 src/content/blog 資料夾）' }
      }
    } catch {
      return { valid: false, message: '無法存取路徑' }
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
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
  }
}