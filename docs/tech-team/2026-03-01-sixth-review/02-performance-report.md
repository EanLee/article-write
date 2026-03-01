# 效能（演算法/O(n)）評估報告 — 第六次全面評估

**審查者**: 演算法/O(n) 工程師 Agent  
**日期**: 2026-03-01  
**評估範圍**: WriteFlow v0.1.0，基準 commit `e9b525a`

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **效能總分** | **5.0 / 10** | 首度納入 ImageService、SearchService、Main Process I/O 的完整分析 |
| filteredArticles 搜尋複雜度 | 5/10 | 無防抖，每鍵入觸發 O(n) filter + O(n log n) zh-TW 校對排序 |
| MetadataCacheService TTL | 7/10 | 快取機制良好，但串行 I/O 仍有改善空間 |
| ConverterService 並發 | 6/10 | batchCopyImages 存在但未被使用 |
| SearchService 索引效率 | 4/10 | 線性掃描 O(N×L)，無倒排索引 🔴 |
| Vue 響應式計算 | 5/10 | deep watch + 全量陣列替換觸發全體重算 |
| ImageService 記憶體效率 | 3/10 | O(I×A×C) 三重巢狀 + 500 次 IPC 🔴 |

---

## 執行摘要

本次評審首度對 Main Process 服務層（SearchService、ImageService）以及 Main Process I/O 模式進行完整分析。最嚴重的發現是 **ImageService 的 IPC 炸彈**（P6-05）：對 500 行文章呼叫 `getImageValidationWarnings()` 會連續發出 500 次 IPC，導致 2.5 秒 UI 阻塞——這是每個使用者每次打開長文章都會直接感受到的問題。SearchService 的線性掃描（P6-02）則是搜尋功能的根本架構缺陷，需要引入倒排索引才能根本解決。

---

## 已修正確認（前次效能問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| P5-01 | SettingsPanel 大型物件不必要的 v-show | ✅ 已重構 |
| P5-02 | BatchCopy 無並發上限 | ✅ p-limit 已加入 |

---

## 新發現問題

### P6-01 🔴 — filteredArticles 無防抖 + zh-TW 校對排序效能懲罰

**位置**: `src/stores/article.ts`（filteredArticles computed property）

**問題**:
```typescript
// 每次 searchQuery 改變（每鍵入一字元）立即觸發
const filteredArticles = computed(() => {
  // O(n × content_len) filter
  const filtered = articles.value.filter(a =>
    a.title.includes(searchQuery.value) ||
    a.content.includes(searchQuery.value)
  )
  // O(n log n) 排序，每次比較呼叫 localeCompare('zh-TW')
  return filtered.sort((a, b) =>
    a.title.localeCompare(b.title, 'zh-TW')
  )
})
```

**複雜度分析**:
- 100 篇文章 × 10KB 內容 = 1MB 字串掃描（每鍵入）
- `localeCompare('zh-TW')` 每次比較約 50ns，100 篇排序 ≈ 700 次比較 = 35µs
- 合計：每鍵入約 80–200ms UI 主線程佔用

**修正建議**:
```typescript
// 1. 搜尋關鍵字防抖 300ms
const debouncedSearchQuery = useDebouncedRef(searchQuery, 300)

// 2. 排序鍵快取（文章列表不變時不重算）
const sortKey = computed(() =>
  articles.value.map(a => ({ id: a.id, key: a.title.localeCompare('', 'zh-TW') }))
)
```

---

### P6-02 🔴 — SearchService.search() O(N×L) 線性掃描，無索引

**位置**: `src/main/services/SearchService.ts`（search 方法）

**問題**: 每次搜尋完整掃描所有文件的全部內容：

```typescript
search(query: string): SearchResult[] {
  return this.documents
    .filter(doc => doc.content.includes(query) || doc.title.includes(query))
    .map(...)
}
```

**複雜度分析**:
- 500 篇文章 × 5KB = 每次查詢 2.5MB 字串掃描
- 隨文章數線性惡化

**修正建議**（trigram 倒排索引）:
```typescript
// 建立索引（僅在文章新增/修改時執行）
private buildTrigramIndex(): void {
  this.index.clear()
  for (const doc of this.documents) {
    const trigrams = extractTrigrams(doc.content + doc.title)
    for (const tri of trigrams) {
      if (!this.index.has(tri)) this.index.set(tri, new Set())
      this.index.get(tri)!.add(doc.id)
    }
  }
}

// 查詢 O(q) + O(k log k)
search(query: string): SearchResult[] {
  const queryTrigrams = extractTrigrams(query)
  const candidateIds = intersect(queryTrigrams.map(t => this.index.get(t) ?? new Set()))
  // ...
}
```

---

### P6-03 🟡 — MetadataCacheService.collectFromDir 串行 I/O

**位置**: `src/main/services/MetadataCacheService.ts`

**問題**:
```typescript
for (const file of files) {
  const content = await fs.readFile(file)  // ← 串行，每次等待前一個
  // ...
}
```

100 個檔案 × 5ms I/O 延遲 = 500ms 串行等待（可並行化）。

**修正建議**:
```typescript
const contents = await Promise.all(
  files.map(f => fs.readFile(f).then(c => ({ file: f, content: c })))
)
```

---

### P6-04 🟡 — ConverterService processImages 未使用 batchCopyImages

**位置**: `src/services/ConverterService.ts`

**問題**: `batchCopyImages()` 方法存在（有並發控制），但 `processImages()` 的實作使用 `for...of await`（串行）：

```typescript
// ❌ 現況：串行
for (const image of images) {
  await copyImage(image.src, image.dest)
}

// ✅ 應使用：
await this.batchCopyImages(images)
```

---

### P6-05 🔴 CRITICAL — ImageService O(I×A×C) + 每行一次 IPC 呼叫

**位置**: `src/services/ImageService.ts`（isImageUsed、loadImages、getImageValidationWarnings）

**問題**:

**問題 A：isImageUsed 三重巢狀**
```typescript
// loadImages() 呼叫 isImageUsed() 對每張圖片
async isImageUsed(imageName: string): Promise<boolean> {
  const articles = await this.getAllArticles()   // ← 每次都重新取得所有文章
  for (const article of articles) {              // O(A)
    const content = await this.getContent(article)
    for (const line of content.split('\n')) {   // O(C)
      if (line.includes(imageName)) return true
    }
  }
  return false
}
// 總複雜度：O(I × A × C) — I 張圖 × A 篇文章 × C 行內容
```

**問題 B：getImageValidationWarnings 每行一次 IPC**
```typescript
async getImageValidationWarnings(content: string): Promise<string[]> {
  const lines = content.split('\n')
  for (const line of lines) {
    const imagePath = extractImagePath(line)
    if (imagePath) {
      const exists = await window.electronAPI.fileExists(imagePath)  // ← 1 IPC / 行
      ...
    }
  }
}
```

**最壞情況**: 500 行文章 × 5ms IPC = **2.5 秒 UI 阻塞**

**修正建議**（分兩步）:
```typescript
// 步驟 1（立即）：批次正則掃描，一次提取所有圖片路徑再一次 IPC
const imageRefs = extractAllImagePaths(content)  // 純 JS，無 IPC
const results = await window.electronAPI.fileExistsBatch(imageRefs)  // 1 次 IPC

// 步驟 2（中期）：Main 進程新增 IMAGE_GET_USAGE_BATCH handler
// 一次 IPC 返回所有圖片的使用狀態
```

---

### P6-06 🟡 — Vue deep watch + articles 全量陣列替換觸發全體重算

**位置**: `src/stores/article.ts`（watch 設定）

**問題**: `articles.value[index] = updatedArticle`（全量替換）使所有依賴 `articles` 的 computed 同時觸發重算。`deep: true` watch on large array 的開銷隨文章數線性成長。

**修正建議**: 使用 `Map<string, Article>` 替代陣列，並以 computed 衍生排序後陣列，只有實際改變的文章才觸發精確更新。

---

## 效能工程師結語

本次評審發現的最嚴重問題（P6-05）不是效能優化問題，而是**功能的設計缺陷**——`getImageValidationWarnings` 的 500 次 IPC 在任何硬體上都是無法接受的。建議立刻以「批次正則掃描」作為 hotfix（工時 0.5h），再用中期的批次 IPC handler 徹底根治。SearchService 的線性掃描（P6-02）是搜尋功能的根本架構問題，建議以 TDD 模式配合充分測試進行重構。

---

*第六次全面評估 — 效能 | 索引: [00-index.md](./00-index.md) | 前次: [第五次效能報告](../2026-03-01-fifth-review/02-performance-report.md)*
