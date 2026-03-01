/**
 * Electron 檔案系統實作
 *
 * 這是 IFileSystem 的具體實作，透過 Electron IPC 與主程序通訊
 * 用於生產環境
 */

import type { IFileSystem, FileStats } from "@/types/IFileSystem"

export class ElectronFileSystem implements IFileSystem {
  /**
   * 檢查 Electron API 是否可用
   * @throws Error 如果 Electron API 不可用
   */
  private ensureElectronAPI(): void {
    if (typeof window === "undefined" || !window.electronAPI) {
      throw new Error("Electron API not available")
    }
  }

  async readFile(path: string): Promise<string> {
    this.ensureElectronAPI()
    return await window.electronAPI.readFile(path)
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.ensureElectronAPI()
    await window.electronAPI.writeFile(path, content)
  }

  async deleteFile(path: string): Promise<void> {
    this.ensureElectronAPI()
    await window.electronAPI.deleteFile(path)
  }

  async readDirectory(path: string): Promise<string[]> {
    this.ensureElectronAPI()
    return await window.electronAPI.readDirectory(path)
  }

  async createDirectory(path: string): Promise<void> {
    this.ensureElectronAPI()
    await window.electronAPI.createDirectory(path)
  }

  async getFileStats(path: string): Promise<FileStats | null> {
    this.ensureElectronAPI()
    const stats = await window.electronAPI.getFileStats(path)
    return stats
  }

  async exists(path: string): Promise<boolean> {
    try {
      const stats = await this.getFileStats(path)
      return stats !== null
    } catch {
      return false
    }
  }
}

// 單例實例（生產環境使用）
export const electronFileSystem = new ElectronFileSystem()
