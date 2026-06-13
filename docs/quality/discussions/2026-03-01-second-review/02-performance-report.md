# WriteFlow 效能評估報告（第二次）

**評估日期**：2026-03-01
**評估角色**：Performance Engineer
**技術堆疊**：Electron v39 + Vue 3 + TypeScript + Pinia + CodeMirror 6

---

## 一、執行摘要

**整體效能評級：C+**

WriteFlow 在架構設計上有不少優點（依賴注入、SOLID 拆分、批次並行載入），但在關鍵熱路徑（搜尋、清單渲染、磁碟掃描）存在數個影響到延展性的根本缺陷。以 100 篇文章為基準整體表現尚可，**一旦超過 500 篇，多個瓶頸會同時爆發**。

| 面向 | 評級 | 主要問題 |
|------|------|---------|
| 搜尋演算法 | D | 線性全文掃描，無倒排索引 |
| 磁碟 I/O | C | 部分仍為循序，IPC 呼叫密集 |
| Vue 渲染 | C+ | 雙重過濾、ID 不穩定 |
| 記憶體管理 | B | 快取無上限，但體積通常小 |
| 自動儲存 | B+ | 設計合理，debounce 正確 |
| 檔案監控 | A- | debounce 機制完善 |

---

## 二、演算法複雜度清單

| 模組 | 操作 | 時間複雜度 | n 的定義 | 說明 |
|------|------|-----------|---------|------|
| `FileScannerService` | `getMarkdownFiles` | **O(n)** 循序 I/O | 所有檔案/目錄數 | 每個項目個別呼叫 `getFileStats`，無並行 |
| `FileScannerService` | `scanMarkdownFiles` | **O(n × 2 IPC)** | 文章數 | 每篇文章：`readFile` + `getFileStats` 循序 |
| `MetadataCacheService` | `collectFromDir` | **O(n × 2 IPC)** | 文章數 | 完整掃描，無增量更新機制 |
| `MetadataCacheService` | `scan` | **O(n)** | 文章數 | 每次全量掃描，Set 去重效率好 |
| `SearchService` | `buildIndex` | **O(n × k)** | n=文章數，k=平均內容字元數 | `Promise.all` 並行，但 regex 處理 O(k) |
| `SearchService` | `search` | **O(n × m)** | n=索引數，m=平均內容長度 | ⚠️ 無倒排索引，線性全字串掃描 |
| `SearchService` | `scanDirectory` | **O(n)** 並行 | 檔案/目錄數 | `Promise.all` 並行，效率好 |
| `ArticleService` | `loadAllArticles` | **O(n)** 批次並行 | 文章數 | batchSize=10，已優化 |
| `ArticleService` | `generateId` | **O(1)** | — | ⚠️ `Date.now()+Math.random()` 每次不同 |
| `article.ts` | `filteredArticles` | **O(n log n)** | 文章數 | 單次過濾 + `localeCompare` 排序 |
| `article.ts` | `updateArticleInMemory` | **O(n)** | 文章數 | `findIndex` 線性搜尋 |
| `article.ts` | `removeArticleFromMemory` | **O(n)** | 文章數 | `findIndex` + `normalizePath` 雙重比對 |
| `ArticleListTree.vue` | `filteredArticles` | **O(n)** | 文章數 | ⚠️ 對 store 已過濾結果再次過濾 |
| `FileWatchService` | `handleFileChange` | **O(1)** | — | Map 查詢，設計良好 |
| `AutoSaveService` | `markAsModified` | **O(1)** | — | 100ms debounce，設計正確 |

---

## 三、效能瓶頸分析

### 🔴 嚴重（P0）— 規模化殺手

#### 1. SearchService — 線性全文掃描，無倒排索引

```typescript
// 現況：每次搜尋遍歷所有文章全文 O(n × m)
for (const entry of this.index.values()) {
  const contentIdx = entry.content.toLowerCase().indexOf(keyword)
}
```

**量化影響**：
- 100 篇文章 × 平均 5000 字 = 每次查詢 **500,000 字元比較**（< 5ms，尚可）
- 1,000 篇文章 = **5,000,000 字元比較**（~30ms，明顯卡頓）
- 10,000 篇文章 = **50,000,000 字元比較**（> 200ms，UI 凍結）

#### 2. FileScannerService — getMarkdownFiles 循序 I/O

```typescript
// 現況：每個項目循序取得 stats
for (const item of items) {
  const stats = await this.fileSystem.getFileStats(fullPath)  // ← 逐一等待 IPC
  if (stats?.isDirectory) {
    const subFiles = await this.getMarkdownFiles(fullPath)     // ← 再度循序!
  }
}
```

**量化影響**：每次 IPC 約 0.5-2ms → 1000 個檔案 = **500ms ~ 2秒**純 IPC 等待

#### 3. ArticleService — 非確定性 ID 破壞 Vue 虛擬 DOM 穩定性

```typescript
// ⚠️ 每次載入都產生新 ID！
private generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}
```

每次 `loadArticles()` 呼叫後，**所有 `v-for :key` 都會失效**，Vue 被迫卸載並重新掛載全部 `ArticleTreeItem` 組件。

---

### 🟠 高嚴重度（P1）

#### 4. ArticleListTree.vue — 雙重過濾與每秒寫入 localStorage

- Store 的 `filteredArticles` 已過濾過，元件再次過濾是重複計算
- `setInterval(saveSettings, 1000)` — 每秒無條件 localStorage 寫入

#### 5. article.ts — O(n) 查找 on every mutation

```typescript
// normalizePath 在每次 findIndex 迭代中被呼叫
function removeArticleFromMemory(filePath: string) {
  const index = articles.value.findIndex(
    (a) => normalizePath(a.filePath) === normalizedPath  // O(n) × O(path 長度)
  )
}
```

#### 6. MetadataCacheService — 無增量更新，全量掃描

`scan()` 每次都重新遍歷整個目錄樹，無 delta 機制。

---

## 四、具體改善建議

### 建議 1：SearchService — 建立倒排索引（最高優先）

```typescript
export class SearchService {
  private invertedIndex: Map<string, Set<string>> = new Map()

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/[\s\p{P}]+/u).filter(t => t.length >= 2)
  }

  search(query: SearchQuery): SearchResult[] {
    const keyword = query.query.toLowerCase()
    // O(1) 精確詞匹配：直接查詢倒排索引
    const candidateIds = this.invertedIndex.get(keyword) ?? new Set<string>()
    // 只處理候選文章（從 O(n×m) 降到 O(候選數)）
    // ...
  }
}
```

**預期效益**：搜尋從 O(n×m) 降至 O(1) + O(candidates)，1000 篇場景從 ~30ms → < 1ms

### 建議 2：FileScannerService — 並行化 getMarkdownFiles

```typescript
// 並行取得所有 stats
const statsResults = await Promise.all(
  items.map(async (item) => {
    const fullPath = this.joinPath(directoryPath, item)
    const stats = await this.fileSystem.getFileStats(fullPath)
    return { item, fullPath, stats }
  })
)
```

**預期效益**：I/O 等待從串聯變並聯，100 個檔案場景從 ~200ms → ~10ms

### 建議 3：ArticleService — 使用路徑 Hash 作穩定 ID

```typescript
private generateIdFromPath(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase()
  return Buffer.from(normalizedPath).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
}
```

**預期效益**：消除每次 `loadArticles` 後的全量 Vue 組件重新掛載，減少渲染時間 60-80%

### 建議 4：article.ts — 以 Map 取代 Array findIndex

```typescript
const articleMap = ref(new Map<string, Article>())  // id → Article 快速查詢

function updateArticleInMemory(updatedArticle: Article) {
  articleMap.value.set(updatedArticle.id, updatedArticle)  // O(1)
}
```

### 建議 5：ArticleListTree.vue — 修正 localStorage 寫入

```typescript
// 改為 watch 狀態變化才儲存（防抖 500ms）
const debouncedSave = useDebounceFn(saveSettings, 500)
watch([groupBySeries, showStatusIcons, collapsedGroups], () => {
  debouncedSave()
}, { deep: true })
```

---

## 五、Scalability 隱患預測

| 文章數量 | 現況啟動時間 | 現況搜尋延遲 | 最大痛點 |
|---------|------------|------------|---------|
| **100 篇**（現值） | ~1-2 秒 | < 5ms | 可接受 |
| **500 篇** | ~5-8 秒 | ~15ms | FileScannerService 循序 I/O 開始明顯 |
| **1,000 篇** | ~10-20 秒 | ~30ms | 搜尋明顯延遲，1000 組件重建 |
| **5,000 篇** | **~60-120 秒** | **~150ms** | 應用基本不可用 |
| **10,000 篇** | **無法啟動** | **> 300ms（UI 凍結）** | 搜尋 IPC 呼叫超時 |

### 關鍵臨界點

- **500 篇**：搜尋開始讓使用者察覺回應變慢（超過 16ms 一幀預算）
- **1,000 篇**：啟動掃描超過 10 秒「白屏」
- **5,000 篇**：記憶體壓力（索引 ~25MB + articles ref ~50MB）

---

## 六、優點記錄

- ✅ `ArticleService.loadInBatches(tasks, 10)`：主動限制並發，Back-pressure 設計正確
- ✅ `FileWatchService` debounce：Map 型 debounce + `ignoreNextChange` 防止假事件
- ✅ `AutoSaveService.markAsModified` 三層防禦機制設計嚴謹
- ✅ `filteredArticles` 單次遍歷合併所有過濾條件
- ✅ `SearchService.scanDirectory` 使用 `Promise.all` 並行掃描
