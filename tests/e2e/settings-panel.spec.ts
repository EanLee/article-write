/**
 * 設定面板功能 E2E 測試
 *
 * 選擇器策略：data-testid 優先（E2E 穩定性最高）
 */

import { test, expect } from './helpers/electron-fixture'

test.describe('設定面板功能', () => {
  test('Settings 頁面能正常開啟並顯示 tabs', async ({ window }) => {
    // 開啟設定
    await window.getByTestId('settings-button').click()

    const modal = window.getByTestId('settings-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // 確認標題存在
    await expect(modal.locator('h3', { hasText: '部落格設定' })).toBeVisible()

    // 確認所有現有 tabs 都存在
    const tabs = modal.locator('[role="tab"]')
    await expect(tabs).toHaveCount(4)

    // 確認各個 tab 的文字
    await expect(tabs.filter({ hasText: '基本設定' })).toBeVisible()
    await expect(tabs.filter({ hasText: '部落格框架' })).toBeVisible()
    await expect(tabs.filter({ hasText: '編輯器' })).toBeVisible()
    await expect(tabs.filter({ hasText: 'Git 發布' })).toBeVisible()

    // 測試切換到編輯器 tab
    const editorTab = tabs.filter({ hasText: '編輯器' })
    await editorTab.click()
    await expect(editorTab).toHaveClass(/tab-active/)

    // 測試切換到部落格框架 tab
    const frameworkTab = tabs.filter({ hasText: '部落格框架' })
    await frameworkTab.click()
    await expect(frameworkTab).toHaveClass(/tab-active/)

    // 關閉設定對話框
    await window.getByTestId('settings-close-button').click()
    await expect(modal).not.toBeVisible()
  })

  test('Settings 頁面基本設定 tab 包含必要欄位', async ({ window }) => {
    // 開啟設定
    await window.getByTestId('settings-button').click()

    const modal = window.getByTestId('settings-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // 切換到基本設定 tab
    const basicTab = modal.locator('[role="tab"]').filter({ hasText: '基本設定' })
    await basicTab.click()
    await expect(basicTab).toHaveClass(/tab-active/)

    // 確認文章資料夾輸入框存在
    const articlesInput = modal.locator('input[placeholder*="例如"]').first()
    await expect(articlesInput).toBeVisible()

    // 確認選擇資料夾按鈕存在
    const selectFolderBtn = modal.locator('button').filter({ hasText: '選擇資料夾' }).first()
    await expect(selectFolderBtn).toBeVisible()
  })
})

