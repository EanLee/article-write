# 效能 / O(n) 評估報告 — 第三次全面評估

**審查者**: 效能工程師 Agent  
**日期**: 2026-03-01  
**評估範圍**: WriteFlow v0.1.0，聚焦演算法複雜度、記憶體、IPC 效率、訂閱管理

---

## 執行摘要

第二次評估後，`filteredArticles` 已優化為 O(n) 單次遍歷，批次載入 `loadInBatches(10)` 正確實施。本次評估發現的主要風險集中在 **訂閱洩漏造成的記憶體持續增長** 與 **多層遍歷的串聯效能問題**。

---

## 複雜度矩陣

| # | 位置 | 複雜度 | 狀態 |
|---|------|--------|------|
| P-01 | `setupFileWatching()` 訂閱累積 | O(n × k) 訂閱數 | ❌ 洩漏 |
| P-02 | `loadAllArticles()` 串聯 `getFileStats()` | O(dir × subdir) × 2 IPC | ⚠️ 可優化 |
| P-03 | `filteredArticles` computed | O(n) 單次遍歷 | ✅ 良好 |
| P-04 | `allTags` computed | O(n × m) flatMap | ✅ 可接受 |
| P-05 | `loadInBatches(10)` 並行批次 | O(n/10) 批次 | ✅ 良好 |
| P-06 | 每次 `loadArticles()` 重建訂閱 | 累積 K 個監聽器 | ❌ 嚴重 |
| P-07 | `AutoSaveService` dirty-flag 快速路徑 | O(1) 快速路徑 | ✅ 優良 |
| P-08 | `parseArticlePath` 雙次 `normalizePath()` 呼叫 | 微小但可改 | 🟡 低 |

---

## 詳細分析

### P-01 / P-06 🔴 訂閱洩漏 — 最高優先（重大記憶體問題）

**位置**: `src/stores/article.ts` — `setupFileWatching()`

```typescript
// 問題程式碼（推測結構，基於讀取的實作）
function setupFileWatching() {
  window.electronAPI.onFileChange((data) => {  // ← 每次 loadArticles() 都重新呼叫
    handleFileChange(data);
  });
  // 從未呼叫返回的 unsubscribe 函數！
}

// loadArticles() 每次都呼叫 setupFileWatching()
async function loadArticles() {
  ...
  setupFileWatching(); // ← N 次 loadArticles = N 個監聽器
}
```

**影響**:
- 使用者每次重新整理文章清單，就多一個 `onFileChange` 監聽器
- 每個檔案變更事件觸發 N 次 `handleFileChange`（N = loadArticles 呼叫次數）
- Pinia store 更新被重複觸發，Vue 重新渲染乘以 N 倍
- 長時間使用（vault 切換、重新整理）導致記憶體持續增長

**修正方案**:
```typescript
let fileChangeUnsubscribe: (() => void) | null = null;

function setupFileWatching() {
  // 先清除舊的訂閱
  if (fileChangeUnsubscribe) {
    fileChangeUnsubscribe();
    fileChangeUnsubscribe = null;
  }
  
  // 建立新訂閱並保存清理函數
  fileChangeUnsubscribe = window.electronAPI.onFileChange((data) => {
    handleFileChange(data);
  });
}

// store 銷毀時清理
onScopeDispose(() => {
  fileChangeUnsubscribe?.();
});
```

---

### P-02 🟡 `loadAllArticles()` 串聯 `getFileStats()` — 效能瓶頸

**位置**: `src/services/ArticleService.ts:loadAllArticles()`

```typescript
for (const topEntry of topEntries) {
  const topPath = `${vaultPath}/${topEntry}`;
  const topStats = await this.fileSystem.getFileStats(topPath); // ← IPC 往返
  if (!topStats?.isDirectory) { continue; }
  
  // ... 再次掃描
  for (const subEntry of topFiles) {
    const subPath = `${topPath}/${subEntry}`;
    const subStats = await this.fileSystem.getFileStats(subPath); // ← 又一次 IPC
    ...
  }
}
```

**問題**: 對每個頂層目錄條目都進行一次 IPC 往返（`getFileStats`），再對每個子目錄條目再一次往返。在 Vault 有 20 個頂層目錄、每目錄 10 個子項目時，單單 `getFileStats` 就產生 220 次 IPC 呼叫，全部串聯執行。

**現有緩解**: 後續的實際 `loadArticle()` 任務已透過 `loadInBatches(10)` 並行化。但前置的目錄掃描階段仍是串聯。

**建議**: 考慮讓 `readDirectory()` 返回包含 `isDirectory` 的項目列表，減少 `getFileStats` 呼叫次數（需修改 IPC 介面與 FileService）。

---

### P-03 ✅ `filteredArticles` — O(n) 良好

```typescript
// 單次遍歷，早期返回
const filteredArticles = computed(() => {
  return articles.value.filter((article) => {
    if (filters.status && article.status !== filters.status) return false;
    if (filters.category && article.category !== filters.category) return false;
    // ...
    return true;
  });
});
```

**評估**: 標準 O(n) 線性掃描，有早期返回優化，不做額外排序或巢狀過濾，表現優良。

---

### P-04 ✅ `allTags` — O(n × m) flatMap

```typescript
const allTags = computed(() => {
  return [...new Set(articles.value.flatMap(a => a.frontmatter.tags ?? []))];
});
```

**評估**: `flatMap` + `Set` 是標準去重模式，O(n × m)（n = 文章數，m = 平均標籤數）。在 1000 篇文章、平均 5 標籤的情境下仍在 ~5000 次操作，可接受。Vue computed cache 確保只在 articles 改變時重算。

---

### P-05 ✅ `loadInBatches(10)` — 並行良好

```typescript
private async loadInBatches<T>(tasks: Promise<T>[], batchSize: number): Promise<T[]> {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
}
```

**評估**: 批次大小 10 為合理值，避免同時開啟過多檔案描述符。`Promise.all` 在批次內並行，跨批次串聯。合理的 back-pressure 設計。

---

### P-07 ✅ AutoSaveService Dirty-Flag 快速路徑

```typescript
// Dirty flag 快速路徑
if (this.saveState.value.status === SaveStatus.Saved) {
  return; // O(1) 快速跳過
}
// 字串比對（僅在 dirty 狀態時）
if (!this.hasContentChanged(currentArticle)) { ... }
```

**評估**: 三層防護設計（SaveStatus check → hasContentChanged()）有效避免頻繁字串比對。第二次 review 成果，維持良好。

---

### P-08 🟡 `parseArticlePath` 雙次正規化

**位置**: `src/stores/article.ts`

```typescript
function parseArticlePath(filePath: string) {
  const normalized = normalizePath(filePath);  // 第一次
  const parts = normalized.split("/");
  // ...
  const withoutVault = normalizePath(filePath.replace(...)); // 第二次
}
```

`normalizePath()` 被呼叫兩次，計算相同輸入。微小效能損耗，但在 1000 篇文章批次載入時會放大。

**建議**: 快取第一次的結果，第二次使用 `normalized` 而非重算。

---

## 記憶體使用估計

| 場景 | 訂閱修復前 | 訂閱修復後 |
|------|-----------|-----------|
| 啟動後重新整理 5 次 | 5x handleFileChange 回呼 | 1x 回呼 |
| 1 個檔案變更事件 | N 次 store 更新觸發 | 1 次 store 更新 |
| 長時間 session（切換 10 個 vault）| 記憶體線性增長 | 穩定 |

---

## 結論與優先修正

1. **立即** (P-01/P-06): 修正 `setupFileWatching()` 訂閱洩漏，在重新呼叫前先 unsubscribe
2. **本 Sprint** (P-02): 評估是否可讓 `readDirectory()` 返回 `isDirectory` 欄位
3. **Backlog** (P-08): 合併 `parseArticlePath` 的兩次 `normalizePath` 呼叫

---

*效能評估結束 ｜ 下一份: [SOLID 報告](./03-solid-report.md)*
