# 資安評估報告 — 第六次全面評估

**審查者**: 資安工程師 Agent  
**日期**: 2026-03-01  
**評估範圍**: WriteFlow v0.1.0，基準 commit `e9b525a`（第五次評審全部問題解決後）

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **資安總分** | **6.0 / 10** | 首度納入 Process 安全、API 金鑰儲存、路徑白名單完整性評估 |
| IPC 攻擊面 | 6/10 | 常數化已完成，但 IPC handler 數量龐大，仍需梳理 |
| Subprocess 安全 | 5/10 | ProcessService shell:true 命令注入風險 🔴 |
| API 金鑰儲存 | 4/10 | safeStorage 靜默 base64 fallback，無使用者通知 🔴 |
| 路徑穿越防護 | 6/10 | FileService 白名單已建立，但存在缺口 |
| XSS 防護 | 7/10 | DOMPurify 已到位，v-html 使用安全 |
| contextIsolation / nodeIntegration | 8/10 | 架構正確，sandbox:false 有技術原因文件支撐 |

---

## 執行摘要

第五次評審的安全問題（路徑白名單 CRIT-01、XSS CRIT-02、IPC 常數化）均已完整修正。本次評審將範圍擴展至 **Main Process 服務層**，首度發現三個高風險問題：ProcessService 的 shell injection 漏洞（已知但尚未記錄為資安問題）、ConfigService 的 API 金鑰以 base64 明文降級儲存、以及路徑白名單的三個缺口。

整體安全態勢從表面上看基礎穩固，但 Main Process 的安全防線比 Renderer 層薄弱。

---

## 已修正確認（第五次評估安全問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| CRIT-01 | FileService 路徑穿越漏洞 | ✅ validatePath() + setAllowedPaths() 完整覆蓋 8 個操作 |
| CRIT-02 | XSS 未防護（DOMPurify） | ✅ PreviewPane sanitizedContent 計算屬性，SearchPanel escapeHtml |
| IPC-CONST | 硬編碼 channel 字串 | ✅ 全面改用 IPC.XXX 常數，13 個字面量消除 |
| S5-01 | console.log 繞過 logger | ✅ 全面替換，ESLint no-console rule 防回歸 |

---

## 新發現問題

### S6-01 🔴 CVSS 6.8 — ProcessService `shell: true` 命令注入風險

**位置**: `src/main/services/ProcessService.ts:44`

**問題**:
```typescript
this.devServerProcess = spawn("npm", ["run", "dev"], {
  cwd: this.projectPath,
  shell: true,  // ← 允許 metacharacter 展開
  ...
})
```

`shell: true` 使 `spawn` 在 Shell 環境中執行，若 `this.projectPath` 含有 Shell metacharacter（如 `;`、`&&`、`|`）或 `PATH` 環境變數遭攻擊者竄改，可能執行任意命令。Electron 的 Main Process 持有完整 OS 權限，此風險不可低估。

**修正建議**:
```typescript
// ✅ 移除 shell: true，明確指定執行檔
import { execPath } from "process"

this.devServerProcess = spawn("pnpm", ["run", "dev"], {
  cwd: this.projectPath,
  shell: false,       // ← 明確關閉
  env: { ...process.env }
})
```

**附帶問題**: 硬編碼 `"npm"` 與專案實際使用 `pnpm` 不一致，在純 pnpm 環境可能執行失敗（→ 見 QUAL6-07）。

---

### S6-02 🔴 CVSS 7.1 — ConfigService safeStorage 靜默 base64 降級，API 金鑰以明文儲存

**位置**: `src/main/services/ConfigService.ts:108-111`

**問題**:
```typescript
if (safeStorage.isEncryptionAvailable()) {
  encryptedBuffer = safeStorage.encryptString(value)
} else {
  // 加密不可用時，以 base64 儲存（❌ 無使用者警告）
  encryptedBuffer = Buffer.from(btoa(value))
}
```

**安全影響**:
1. `base64` 是編碼而非加密，任何能讀取 config 檔案的程序均可輕易解碼（`atob()`）
2. 使用者不知道自己的 API 金鑰以明文儲存
3. Unix/macOS 上，設定檔預設權限 `0o644`（其他使用者可讀）

**修正建議**:
```typescript
if (!safeStorage.isEncryptionAvailable()) {
  // 通知使用者（IPC 發送警告）
  event.sender.send(IPC.SECURITY_WARNING, {
    code: "ENCRYPTION_UNAVAILABLE",
    message: "系統加密不可用，API 金鑰將無法安全儲存。請確認 OS keychain 服務已啟動。"
  })
  throw new Error("safeStorage unavailable — refusing to store key in plaintext")
}
```

**遷移注意事項**: 升級前需設計遷移路徑，避免現有 base64 KEY 的使用者升級後金鑰遺失。

---

### S6-03 🟠 CVSS 6.5 — 路徑白名單存在三個缺口

**位置**: `src/main/main.ts`（setAllowedPaths 呼叫）、`src/main/services/GitService.ts`、`src/main/services/FileWatchService.ts`

**問題**:

**缺口 A**：`imagesDir` 未加入白名單
```typescript
// main.ts — 只設定了 vaultPath 和 configPath，未包含 imagesDir
fileService.setAllowedPaths([config.vaultPath, configPath])
// ↑ ImageService 操作 imagesDir 時，若 imagesDir 超出 vaultPath，validatePath 失敗
```

**缺口 B**：GitService handler 接收任意 `repoPath`
```typescript
ipcMain.handle(IPC.GIT_COMMIT, async (_, repoPath: string, ...) => {
  return gitService.commit(repoPath, ...)  // ← repoPath 未呼叫 validatePath
})
```

**缺口 C**：`startWatching` 接收 renderer 傳入的 path，未驗證
```typescript
ipcMain.handle(IPC.FILE_WATCH_START, (_, watchPath: string) => {
  return fileWatchService.startWatching(watchPath)  // ← 未驗證
})
```

**修正建議**: 在各 IPC handler 入口加入 `fileService.validatePath(path)` 呼叫，或提取 `assertAllowedPath(path)` 工具函式集中管理。

---

### S6-04 🟠 — validatePath fail-open 設計：白名單空時允許所有路徑

**位置**: `src/main/services/FileService.ts`（validatePath 方法）

**問題**:
```typescript
private validatePath(targetPath: string): void {
  if (this.allowedBasePaths.length === 0) {
    return  // ← 白名單為空時：放行！
  }
  // ... 真正的驗證邏輯
}
```

**安全影響**: 若設定檔讀取失敗（Config Service 初始化異常），`setAllowedPaths` 從未被呼叫，導致所有路徑驗證靜默放行（fail-open）。攻擊者若能誘使設定讀取失敗，即可繞過路徑保護。

**修正建議**: 改為 fail-closed（白名單空時拒絕所有操作）:
```typescript
if (this.allowedBasePaths.length === 0) {
  throw new Error("FileService: 安全限制 — 允許路徑清單未初始化")
}
```

---

### S6-05 🟡 — `sandbox: false` BrowserWindow

**位置**: `src/main/main.ts:53`

**評估**: ESM preload 的技術需求迫使關閉 sandbox。`contextIsolation: true` + CSP 雙重保護降低了風險。原始碼旁有中文文件說明理由。**現況可接受，不列為 Bug。**

---

### S6-06 🟡 CVSS 4.3 — AI_SET_API_KEY provider 無 runtime 驗證

**位置**: `src/main/main.ts`（AI_SET_API_KEY handler）

**問題**:
```typescript
ipcMain.handle(IPC.AI_SET_API_KEY, async (_, provider: string, key: string) => {
  return configService.setApiKey(provider as "claude" | "gemini" | "openai", key)
  // ↑ as 只是 TypeScript 型別斷言，runtime 無效
})
```

**修正建議**:
```typescript
const VALID_PROVIDERS = ["claude", "gemini", "openai"] as const
if (!VALID_PROVIDERS.includes(provider as never)) {
  throw new Error(`Invalid provider: ${provider}`)
}
```

---

### S6-07 🟡 — ImageService sourcePath 來自 renderer，未受白名單保護

**位置**: `src/services/ImageService.ts`（copyImageToVault 呼叫路徑）

**評估**: `copyImageToVault` 的 `sourcePath` 最終透過 `IPC.FILE_COPY` 傳入 Main，FileService 的 `validatePath` 是最終防線，但 **Renderer → Main 的 IPC 入口處未做一次前置過濾**。中等風險，建議在 IPC handler 入口增加一次 `fileService.validatePath(sourcePath)` 呼叫。

---

### S6-08 🟢 — Dev 模式 CSP 允許 `unsafe-inline``

**位置**: `src/main/main.ts`（CSP 設定）

**評估**: 開發模式開放 `unsafe-inline` 以支援 Vite HMR。生產模式完全鎖定。設計正確，不列為問題。

---

## v-html 使用安全審查

| 位置 | 輸入 | 防護 | 評估 |
|------|------|------|------|
| `PreviewPane.vue` | markdown → HTML | DOMPurify.sanitize() | ✅ 安全 |
| `SearchPanel.vue` (標題) | article.title | escapeHtml() + mark 標籤 | ✅ 安全 |
| `SearchPanel.vue` (摘要) | article.matchSnippet | escapeHtml() + mark 標籤 | ✅ 安全 |

---

## 資安工程師結語

WriteFlow 的 Renderer 層安全已達良好水準（DOMPurify、IPC 常數、路徑白名單）。**本次評審揭示 Main Process 層的安全防線明顯薄弱**：ProcessService 以 `shell: true` 執行子進程、ConfigService 靜默降級為 base64 儲存 API 金鑰、路徑白名單三個缺口。建議下個 Sprint 以 `fix/config-safe-storage` 和 `fix/path-whitelist-gaps` 兩個 PR 系統性修復。

---

*第六次全面評估 — 資安 | 索引: [00-index.md](./00-index.md) | 前次: [第五次資安報告](../2026-03-01-fifth-review/01-security-report.md)*
