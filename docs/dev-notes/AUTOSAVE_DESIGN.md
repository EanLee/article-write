# AutoSave 設計說明

**建立日期**: 2026-02-14
**最後更新**: 2026-02-14

---

## 現行架構

`AutoSaveService` 負責管理文章的自動儲存。核心機制：

### 變更偵測

使用**快照比較**（Snapshot Comparison）：

```typescript
private lastSavedContent: string = ""
private lastSavedFrontmatter: Partial<Frontmatter> = {}

private hasContentChanged(article: Article): boolean {
  return article.content !== this.lastSavedContent
    || !isEqual(article.frontmatter, this.lastSavedFrontmatter)
}
```

- 開啟文章時（`setCurrentArticle`），記錄初始快照
- 每次儲存後（`updateLastSavedContent`），更新快照
- `hasContentChanged()` 比較當前內容與快照

### 狀態追蹤

`saveState.status` 為 `SaveStatus` enum：

| 狀態 | 說明 |
|------|------|
| `Saved` | 已儲存，無未儲存變更 |
| `Modified` | 已修改，等待自動儲存 |
| `Saving` | 正在儲存中 |
| `Error` | 儲存失敗 |

編輯器內容變更時呼叫 `markAsModified()`（防抖 100ms），將狀態從 `Saved` 更新為 `Modified`。

---

## 設計評估：Hash vs. 快照 vs. Dirty Flag

### 方案比較

| 方案 | 實作複雜度 | 效能 | 正確性 |
|------|-----------|------|--------|
| Hash 計算 | 高 | 略優於字串比較 | 等效 |
| 字串快照（現行） | 低 | O(n) | ✅ 正確 |
| Dirty Flag 快速路徑 | 低（在現行基礎上） | 最優 | ✅ 正確 |

**決策（2026-02-14）**：不導入 Hash 計算。理由：

1. **等效性**：Hash 比對本質上等同於字串比對，只是多了一次 hash 計算的額外開銷
2. **規模不符**：Markdown 文章通常 < 100KB，字串比對在這個量級沒有效能瓶頸
3. **現行快照已足夠**：現行實作已正確處理「只在真正有變更時才儲存」的需求

### 選擇方案：Dirty Flag 快速路徑

在現有字串快照基礎上，加入 `saveState` 作為快速路徑：

```typescript
private async performAutoSave(): Promise<void> {
  // ...

  // Dirty flag 快速路徑：狀態為 Saved 時直接跳過字串比較
  if (this.saveState.value.status === SaveStatus.Saved) {
    return
  }

  // 再做字串比對確認（防止 markAsModified 與實際變更不同步）
  if (this.hasContentChanged(currentArticle)) {
    // 執行儲存...
  }
}
```

**優點**：
- 定時觸發的 `performAutoSave`（每 30 秒）在多數情況下不做任何字串比較
- 雙重保護：即使 `saveState` 為 `Modified`，也會再確認 `hasContentChanged`
- 實作簡單，不改變現有 `markAsModified` 流程

---

## 自動儲存觸發流程

```
使用者編輯內容
  → 編輯器觸發 markAsModified()（防抖 100ms）
  → saveState = Modified

定時器觸發 performAutoSave()（每 30 秒）
  → 若 saveState === Saved → return（快速路徑）
  → 若 saveState === Modified → hasContentChanged() 確認
    → 有變更 → 執行儲存 → saveState = Saved → 更新快照
    → 無變更 → 不儲存（邊緣情況保護）

切換文章 saveOnArticleSwitch()
  → 直接呼叫 hasContentChanged()（保證儲存正確性）
```

---

## 已知限制

1. **`saveOnArticleSwitch` 不使用快速路徑**：切換文章是高風險操作，直接做完整比對確保不丟失變更
2. **Error 狀態不自動重試**：`performAutoSave` 在 `Error` 狀態下仍會嘗試（因為 `!== Saved`），下次定時器觸發時會重試
3. **`loadArticles` skipped test**：`tests/stores/article.path-handling.test.ts` 中有一個 `it.skip`，待日後配合 `loadAllArticles` 掃描邏輯重寫 mock 後修復
