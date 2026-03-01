# 可維護性與易讀性評估報告 — 第三次全面評估

**審查者**: 可維護性工程師 Agent  
**日期**: 2026-03-01  
**評估範圍**: WriteFlow v0.1.0，聚焦文件品質、命名一致性、程式碼組織、技術債評估

---

## 執行摘要

WriteFlow 的文件覆蓋率是同類 Electron 應用中的佼佼者，`docs/` 目錄有詳盡的決策記錄、修復追蹤、技術評估。程式碼本身的 JSDoc 覆蓋完整，中英文混用是主要一致性問題。最嚴重的可維護性問題是 `article.ts` 的**單一檔案過大**（300+ 行，6 種職責）。

---

## 可維護性指標

| 指標 | 狀態 | 說明 |
|------|------|------|
| 文件覆蓋率 | ✅ 優秀 | docs/ 目錄完整，ADR、Fix 記錄俱全 |
| JSDoc 覆蓋 | ✅ 良好 | 主要服務類別有完整 JSDoc |
| 命名一致性 | 🟡 待改善 | 中英文混用，camelCase/kebab-case 不一致 |
| 檔案大小 | 🟡 注意 | `article.ts` 300+ 行過大 |
| 測試覆蓋率 | ✅ 良好 | 32 檔案，373 測試 |
| 引號一致性 | ✅ 完美 | ESLint 強制執行 |

---

## M-01 🟡 中英文混用命名

**問題**: 程式碼介面（函式名、變數名、常數名）在中英文之間不一致。

### 英文命名（正確）
```typescript
const articleService = getArticleService();
function loadArticles() { ... }
const autoSaveInterval = 30000;
```

### 中文字串常數（合理）
```typescript
logger.info(`自動儲存已啟動，間隔: ${interval} 秒`);
// ↑ log 訊息用中文 OK，面向使用者/開發者的描述
```

### 混用問題區域
```typescript
// main.ts IPC handler 命名
ipcMain.handle("start-file-watching", ...); // ← 英文
ipcMain.handle(IPC.SEARCH_BUILD_INDEX, ...); // ← 常數

// 錯誤訊息
throw new Error(`Failed to write file ${filePath}`);  // 英文
console.warn("Migration failed:", err);                // 英文
this.updateSaveState(SaveStatus.Error, "儲存失敗");   // 中文
```

**建議**: 制定明確規範：
- 程式碼識別符（變數名、函式名）→ 英文
- 使用者介面文字 → 中文
- 開發者 log 訊息 → 統一（建議中文，已此為多數）
- 錯誤訊息 → 統一（建議中文，面向中文使用者）

---

## M-02 🟠 `article.ts` 單一檔案過大

**位置**: `src/stores/article.ts`（300+ 行）

根據讀取的內容，此檔案包含：
1. Store 狀態定義
2. `createArticle()` — ID 生成 + 業務邏輯
3. `loadArticles()` — 完整載入流程
4. `setupFileWatching()` — 檔案監聽管理
5. `initializeAutoSave()` — 自動儲存生命週期
6. `parseArticlePath()` — 路徑解析
7. `migrateArticleFrontmatter()` — 資料遷移
8. `filteredArticles` computed — 過濾邏輯
9. `allTags` computed — 標籤聚合

**建議分解**:
```
src/composables/
  useFileWatching.ts    ← setupFileWatching() 邏輯
  useArticleFilters.ts  ← filteredArticles, allTags computed

src/stores/
  article.ts            ← 純狀態管理（~100 行）
```

---

## M-03 ✅ JSDoc 文件覆蓋率高

`ArticleService.ts` 和 `AutoSaveService.ts` 的 JSDoc 是榜樣：

```typescript
/**
 * 初始化自動儲存服務
 * @param {(article: Article) => Promise<void>} saveCallback - 儲存文章的回調函數
 * @param {() => Article | null} getCurrentArticleCallback - 取得當前文章的回調函數
 * @param {number} interval - 自動儲存間隔（毫秒），預設 30 秒
 */
initialize(saveCallback: ..., getCurrentArticleCallback: ..., interval: number = 30000): void
```

⚠️ 注意：完整的文件能促進可維護性。但如 Q-03 所述，被文件化的 API 如果本身設計有問題（如需要 setTimeout），文件只會讓問題更難被挑戰。「好的文件說明正確的設計」而非「為錯誤的設計提供詳盡說明」。

---

## M-04 🟢 `docs/` 目錄結構優秀

```
docs/
  adr/          → 架構決策記錄（ADR）
  fix-bug/      → 每次 bug fix 的詳細記錄
  tech-team/    → 技術評審報告（第一、二、三次）
  planning/     → 路線圖與優先順序
  guides/       → 如 COMMIT_GUIDE.md
```

這個文件結構對新成員加入團隊非常友善，每個重大決策和修復都有溯源記錄。這是少見的優良工程文化實踐。

---

## M-05 🟡 硬編碼 "Vault" 結構假設

多處程式碼假設特定的目錄結構：

```typescript
// FileService.ts
depth: 3  // ← 假設最多 3 層

// ArticleService.ts:loadAllArticles()
// 假設結構：vaultPath/Category/article.md
// 或：vaultPath/Status/Category/article.md

// article.ts:parseArticlePath()
"Publish"  // ← 假設「已發佈」目錄固定名為 "Publish"
```

這些假設是可接受的業務決策，但應在 Config 層集中管理，而非散落在各個服務中。**理想設計**: 定義 `VaultConfig` 介面，包含 `maxDepth`、`publishedDirName` 等設定。

---

## M-06 ✅ `MainEditor.vue` 組合式設計的可維護性

`MainEditor.vue` 雖然是核心元件，但透過 7 個 composable 的分解，每個功能單元都可獨立測試和修改：

- 修改自動完成行為 → 只改 `useAutocomplete`
- 修改搜尋替換 → 只改 `useSearchReplace`
- 修改同步滾動 → 只改 `useSyncScroll`

這是 Vue 3 Composition API 在可維護性方面的完美展示。

---

## M-07 🟡 `AIPanel` 與 `Seo` store 過度耦合

**位置**: `src/stores/aiPanel.ts`

```typescript
async function generateSEO() {
  const articleStore = useArticleStore(); // ← 直接呼叫其他 store
  const seoStore = useSeoStore();         // ← 直接呼叫其他 store
  // ...
}
```

Pinia 允許 store 間相互呼叫，但 `aiPanel` store 直接在函式體內呼叫 `useArticleStore()` 和 `useSeoStore()`，這種「store 內部呼叫其他 store」的模式可能導致循環依賴問題（特別是 SSR 或測試環境），也使依賴關係隱晦。

**建議**: 在 `useAIPanelStore` 的設定中明確傳入依賴：

```typescript
// 或在 action 中接受參數
async function generateSEO(articleId: string, seoOptions: SeoOptions) {
  // 使呼叫者負責傳遞資料，降低 store 耦合
}
```

---

## 可維護性年度評估

| 類別 | 評分 | 趨勢 |
|------|------|------|
| 文件品質 | 9/10 | ⬆️ |
| 程式碼組織 | 7/10 | ➡️ |
| 命名一致性 | 7/10 | ⬆️（引號已統一）|
| 技術債總量 | 中低 | ⬆️（逐步改善）|
| 新成員上手難度 | 低 | ✅ 文件完整 |

---

## 優先修正清單

1. **本 Sprint** (M-02): 評估 `article.ts` 是否需要拆分 `useFileWatching` composable
2. **本 Sprint** (M-01): 統一錯誤訊息語言（中文）
3. **下 Sprint** (M-05): 建立 `VaultConfig` 集中管理硬編碼假設
4. **Backlog** (M-07): 評估 `aiPanel` store 的依賴傳遞方式

---

*可維護性評估結束 ｜ 下一份: [交互討論](./07-cross-discussion.md)*
