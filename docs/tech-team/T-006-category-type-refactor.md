# 技術討論 T-006 — Article.category 型別重構評估

> **日期**: 2026-02-15
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）、Alex（UI/UX）
> **背景**: T-005 實作分類 combobox 時發現，`Article.category` 目前型別為 `ArticleCategory` enum（僅三個固定值），無法儲存使用者自訂的分類字串，導致 combobox 的「可自行輸入」功能實際上無效

---

## 任務清單

| # | 任務 | 負責 | 狀態 |
|---|------|------|------|
| 1 | 評估影響範圍 | Sam | ✅ 完成 |
| 2 | 決定型別策略 | Sam | ✅ 完成 |
| 3 | 實作型別修改與服務層調整 | Lin | 🔲 待實作 |
| 4 | 更新 FrontmatterEditor combobox | Wei | 🔲 待實作 |
| 5 | 驗證現有測試通過 | Lin | 🔲 待實作 |

---

## 問題診斷

### Sam：影響範圍評估

目前 `ArticleCategory` enum 出現在以下位置：

| 層級 | 檔案 | 用途 |
|------|------|------|
| 型別定義 | `src/types/index.ts` | `Article.category: ArticleCategory` |
| 服務層 | `ArticleService.ts` | `loadArticle(categoryFolder: ArticleCategory)` |
| 服務層 | `FileScannerService.ts` | `extractCategoryFromPath(): ArticleCategory` |
| 服務層 | `ConverterService.ts` | 路徑組合、統計分組 |
| Store | `article.ts` | `reloadArticleFromDisk`、`createArticle`、`parseArticlePath` |
| UI | `FrontmatterEditor.vue` | `localArticle.category` 賦值 |

直接改 enum → string 影響整個服務層，需要謹慎評估。

---

## 討論記錄

### Lin：兩種修改策略比較

**策略 A：直接把 `Article.category` 改為 `string`**

- 優點：最直接，FrontmatterEditor 可立即儲存任意字串
- 缺點：`ArticleService`、`FileScannerService`、`ConverterService` 內部大量 `as ArticleCategory` cast 需要清除，`createArticle` 的 category 參數也要調整，工作量中等

**策略 B：保留 enum，`Article.category` 改為 `ArticleCategory | string`**

- 優點：向下相容，既有 enum 值不受影響
- 缺點：union type 在服務層用起來麻煩，`as ArticleCategory` cast 更多，實際上只是延後問題

**Lin 建議策略 A**：既然 T-005 的目標就是讓分類可以自由輸入，繼續保留 enum 限制只是掩蓋問題。服務層的 cast 清除雖然工作量不小，但一次做乾淨。

---

### Sam：決策

採用**策略 A**，並制定修改範圍：

1. **`src/types/index.ts`**：`Article.category` 型別改為 `string`，`ArticleCategory` enum **保留但僅作為參考常數**，不作為強制型別
2. **`FileScannerService.ts`**：`extractCategoryFromPath()` 回傳改為 `string`
3. **`ArticleService.ts`**：`loadArticle` / `loadArticles` 參數改為 `string`，移除不必要的 `as ArticleCategory` cast
4. **`article.ts` store**：`createArticle`、`reloadArticleFromDisk`、`parseArticlePath` 參數改為 `string`
5. **`ConverterService.ts`**：`article.category` 使用改為直接用字串，移除 cast

**不修改**：`ArticleFilterCategory` enum（篩選器用途不同，保持原狀）

---

### Alex：UI 面的補充

combobox 儲存後，`article.category` 是字串，`ArticleList` 和 `ArticleManagement` 的分類 badge 直接顯示即可，不需要額外處理。

`ArticleManagement` 的分類篩選下拉目前是從 `articleStore.articles.map(a => a.category)` 動態產生，改為 string 後自然就能顯示自訂分類，不需要額外修改。

---

## 相關文件

- [T-005 Metadata Cache 設計評估](./T-005-metadata-cache-design.md)
- `src/types/index.ts`
- `src/services/ArticleService.ts`
- `src/services/FileScannerService.ts`
- `src/services/ConverterService.ts`
- `src/stores/article.ts`

## 相關 Commit

_待 Lin 實作後補充_
