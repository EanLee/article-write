/**
 * Electron 測試 Fixture
 * 負責啟動/關閉 Electron App，提供 electronApp 與 window 給測試使用
 *
 * 使用方式：
 *   import { test, expect } from './helpers/electron-fixture'
 *   test('...', async ({ window }) => { ... })
 *
 * 設計說明：
 * - electronApp / testVaultPath 使用 worker scope，同一測試檔案共用一個 App 實例
 * - window 每個測試重新取得（確保乾淨狀態）
 * - 需明確過濾 DevTools 視窗，取得真正的 App 主視窗
 */

import { test as base, expect } from '@playwright/test'
import { _electron as electron, ElectronApplication, Page } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.resolve(__dirname, '../../..')
const MAIN_JS = path.join(ROOT, 'dist/main/main.js')

/** 取得 App 主視窗（排除 DevTools） */
async function getAppWindow(app: ElectronApplication): Promise<Page> {
  // 等待視窗出現，最多嘗試 10 秒
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    const windows = app.windows()
    for (const win of windows) {
      const url = win.url()
      if (!url.startsWith('devtools://')) {
        // 等待 Vue App 掛載（#app 元素有子元素）
        await win.waitForFunction(
          () => {
            const app = document.getElementById('app')
            return app !== null && app.children.length > 0
          },
          { timeout: 20000 }
        )
        return win
      }
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('無法找到 App 主視窗（非 DevTools）')
}

export type ElectronFixtures = {
  electronApp: ElectronApplication
  window: Page
  testVaultPath: string
}

export const test = base.extend<ElectronFixtures, { electronApp: ElectronApplication; testVaultPath: string }>({
  // worker scope：整個測試檔案共用一個 App 實例
  testVaultPath: [async (_fixtures, use) => {
    const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'writeflow-test-'))
    await use(vaultPath)
    fs.rmSync(vaultPath, { recursive: true, force: true })
  }, { scope: 'worker' }],

  electronApp: [async ({ testVaultPath }, use) => {
    const app = await electron.launch({
      args: [MAIN_JS],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_VAULT_PATH: testVaultPath,
      },
    })
    // 預先等待 App 主視窗載入完成
    await getAppWindow(app)
    await use(app)
    await app.close()
  }, { scope: 'worker' }],

  // test scope：每個測試取得 App 主視窗
  window: async ({ electronApp }, use) => {
    const page = await getAppWindow(electronApp)
    await use(page)
  },
})

export { expect }
