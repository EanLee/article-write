# 文章列表選擇後亂跳 Bug Fix 報告

**日期**: 2026-01-26
**影響範圍**: 文章列表 / UI
**嚴重程度**: Medium

## 問題描述

### 問題現象
在編輯模式下，當使用者點擊文章列表中的任一文章時，整個列表會跳動重新排列，導致：
- 視覺上的閃爍和跳動
- 使用者失去當前位置的視覺追蹤
- 影響連續選擇文章的流暢度
- 降低使用體驗

### 發生條件
- 在編輯模式的側邊欄文章列表中
- 點擊任一文章進行編輯
- ArticleListTree 組件顯示系列分組時

### 影響範圍
- ArticleListTree 組件
- 所有使用文章列表的場景
- 使用者選擇文章的體驗

### 重現步驟
1. 開啟應用程式，切換到編輯模式
2. 在左側文章列表中點擊任一文章
3. 觀察列表會重新排序並跳動
4. 連續點擊多篇文章，問題持續發生

## 原因分析

### 程式碼層面問題

在 `ArticleListTree.vue` 的 `seriesGroups` computed 中：

```typescript
// 系列文章排序
const sorted = articles.sort((a, b) => {  // ❌ 問題：直接修改原陣列
  const orderA = a.frontmatter.seriesOrder || 999
  const orderB = b.frontmatter.seriesOrder || 999
  return orderA - orderB
})

// 獨立文章排序
articles: groups.get('_standalone')!.sort((a, b) =>  // ❌ 問題：直接修改原陣列
  new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
)
```

### 根本原因

1. **Array.sort() 是原地修改（Mutate In-Place）**：
   - JavaScript 的 `Array.sort()` 會直接修改原始陣列
   - 不會創建新陣列

2. **觸發 Vue 響應式系統**：
   - Vue 3 的響應式系統會追蹤陣列的變化
   - 直接修改 Store 中的陣列會觸發響應式更新
   - 導致所有依賴該陣列的 computed 重新計算

3. **連鎖反應**：
   ```
   點擊文章
     ↓
   setCurrentArticle() (Store mutation)
     ↓
   Store 的 articles 陣列被標記為「可能已變更」
     ↓
   seriesGroups computed 重新計算
     ↓
   在原陣列上 sort() → 觸發響應式
     ↓
   整個列表重新渲染 + 重新排序
     ↓
   視覺上的跳動
   ```

4. **Computed 的副作用**：
   - Computed 應該是純函數，不應該有副作用
   - 直接修改輸入的陣列違反了這個原則
   - Vue 開發工具甚至會對此發出警告

### Vue 3 響應式原理

Vue 3 使用 Proxy 追蹤物件和陣列的變化：
```javascript
// 簡化的概念
const proxyArray = new Proxy(originalArray, {
  set(target, key, value) {
    // 任何修改都會觸發更新
    trigger(target, key)
    return Reflect.set(target, key, value)
  }
})
```

當執行 `array.sort()` 時，內部會進行多次元素交換（set 操作），每次都可能觸發響應式更新。

## 修正方式

### 修改的檔案
`src/components/ArticleListTree.vue`

### 修改的邏輯

**使用陣列展開運算子創建副本**：

```typescript
// 修改前
const sorted = articles.sort((a, b) => {
  const orderA = a.frontmatter.seriesOrder || 999
  const orderB = b.frontmatter.seriesOrder || 999
  return orderA - orderB
})

// 修改後
const sorted = [...articles].sort((a, b) => {  // ✅ 創建副本
  const orderA = a.frontmatter.seriesOrder || 999
  const orderB = b.frontmatter.seriesOrder || 999
  return orderA - orderB
})
```

```typescript
// 修改前
articles: groups.get('_standalone')!.sort((a, b) =>
  new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
)

// 修改後
const standaloneArticles = groups.get('_standalone')!
articles: [...standaloneArticles].sort((a, b) =>  // ✅ 創建副本
  new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
)
```

### 技術細節

**展開運算子 (Spread Operator)**：
```typescript
const original = [1, 2, 3]
const copy = [...original]  // 淺拷貝

copy.sort()  // 只修改 copy
console.log(original)  // [1, 2, 3] 不受影響
```

**注意事項**：
- `[...array]` 是淺拷貝（Shallow Copy）
- 對於物件陣列，物件本身是引用（Reference）
- 但陣列結構本身是新的，所以 sort() 不會影響原陣列

在我們的案例中：
```typescript
const articles = [articleA, articleB, articleC]  // Store 中的原始陣列
const copy = [...articles]  // 新陣列，但元素是相同的物件引用
copy.sort()  // 只改變 copy 的順序，不影響 articles
```

這是安全的，因為：
1. 我們不修改 article 物件本身（不變性）
2. 只改變陣列的順序（創建新陣列）
3. Vue 不會追蹤到原陣列的變化

### 為什麼這個方案能解決問題

1. **避免副作用**：
   - Computed 不再修改輸入資料
   - 符合函數式編程原則
   - Vue 響應式系統不會被意外觸發

2. **保持資料不變性（Immutability）**：
   - Store 中的原始陣列保持不變
   - 只在 computed 中創建排序後的新陣列
   - 遵循 Vue 和 Vuex/Pinia 的最佳實踐

3. **效能優化**：
   - 減少不必要的響應式觸發
   - 避免整個列表的重新渲染
   - 只在資料真正改變時才更新

### 其他替代方案

**方案 A**：使用 `Array.prototype.toSorted()` (ES2023)
```typescript
const sorted = articles.toSorted((a, b) => ...)  // 不修改原陣列
```
✅ 優點：更語義化，明確表達「創建排序的副本」
❌ 缺點：瀏覽器相容性問題（需要 polyfill）

**方案 B**：使用 `Array.from()` + `sort()`
```typescript
const sorted = Array.from(articles).sort((a, b) => ...)
```
✅ 優點：也能創建副本
❌ 缺點：比展開運算子冗長，無實質優勢

**方案 C**：在 Store 中預先排序
```typescript
// 在 Store 的 getter 中處理排序
const sortedArticles = computed(() => [...articles.value].sort(...))
```
❌ 缺點：增加 Store 複雜度，排序邏輯應該在組件層

**選擇理由**：
展開運算子是最簡潔、最符合現代 JavaScript 慣例的方案，且相容性好（ES6）。

## 相關 Commit

- `148f3ae`: fix(ui): 修復文章列表選擇後亂跳的問題

## 延伸知識

### Vue 3 響應式的最佳實踐

1. **Computed 應該是純函數**：
   ```typescript
   // ❌ 不好
   const result = computed(() => {
     array.sort()  // 副作用！
     return array
   })

   // ✅ 好
   const result = computed(() => {
     return [...array].sort()  // 無副作用
   })
   ```

2. **避免在 Computed 中修改響應式資料**：
   - Computed 只應該讀取和計算
   - 修改應該在 methods 或 actions 中進行

3. **陣列操作最佳實踐**：
   - `map()`, `filter()`, `reduce()` → 安全（創建新陣列）
   - `sort()`, `reverse()`, `splice()` → 危險（修改原陣列）
   - 需要時使用 `[...]` 創建副本

### 參考資料
- [MDN: Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
- [Vue 3 Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Immutability in JavaScript](https://developer.mozilla.org/en-US/docs/Glossary/Immutable)
