# 技術討論 T-002 — 技術評估報告：部落格編輯器自動儲存機制

> **日期**: 2026-02-14
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）
> **背景**: CTO 指示評估是否應在文章開啟時預先計算 Hash，並以 Hash 差異作為自動儲存觸發條件

---

## 評估問題

> **CTO 原文**：
> 「技術長是不是在文章開啟的時候，就要先計算全面文章的 hash，如果說有開啟自動儲存的機制，hash 值不同，才會真正的進行儲存動作？評估一下這樣的可行性如何，如果可以，或者是有更好的做法，都把它記錄下來並且做對應的調整。」

---

## 討論記錄

---

### Sam：問題背景

**Sam**：這個評估的出發點是「避免不必要的儲存」。現況下自動儲存每 30 秒觸發一次，如果文章根本沒有修改，我們也在做一次完整的字串比對。CTO 想知道能不能用 Hash 讓這個判斷更聰明。

在開始評估之前，我們先確認一下現行實作的架構。Lin 你看一下 `AutoSaveService.ts`，給我們說說現況。

---

### Lin：現行實作分析

**Lin**：我看了 `AutoSaveService.ts`，現行機制是這樣的：

**變更偵測（快照比較）**

```typescript
private lastSavedContent: string = ""
private lastSavedFrontmatter: Partial<Frontmatter> = {}

private hasContentChanged(article: Article): boolean {
  return article.content !== this.lastSavedContent
    || !isEqual(article.frontmatter, this.lastSavedFrontmatter)
}
```

- 開啟文章時（`setCurrentArticle`），把當前 content + frontmatter 存成快照
- 每次儲存後（`updateLastSavedContent`），更新快照
- 定時觸發時，用 `hasContentChanged()` 比對當前內容與快照

**狀態機（`SaveStatus`）**

```
Saved → (markAsModified) → Modified → (performAutoSave) → Saving → Saved
                                                              ↓
                                                            Error
```

`markAsModified()` 在編輯器內容變更時呼叫（防抖 100ms），把狀態從 `Saved` 更新為 `Modified`。

**關鍵觀察**：系統已經有 `SaveStatus.Modified` 這個 dirty flag，但 `performAutoSave()` 完全沒有用到它——每次觸發都直接做字串比對。

---

### Wei：從前端角度看

**Wei**：我看了 `EditorContent.vue` 那邊，每次 keydown 都會觸發 `autoSaveService.markAsModified()`。
所以在正常使用流程中，只要使用者有打字，`saveState` 一定會變成 `Modified`。
如果使用者完全沒打字，`saveState` 會維持 `Saved`。

這個 dirty flag 其實已經在正確的地方被設置，只是 `performAutoSave()` 沒有把它當快速路徑用。

---

### Lin：三個方案的比較

**Lin**：我整理了三個方案：

#### 方案 A：Hash 計算（CTO 提問的方向）

開啟文章時計算 content 的 SHA-256，每次 `performAutoSave()` 重新計算，比對 hash 值。

```typescript
// 開啟文章時
this.lastSavedHash = await crypto.subtle.digest('SHA-256', ...)

// performAutoSave 時
const currentHash = await crypto.subtle.digest('SHA-256', ...)
if (currentHash !== this.lastSavedHash) { /* 儲存 */ }
```

**優點**：比對是 O(1)（對比 hash 兩個字串）
**缺點**：
- 計算 hash 本身是 O(n)——不比字串比較省工
- 需要非同步（crypto.subtle 是 Promise）
- 需要額外序列化 frontmatter（hash 只接受 binary，不接受物件）
- 對 <100KB 的 Markdown，hash 計算與字串比較效能等效，甚至略差

**結論**：方案 A 是偽優化——hash 計算的本質是「掃整個字串一遍」，和直接字串比較一樣是 O(n)。

---

#### 方案 B：字串快照（現行）

```typescript
private hasContentChanged(article: Article): boolean {
  return article.content !== this.lastSavedContent
    || !isEqual(article.frontmatter, this.lastSavedFrontmatter)
}
```

**優點**：實作簡單，邏輯正確，lodash `isEqual` 對 frontmatter 做深度比較
**缺點**：`performAutoSave()` 每次都會做字串比較，即使文章根本沒被修改過

---

#### 方案 C：Dirty Flag 快速路徑（建議方案）

在現有快照基礎上，讓 `performAutoSave()` 先看 `saveState`：

```typescript
private async performAutoSave(): Promise<void> {
  // ...

  // Dirty flag 快速路徑：Saved 狀態直接 return，不做任何字串比較
  if (this.saveState.value.status === SaveStatus.Saved) {
    return
  }

  // 再確認內容是否真的有變更（防止邊緣情況）
  if (this.hasContentChanged(currentArticle)) {
    // 執行儲存
  }
}
```

**為什麼是雙重保護**：
- `saveState` 為快速路徑——大多數情況下（使用者沒有編輯），直接 return
- `hasContentChanged()` 為安全網——處理 `markAsModified` 可能沒觸發的邊緣情況（例如：programmatic 的 content 變更）

**優點**：
- 零額外複雜度（`saveState` 本來就存在）
- 定時器每 30 秒觸發，在使用者未編輯時完全不做字串比較
- 雙重保護確保正確性

**缺點**：無

---

### Sam：決策

**Sam**：清楚了。結論如下：

1. **方案 A（Hash）**：不採用。Hash 計算的複雜度與字串比較等效，引入非同步與額外複雜度，沒有實際收益。

2. **方案 C（Dirty Flag 快速路徑）**：採用。這是在現有正確實作上的最小改動，收益明確——定時觸發的 `performAutoSave()` 在多數情況下不做任何字串比較。

3. **回應 CTO 的核心問題**：現行實作已經有等效於 Hash 的機制（字串快照），CTO 的直覺是對的——「只在有變更時才儲存」。我們需要的是把 `SaveStatus.Modified` 這個已有的 dirty flag 用起來，而不是引入新的 hash 計算。

**Wei**：實作量很小，就是在 `performAutoSave()` 開頭加四行。

**Lin**：對應的測試要補上 `markAsModified()` 呼叫，讓測試反映真實使用情境。

---

### Sam：收尾

**Sam**：

執行事項：
| # | 項目 | 負責 | 狀態 |
|---|------|------|------|
| 1 | `AutoSaveService.performAutoSave()` 加入 Dirty Flag 快速路徑 | Lin | ✅ 完成 |
| 2 | `AutoSaveService.test.ts` 補上 `markAsModified()` 呼叫 | Lin | ✅ 完成 |

---

## 決議

**採用方案 C（Dirty Flag 快速路徑）**，不採用 Hash 計算方案。

理由：
- Hash 計算本質上是 O(n) 操作，與字串比較等效，引入額外複雜度無收益
- `SaveStatus.Modified` dirty flag 已正確實作，只需在 `performAutoSave()` 加入快速路徑即可
- 現行字串快照（`hasContentChanged`）保留作為安全網，確保正確性

**相關 Commit**:
- `5454e6c`: `perf(service): 加入 Dirty Flag 快速路徑，減少不必要的字串比較`
