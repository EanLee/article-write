/**
 * 路徑工具函數測試
 * 確保路徑規範化功能正常運作，防止 Windows 路徑格式不一致導致的問題
 */

import { describe, it, expect } from "vitest"
import { normalizePath, pathsEqual } from "@/utils/path"

describe("Path Utils", () => {
  describe("normalizePath", () => {
    it("應該將反斜線轉換為正斜線", () => {
      const input = "C:\\Users\\Ean\\Desktop\\R\\vault\\Drafts\\Software\\article.md"
      const expected = "C:/Users/Ean/Desktop/R/vault/Drafts/Software/article.md"
      expect(normalizePath(input)).toBe(expected)
    })

    it("應該保持已經使用正斜線的路徑不變", () => {
      const input = "C:/Users/Ean/Desktop/R/vault/Drafts/Software/article.md"
      expect(normalizePath(input)).toBe(input)
    })

    it("應該處理混合的斜線", () => {
      const input = "C:/Users\\Ean/Desktop\\R\\vault/Drafts\\Software/article.md"
      const expected = "C:/Users/Ean/Desktop/R/vault/Drafts/Software/article.md"
      expect(normalizePath(input)).toBe(expected)
    })

    it("應該處理相對路徑", () => {
      expect(normalizePath("..\\parent\\file.md")).toBe("../parent/file.md")
      expect(normalizePath(".\\current\\file.md")).toBe("./current/file.md")
    })

    it("應該處理只有檔名的情況", () => {
      expect(normalizePath("file.md")).toBe("file.md")
    })

    it("應該處理空字串", () => {
      expect(normalizePath("")).toBe("")
    })

    it("應該處理只有反斜線的路徑", () => {
      expect(normalizePath("\\\\server\\share\\file.md")).toBe("//server/share/file.md")
    })

    it("應該處理 Unix 絕對路徑", () => {
      const input = "/home/user/vault/article.md"
      expect(normalizePath(input)).toBe(input)
    })

    // 邊界測試
    it("應該處理多個連續的反斜線", () => {
      expect(normalizePath("C:\\\\Users\\\\file.md")).toBe("C://Users//file.md")
    })
  })

  describe("pathsEqual", () => {
    it("應該判斷反斜線和正斜線路徑相同", () => {
      const path1 = "C:\\Users\\Ean\\Desktop\\file.md"
      const path2 = "C:/Users/Ean/Desktop/file.md"
      expect(pathsEqual(path1, path2)).toBe(true)
    })

    it("應該判斷兩個正斜線路徑相同", () => {
      const path1 = "C:/Users/Ean/Desktop/file.md"
      const path2 = "C:/Users/Ean/Desktop/file.md"
      expect(pathsEqual(path1, path2)).toBe(true)
    })

    it("應該判斷兩個反斜線路徑相同", () => {
      const path1 = "C:\\Users\\Ean\\Desktop\\file.md"
      const path2 = "C:\\Users\\Ean\\Desktop\\file.md"
      expect(pathsEqual(path1, path2)).toBe(true)
    })

    it("應該判斷不同路徑不相同", () => {
      const path1 = "C:/Users/Ean/Desktop/file1.md"
      const path2 = "C:/Users/Ean/Desktop/file2.md"
      expect(pathsEqual(path1, path2)).toBe(false)
    })

    it("應該判斷混合斜線的相同路徑", () => {
      const path1 = "C:\\Users/Ean\\Desktop/file.md"
      const path2 = "C:/Users\\Ean/Desktop\\file.md"
      expect(pathsEqual(path1, path2)).toBe(true)
    })

    it("應該區分大小寫（Windows 路徑不區分，但此函數僅做格式轉換）", () => {
      const path1 = "C:/Users/Ean/Desktop/File.md"
      const path2 = "C:/Users/Ean/Desktop/file.md"
      // 注意：此測試確認函數"不會"自動處理大小寫
      // 如果需要不區分大小寫，需要額外實作
      expect(pathsEqual(path1, path2)).toBe(false)
    })
  })
})
