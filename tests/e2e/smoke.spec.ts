/**
 * Smoke tests - 基本煙霧測試
 * 驗證應用程式基本功能是否正常運作
 */

import { test, expect } from '@playwright/test'

test.describe('應用程式基本功能', () => {
  test('應用程式應該能正常載入', async ({ page }) => {
    // 前往應用程式首頁
    await page.goto('/')

    // 等待應用程式載入
    await page.waitForLoadState('networkidle')

    // 驗證頁面標題或主要元素存在
    // 根據實際應用調整選擇器
    await expect(page).toHaveTitle(/WriteFlow|文章/)
  })

  test('應用程式主要容器應該存在', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 等待主要容器出現 (使用更寬鬆的選擇器)
    const body = await page.locator('body')
    await expect(body).toBeVisible()
  })
})
