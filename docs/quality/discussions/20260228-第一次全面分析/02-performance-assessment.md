---
title: "WriteFlow 效能與演算法複雜度評估報告"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-02-28
source_of_truth: false
---

# WriteFlow 效能與演算法複雜度評估報告

**評估日期：** 2026-02-28
**評估者：** ⚡ Betty（資深效能工程師）
**應用版本：** WriteFlow v0.1.0

---

## 執行摘要

整體架構清晰，但效能關鍵路徑尚未優化。主要問題集中在：WikiLink 解析的 O(N×A) 線性搜尋、圖片掃描的三重嵌套、訂閱洩漏導致的重複執行、以及 Vue `key` 非確定性造成的全量 DOM 重建。

**整體效能評分：58 / 100**

---

## 核心操作 Big-O 複雜度總覽

| 模組 | 操作 | 複雜度 | 說明 |
|------|------|--------|------|
| `FileScannerService` | `getMarkdownFiles()` 遞迴掃描 | **O(N × D)** | N=總檔案數, D=目錄深度；Sequential I/O |
| `FileScannerService` | `generateIdFromPath()` | O(L) | L=路徑長度，Base64 encoding |
| `FileScannerService` | `getDirectoryStructure()` 排序 | O(K log K) | K=目錄項目數 |
| `ArticleService` | `loadAllArticles()` | **O(D × N) Sequential** | 目錄掃描仍為 Sequential |
| `ArticleService` | `loadInBatches()` | O(N) | 批次並行，但 spread 累積有隱患 |
| `AutoSaveService` | `hasContentChanged()` | O(L + F) | L=內容長度字串比較, F=lodash isEqual |
| `AutoSaveService` | `markAsModified()` debounce | O(1) | 每次輸入清除重計一個 timer |
| `FileWatchService` | `handleFileChange()` | O(1) 查詢 / O(M) 清理 | M=recentEvents Map 大小 |
| `MarkdownService` | `parseFrontmatter()` | O(L + Y) | L=原始內容, Y=YAML 區塊大小 |
| `MarkdownService` | `validateMarkdownSyntax()` | **O(5 × L)** | **每行執行 5 次獨立 Regex 掃描** |
| `MarkdownService` | Wikilink 字元迴圈 | **O(N²)** | 字串相加迴圈產生 O(N²) 記憶體分配 |
| `PreviewService` | `processWikiLinks()` | **O(L × A)** | A=文章數；每個連結做 `articles.find()` |
| `PreviewService` | `postProcessHtml()` | O(6 × H) | H=HTML長度；6 次 Sequential Regex |
| `PreviewService` | `getPreviewStats()` | O(8 × L) | 8 次 Regex Strip + wordCount |
| `ImageService` | `isImageUsed()` | **O(A × L)** | A=文章數, L=內容長度；每次呼叫創新 Regex |
| `ImageService` | `loadImages()` | O(I) 串列 I/O | I=圖片數量；Sequential stat 呼叫 |
| `ImageService` | `checkMultipleImagesExist()` | **O(I × io)** | 完全 Sequential；無並行 |
| `article store` | `filteredArticles` computed | O(N + N log N) | 過濾 O(N) + `localeCompare` 排序 O(N log N) |
| `article store` | `allTags` computed | O(N × T + T log T) | articles 變化即觸發全部重算 |
| `ArticleList.vue` | 全列表渲染 | **O(N) DOM** | N 篇文章 = N 個 DOM 節點（無虛擬化） |
| `ArticleListTree.vue` | `seriesGroups` computed | O(N + G log G + N log N) | 雙重排序 + 多份中間陣列 |

---

## 效能瓶頸清單

### 🔴 P0 — 嚴重（直接影響使用者體驗）

#### BUG-01：`processWikiLinks` — O(L × A) 線性搜尋

```typescript
// 現有程式碼：每個 Wiki 連結做 O(A) 線性搜尋
const article = articles.find(a => a.title === link || a.slug === link)
```

100 篇文章 × 50 個 Wiki 連結 = **5,000 次字串比較**，每次預覽刷新都發生。

**修復：** 建立 `Map<string, Article>` 索引，實現 O(1) 查詢。

---

#### BUG-02：`isImageUsed` — O(A × L) 且每次創 Regex

```typescript
// 每次迴圈都創建新 RegExp 物件（昂貴的編譯成本）
return this.articles.some(article => {
  const imageRegex = /!\[\[([^\]]+)\]\]/g  // ← 放在 some() 回調內！
```

`loadImages()` 對每張圖片呼叫一次，等於 **O(I × A × L)** 的三重嵌套。

---

#### BUG-03：`ArticleList.vue` 搜尋無 Debounce

```typescript
// 每個按鍵都觸發 O(N log N) 的 filteredArticles 重算
@input="updateSearch"
```

使用者輸入「software」7 個字元 → 觸發 7 次完整的 Filter + Sort。

---

#### BUG-04：`setupFileWatching` 訂閱洩漏

```typescript
// subscribe() 返回值被丟棄！
fileWatchService.subscribe((event) => {
  handleFileChangeEvent(event);
});
// ← 返回的 unsubscribe 函式未儲存
```

每次 `loadArticles()` 都新增一個訂閱，事件處理器被執行多次。

---

#### BUG-05：`generateId()` 非確定性 — 破壞 Vue key 同一性

```typescript
private generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
```

每次 `loadArticles()` 都為同一篇文章生成不同 ID，導致：
- Vue `v-for :key` 完全失效 → 所有文章組件強制重新掛載
- `setCurrentArticle` 用 `id` 匹配時永遠找不到相同物件

---

### 🟠 P1 — 高嚴重度

#### BUG-06：`getMarkdownFiles` — 完全 Sequential I/O

```typescript
for (const item of items) {
  const stats = await this.fileSystem.getFileStats(fullPath); // ← 沒有並行
  if (stats?.isDirectory) {
    const subFiles = await this.getMarkdownFiles(fullPath);   // ← 遞迴等待
  }
}
```

1000 個檔案的 Vault，每次 stat 10ms → **至少 10 秒**啟動時間。

---

#### BUG-07：`formatDate` — 每次呼叫創建 `Intl.DateTimeFormat`

```typescript
function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('zh-TW', {     // 每次渲染都創建新實例（昂貴！）
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(dateObj)
}
```

50 篇文章列表 = 50 次 `Intl.DateTimeFormat` 實例化。

---

#### BUG-08：Wikilink 解析 — 字串相加 O(N²)

```typescript
// MarkdownService addObsidianRules() 內
while (pos < max) {
  content += state.src[pos];  // ← O(N²) 字串相加！
  pos++;
}
```

應改為 `state.src.slice(start + 2, pos)`。

---

#### BUG-09：`checkMultipleImagesExist` — Sequential IPC 呼叫

```typescript
for (const imageName of imageNames) {
  const exists = await this.checkImageExists(imageName) // 一次一個 Electron IPC
}
```

20 張圖片 × 每次 IPC 20ms = **400ms 阻塞**。

---

#### BUG-10：`localeCompare('zh-TW')` 排序效能

`localeCompare` 加 locale 選項比簡單字串比較慢 **20-50 倍**，在每次 articles 更新時都觸發。

---

### 🟡 P2 — 中等嚴重度

- **BUG-11**：`validateMarkdownSyntax` — 5 次 Regex Pass per Line
- **BUG-12**：`postProcessHtml` — 6 次 Sequential Regex 替換
- **BUG-13**：`getDetailedImageValidation` — 重複呼叫 `loadImages()`
- **BUG-14**：`seriesGroups` 每次創建多份中間陣列
- **BUG-15**：`ArticleListTree` settings 每秒 `setInterval` 儲存（應改用 `watch`）
- **BUG-16**：雙重過濾（`articleStore.filteredArticles` 已過濾，`ArticleListTree` 又再過濾一次）

---

### 🔵 P3 — 低嚴重度

- **BUG-17**：`destroy()` 中 `lastSavedFrontmatter = ""` 型別錯誤
- **BUG-18**：`article.frontmatter.tags.slice(0,3)` 每次渲染創建新陣列
- **BUG-19**：`loadInBatches` 的 `results.push(...batchResults)` 在大量文章時可能溢出 call stack
- **BUG-20**：`migrateArticleFrontmatter` 每次 `setCurrentArticle` 都執行，應做冪等快取

---

## 具體優化建議

### 優化一：建立 Wiki 連結查詢 Map

```typescript
export class PreviewService {
  private articleByTitle = new Map<string, Article>()
  private articleBySlug = new Map<string, Article>()

  updateArticles(articles: Article[]): void {
    this.articleByTitle.clear()
    this.articleBySlug.clear()
    for (const article of articles) {
      this.articleByTitle.set(article.title, article)
      this.articleBySlug.set(article.slug, article)
    }
  }

  private processWikiLinks(content: string): string {
    return content.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, link, __, alias) => {
      const article = this.articleByTitle.get(link) ?? this.articleBySlug.get(link)
      // O(1) 查詢
    })
  }
}
```

---

### 優化二：ImageService 預建索引

```typescript
export class ImageService {
  private imageUsageCache = new Map<string, boolean>()
  private imageCacheDirty = true

  private rebuildImageUsageCache(): void {
    this.imageUsageCache.clear()
    const obsidianImageRegex = /!\[\[([^\]]+)\]\]/g
    for (const article of this.articles) {
      obsidianImageRegex.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = obsidianImageRegex.exec(article.content)) !== null) {
        this.imageUsageCache.set(match[1], true)
      }
    }
    this.imageCacheDirty = false
  }

  isImageUsed(imageName: string): boolean {
    if (this.imageCacheDirty) this.rebuildImageUsageCache()
    return this.imageUsageCache.has(imageName) // O(1)
  }
}
```

---

### 優化三：修復訂閱洩漏

```typescript
let unsubscribeFileWatch: (() => void) | null = null

async function setupFileWatching(vaultPath: string) {
  if (unsubscribeFileWatch) {
    unsubscribeFileWatch()
    unsubscribeFileWatch = null
  }
  await fileWatchService.startWatching(vaultPath)
  unsubscribeFileWatch = fileWatchService.subscribe((event) => {
    handleFileChangeEvent(event)
  })
}
```

---

### 優化四：修復 generateId — 使用確定性路徑 Hash

```typescript
private generateId(filePath: string): string {
  let hash = 0
  for (let i = 0; i < filePath.length; i++) {
    hash = (Math.imul(31, hash) + filePath.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}
```

---

### 優化五：並行 IPC 呼叫

```typescript
async checkMultipleImagesExist(imageNames: string[]): Promise<Map<string, boolean>> {
  const entries = await Promise.all(
    imageNames.map(async (name) => {
      const exists = await this.checkImageExists(name)
      return [name, exists] as const
    })
  )
  return new Map(entries)
}
```

---

### 優化六：搜尋 Debounce + Formatter 快取

```typescript
// 快取格式化實例
const dateFormatter = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric', month: 'short', day: 'numeric'
})
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d && !isNaN(d.getTime()) ? dateFormatter.format(d) : '無效日期'
}

// Debounce 搜尋（150ms）
const updateSearch = useDebounceFn(() => {
  articleStore.updateFilter({ searchText: searchText.value })
}, 150)
```

---

### 優化七：getMarkdownFiles 並行 stat

```typescript
private async getMarkdownFiles(directoryPath: string): Promise<string[]> {
  const items = await this.fileSystem.readDirectory(directoryPath)

  const statResults = await Promise.all(
    items.map(async (item) => {
      const fullPath = this.joinPath(directoryPath, item)
      const stats = await this.fileSystem.getFileStats(fullPath)
      return { item, fullPath, stats }
    })
  )

  const subDirScans = statResults
    .filter(r => r.stats?.isDirectory)
    .map(r => this.getMarkdownFiles(r.fullPath))

  const mdFiles = statResults
    .filter(r => !r.stats?.isDirectory && r.item.endsWith('.md'))
    .map(r => r.fullPath)

  const subResults = await Promise.all(subDirScans)
  return [...mdFiles, ...subResults.flat()]
}
```

---

## 整體效能評分

| 評估面向 | 得分 | 說明 |
|---------|------|------|
| 演算法複雜度 | 55/100 | Wiki 連結查詢、Image 掃描有嚴重 O(N×M) 問題 |
| 記憶體管理 | 65/100 | 訂閱洩漏、不必要的中間陣列 |
| 渲染效能 | 60/100 | 無虛擬化、每次輸入觸發全重算 |
| 檔案 I/O 效能 | 50/100 | 掃描大量 Sequential、Image IPC 未並行 |
| 自動儲存機制 | 75/100 | Debounce 設計正確；Dirty Flag 邏輯完整 |
| 事件監聽管理 | 55/100 | 訂閱洩漏是關鍵缺陷 |
| 搜尋效能 | 45/100 | 無 Debounce + 無索引 + 雙重過濾 |
| **總體得分** | **58/100** | |

---

## 優化優先順序

```
立即修復（本 Sprint）
├── P0-1: 修復訂閱洩漏（BUG-04）—— 正確性問題
├── P0-2: 修復 generateId 確定性（BUG-05）—— Vue 渲染正確性
├── P0-3: 搜尋加 Debounce（BUG-03）—— 使用者直接感受
└── P0-4: PreviewService 建立 Article 查詢 Map（BUG-01）

短期優化（下一 Sprint）
├── P1-1: ImageService 重構索引（BUG-02）
├── P1-2: checkMultipleImagesExist 並行化（BUG-09）
├── P1-3: formatDate Formatter 快取（BUG-07）
├── P1-4: 修復 Wikilink 字串相加 O(N²)（BUG-08）
└── P1-5: getMarkdownFiles 並行 stat（BUG-06）

中期優化（長期計畫）
├── P2-1: 文章列表虛擬化（vue-virtual-scroller）
├── P2-2: localeCompare 使用 Collator 實例快取
├── P2-3: postProcessHtml 合併 Regex Pass
└── P2-4: 以 watch 取代 setInterval 儲存設定
```

---

## 大型 Vault 處理策略建議

當 Vault 達到 **500+ 文章**時，建議引入：

1. **懶加載（Lazy Loading）**：啟動時只掃描檔案列表，點擊時才讀取完整內容
2. **虛擬滾動**：使用 `vue-virtual-scroller`，DOM 節點固定在 20-30 個
3. **Web Worker 解析**：將 Markdown 解析移入 Worker 執行緒
4. **搜尋索引**：引入 [minisearch](https://github.com/lucaong/minisearch) 建立倒排索引
5. **增量更新**：FileWatch 觸發時只更新單一文章，而非全部重算
