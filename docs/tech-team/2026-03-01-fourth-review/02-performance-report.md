# 效能評估報告 — 第四次全面評估

**審查者**: 效能工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦訂閱管理、算法效率、渲染最佳化

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **效能總分** | **8.5 / 10** | 所有前次效能問題已修正，算法品質明顯提升 |
| 記憶體管理 | 9/10 | 訂閱洩漏 P-01 已修正，生命週期管理正確 |
| 算法複雜度 | 8.5/10 | O(n) 單次遍歷優化已實施，偶有重複計算 |
| IPC 效率 | 8/10 | 增量索引更新完整，批次操作設計良好 |
| 渲染最佳化 | 8.5/10 | 穩定 ID 防止不必要重渲染，computed 快取正確 |

---

## 執行摘要

第三次評估的**效能問題 P-01（訂閱洩漏）** 透過 `useFileWatching` composable 的 `start()/stop()` 模式完整修正。穩定 Article ID（hash-based）消除了 v-for key 因 ID 變動而觸發的不必要 DOM 重建。`filteredArticles` computed 從 O(n×m) 多次遍歷重構為 O(n) 單遍，是顯著的算法改善。

本次評估未發現新的嚴重效能問題，僅有 2 個低等改善建議。

---

## 已修正確認（第三次評估問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| P-01 | `setupFileWatching()` 訂閱洩漏 | ✅ `useFileWatching.stop()` 正確清除 |
| P-02 | 重複 AutoSave timer | ✅ `refactor/remove-duplicate-autosave` 已移除 MainEditor timer |
| stable-id | v-for key 不穩定（UUID 每次生成新值）| ✅ `generateIdFromPath` hash 穩定 ID |

---

## 第三次問題深度驗證

### P-01 驗證：useFileWatching composable

```typescript
// src/composables/useFileWatching.ts
export function useFileWatching({ onFileEvent }) {
  let unsubscribe: (() => void) | null = null;

  async function start(vaultPath: string) {
    await window.electronAPI.startFileWatching(vaultPath);
    unsubscribe = fileWatchService.addWatchListener(onFileEvent);
  }

  function stop() {
    if (unsubscribe) {
      unsubscribe(); // ← 正確清除訂閱
      unsubscribe = null;
    }
  }
  return { start, stop };
}
```

**評估**: `addWatchListener()` 回傳 unsubscribe 函式，`stop()` 正確呼叫。article store 在卸載時（`onUnmounted`）會呼叫 `fileWatcher.stop()`。**訂閱洩漏已完全修正。**

### P-02 驗證：MainEditor AutoSave 去重

```typescript
// 修正後：移除 autoSaveTimer，改用 autoSaveService.markAsModified()
function handleContentChange(value: string) {
  if (isLoadingArticle.value) return;
  autoSaveService.markAsModified();
}
```

**評估**: 消除了競態條件（兩個 timer 同時修改同一文章的風險）。**雙重 timer 已移除。**

### stable-id 驗證：generateIdFromPath

```typescript
// ArticleService.generateIdFromPath: 使用路徑 hash
generateIdFromPath(filePath: string): string {
  // djb2 hash → hex string，決定性且唯一
}
```

**評估**: 同一個檔案路徑永遠生成相同 ID，v-for key 穩定，Vue 不再需要重建所有文章組件。**渲染效能問題已修正。**

---

## 新發現問題

### P4-01 🟢 `filteredArticles` 中 searchText 的雙重 toLowerCase — 低優先

**位置**: `src/stores/article.ts:42~75`

```typescript
const searchText = filter.value.searchText?.toLowerCase(); // 已在外部計算

// 但以下仍執行兩次 toLowerCase（title 與 content）：
const titleMatch = article.title.toLowerCase().includes(searchText);
const contentMatch = (article.content || "").toLowerCase().includes(searchText);
```

**分析**: `searchText` 已正確在迴圈外 toLowerCase 一次（優化正確）。但 `article.title.toLowerCase()` 在每次迭代都執行，對 n=1000 篇文章會執行 1000 次 toLowerCase。建議在 article 物件儲存時預先建立 `titleLower` 快取，或接受現狀（現有規模下影響微乎其微）。

**影響**: 在 1000 篇文章下，每次輸入字元觸發重計算約 0.5-2ms（可忽略）。

---

### P4-02 🟢 `allTags` computed 在每次文章列表變動時完整重算 — 低優先

**位置**: `src/stores/article.ts:88~95`

```typescript
const allTags = computed(() => {
  return [
    ...new Set(
      articles.value.flatMap((article) => article.frontmatter.tags ?? [])
    ),
  ].sort();
});
```

**分析**: 使用 flatMap + Set + sort 是正確的去重算法。問題是每次 `articles.value` 陣列有任何變動（包括單篇文章的 content 變動），都會觸發全量重算。若有 500 篇文章各有 10 個 tag，每次重算 O(n×m)。

**建議**: 可維持現狀（規模合理）。若後期文章量超過 2000，考慮使用 `markRaw` 或分離 tag 快取 store。

---

## 效能指標比較

| 指標 | 第三次評估 | 第四次評估 | 趨勢 |
|------|-----------|-----------|------|
| 記憶體洩漏（訂閱） | P-01 已知問題 | ✅ 已修正 | ⬆️ |
| 雙重 AutoSave timer 競態 | 已知問題 | ✅ 已修正 | ⬆️ |
| v-for key 穩定性 | 不穩定（UUID）| ✅ 穩定（hash ID）| ⬆️ |
| filteredArticles 算法 | O(n×m) 多遍 | O(n) 單遍 | ⬆️ ++ |
| 測試通過數 | 373 | 373 | ➡️ |
| 新發現效能問題 | 2 個 | 2 個（低）| ➡️ |

---

## 效能工程師結語

WriteFlow 的效能問題從第一次評估的高度緊張（訂閱洩漏、多個 AutoSave 競態）到第四次評估的高健康狀態，改善軌跡非常清晰。filteredArticles 的 O(n) 單遍優化顯示開發者有意識地關注算法效率。

**建議優先項**: P4-01 和 P4-02 在當前規模下均不影響使用者體驗，可列入 Backlog 待文章量增長時再處理。當前效能階段的最重要工作已完成。

---

*第四次全面評估 — 效能 | 前次: [第三次評估](../2026-03-01-third-review/02-performance-report.md)*
