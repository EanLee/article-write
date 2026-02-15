import { defineConfig } from '@playwright/test'

/**
 * Playwright 測試配置（Electron 模式）
 * 使用 playwright._electron API 啟動並操控 Electron App
 * 參考：T-007 技術討論決策
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 10000 },

  // Electron 測試不支援並行（單一 App 實例）
  fullyParallel: false,
  workers: 1,

  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
})
