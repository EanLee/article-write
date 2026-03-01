# 軟體架構評估報告 — 第六次全面評估

**審查者**: 資深架構師 Agent  
**日期**: 2026-03-01  
**評估範圍**: WriteFlow v0.1.0，基準 commit `e9b525a`

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **架構總分** | **6.2 / 10** | 架構整體健全，有明確但可控的改善空間 |
| 分層架構清晰度 | 6/10 | Renderer → Service → IPC → Main 層次存在，但邊界有局部滲漏 |
| IPC 設計合理性 | 7/10 | 常數化完成，結構良好，但暴露層次偏低（含低階 FS 原語） |
| 可測試性 | 5/10 | Store 層直呼 window.electronAPI，脫離 DOM 的獨立測試困難 |
| 依賴管理 | 6/10 | ArticleService 優秀，但 Store 層依賴方向局部混亂 |
| 錯誤邊界設計 | 6/10 | 隱性 fire-and-forget 非同步副作用未被封裝 |
| 可觀測性 | 7/10 | Sentry 基礎完善，IPC 跨進程 correlation 尚缺 |

---

## 執行摘要

WriteFlow 的整體架構骨架正確：Main Process / Preload / Renderer 三層分離、contextIsolation 啟用、IPC channel 常數化、路徑白名單防護。但在骨架內部存在幾個會隨業務成長而惡化的結構性問題：最嚴重的是 **Store 層的雙重依賴路徑**（A6-01），它不只是設計問題，已造成可量測的資料一致性 Bug；其次是 **Main Process 的 IPC God Function**（A6-02），平鋪 150 行的 `app.whenReady()` callback 是架構熵的溫床。

---

## 架構現況圖

```
┌─────────────────────────────────────────────────────────────────┐
│  Main Process  (Node.js / Electron)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ main.ts — app.whenReady() callback (~150 行，全平鋪）    │   │
│  │  ├─ FileService      (路徑白名單、讀寫刪移)              │   │
│  │  ├─ ConfigService    (Zod 驗證)                          │   │
│  │  ├─ PublishService   (組裝，依賴 FileService)            │   │
│  │  ├─ GitService                                           │   │
│  │  ├─ SearchService                                        │   │
│  │  └─ AIService        (依賴 ConfigService)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                    ▲ 安全邊界：contextIsolation = true          │
├─────────────────────────────────────────────────────────────────┤
│  Preload  (contextBridge)                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ electronAPI — 混合低階 FS 原語 + 業務域操作               │ │
│  │  低階：readFile / writeFile / deleteFile (可被繞過業務邏輯)│ │
│  │  業務：publishArticle / gitCommit                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             ▼                                   │
├─────────────────────────────────────────────────────────────────┤
│  Renderer Process  (Vue 3 + Pinia)                              │
│  ┌─────────────────┐   ┌──────────────────────────────────────┐ │
│  │  Components     │   │  article.ts Store              🔴   │ │
│  │  (UI 展示層)    │──▶│  路徑 A: 直呼 window.electronAPI    │ │
│  └─────────────────┘   │  路徑 B: 透過 ArticleService        │ │
│                         │  → 兩套依賴路徑並存                │ │
│                         └──────────────────────────────────────┘ │
│                                      │                          │
│                         ┌────────────▼────────────┐            │
│                         │  ArticleService  ✅       │            │
│                         │  DI / IFileSystem / 結構化回傳       │ │
│                         └─────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 新發現問題

### A6-01 🔴 HIGH — Store 層雙重依賴路徑，造成靜默資料不一致

**位置**: `src/stores/article.ts`（createArticle 第 227 行、reloadArticle 第 375 行）

**問題**: 

`createArticle()` 直呼 `window.electronAPI.createDirectory()`，未透過 `ArticleService`。  
`reloadArticle()` 直呼 `window.electronAPI.readFile()` + `getFileStats()`，並自行執行 Markdown 解析，**跳過** `ArticleService.loadArticle()` 中的分類解析和 ID 標準化：

```typescript
// ❌ reloadArticle 的「平行宇宙」實作
const content = await window.electronAPI.readFile(article.filePath)
const { frontmatter } = markdownService.parseMarkdown(content)
// ↑ 缺少 parseArticlePath 的分類推斷、缺少 ID 正規化

// ✅ 應統一委派
const reloaded = await articleService.loadArticle(article.filePath, article.category)
```

**實際危害**: `reloadArticle()` 後的文章物件格式和 `loadAllArticles()` 的不同，若後端多次修改分類解析邏輯，只有 `ArticleService` 維護點被更新，`reloadArticle` 永遠使用舊邏輯。

**修正工時估計**: 2 小時（統一委派 + 測試）

---

### A6-02 🟠 MEDIUM — main.ts IPC 登錄為單一巨型 God Function

**位置**: `src/main/main.ts`（app.whenReady callback，第 118 行起，~150 行）

**問題**: 所有 IPC handler（FileService × 7、ConfigService × 4、PublishService × 2、ProcessService × 3、GitService × 6、SearchService × 2、AIService × 4、AutoUpdate × 1）平鋪在同一個 async callback 中：

```typescript
app.whenReady().then(async () => {
  // 150 行，全部 domain 混在一起
  ipcMain.handle(IPC.FILE_READ, ...)   // FileService
  ipcMain.handle(IPC.GIT_COMMIT, ...) // GitService
  ipcMain.handle(IPC.AI_GENERATE, ...) // AIService
  // ...
})
```

**修正建議**:
```typescript
// 按 domain 拆分獨立函式
function registerFileHandlers(ipcMain: IpcMain, fileService: FileService): void { ... }
function registerGitHandlers(ipcMain: IpcMain, gitService: GitService): void { ... }
function registerAIHandlers(ipcMain: IpcMain, aiService: AIService): void { ... }

app.whenReady().then(async () => {
  const services = await initializeServices()
  registerFileHandlers(ipcMain, services.file)
  registerGitHandlers(ipcMain, services.git)
  registerAIHandlers(ipcMain, services.ai)
})
```

**好處**: 各 domain 可獨立做整合/單元測試，初始化錯誤不會互相污染。

---

### A6-03 🟠 MEDIUM — migrateArticleFrontmatter 隱含 fire-and-forget 非同步副作用

**位置**: `src/stores/article.ts`（migrateArticleFrontmatter，約第 302 行）

**問題**:
```typescript
// ❌ 簽章為同步，內部卻有 fire-and-forget 磁碟寫入
function migrateArticleFrontmatter(article: Article): Article {
  const migrated = applyMigration(article)
  saveArticle(migrated, { preserveLastModified: true }).catch(logger.error)
  // ↑ 非同步寫入，呼叫端不知道是否完成
  return migrated
}
```

**競態條件**: 若使用者在遷移寫入完成前快速切換文章，`setCurrentArticle` 可能在未儲存狀態下修改 `currentArticle`。`catch(logger.error)` 只記錄不通知使用者。

**修正建議**:
```typescript
// 改為 async，強制呼叫端 await
async function migrateArticleFrontmatter(article: Article): Promise<Article> { ... }

async function setCurrentArticle(article: Article | null) {
  if (article) {
    article = await migrateArticleFrontmatter(article)
  }
  currentArticle.value = article
}
```

---

### A6-04 🟠 MEDIUM — Preload API 暴露低階 FS 原語，業務邏輯可被繞過

**位置**: `src/main/preload.ts`（readFile、writeFile、deleteFile、copyFile）

**問題**: Renderer 可透過 `window.electronAPI.writeFile(任意路徑, 內容)` 直接寫入，繞過 `ArticleService.saveArticle()` 的衝突檢測和備份邏輯。雖然 `FileService.validatePath()` 在 Main 端防護路徑穿越，但業務規則（備份、衝突偵測）仍可被跳過。

**長期方向**: 以業務域操作取代低階 FS 介面（如 `saveArticleContent(id, content)`），短期可加 audit log header 標記呼叫來源。

---

### A6-05 🟡 LOW — ArticleFilterCategory enum 硬編碼，違反 OCP

（→ 同 SOLID6-04，架構角度同意此分類應動態衍生）

---

### A6-06 🟡 LOW — Store nextTick / watch 在模組初始化時隱式觸發

**位置**: `src/stores/article.ts`（底部 `nextTick(() => initializeAutoSave())` 與 `watch(...)`）

**問題**: Pinia setup store 的 callback 在首次 inject 時立即執行，`nextTick` 和 `watch` 在 Vue App 掛載前的縫隙觸發，在測試環境中需要特別處理 fake timers 與 Vue 響應式初始化順序。

**修正建議**: 將 `initializeAutoSave` 改為明確的 `setup()` action，由 `App.vue` 的 `onMounted` 顯式呼叫。

---

## 亮點（值得保留）

| # | 位置 | 亮點 |
|---|------|------|
| ✅1 | `ArticleService` | 完整 DI 建構子模式，可注入 Mock |
| ✅2 | `ArticleService.saveArticle()` | `{ success, conflict, error }` 結構化回傳 |
| ✅3 | `main.ts` | Sentry 最早初始化，路徑白名單 + Zod config 驗證 |
| ✅4 | `preload.ts` | 事件訂閱統一回傳 `unsubscribe()` 防記憶體洩漏 |
| ✅5 | `ipc-channels.ts` | 全面常數化，消除 channel 拼錯的靜默失敗 |

---

## 架構師建議的最高 ROI 重構順序

1. **本 Sprint**：修正 `reloadArticle` 改用 `articleService.loadArticle()`（2h）——消除資料不一致 Bug，測試覆蓋率立即可提升
2. **下個 Sprint**：`main.ts` IPC 按 domain 拆分（4-6h）——可維護性大幅提升，可以加整合測試
3. **中期（Q2）**：`migrateArticleFrontmatter` 改 async + 評估移除低階 FS Preload 原語（8h）

---

*第六次全面評估 — 架構 | 索引: [00-index.md](./00-index.md) | 前次: [第五次架構報告](../2026-03-01-fifth-review/04-architecture-report.md)*
