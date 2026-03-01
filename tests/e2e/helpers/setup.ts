/**
 * E2E 測試輔助函數
 * 提供測試資料建立、清理等功能
 */

import type { Page } from "@playwright/test"

/**
 * 建立測試用的文章資料
 * @param page - Playwright Page 物件
 * @param count - 要建立的文章數量
 */
export async function createTestArticles(page: Page, count: number = 20) {
  // 這裡需要根據實際應用程式的 API 或資料庫來實作
  // 可能的方式：
  // 1. 透過 window.electronAPI 直接建立檔案
  // 2. 透過應用程式的 UI 建立
  // 3. 直接操作測試資料庫

  // 範例：透過 UI 建立
  for (let i = 0; i < count; i++) {
    await page.evaluate((index) => {
      // 假設可以透過 window 物件存取 store
      const store = (window as any).__articleStore__
      if (store) {
        store.createArticle(`測試文章 ${index + 1}`, "Software")
      }
    }, i)
  }
}

/**
 * 清理測試資料
 * @param page - Playwright Page 物件
 */
export async function cleanupTestArticles(page: Page) {
  await page.evaluate(() => {
    const store = (window as any).__articleStore__
    if (store) {
      // 刪除所有測試文章
      store.articles.value = store.articles.value.filter(
        (a: any) => !a.title.startsWith("測試文章")
      )
    }
  })
}

/**
 * 等待檔案監聽和自動儲存穩定
 * @param page - Playwright Page 物件
 * @param timeout - 等待時間（毫秒）
 */
export async function waitForFileWatchingStable(page: Page, timeout: number = 6000) {
  await page.waitForTimeout(timeout)
}

/**
 * 檢查是否有重複的文章
 * @param page - Playwright Page 物件
 * @returns 重複的文章 ID 陣列
 */
export async function findDuplicateArticles(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const store = (window as any).__articleStore__
    if (!store) {return []}

    const articles = store.articles.value
    const seen = new Set<string>()
    const duplicates: string[] = []

    articles.forEach((article: any) => {
      const key = `${article.filePath}|${article.title}`
      if (seen.has(key)) {
        duplicates.push(article.id)
      }
      seen.add(key)
    })

    return duplicates
  })
}

/**
 * 取得表格容器的滾動位置
 * @param page - Playwright Page 物件
 * @returns 滾動位置（scrollTop）
 */
export async function getTableScrollPosition(page: Page): Promise<number> {
  const tableContainer = page.locator(".table-container")
  return await tableContainer.evaluate((el) => el.scrollTop)
}

/**
 * 設定表格容器的滾動位置
 * @param page - Playwright Page 物件
 * @param scrollTop - 要設定的滾動位置
 */
export async function setTableScrollPosition(page: Page, scrollTop: number) {
  const tableContainer = page.locator(".table-container")
  await tableContainer.evaluate((el, scroll) => {
    el.scrollTop = scroll
  }, scrollTop)
}
