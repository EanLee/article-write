# 技術討論 T-002 — 自動儲存機制評估與實作決策

> **日期**: 2026-02-14
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）
> **依據**: CTO 指示評估 + [技術評估報告：部落格編輯器自動儲存機制](../dev-notes/技術評估報告：部落格編輯器自動儲存機制.md)

---

## 任務清單

| # | 任務 | 負責 | 狀態 |
|---|------|------|------|
| 1 | 確認現行 `AutoSaveService` 架構是否符合評估報告建議方案 | Lin | ✅ 完成 |
| 2 | 補實「三層過濾策略」中缺失的 False Positive 處理 | Lin | ✅ 完成 |
| 3 | 更新 `AutoSaveService.test.ts`，補上 False Positive 測試案例 | Lin | ✅ 完成 |

---

## 討論記錄

---

### Sam：評估背景

**Sam**：CTO 的問題是：「文章開啟時是否應先計算 Hash，自動儲存時 Hash 不同才真正儲存？」

在我們回答之前，先讀一下既有的技術評估報告——這份文件已經系統性地分析了這個問題。

> 📄 參考：[技術評估報告：部落格編輯器自動儲存機制](../dev-notes/技術評估報告：部落格編輯器自動儲存機制.md)

**Lin**，你把報告的結論跟現行實作對照一下。

---

### Lin：評估報告核心結論

**Lin**：報告的核心結論是採用**混合式三層過濾策略（Hybrid Approach）**，排除了 Hash 方案。

#### 為什麼不用 Hash

報告說得很清楚：

> Hash 運算本質上仍需讀取每一個字元進行數學運算——這與字串比對的 O(n) 完全等效，但還需要額外的數學計算開銷。對於 <100KB 的 Markdown 文章，直接字串比對效能消耗極低，且開發維護成本遠低於引入 Hash 機制。

另外還有：
- 瀏覽器原生 MD5 不存在，需引入外部套件
- 原生 `crypto.subtle`（SHA-256）是 Promise，引入非同步複雜度
- frontmatter 是物件，還要額外序列化才能 hash

**結論**：Hash 是偽優化。

#### 報告建議的三層架構

```
第一層（UI 層）     — Dirty Flag
                      onChange → isDirty = true
                      ↓
第二層（排程層）    — Timer 快速路徑
                      isDirty === false → return（完全不執行後續）
                      ↓
第三層（資料層）    — String Compare
                      content === lastSaved → 重置 isDirty，不儲存（False Positive 處理）
                      content !== lastSaved → 執行儲存，更新快照，重置 isDirty
```

---

### Lin：現行實作對照

**Lin**：我對照了 `AutoSaveService.ts`：

| 報告建議 | 現行實作 | 狀態 |
|---------|---------|------|
| 第一層 Dirty Flag（`isDirty = true`）| `markAsModified()` → `saveState = Modified` | ✅ 已有 |
| 第二層 Timer 快速路徑（`isDirty === false` → return）| `saveState === Saved` → return（上次修改加入）| ✅ 已有 |
| 第三層 True Positive → 儲存 | `hasContentChanged()` → 執行 `saveCallback` | ✅ 已有 |
| 第三層 False Positive → 重置 dirty flag | **缺失** | ❌ 未實作 |

**缺失的是什麼**：當 `saveState === Modified`，但 `hasContentChanged()` 回傳 `false`（使用者打了又刪回原狀）時，`saveState` 沒有被重置回 `Saved`。它會卡在 `Modified` 狀態，導致每次定時觸發都執行一次字串比對，直到下次真正的儲存為止。

**Wei**：這也會造成 UI 上一直顯示「已修改」的狀態，雖然內容根本沒變。

**Sam**：這個要修。Lin 你來做。

---

### Lin：修正內容

**Lin**：修正非常小，只需要在 `performAutoSave()` 加一個 else 分支：

**修正前**：
```typescript
// Dirty flag 快速路徑
if (this.saveState.value.status === SaveStatus.Saved) {
  return;
}

if (this.hasContentChanged(currentArticle)) {
  // 執行儲存...
}
// ← 若 hasContentChanged() === false，什麼都不做，saveState 留在 Modified
```

**修正後（符合報告三層架構）**：
```typescript
// 第二層：Dirty flag 快速路徑
if (this.saveState.value.status === SaveStatus.Saved) {
  return;
}

// 第三層：字串比對確認（處理 False Positive：使用者打了又刪回原狀）
if (!this.hasContentChanged(currentArticle)) {
  // 內容實際未變更，靜默重置 dirty flag
  this.updateSaveState(SaveStatus.Saved);
  return;
}

// True Positive：執行儲存
```

測試也補上了 False Positive 案例：
- `markAsModified()` 設定 `saveState = Modified`
- `getCurrentArticleCallback` 仍回傳原始文章（內容沒變）
- 定時觸發後：`saveCallback` 不被呼叫，`saveState` 重置為 `Saved`

---

### Sam：決策確認

**Sam**：綜合評估報告與現行實作，最終決策如下：

1. **Hash 方案**：不採用。理由與評估報告一致——Hash 是 O(n) 操作，與字串比對等效但複雜度更高。

2. **混合式三層過濾策略（Hybrid Approach）**：採用，並補齊缺失的 False Positive 處理。

3. **現行 `AutoSaveService` 架構判定**：設計正確，僅有 False Positive 處理的缺口需要補上。

**最終架構（完整三層）**：
```
定時觸發 performAutoSave()
  ├─ saveState === Saved  → return（第二層：Dirty flag 快速路徑）
  ├─ hasContentChanged() === false → updateSaveState(Saved) + return（第三層：False Positive 重置）
  └─ hasContentChanged() === true  → 執行儲存 → updateSaveState(Saved)（第三層：True Positive）
```

---

## 相關 Commit

- `5454e6c`: `perf(service): 加入 Dirty Flag 快速路徑，減少不必要的字串比較`
- `（本次）`: `fix(service): 補齊 False Positive 處理，符合三層過濾策略`
