/**
 * Smoke Test — 驗證 Playwright + Electron 環境可正常啟動
 * Q-01 完成條件：Electron 視窗能被 Playwright 操控
 */

import { test, expect } from './helpers/electron-fixture'

test.describe('Smoke Test — 環境驗證', () => {
  test('Electron App 能啟動並顯示主視窗', async ({ window }) => {
    // 確認視窗標題存在
    const title = await window.title()
    expect(title).toBeTruthy()
  })

  test('主畫面能載入（Vue App 掛載完成）', async ({ window }) => {
    // Vue App 掛載後 #app 元素應存在（取第一個，避免 App.vue 根元素重複 id 衝突）
    await expect(window.locator('#app').first()).toBeVisible({ timeout: 15000 })
  })

  test('window.electronAPI 存在（IPC 橋接正常）', async ({ window }) => {
    const hasAPI = await window.evaluate(() => {
      return typeof (window as any).electronAPI !== 'undefined'
    })
    expect(hasAPI).toBe(true)
  })
})
