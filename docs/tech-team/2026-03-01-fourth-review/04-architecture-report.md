# 架構評估報告 — 第四次全面評估

**審查者**: 系統架構師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦 IPC 架構、型別一致性、模組邊界

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **架構總分** | **7.5 / 10** | IPC 架構大幅改善，但型別一致性問題影響系統穩定性 |
| IPC 設計 | 9/10 | ipc-channels.ts 常數化，preload/main 完全對齊 |
| 型別一致性 | 6/10 | AppConfig 雙重來源造成 TS 錯誤；mtime 型別不一致 |
| 模組邊界 | 8/10 | main/renderer 邊界清晰，composable 分層良好 |
| 安全架構 | 8.5/10 | Zod 驗證 + 路徑白名單，縱深防禦架構健全 |
| 可測試性 | 8.5/10 | DI 模式完整，service 易於 mock |

---

## 執行摘要

第三次評估的架構問題 A-01（IPC 字面字串）與 A-02（watchCallback 單一訂閱者）均已完全修正，且成果品質超預期：`ipc-channels.ts` 覆蓋 60+ channels，preload.ts 完整使用 IPC 常數，消除了所有字串拼錯風險。

本次發現 **1 個高優先架構問題**（型別來源混亂導致 TS 錯誤）與 **2 個中等警告**。

---

## 已修正確認（第三次評估架構問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| A-01 | IPC handler 使用字面字串 | ✅ ipc-channels.ts 統一常數，main + preload 全面改用 |
| A-02 | FileService 單一 watchCallback 限制 | ✅ Set<Function> pub-sub，addWatchListener() 回傳 unsubscribe |

---

## IPC 架構深度驗證

### A-01 驗證：ipc-channels.ts 完整性分析

```typescript
// ipc-channels.ts 覆蓋分組：
// ── File ──────── 7 channels (read/write/delete/copy/dir/stats/watch)
// ── Config ─────── 4 channels (get/set/validateDir/validateBlog)
// ── Publish ─────── 2 channels (publish/syncAll)
// ── Dev Server ───── 3 channels
// ── Git ──────────── 6 channels
// ── UI ─────────── 1 channel (selectDirectory)
// ── Search ─────── 2 channels
// ── Auto-Update ── 1 channel
// ── AI ──────────── 4 channels
// ── Push Events ── 6 events (file-change/progress/server-log/update)
```

**評估**: 覆蓋率完整，分組清晰。`as const` 確保字面型別，`IpcChannel` 聯集型別可用於需要明確型別的參數。**A-01 架構問題已徹底解決。**

### A-02 驗證：pub-sub 架構分析

```
FileService
├── watchCallbacks: Set<(event, path) => void>
├── addWatchListener(cb) → () => void  ← 正確的訂閱/退訂模式
├── startWatching(path, cb) → 加入 callback 並啟動 watcher
└── notifyAll(event, path) → 迭代所有 callbacks

main.ts ─── startWatching(path, searchIndexUpdateCallback)
article.ts ─ addWatchListener(fileChangeEventCallback) [透過 useFileWatching]
```

**評估**: pub-sub 架構設計正確，支援多訂閱者。但見 SOLID4-02：`startWatching` 呼叫 `stopWatching` 清空現有 callbacks，若多訂閱者且 `startWatching` 被再次呼叫，會清除已有訂閱。目前安全（只有一個呼叫點），但架構上應修正。

---

## 新發現問題

### A4-01 🟠 AppConfig 型別雙來源 — 高優先架構問題

**問題層次**: 整個型別系統（影響 renderer/main/store 三層）

**架構圖**:
```
types/index.ts
  └─ AppConfig { editorConfig.theme: EditorTheme }      ← renderer 使用
          ↓ import
     electron.d.ts: getConfig() → AppConfig             ← API 型別宣告
     stores/config.ts: AppConfig                        ← TS 錯誤！

main/schemas/config.schema.ts
  └─ AppConfigSchema → z.infer → AppConfig              ← main process 使用
     { editorConfig.theme: "light" | "dark" }           ← 型別不同！
```

**具體 TS 錯誤**:
```
src/stores/config.ts: Type 'AppConfigShape' is not assignable to type 'AppConfig'
  The types of 'editorConfig.theme' are incompatible
  Type '"light" | "dark"' is not assignable to type 'EditorTheme'
```

**根因**: Zod schema 中 `z.enum(["light", "dark"])` 產生 `"light" | "dark"` 字面型別聯集，但 `types/index.ts` 的 `EditorTheme` 定義不明（可能是另一個型別別名或 enum）。

**修正優先度**: 🔴 高（已造成 TypeScript 編譯錯誤，影響型別安全性）

**修正方案**:
```typescript
// types/index.ts - 修正 EditorTheme 為字面型別聯集
export type EditorTheme = "light" | "dark"  // 與 Zod schema 一致

// 或：讓 types/index.ts 從 Zod schema 匯入
import type { AppConfig as ZodAppConfig } from "@/main/schemas/config.schema"
export type AppConfig = ZodAppConfig
```

---

### A4-02 🟡 electron.d.ts `getFileStats` 回傳型別不一致 — 中等

**位置**:
```typescript
// electron.d.ts 宣告：
getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: string } | null>
//                                                                       ^^^^^^ string

// FileService.ts 實際回傳：
async getFileStats(...): Promise<{ isDirectory: boolean; mtime: number } | null>
//                                                                ^^^^^^ number (毫秒時間戳)
```

**影響**: renderer 層使用 `mtime` 時預期 `string`（可能當作日期字串格式化），但實際收到 `number`（milliseconds）。任何格式化操作如 `new Date(mtime.split('T')[0])` 會在 runtime 靜默失敗。

**修正方案**: 統一型別，BuildType 為 `number`（milliseconds），更新 `electron.d.ts`：
```typescript
getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: number } | null>
```

---

### A4-03 🟢 preload.ts 缺少 `publishArticle` 的 Git 操作類型 — 低優先

**位置**: `src/main/preload.ts` 未暴露 `onSyncProgress` 以外的進度回調。

**現況**: `publishArticle` 的 progress callback 設計在 main.ts 中接受 `onProgress?: PublishProgressCallback`，但 preload.ts 的 `publishArticle(article: unknown, config: unknown)` 介面未暴露此參數。

**影響**: 發布進度回調功能未能通過 IPC 正確傳遞，可能影響 UI 進度更新。

---

## 系統架構整體健康度

```
┌─────────────────────────────────────────────────────────┐
│                    WriteFlow 架構                        │
│                                                         │
│  Renderer (Vue 3)        Preload           Main          │
│  ┌──────────────┐    ┌──────────┐    ┌──────────────┐   │
│  │ Pinia Stores │    │ IPC.xxx  │    │ ipcMain      │   │
│  │ (article,    │◄──►│ (常數)   │◄──►│ handlers     │   │
│  │  config,     │    │ Type:    │    │ FileService  │   │
│  │  seo, search)│    │ unknown  │    │ ConfigService│   │
│  └──────────────┘    │ ⚠️ 需改  │    │ (Zod驗證)    │   │
│  ┌──────────────┐    └──────────┘    └──────────────┘   │
│  │ Components   │         ↑                              │
│  │ (Vue SFC)    │    [A-01 ✅ 常數]                      │
│  └──────────────┘         ↑                              │
│                    [A4-01 ⚠️ AppConfig 型別衝突]          │
└─────────────────────────────────────────────────────────┘
```

---

## 系統架構師結語

IPC 層的 `ipc-channels.ts` 改造是本輪最成功的架構改善——它不只消除了拼錯風險，也讓整個 main/renderer 通訊有了清晰的「合約文件」。然而 **A4-01 AppConfig 型別分裂**是目前最緊迫的架構問題，因為它已造成 TypeScript 編譯錯誤。修正代價低（統一 `EditorTheme` 型別），建議立即修正。

**安全架構層面**，Zod 驗證 + 路徑白名單的縱深防禦設計是值得肯定的架構決策，主動保護了 renderer → main 的信任邊界。

---

*第四次全面評估 — 架構 | 前次: [第三次評估](../2026-03-01-third-review/04-architecture-report.md)*
