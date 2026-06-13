# WriteFlow 系統架構評估報告

**評估日期：** 2026-02-28
**評估者：** 🏛️ Diana（資深系統架構師，10+ 年 Electron/Desktop App 架構經驗）
**評估版本：** 現有程式碼庫

---

## 執行摘要

WriteFlow 展現了一個有工程素養的桌面應用架構——`IFileSystem` 抽象、三層自動儲存防抖、CSP 分離都是值得稱讚的設計決策。主要扣分在於 `articleStore` 的 SRP 違反、IPC 函式傳遞 bug、以及型別合約不一致。

**整體架構評分：72 / 100**（六個職能中最高）

---

## 一、現有架構圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RENDERER PROCESS                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      UI Layer (Vue 3)                        │   │
│  │  App.vue → ActivityBar / SideBarView / MainEditor            │   │
│  │            SettingsPanel / ToastContainer / ArticleManagement│   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │ useXxxStore()                                │
│  ┌────────────────────▼─────────────────────────────────────────┐   │
│  │               State Layer (Pinia Stores)                      │   │
│  │  articleStore ─────────── configStore ─────── serverStore    │   │
│  │  (HEAVY: file-watch,      (clean: config      (clean: dev    │   │
│  │   auto-save, CRUD,         load/save)          server ctrl)  │   │
│  │   migration, filter)                                         │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │ direct call / singleton                                │
│  ┌──────────▼────────────────────────────────────────────────---┐   │
│  │           Business Logic Layer (Renderer Services)            │   │
│  │  ArticleService ─ AutoSaveService ─ FileWatchService          │   │
│  │  MarkdownService ─ ObsidianSyntaxService ─ PreviewService     │   │
│  │  ImageService ─ BackupService ─ NotificationService           │   │
│  │  ElectronFileSystem (IFileSystem impl)                        │   │
│  └──────────────────────┬────────────────────────────────────---┘   │
│                         │ window.electronAPI (contextBridge)        │
└─────────────────────────┼───────────────────────────────────────────┘
                 IPC Bridge│(invoke / on)
┌─────────────────────────▼───────────────────────────────────────────┐
│                          MAIN PROCESS                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              IPC Orchestration Layer (main.ts)               │   │
│  │  ipcMain.handle('read-file', ...)                             │   │
│  │  ipcMain.handle('publish-article', ...)   ← ~40 個 handlers │   │
│  │  ipcMain.handle('git-add-commit-push', ...)                  │   │
│  └──────────────────────┬────────────────────────────────────---┘   │
│  ┌──────────────────────▼────────────────────────────────────---┐   │
│  │              Infrastructure Services (Main Services)          │   │
│  │  FileService ─ ConfigService ─ PublishService                │   │
│  │  GitService ─ ProcessService                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │ Node.js APIs                               │
│                    fs / chokidar / child_process                     │
└─────────────────────────────────────────────────────────────────────┘
```

**資料流向（Obsidian → Astro）：**

```
Obsidian Vault (.md)
  → FileService.readFile (IPC)
  → ArticleService.loadAllArticles (parse frontmatter)
  → articleStore.articles[] (reactive state)
  → Editor（使用者編輯）
  → autoSaveService.markAsModified() → performAutoSave()
  → ArticleService.saveArticle() → ElectronFileSystem.writeFile()
  → FileService.writeFile (IPC)
  → Obsidian Vault (.md 更新)
  → [手動觸發發布]
  → PublishService.publishArticle()
  → 語法轉換 (WikiLinks / 圖片 / Highlight)
  → Frontmatter 轉換 (date→pubDate)
  → 寫入 Astro blog/{slug}/index.md
```

---

## 二、各層評估

### 2.1 呈現層（UI Layer）

| 面向 | 評估 | 說明 |
|------|------|------|
| 元件責任切分 | ✅ 良好 | `App.vue` 僅作路由切換 |
| 響應式設計 | ✅ 良好 | Vue 3 Composition API，`ref`/`computed` 使用正確 |
| Props/Events | ✅ 良好 | 使用 `v-model`、`@emit` 的正規模式 |
| 直接操作 IPC | ⚠️ 警告 | `articleStore` 中有大量 `window.electronAPI` 直接呼叫 |
| 鍵盤可及性 | ⚠️ 部分 | `handleGlobalKeydown` 只處理了 Ctrl+B |

### 2.2 狀態層（Pinia Stores）

**`articleStore`（高風險）——職責清單（過多）：**
- 文章 CRUD
- 篩選/搜尋（computed）
- 檔案監聽管理（setupFileWatching）
- 自動儲存初始化（initializeAutoSave）
- Frontmatter 移轉邏輯（migrateArticleFrontmatter）
- 路徑解析（parseArticlePath）
- 衝突處理 + 通知發送

**`configStore`（✅ 優良）：** 職責單一清晰，環境偵測設計合理。

**`serverStore`（✅ 良好）：** 職責清晰，但日誌只保留後 100 筆，缺乏持久化。

### 2.3 服務層（Renderer Services）

| 服務 | 設計品質 | 問題 |
|------|----------|------|
| `ArticleService` | ✅ 優秀 | DI 設計、`IFileSystem` 抽象，可測試性高 |
| `AutoSaveService` | ✅ 優秀 | Debounce、Dirty-flag、三層檢測機制完整 |
| `FileWatchService` | ✅ 良好 | ignore-next-change 機制正確 |
| `useServices.ts` | ⚠️ 警告 | 手動 null-check 單例模式，脆弱 |

### 2.4 IPC 層（Main Process）

`main.ts` 直接在頂層函式中註冊了 **~40 個 IPC handlers**，無分組、無型別安全、無輸入驗證。

### 2.5 基礎設施層（Main Services）

| 服務 | 設計品質 |
|------|----------|
| `FileService` | ✅ 良好，chokidar 整合完整 |
| `PublishService` | ✅ 良好，錯誤分類機制（`classifyPublishError`）完整 |

---

## 三、關鍵問題清單

### 🔴 嚴重問題（Critical Bugs）

**問題 1：IPC 無法傳遞函式（publish-article 進度回調靜默失敗）**

```typescript
// ❌ IPC 序列化不支援函式型別，onProgress 永遠是 undefined
ipcMain.handle('publish-article', async (_, article: any, config: any, onProgress?: any) => {
  return await publishService.publishArticle(article, config, onProgress) // onProgress 永遠不會被呼叫
})
```

**修復：**

```typescript
// 使用 event.sender.send 取代 callback
ipcMain.handle('publish-article', async (event, article: any, config: any) => {
  return await publishService.publishArticle(article, config, (step, progress) => {
    event.sender.send('publish-progress', { step, progress })
  })
})
```

---

**問題 2：`FileService.getFileStats()` vs `IFileSystem` 型別不符**

```typescript
// FileService 回傳 mtime: string（ISO 格式）
async getFileStats(): Promise<{ isDirectory: boolean; mtime: string } | null>

// IFileSystem 介面定義 mtime: number（timestamp）
export interface FileStats {
  mtime: number  // ← 不一致！
}
```

---

**問題 3：`setTimeout` 初始化競速條件**

```typescript
// ❌ 脆弱：100ms 後才初始化，若 configStore 載入慢會出錯
setTimeout(() => {
  initializeAutoSave()
}, 100)
```

**修復：**

```typescript
watch(
  () => configStore.isConfigured,
  (configured) => {
    if (configured && !autoSaveService.isInitialized) {
      initializeAutoSave()
    }
  },
  { immediate: true }
)
```

---

### 🟡 架構問題（Architecture Issues）

**問題 4：`articleStore` 中直接呼叫 `window.electronAPI`**

```typescript
// articleStore.ts 中有多處直接呼叫，繞過了 ArticleService
await window.electronAPI.createDirectory(categoryPath)
await window.electronAPI.readFile(article.filePath)
```

**問題 5：IPC Channel 名稱為字串字面量，無型別安全**

```typescript
// main.ts 和 preload.ts 的字串必須手動保持同步
ipcMain.handle('read-file', ...)       // main.ts
ipcRenderer.invoke('read-file', ...)   // preload.ts
```

**問題 6：`EditorTheme` 型別不一致**

```typescript
// types/index.ts 定義為 EditorTheme enum
// configStore 初始值為 'light' string literal，非 EditorTheme.Light
```

---

### ✅ 架構優點

1. **`IFileSystem` 抽象介面** — DIP 實踐到位，`ArticleService` 可完全測試
2. **三層 Dirty-flag 自動儲存防 False Positive** — 設計縝密
3. **CSP 分離（開發/生產）** — 安全設計正確
4. **`PublishService.classifyPublishError()`** — 使用者友好的錯誤分類
5. **批次並行載入（`loadInBatches`，10 篇/批）** — 避免過載
6. **`fileWatchService.ignoreNextChange()`** — 優雅解決自寫觸發的誤報
7. **全離線設計** — 所有操作本地化，無雲端依賴（10/10 滿分）
8. **`beforeunload` 未儲存變更檢查** — UX 細節完整
9. **`resetServices()` 測試重置** — 測試友善設計

---

## 四、架構改善建議

### 建議 1：建立 IPC 型別安全層

```typescript
// src/shared/ipc-channels.ts（新增共享模組）
export const IpcChannels = {
  READ_FILE: 'read-file',
  WRITE_FILE: 'write-file',
  PUBLISH_ARTICLE: 'publish-article',
  PUBLISH_PROGRESS: 'publish-progress',
} as const

export type IpcChannel = typeof IpcChannels[keyof typeof IpcChannels]
```

### 建議 2：拆分 `articleStore`

```
articleStore (現在) ──拆分為──→
  ├── articleStore       (CRUD 操作、選擇、篩選)
  ├── fileWatchStore     (檔案監聽協調)
  └── autoSaveStore      (自動儲存狀態)
```

### 建議 3：消除 `articleStore` 中的直接 IPC 呼叫

```typescript
// 改為：透過 ArticleService
const reloadedData = await articleService.readArticle(article.filePath)
```

### 建議 4：統一單例模式

```typescript
// 目前混用兩種：
export const autoSaveService = new AutoSaveService() // module-level（要移除）
export function usePreviewService() { ... }          // composable（保留）
// 建議全面改為 composable 模式
```

---

## 五、整體架構評分

| 評估維度 | 分數（/10） | 說明 |
|----------|-------------|------|
| Main/Renderer 程序邊界 | 7 | 結構正確，但 IPC 函式傳遞 bug 嚴重 |
| 分層架構清晰度 | 6 | `articleStore` 職責過重破壞分層 |
| 狀態管理設計 | 6 | `configStore`/`serverStore` 良好，`articleStore` 需重構 |
| 服務層設計 | 8 | `ArticleService` DI 設計優秀，`IFileSystem` 抽象到位 |
| 事件架構 | 7 | file-watch 事件流清晰，但缺乏統一事件匯流排 |
| 錯誤處理策略 | 7 | 錯誤分類完整，但部分 store action 只有 console.error |
| 可測試性 | 7 | `resetServices()` 和 DI 設計好，但 singleton export 降低分 |
| 可擴展性 | 6 | 加功能需改 main.ts + preload.ts + store，三處同步 |
| 資料流清晰度 | 8 | Obsidian → Astro 流程可追蹤，轉換邏輯集中 |
| 離線能力 | 10 | 全本地，無雲端依賴，離線優先設計完美 |

**整體評分：72 / 100**

---

## 六、改善路線圖

### 短期（1-2 週，Quick Wins）

| 優先 | 任務 | 影響 |
|------|------|------|
| P0 | 修復 `publish-article` IPC 函式傳遞 bug | 恢復發布進度功能 |
| P0 | 統一 `FileStats.mtime` 型別（number vs string） | 消除隱性型別錯誤 |
| P1 | 建立 `src/shared/ipc-channels.ts` 常數檔 | 降低 IPC typo 風險 |
| P1 | 修復 `EditorTheme` enum 初始值 | 型別一致性 |
| P1 | 用 `watch` 替代 `setTimeout` 初始化 | 消除競速條件 |

### 中期（1 個月，Architecture Debt Reduction）

| 優先 | 任務 | 影響 |
|------|------|------|
| P1 | 將 `parseArticlePath` 移入 `ArticleService` | 商業邏輯集中 |
| P1 | 消除 `articleStore` 中的直接 `window.electronAPI` 呼叫 | 層次隔離 |
| P2 | 拆分 `articleStore`：CRUD / FileWatch / AutoSave | SRP 合規 |
| P2 | 統一單例模式（選擇 composable 或 Pinia） | 一致性 |
| P2 | 為所有 IPC handlers 抽取 `IpcHandler` 抽象 | 可測試性 |

### 長期（季度，Future-Proofing）

| 優先 | 任務 | 影響 |
|------|------|------|
| P2 | 導入事件匯流排（mitt）統一跨服務通訊 | 解耦服務間直接依賴 |
| P3 | 考慮將 PublishService 的轉換邏輯移至 Renderer 端 | 可即時預覽轉換結果 |
| P3 | BackupService 加入自動清除過期備份機制 | 避免磁碟空間無限增長 |

---

*建議優先處理 P0 問題（IPC bug + 型別不一致），這兩個問題可能在使用者實際操作發布功能時造成靜默失敗。*
