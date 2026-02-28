/**
 * SEO 生成功能 E2E 測試
 */

import { test, expect } from './helpers/electron-fixture'

test.describe('SEO 生成功能', () => {
  test('Settings 頁面能顯示 AI tab', async ({ window }) => {
    // 開啟設定
    await window.locator('.activity-item[title="設定"]').click()

    const modal = window.locator('.modal.modal-open')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // 確認有 AI 設定 tab
    const aiTab = modal.locator('[role="tab"]', { hasText: 'AI 設定' })
    await expect(aiTab).toBeVisible()

    // 點擊 AI tab
    await aiTab.click()

    // 等待 AI tab 變為 active（確認 Vue 響應式狀態已更新）
    await expect(aiTab).toHaveClass(/tab-active/)

    // 展開第一個 Provider（Claude）才能看到 API Key 輸入框
    // PR #31 將 AI 設定改為 Inline Expand 設計，預設不顯示輸入框
    const firstProviderSetupBtn = modal.locator('button', { hasText: '設定' }).first()
    await firstProviderSetupBtn.click()

    // 確認有 API Key 輸入框
    await expect(modal.locator('input[type="password"]').first()).toBeVisible()
  })

  test('API Key 未設定時 Frontmatter Panel 顯示引導按鈕', async ({ window, testVaultPath }) => {
    // 設定文章資料夾
    await window.evaluate(async (path: string) => {
      const config = await (window as any).electronAPI.getConfig()
      config.paths.articlesDir = path
      await (window as any).electronAPI.setConfig(config)
    }, testVaultPath)

    await window.reload()
    await window.waitForFunction(() => {
      const app = document.getElementById('app')
      return app !== null && app.children.length > 0
    }, { timeout: 15000 })

    // 點擊第一篇文章
    const articleItems = window.locator('.article-item, [data-testid="article-item"]')
    const count = await articleItems.count()
    if (count === 0) {
      test.skip()
      return
    }
    await articleItems.first().click()

    // 確認 Frontmatter Panel 存在
    const frontmatterPanel = window.locator('.frontmatter-panel')
    await expect(frontmatterPanel).toBeVisible({ timeout: 5000 })

    // 應顯示「⚙ 設定 API Key」或「✨ 生成 SEO」按鈕
    const seoBtn = frontmatterPanel.locator('button').filter({
      hasText: /生成 SEO|設定 API Key/
    })
    await expect(seoBtn).toBeVisible({ timeout: 3000 })
  })
})
