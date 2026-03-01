/**
 * FileWatchService 單元測試
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { FileWatchService } from "@/services/FileWatchService"

// Mock 全域 electronAPI
const mockOnFileChange = vi.fn()
const mockStartFileWatching = vi.fn()
const mockStopFileWatching = vi.fn()

global.window = {
  electronAPI: {
    startFileWatching: mockStartFileWatching,
    stopFileWatching: mockStopFileWatching,
    onFileChange: mockOnFileChange
  }
} as any

describe("FileWatchService", () => {
  let service: FileWatchService

  beforeEach(() => {
    service = new FileWatchService()
    vi.clearAllMocks()
    mockStartFileWatching.mockResolvedValue(undefined)
    mockStopFileWatching.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    await service.stopWatching()
  })

  describe("startWatching", () => {
    it("should start watching a directory", async () => {
      const path = "/test/vault"

      await service.startWatching(path)

      expect(mockStartFileWatching).toHaveBeenCalledWith(path)
      expect(mockOnFileChange).toHaveBeenCalled()

      const status = service.getStatus()
      expect(status.isWatching).toBe(true)
      expect(status.watchedPath).toBe(path)
    })

    it("should not start watching if already watching the same path", async () => {
      const path = "/test/vault"

      await service.startWatching(path)
      mockStartFileWatching.mockClear()

      await service.startWatching(path)

      expect(mockStartFileWatching).not.toHaveBeenCalled()
    })

    it("should stop previous watch before starting new one", async () => {
      await service.startWatching("/test/vault1")
      mockStartFileWatching.mockClear()

      await service.startWatching("/test/vault2")

      expect(mockStopFileWatching).toHaveBeenCalled()
      expect(mockStartFileWatching).toHaveBeenCalledWith("/test/vault2")
    })
  })

  describe("stopWatching", () => {
    it("should stop watching", async () => {
      await service.startWatching("/test/vault")

      await service.stopWatching()

      expect(mockStopFileWatching).toHaveBeenCalled()

      const status = service.getStatus()
      expect(status.isWatching).toBe(false)
      expect(status.watchedPath).toBe(null)
    })

    it("should do nothing if not watching", async () => {
      await service.stopWatching()

      expect(mockStopFileWatching).not.toHaveBeenCalled()
    })
  })

  describe("subscribe", () => {
    it("should call callback when file changes", async () => {
      const callback = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      service.subscribe(callback)

      // 模擬檔案變化
      fileChangeHandler({ event: "change", path: "/test/vault/file.md" })

      expect(callback).toHaveBeenCalledWith({
        event: "change",
        path: "/test/vault/file.md"
      })
    })

    it("should allow multiple subscribers", async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      service.subscribe(callback1)
      service.subscribe(callback2)

      fileChangeHandler({ event: "add", path: "/test/vault/new.md" })

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it("should return unsubscribe function", async () => {
      const callback = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      const unsubscribe = service.subscribe(callback)

      // 取消訂閱
      unsubscribe()

      fileChangeHandler({ event: "change", path: "/test/vault/file.md" })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe("ignoreNextChange", () => {
    it("should ignore file changes for specified duration", async () => {
      const callback = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      service.subscribe(callback)

      // 忽略此檔案的變化
      service.ignoreNextChange("/test/vault/file.md", 100)

      // 立即觸發變化（應該被忽略）
      fileChangeHandler({ event: "change", path: "/test/vault/file.md" })

      expect(callback).not.toHaveBeenCalled()
    })

    it("should allow changes after ignore duration expires", async () => {
      vi.useFakeTimers()

      const callback = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      service.subscribe(callback)

      service.ignoreNextChange("/test/vault/file.md", 100)

      // 100ms 後
      vi.advanceTimersByTime(101)

      fileChangeHandler({ event: "change", path: "/test/vault/file.md" })

      expect(callback).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it("should normalize path before ignoring", async () => {
      const callback = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      service.subscribe(callback)

      // 使用反斜線路徑
      service.ignoreNextChange("C:\\test\\vault\\file.md", 100)

      // 使用正斜線路徑觸發（應該被忽略）
      fileChangeHandler({ event: "change", path: "C:/test/vault/file.md" })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe("debounce", () => {
    it("should debounce rapid file changes", async () => {
      vi.useFakeTimers()

      const callback = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      service.subscribe(callback)

      // 快速連續觸發 3 次
      fileChangeHandler({ event: "change", path: "/test/vault/file.md" })
      vi.advanceTimersByTime(500) // 500ms
      fileChangeHandler({ event: "change", path: "/test/vault/file.md" })
      vi.advanceTimersByTime(500) // 1000ms
      fileChangeHandler({ event: "change", path: "/test/vault/file.md" })

      // 只應該觸發 2 次（第一次 + 1000ms 後的）
      expect(callback).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })

  describe("path normalization", () => {
    it("should normalize paths in file change events", async () => {
      const callback = vi.fn()
      let fileChangeHandler: any

      mockOnFileChange.mockImplementation((handler) => {
        fileChangeHandler = handler
        return vi.fn()
      })

      await service.startWatching("/test/vault")
      service.subscribe(callback)

      // Electron 可能返回反斜線路徑
      fileChangeHandler({ event: "change", path: "C:\\test\\vault\\file.md" })

      // 回調應該收到正斜線路徑
      expect(callback).toHaveBeenCalledWith({
        event: "change",
        path: "C:/test/vault/file.md"
      })
    })
  })
})
