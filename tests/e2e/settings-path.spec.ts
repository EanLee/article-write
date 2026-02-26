/**
 * Q-04 E2E：設定路徑流程
 * Happy Path：「填入路徑 → 儲存設定 → 重啟後路徑保留」
 */

import { test, expect } from './helpers/electron-fixture'

test.describe('設定路徑流程', () => {
  test('填入 articlesDir → 儲存設定 → 重啟後路徑保留', async ({ window, testVaultPath }) => {
    // 前置：清空 config，從乾淨狀態開始
    await window.evaluate(async () => {
      const config = await (window as any).electronAPI.getConfig()
      config.paths.articlesDir = ''
      config.paths.targetBlog = ''
      await (window as any).electronAPI.setConfig(config)
    })
    await window.reload()
    await window.waitForFunction(() => {
      const app = document.getElementById('app')
      return app !== null && app.children.length > 0
    }, undefined, { timeout: 15000 })

    // Step 1: 點擊設定按鈕（ActivityBar 底部）
    await window.locator('.activity-item[title="設定"]').click()

    // Step 2: 確認設定對話框已開啟
    const modal = window.locator('.modal.modal-open')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.locator('h3').filter({ hasText: '部落格設定' })).toBeVisible()

    // Step 3: 找到 articlesDir 輸入框並填入測試路徑
    const articlesInput = modal.locator('input').first()
    await articlesInput.fill(testVaultPath)

    // 確認填入成功
    await expect(articlesInput).toHaveValue(testVaultPath)

    // Step 4: 點擊「儲存設定」
    await modal.locator('button').filter({ hasText: '儲存設定' }).click()

    // Step 5: 確認 modal 已關閉
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // Step 6: 重新載入（模擬重啟）
    await window.reload()
    await window.waitForFunction(() => {
      const app = document.getElementById('app')
      return app !== null && app.children.length > 0
    }, undefined, { timeout: 15000 })
    await window.waitForTimeout(1000)

    // Step 7: 重新開啟設定，確認路徑保留
    await window.locator('.activity-item[title="設定"]').click()
    const modal2 = window.locator('.modal.modal-open')
    await expect(modal2).toBeVisible({ timeout: 5000 })

    // 確認 articlesDir 輸入框的值仍是儲存的路徑
    const articlesInput2 = modal2.locator('input').first()
    await expect(articlesInput2).toHaveValue(testVaultPath, { timeout: 5000 })
  })
})
