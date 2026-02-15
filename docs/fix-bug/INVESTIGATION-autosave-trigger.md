# 自動儲存誤觸發調查

## 問題現象

用戶回報：點擊文章後仍然會跳動，懷疑是在不應該的時候觸發了存檔。

## 完整流程分析

### 當用戶點擊文章時的調用順序

```
ArticleManagement.handleRowClick(article)
  ↓
ArticleManagement.handleEditArticle(article)
  ↓
articleStore.setCurrentArticle(article)
  ↓
  ┌─────────────────────────────────────┐
  │ setCurrentArticle 內部流程：        │
  ├─────────────────────────────────────┤
  │ 1. previousArticle = currentArticle.value  // 可能是 null 或其他文章
  │ 2. if (previousArticle && previousArticle !== article):
  │      autoSaveService.saveOnArticleSwitch(previousArticle)
  │        ↓
  │      hasContentChanged(previousArticle)
  │        ↓
  │      比對：previousArticle.content === this.lastSavedContent?
  │        ↓
  │      ⚠️ 問題：this.lastSavedContent 是誰的內容？
  │        ↓
  │      如果判斷為有變更 → saveArticle(previousArticle)
  │        ↓
  │      更新 lastModified → 寫入檔案 → updateArticle
  │        ↓
  │      觸發 articles.value 更新 → 列表重新渲染
  │
  │ 3. currentArticle.value = article
  │ 4. autoSaveService.setCurrentArticle(article)
  │      ↓
  │    updateLastSavedContent(article)  // ⚠️ 這時才更新 lastSavedContent
  └─────────────────────────────────────┘
```

### 問題核心

**時序問題**：
1. `saveOnArticleSwitch` 在**檢查** previousArticle 時，使用的是**全局的** `lastSavedContent`
2. 但 `lastSavedContent` 是在 `setCurrentArticle(newArticle)` 時才更新為 newArticle 的內容
3. 這導致 `lastSavedContent` 可能是：
   - 空字串（初始狀態）
   - 其他文章的內容（上一次的 currentArticle）

**場景示例**：

#### 場景 1：首次點擊文章
```
初始狀態：
  currentArticle = null
  lastSavedContent = ''

用戶點擊文章 A：
  1. previousArticle = null
  2. 不執行 saveOnArticleSwitch (因為 previousArticle 是 null)
  3. currentArticle = articleA
  4. lastSavedContent = articleA.content  ✅ 正常

結果：不會觸發誤存檔
```

#### 場景 2：從文章 A 切換到文章 B
```
初始狀態：
  currentArticle = articleA
  lastSavedContent = articleA.content  (場景 1 設定的)

用戶點擊文章 B：
  1. previousArticle = articleA
  2. 執行 saveOnArticleSwitch(articleA)
     hasContentChanged(articleA):
       articleA.content === lastSavedContent?  // ✅ 相等！
       → 返回 false
       → 不儲存
  3. currentArticle = articleB
  4. lastSavedContent = articleB.content

結果：正常，不會誤存檔
```

#### 場景 3：從文章 A 切換到 B，再切換回 A（關鍵！）
```
初始狀態（接場景 2）：
  currentArticle = articleB
  lastSavedContent = articleB.content

用戶點擊文章 A：
  1. previousArticle = articleB
  2. 執行 saveOnArticleSwitch(articleB)
     hasContentChanged(articleB):
       articleB.content === lastSavedContent?
       articleB.content === articleB.content?  // ✅ 相等
       → 返回 false
       → 不儲存
  3. currentArticle = articleA
  4. lastSavedContent = articleA.content

結果：正常，不會誤存檔
```

#### 場景 4：編輯文章後切換（可能的問題）
```
初始狀態：
  currentArticle = articleA
  lastSavedContent = articleA.content (原始內容)

用戶在編輯器中修改 articleA：
  currentArticle.value.content 改變了
  但 lastSavedContent 沒有更新（直到手動儲存或自動儲存）

用戶點擊文章 B（切換前沒有儲存）：
  1. previousArticle = articleA (已修改的版本)
  2. 執行 saveOnArticleSwitch(articleA)
     hasContentChanged(articleA):
       articleA.content === lastSavedContent?
       (修改後的內容) === (原始內容)?  // ❌ 不相等
       → 返回 true
       → ✅ 正確地儲存！（這是預期行為）
```

## 結論

**分析結果**：自動儲存邏輯在理論上是正確的！

1. **場景 2, 3**：未編輯的文章切換 → 不會誤存檔 ✅
2. **場景 4**：編輯後切換 → 正確地自動儲存 ✅

## 但為什麼還會跳動？

### 可能原因 1：響應式更新鏈

即使 `saveOnArticleSwitch` 判斷為「不需要儲存」，只要它被調用了，就可能觸發某些響應式更新。

**檢查點**：
- `saveOnArticleSwitch` 中的 console.log 會觸發什麼嗎？
- `hasContentChanged` 的調用本身會觸發什麼嗎？

### 可能原因 2：檔案監聽仍在觸發

即使沒有實際儲存文件，之前的某次儲存（比如手動儲存）可能在幾秒後才被檔案監聽偵測到。

**時間軸**：
```
T=0s : 用戶之前手動儲存了文章 A
T=1s : 用戶點擊切換到文章 B
       → 不需要儲存 articleA（因為剛剛儲存過）
       → 列表目前沒有跳動
T=3s : 檔案監聽終於偵測到 T=0s 的儲存
       → reloadArticleByPath(articleA)
       → 更新 articles.value
       → 觸發列表重新渲染
       → ❌ 列表跳動了！
```

### 可能原因 3：updateArticle 的時機問題

檢查 `updateArticle` 是否被意外調用：

```typescript
function updateArticle(updatedArticle: Article) {
  const index = articles.value.findIndex(a => a.id === updatedArticle.id)
  if (index !== -1) {
    articles.value[index] = { ...updatedArticle }  // ← 觸發響應式
  }

  if (currentArticle.value?.id === updatedArticle.id) {
    currentArticle.value = { ...updatedArticle }  // ← 觸發響應式
  }
}
```

## 驗證步驟

### 步驟 1：確認是否真的在儲存

請打開 DevTools Console，執行以下操作：

1. 點擊文章 A
2. **不要編輯**，立即點擊文章 B
3. 觀察 Console 輸出

**預期輸出**：
```
🔍 切換文章檢查: Article A
hasChanged: false
⏭️  內容無變更，跳過儲存: Article A
```

**如果輸出是**：
```
🔍 切換文章檢查: Article A
hasChanged: true  // ❌ 為什麼會是 true？
✅ 內容已變更，執行自動儲存: Article A
```

那麼確實有誤判問題。

### 步驟 2：確認跳動的時機

1. 記錄點擊文章的確切時間
2. 記錄列表跳動的時間
3. 計算時間差

**如果時間差 > 2 秒**：
- 可能是檔案監聽延遲觸發的問題
- 不是 saveOnArticleSwitch 的問題

**如果時間差 < 1 秒**：
- 可能是 saveOnArticleSwitch 或其他響應式更新

## 下一步行動

根據驗證結果：

### 如果沒有誤判（hasChanged: false）
→ 問題不在自動儲存邏輯
→ 需要進一步優化檔案監聽延遲問題

### 如果有誤判（hasChanged: true）
→ 需要修復 hasContentChanged 的判斷邏輯
→ 可能需要為每篇文章單獨記錄 savedContent

---

**調查日期**: 2026-01-26
**狀態**: 等待用戶提供 Console 日誌
