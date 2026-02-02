# 文章列表排序導致亂跳 Bug Fix 報告

**日期**: 2026-01-26
**影響範圍**: 文章列表 / Store / UI
**嚴重程度**: High

## 問題描述

### 問題現象
在編輯模式下，當使用者點擊文章列表中的任一文章時，整個列表會重新排序並跳動，導致：
- 視覺上的閃爍和跳動
- 使用者失去當前位置的視覺追蹤
- 影響連續選擇文章的流暢度
- 降低使用體驗

### 發生條件
- 在編輯模式的側邊欄文章列表中
- 點擊任一文章進行切換
- ArticleListTree 組件顯示時

### 影響範圍
- 所有使用文章列表的場景
- 使用者選擇文章的體驗
- 系列分組視圖

### 重現步驟
1. 開啟應用程式，切換到編輯模式
2. 在左側文章列表中點擊任一文章
3. 觀察列表會重新排序並跳動
4. 連續點擊多篇文章，問題持續發生

## 原因分析

### 程式碼層面問題

在 `src/stores/article.ts` 的 `filteredArticles` computed 中：

```typescript
.sort((a, b) => {
  // 按最後修改時間降序排列（最新的在前）
  const timeA = a.lastModified instanceof Date ? a.lastModified.getTime() : new Date(a.lastModified).getTime()
  const timeB = b.lastModified instanceof Date ? b.lastModified.getTime() : new Date(b.lastModified).getTime()
  return timeB - timeA
})
```

### 根本原因

1. **不穩定的排序依據**：
   - `filteredArticles` 使用 `lastModified` 作為排序依據
   - 每次儲存文章都會更新 `lastModified` 時間
   - 導致文章在列表中的位置不斷改變

2. **自動儲存機制觸發**：
   - 切換文章時，`setCurrentArticle` 會觸發 `autoSaveService.saveOnArticleSwitch()`
   - 即使內容沒有修改，也可能更新 `lastModified`（需進一步驗證）
   - 每次儲存後，`updateArticle` 更新 store 狀態
   - 觸發 `filteredArticles` 重新計算並重新排序

3. **連鎖反應**：
   ```
   點擊文章
     ↓
   setCurrentArticle()
     ↓
   autoSaveService.saveOnArticleSwitch(previousArticle)
     ↓
   (可能) 儲存並更新 lastModified
     ↓
   updateArticle() 更新 store
     ↓
   filteredArticles 重新計算
     ↓
   按新的 lastModified 重新排序
     ↓
   列表順序改變 → 視覺跳動
   ```

4. **缺少使用者控制**：
   - 排序方式硬編碼在 computed 中
   - 使用者無法選擇排序方式
   - 按時間排序對於某些使用情境不適合（如系列文章）

### 技術細節

**Vue 響應式連鎖觸發**：
```typescript
// Store mutation
updateArticle(articleToSave) {
  articles.value[index] = { ...updatedArticle }  // 觸發 articles.value 變化
}

// Computed 自動重新計算
const filteredArticles = computed(() => {
  return articles.value  // 依賴 articles.value
    .filter(...)
    .sort(...)  // 每次都重新排序
})
```

當 `articles.value` 中任何一篇文章的 `lastModified` 改變，整個 computed 重新計算，並重新排序所有文章。

## 修正方式

### 修改的檔案
- `src/stores/article.ts`
- `src/components/EditorPane.vue` (行號問題修正)

### 修改的邏輯

**改為穩定的排序方式（按標題排序）**：

```typescript
// 修改前
.sort((a, b) => {
  // 按最後修改時間降序排列（最新的在前）
  const timeA = a.lastModified instanceof Date ? a.lastModified.getTime() : new Date(a.lastModified).getTime()
  const timeB = b.lastModified instanceof Date ? b.lastModified.getTime() : new Date(b.lastModified).getTime()
  return timeB - timeA
})

// 修改後
.sort((a, b) => {
  // 按標題字母順序排序（穩定排序，不會因儲存而跳動）
  return a.title.localeCompare(b.title, 'zh-TW')
})
```

### 為什麼這個方案能解決問題

1. **穩定排序**：
   - 標題不會因為儲存而改變
   - 文章在列表中的位置固定
   - 使用者視覺體驗穩定

2. **支援中文排序**：
   - 使用 `localeCompare('zh-TW')` 正確處理中文字排序
   - 按照筆劃順序排列

3. **可預測性**：
   - 使用者可以透過標題快速找到文章
   - 字母順序是通用且直觀的排序方式

4. **不受儲存影響**：
   - 即使自動儲存更新 `lastModified`
   - 排序順序保持不變
   - 避免視覺跳動

### 其他替代方案

**方案 A**：添加排序選項讓使用者選擇
```typescript
const sortBy = ref<'title' | 'lastModified' | 'created'>('title')

const filteredArticles = computed(() => {
  const filtered = articles.value.filter(...)

  switch (sortBy.value) {
    case 'title':
      return filtered.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))
    case 'lastModified':
      return filtered.sort((a, b) => b.lastModified - a.lastModified)
    case 'created':
      return filtered.sort((a, b) => b.createdAt - a.createdAt)
  }
})
```
✅ 優點：彈性最大，使用者可自選
❌ 缺點：需要額外 UI 設計，增加複雜度

**方案 B**：固定使用創建時間排序
```typescript
.sort((a, b) => {
  const timeA = new Date(a.frontmatter.date).getTime()
  const timeB = new Date(b.frontmatter.date).getTime()
  return timeB - timeA
})
```
✅ 優點：按創建時間排序，也是穩定的
❌ 缺點：依賴 frontmatter.date 的正確性，可能不準確

**方案 C**：只在手動儲存時更新 lastModified，自動儲存不更新
```typescript
async function saveArticle(article: Article, options?: { silent?: boolean }) {
  const articleToSave = {
    ...article,
    // 只在非靜默模式更新 lastModified
    lastModified: options?.silent ? article.lastModified : new Date()
  }
}
```
❌ 缺點：治標不治本，lastModified 語意混亂

**選擇理由**：
採用的方案（按標題排序）是最簡單且最穩定的方案，不需要額外 UI，也不依賴可能不準確的時間戳。未來可以擴展為方案 A，添加使用者可選的排序方式。

## 相關 Commit

- `da9e6d8`: fix(ui): 修復文章列表亂跳與行號顯示問題

## 待驗證問題

### 自動儲存邏輯需要驗證

目前發現 `autoSaveService.saveOnArticleSwitch()` 可能在內容未修改時也觸發儲存：

```typescript
async saveOnArticleSwitch(previousArticle: Article | null): Promise<void> {
  // 檢查前一篇文章是否有變更
  if (this.hasContentChanged(previousArticle)) {
    // 理論上只有內容改變才會儲存
    await this.saveCallback(previousArticle)
  }
}
```

**需要驗證**：
1. `hasContentChanged` 是否正確比對內容
2. `setCurrentArticle` 是否正確更新 `lastSavedContent`
3. 切換文章時是否真的有內容變更

**建議**：
添加詳細日誌追蹤自動儲存觸發的原因，確保只在真正有變更時才儲存。

## 額外修復：EditorPane 行號顯示問題

### 問題
開啟行號後，文章內容消失，只顯示行號列。

### 原因
`.editor-textarea` 同時設定 `width: 100%` 和 `flex: 1`，導致：
- 行號列 (50px) + textarea (100%) > 100% 容器寬度
- Textarea 被推出可視範圍

### 修正
```css
/* 修改前 */
.editor-textarea {
  width: 100%;
  flex: 1;
  ...
}

/* 修改後 */
.editor-textarea {
  flex: 1;  /* 移除 width: 100% */
  box-sizing: border-box;
  min-width: 0;  /* 防止 flex 子元素溢出 */
  ...
}
```

## 驗證清單

**使用者驗證項目**：

文章列表排序問題：
- [ ] 點擊任意文章，列表順序不再跳動
- [ ] 文章按標題字母順序排列（中文筆劃順序）
- [ ] 連續切換多篇文章，順序保持穩定
- [ ] 系列分組視圖正常運作
- [ ] 搜尋功能正常

EditorPane 行號問題：
- [ ] 開啟行號後，文章內容正常顯示
- [ ] 行號與內容行對齊
- [ ] 滾動時行號與內容同步
- [ ] 關閉行號後恢復正常

自動儲存檢查：
- [ ] 切換文章時，控制台輸出是否顯示儲存訊息
- [ ] 如果沒有修改內容，是否不應該觸發儲存
- [ ] 確認 `hasContentChanged` 邏輯正確

## 參考資料

- [Array.prototype.localeCompare()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare)
- [Vue 3 Computed Properties](https://vuejs.org/guide/essentials/computed.html)
- [CSS Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)
