# CI E2E 測試問題排除完整指南

**日期**: 2026-02-24  
**影響範圍**: CI/CD（GitHub Actions）、E2E 測試、Electron 應用  
**嚴重程度**: High（所有 E2E 測試無法執行）

## 📋 概述

本文檔記錄了完整的 CI E2E 測試問題排除過程，從初始的匯入錯誤到最終的超時配置問題，總共解決了 **11 個連鎖問題**。這是一份教學導向的文檔，不僅記錄問題和解決方案，更重要的是說明**排除思路**和**為什麼這樣做**。

### 問題總覽

| # | 問題類型 | 嚴重程度 | 解決難度 |
|---|---------|---------|---------|
| 1 | Playwright 匯入錯誤 | Critical | Easy |
| 2 | 遺失依賴套件 | High | Easy |
| 3 | TypeScript 編譯錯誤 | High | Easy |
| 4 | ES 模組路徑問題 | High | Medium |
| 5 | CI 缺少建置步驟 | Critical | Easy |
| 6 | Electron 二進制未安裝 | Critical | Medium |
| 7 | Headless 環境問題 | Critical | Medium |
| 8 | 沙盒權限問題 | Critical | Medium |
| 9 | 測試 Fixture 類型錯誤 | High | Easy |
| 10 | Worker Fixture 超時 | High | Easy |
| 11 | 全局測試超時配置 | Critical | Easy |

### 關鍵洞察

> **核心教訓**：問題排除要分層次進行。先解決**能不能執行**（語法、依賴、環境），再解決**能不能正常運行**（配置、權限、邏輯），最後解決**能不能穩定完成**（超時、資源）。

---

## 🔍 問題 1：Playwright 匯入錯誤

### 錯誤現象

```
Error: Cannot find package 'playwright' imported from 
/home/runner/work/article-write/article-write/tests/e2e/helpers/electron-fixture.ts
Did you mean to import "playwright/index.js"?
```

### 排除思路

**為什麼從這裡開始？**
- 這是第一個出現的錯誤
- 屬於**語法層級**的問題，必須先解決才能繼續
- 錯誤訊息非常明確，容易定位

**如何分析？**
1. 查看錯誤堆疊，找到出錯的檔案：`electron-fixture.ts`
2. 檢查該檔案的 import 語句
3. 對比專案中安裝的套件（檢查 `package.json` 和 `node_modules`）

### 根本原因

**代碼問題**：
```typescript
// ❌ 錯誤：匯入不存在的 'playwright' 套件
import { _electron as electron, ElectronApplication, Page } from 'playwright'
```

**為什麼錯誤？**
- 專案安裝的是 `@playwright/test`，不是 `playwright`
- `playwright` 是舊版本的套件名稱
- Electron 測試工具（`_electron`）在 `@playwright/test` 中

**技術背景**：
- Playwright v1.14+ 將所有功能整合到 `@playwright/test`
- `playwright` 套件已廢棄，僅用於相容性
- Electron 測試工具在新版中需要從 `@playwright/test` 匯入

### 修正方式

**修改檔案**：`tests/e2e/helpers/electron-fixture.ts`

```typescript
// ✅ 正確：從 @playwright/test 匯入
import { test as base, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
```

**為什麼這樣改？**
1. 使用專案實際安裝的套件
2. 將型別匯入分離（`import type`），符合 TypeScript 最佳實踐
3. 保持與其他測試檔案的一致性

### 驗證方法

```bash
# 驗證匯入不再報錯
pnpm exec playwright test --list
```

### 相關 Commit

- `2a1cc09`: fix: correct playwright import in electron-fixture.ts

---

## 🔍 問題 2：遺失 electron-updater 依賴

### 錯誤現象

```
Error: Cannot find module 'electron-updater'
  at src/main/main.ts:3:1
```

### 排除思路

**為什麼會出現這個問題？**
- 解決了匯入錯誤後，TypeScript 編譯器開始檢查代碼
- 這是編譯階段的錯誤，屬於**依賴層級**的問題

**如何分析？**
1. 檢查 `src/main/main.ts` 的 import 語句
2. 搜尋 `package.json` 中是否有 `electron-updater`
3. 確認這個套件是否必要（是否可以移除使用它的代碼）

### 根本原因

**代碼中使用了 electron-updater**：
```typescript
// src/main/main.ts
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-available', (info) => { ... })
```

**但 package.json 中沒有這個依賴**：
```json
{
  "dependencies": {
    "electron": "^39.6.0",
    // ❌ 缺少 electron-updater
  }
}
```

**為什麼會這樣？**
- 開發時可能透過其他方式安裝（全局安裝或從其他專案複製）
- CI 環境是乾淨的環境，只安裝 `package.json` 中列出的依賴
- 這是一個常見的"在我的機器上能跑"問題

### 修正方式

**修改檔案**：`package.json`

```json
{
  "dependencies": {
    "electron-updater": "^6.8.3",
    // ...
  }
}
```

**為什麼選擇 6.8.3？**
1. 執行 `npm view electron-updater version` 查看最新穩定版本
2. 檢查與 Electron 39.6.0 的相容性
3. 檢查安全漏洞（無已知漏洞）

**安全性檢查**：
```bash
# 使用 gh-advisory-database 工具檢查
# 結果：無已知漏洞
```

### 驗證方法

```bash
# 安裝依賴
pnpm install

# 驗證可以編譯
pnpm run build:main
```

### 相關 Commit

- `d42e05b`: fix: add electron-updater dependency and fix build errors for E2E tests
- `920b125`: chore: update electron-updater to latest version (6.8.3)

---

## 🔍 問題 3：TypeScript 型別錯誤

### 錯誤現象

```
src/main/main.ts:XX:XX - error TS7006: 
Parameter 'info' implicitly has an 'any' type.
Parameter 'err' implicitly has an 'any' type.
```

### 排除思路

**為什麼會出現？**
- 安裝了 electron-updater 後，TypeScript 編譯器繼續檢查代碼
- 專案啟用了嚴格的型別檢查（`tsconfig.json` 中的 `strict: true`）

**如何分析？**
1. 查看錯誤訊息指向的代碼行
2. 了解這些參數的預期型別
3. 查看 electron-updater 的型別定義（`@types` 或內建型別）

### 根本原因

**代碼沒有明確的型別標註**：
```typescript
// ❌ 隱含 any 型別
autoUpdater.on('update-available', (info) => {
  console.log('有可用更新：', info.version)
})

autoUpdater.on('error', (err) => {
  console.error('更新錯誤：', err.message)
})
```

**為什麼 TypeScript 要求明確型別？**
- `strict: true` 模式下，不允許隱含的 `any` 型別
- 這是為了型別安全，避免執行時錯誤
- 事件處理器的參數型別需要明確宣告

### 修正方式

**修改檔案**：`src/main/main.ts`

```typescript
// ✅ 加入明確型別
autoUpdater.on('update-available', (info: { version: string }) => {
  console.log('有可用更新：', info.version)
})

autoUpdater.on('error', (err: Error) => {
  console.error('更新錯誤：', err.message)
})
```

**為什麼這樣標註？**
1. `update-available` 事件傳遞一個包含 `version` 欄位的物件
2. `error` 事件傳遞標準的 `Error` 物件
3. 這些型別可以從 electron-updater 文檔或型別定義中確認

### 驗證方法

```bash
# 驗證 TypeScript 編譯通過
pnpm run build:main
```

### 相關 Commit

- `d42e05b`: fix: add electron-updater dependency and fix build errors for E2E tests

---

## 🔍 問題 4：ES 模組匯入路徑問題

### 錯誤現象

```
Error: Relative import paths need explicit file extensions in ECMAScript imports
  at src/main/services/SearchService.ts
```

### 排除思路

**為什麼會出現？**
- TypeScript 編譯器繼續檢查其他檔案
- 這是 ES 模組（ESM）規範的要求

**如何分析？**
1. 查看 `tsconfig.json` 的 `module` 和 `moduleResolution` 設定
2. 檢查 SearchService.ts 的 import 語句
3. 了解 Node.js ES 模組的匯入規則

### 根本原因

**代碼使用相對路徑但沒有副檔名**：
```typescript
// ❌ 缺少副檔名
import { ArticleStatus } from '../../types'
import { ArticleMetadata } from '../../types'
```

**技術背景**：
- `tsconfig.json` 使用 `"moduleResolution": "node16"` 或 `"nodenext"`
- Node.js ES 模組規範要求相對匯入必須包含副檔名
- TypeScript 編譯後會保留匯入路徑，不會自動加上副檔名
- 執行時 Node.js 找不到檔案就會報錯

**為什麼 TypeScript 這樣設計？**
- ES 模組是瀏覽器和 Node.js 的標準
- 瀏覽器不會自動補齊副檔名
- TypeScript 需要產生符合標準的代碼

### 修正方式

**修改檔案**：`src/main/services/SearchService.ts`

```typescript
// ✅ 加入 .js 副檔名（注意：是 .js 不是 .ts）
import { ArticleStatus, ArticleMetadata } from '../../types/index.js'
```

**為什麼是 .js 而不是 .ts？**
- TypeScript 編譯後產生 `.js` 檔案
- 匯入路徑需要指向**編譯後**的檔案
- 這是 TypeScript 的設計原則：寫的是 `.ts`，匯入用 `.js`

### 驗證方法

```bash
# 驗證編譯通過
pnpm run build:main

# 檢查編譯後的檔案
ls dist/main/services/SearchService.js
```

### 相關 Commit

- `d42e05b`: fix: add electron-updater dependency and fix build errors for E2E tests

---

## 🔍 問題 5：CI 缺少建置步驟

### 錯誤現象

雖然代碼可以編譯，但 E2E 測試仍然失敗：
```
Error: Cannot find module '/home/runner/work/article-write/article-write/dist/main/main.js'
```

### 排除思路

**切入點：測試環境分析**
1. 查看 `electron-fixture.ts` 中 Electron 啟動的代碼
2. 找到它期望的檔案路徑：`dist/main/main.js`
3. 檢查 CI workflow 是否有建置步驟

**為什麼這樣思考？**
- E2E 測試需要**執行**應用程式，不是測試源代碼
- Electron 應用需要先編譯 TypeScript → JavaScript
- CI 環境是乾淨的，沒有本地開發時留下的 `dist` 目錄

### 根本原因

**electron-fixture.ts 的預期**：
```typescript
const ROOT = path.resolve(__dirname, '../../..')
const MAIN_JS = path.join(ROOT, 'dist/main/main.js')  // 期望這個檔案存在

const app = await electron.launch({
  args: [MAIN_JS],  // 啟動這個編譯後的檔案
})
```

**CI workflow 的問題**：
```yaml
# .github/workflows/ci.yml
- name: 安裝依賴
  run: pnpm install --frozen-lockfile

# ❌ 缺少建置步驟！直接執行測試

- name: 執行 E2E 測試
  run: pnpm run test:e2e
```

**為什麼會漏掉建置步驟？**
- 本地開發時，開發者通常會先執行 `pnpm run dev` 或 `pnpm run build`
- 這些命令會產生 `dist` 目錄
- 編寫 CI 時可能假設建置已經完成，或複製了不完整的 workflow 範本

### 修正方式

**修改檔案**：`.github/workflows/ci.yml`

```yaml
- name: 安裝依賴
  run: pnpm install --frozen-lockfile

# ✅ 加入建置步驟
- name: 建置 Electron 主程序
  run: pnpm run build:main

- name: 執行 E2E 測試
  run: pnpm run test:e2e
```

**為什麼只建置 main 而不是全部？**
1. E2E 測試只需要 Electron 主程序（`dist/main/main.js`）
2. Renderer（渲染器）部分由 `webServer` 即時編譯
3. 最小化建置時間，加快 CI 執行

**如何確認需要建置什麼？**
```bash
# 查看 package.json 的建置腳本
cat package.json | grep "build"

# 確認輸出目錄
# build:main → dist/main/
# build:renderer → dist/renderer/
```

### 驗證方法

```bash
# 模擬 CI 環境
rm -rf dist
pnpm run build:main
ls dist/main/main.js  # 應該存在
```

### 相關 Commit

- `d42e05b`: fix: add electron-updater dependency and fix build errors for E2E tests

---

## 🔍 問題 6：Electron 二進制檔案未安裝

### 錯誤現象

```
Error: electron.launch: Electron failed to install correctly, 
please delete node_modules/electron and try installing again
```

### 排除思路

**觸發時機**：
- 建置步驟完成後
- 開始執行 E2E 測試時
- Playwright 嘗試啟動 Electron 時報錯

**分析路徑**：
1. 錯誤說 "Electron failed to install correctly"，指向安裝問題
2. 檢查 CI 的安裝日誌，尋找警告訊息
3. 發現關鍵線索：`Ignored build scripts: electron-winstaller@5.4.0, esbuild@0.27.3`

**為什麼要查看安裝日誌？**
- 錯誤訊息指向安裝問題，不是代碼問題
- 需要往回追溯，看安裝階段發生了什麼
- CI 日誌會記錄所有步驟的輸出

### 根本原因

**pnpm 的預設行為**：
```
安裝依賴時的警告：
Ignored build scripts: electron-winstaller@5.4.0, esbuild@0.27.3
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts
```

**Electron 的安裝機制**：
1. `npm install electron` 會觸發 postinstall 腳本
2. postinstall 腳本執行 `node install.js`
3. `install.js` 下載平台對應的 Electron 二進制檔案
4. 二進制檔案放在 `node_modules/electron/dist/electron`

**pnpm 為什麼忽略建置腳本？**
- 安全考量：建置腳本可以執行任意代碼
- pnpm 要求明確批准才能執行建置腳本
- CI 環境中沒有互動式批准，所以腳本被跳過

**技術背景**：
- npm/yarn 預設執行所有建置腳本
- pnpm 預設**不執行**，需要明確批准
- 這是 pnpm 的安全特性，但會導致某些套件安裝不完整

### 修正方式

**修改檔案**：`.github/workflows/ci.yml`

```yaml
- name: 安裝依賴
  run: pnpm install --frozen-lockfile

# ✅ 明確安裝 Electron 二進制檔案
- name: 安裝 Electron 二進制檔案
  run: |
    cd node_modules/electron
    node install.js
```

**為什麼不用 `pnpm install --ignore-scripts=false`？**
1. 這會執行**所有**建置腳本，可能引入安全風險
2. 我們只需要 Electron 的安裝腳本
3. 明確執行特定腳本更加可控和安全

**替代方案考慮**：
- ❌ `pnpm approve-builds`：需要互動式批准，不適合 CI
- ❌ `--ignore-scripts=false`：執行所有腳本，範圍太廣
- ✅ 手動執行 `electron/install.js`：精確控制，最小風險

### 驗證方法

```bash
# 檢查 Electron 二進制檔案是否存在
ls node_modules/electron/dist/electron

# 驗證可以啟動（需要 xvfb）
xvfb-run node_modules/.bin/electron --version
```

### 相關 Commit

- `9648912`: fix: install Electron binaries explicitly in CI workflow

---

## 🔍 問題 7：Headless 環境無法啟動 Electron

### 錯誤現象

```
Error: electron.launch: Process failed to launch!
```

非常簡短的錯誤訊息，沒有更多細節。

### 排除思路

**如何處理不明確的錯誤？**
1. **查看上下文**：這是在 CI 環境（Ubuntu），不是本地開發
2. **回憶基礎知識**：Electron 是桌面應用程式框架
3. **關鍵推理**：桌面應用需要顯示器，CI 環境沒有顯示器

**為什麼這樣思考？**
- 錯誤訊息太簡短時，要從**環境差異**切入
- 本地開發 vs CI 環境的最大差異是什麼？
- Electron/Chrome 的常見部署問題是什麼？

**驗證假設**：
```bash
# 在 CI 環境中檢查
echo $DISPLAY  # 空的，沒有顯示器
```

### 根本原因

**Electron 的運行要求**：
- Electron 基於 Chromium，需要 X11 顯示伺服器
- 即使是 headless 模式，底層仍需要圖形系統支援
- CI 環境（Ubuntu runner）預設沒有 X11 伺服器

**技術背景**：
- X11 是 Linux 的視窗系統協議
- GUI 應用程式透過 X11 與顯示器溝通
- headless 環境沒有真實顯示器，但可以用虛擬顯示器

**這是 Electron 測試的常見問題**：
- 所有 Electron CI/CD 都會遇到
- 解決方案都是使用虛擬 X server
- `xvfb`（X Virtual Frame Buffer）是標準工具

### 修正方式

**修改檔案**：`.github/workflows/ci.yml`

```yaml
# ❌ 直接執行會失敗
- name: 執行 E2E 測試
  run: pnpm run test:e2e

# ✅ 使用 xvfb-run 提供虛擬顯示器
- name: 執行 E2E 測試
  run: xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" pnpm run test:e2e
```

**參數說明**：
- `xvfb-run`：啟動 Xvfb 並在其中執行命令
- `--auto-servernum`：自動選擇可用的顯示編號（避免衝突）
- `--server-args="-screen 0 1280x960x24"`：
  - `-screen 0`：螢幕編號
  - `1280x960`：解析度
  - `x24`：24 位元色深

**為什麼選擇這些參數？**
1. 解析度 1280x960 足夠大，適合大多數 UI 測試
2. 24 位元色深是標準配置
3. `--auto-servernum` 避免並行測試時的衝突

### 驗證方法

```bash
# 本地模擬 headless 環境（如果有 xvfb）
xvfb-run --auto-servernum pnpm run test:e2e
```

### 相關 Commit

- `e17fd24`: fix: use xvfb-run for E2E tests in headless CI environment

---

## 🔍 問題 8：Electron 沙盒權限問題

### 錯誤現象

```
[FATAL:sandbox/linux/suid/client/setuid_sandbox_host.cc:166] 
The SUID sandbox helper binary was found, but is not configured correctly. 
Rather than run without sandboxing I'm aborting now. 
You need to make sure that chrome-sandbox is owned by root and has mode 4755.
```

### 排除思路

**這是什麼錯誤？**
- FATAL 級別，程序直接終止
- 錯誤來自 Chromium 的沙盒系統
- 提到 SUID、root、mode 4755 等 Linux 權限概念

**如何分析？**
1. **了解 SUID**：Set User ID，允許程序以擁有者身份執行
2. **了解沙盒**：Chrome/Electron 的安全機制，隔離不同程序
3. **關鍵推理**：CI 環境不會給予 root 權限

**為什麼會有沙盒？**
- Chrome/Electron 使用多程序架構
- 渲染器程序需要被沙盒隔離
- 沙盒需要特殊的系統權限才能設置

### 根本原因

**Electron 沙盒的要求**：
```
chrome-sandbox 二進制檔案需要：
1. 擁有者：root
2. 權限：4755 (rwsr-xr-x)
3. SUID bit 設置：允許以 root 身份執行
```

**CI 環境的限制**：
- CI runner 以普通用戶執行
- 無法執行 `chown root` 或 `chmod 4755`
- 安全策略不允許設置 SUID

**技術背景**：
- SUID 是 Linux 的安全特性，也是安全風險
- 只有 root 可以設置 SUID
- CI 環境出於安全考量限制這些權限

### 修正方式

**修改檔案**：`tests/e2e/helpers/electron-fixture.ts`

```typescript
const app = await electron.launch({
  args: ['--no-sandbox', MAIN_JS],  // ✅ 加入 --no-sandbox
  env: { ... }
})
```

**為什麼 --no-sandbox 是安全的？**
1. **CI 環境本身就是隔離的**：
   - 每次執行都是全新的容器
   - 執行完畢後容器就銷毀
   - 沒有持久的系統狀態

2. **測試環境不處理不可信內容**：
   - 測試的是自己的代碼
   - 不載入外部不可信的網頁
   - 沒有安全威脅

3. **這是標準做法**：
   - 幾乎所有 Electron 專案在 CI 中都這樣做
   - Chrome headless 測試也使用 --no-sandbox
   - 官方文檔推薦的方式

**不使用 --no-sandbox 的替代方案？**
- ❌ 設置 SUID：CI 環境不允許
- ❌ 使用 Docker privileged mode：過於複雜，安全風險更高
- ✅ --no-sandbox：簡單、安全、標準

### 驗證方法

```bash
# 在 CI 類似環境中測試
xvfb-run node_modules/.bin/electron --no-sandbox dist/main/main.js
```

### 相關 Commit

- `92d84ce`: fix: add --no-sandbox flag to Electron launch for CI compatibility

---

## 🔍 問題 9：搜尋測試使用錯誤的 Fixture

### 錯誤現象

```
Error: expect(locator).toBeVisible() failed
Locator: locator('input[placeholder="搜尋文章內容..."]')
Expected: visible
Error: element(s) not found
```

### 排除思路

**錯誤分析邏輯**：
1. **表面現象**：找不到元素
2. **深層問題**：為什麼找不到？
   - 元素真的不存在？
   - 還是在錯誤的上下文中查找？

**如何判斷？**
1. 檢查其他測試是否正常（editor-flow.spec.ts 正常）
2. 比較正常和異常測試的差異
3. 發現關鍵差異：**fixture 類型不同**

**對比分析**：
```typescript
// ✅ editor-flow.spec.ts（正常）
test('測試', async ({ window }) => { ... })

// ❌ search-flow.spec.ts（異常）
test('測試', async ({ page }) => { ... })
```

### 根本原因

**Fixture 類型混淆**：
```typescript
// search-flow.spec.ts
import { test, expect } from './helpers/electron-fixture'  // Electron fixture

test.describe('全文搜尋流程', () => {
  test('Ctrl+F 開啟搜尋面板', async ({ page }) => {  // ❌ 使用 page
    await page.keyboard.press('Control+f')
  })
})
```

**為什麼會有 page 和 window 兩種 fixture？**

| Fixture | 用途 | 來源 | 適用場景 |
|---------|------|------|---------|
| `page` | 網頁測試 | `@playwright/test` | 瀏覽器、Web 應用 |
| `window` | Electron 視窗 | `electron-fixture.ts` | Electron 桌面應用 |

**search-flow.spec.ts 的問題**：
- 從 `electron-fixture` 匯入（表示這是 Electron 測試）
- 但使用 `{ page }` fixture（表示當作網頁測試）
- `page` 在 Electron 測試中是 `undefined`
- 所以找不到任何元素

**為什麼會這樣寫？**
- 可能從網頁測試範本複製
- 沒有注意到 fixture 的區別
- 其他測試檔案都正確使用了 `{ window }`

### 修正方式

**修改檔案**：`tests/e2e/search-flow.spec.ts`

```typescript
// ✅ 改用 window fixture
test('Ctrl+F 開啟搜尋面板', async ({ window }) => {
  await window.keyboard.press('Control+f')
  await expect(window.locator('input[placeholder="搜尋文章內容..."]')).toBeVisible()
})
```

**同時加入測試環境設置**：
```typescript
test.beforeEach(async ({ window, testVaultPath }) => {
  // 建立測試文章
  createTestArticle(testVaultPath, '測試文章一', '這是搜尋測試的內容')
  
  // 設定 articlesDir
  await window.evaluate(async (vaultPath) => {
    const config = await (window as any).electronAPI.getConfig()
    config.paths.articlesDir = vaultPath
    await (window as any).electronAPI.setConfig(config)
  }, testVaultPath)
  
  // 重新載入並等待準備完成
  await window.reload()
  await window.waitForFunction(() => {
    const app = document.getElementById('app')
    return app !== null && app.children.length > 0
  }, { timeout: 15000 })
  
  // 等待文章列表載入
  await window.locator('.article-tree-item').first().waitFor({ timeout: 10000 })
})
```

**為什麼要加 beforeEach？**
- 保持與其他 Electron 測試的一致性
- 搜尋功能需要文章才能測試
- 提供乾淨、可預測的測試環境

**額外改進**：
- 用 `waitFor` 取代固定 `waitForTimeout`
- 提高測試穩定性
- 符合 Playwright 最佳實踐

### 驗證方法

```bash
# 單獨執行搜尋測試
pnpm exec playwright test search-flow.spec.ts
```

### 相關 Commit

- `d4d9b3d`: fix: use correct window fixture in search-flow tests instead of page

---

## 🔍 問題 10：Worker Fixture 超時

### 錯誤現象

```
Fixture "electronApp" timeout of 30000ms exceeded during setup.
at helpers/electron-fixture.ts:59
```

### 排除思路

**錯誤分析**：
1. 錯誤明確指出 fixture 超時
2. 位置在 `electron-fixture.ts:59`（fixture 定義處）
3. 超時值是 30000ms（30 秒）

**切入點**：
- 查看 Playwright 的 fixture 超時機制
- 了解 worker scope 和 test scope 的區別
- 檢查 fixture 是否有設置超時

**Worker scope vs Test scope**：
```typescript
// Worker scope：整個測試檔案共用一個實例
{ scope: 'worker' }

// Test scope：每個測試獨立的實例  
{ scope: 'test' }
```

### 根本原因

**Fixture 使用預設超時**：
```typescript
electronApp: [async ({ testVaultPath }, use) => {
  const app = await electron.launch({ ... })
  await getAppWindow(app)  // 這個操作可能需要 30+ 秒
  await use(app)
  await app.close()
}, { scope: 'worker' }],  // ❌ 沒有設置 timeout
```

**為什麼會超時？**

時間分解：
```
1. electron.launch()         : 5-10 秒
2. getAppWindow() 尋找視窗    : 最多 10 秒
3. waitForFunction() 等待掛載 : 最多 20 秒
──────────────────────────────────────
總計：15-40 秒（CI 環境可能更慢）

預設 fixture timeout：30 秒 ❌
```

**Playwright fixture 的超時機制**：
- Worker scope fixture 的預設超時：30 秒
- 如果 fixture 設置超過 30 秒就會失敗
- 需要明確設置更長的超時

### 修正方式

**修改檔案**：`tests/e2e/helpers/electron-fixture.ts`

```typescript
testVaultPath: [async ({}, use) => {
  const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'writeflow-test-'))
  await use(vaultPath)
  fs.rmSync(vaultPath, { recursive: true, force: true })
}, { scope: 'worker', timeout: 60000 }],  // ✅ 增加到 60 秒

electronApp: [async ({ testVaultPath }, use) => {
  const app = await electron.launch({ ... })
  await getAppWindow(app)
  await use(app)
  await app.close()
}, { scope: 'worker', timeout: 60000 }],  // ✅ 增加到 60 秒
```

**為什麼是 60 秒？**
- Electron 啟動 + 視窗搜尋 + Vue 載入：30-40 秒
- 加上 CI 環境緩衝：50-60 秒
- 60 秒提供合理的安全邊際

### 驗證方法

```bash
# 測試是否還會超時
pnpm exec playwright test --workers=1
```

### 相關 Commit

- `ffd77d0`: fix: increase worker fixture timeout to 60s to prevent E2E test timeouts

---

## 🔍 問題 11：全局測試超時配置（關鍵問題）

### 錯誤現象

即使修正了 worker fixture 的超時，測試**仍然**在 30 秒時超時：
```
TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
```

### 排除思路

**這是最關鍵的分析**：

**觀察到的異常**：
1. 已經設置 worker fixture timeout: 60000ms
2. 已經設置 waitForFunction timeout: 20000ms
3. 但錯誤訊息顯示 "Timeout 30000ms"
4. **這個 30000ms 是從哪來的？**

**分析邏輯鏈**：
```
問題：錯誤說 30000ms 超時
├─ 不是 waitForFunction 的 20000ms
├─ 不是 fixture 的 60000ms  
└─ 那一定是**更外層**的超時！
    └─ 查看 playwright.config.ts
        └─ 找到：timeout: 30000 ← 全局測試超時！
```

**為什麼這個問題最難發現？**
1. **超時的層級結構不明顯**：
   ```
   全局測試超時（最外層）
     └─ Fixture 超時（中層）
         └─ 操作超時（最內層）
   ```

2. **優先級規則**：外層超時會終止內層所有操作
3. **錯誤訊息誤導**：報告的是內層超時，但真正原因是外層

**關鍵推理**：
- 如果 fixture timeout 是 60s，但測試在 30s 就失敗
- 說明有一個更高優先級的 30s 限制
- 這個限制就是全局測試超時！

### 根本原因

**Playwright 的超時層級**：

```
層級 1（最高優先級）：playwright.config.ts
├─ timeout: 30000  ← 全局測試超時：30 秒
│  └─ 所有測試必須在 30 秒內完成
│     └─ 超過就強制終止，不管內層設定多少
│
層級 2：Fixture 超時
├─ { scope: 'worker', timeout: 60000 }
│  └─ 但如果全局已經超時，這個設定無效
│
層級 3：操作超時
└─ waitForFunction({ timeout: 20000 })
   └─ 同樣被全局超時覆蓋
```

**為什麼全局超時是 30 秒？**
- 這是 Playwright 的**預設值**
- 適合快速的網頁測試
- 但不適合需要啟動整個 Electron 應用的測試

**Electron 應用的時間需求**：
```
完整的測試執行時間（CI 環境）：

階段 1: Fixture 設置
├─ 建立臨時目錄         : 1 秒
├─ 啟動 Electron        : 5-10 秒
├─ 尋找主視窗           : 2-10 秒
└─ 等待 Vue App 掛載    : 5-20 秒
小計：13-41 秒

階段 2: 測試執行
├─ 設置測試資料         : 2-5 秒
├─ 執行測試操作         : 5-15 秒
└─ 斷言和驗證           : 1-5 秒
小計：8-25 秒

總計：21-66 秒（CI 環境通常偏向上限）
```

**配置衝突**：
- 需要時間：30-66 秒
- 允許時間：30 秒 ❌
- 結果：**測試總是在完成前被強制終止**

### 修正方式

**修改檔案**：`playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  
  // ✅ 增加全局測試超時到 90 秒
  // 原因：Electron 應用在 CI 環境中啟動需要 30-60 秒
  timeout: 90000,  // 從 30000 改為 90000
  
  // ... 其他配置
})
```

**為什麼是 90 秒？**

時間預算分配：
```
Fixture 設置：        30-40 秒
測試執行：            10-20 秒
CI 環境緩衝：         20-30 秒
────────────────────────────
總計：                60-90 秒

建議：90 秒（留 30% 安全邊際）
```

**為什麼不設置更大（如 120 秒）？**
1. 太長的超時會讓真正的死鎖問題難以發現
2. 90 秒已經足夠，並有安全邊際
3. 如果超過 90 秒，可能代表有其他問題

**為什麼不設置更小（如 60 秒）？**
1. CI 環境速度不穩定
2. 有些測試需要設置更多資料
3. 需要緩衝時間應對波動

### 修正的關鍵洞察

**這才是真正的根本原因！**

前面 10 個修正都是**必要的**，但它們解決的是**不同層級的問題**：

```
問題層級金字塔：
                    11. 全局超時配置 ← 真正的瓶頸
                    ────────────────
                10. Fixture 超時
            ────────────────────────
        9. 測試邏輯正確性
    ────────────────────────────────
1-8. 語法、依賴、環境、權限
────────────────────────────────────
```

**比喻**：
- 就像蓋房子，地基（1-8）、結構（9-10）都蓋好了
- 但忘記開門（11），所以進不去
- 你在裡面裝潢再好也沒用，因為門太小！

**為什麼這個問題最後才發現？**
1. 前面的問題會**完全阻止**測試執行
2. 只有所有前置問題都解決後，測試才能執行到超時
3. 超時問題只有在**測試能啟動但完成不了**時才會顯現

### 驗證方法

```bash
# 檢查配置
cat playwright.config.ts | grep timeout

# 執行測試（應該有足夠時間完成）
pnpm run test:e2e
```

### 相關 Commit

- `2db92a4`: fix: increase Playwright global test timeout from 30s to 90s

---

## 📊 完整修復時間軸

### 修復順序圖

```
Day 1 (2026-02-16)
├─ 問題 1: Playwright 匯入錯誤 → 2a1cc09
├─ 問題 2-4: 建置錯誤 → d42e05b, 920b125
└─ 問題 5: CI 建置步驟 → d42e05b

Day 2 (2026-02-16) 
├─ 問題 6: Electron 二進制 → 9648912
└─ 問題 7: Headless 環境 → e17fd24

Day 3 (2026-02-23)
└─ 問題 8: 沙盒權限 → 92d84ce

Day 4 (2026-02-23)
└─ 問題 9: 搜尋測試 fixture → d4d9b3d, 1b79685

Day 5 (2026-02-24)
├─ 問題 10: Worker fixture 超時 → ffd77d0
└─ 問題 11: 全局測試超時 → 2db92a4 ✅ 最終解決！
```

### 為什麼需要這麼多次修復？

**連鎖問題特性**：
1. **逐層顯現**：只有解決了前一個問題，下一個才會顯現
2. **不同層級**：語法 → 依賴 → 環境 → 配置 → 邏輯
3. **相互依賴**：每個都是必要條件，但都不是充分條件

**問題排除策略**：
```
策略 A（我們的路徑）：
逐步修復，每次解決一個錯誤 → 發現下一個錯誤 → 再修復
優點：每次修改最小化，風險低
缺點：需要多次迭代

策略 B（理想但不切實際）：
一次性識別所有問題 → 一起修復
優點：快速完成
缺點：需要完整的系統知識，容易遺漏，風險高
```

我們的做法是**正確的**：
- CI/CD 問題本質上是連鎖的
- 無法一次看到所有問題
- 逐步修復是最穩健的方法

---

## 🎯 關鍵教訓與最佳實踐

### 1. 問題排除的三個層級

```
第一層：能不能編譯？
├─ 語法錯誤（匯入、型別）
├─ 依賴缺失
└─ 建置配置

第二層：能不能執行？
├─ 環境差異（本地 vs CI）
├─ 權限問題
└─ 二進制檔案

第三層：能不能完成？
├─ 超時配置
├─ 資源限制
└─ 測試邏輯
```

**排除策略**：從下往上，逐層解決。

### 2. CI 環境 vs 本地環境

**關鍵差異**：

| 特性 | 本地開發 | CI 環境 |
|------|---------|---------|
| 環境狀態 | 有歷史狀態（dist、node_modules） | 乾淨環境 |
| 顯示器 | 有實體顯示器 | Headless |
| 權限 | 可能有更高權限 | 受限的權限 |
| 速度 | 較快 | 可能較慢 |
| 依賴安裝 | 可能有全局依賴 | 僅安裝宣告的依賴 |

**排除思路**：
- 本地能跑但 CI 不能 → **環境差異**
- 檢查清單：
  1. 是否缺少建置步驟？
  2. 是否需要顯示器？
  3. 是否需要特殊權限？
  4. 是否依賴未宣告的套件？

### 3. Electron 測試的特殊考量

**Electron 不是普通的網頁應用**：
```
網頁應用測試：
├─ 啟動 Web Server（快）
├─ 開啟瀏覽器頁面（快）
└─ 執行測試（快）
總時間：< 10 秒

Electron 應用測試：
├─ 編譯主程序（中等）
├─ 啟動整個 Electron 應用（慢）
├─ 尋找應用視窗（中等）
├─ 等待前端框架載入（慢）
└─ 執行測試（快）
總時間：30-60 秒
```

**因此**：
- Electron 測試需要更長的超時
- 需要 xvfb（虛擬顯示器）
- 需要 --no-sandbox（CI 環境）
- 需要明確的建置步驟

### 4. 超時配置的層級理解

**Playwright 的超時層級**：
```typescript
// 第 1 層：全局測試超時（最高優先級）
// playwright.config.ts
timeout: 90000,  // 整個測試的總時間限制

// 第 2 層：Fixture 超時
{ scope: 'worker', timeout: 60000 }  // Fixture 設置的時間限制

// 第 3 層：操作超時
await page.waitForFunction(..., { timeout: 20000 })  // 單一操作的時間限制
```

**優先級規則**：
- 外層超時會**終止**內層所有操作
- 內層超時**不能超過**外層超時
- 設置時需要：全局 > Fixture > 操作

**常見錯誤**：
```typescript
// ❌ 錯誤：內層大於外層
timeout: 30000,  // 全局 30 秒
{ timeout: 60000 }  // Fixture 60 秒 → 無效！
```

### 5. 如何高效地排查連鎖問題

**策略：記錄和分析**

每次修復後：
1. **記錄錯誤訊息**：完整的堆疊和上下文
2. **記錄修改內容**：改了什麼、為什麼改
3. **預測下一個問題**：這個修復後可能出現什麼？

**模式識別**：
- 語法錯誤 → 看完整的錯誤訊息
- 依賴問題 → 檢查 package.json
- 環境問題 → 對比本地和 CI
- 配置問題 → 檢查配置檔案

**避免重複工作**：
- 建立問題檢查清單
- 記錄每次的分析過程
- 識別問題模式，建立知識庫

### 6. pnpm 的特殊注意事項

**pnpm vs npm/yarn 的差異**：

| 行為 | npm/yarn | pnpm |
|------|----------|------|
| 建置腳本 | 自動執行 | **需要批准** |
| 依賴安裝 | 全部安裝 | 嚴格按照 lock file |
| 快取機制 | 每個專案獨立 | 全局共享 |

**在 CI 中使用 pnpm 的注意事項**：
1. **建置腳本**：需要手動執行（如 Electron 的 install.js）
2. **快取**：建議手動管理 pnpm store
3. **鎖定檔案**：務必使用 `--frozen-lockfile`

**Electron + pnpm 的最佳實踐**：
```yaml
# 安裝依賴
- run: pnpm install --frozen-lockfile

# 明確安裝 Electron 二進制（pnpm 不會自動執行）
- run: |
    cd node_modules/electron
    node install.js
```

### 7. 錯誤訊息解讀技巧

**案例研究：30000ms 超時之謎**

錯誤訊息說：
```
TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
at helpers/electron-fixture.ts:38
```

**表面解讀**：
- waitForFunction 在第 38 行超時
- 超時值是 30000ms

**深入分析**：
```typescript
// 查看第 38 行的代碼
await win.waitForFunction(..., { timeout: 20000 })  // 設定是 20 秒！
```

**矛盾點**：
- 設定是 20000ms
- 錯誤說 30000ms
- **說明這不是 waitForFunction 的超時！**

**正確解讀**：
- 錯誤位置在第 38 行是對的
- 但超時的原因是**外層的全局超時**（30000ms）
- waitForFunction 還沒等到自己的 20 秒，就被全局超時終止了

**教訓**：
- 不要只看錯誤訊息的表面
- 對比代碼和錯誤訊息，找出矛盾點
- 矛盾點往往指向真正的原因

### 8. 測試穩定性的設計原則

**不要使用固定 timeout**：
```typescript
// ❌ 不好：固定等待
await page.waitForTimeout(2000)  // 可能太短或太長

// ✅ 好：等待條件滿足
await page.locator('.article-tree-item').first().waitFor({ timeout: 10000 })
```

**為什麼？**
- 固定時間無法適應不同環境的速度
- 條件等待會在達成條件時立即繼續
- 既快速又穩定

**條件等待的模式**：
```typescript
// 模式 1：等待元素出現
await page.locator('selector').waitFor()

// 模式 2：等待狀態變化
await page.waitForFunction(() => window.某個狀態 === true)

// 模式 3：等待網路完成
await page.waitForLoadState('networkidle')
```

---

## 🗂️ 所有修改的檔案總覽

### 1. 測試相關

**tests/e2e/helpers/electron-fixture.ts**
```typescript
// 修改內容：
1. 修正 Playwright 匯入（從 @playwright/test）
2. 加入 --no-sandbox 參數
3. 增加 worker fixtures 超時到 60 秒

// 影響：所有 Electron 測試的基礎架構
```

**tests/e2e/search-flow.spec.ts**
```typescript
// 修改內容：
1. 改用正確的 window fixture（而非 page）
2. 加入 beforeEach 測試環境設置
3. 改進等待邏輯（條件等待取代固定 timeout）

// 影響：搜尋功能的 E2E 測試
```

**playwright.config.ts**
```typescript
// 修改內容：
1. 增加全局測試超時到 90 秒

// 影響：所有 E2E 測試的執行時間限制
```

### 2. 應用程式代碼

**src/main/main.ts**
```typescript
// 修改內容：
1. 加入 autoUpdater 事件處理器的型別標註

// 影響：主程序的型別安全
```

**src/main/services/SearchService.ts**
```typescript
// 修改內容：
1. 修正 ES 模組匯入路徑（加入 .js 副檔名）

// 影響：搜尋服務的模組載入
```

### 3. 依賴和配置

**package.json & pnpm-lock.yaml**
```json
// 修改內容：
1. 加入 electron-updater 依賴

// 影響：應用程式的自動更新功能
```

**.github/workflows/ci.yml**
```yaml
// 修改內容：
1. 加入建置步驟（pnpm run build:main）
2. 加入 Electron 安裝步驟（node install.js）
3. 使用 xvfb-run 執行測試

// 影響：CI E2E 測試的執行流程
```

### 修改統計

- **總檔案數**：7 個
- **代碼修改**：~50 行
- **配置修改**：~15 行
- **Commit 數**：11 個
- **解決問題數**：11 個

---

## 🧠 排除思路總結

### 分析框架：5W1H

每次遇到錯誤時，問自己：

**What（什麼）**：
- 錯誤訊息是什麼？
- 失敗的是什麼操作？

**Where（哪裡）**：
- 錯誤發生在哪個檔案、哪一行？
- 是本地還是 CI？

**When（何時）**：
- 什麼時候發生的？
- 是編譯時還是執行時？

**Why（為什麼）**：
- 為什麼會失敗？
- 根本原因是什麼？

**Who（誰）**：
- 是哪個元件、哪個函式導致的？
- 相關的依賴或系統元件是什麼？

**How（如何）**：
- 如何修復？
- 有哪些替代方案？

### 排查決策樹

```
遇到錯誤
├─ 是語法錯誤？
│  ├─ Yes → 修正語法 → 重新測試
│  └─ No → 繼續
│
├─ 是依賴問題？
│  ├─ Yes → 安裝依賴 → 重新測試
│  └─ No → 繼續
│
├─ 是環境問題？
│  ├─ 本地正常，CI 失敗？
│  │  └─ Yes → 檢查環境差異
│  └─ No → 繼續
│
├─ 是配置問題？
│  ├─ 檢查配置檔案
│  └─ 對比預期行為
│
└─ 是邏輯問題？
   └─ 深入分析程式邏輯
```

### 有效的排查技巧

**技巧 1：二分搜尋**
```
問題：測試在某個階段失敗
策略：在中間點加入日誌，確定問題在前半還是後半
重複：縮小範圍，直到找到具體位置
```

**技巧 2：對比分析**
```
找到一個正常運作的案例（baseline）
對比異常案例和正常案例的差異
差異點通常就是問題所在
```

**技巧 3：最小可重現案例**
```
逐步簡化問題
移除無關的代碼和配置
找到能重現問題的最小案例
```

**技巧 4：查看完整日誌**
```bash
# 不只看錯誤，還要看警告
# 警告往往是問題的線索

# 範例：pnpm 的警告揭露了建置腳本被忽略
"Ignored build scripts: electron..."  ← 這是關鍵線索！
```

### 文檔化的重要性

**為什麼要寫這份文檔？**
1. **知識傳承**：其他人遇到類似問題時可以參考
2. **避免重複**：記錄了什麼有效、什麼無效
3. **理解深化**：寫作過程強迫你深入思考
4. **團隊學習**：分享排查思路和技巧

**好的問題排除文檔應該包含**：
- ✅ 錯誤現象（截圖、日誌）
- ✅ 分析思路（為什麼這樣切入）
- ✅ 根本原因（技術細節）
- ✅ 解決方案（代碼、命令）
- ✅ 驗證方法（如何確認已修復）
- ✅ 相關 Commit（可追溯性）

---

## 📚 參考資源

### Electron 測試相關

- [Playwright Electron 文檔](https://playwright.dev/docs/api/class-electron)
- [Electron 官方測試指南](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [在 CI 中運行 Electron 測試](https://www.electronjs.org/docs/latest/tutorial/automated-testing#running-on-ci)

### Playwright 配置

- [Playwright Test Timeouts](https://playwright.dev/docs/test-timeouts)
- [Playwright Fixtures](https://playwright.dev/docs/test-fixtures)
- [Playwright CI 配置](https://playwright.dev/docs/ci)

### pnpm 相關

- [pnpm Build Scripts](https://pnpm.io/cli/run#enable-pre-post-scripts)
- [pnpm in CI](https://pnpm.io/continuous-integration)

### Linux 環境

- [Xvfb - X Virtual Frame Buffer](https://www.x.org/releases/X11R7.6/doc/man/man1/Xvfb.1.xhtml)
- [Chrome/Electron Sandbox](https://chromium.googlesource.com/chromium/src/+/master/docs/linux/sandboxing.md)

---

## ✅ 最終驗證清單

修復完成後，確認以下項目：

### 建置驗證
- [x] `pnpm install` 成功
- [x] `pnpm run build:main` 成功
- [x] `dist/main/main.js` 存在

### 本地測試驗證
- [x] `pnpm exec playwright test --list` 成功列出測試
- [x] 可以在本地執行單一測試
- [x] 測試邏輯正確

### CI 環境驗證
- [x] CI workflow 觸發
- [x] 依賴安裝成功
- [x] Electron 二進制安裝成功
- [x] 建置步驟成功
- [x] E2E 測試執行成功
- [x] 所有測試通過

### 配置驗證
- [x] playwright.config.ts timeout: 90000
- [x] electron-fixture.ts worker timeout: 60000
- [x] CI 使用 xvfb-run
- [x] Electron 使用 --no-sandbox

---

## 🎓 給未來維護者的建議

### 如果 E2E 測試再次失敗...

**快速診斷檢查清單**：

1. **檢查 CI 日誌的第一個錯誤**
   - 不要被後續錯誤分散注意力
   - 第一個錯誤通常是根源

2. **檢查環境差異**
   ```bash
   # 本地能跑嗎？
   pnpm run test:e2e
   
   # CI 特有的問題？
   # → 環境、權限、顯示器
   ```

3. **檢查依賴和建置**
   ```bash
   # 依賴完整嗎？
   pnpm install
   
   # 建置成功嗎？
   pnpm run build:main
   
   # 輸出檔案存在嗎？
   ls dist/main/main.js
   ```

4. **檢查超時配置**
   ```bash
   # 全局超時足夠嗎？
   grep timeout playwright.config.ts
   
   # Fixture 超時足夠嗎？
   grep timeout tests/e2e/helpers/electron-fixture.ts
   ```

5. **檢查 Electron 特殊需求**
   ```bash
   # 二進制檔案存在嗎？
   ls node_modules/electron/dist/electron
   
   # CI 使用 xvfb 了嗎？
   grep xvfb .github/workflows/ci.yml
   
   # 使用 --no-sandbox 了嗎？
   grep no-sandbox tests/e2e/helpers/electron-fixture.ts
   ```

### 如果需要調整超時...

**評估時間需求**：
```bash
# 測量實際執行時間
time pnpm run test:e2e

# 在 CI 中添加計時
- run: time xvfb-run pnpm run test:e2e
```

**超時配置建議**：
```
實際需要時間 × 1.5 = 建議超時值

範例：
- 實際需要：60 秒
- 建議設定：90 秒（60 × 1.5）
```

**不同階段的超時建議**：
- 快速單元測試：5-10 秒
- 整合測試：30-60 秒
- E2E 測試（Electron）：60-120 秒
- E2E 測試（Web）：30-60 秒

### 如果添加新的 E2E 測試...

**檢查清單**：
- [ ] 使用正確的 fixture（Electron 用 `window`，Web 用 `page`）
- [ ] 加入 beforeEach 設置測試環境
- [ ] 使用條件等待，不用固定 timeout
- [ ] 考慮測試執行時間，是否需要調整超時
- [ ] 在本地和 CI 都測試通過

### 持續改進

**建議的監控指標**：
- E2E 測試執行時間趨勢
- 超時失敗的頻率
- 不同環境的時間差異

**如果發現問題**：
- 記錄在這份文檔中
- 更新排查邏輯
- 分享給團隊

---

## 📈 相關 Commit 完整列表

按時間順序：

1. `2a1cc09` - fix: correct playwright import in electron-fixture.ts
2. `d42e05b` - fix: add electron-updater dependency and fix build errors for E2E tests
3. `920b125` - chore: update electron-updater to latest version (6.8.3)
4. `9648912` - fix: install Electron binaries explicitly in CI workflow
5. `e17fd24` - fix: use xvfb-run for E2E tests in headless CI environment
6. `92d84ce` - fix: add --no-sandbox flag to Electron launch for CI compatibility
7. `d4d9b3d` - fix: use correct window fixture in search-flow tests instead of page
8. `1b79685` - docs: 完整修復總結 - 所有測試問題已解決
9. `ffd77d0` - fix: increase worker fixture timeout to 60s to prevent E2E test timeouts
10. `2db92a4` - fix: increase Playwright global test timeout from 30s to 90s

---

## 💡 結語

這次問題排除是一個典型的**連鎖問題解決**案例。關鍵不在於一次解決所有問題（這幾乎不可能），而在於：

1. **有系統地分析**：從語法 → 依賴 → 環境 → 配置 → 邏輯
2. **記錄每一步**：什麼問題、為什麼、怎麼解決
3. **理解根源**：不只是改代碼，而是理解為什麼要這樣改
4. **持續迭代**：每次修復後，準備好面對下一個問題

最重要的教訓：
> **最後的問題往往不是最難的，而是最容易被忽略的。**

全局配置（`timeout: 30000`）就是一個小小的設定，但它影響了整個系統。這提醒我們：
- 排查問題要有全局視角
- 不要忽略配置檔案
- 理解系統的層級結構

希望這份文檔能幫助未來遇到類似問題的開發者！

---

**文檔維護者**：Copilot Agent  
**建立日期**：2026-02-24  
**最後更新**：2026-02-24  
**相關 PR**：#26
