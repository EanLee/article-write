/**
 * 檔案系統抽象介面
 *
 * 這個介面定義了檔案系統操作的標準方法，
 * 遵循依賴反轉原則（Dependency Inversion Principle）
 *
 * 優點：
 * - 解耦：Service 層不直接依賴 Electron API
 * - 可測試：可以注入 Mock 實作進行單元測試
 * - 可移植：可以輕鬆切換到其他平台（Web, Node.js 等）
 */

/**
 * 檔案統計資訊
 */
export interface FileStats {
  /** 是否為目錄 */
  isDirectory: boolean
  /** 最後修改時間（毫秒時間戳） */
  mtime: number
  /** 檔案大小（bytes） */
  size?: number
}

/**
 * 檔案系統介面
 *
 * 所有檔案 I/O 操作必須透過此介面
 */
export interface IFileSystem {
  /**
   * 讀取檔案內容
   * @param path - 檔案路徑
   * @returns 檔案內容（UTF-8 字串）
   */
  readFile(path: string): Promise<string>

  /**
   * 寫入檔案內容
   * @param path - 檔案路徑
   * @param content - 檔案內容（UTF-8 字串）
   */
  writeFile(path: string, content: string): Promise<void>

  /**
   * 刪除檔案
   * @param path - 檔案路徑
   */
  deleteFile(path: string): Promise<void>

  /**
   * 讀取目錄內容
   * @param path - 目錄路徑
   * @returns 檔案/目錄名稱陣列
   */
  readDirectory(path: string): Promise<string[]>

  /**
   * 建立目錄
   * @param path - 目錄路徑
   */
  createDirectory(path: string): Promise<void>

  /**
   * 取得檔案統計資訊
   * @param path - 檔案/目錄路徑
   * @returns 統計資訊，如果不存在則返回 null
   */
  getFileStats(path: string): Promise<FileStats | null>

  /**
   * 檢查檔案或目錄是否存在
   * @param path - 檔案/目錄路徑
   * @returns 是否存在
   */
  exists(path: string): Promise<boolean>
}
