# SOLID 原則評估報告 — 第六次全面評估

**審查者**: SOLID 原則工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，基準 commit `e9b525a`

---

## 本次評分

| 原則 | 分數 | 主要違反 |
|------|------|---------|
| SRP（單一職責） | 4/10 | article.ts 上帝 Store 9 個職責領域；reloadArticle 複製解析邏輯 |
| OCP（開放封閉） | 6/10 | ArticleFilterCategory enum 需改碼才能新增分類 |
| LSP（里氏替換） | 8/10 | IFileSystem / ArticleService 良好；AutoSaveService 隱含前置條件 |
| ISP（介面隔離） | 6/10 | window.electronAPI 肥介面 30+ 方法；Frontmatter 混合廢棄欄位 |
| DIP（依賴反轉） | 5/10 | article.ts 7 次直呼 window.electronAPI；AutoSaveService import Vue ref；PublishService import Node fs |
| **SOLID 總分** | **5.8 / 10** | 部分設計良好（ArticleService DI 模式），但 Store 層架構需根本性整理 |

---

## 執行摘要

本次為首次對 WriteFlow 進行完整的 SOLID 原則掃描，範圍覆蓋所有 Store、Service、Component。最嚴重的發現是**三個 DIP 大範圍違反**：`article.ts` Store 直接呼叫 `window.electronAPI`、`AutoSaveService` 引入 Vue 框架、`PublishService` 引入 Node.js `fs`，使測試難度大幅提升。正面發現：`ArticleService` 的建構子注入模式是黃金標準，應作為全專案的參考範本。

---

## 新發現問題

### SOLID6-01 🔴 SRP — article.ts 上帝 Store（611 行、9 個職責領域）

**位置**: `src/stores/article.ts`（全檔）

**問題**: Pinia Store 的職責已遠超「狀態管理」範疇：

| 職責領域 | 描述 | 應抽出至 |
|---------|------|---------|
| 狀態管理 | articles、currentArticle | Store 核心（保留） |
| 篩選邏輯 | filteredArticles computed | `useArticleFilter` composable |
| CRUD 操作 | createArticle、deleteArticle | `ArticleService`（部分已有） |
| 檔案監聽 | fileWatcher 整合 | `useArticleSync` composable |
| 事件處理 | IPC 事件訂閱/取消 | `useArticleSync` composable |
| Frontmatter 遷移 | migrateArticleFrontmatter | `ArticleMigrationService` |
| AutoSave 初始化 | initializeAutoSave | `useAutoSave` composable |
| 搜尋索引建立 | buildSearchIndex | `SearchIndexService` |
| 路徑解析 | parseArticlePath | 工具函式 |

**影響**: 每次修改任一職責，都需要閱讀整個 611 行的 Store；單元測試需要 mock 多個獨立系統（window.electronAPI、configStore、autoSaveService），維護成本隨職責數指數增長。

---

### SOLID6-02 🟡 SRP — reloadArticle 複製 ArticleService.loadArticle 邏輯

**位置**: `src/stores/article.ts`（reloadArticle 方法）

**問題**: `reloadArticle()` 直接呼叫 `window.electronAPI.readFile()` + 自行執行 Markdown 解析，與 `ArticleService.loadArticle()` 邏輯重複，且跳過了分類解析和 ID 生成：

```typescript
// ❌ reloadArticle — 繞過 ArticleService，重複解析邏輯
const content = await window.electronAPI.readFile(article.filePath)
const { frontmatter, content: articleContent } = markdownService.parseMarkdown(content)
// ↑ 缺少 ArticleService 的分類解析、ID 標準化

// ✅ 應委派 ArticleService
const reloaded = await articleService.loadArticle(article.filePath, article.category)
```

**實際危害**: `reloadArticle` 後的文章物件與 `loadAllArticles` 回傳的格式不一致，為靜默的資料一致性 Bug（→ 參見 A6-01）。

---

### SOLID6-03 🟡 SRP — AutoSaveService 混合 timer 邏輯與 Vue 響應式狀態

**位置**: `src/services/AutoSaveService.ts`

**問題**: Service 層不應直接持有 Vue 的 `ref`，但 `AutoSaveService` 使用了 `shallowRef` 追蹤儲存狀態（`isDirty`、`isSaving`），將 UI 框架的概念滲入 Service 層。

---

### SOLID6-04 🟡 OCP — ArticleFilterCategory enum 需改碼才能新增分類

**位置**: `src/types/index.ts:33`

**問題**:
```typescript
enum ArticleFilterCategory {
  All = "all",
  Software = "software",    // ← 硬編碼業務分類
  Growth = "growth",
  Management = "management"
}
```

新增文章分類需同時修改 enum 定義與所有使用到 enum 的元件，違反 OCP（對擴充開放，對修改封閉）。

**修正建議**:
```typescript
// 分類從已載入的文章動態衍生
const availableCategories = computed(() =>
  ['all', ...new Set(articles.value.map(a => a.category))]
)
```

---

### SOLID6-07 🟡 LSP — AutoSaveService.initialize() 隱含前置條件契約

**位置**: `src/services/AutoSaveService.ts`

**問題**: `save()` 方法要求 `initialize()` 必須先被呼叫，但未透過型別系統或文件明確表達此前置條件。呼叫端若未依序呼叫，行為未定義，違反 LSP 的「前置條件不可強化」原則。

---

### SOLID6-08 🔴 ISP — window.electronAPI 肥介面（30+ 方法）

**位置**: `src/main/preload.ts`（contextBridge.exposeInMainWorld）

**問題**: 所有 Consumer（article.ts、ImageService、AutoSaveService 等）對同一個 `window.electronAPI` 介面全量依賴。單元測試需要 mock 整個介面（30+ 方法）才能測試單一功能：

```typescript
// 測試 article.ts 的 loadArticles 時，需要 mock：
vi.mock('window.electronAPI', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  // ... 還有 27 個方法
}))
```

**修正建議**: 按職責切分為多個窄介面：
```typescript
interface IFileAPI { readFile, writeFile, deleteFile, ... }
interface IGitAPI { commit, push, getStatus, ... }
interface IAIAPI { generateSEO, setApiKey, ... }
```

---

### SOLID6-09 🟡 ISP — Frontmatter 介面混合有效欄位與廢棄欄位

**位置**: `src/types/index.ts`（Frontmatter interface）

**問題**: Frontmatter 介面同時包含 active 欄位與 `@deprecated date` 等廢棄欄位，Consumer 需在使用時判斷欄位是否仍有效。

---

### SOLID6-10 🔴 DIP — article.ts Store 7 次直呼 window.electronAPI

**位置**: `src/stores/article.ts`（createArticle、updateArticle、deleteArticle 等）

**問題**: Store 層有 7 個直接 `window.electronAPI.xxx()` 呼叫，而非透過 `ArticleService` 抽象層。這使 Store 對 Electron IPC 產生直接依賴，在 Vitest（happy-dom）環境需要特殊 mock：

```typescript
// ❌ 現況 — Store 直呼 IPC
await window.electronAPI.createDirectory(newArticlePath)

// ✅ 應透過 ArticleService
await articleService.createArticle(...)
```

**影響**: 測試覆蓋率存在「虛假繁榮」風險——CI 通過但 mock 不準確時，真實行為未被驗證。

---

### SOLID6-11 🔴 DIP — AutoSaveService import \{ ref \} from "vue"

**位置**: `src/services/AutoSaveService.ts:1`

**問題**:
```typescript
import { ref, shallowRef } from "vue"  // ← Service 層硬耦合 UI 框架

export class AutoSaveService {
  private isDirty = shallowRef(false)  // ← UI 框架概念在 Service 層
}
```

**影響**:
1. AutoSaveService 無法在 Main Process 執行（Vue 不在 Node.js 環境）
2. 測試需要啟動 Vue 應用環境才能測試純 Service 邏輯
3. 若未來需要在不同框架重用，需大規模改寫

**修正建議**: Service 接受一個外部傳入的可觀測狀態（DI），或使用純 JS observable pattern：
```typescript
// 建構子接受外部 ref（DIP）
constructor(
  private readonly saveState: { isDirty: Ref<boolean> }
) {}
```

---

### SOLID6-12 🟡 DIP — PublishService 直接 import Node.js fs

**位置**: `src/main/services/PublishService.ts`

**問題**: `PublishService` 直接 `import fs from 'fs'` 而非透過 `IFileSystem` 介面操作，繞過了已建立的 FileService 路徑白名單防護。

---

## 亮點（值得保留）

- **ArticleService DI 建構子模式**（`IFileSystem` + `MarkdownService` + `BackupService`）是 DIP 黃金標準，整個專案應以此為參考
- **ArticleService.saveArticle() 結構化回傳**（`{ success, conflict, error }`）優於例外拋出，是良好的 LSP 實踐
- **MainEditor.vue composable 拆分**（useEditorContent、useAutoSave、useWordCount 等）是優秀的 SRP 應用

---

## SOLID 工程師結語

WriteFlow 的設計品質呈現明顯的雙峰分佈：`ArticleService` 的 DI 模式堪稱黃金標準，但 `article.ts` Store 卻是 9 個職責的廚房水槽。核心問題在於 **Store 層承擔了本應屬於 Service 層的職責**，且 DIP 違反使測試難度倍增。建議以「先修 reloadArticle 資料一致性 Bug → 再拆 useArticleFilter composable → 最後解除 AutoSaveService Vue 耦合」的順序有計劃地改善。

---

*第六次全面評估 — SOLID | 索引: [00-index.md](./00-index.md) | 前次: [第五次 SOLID 報告](../2026-03-01-fifth-review/03-solid-report.md)*
