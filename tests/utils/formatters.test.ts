import { describe, it, expect } from 'vitest'
import { getFileName } from '@/utils/formatters'

/**
 * 測試檔案名稱格式化工具
 *
 * 目的：確保從完整路徑中正確提取檔案名稱
 * 使用場景：ConversionPanel 顯示當前處理的檔案
 */
describe('getFileName', () => {
  describe('基本功能', () => {
    it('應該從 Unix 風格路徑提取檔案名稱', () => {
      const result = getFileName('/path/to/file.md')
      expect(result).toBe('file.md')
    })

    it('應該從 Windows 風格路徑提取檔案名稱', () => {
      const result = getFileName('C:\\path\\to\\file.md')
      expect(result).toBe('file.md')
    })

    it('應該處理混合路徑分隔符', () => {
      const result = getFileName('/path\\to/file.md')
      expect(result).toBe('file.md')
    })

    it('應該保留副檔名', () => {
      const result = getFileName('/path/to/document.test.md')
      expect(result).toBe('document.test.md')
    })

    it('當輸入就是檔案名稱時應該返回原值', () => {
      const result = getFileName('file.md')
      expect(result).toBe('file.md')
    })

    it('應該處理空字串', () => {
      const result = getFileName('')
      expect(result).toBe('')
    })

    it('應該處理只有路徑沒有檔案的情況', () => {
      const result = getFileName('/path/to/')
      expect(result).toBe('')
    })
  })

  describe('特殊字元', () => {
    it('應該處理包含空格的檔案名稱', () => {
      const result = getFileName('/path/to/my file.md')
      expect(result).toBe('my file.md')
    })

    it('應該處理包含中文的檔案名稱', () => {
      const result = getFileName('/path/to/相關文章.md')
      expect(result).toBe('相關文章.md')
    })

    it('應該處理包含特殊字元的檔案名稱', () => {
      const result = getFileName('/path/to/C++ Guide.md')
      expect(result).toBe('C++ Guide.md')
    })
  })

  describe('邊界情況', () => {
    it('應該處理超長路徑', () => {
      const longPath = '/very/long/path/with/many/segments/file.md'
      const result = getFileName(longPath)
      expect(result).toBe('file.md')
    })

    it('應該處理沒有副檔名的檔案', () => {
      const result = getFileName('/path/to/README')
      expect(result).toBe('README')
    })

    it('應該處理以點開頭的隱藏檔案', () => {
      const result = getFileName('/path/to/.gitignore')
      expect(result).toBe('.gitignore')
    })
  })
})
