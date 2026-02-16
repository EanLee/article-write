# T-007 — Playwright + Electron E2E 測試環境建置方案評估

> **日期**: 2026-02-15
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）、Alex（UI/UX）
> **背景**: 圓桌 #011 Q-01 — 建立 E2E 測試環境，為 Q-02/Q-03/Q-04 打地基
> **狀態**: ✅ 完成（Q-01 ～ Q-04 + Q-06 全部完成）

---

## 現況

| 項目 | 狀態 |
|------|------|
| Electron 版本 | `^39.2.7` |
| Vite 版本 | `^7.3.0`（renderer 用 Vite Dev Server，port 3002） |
| 現有 E2E 骨架 | `tests/e2e/article-list.spec.ts`，全部 `test.describe.skip` |
| Playwright 安裝 | ❌ 尚未安裝 |
| `test:e2e` 指令 | ❌ 不存在 |
| Main Process 入口 | `src/main/main.ts`（編譯至 `dist/main/main.js`） |

---

## 問題定義

Playwright 原生設計用於 Web，不直接支援 Electron。要讓 Playwright 操控 Electron 視窗，需要解決兩個問題：

1. **如何啟動 Electron App** 並讓 Playwright 連接
2. **如何連接 Renderer 視窗**（BrowserWindow）

---

## 方案比較

### 方案 A：`electron-playwright-helpers` + `@playwright/test`

**做法**：使用 `electron-playwright-helpers` 套件，透過 Playwright 啟動 Electron Process，再取得 BrowserWindow 的 Page 物件。

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
})

// tests/e2e/example.spec.ts
import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'

test('基本流程', async () => {
  const app = await electron.launch({ args: ['dist/main/main.js'] })
  const window = await app.firstWindow()
  await expect(window).toHaveTitle(/WriteFlow/)
  await app.close()
})
```

**優點**：
- Playwright 官方支援 `_electron` API（`playwright` 套件內建）
- 不需要額外 adapter
- 社群資源多

**缺點**：
- 測試前必須先 build（`dist/main/main.js` 必須存在）
- 無法直接使用 Vite Dev Server 的 HMR；每次改動需重新 build 才能測試
- `electron-playwright-helpers` 增加依賴

---

### 方案 B：Playwright 連接 Vite Dev Server（Web-only 模式）

**做法**：只測試 Renderer 層，用 `page.goto('http://localhost:3002')` 直接連 Vite Dev Server，完全跳過 Electron Main Process。

```typescript
// playwright.config.ts
export default defineConfig({
  use: { baseURL: 'http://localhost:3002' },
  webServer: { command: 'pnpm run dev:renderer', port: 3002 }
})
```

**優點**：
- 設定最簡單，純 Web 測試
- 不需要 build，直接連 Dev Server
- 啟動快

**缺點**：
- **無法測試 IPC 通訊**（`window.electronAPI` 在純瀏覽器環境中不存在）
- AutoSave、檔案讀寫、發布同步等核心功能全都靠 IPC，無法覆蓋
- Q-02（AutoSave 觸發）、Q-03（發布同步）、Q-04（路徑設定）三個 Happy Path 全都依賴 IPC → **這三個 Happy Path 無法用此方案測試**

---

### 方案 C：Vitest Browser Mode（實驗性）

**做法**：使用 Vitest 的 Browser Mode，在真實瀏覽器環境執行測試，透過 mock `electronAPI`。

**優點**：與現有 Vitest 整合，統一測試指令

**缺點**：
- Vitest Browser Mode 仍在實驗階段（v4.x），穩定性不確定
- 同樣無法測試真實 IPC
- mock `electronAPI` 測試價值有限，不符合 Q-01 要求（「Electron 視窗能被 Playwright 操控」）

---

## Sam 的推薦

**選方案 A**，理由：

1. **符合 Q-01 完成條件**：「Electron 視窗能被 Playwright 操控」——只有方案 A 能做到
2. **能覆蓋三個 Happy Path**：Q-02 AutoSave、Q-03 發布同步、Q-04 路徑設定都依賴 IPC，方案 B 無法覆蓋
3. **Playwright 官方支援**：`_electron` API 是 Playwright 官方 API，不是第三方 hack
4. **`electron-playwright-helpers` 可選**：其實 `playwright` 套件本身的 `_electron` 已足夠基本使用，`electron-playwright-helpers` 只是便利函式，可延後評估是否需要

**需解決的問題**：
- 測試前需要 build（`pnpm run build`），需在 `test:e2e` script 中處理
- CI 環境需要 `xvfb`（Q-06 的評估範圍）

---

## 討論記錄

### Wei：Renderer 層觀點

**Wei**：方案 B 的問題比看起來嚴重。我們的 Renderer 幾乎每個功能都透過 `window.electronAPI` 呼叫 Main Process——文章讀取、儲存、AutoSave、發布，全都是 IPC。用方案 B 測試只能測到空殼，連文章列表都載入不了。

方案 A 才能測到真實的使用者流程。

---

### Lin：Services 層觀點

**Lin**：從 Main Process 角度補充，方案 A 實際上是用 Playwright 啟動一個完整的 Electron Process，IPC 通道是真實存在的。這對 Q-02、Q-03、Q-04 的測試至關重要。

唯一要注意的是測試環境的資料隔離——測試執行時不能動到使用者的真實 vault。需要在測試啟動時指定一個臨時的測試 vault 路徑，測試結束後清理。

---

### Alex：UX 觀點

**Alex**：從測試覆蓋範圍來看，我希望能測到「使用者真實看到的畫面」。方案 A 啟動的是真實 Electron App，測試結果最接近真實使用情境，對品質保障的價值最高。

---

### Sam：決策

**決策：採用方案 A**——`playwright` 內建 `_electron` API，不額外安裝 `electron-playwright-helpers`（保持精簡，若後續需要再加）。

**實作要點（交 Lin 執行 Q-01）**：

1. 安裝 `@playwright/test`
2. 建立 `playwright.config.ts`，設定 Electron 啟動方式
3. 建立測試用 fixture：負責啟動 App、取得 window、測試結束後關閉
4. 測試 vault 隔離：透過環境變數 `TEST_VAULT_PATH` 指定臨時路徑
5. `package.json` 加入 `test:e2e` 指令（先 build 再執行）

---

## 決策摘要

| 項目 | 決定 |
|------|------|
| 方案 | 方案 A：`playwright` `_electron` API |
| 額外套件 | 僅 `@playwright/test`（不加 `electron-playwright-helpers`） |
| 測試資料隔離 | 環境變數 `TEST_VAULT_PATH` 指定臨時 vault |
| `test:e2e` 指令 | `pnpm run build && playwright test` |
| CI 整合 | Q-06 另行評估 |

---

## 後續任務

| 任務 | 負責人 | 狀態 | Branch |
|------|--------|------|--------|
| Q-01 Playwright + Electron 環境建置 | Lin | ✅ 完成 | `feature/q01-playwright-setup` |
| Q-02 編輯器核心流程 E2E | Lin | ✅ 完成 | `feature/q02-e2e-editor-flow` |
| Q-03 同步發布流程 E2E | Lin | ✅ 完成 | `feature/q03-e2e-publish-flow` |
| Q-04 設定路徑流程 E2E | Lin | ✅ 完成 | `feature/q04-e2e-settings-path` |
| Q-05 Store 單元測試補強 | Lin | ✅ 完成 | `feature/q05-store-unit-tests` |
| Q-06 CI Pipeline + xvfb | Sam/Lin | ✅ 完成 | `feature/q06-ci-pipeline` |

### Q-06 實作摘要（2026-02-16）

在 `.github/workflows/ci.yml` 新增獨立的 `e2e` job：

- **虛擬顯示器**：`xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24"`
- **系統依賴**：`xvfb`、`libgbm-dev`、`libnss3`、`libatk-bridge2.0-0` 等 Electron 必要 libs
- **Playwright 瀏覽器**：`playwright install --with-deps chromium`
- **Build 整合**：E2E job 內部執行 `pnpm run build`，不依賴 `test` job 產物
- **失敗報告**：測試失敗時自動上傳 `playwright-report/` artifact（7 天）

相關 Commit：`dc78333`
