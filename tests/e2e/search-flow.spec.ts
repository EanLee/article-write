/**
 * 全文搜尋流程 E2E 測試
 * 驗證 Cmd/Ctrl+F 觸發搜尋面板、輸入關鍵字、鍵盤導航
 */
import { test, expect } from './helpers/electron-fixture'

test.describe('全文搜尋流程', () => {
  test('Ctrl+F 開啟搜尋面板', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await expect(page.locator('input[placeholder="搜尋文章內容..."]')).toBeVisible()
  })

  test('Esc 關閉搜尋面板', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.keyboard.press('Escape')
    await expect(page.locator('input[placeholder="搜尋文章內容..."]')).not.toBeVisible()
  })

  test('點擊遮罩外側關閉搜尋面板', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await expect(page.locator('input[placeholder="搜尋文章內容..."]')).toBeVisible()
    // 點擊面板外側（遮罩區域）
    await page.mouse.click(10, 10)
    await expect(page.locator('input[placeholder="搜尋文章內容..."]')).not.toBeVisible()
  })

  test('輸入關鍵字後顯示搜尋結果或無結果訊息', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.fill('input[placeholder="搜尋文章內容..."]', 'test')
    await page.waitForTimeout(400) // 等待 debounce + IPC
    // 有結果列表或顯示「找不到」訊息，兩者皆可
    const hasResults = await page.locator('ul li').count()
    const noResults = await page.locator('text=找不到').count()
    expect(hasResults + noResults).toBeGreaterThan(0)
  })
})
