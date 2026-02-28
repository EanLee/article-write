import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 測試配置
 * 用於 E2E 測試文章管理功能
 */
export default defineConfig({
  testDir: './tests/e2e',

  // 最大失敗次數
  maxFailures: process.env.CI ? 10 : undefined,

  // 測試超時時間（增加到 90 秒以適應 Electron 應用在 CI 環境中的啟動時間）
  timeout: 90000,

  // 測試重試次數
  retries: process.env.CI ? 2 : 0,

  // 斷言超時時間（CI 環境 Electron + xvfb 需要更多時間）
  expect: {
    timeout: process.env.CI ? 10000 : 5000,
  },

  // 並行執行
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html'],
    ['list']
  ],

  use: {
    // 截圖設定
    screenshot: 'only-on-failure',

    // 影片設定
    video: 'retain-on-failure',

    // Trace
    trace: 'on-first-retry',
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
