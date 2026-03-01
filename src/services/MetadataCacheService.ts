import { electronFileSystem } from "./ElectronFileSystem"
import { MarkdownService } from "./MarkdownService"

export interface MetadataCache {
  lastScanned: string
  categories: string[]
  tags: string[]
}

const CACHE_DIR = ".writeflow"
const CACHE_FILE = "metadata-cache.json"

/** 預設記憶體內快取 TTL：5 分鐘（可由呼叫端覆蓋） */
export const DEFAULT_TTL_MS = 5 * 60 * 1000

export class MetadataCacheService {
  private cache: MetadataCache | null = null
  private markdownService = new MarkdownService()

  private getCacheDir(articlesDir: string): string {
    const normalized = articlesDir.replace(/\\/g, "/").replace(/\/$/, "")
    return `${normalized}/${CACHE_DIR}`
  }

  private getCachePath(articlesDir: string): string {
    return `${this.getCacheDir(articlesDir)}/${CACHE_FILE}`
  }

  /**
   * 判斷快取是否在 TTL 時效內
   * @param cache 要檢查的快取物件
   * @param ttlMs TTL 毫秒數，預設 DEFAULT_TTL_MS（5 分鐘）
   */
  isFresh(cache: MetadataCache, ttlMs: number = DEFAULT_TTL_MS): boolean {
    const lastScannedMs = new Date(cache.lastScanned).getTime()
    return Date.now() - lastScannedMs < ttlMs
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

  /**
   * 取得快取，若記憶體快取不新鮮則從磁碟讀取；
   * 若磁碟快取不存在或亦超過 TTL，則在背景自動掃描並立即回傳舊快取（或空值）。
   * @param articlesDir 文章目錄路徑
   * @param ttlMs TTL 毫秒數，預設 DEFAULT_TTL_MS（5 分鐘）
   */
  async getOrScan(
    articlesDir: string,
    ttlMs: number = DEFAULT_TTL_MS
  ): Promise<MetadataCache | null> {
    // 1. 記憶體快取若新鮮，直接回傳
    if (this.cache && this.isFresh(this.cache, ttlMs)) {
      return this.cache
    }

    // 2. 嘗試從磁碟載入
    const diskCache = await this.load(articlesDir)

    // 3. 若磁碟快取存在且新鮮，回傳並更新記憶體快取
    if (diskCache && this.isFresh(diskCache, ttlMs)) {
      this.cache = diskCache
      return diskCache
    }

    // 4. 快取過期或不存在 → 背景掃描（不阻塞呼叫端）
    this.scan(articlesDir).catch(() => {
      // 掃描失敗靜默處理，不影響呼叫端
    })

    // 5. 立即回傳舊快取（或 null），讓呼叫端可以繼續
    return diskCache ?? this.cache
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
      const fullPath = `${dir}/${item}`.replace(/\/+/g, "/")
      const stats = await electronFileSystem.getFileStats(fullPath)

      if (stats?.isDirectory) {
        await this.collectFromDir(fullPath, categories, tags)
      } else if (item.endsWith(".md")) {
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
    const cacheDir = this.getCacheDir(articlesDir)
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
