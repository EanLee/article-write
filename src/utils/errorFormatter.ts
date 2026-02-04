/**
 * 錯誤訊息格式化工具
 * 將技術性錯誤訊息轉換為使用者友善的說明，並提供修復建議
 */

/**
 * 格式化後的錯誤訊息
 */
export interface FormattedError {
  /** 使用者友善的錯誤訊息 */
  friendlyMessage: string
  /** 修復建議列表 */
  suggestions: string[]
  /** 原始錯誤訊息 */
  originalError: string
}

/**
 * 錯誤模式定義
 */
interface ErrorPattern {
  /** 錯誤代碼或關鍵字 */
  pattern: RegExp
  /** 友善訊息 */
  message: string
  /** 修復建議 */
  suggestions: string[]
}

/**
 * 常見錯誤模式映射
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // 檔案系統錯誤
  {
    pattern: /ENOENT.*no such file or directory/i,
    message: '找不到檔案或目錄',
    suggestions: [
      '請檢查檔案路徑是否正確',
      '確認檔案是否已被移動或刪除',
      '檢查路徑中是否有拼寫錯誤'
    ]
  },
  {
    pattern: /EACCES.*permission denied/i,
    message: '沒有權限存取檔案或目錄',
    suggestions: [
      '請檢查目錄的讀寫權限',
      '嘗試以管理員身份執行',
      '確認檔案未被其他程式鎖定'
    ]
  },
  {
    pattern: /EEXIST.*file already exists/i,
    message: '檔案或目錄已存在',
    suggestions: [
      '請選擇不同的名稱',
      '如果要覆蓋，請先刪除現有檔案',
      '使用不同的目標路徑'
    ]
  },
  {
    pattern: /ENOTDIR.*not a directory/i,
    message: '路徑不是有效的目錄',
    suggestions: [
      '請確認路徑指向目錄而非檔案',
      '檢查路徑中的父目錄是否存在',
      '確認路徑格式正確'
    ]
  },
  {
    pattern: /EISDIR.*illegal operation on a directory/i,
    message: '目標是目錄而非檔案',
    suggestions: [
      '請指定一個檔案而非目錄',
      '如果要操作目錄，請使用相應的目錄操作',
      '檢查路徑是否正確'
    ]
  },

  // 轉換相關錯誤
  {
    pattern: /Invalid frontmatter|missing closing/i,
    message: 'Frontmatter 格式錯誤',
    suggestions: [
      '請檢查 frontmatter 區塊的開頭和結尾是否都有 ---',
      '確認 YAML 格式正確',
      '檢查是否有未關閉的引號或括號'
    ]
  },
  {
    pattern: /Failed to copy image/i,
    message: '圖片複製失敗',
    suggestions: [
      '請確認圖片檔案存在於來源目錄',
      '檢查圖片檔案名稱是否正確',
      '確認目標目錄有足夠的空間',
      '檢查圖片檔案是否損壞'
    ]
  }
]

/**
 * 格式化錯誤訊息為使用者友善的格式
 *
 * @param error - 錯誤物件或錯誤訊息
 * @returns 格式化後的錯誤資訊
 *
 * @example
 * ```typescript
 * const error = new Error('ENOENT: no such file or directory')
 * const formatted = formatErrorMessage(error)
 * console.log(formatted.friendlyMessage) // "找不到檔案或目錄"
 * console.log(formatted.suggestions) // ["請檢查檔案路徑是否正確", ...]
 * ```
 */
export function formatErrorMessage(error: unknown): FormattedError {
  // 取得原始錯誤訊息
  let originalError: string
  if (error instanceof Error) {
    originalError = error.message
  } else if (typeof error === 'string') {
    originalError = error
  } else {
    originalError = String(error)
  }

  // 嘗試匹配已知的錯誤模式
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(originalError)) {
      return {
        friendlyMessage: pattern.message,
        suggestions: pattern.suggestions,
        originalError
      }
    }
  }

  // 未知錯誤類型，返回通用訊息
  return {
    friendlyMessage: '發生未預期的錯誤',
    suggestions: [
      '請檢查錯誤詳情以了解具體問題',
      '如果問題持續發生，請聯繫技術支援'
    ],
    originalError
  }
}
