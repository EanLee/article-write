---
title: "檔案服務架構分析 - 過度設計問題"
domain: engineering
type: spec
status: deprecated
owner: tech-team
updated: 2026-06-13
source_of_truth: false
superseded_by: docs/engineering/ARCHITECTURE_COMPLETE.md
---

# 檔案服務架構分析 - 過度設計問題

**日期**: 2026-01-26
**問題**: 檔案相關服務過多，違反 SOLID 原則，導致複雜性爆炸和難以追蹤的 Bug

---

## 📋 目前的服務清單

### 檔案相關 Services (11個)

1. **FileService.ts** - 基礎檔案操作
2. **ArticleService.ts** - 文章 CRUD + 備份 + 衝突檢測
3. **AutoSaveService.ts** - 自動儲存邏輯
4. **BackupService.ts** - 備份管理
5. **MarkdownService.ts** - Markdown 解析
6. **FileScannerService.ts** - 檔案掃描
7. **ObsidianSyntaxService.ts** - Obsidian 語法處理
8. **PreviewService.ts** - 預覽渲染
9. **ImageService.ts** - 圖片處理
10. **ConverterService.ts** - 格式轉換
11. **NotificationService.ts** - 通知（跨功能）

### Composables (中間層)

- **useServices.ts** - 服務單例管理（又一層抽象！）

### Stores (狀態管理)

- **article.ts** - 但竟然也包含檔案操作邏輯！

---

## 🔥 問題分析

### 1. 違反單一職責原則 (Single Responsibility)

**ArticleService** 做了太多事：
```typescript
class ArticleService {
  readArticle()        // 檔案讀取
  saveArticle()        // 檔案寫入
  deleteArticle()      // 檔案刪除
  moveArticle()        // 檔案移動
  detectConflict()     // 衝突檢測（應該是 BackupService？）
  createBackup()       // 備份（重複了 BackupService？）
}
```

**Article Store** 也做了太多事：
```typescript
useArticleStore {
  loadArticles()           // 檔案掃描
  saveArticle()            // 調用 ArticleService.saveArticle
  updateArticle()          // 更新 Store
  reloadArticleByPath()    // 檔案讀取 + 解析
  handleFileChange()       // 檔案監聽邏輯
  startFileWatching()      // 啟動檔案監聽
  // ... 還有很多
}
```

### 2. 責任重疊

| 功能 | 實作位置 | 問題 |
|------|---------|------|
| 檔案讀取 | FileService, ArticleService, Store | 重複 3 次 |
| 檔案寫入 | FileService, ArticleService, Store | 重複 3 次 |
| 備份 | BackupService, ArticleService | 重複 2 次 |
| Markdown 解析 | MarkdownService, Store (reloadArticleByPath) | 重複 2 次 |

### 3. 過度抽象 - Composables 層

**useServices.ts** 的目的：
```typescript
// 為了避免重複創建實例，使用單例模式
export function useMarkdownService() {
  if (!instance) {
    instance = new MarkdownService()
  }
  return instance
}
```

**問題**：
- JavaScript 本身就支持模組單例！
- 直接 `export const markdownService = new MarkdownService()` 就行了
- 多了一層毫無意義的抽象

### 4. 錯誤的職責分配

**Store 不應該包含商業邏輯**：
```typescript
// ❌ Store 中的商業邏輯
async function reloadArticleByPath(filePath, status, category) {
  const content = await window.electronAPI.readFile(filePath)
  const { frontmatter, content: articleContent } = _markdownService.parseMarkdown(content)
  const fileStats = await window.electronAPI.getFileStats(filePath)
  // ... 60 行邏輯
}
```

這些應該在 Service 層！

---

## 📊 完整的調用鏈分析

### 場景：用戶點擊「儲存文章」

```
UI (MainEditor.vue)
  ↓
handleSave()
  ↓
articleStore.saveCurrentArticle()
  ↓
articleStore.saveArticle(article)  ← Store 層
  ↓
更新 article.lastModified = new Date()
  ↓
articleService.saveArticle(article)  ← Service 層
  ↓
  ├─ backupService.detectConflict(article)  ← 又一個 Service
  │    ↓
  │    window.electronAPI.getFileStats()
  │    window.electronAPI.readFile()
  │
  ├─ backupService.createBackup(article)  ← 又一個 Service
  │    ↓
  │    window.electronAPI.writeFile(backupPath, content)
  │
  ├─ markdownService.composeFrontmatter()  ← 又一個 Service
  │    ↓
  │    組合 frontmatter + content
  │
  └─ window.electronAPI.writeFile(article.filePath, fullContent)
  ↓
articleStore.updateArticle(article)  ← 回到 Store
  ↓
articles.value[index] = { ...updatedArticle }
  ↓
[觸發 Vue 響應式]
  ↓
filteredArticles computed 重新計算
  ↓
paginatedArticles computed 重新計算
  ↓
ArticleManagement 重新渲染
  ↓
[等待 2-5 秒]
  ↓
Windows 檔案監聽偵測到變化
  ↓
articleStore.handleFileChange(event, filePath)  ← Store 層（檔案監聽邏輯）
  ↓
articleStore.reloadArticleByPath(filePath, ...)  ← Store 層（又是商業邏輯！）
  ↓
window.electronAPI.readFile(filePath)
  ↓
markdownService.parseMarkdown(content)  ← 重複解析
  ↓
articles.value[index] = article  ← 再次觸發響應式
  ↓
[又一次重新渲染]
  ↓
❌ 列表跳動！
```

**數數看經過了多少層**：
1. UI 層
2. Store 層（第一次）
3. Service 層 (ArticleService)
4. Service 層 (BackupService)
5. Service 層 (MarkdownService)
6. Electron API
7. Store 層（第二次 - updateArticle）
8. [延遲 2-5 秒]
9. Store 層（第三次 - handleFileChange）
10. Store 層（第四次 - reloadArticleByPath）
11. Service 層 (MarkdownService - 重複)
12. Electron API（重複）

**至少 12 層調用！簡單的存檔變成了災難。**

---

## 🎯 違反的 SOLID 原則

### S - Single Responsibility (單一職責) ❌

- ArticleService 做了檔案 + 備份 + 衝突檢測
- Article Store 做了狀態管理 + 檔案操作 + 監聽邏輯

### O - Open/Closed (開放封閉) ⚠️

- 每次修改都要改多個檔案（Service + Store + Composable）

### L - Liskov Substitution (里氏替換) N/A

### I - Interface Segregation (介面隔離) ❌

- 沒有明確的介面定義
- Service 之間互相依賴，耦合度高

### D - Dependency Inversion (依賴反轉) ❌

- Store 直接依賴具體的 Service 實作
- 沒有依賴注入，硬編碼依賴

---

## 💡 應該如何設計

### 理想的分層架構

```
┌─────────────────────────────────────┐
│  UI Layer (Vue Components)          │
│  - 只負責渲染和用戶互動               │
│  - 不包含任何商業邏輯                 │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Store Layer (Pinia)                 │
│  - 只負責狀態管理                     │
│  - 不包含商業邏輯                     │
│  - 不直接操作檔案                     │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Service Layer (Business Logic)      │
│  - ArticleService: 文章 CRUD         │
│  - FileWatchService: 檔案監聽         │
│  - 單一職責，每個 Service 只做一件事   │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Infrastructure Layer                │
│  - FileSystem: 檔案操作               │
│  - Markdown Parser: 解析              │
│  - 純工具函數，無狀態                  │
└─────────────────────────────────────┘
```

### 簡化後的 ArticleService

```typescript
// 唯一負責文章商業邏輯的 Service
class ArticleService {
  // 依賴注入
  constructor(
    private fileSystem: FileSystem,
    private markdownParser: MarkdownParser
  ) {}

  // 載入文章
  async loadArticle(filePath: string): Promise<Article> {
    const content = await this.fileSystem.read(filePath)
    const parsed = this.markdownParser.parse(content)
    return this.toArticle(filePath, parsed)
  }

  // 儲存文章
  async saveArticle(article: Article): Promise<void> {
    const content = this.markdownParser.compose(article)
    await this.fileSystem.write(article.filePath, content)
  }

  // 刪除文章
  async deleteArticle(filePath: string): Promise<void> {
    await this.fileSystem.delete(filePath)
  }

  // 就這樣！簡單明瞭！
}
```

### 簡化後的 Store

```typescript
const useArticleStore = defineStore('article', () => {
  // 只管狀態
  const articles = ref<Article[]>([])
  const currentArticle = ref<Article | null>(null)

  // 載入文章（調用 Service）
  async function loadArticles() {
    const loadedArticles = await articleService.scanAndLoad(vaultPath)
    articles.value = loadedArticles
  }

  // 儲存文章（調用 Service）
  async function saveArticle(article: Article) {
    await articleService.saveArticle(article)
    // 更新 Store
    updateArticleInStore(article)
  }

  // 只管理狀態，不包含商業邏輯
  function updateArticleInStore(article: Article) {
    const index = articles.value.findIndex(a => a.id === article.id)
    if (index !== -1) {
      articles.value[index] = article
    }
  }

  // 就這樣！Store 只做狀態管理
  return { articles, currentArticle, loadArticles, saveArticle }
})
```

### 檔案監聽應該獨立

```typescript
// 獨立的 FileWatchService
class FileWatchService {
  private watchedPaths = new Set<string>()

  // 開始監聽
  watch(path: string, callback: (event: FileChangeEvent) => void) {
    window.electronAPI.watchDirectory(path, callback)
    this.watchedPaths.add(path)
  }

  // 停止監聽
  unwatch(path: string) {
    window.electronAPI.unwatchDirectory(path)
    this.watchedPaths.delete(path)
  }
}

// 在 App 層面統一管理
// app.ts
const fileWatchService = new FileWatchService()
fileWatchService.watch(vaultPath, (event) => {
  // 通知 Store 重新載入該文章
  articleStore.reloadArticleFromDisk(event.filePath)
})
```

---

## 🔧 重構建議

### 階段 1：合併重複的服務（緊急）

1. **移除 FileService** - 功能已被 ArticleService 包含
2. **移除 useServices.ts** - 直接用模組單例
3. **BackupService 併入 ArticleService** - 備份是存檔的一部分

### 階段 2：職責分離（重要）

1. **將 Store 中的商業邏輯移到 Service**
   - `reloadArticleByPath` → `ArticleService.loadArticle`
   - `handleFileChange` → `FileWatchService`

2. **簡化 AutoSaveService**
   - 只負責定時觸發
   - 不包含複雜的比對邏輯

### 階段 3：統一入口（中期）

1. **所有檔案操作透過 ArticleService**
2. **Store 只調用 Service，不直接操作檔案**
3. **移除重複的 Markdown 解析**

---

## 📌 立即可做的改善

### 1. 停止檔案監聽的重複 Reload

```typescript
// 在 saveArticle 後，記錄「這是我自己存的」
const recentlySavedFiles = new Map<string, number>()

async function saveArticle(article: Article) {
  await articleService.saveArticle(article)

  // 記錄儲存時間
  recentlySavedFiles.set(normalizePath(article.filePath), Date.now())

  // 3 秒後清除
  setTimeout(() => {
    recentlySavedFiles.delete(normalizePath(article.filePath))
  }, 3000)

  updateArticleInStore(article)
}

// 檔案監聽處理
function handleFileChange(filePath: string) {
  const normalized = normalizePath(filePath)

  // 如果是自己剛存的，跳過
  if (recentlySavedFiles.has(normalized)) {
    console.log('跳過自己儲存的檔案')
    return
  }

  // 否則重新載入
  reloadArticleFromDisk(filePath)
}
```

### 2. 移除不必要的 updateArticle 調用

```typescript
// 儲存後不需要再 updateArticle
// 因為 article 物件根本沒變（除了 lastModified）

async function saveArticle(article: Article) {
  // 更新 lastModified
  article.lastModified = new Date()

  await articleService.saveArticle(article)

  // ❌ 不要這樣
  // updateArticle(article)

  // ✅ 只更新這一個欄位就好
  const index = articles.value.findIndex(a => a.id === article.id)
  if (index !== -1) {
    articles.value[index].lastModified = article.lastModified
  }
}
```

---

## 🎬 總結

**目前的問題**：
1. ✅ 11 個 Service 太多
2. ✅ 職責重疊，違反 SOLID
3. ✅ Store 包含商業邏輯
4. ✅ 過度抽象（Composables）
5. ✅ 調用鏈過長（12 層）
6. ✅ 檔案監聽導致重複更新

**應該做的**：
1. 🎯 合併重複 Service → 3-4 個就夠
2. 🎯 Store 只管狀態
3. 🎯 Service 只管商業邏輯
4. 🎯 移除無意義的抽象層
5. 🎯 檔案監聽獨立管理

**您說得完全正確**：
> "原本很簡單的東西被搞得太複雜了"

這就是典型的**過度工程 (Over-Engineering)**。

---

**建議下一步**：
1. 先用「立即可做的改善」修復跳動問題
2. 再逐步重構服務架構

需要我開始實作「立即改善」的方案嗎？
