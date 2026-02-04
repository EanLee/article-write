import { describe, it, expect } from 'vitest'
import { formatErrorMessage } from '@/utils/errorFormatter'

/**
 * 錯誤訊息格式化工具測試
 *
 * 目標：
 * - 將技術性錯誤訊息轉換為使用者友善的說明
 * - 提供可能的修復建議
 * - 支援常見的檔案系統錯誤
 */
describe('formatErrorMessage', () => {
  describe('檔案系統錯誤', () => {
    it('應該格式化 ENOENT 錯誤（檔案不存在）', () => {
      const error = new Error('ENOENT: no such file or directory, open \'/path/to/file.md\'')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toContain('找不到檔案或目錄')
      expect(result.suggestions).toContain('請檢查檔案路徑是否正確')
    })

    it('應該格式化 EACCES 錯誤（權限不足）', () => {
      const error = new Error('EACCES: permission denied, mkdir \'/protected/dir\'')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toContain('沒有權限')
      expect(result.suggestions).toContain('請檢查目錄的讀寫權限')
    })

    it('應該格式化 EEXIST 錯誤（檔案已存在）', () => {
      const error = new Error('EEXIST: file already exists, mkdir \'/path/to/dir\'')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toContain('檔案或目錄已存在')
      expect(result.suggestions).toContain('請選擇不同的名稱')
    })

    it('應該格式化 ENOTDIR 錯誤（不是目錄）', () => {
      const error = new Error('ENOTDIR: not a directory, scandir \'/path/file.txt\'')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toContain('不是有效的目錄')
      expect(result.suggestions).toContain('請確認路徑指向目錄而非檔案')
    })

    it('應該格式化 EISDIR 錯誤（是目錄而非檔案）', () => {
      const error = new Error('EISDIR: illegal operation on a directory, read')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toContain('目標是目錄而非檔案')
      expect(result.suggestions).toContain('請指定一個檔案而非目錄')
    })
  })

  describe('轉換相關錯誤', () => {
    it('應該格式化 Markdown 語法錯誤', () => {
      const error = new Error('Invalid frontmatter: missing closing ---')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toContain('Frontmatter 格式錯誤')
      expect(result.suggestions.some(s => s.includes('frontmatter'))).toBe(true)
    })

    it('應該格式化圖片複製失敗錯誤', () => {
      const error = new Error('Failed to copy image: image.png')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toContain('圖片複製失敗')
      expect(result.suggestions.some(s => s.includes('圖片檔案存在'))).toBe(true)
    })
  })

  describe('未知錯誤', () => {
    it('應該處理未知的錯誤類型', () => {
      const error = new Error('Some unknown error occurred')
      error.name = 'Error'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toBe('發生未預期的錯誤')
      expect(result.originalError).toBe('Some unknown error occurred')
      expect(result.suggestions.some(s => s.includes('錯誤詳情'))).toBe(true)
    })

    it('應該處理非 Error 物件', () => {
      const error = 'String error message'

      const result = formatErrorMessage(error)

      expect(result.friendlyMessage).toBe('發生未預期的錯誤')
      expect(result.originalError).toBe('String error message')
    })
  })

  describe('返回格式', () => {
    it('應該返回包含必要欄位的物件', () => {
      const error = new Error('ENOENT: no such file or directory')

      const result = formatErrorMessage(error)

      expect(result).toHaveProperty('friendlyMessage')
      expect(result).toHaveProperty('suggestions')
      expect(result).toHaveProperty('originalError')
      expect(Array.isArray(result.suggestions)).toBe(true)
    })

    it('suggestions 應該是字串陣列', () => {
      const error = new Error('ENOENT: no such file or directory')

      const result = formatErrorMessage(error)

      expect(Array.isArray(result.suggestions)).toBe(true)
      result.suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string')
        expect(suggestion.length).toBeGreaterThan(0)
      })
    })
  })
})
