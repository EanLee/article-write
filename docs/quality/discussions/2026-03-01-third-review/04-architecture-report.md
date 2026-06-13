# 架構評估報告 — 第三次全面評估

**審查者**: 系統架構師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦整體系統架構、IPC 設計、層次分離、可擴展性

---

## 執行摘要

WriteFlow 採用 Electron + Vue 3 + Pinia 的現代架構，第二次 review 後分層清晰度顯著改善。本次評估發現架構整體健康，但存在三個設計上的張力點：**雙 services 目錄的模糊邊界**、**IPC 頻道管理的不一致**、**單一 watchCallback 的擴展限制**。

---

## 系統架構圖（當前狀態）

```
┌─────────────────────────────────────────────────────┐
│                  Renderer Process                     │
│  ┌──────────┐  ┌──────────────────────────────────┐ │
│  │  Vue 3   │  │           Pinia Stores            │ │
│  │Components│◄►│  article  config  seo  aiPanel   │ │
│  └────┬─────┘  └──────────────┬───────────────────┘ │
│       │                       │                       │
│  ┌────▼─────────────────────────────────────────┐   │
│  │          src/services/ (業務邏輯層)            │   │
│  │  ArticleService  AutoSaveService  BackupService│   │
│  │  MarkdownService  SearchService  ImageService  │   │
│  └────────────────────┬─────────────────────────┘   │
│                        │ electronAPI (IPC)            │
└────────────────────────┼─────────────────────────────┘
                         │ contextBridge
┌────────────────────────▼─────────────────────────────┐
│                   Main Process                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │         src/main/services/ (系統服務層)           │ │
│  │  FileService  ConfigService  PublishService      │ │
│  │  GitService   AIService      SearchService       │ │
│  │  ProcessService                                  │ │
│  └─────────────────────────────────────────────────┘ │
│  main.ts: IPC handler 路由層                          │
└──────────────────────────────────────────────────────┘
```

---

## 架構優勢

### A-GOOD-01 ✅ Electron 安全三角形完整

- `contextIsolation: true` — 渲染器與 Node 隔離
- `nodeIntegration: false` — 渲染器無直接 Node 存取
- `sandbox: false` — preload 需要，配合 ESM 使用
- contextBridge 明確定義 API 表面，最小暴露原則

### A-GOOD-02 ✅ 雙 services 層職責分明（設計意圖）

- `src/services/` — 渲染器業務邏輯（可在 preact/electron-free 環境測試）
- `src/main/services/` — 主進程系統服務（需 Node.js，IPC 提供介面）
- IPC 作為明確邊界，防止交叉 import

### A-GOOD-03 ✅ IPC 頻道集中定義

`src/main/ipc-channels.ts` 集中管理頻道名稱常數，避免魔法字串散落。

### A-GOOD-04 ✅ SearchService 雙側設計正確

- Main Process 的 `SearchService` 持有索引（檔案系統存取需求）
- Renderer 的 `useSearchStore` 透過 IPC 查詢
- 避免了索引在渲染器端複製的記憶體浪費

---

## 架構問題

### A-01 🟡 IPC 頻道管理不一致

**位置**: `src/main/main.ts:175-185`

```typescript
// 部份使用 IPC 常數
ipcMain.handle(IPC.SEARCH_BUILD_INDEX, ...);

// 部份使用字面字串
ipcMain.handle("start-file-watching", ...);  // ← 不一致！
ipcMain.handle("stop-file-watching", ...);
ipcMain.handle("is-file-watching", ...);
```

`start-file-watching`、`stop-file-watching`、`is-file-watching` 在 `ipc-channels.ts` 中是否有對應常數？若無，需補充；若有，則 `main.ts` 遺漏了引用。

**影響**: 字面字串拼寫錯誤不會在編譯期報錯，只會在執行期沉默失敗。

**修正**:
```typescript
// ipc-channels.ts
START_FILE_WATCHING: "start-file-watching",
STOP_FILE_WATCHING: "stop-file-watching",
IS_FILE_WATCHING: "is-file-watching",

// main.ts
ipcMain.handle(IPC.START_FILE_WATCHING, ...);
```

---

### A-02 🟡 單一 `watchCallback` 設計限制

**位置**: `src/main/services/FileService.ts`

```typescript
private watchCallback: ((event: string, filePath: string) => void) | null = null;

startWatching(watchPath: string, callback: ...) {
  this.watchCallback = callback; // 覆蓋前一個！
}
```

架構上 `main.ts` 在 `start-file-watching` handler 中設定回呼。目前只有一個使用者（main.ts），但若未來需要多個消費者監聽檔案變更（例如：實時預覽、搜尋索引更新），單一 callback 設計成為瓶頸。

`main.ts` 已在單個 callback 內手動路由到不同目的地（`searchService.updateFile()`、`mainWindow.webContents.send()`），這是合成器模式的手動實作，可以上移為架構層正式支援。

**建議（長期）**:
```typescript
// 發布-訂閱模式
private watchCallbacks: Set<(event: string, path: string) => void> = new Set();

addWatchCallback(cb: (event: string, path: string) => void): () => void {
  this.watchCallbacks.add(cb);
  return () => this.watchCallbacks.delete(cb); // 返回取消函數
}
```

---

### A-03 🟠 `article.ts` store 承擔過多基礎設施職責

**位置**: `src/stores/article.ts`

Store 層（狀態管理）不應負責：
- 檔案監聽訂閱（`setupFileWatching`）
- 自動儲存生命週期（`initializeAutoSave`）
- 路徑解析（`parseArticlePath`）
- 前言遷移（`migrateArticleFrontmatter`）

這些應屬於 service 層或 composable 層，與架構分層原則衝突。

**理想分層應為**:
```
components → stores（純狀態）← services（業務邏輯）← main/services（系統服務）
```

**現實狀態**:
```
components → stores（狀態 + 基礎設施 + 邏輯混合）← services
```

---

### A-04 🟢 `hardcode depth: 3` 在檔案監聽

**位置**: `src/main/services/FileService.ts:startWatching()`

```typescript
startWatching(watchPath: string, callback: ...) {
  this.watcher = chokidar.watch(watchPath, {
    depth: 3, // ← hardcode
    ignored: /(^|[\/\\])\../,
  });
}
```

Vault 結構假設最多 3 層深度（Category/Year/file.md）。若使用者有更深的巢狀結構，監聽將靜默失效。

**建議**: 從 ConfigService 讀取最大深度設定，或設為可選參數。

---

## 架構健康評分

| 向度 | 評分 | 說明 |
|------|------|------|
| 程序隔離 | 10/10 | contextIsolation 完整 |
| 層次分離 | 7/10 | store 過重，含基礎設施邏輯 |
| IPC 設計 | 7/10 | 部份使用字面字串 |
| 可測試性 | 8/10 | DI 完整，store 直接依賴 window 稍弱 |
| 可擴展性 | 7/10 | 單一 watchCallback 限制 |
| 安全邊界 | 9/10 | 白名單 + contextBridge |

---

## 整體架構評估

WriteFlow 的 Electron + Vue 3 架構是健康的現代設計，第二次 review 後的 Refactor 工作已大幅改善分層清晰度。剩餘問題主要是「store 吸收了過多的基礎設施職責」這個幾乎所有 Pinia 應用都會面對的張力。

建議路徑：短期修正 IPC 字面字串（低風險高收益），中期評估從 article store 拆出 `useFileWatching` composable 以分散職責。

---

*架構評估結束 ｜ 下一份: [程式品質報告](./05-code-quality-report.md)*
