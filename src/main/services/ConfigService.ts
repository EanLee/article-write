import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface PathValidationResult {
  valid: boolean
  message: string
}

interface AppConfig {
  paths: {
    obsidianVault: string
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

  async validateObsidianVault(path: string): Promise<PathValidationResult> {
    try {
      const stats = await fs.stat(path)
      if (!stats.isDirectory()) {
        return { valid: false, message: '路徑不是資料夾' }
      }

      // Check for required subdirectories
      const requiredDirs = ['Publish', 'Drafts', 'Images']
      const missingDirs: string[] = []

      for (const dir of requiredDirs) {
        try {
          const dirPath = join(path, dir)
          const dirStats = await fs.stat(dirPath)
          if (!dirStats.isDirectory()) {
            missingDirs.push(dir)
          }
        } catch {
          missingDirs.push(dir)
        }
      }

      if (missingDirs.length > 0) {
        return { 
          valid: false, 
          message: `缺少必要資料夾: ${missingDirs.join(', ')}` 
        }
      }

      return { valid: true, message: '有效的 Obsidian Vault' }
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

      // Check for package.json
      try {
        const packageJsonPath = join(path, 'package.json')
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
        
        // Check if it's an Astro project
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
        if (!dependencies.astro) {
          return { valid: false, message: '不是 Astro 專案' }
        }
      } catch {
        return { valid: false, message: '找不到 package.json 或格式錯誤' }
      }

      // Check for src/content/blog structure
      try {
        const blogPath = join(path, 'src', 'content', 'blog')
        const blogStats = await fs.stat(blogPath)
        if (!blogStats.isDirectory()) {
          return { valid: false, message: '缺少 src/content/blog 資料夾' }
        }
      } catch {
        return { valid: false, message: '缺少 src/content/blog 資料夾' }
      }

      return { valid: true, message: '有效的 Astro 部落格專案' }
    } catch {
      return { valid: false, message: '無法存取路徑' }
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      paths: {
        obsidianVault: '',
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