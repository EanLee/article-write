# 程式品質評估報告 — 第六次全面評估

**審查者**: 程式品質工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，基準 commit `e9b525a`

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **品質總分** | **6.5 / 10** | 穩固基準（TS 零錯、ESLint 零 error），但關鍵 Service 零測試 |
| 測試覆蓋率 | 6/10 | 43 個測試檔，8 個主進程 Service 完全無測試 |
| 技術負債積累 | 7/10 | 4 個 TODO stub，整體可控 |
| 程式碼重複 | 6/10 | reloadArticle vs ArticleService.loadArticle 明顯重複 |
| 錯誤處理一致性 | 7/10 | ProcessService 有明顯例外 |
| 文件品質 | 7/10 | ImageService JSDoc 佳，ProcessService 完全空白 |
| 安全預設值 | 6/10 | autoDownload = true 尚未改為使用者確認流程 |

---

## 執行摘要

第五次評審的品質問題（console.log 替換、ESLint warnings）均已完整解決。本次新發現的最高優先問題是 **`autoDownload = true`**（QUAL6-03） 的供應鏈安全風險，以及 **ProcessService**（QUAL6-01/02/09）的三個相關 Bug——零測試使這些 Bug 完全沒有自動化防護。

整體基準線健康：TypeScript 0 errors、ESLint 0 errors、測試 569 通過——但 8 個主進程 Service 完全無測試是下一個 Sprint 的主要技術債。

---

## 已修正確認（第五次評審品質問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| Q5-01 | console.log 29 次繞過 logger | ✅ 全部替換，ESLint no-console rule 防回歸 |
| Q5-02 | ESLint no-explicit-any 106 warnings | ✅ 全清，剩 3 個 pre-existing v-html warnings |

---

## 新發現問題

### QUAL6-01 🔴 高危 — ProcessService 零測試 + hardcoded IPC channel `"server-log"`

**位置**: `src/main/services/ProcessService.ts`（全檔；tests/services/ 目錄無對應測試）

**問題 A：零測試**
8 個主進程 Service 中，ProcessService 是操控**子 process 生命週期**的高影響服務，卻完全沒有測試。`startDevServer`、`stopDevServer` 的 Promise 邊界行為完全靠人工驗證。

**問題 B：hardcoded IPC channel**
```typescript
// ProcessService.ts:22
win.webContents.send("server-log", { log, type, timestamp: ... })
// ↑ 字面量 "server-log" 未使用 IPC.XXX 常數
// 與已完成的 ipc-channels.ts 重構不一致，靜默失敗風險
```

**修正建議**:
1. `ipc-channels.ts` 加入 `SERVER_LOG = "server-log"` 常數
2. ProcessService 改用 `IPC.SERVER_LOG`
3. 補 `tests/main/ProcessService.test.ts`（最低覆蓋：spawn 成功路徑、stderr 路徑、stopDevServer 中止）

---

### QUAL6-02 🔴 高危 — startDevServer() 競態計時器解決啟動就緒偵測

**位置**: `src/main/services/ProcessService.ts:79-81`

**問題**:
```typescript
// ❌ 以 2 秒 setTimeout 代替真正的就緒訊號偵測
setTimeout(() => {
  resolve()
}, 2000)
```

**雙重問題**:
1. **偽就緒**：慢機器/CI 環境下 2 秒可能不夠，resolve 後伺服器實際未就緒，UI 顯示「伺服器已啟動」但 URL 無法連線
2. **double-settle**：若 npm 立即失敗，`exit` 先 reject，但 timeout 仍會 resolve——第二次 settle 被靜默忽略

**修正建議**:
```typescript
// 偵測到輸出中含 URL（Local: http://localhost:xxxx）才 resolve
let resolved = false
devProcess.stdout.on("data", (chunk: Buffer) => {
  const text = chunk.toString()
  if (text.includes("Local:") && !resolved) {
    resolved = true
    resolve()
  }
})
// 加入 30 秒 timeout fallback
setTimeout(() => {
  if (!resolved) {
    resolved = true
    reject(new Error("Dev server 啟動逾時（30s）"))
  }
}, 30000)
```

---

### QUAL6-03 🔴 高危 — autoDownload = true 仍未改為使用者確認流程

**位置**: `src/main/main.ts:101-102`

**問題**:
```typescript
autoUpdater.autoDownload = true;          // line 101
autoUpdater.autoInstallOnAppQuit = true;  // line 102
```

生產版在使用者未同意的情況下**後台靜默下載**並在下次關機時安裝。若 CDN 或 GitHub Releases 遭入侵（供應鏈攻擊），惡意更新直接到達使用者機器，無任何中斷點。

**修正建議**:
```typescript
autoUpdater.autoDownload = false

autoUpdater.on("update-available", (info) => {
  // 發送 IPC 讓 UI 顯示確認對話框
  mainWindow.webContents.send(IPC.UPDATE_AVAILABLE, info)
})

// 使用者確認後才下載
ipcMain.handle(IPC.UPDATE_CONFIRM_DOWNLOAD, async () => {
  await autoUpdater.downloadUpdate()
})
```

---

### QUAL6-04 🟠 中危 — ConfigService 零測試（所有服務初始化的根源）

**位置**: `src/main/services/ConfigService.ts`（無對應測試）

**問題**: ConfigService 是所有服務的設定根源（AIService、FileService 路徑白名單均依賴它）。`safeStorage` 加解密邏輯、`AppConfigSchema` Zod 驗證、`allowedPaths` 計算——均無自動化測試保護。

**建議**: ConfigService 測試和 S6-02（safeStorage 修復）**捆綁在同一個 PR**，修復同時驗證遷移路徑。

---

### QUAL6-05 🟠 中危 — article.ts Store 過度龐大（611 行）使測試難以維護

**位置**: `src/stores/article.ts`（611 行）

**問題**: 7 個 `window.electronAPI` 直呼叫使 Store 測試需要 mock 全量介面（~30 方法）。每次修改任一邏輯，測試 mock 都可能需要更新，**維護成本是正常 DI Store 的 2-3 倍**。

**→ 同 SOLID6-01，品質角度同意優先拆分 `useArticleFilter` composable**

---

### QUAL6-06 🟠 中危 — ImageService.ts 648 行，型別定義混入實作檔

**位置**: `src/services/ImageService.ts`（648 行）

**問題**: 6 個 interface（`ImageInfo`、`ImageReference`、`ImageValidationResult` 等）全部定義在同一服務檔案，導致型別難以在其他模組重用。

**修正建議**: 將 6 個 interface 移至 `src/types/image.ts`；ImageService 本身拆分為 `ImageValidatorService` + `ImageManagerService`（可分階段，先抽型別）。

---

### QUAL6-07 🟠 中危 — ProcessService hardcoded `npm run dev`，專案使用 pnpm

**位置**: `src/main/services/ProcessService.ts:47`

**問題**:
```typescript
this.devServerProcess = spawn("npm", ["run", "dev"], { ... })
// ↑ 專案使用 pnpm，在純 pnpm 環境（CI 容器/NVM 快取）可能失敗
```

**修正建議**: 改為 `pnpm run dev`，或從 `process.env.npm_execpath` 動態偵測。

---

### QUAL6-08 🟡 低危 — 4 個 TODO stub，部分涵蓋核心功能，無 Issue 追蹤標記

**位置**:
- `src/components/ArticleTreeItem.vue:69` — 自動儲存未儲存狀態顯示
- `src/components/ArticleTreeItem.vue:102` — 右鍵選單（使用者可感知功能缺口）
- `src/components/FrontmatterView.vue:113` — Frontmatter 編輯 Modal
- `src/components/SearchPanel.vue:55` — CM6 捲動定位 API（有 `topic-014` 標記，較佳）

**修正建議**: 為各 TODO 加入 GitHub Issue 編號（如 `// TODO(#123)`），ArticleTreeItem 的右鍵選單和自動儲存狀態列入下一 Sprint 待辦。

---

### QUAL6-09 🟡 低危 — stopDevServer() 未等待 process 實際退出

**位置**: `src/main/services/ProcessService.ts:85-93`

**問題**:
```typescript
async stopDevServer(): Promise<void> {
  if (this.devServerProcess) {
    this.devServerProcess.kill()   // Windows 上 SIGTERM 非同步
    this.devServerProcess = null   // ← 立即清空，舊 process 仍在執行
  }
}
```

快速重啟時，兩個 `devServer` 實例並存，佔用同一 port。

**修正建議**: 監聽 `exit` 事件後才 resolve，或使用 `tree-kill` 確保 Windows 下完整終止。

---

### QUAL6-10 🟡 低危 — ProcessService 完全無 JSDoc

**位置**: `src/main/services/ProcessService.ts`（全檔）

相比之下，`ImageService.ts` 的公開方法均有完整 JSDoc（`@param`、`@returns`、類別說明）。ProcessService 四個公開方法的行為語意（尤其是 `startDevServer` resolve 時機）只能靠閱讀實作才能理解。

---

## 無測試的主進程 Service 清單

| Service | 在 tests/ 中有測試？ | 優先補測試原因 |
|---------|---------------------|---------------|
| ConfigService | ❌ 無 | 所有服務初始化根源，S6-02 修復的前提 |
| ProcessService | ❌ 無 | 有 3 個已知 Bug（QUAL6-01/02/09），零測試無法驗證修復 |
| SearchService | ❌ 無 | PERF 重構（trigram index）需要測試保護 |
| GitService | ❌ 無 | 操作 git 倉庫，副作用大 |
| PublishService | ❌ 無 | 發布流程風險高 |
| AIService | ❌ 無 | TOKEN6-05 dead code 需測試驗證 |
| AutoSaveService | ❌ 無 | 需解除 Vue 耦合後才易測（SOLID6-11） |
| ImageService | ⚠️ 存在但覆蓋不完整 | 648 行，邊界行為未覆蓋 |

---

## 亮點（值得保留）

1. **IPC 常數集中管理**：`ipc-channels.ts` 消除 13 個散落字面量（ProcessService 是遺漏案例，主體架構正確）
2. **ImageService JSDoc 覆蓋率**：6 個 interface 均有說明，公開方法有 `@param`/`@returns`，可作標竿
3. **Sentry 早期初始化**：在所有 import 後、`app.whenReady()` 前呼叫，啟動期異常也能捕捉
4. **CSP 分環境策略**：dev 模式允許 Vite HMR，生產完全鎖定，清晰明確
5. **TypeScript 0 errors（strict mode）**：健碼基準，整個 Sprint 維持零容忍
6. **ESLint 0 errors**：3 個 `v-html` warnings 均有 DOMPurify 保護，可接受

---

## 品質工程師結語

WriteFlow 的靜態品質指標（TS、ESLint）已達良好水準。下一個品質跳躍點在**動態測試覆蓋率**——8 個主進程 Service 的零測試狀態，使任何 Main Process 重構都存在無自動化保護的風險。建議以 ConfigService（S6-02 捆綁）和 ProcessService（QUAL6-01/02/09 捆綁）作為優先補測試目標，並建立 `tests/main/` 目錄 + Node environment 設定，為後續補測試提供基礎設施。

---

*第六次全面評估 — 品質 | 索引: [00-index.md](./00-index.md) | 前次: [第五次品質報告](../2026-03-01-fifth-review/05-code-quality-report.md)*
