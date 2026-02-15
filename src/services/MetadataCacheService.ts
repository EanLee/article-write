import { electronFileSystem } from './ElectronFileSystem'
import { FileScannerService } from './FileScannerService'
import { ArticleStatus } from '@/types'

export interface MetadataCache {
  lastScanned: string
  categories: string[]
  tags: string[]
}

const CACHE_DIR = '.writeflow'
const CACHE_FILE = 'metadata-cache.json'

class MetadataCacheService {
  private cache: MetadataCache | null = null
  private fileScannerService: FileScannerService

  constructor() {
    this.fileScannerService = new FileScannerService()
  }

  private getCachePath(articlesDir: string): string {
    const vaultRoot = this.getVaultRoot(articlesDir)
    return `${vaultRoot}/${CACHE_DIR}/${CACHE_FILE}`
  }

  private getVaultRoot(articlesDir: string): string {
    // articlesDir 通常是 vault 下的某個子目錄，往上一層取得 vault 根目錄
    const normalized = articlesDir.replace(/\\/g, '/').replace(/\/$/, '')
    const parts = normalized.split('/')
    parts.pop()
    return parts.join('/')
  }

  async load(articlesDir: string): Promise<MetadataCache | null> {
    const cachePath = this.getCachePath(articlesDir)
    try {
      const content = await electronFileSystem.readFile(cachePath)
      this.cache = JSON.parse(content) as MetadataCache
      return this.cache
    } catch {
      // cache 不存在或讀取失敗，回傳 null
      return null
    }
  }

  async scan(articlesDir: string): Promise<MetadataCache> {
    const articles = await this.fileScannerService.scanMarkdownFiles(
      articlesDir,
      ArticleStatus.Draft
    )

    const categoriesSet = new Set<string>()
    const tagsSet = new Set<string>()

    for (const article of articles) {
      if (article.category) {
        categoriesSet.add(article.category)
      }
      for (const tag of article.frontmatter.tags ?? []) {
        tagsSet.add(tag)
      }
    }

    const newCache: MetadataCache = {
      lastScanned: new Date().toISOString(),
      categories: Array.from(categoriesSet).sort(),
      tags: Array.from(tagsSet).sort(),
    }

    await this.save(articlesDir, newCache)
    this.cache = newCache
    return newCache
  }

  private async save(articlesDir: string, cache: MetadataCache): Promise<void> {
    const vaultRoot = this.getVaultRoot(articlesDir)
    const cacheDir = `${vaultRoot}/${CACHE_DIR}`

    try {
      await electronFileSystem.createDirectory(cacheDir)
    } catch {
      // 資料夾已存在，忽略
    }

    const cachePath = `${cacheDir}/${CACHE_FILE}`
    await electronFileSystem.writeFile(cachePath, JSON.stringify(cache, null, 2))
  }

  getCache(): MetadataCache | null {
    return this.cache
  }

  getCategories(): string[] {
    return this.cache?.categories ?? []
  }

  getTags(): string[] {
    return this.cache?.tags ?? []
  }
}

export const metadataCacheService = new MetadataCacheService()
