/**
 * 設定面板功能 E2E 測試
 */

import { test, expect } from './helpers/electron-fixture'

test.describe('設定面板功能', () => {
  test('Settings 頁面能正常開啟並顯示 tabs', async ({ window }) => {
    // 開啟設定
    await window.locator('#btn-settings').click()

    const modal = window.locator('#settings-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // 確認標題存在
    await expect(modal.locator('h3', { hasText: '部落格設定' })).toBeVisible()

    // 確認各個 tab 都存在（不 hard-code 總數量）
    await expect(modal.locator('#tab-basic')).toBeVisible()
    await expect(modal.locator('#tab-framework')).toBeVisible()
    await expect(modal.locator('#tab-editor')).toBeVisible()
    await expect(modal.locator('#tab-git')).toBeVisible()

    // 測試切換到編輯器 tab（用 aria-selected 驗證狀態，不依賴 CSS class）
    const editorTab = modal.locator('#tab-editor')
    await editorTab.click()
    await expect(editorTab).toHaveAttribute('aria-selected', 'true')

    // 測試切換到部落格框架 tab
    const frameworkTab = modal.locator('#tab-framework')
    await frameworkTab.click()
    await expect(frameworkTab).toHaveAttribute('aria-selected', 'true')

    // 關閉設定對話框
    await modal.locator('#btn-close-settings').click()
    await expect(modal).not.toBeVisible()
  })

  test('Settings 頁面基本設定 tab 包含必要欄位', async ({ window }) => {
    // 開啟設定
    await window.locator('#btn-settings').click()

    const modal = window.locator('#settings-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // 切換到基本設定 tab
    const basicTab = modal.locator('#tab-basic')
    await basicTab.click()
    await expect(basicTab).toHaveAttribute('aria-selected', 'true')

    // 確認文章資料夾輸入框存在
    await expect(modal.locator('#input-articles-dir')).toBeVisible()

    // 確認選擇資料夾按鈕存在
    await expect(modal.locator('#btn-select-articles-dir')).toBeVisible()
  })
})
