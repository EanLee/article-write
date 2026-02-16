import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 測試配置
 * 用於 E2E 測試文章管理功能
 */
export default defineConfig({
  testDir: './tests/e2e',

  // 最大失敗次數
  maxFailures: process.env.CI ? 10 : undefined,

  // 測試超時時間
  timeout: 30000,

  // 測試重試次數
  retries: process.env.CI ? 2 : 0,

  // 並行執行
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html'],
    ['list']
  ],

  use: {
    // Base URL
    baseURL: 'http://localhost:3002',

    // 截圖設定
    screenshot: 'only-on-failure',

    // 影片設定
    video: 'retain-on-failure',

    // Trace
    trace: 'on-first-retry',
  },

  // 測試前啟動開發伺服器
  webServer: {
    command: process.env.CI ? 'pnpm run dev:renderer' : 'pnpm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // 測試專案配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 可以根據需要添加更多瀏覽器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
})
