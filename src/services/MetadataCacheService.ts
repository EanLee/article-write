import { electronFileSystem } from './ElectronFileSystem'
import { MarkdownService } from './MarkdownService'

export interface MetadataCache {
  lastScanned: string
  categories: string[]
  tags: string[]
}

const CACHE_DIR = '.writeflow'
const CACHE_FILE = 'metadata-cache.json'

class MetadataCacheService {
  private cache: MetadataCache | null = null
  private markdownService = new MarkdownService()

  private getVaultRoot(articlesDir: string): string {
    const normalized = articlesDir.replace(/\\/g, '/').replace(/\/$/, '')
    const parts = normalized.split('/')
    parts.pop()
    return parts.join('/')
  }

  private getCachePath(articlesDir: string): string {
    return `${this.getVaultRoot(articlesDir)}/${CACHE_DIR}/${CACHE_FILE}`
  }

  async load(articlesDir: string): Promise<MetadataCache | null> {
    try {
      const content = await electronFileSystem.readFile(this.getCachePath(articlesDir))
      this.cache = JSON.parse(content) as MetadataCache
      return this.cache
    } catch {
      return null
    }
  }

  async scan(articlesDir: string): Promise<MetadataCache> {
    const categoriesSet = new Set<string>()
    const tagsSet = new Set<string>()

    await this.collectFromDir(articlesDir, categoriesSet, tagsSet)

    const newCache: MetadataCache = {
      lastScanned: new Date().toISOString(),
      categories: Array.from(categoriesSet).sort(),
      tags: Array.from(tagsSet).sort(),
    }

    await this.save(articlesDir, newCache)
    this.cache = newCache
    return newCache
  }

  private async collectFromDir(
    dir: string,
    categories: Set<string>,
    tags: Set<string>
  ): Promise<void> {
    let items: string[]
    try {
      items = await electronFileSystem.readDirectory(dir)
    } catch {
      return
    }

    for (const item of items) {
      const fullPath = `${dir}/${item}`.replace(/\/+/g, '/')
      const stats = await electronFileSystem.getFileStats(fullPath)

      if (stats?.isDirectory) {
        await this.collectFromDir(fullPath, categories, tags)
      } else if (item.endsWith('.md')) {
        try {
          const content = await electronFileSystem.readFile(fullPath)
          const { frontmatter } = this.markdownService.parseFrontmatter(content)

          if (frontmatter.categories?.length) {
            frontmatter.categories.forEach((c: string) => categories.add(c))
          }
          if (frontmatter.tags?.length) {
            frontmatter.tags.forEach((t: string) => tags.add(t))
          }
        } catch {
          // 單一檔案解析失敗，繼續處理其他檔案
        }
      }
    }
  }

  private async save(articlesDir: string, cache: MetadataCache): Promise<void> {
    const cacheDir = `${this.getVaultRoot(articlesDir)}/${CACHE_DIR}`
    try {
      await electronFileSystem.createDirectory(cacheDir)
    } catch {
      // 資料夾已存在，忽略
    }
    await electronFileSystem.writeFile(
      `${cacheDir}/${CACHE_FILE}`,
      JSON.stringify(cache, null, 2)
    )
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
