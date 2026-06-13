# Fix: QUAL6-01 + QUAL6-07 — ProcessService 硬編碼問題

**日期**: 2026-03-01
**嚴重性**: 🔴 P0
**問題 ID**: QUAL6-01, QUAL6-07
**影響版本**: 所有版本

---

## 問題一：QUAL6-01 — 硬編碼 IPC channel 字串

### 問題描述

`ProcessService.sendLogToRenderer()` 直接使用字串字面量 `"server-log"` 發送 IPC 事件，而非使用 `ipc-channels.ts` 中已定義的 `IPC.EVENT_SERVER_LOG` 常數。
若 channel 名稱將來修改，此處不會被 TypeScript 發現（靜默的通訊失敗）。

### 根因

```typescript
// ❌ 之前：硬編碼字串
win.webContents.send("server-log", { ... })
```

### 解決方案

引入 `IPC` 物件，改用常數替換所有硬編碼字串：

```typescript
// ✅ 之後
import { IPC } from "../ipc-channels.js"
win.webContents.send(IPC.EVENT_SERVER_LOG, { ... })
```

---

## 問題二：QUAL6-07 — 硬編碼 npm（應為 pnpm）

### 問題描述

`startDevServer()` 使用 `spawn("npm", ["run", "dev"])` 啟動開發伺服器，但此專案的套件管理工具是 `pnpm`。在 pnpm workspace 環境中執行 `npm run dev` 可能找不到 scripts 或讀取到錯誤的 `node_modules`。

### 根因

```typescript
// ❌ 之前：錯誤的套件管理工具
this.devServerProcess = spawn("npm", ["run", "dev"], { ... })
```

### 解決方案

```typescript
// ✅ 之後
this.devServerProcess = spawn("pnpm", ["run", "dev"], { ... })
```

## 修改檔案

| 檔案 | 變更 |
|------|------|
| `src/main/services/ProcessService.ts` | 引入 `IPC`，替換 `"server-log"` 和 `"npm"` |
