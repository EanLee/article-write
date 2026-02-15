# 文章列表「跳到第一個」問題調查

## 問題描述

即使改成按標題排序（穩定排序），點擊文章後列表仍然「跳到第一個」。

## 可能原因

### 1. 滾動位置被重置

即使列表順序沒變，如果滾動容器的 `scrollTop` 被重置為 0，視覺上會跳回頂部。

**檢查點**：
- ArticleListTree 是否在 re-render 時重置滾動位置？
- 是否有程式碼主動設定 `scrollTop = 0`？

### 2. Vue 的 key 導致重新渲染

```vue
<ArticleTreeItem
  v-for="article in filteredArticles"
  :key="article.id"  <!-- 如果 id 改變會重新渲染 -->
  :article="article"
/>
```

如果 `article.id` 改變，Vue 會重新創建元素，可能導致滾動位置丟失。

**檢查點**：
- `article.id` 是否穩定？（應該是 UUID，不會改變）
- `filteredArticles` 重新計算時是否創建新的 article 物件？

### 3. currentArticle 高亮導致的自動滾動

某些 UI 庫會在元素被標記為 `:is-current="true"` 時自動滾動到該元素。

**檢查點**：
- ArticleTreeItem 組件是否有 `scrollIntoView` 邏輯？
- DaisyUI 或其他庫是否有自動滾動行為？

### 4. seriesGroups computed 觸發完全重新渲染

```typescript
const seriesGroups = computed(() => {
  const groups = new Map<string, Article[]>()

  filteredArticles.value.forEach(article => {
    const seriesName = article.frontmatter.series || '_standalone'
    if (!groups.has(seriesName)) {
      groups.set(seriesName, [])
    }
    groups.get(seriesName)!.push(article)
  })

  // 每次都創建新陣列
  const sorted = [...articles].sort(...)

  return result  // 返回全新的陣列
})
```

每次 `filteredArticles` 改變，`seriesGroups` 都會返回全新的陣列，導致 Vue 重新渲染整個列表。

### 5. collapsedGroups 狀態問題

如果 `collapsedGroups` 狀態改變，可能導致列表重新計算高度並重置滾動。

## 驗證步驟

### 步驟 1：確認是排序問題還是滾動問題

添加日誌：

```typescript
const filteredArticles = computed(() => {
  const result = articles.value
    .filter(...)
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))

  console.log('filteredArticles 重新計算:', result.map(a => a.title))
  return result
})
```

**測試**：點擊文章，觀察 Console
- 如果 `filteredArticles` **沒有重新計算** → 是滾動位置問題
- 如果 `filteredArticles` **重新計算但順序沒變** → 是 Vue re-render 問題
- 如果 `filteredArticles` **重新計算且順序改變** → 排序邏輯仍有問題

### 步驟 2：檢查滾動位置

添加 ref 和 watch：

```typescript
const treeContainerRef = ref<HTMLElement>()

watch(filteredArticles, () => {
  console.log('filteredArticles 改變，當前 scrollTop:', treeContainerRef.value?.scrollTop)
})
```

### 步驟 3：檢查是否有自動滾動

在 ArticleTreeItem.vue 中搜尋：

```typescript
// 搜尋 scrollIntoView
// 搜尋 scrollTop =
```

## 臨時解決方案

保存和恢復滾動位置：

```typescript
// ArticleListTree.vue
const treeContainerRef = ref<HTMLElement>()
const savedScrollTop = ref(0)

function selectArticle(article: Article) {
  // 保存當前滾動位置
  if (treeContainerRef.value) {
    savedScrollTop.value = treeContainerRef.value.scrollTop
  }

  articleStore.setCurrentArticle(article)

  // 恢復滾動位置
  nextTick(() => {
    if (treeContainerRef.value) {
      treeContainerRef.value.scrollTop = savedScrollTop.value
    }
  })
}
```

## 根本解決方案

### 如果是因為 updateArticle 觸發 re-render

避免在 `setCurrentArticle` 時觸發 store 更新：

```typescript
function setCurrentArticle(article: Article | null) {
  const previousArticle = currentArticle.value

  if (previousArticle && previousArticle !== article) {
    autoSaveService.saveOnArticleSwitch(previousArticle)
  }

  currentArticle.value = article
  autoSaveService.setCurrentArticle(article)

  // ❌ 不要在這裡更新 articles.value
  // updateArticle(article)
}
```

### 如果是因為 filteredArticles 依賴 currentArticle

檢查 `filteredArticles` computed 是否意外依賴 `currentArticle.value`，導致切換文章時重新計算。
