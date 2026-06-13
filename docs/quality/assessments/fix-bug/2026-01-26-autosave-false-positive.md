---
title: "自動儲存誤判問題分析報告"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-01-26
source_of_truth: false
---

---
title: "自動儲存誤判問題分析報告"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-01-26
source_of_truth: false
---

# 自動儲存誤判問題分析報告

**日期**: 2026-01-26
**問題**: 為什麼在沒有修改時會觸發自動儲存？

## 問題重現

當使用者點擊文章列表切換文章時，即使沒有做任何修改，autoSaveService 也會儲存前一篇文章。

## 根本原因分析

### 程式碼流程

```typescript
// src/stores/article.ts:400
function setCurrentArticle(article: Article | null) {
  // 1. 在切換文章前自動儲存前一篇文章
  const previousArticle = currentArticle.value
  if (previousArticle && previousArticle !== article) {
    autoSaveService.saveOnArticleSwitch(previousArticle)
  }

  currentArticle.value = article

  // 2. 設定新的當前文章到自動儲存服務
  autoSaveService.setCurrentArticle(article)
}
```

```typescript
// src/services/AutoSaveService.ts:116
async saveOnArticleSwitch(previousArticle: Article | null): Promise<void> {
  // 檢查前一篇文章是否有變更
  if (this.hasContentChanged(previousArticle)) {
    // 有變更才儲存
    await this.saveCallback(previousArticle)
  }
}
```

```typescript
// src/services/AutoSaveService.ts:172
private hasContentChanged(article: Article): boolean {
  const currentContent = article.content
  const currentFrontmatter = JSON.stringify(article.frontmatter)

  return (
    currentContent !== this.lastSavedContent ||
    currentFrontmatter !== this.lastSavedFrontmatter
  )
}
```

```typescript
// src/services/AutoSaveService.ts:195
setCurrentArticle(article: Article | null): void {
  if (article) {
    this.updateLastSavedContent(article)
  } else {
    this.lastSavedContent = ''
    this.lastSavedFrontmatter = ''
  }
}
```

### 問題場景

**場景 1：應用啟動，第一次點擊文章**

1. `loadArticles()` 載入所有文章到 `articles.value`
2. 此時 `currentArticle.value = null`
3. `autoSaveService.lastSavedContent = ''`（未初始化）
4. 使用者點擊第一篇文章 A
5. `setCurrentArticle(A)` 被呼叫
6. `previousArticle = null`，不觸發 `saveOnArticleSwitch`
7. `autoSaveService.setCurrentArticle(A)` 將 `lastSavedContent` 設為 A 的內容

**場景 2：從文章 A 切換到文章 B（沒有修改 A）**

1. 使用者點擊文章 B
2. `setCurrentArticle(B)` 被呼叫
3. `previousArticle = A`
4. 呼叫 `autoSaveService.saveOnArticleSwitch(A)`
5. `hasContentChanged(A)` 比對：
   - `A.content` vs `lastSavedContent`（此時是 A 的內容）
   - `JSON.stringify(A.frontmatter)` vs `lastSavedFrontmatter`（此時是 A 的 frontmatter）
6. 理論上應該相等，**不會觸發儲存**

**但實際上仍觸發儲存的可能原因**：

### 可能原因 1：物件引用問題

```typescript
// 在 MainEditor.vue 中
const handleContentChange = (newContent: string) => {
  if (currentArticle.value) {
    // ❌ 直接修改 currentArticle.value.content
    currentArticle.value.content = newContent
  }
}
```

如果 `currentArticle.value` 是響應式物件，直接修改 `content` 屬性會影響到 store 中的 article 物件。

當 `setCurrentArticle(A)` 被呼叫時：
1. `autoSaveService.setCurrentArticle(A)` 儲存 `A.content` 的引用
2. 但 Vue 的響應式系統可能包裝了這個物件
3. 當編輯器載入時，即使視覺上沒有修改，`A.content` 可能已經改變（例如：`\n` vs `\r\n`、空白字元差異）

### 可能原因 2：Frontmatter 序列化差異

```typescript
// 比對時
JSON.stringify(article.frontmatter) !== this.lastSavedFrontmatter
```

JSON.stringify 可能因為以下原因產生不同結果：
- 物件屬性順序不同
- `undefined` vs 省略屬性
- 陣列 `[]` vs `undefined`
- 日期物件序列化

例如：
```javascript
const fm1 = { title: 'A', tags: [] }
const fm2 = { tags: [], title: 'A' }
JSON.stringify(fm1) !== JSON.stringify(fm2)  // true（順序不同）
```

### 可能原因 3：檔案載入時的換行符號轉換

```typescript
// loadArticles
const content = await window.electronAPI.readFile(filePath)
const { content: articleContent } = _markdownService.parseMarkdown(content)
```

Windows 檔案可能使用 `\r\n`，但 parseMarkdown 可能轉換成 `\n`，或者編輯器再次載入時又轉換回來。

## 驗證方法

添加詳細日誌來追蹤：

```typescript
async saveOnArticleSwitch(previousArticle: Article | null): Promise<void> {
  if (!this.initialized || !this.saveCallback || !previousArticle) {
    return
  }

  const hasChanged = this.hasContentChanged(previousArticle)

  console.group(`🔍 切換文章檢查: ${previousArticle.title}`)
  console.log('hasChanged:', hasChanged)
  console.log('currentContent length:', previousArticle.content?.length)
  console.log('lastSavedContent length:', this.lastSavedContent?.length)
  console.log('content相等?:', previousArticle.content === this.lastSavedContent)
  console.log('currentFrontmatter:', JSON.stringify(previousArticle.frontmatter))
  console.log('lastSavedFrontmatter:', this.lastSavedFrontmatter)
  console.log('frontmatter相等?:', JSON.stringify(previousArticle.frontmatter) === this.lastSavedFrontmatter)
  console.groupEnd()

  if (hasChanged) {
    console.log(`✅ 內容已變更，執行自動儲存`)
    this.updateSaveState(SaveStatus.Saving)
    await this.saveCallback(previousArticle)
    this.updateSaveState(SaveStatus.Saved)
  } else {
    console.log(`⏭️ 內容無變更，跳過儲存`)
  }
}
```

## 建議修復方案

### 方案 A：使用深度比對而非字串比對

```typescript
private hasContentChanged(article: Article): boolean {
  // 內容比對（嚴格）
  const contentChanged = article.content !== this.lastSavedContent

  // Frontmatter 深度比對（忽略順序）
  const frontmatterChanged = !this.isEqualFrontmatter(
    article.frontmatter,
    this.lastSavedFrontmatter ? JSON.parse(this.lastSavedFrontmatter) : null
  )

  return contentChanged || frontmatterChanged
}

private isEqualFrontmatter(a: any, b: any): boolean {
  if (a === b) return true
  if (!a || !b) return false

  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()

  if (keysA.length !== keysB.length) return false
  if (keysA.some((k, i) => k !== keysB[i])) return false

  return keysA.every(key => {
    const valA = a[key]
    const valB = b[key]

    if (Array.isArray(valA) && Array.isArray(valB)) {
      return valA.length === valB.length &&
             valA.every((v, i) => v === valB[i])
    }

    return valA === valB
  })
}
```

### 方案 B：儲存時使用 hash 比對

```typescript
private async saveOnArticleSwitch(previousArticle: Article | null): Promise<void> {
  // 計算 hash
  const currentHash = this.calculateHash(previousArticle)
  const savedHash = this.lastSavedHash

  if (currentHash !== savedHash) {
    await this.saveCallback(previousArticle)
    this.lastSavedHash = currentHash
  }
}

private calculateHash(article: Article | null): string {
  if (!article) return ''
  return `${article.content.length}:${JSON.stringify(article.frontmatter).length}`
}
```

### 方案 C：修復 updateArticle 避免物件污染

```typescript
// src/stores/article.ts
function updateArticle(updatedArticle: Article) {
  const index = articles.value.findIndex(a => a.id === updatedArticle.id)
  if (index !== -1) {
    // ✅ 使用深拷貝避免引用污染
    articles.value[index] = JSON.parse(JSON.stringify(updatedArticle))
  }

  if (currentArticle.value?.id === updatedArticle.id) {
    currentArticle.value = JSON.parse(JSON.stringify(updatedArticle))
  }
}
```

❌ 缺點：深拷貝成本高，且會失去 Date 物件等特殊類型

### 方案 D：明確追蹤編輯狀態

```typescript
class AutoSaveService {
  private isContentDirty = false  // 明確的髒標記

  markAsModified(): void {
    this.isContentDirty = true
  }

  async saveOnArticleSwitch(previousArticle: Article | null): Promise<void> {
    if (this.isContentDirty) {
      await this.saveCallback(previousArticle)
      this.isContentDirty = false
    }
  }

  setCurrentArticle(article: Article | null): void {
    this.isContentDirty = false  // 切換文章時重置
    if (article) {
      this.updateLastSavedContent(article)
    }
  }
}
```

✅ 優點：邏輯清晰，只在真正編輯時標記為 dirty
✅ 現有的 `markAsModified` 已經存在，只需要調整邏輯

## 推薦方案

**方案 D（明確追蹤編輯狀態）+ 詳細日誌**

理由：
1. 最簡單且最可靠
2. 不依賴內容比對（避免字串比對的各種邊界情況）
3. 語意清晰：只有在 `markAsModified` 被呼叫時才會儲存
4. 保留現有架構，修改最少

## 待驗證

請使用者在切換文章時檢查 Console 輸出，確認：
1. 是否真的觸發了 `saveOnArticleSwitch`
2. `hasContentChanged` 回傳什麼結果
3. 內容和 frontmatter 的比對結果
