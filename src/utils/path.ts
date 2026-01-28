/**
 * 路徑工具函數
 * 處理 Windows 和 Unix 路徑格式的統一化
 */

/**
 * 規範化路徑格式
 * 將所有反斜線轉換為正斜線，確保路徑比對的一致性
 *
 * @param path - 要規範化的路徑
 * @returns 規範化後的路徑（使用正斜線）
 *
 * @example
 * normalizePath('C:\\Users\\Ean\\Desktop\\file.md')
 * // 返回: 'C:/Users/Ean/Desktop/file.md'
 *
 * normalizePath('C:/Users/Ean/Desktop/file.md')
 * // 返回: 'C:/Users/Ean/Desktop/file.md' (已經是正斜線，不變)
 */
export function normalizePath(path: string): string {
  if (!path) {
    return path
  }
  return path.replace(/\\/g, '/')
}

/**
 * 比較兩個路徑是否相同（忽略斜線差異）
 *
 * @param path1 - 第一個路徑
 * @param path2 - 第二個路徑
 * @returns 兩個路徑是否指向同一個檔案
 *
 * @example
 * pathsEqual('C:\\Users\\file.md', 'C:/Users/file.md')
 * // 返回: true
 */
export function pathsEqual(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2)
}
