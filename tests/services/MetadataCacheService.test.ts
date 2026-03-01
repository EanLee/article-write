import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { MetadataCacheService, DEFAULT_TTL_MS } from "@/services/MetadataCacheService"
import type { MetadataCache } from "@/services/MetadataCacheService"

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/services/ElectronFileSystem", () => ({
  electronFileSystem: {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readDirectory: vi.fn().mockResolvedValue([]),
    getFileStats: vi.fn().mockResolvedValue(null),
    createDirectory: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("@/services/MarkdownService", () => {
  class MarkdownService {
    parseFrontmatter = vi.fn().mockReturnValue({
      frontmatter: { categories: [], tags: [] },
      content: "",
    })
  }
  return { MarkdownService }
})

import { electronFileSystem } from "@/services/ElectronFileSystem"

const mockReadFile = vi.mocked(electronFileSystem.readFile)
const mockWriteFile = vi.mocked(electronFileSystem.writeFile)
const mockReadDirectory = vi.mocked(electronFileSystem.readDirectory)
const mockCreateDirectory = vi.mocked(electronFileSystem.createDirectory)

// ── Helpers ───────────────────────────────────────────────────────────────────

const ARTICLES_DIR = "/vault/articles"

function makeCacheJson(overrides: Partial<MetadataCache> = {}): string {
  const cache: MetadataCache = {
    lastScanned: new Date().toISOString(),
    categories: ["tech", "life"],
    tags: ["vue", "typescript"],
    ...overrides,
  }
  return JSON.stringify(cache)
}

function staleTimestamp(): string {
  return new Date(Date.now() - DEFAULT_TTL_MS - 1000).toISOString()
}

function freshTimestamp(): string {
  return new Date(Date.now() - 1000).toISOString() // 1 秒前
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MetadataCacheService", () => {
  let service: MetadataCacheService

  beforeEach(() => {
    vi.clearAllMocks()
    // 每次建立新實例以重置 private cache 狀態
    service = new MetadataCacheService()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── isFresh() ─────────────────────────────────────────────────────────────

  describe("isFresh()", () => {
    it("新鮮快取應回傳 true", () => {
      const cache: MetadataCache = {
        lastScanned: freshTimestamp(),
        categories: [],
        tags: [],
      }
      expect(service.isFresh(cache)).toBe(true)
    })

    it("超過 TTL 的快取應回傳 false", () => {
      const cache: MetadataCache = {
        lastScanned: staleTimestamp(),
        categories: [],
        tags: [],
      }
      expect(service.isFresh(cache)).toBe(false)
    })

    it("自訂 ttlMs 為 0 時，任何快取都應視為過期", () => {
      const cache: MetadataCache = {
        lastScanned: new Date().toISOString(), // 剛掃描
        categories: [],
        tags: [],
      }
      expect(service.isFresh(cache, 0)).toBe(false)
    })

    it("自訂較長 ttlMs 時，舊快取也可視為新鮮", () => {
      const cache: MetadataCache = {
        lastScanned: staleTimestamp(),
        categories: [],
        tags: [],
      }
      const veryLongTtl = 24 * 60 * 60 * 1000 // 24 小時
      expect(service.isFresh(cache, veryLongTtl)).toBe(true)
    })
  })

  // ── load() ────────────────────────────────────────────────────────────────

  describe("load()", () => {
    it("應從磁碟讀取快取並回傳解析後的物件", async () => {
      mockReadFile.mockResolvedValueOnce(makeCacheJson({ categories: ["tech"] }))

      const result = await service.load(ARTICLES_DIR)

      expect(result).not.toBeNull()
      expect(result?.categories).toEqual(["tech"])
    })

    it("磁碟讀取失敗時應回傳 null", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("File not found"))

      const result = await service.load(ARTICLES_DIR)

      expect(result).toBeNull()
    })

    it("應讀取正確的快取路徑", async () => {
      mockReadFile.mockResolvedValueOnce(makeCacheJson())

      await service.load(ARTICLES_DIR)

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(".writeflow/metadata-cache.json")
      )
    })
  })

  // ── getOrScan() ───────────────────────────────────────────────────────────

  describe("getOrScan()", () => {
    it("記憶體快取新鮮時，應直接回傳而不讀取磁碟", async () => {
      // 先載入一次建立記憶體快取
      mockReadFile.mockResolvedValueOnce(makeCacheJson({ lastScanned: freshTimestamp() }))
      await service.load(ARTICLES_DIR)
      vi.clearAllMocks()

      const result = await service.getOrScan(ARTICLES_DIR)

      expect(mockReadFile).not.toHaveBeenCalled()
      expect(result?.categories).toEqual(["tech", "life"])
    })

    it("磁碟快取新鮮時，應從磁碟讀取並回傳", async () => {
      mockReadFile.mockResolvedValueOnce(
        makeCacheJson({ lastScanned: freshTimestamp(), categories: ["fresh-category"] })
      )

      const result = await service.getOrScan(ARTICLES_DIR)

      expect(result?.categories).toEqual(["fresh-category"])
    })

    it("磁碟快取過期時，應在背景觸發掃描並立即回傳舊快取", async () => {
      const staleCacheJson = makeCacheJson({
        lastScanned: staleTimestamp(),
        categories: ["stale-data"],
      })
      mockReadFile.mockResolvedValueOnce(staleCacheJson)
      // Background scan will read directory (empty) and then write
      mockReadDirectory.mockResolvedValue([])
      mockCreateDirectory.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const result = await service.getOrScan(ARTICLES_DIR)

      // 立即回傳舊快取（不等待掃描完成）
      expect(result?.categories).toEqual(["stale-data"])
    })

    it("磁碟快取不存在時，應觸發背景掃描並回傳 null", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("not found"))
      mockReadDirectory.mockResolvedValue([])
      mockCreateDirectory.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const result = await service.getOrScan(ARTICLES_DIR)

      expect(result).toBeNull()
    })

    it("使用自訂 ttlMs 時，應以自訂值判斷快取新鮮度", async () => {
      // 快取 10 秒前掃描，對 5 分鐘 TTL 是新鮮的，對 0 是過期的
      const recentCache = makeCacheJson({
        lastScanned: new Date(Date.now() - 10_000).toISOString(),
        categories: ["recent"],
      })
      mockReadFile.mockResolvedValueOnce(recentCache)

      // 使用 0 ms TTL，應視為過期並背景掃描
      mockReadDirectory.mockResolvedValue([])
      mockCreateDirectory.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)
      const result = await service.getOrScan(ARTICLES_DIR, 0)

      // 立即回傳舊快取（因為有磁碟快取）
      expect(result?.categories).toEqual(["recent"])
    })
  })

  // ── scan() ────────────────────────────────────────────────────────────────

  describe("scan()", () => {
    it("掃描後應更新記憶體快取", async () => {
      mockReadDirectory.mockResolvedValue([])

      await service.scan(ARTICLES_DIR)

      const cache = service.getCache()
      expect(cache).not.toBeNull()
      expect(cache?.categories).toEqual([])
    })

    it("掃描結果應寫入磁碟", async () => {
      mockReadDirectory.mockResolvedValue([])

      await service.scan(ARTICLES_DIR)

      expect(mockWriteFile).toHaveBeenCalledOnce()
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as MetadataCache
      expect(writtenContent).toHaveProperty("lastScanned")
    })

    it("掃描後 lastScanned 應為近期時間", async () => {
      const before = Date.now()
      mockReadDirectory.mockResolvedValue([])

      const result = await service.scan(ARTICLES_DIR)

      const scannedAt = new Date(result.lastScanned).getTime()
      expect(scannedAt).toBeGreaterThanOrEqual(before)
      expect(scannedAt).toBeLessThanOrEqual(Date.now())
    })
  })

  // ── DEFAULT_TTL_MS export ────────────────────────────────────────────────

  describe("DEFAULT_TTL_MS", () => {
    it("應為 5 分鐘（300,000 毫秒）", () => {
      expect(DEFAULT_TTL_MS).toBe(5 * 60 * 1000)
    })
  })
})
