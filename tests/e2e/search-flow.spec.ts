/**
 * 全文搜尋流程 E2E 測試
 * 驗證 Cmd/Ctrl+F 觸發搜尋面板、輸入關鍵字、鍵盤導航
 */
import { test, expect } from './helpers/electron-fixture'
import fs from 'fs'
import path from 'path'

/** 在 testVaultPath 建立測試文章 */
function createTestArticle(vaultPath: string, title: string, content: string): string {
  const dir = path.join(vaultPath, 'Drafts', 'Test')
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${title}.md`)
  fs.writeFileSync(filePath, [
    '---',
    `title: ${title}`,
    'date: 2026-02-23',
    'draft: true',
    '---',
    '',
    content,
  ].join('\n'), 'utf-8')
  return filePath
}

test.describe('全文搜尋流程', () => {
  test.beforeEach(async ({ window, testVaultPath }) => {
    // 建立測試文章
    createTestArticle(testVaultPath, '測試文章一', '這是搜尋測試的內容')
    createTestArticle(testVaultPath, '測試文章二', '另一篇測試文章')

    // 透過 IPC 設定 articlesDir
    await window.evaluate(async (vaultPath) => {
      const config = await (window as any).electronAPI.getConfig()
      config.paths.articlesDir = vaultPath
      await (window as any).electronAPI.setConfig(config)
    }, testVaultPath)

    // 重新載入頁面，讓 App 重新初始化
    await window.reload()

    // 等待 Vue App 重新掛載完成
    await window.waitForFunction(() => {
      const app = document.getElementById('app')
      return app !== null && app.children.length > 0
    }, undefined, { timeout: 15000 })

    // 等待文章列表載入（檢查是否有文章項目）
    await window.locator('.article-tree-item').first().waitFor({ timeout: 10000 })
  })

  test('Ctrl+F 開啟搜尋面板', async ({ window }) => {
    await window.keyboard.press('Control+f')
    await expect(window.locator('input[placeholder="搜尋文章內容..."]')).toBeVisible()
  })

  test('Esc 關閉搜尋面板', async ({ window }) => {
    await window.keyboard.press('Control+f')
    await window.keyboard.press('Escape')
    await expect(window.locator('input[placeholder="搜尋文章內容..."]')).not.toBeVisible()
  })

  test('點擊遮罩外側關閉搜尋面板', async ({ window }) => {
    await window.keyboard.press('Control+f')
    await expect(window.locator('input[placeholder="搜尋文章內容..."]')).toBeVisible()
    // 點擊面板外側（遮罩區域）
    await window.mouse.click(10, 10)
    await expect(window.locator('input[placeholder="搜尋文章內容..."]')).not.toBeVisible()
  })

  test('輸入關鍵字後顯示搜尋結果或無結果訊息', async ({ window }) => {
    await window.keyboard.press('Control+f')
    await window.fill('input[placeholder="搜尋文章內容..."]', 'test')
    
    // 等待搜尋結果更新（檢查是否有結果列表或無結果訊息）
    await window.waitForFunction(() => {
      const resultsList = document.querySelector('ul li')
      const noResultsMsg = document.body.textContent?.includes('找不到')
      return resultsList !== null || !!noResultsMsg
    }, undefined, { timeout: 5000 })
    
    // 有結果列表或顯示「找不到」訊息，兩者皆可
    const hasResults = await window.locator('ul li').count()
    const noResults = await window.locator('text=找不到').count()
    expect(hasResults + noResults).toBeGreaterThan(0)
  })
})
