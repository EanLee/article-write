/**
 * Mock 檔案系統實作
 *
 * 這是 IFileSystem 的記憶體內實作，用於單元測試
 * 不依賴真實的檔案系統或 Electron API
 */

import type { IFileSystem, FileStats } from '@/types/IFileSystem'

export class MockFileSystem implements IFileSystem {
  // 記憶體內的檔案儲存（路徑 -> 內容）
  private files = new Map<string, string>()

  // 記憶體內的目錄儲存（路徑 -> 子項目名稱）
  private directories = new Map<string, Set<string>>()

  // 檔案修改時間記錄
  private mtimes = new Map<string, number>()

  /**
   * 正規化路徑（統一使用正斜線）
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/')
  }

  /**
   * 取得父目錄路徑
   */
  private getParentDir(path: string): string {
    const normalized = this.normalizePath(path)
    const parts = normalized.split('/')
    parts.pop()
    return parts.join('/') || '/'
  }

  /**
   * 取得檔案/目錄名稱
   */
  private getBaseName(path: string): string {
    const normalized = this.normalizePath(path)
    const parts = normalized.split('/')
    return parts[parts.length - 1] || ''
  }

  /**
   * 確保父目錄存在
   */
  private ensureParentDir(path: string): void {
    const parentDir = this.getParentDir(path)
    if (parentDir !== '/' && !this.directories.has(parentDir)) {
      // 遞迴確保上層目錄存在
      this.ensureParentDir(parentDir)
      this.directories.set(parentDir, new Set())
    }
  }

  /**
   * 將檔案加入父目錄的索引
   */
  private addToParentDir(path: string): void {
    const parentDir = this.getParentDir(path)
    const baseName = this.getBaseName(path)

    if (parentDir === '/') {
      return
    }

    if (!this.directories.has(parentDir)) {
      this.directories.set(parentDir, new Set())
    }

    this.directories.get(parentDir)!.add(baseName)
  }

  /**
   * 從父目錄的索引中移除項目
   */
  private removeFromParentDir(path: string): void {
    const parentDir = this.getParentDir(path)
    const baseName = this.getBaseName(path)

    if (this.directories.has(parentDir)) {
      this.directories.get(parentDir)!.delete(baseName)
    }
  }

  async readFile(path: string): Promise<string> {
    const normalized = this.normalizePath(path)

    if (!this.files.has(normalized)) {
      throw new Error(`File not found: ${path}`)
    }

    return this.files.get(normalized)!
  }

  async writeFile(path: string, content: string): Promise<void> {
    const normalized = this.normalizePath(path)

    this.ensureParentDir(normalized)
    this.files.set(normalized, content)
    this.mtimes.set(normalized, Date.now())
    this.addToParentDir(normalized)
  }

  async deleteFile(path: string): Promise<void> {
    const normalized = this.normalizePath(path)

    if (!this.files.has(normalized)) {
      throw new Error(`File not found: ${path}`)
    }

    this.files.delete(normalized)
    this.mtimes.delete(normalized)
    this.removeFromParentDir(normalized)
  }

  async readDirectory(path: string): Promise<string[]> {
    const normalized = this.normalizePath(path)

    if (!this.directories.has(normalized)) {
      throw new Error(`Directory not found: ${path}`)
    }

    return Array.from(this.directories.get(normalized)!)
  }

  async createDirectory(path: string): Promise<void> {
    const normalized = this.normalizePath(path)

    if (this.directories.has(normalized)) {
      return // 目錄已存在
    }

    this.ensureParentDir(normalized)
    this.directories.set(normalized, new Set())
    this.addToParentDir(normalized)
  }

  async getFileStats(path: string): Promise<FileStats | null> {
    const normalized = this.normalizePath(path)

    // 檢查是否為目錄
    if (this.directories.has(normalized)) {
      return {
        isDirectory: true,
        mtime: Date.now(),
        size: 0
      }
    }

    // 檢查是否為檔案
    if (this.files.has(normalized)) {
      const content = this.files.get(normalized)!
      return {
        isDirectory: false,
        mtime: this.mtimes.get(normalized) || Date.now(),
        size: content.length
      }
    }

    return null
  }

  async exists(path: string): Promise<boolean> {
    const normalized = this.normalizePath(path)
    return this.files.has(normalized) || this.directories.has(normalized)
  }

  // ===== 測試輔助方法 =====

  /**
   * 清空所有檔案和目錄
   */
  clear(): void {
    this.files.clear()
    this.directories.clear()
    this.mtimes.clear()
  }

  /**
   * 取得所有檔案路徑（測試用）
   */
  getAllFiles(): string[] {
    return Array.from(this.files.keys())
  }

  /**
   * 取得所有目錄路徑（測試用）
   */
  getAllDirectories(): string[] {
    return Array.from(this.directories.keys())
  }

  /**
   * 預設設定測試資料
   */
  seed(data: { files?: Record<string, string>; directories?: string[] }): void {
    // 建立目錄
    if (data.directories) {
      for (const dir of data.directories) {
        this.createDirectory(dir)
      }
    }

    // 建立檔案
    if (data.files) {
      for (const [path, content] of Object.entries(data.files)) {
        this.writeFile(path, content)
      }
    }
  }
}
