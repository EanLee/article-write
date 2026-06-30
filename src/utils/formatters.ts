/**
 * 格式化工具函數
 * 提供各種格式化功能，如檔案名稱、時間等
 */

/**
 * 從完整路徑中提取檔案名稱
 *
 * @param filePath - 完整的檔案路徑（支援 Unix 和 Windows 風格）
 * @returns 檔案名稱（不含路徑）
 *
 * @example
 * ```typescript
 * getFileName('/path/to/file.md') // => 'file.md'
 * getFileName('C:\\path\\to\\file.md') // => 'file.md'
 * getFileName('file.md') // => 'file.md'
 * ```
 */
export function getFileName(filePath: string): string {
  // 使用正則表達式分割路徑，支援 / 和 \ 分隔符
  // 返回最後一個部分（檔案名稱），如果不存在則返回空字串
  return filePath.split(/[/\\]/).pop() || ""
}
