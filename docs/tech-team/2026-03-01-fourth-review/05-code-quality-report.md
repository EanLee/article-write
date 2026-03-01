# 程式品質評估報告 — 第四次全面評估

**審查者**: 品質工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦 TypeScript 錯誤、ESLint、測試覆蓋率、型別安全

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **品質總分** | **6.5 / 10** | 主要品質改善已實施，但 TS 錯誤持續未解決影響評分 |
| TypeScript 嚴謹度 | 5.5/10 | 9 個編譯錯誤持續存在（Frontmatter.date, EditorTheme 等）|
| ESLint 合規 | 8.5/10 | 0 錯誤，no-any 問題大幅降低 |
| 測試覆蓋率 | 8/10 | 373 通過，但新增功能（FileService 路徑驗證）無新測試 |
| 錯誤處理 | 8.5/10 | Error cause 鏈完整，靜默吞咽已消除 |
| 型別完整性 | 6/10 | 型別宣告與實作不一致（mtime, AppConfig）|

---

## 執行摘要

第三次評估的主要品質問題（Q-01 no-explicit-any、Q-02 靜默吞咽、Q-03 setTimeout）均已修正。然而，**9 個 TypeScript 編譯錯誤仍持續存在**，且部分屬於可修正的類型（`Frontmatter.date` 缺失、`EditorTheme` 不相容）。新增的 FileService 路徑驗證功能缺乏對應測試，是測試覆蓋的空白點。

---

## 已修正確認（第三次評估品質問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| Q-01 | IPC 層 `no-explicit-any`（125 個警告）| ✅ 消除，Record<string,unknown> / Frontmatter |
| Q-02a | `searchBuildIndex` 靜默吞咽 | ✅ 改為 console.error 記錄 |
| Q-02b | frontmatter warn→error | ✅ 已修正 |
| Q-03 | setTimeout 100ms 脆弱時序 | ✅ 改為 nextTick |

---

## TypeScript 詳細錯誤清單（npx tsc --noEmit）

本次評估執行 `npx tsc --noEmit` 確認目前錯誤狀態：

| # | 錯誤 | 位置 | 嚴重度 | 類型 |
|---|------|------|--------|------|
| 1 | `'date' does not exist in type 'Frontmatter'` | `FileScannerService.ts:89` | 🟠 | 型別缺失 |
| 2 | `'date' does not exist in type 'Partial<Frontmatter>'` | `FileScannerService.ts:89` | 🟠 | 型別缺失 |
| 3 | `'date' does not exist in type 'Partial<Frontmatter>'` | `MarkdownService.ts:174` | 🟠 | 型別缺失 |
| 4 | `'date' does not exist in type 'Partial<Frontmatter>'` | `MarkdownService.ts:297,298` | 🟠 | 型別缺失 |
| 5 | `ArticleFilterStatus → ArticleStatus` 轉換可能有誤 | `article.ts:46` | 🟡 | 型別轉換 |
| 6 | `'searchBuildIndex' does not exist on type` | `article.ts:127` | 🟡 | 型別宣告缺失 |
| 7 | `'err' implicitly has 'any' type` | `article.ts:127` | 🟡 | 隱式 any |
| 8 | `'status' is declared but never read` | `article.ts:184` | 🟢 | 未用變數 |
| 9 | `AppConfigShape not assignable to AppConfig` | `config.ts:38` | 🟠 | 型別衝突 |
| 10 | `'searchQuery' does not exist on type` | `search.ts:21` | 🟡 | 宣告缺失 |
| 11 | `'aiGetActiveProvider' does not exist on type` | `seo.ts:14` | 🟡 | 宣告缺失 |
| 12 | `'aiGenerateSEO' does not exist on type` | `seo.ts:15` | 🟡 | 宣告缺失 |

**📊 共 12 個 TypeScript 錯誤**（前次評估時推估 10 個，本次精確統計）

---

## TS 錯誤根因分類

### 分類 A：`Frontmatter` 型別缺少 `date` 欄位（3 個位置）

**根因**: `Frontmatter` interface 定義未包含 `date` 欄位，但 `MarkdownService` 與 `FileScannerService` 在讀取 YAML 後嘗試寫入 `frontmatter.date`。

**建議修正**:
```typescript
// types/index.ts - 補充 date 欄位
export interface Frontmatter {
  title: string;
  slug?: string;
  date?: string;       // 新增
  lastmod?: string;    // 新增（若同樣缺失）
  // ...其他欄位
}
```

**難易度**: 🟢 簡單（加一行型別定義）

---

### 分類 B：`electron.d.ts` 缺少新 API 宣告（4 個錯誤）

**根因**: `electron.d.ts: ElectronAPI` 中缺少：
- `searchBuildIndex?: (articlesDir: string) => Promise<number>` — article store 使用
- `searchQuery()`, `aiGetActiveProvider()`, `aiGenerateSEO()` — search/seo store 使用

**驗證**: 查閱 `electron.d.ts`，`searchBuildIndex` 宣告存在，但 `article.ts` 使用 `window.electronAPI.searchBuildIndex?.()`——問題在 TypeScript 版本下 optional chaining 的型別推斷，或是型別版本不符。

**建議**: 確認 `electron.d.ts` 中完整宣告所有 API，並驗證無重複 `interface Window` 合併衝突。

**難易度**: 🟡 中等（需要追查型別宣告合併）

---

### 分類 C：`AppConfig` 型別衝突（1 個錯誤）

見 A4-01 架構問題，根因是 Zod schema `AppConfig` 與 `types/index.ts` `AppConfig` 中 `EditorTheme` 型別不相容。

**難易度**: 🟡 中等（統一型別定義）

---

### 分類 D：可忽略 / 前次已知（4 個錯誤）

- `ArticleFilterStatus → ArticleStatus` 的強制轉型（已注明為有意設計）
- `status` 未使用變數（應加 `_status` 前綴或刪除）
- `err` 隱式 any（在 `.catch((err) => ...)` 中需加型別注解）

---

## 測試覆蓋空白

### Q4-T01：FileService 路徑驗證無單元測試

`refactor/file-service-path-validation` 引入了重要的 `validatePath()` 邏輯，但未見對應單元測試。

**缺失測試場景**:
```typescript
// 應新增的測試
describe("FileService.validatePath", () => {
  it("允許白名單內的路徑")
  it("拒絕白名單外的路徑")
  it("拒絕路徑穿越攻擊字串 (../../etc/passwd)")
  it("白名單為空時不限制")
  it("路徑正規化後的邊界測試")
})
```

### Q4-T02：Zod Schema 驗證無測試

`config.schema.ts` 的 `AppConfigSchema` 未見測試。

**缺失測試場景**:
```typescript
describe("AppConfigSchema", () => {
  it("拒絕空 articlesDir")
  it("拒絕 autoSaveInterval < 1000")
  it("拒絕非法 theme 值")
  it("通過正確格式的 config")
})
```

---

## ESLint 現況

```
✅ 0 ESLint 錯誤
✅ 0 ESLint 警告（no-any 問題已大幅削減）
```

---

## 測試統計

```
Test Files: 32 passed (32)
Tests: 373 passed | 3 skipped (376)
Duration: 10.10s
```

**評估**: 測試數量穩定，無迴歸。新功能（FileService 路徑驗證、Zod schema、DOMPurify 整合）均無 E2E 或單元測試覆蓋。

---

## 品質工程師結語

程式品質的改善在 ESLint / 錯誤處理層面非常顯著，但 **TypeScript 編譯錯誤的持續存在是品質評分的主要扣分項**。這些錯誤絕大多數有明確的修正方案且代價低（Frontmatter 加欄位、electron.d.ts 同步）。建議在下一個 sprint 設立「TypeScript 零錯誤」作為 Definition of Done 的一部分。

**最高優先建議**:
1. 補充 `Frontmatter.date` 型別（1 行修正，消除 4 個錯誤）
2. 同步 `electron.d.ts`（消除 4 個宣告缺失錯誤）
3. 統一 `EditorTheme`（消除 1 個型別衝突錯誤）
4. 補充 FileService 路徑驗證單元測試

---

*第四次全面評估 — 品質 | 前次: [第三次評估](../2026-03-01-third-review/05-code-quality-report.md)*
