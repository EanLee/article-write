# 資安評估報告 — 第三次全面評估

**審查者**: 資安工程師 Agent  
**日期**: 2026-03-01  
**評估範圍**: WriteFlow v0.1.0，聚焦 Electron IPC、檔案系統、路徑驗證、錯誤洩漏

---

## 執行摘要

本次第三次評估較第二次（2026-03-01 second-review）進步顯著：Fix-05 已修正主要的錯誤鏈喪失問題，DOMPurify 防護完整存在於渲染層。然而仍發現 **3 個中高風險問題** 與 **4 個低風險問題**，主要集中在 FileService 的部份迴歸與 IPC 型別安全。

---

## 嚴重度矩陣

| # | 問題 | 檔案 | 嚴重度 | 狀態 |
|---|------|------|--------|------|
| S-01 | `getFileStats()` 未驗證路徑 | `FileService.ts` | 🟠 中高 | ❌ 新發現 |
| S-02 | `writeFile()`/`copyFile()` 未傳 `{ cause: err }` | `FileService.ts` | 🟡 中 | ❌ 迴歸 |
| S-03 | 白名單初始化前的視窗期 | `main.ts` + `FileService.ts` | 🟡 中 | ⚠️ 已知設計 |
| S-04 | `setConfig` IPC handler 接受 `any` 型別 | `main.ts:146` | 🟡 中 | ❌ 新發現 |
| S-05 | `searchService.updateFile().catch(() => {})` 靜默吞咽 | `main.ts:185` | 🟢 低 | ❌ 新發現 |
| S-06 | `preload.ts` 暴露 `publishArticle(article: any)` | `preload.ts:24` | 🟢 低 | ⚠️ 已知 |
| S-07 | CSP `unsafe-inline` 在開發模式中存在 | `main.ts:63` | 🟢 低 | ⚠️ 設計決策 |

---

## 詳細分析

### S-01 🟠 `getFileStats()` 未驗證路徑 — 中高風險

**位置**: `src/main/services/FileService.ts`

```typescript
// 現有程式碼（問題）
async getFileStats(filePath: string): Promise<{ isDirectory: boolean; mtime?: Date } | null> {
  try {
    const stats = await fs.stat(filePath); // ← 未呼叫 validatePath()!
    return {
      isDirectory: stats.isDirectory(),
      mtime: stats.mtime,
    };
  } catch {
    return null;
  }
}
```

**風險**: 攻擊者若能控制 `filePath` 輸入（例如透過受損的語音 IPC），可探測任意路徑是否存在（路徑枚舉攻擊），洩漏系統目錄結構。`stat()` 不讀取內容，但 `stats.mtime` 可用於旁路攻擊（timing oracle）。

相較之下，`readFile()`、`writeFile()`、`deleteFile()` 都有呼叫 `validatePath()`，獨缺 `getFileStats()`。

**修正方案**:
```typescript
async getFileStats(filePath: string): Promise<{ isDirectory: boolean; mtime?: Date } | null> {
  await this.validatePath(filePath); // 加入驗證
  try {
    const stats = await fs.stat(filePath);
    return { isDirectory: stats.isDirectory(), mtime: stats.mtime };
  } catch {
    return null;
  }
}
```

---

### S-02 🟡 `writeFile()`/`copyFile()` 未傳 `{ cause }` — 中風險（Fix-05 迴歸）

**位置**: `src/main/services/FileService.ts`

**問題**: Fix-05 已修正 `readFile()`、`deleteFile()` 等方法的錯誤鏈，但 `writeFile()` 和 `copyFile()` 仍遺漏 `{ cause: err }`：

```typescript
// writeFile() catch 區塊（問題）
} catch (err) {
  const reason = err instanceof Error ? err.message : String(err);
  throw new Error(`Failed to write file ${filePath}: ${reason}`);
  // ↑ 缺少 cause: err，錯誤堆疊資訊喪失
}
```

**影響**: 除錯困難，底層系統錯誤（如 EACCES、ENOSPC）的堆疊追蹤喪失。在 Sentry 中只能看到包裝過的訊息，無法追蹤原始原因。

**修正方案**:
```typescript
throw new Error(`Failed to write file ${filePath}: ${reason}`, { cause: err });
```

---

### S-03 🟡 白名單初始化前視窗期 — 設計風險

**位置**: `src/main/main.ts:121-126`

```typescript
try {
  const initialConfig = await configService.getConfig();
  fileService.setAllowedPaths([initialConfig?.paths?.articlesDir, ...]);
} catch {
  // 設定尚未建立時允許不設定（白名單將為空陣列，不限制存取）
}
```

`validatePath()` 在 `allowedBasePaths.length === 0` 時直接 pass（跳過驗證）。如果首次啟動或設定損壞，IPC handlers 在 `setAllowedPaths` 被呼叫之前就已可用。

**評估**: 此問題在第二次評估已記錄。設計意圖是允許首次設定。  
**緩解**: Electron 的 contextIsolation + sandbox=false 已提供 IPC 層面的基本保護；首次啟動情境中能控制 filePath 的攻擊面有限。  
**建議**: 考慮在初始化完成前對 `READ_FILE`/`WRITE_FILE` 等危險操作返回拒絕（保留 `GET_CONFIG`/`SET_CONFIG` 例外）。

---

### S-04 🟡 `setConfig` handler 接受 `any` 型別 — 中風險

**位置**: `src/main/main.ts:146`

```typescript
ipcMain.handle(IPC.SET_CONFIG, async (_, config: any) => {
  await configService.setConfig(config);
  fileService.setAllowedPaths([config?.paths?.articlesDir, config?.paths?.targetBlog]);
});
```

`config` 為 `any`，沒有 schema 驗證。惡意設定物件可能注入非預期的 `paths` 值以修改白名單，或傳入超大型物件造成記憶體壓力。

**建議**:
```typescript
import type { AppConfig } from "../types/index.js";
// + Zod 或手動驗證 paths 欄位為絕對路徑字串
ipcMain.handle(IPC.SET_CONFIG, async (_, config: AppConfig) => {
  validateConfig(config); // 明確驗證
  ...
});
```

---

### S-05 🟢 `searchService.updateFile().catch(() => {})` — 低風險

**位置**: `src/main/main.ts:185`

```typescript
searchService.updateFile(filePath).catch(() => {}); // 靜默吞咽
```

搜尋索引更新失敗無任何 log，操作人員無法察覺索引漸漸失準。

**建議**:
```typescript
searchService.updateFile(filePath).catch((err) => {
  console.error("[SearchService] 增量索引更新失敗:", err);
});
```

---

### S-06 🟢 `preload.ts` 暴露 `publishArticle(article: any)` — 設計限制

**位置**: `src/main/preload.ts:24`

contextBridge 中 `publishArticle` 和 `syncAllPublished` handler 接受的 `article: any` / `config: any` 沒有型別保護。由於 contextBridge 不支援傳遞 TypeScript 型別，這是 Electron 架構的固有限制。

**緩解**: 在 `publishService.publishArticle()` 內部實施完整的輸入驗證（article 欄位 null check），目前已有部份防護。

---

### S-07 🟢 開發模式 CSP `unsafe-inline` — 設計決策

**位置**: `src/main/main.ts:63-78`

開發模式需要 `unsafe-inline` 以支援 Vite HMR；生產模式已移除。此為標準開發做法，風險僅在開發環境，可接受。

---

## 正面發現（強化安全性的設計）

| 設計決策 | 描述 |
|---------|------|
| ✅ `contextIsolation: true` | 阻止渲染器直接存取 Node.js |
| ✅ `nodeIntegration: false` | 渲染器無直接 Node.js 存取 |
| ✅ DOMPurify 在 PreviewPane | XSS 防護正確位置（html:true + DOMPurify 而非 html:false）|
| ✅ 路徑穿越防護 (`validatePath`) | 大部份 FileService 方法都有白名單驗證 |
| ✅ Sentry 監控 | 啟動即初始化，捕捉早期錯誤 |
| ✅ 生產 CSP 嚴格 | script-src 'self' only |
| ✅ `{ cause: err }` 錯誤鏈 | 大部份方法（Fix-05 成果）|

---

## 優先修正清單

1. **立即** (S-01): 在 `getFileStats()` 加入 `validatePath()` 呼叫
2. **本 Sprint** (S-02): 修正 `writeFile()`/`copyFile()` 加入 `{ cause: err }`
3. **下 Sprint** (S-04): 為 `setConfig` IPC 加入 Zod schema 驗證
4. **Backlog** (S-05): `searchService.updateFile()` catch 加入 log

---

*資安評估結束 ｜ 下一份: [效能/O(n) 報告](./02-performance-report.md)*
