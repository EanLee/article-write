# 服務層重構計劃

**目標**: 簡化架構，遵循 SOLID 原則，修復列表跳動問題

---

## ✅ 已完成

### Phase 1A: 建立新服務
- [x] 建立 FileWatchService.ts - 檔案監聽服務
- [x] FileWatchService 單元測試
- [x] MarkdownService 導出單例
- [x] 更新 article.ts 使用 markdownService

### Phase 1B: 重構 Article Store ✅
- [x] 在 ArticleService 中實作 `loadAllArticles` 和 `loadArticle`
- [x] ArticleService 單元測試（13/13 通過）
- [x] 新增 `generateSlug` 和 `generateId` 輔助方法
- [x] 導出 `articleService` 單例
- [x] 更新 article.ts 的 `loadArticles` 使用 ArticleService
- [x] 更新 article.ts 的 `saveArticle` 使用 `ignoreNextChange`
- [x] 新增 `updateArticleInMemory`，取代舊的 `updateArticle`
- [x] 新增 `setupFileWatching` 和相關輔助函數
- [x] 移除舊的 `reloadArticleByPath`, `removeArticleByPath`, `handleFileChange` 等
- [x] 移除 `watchingFiles` 狀態
- [x] 移除 `generateId` 和 `generateSlug` 從 article.ts（已移到 Service）
- [x] 更新測試（199/199 單元測試通過）

---

## 🚧 進行中

### Phase 2: 手動測試與驗證

#### 要移除的功能（移到 Service）
1. `startFileWatching()` - 移到 FileWatchService ✅ 已有
2. `stopFileWatching()` - 移到 FileWatchService ✅ 已有
3. `handleFileChange()` - 移到 FileWatchService ✅ 已有
4. `reloadArticleByPath()` - 移到 ArticleService
5. `removeArticleByPath()` - 可刪除（不需要）

#### Store 應該保留的功能
1. 狀態管理（articles, currentArticle, filter）
2. Computed（filteredArticles, draftArticles, etc.）
3. 簡單的狀態更新（setCurrentArticle, updateFilter）
4. 調用 Service 的包裝函數（loadArticles, saveArticle, etc.）

#### 新的調用流程

**目前（問題）**:
```
用戶點擊保存
  → Store.saveArticle
  → ArticleService.saveArticle
  → 寫入檔案
  → Store.updateArticle  ← 第一次更新
  → [等 2-5 秒]
  → 檔案監聽觸發
  → Store.handleFileChange
  → Store.reloadArticleByPath  ← 第二次更新
  → ❌ 列表跳動
```

**重構後（修復）**:
```
用戶點擊保存
  → Store.saveArticle
  → fileWatchService.ignoreNextChange(filePath)  ← 標記：忽略自己的儲存
  → ArticleService.saveArticle
  → 寫入檔案
  → Store.updateArticleInMemory  ← 只更新記憶體
  → [等 2-5 秒]
  → 檔案監聽觸發
  → FileWatchService: 檢查是否應該忽略
  → ✅ 跳過（因為是自己剛存的）
  → ✅ 列表不會跳動
```

---

## 📝 實作細節

### 1. 修改 saveArticle

```typescript
// src/stores/article.ts

async function saveArticle(article: Article) {
  try {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    // 更新 lastModified
    article.lastModified = new Date()

    // ⚠️ 關鍵：告訴 FileWatchService 忽略接下來的變化
    fileWatchService.ignoreNextChange(article.filePath, 5000)

    // 儲存到磁碟
    const result = await articleService.saveArticle(article)

    if (result.success) {
      // 只更新記憶體中的狀態，不觸發 reload
      updateArticleInMemory(article)
    } else if (result.conflict) {
      notify.warning('檔案衝突', '檔案在外部被修改')
      throw new Error('File conflict')
    } else if (result.error) {
      throw result.error
    }
  } catch (error) {
    console.error('Failed to save article:', error)
    notify.error('儲存失敗', error instanceof Error ? error.message : '無法儲存文章')
    throw error
  }
}
```

### 2. 新增 updateArticleInMemory（取代 updateArticle）

```typescript
/**
 * 更新文章在記憶體中的狀態
 * ⚠️ 只更新 Store，不寫入檔案
 */
function updateArticleInMemory(updatedArticle: Article) {
  const index = articles.value.findIndex(a => a.id === updatedArticle.id)
  if (index !== -1) {
    // 只更新必要的欄位，減少響應式觸發
    articles.value[index] = updatedArticle
  }

  if (currentArticle.value?.id === updatedArticle.id) {
    currentArticle.value = updatedArticle
  }
}
```

### 3. 設置檔案監聽（在 loadArticles 後）

```typescript
async function loadArticles() {
  loading.value = true
  try {
    const vaultPath = configStore.config.paths.articlesDir
    if (!vaultPath) {
      articles.value = []
      loading.value = false
      return
    }

    // 使用 ArticleService 載入文章
    const loadedArticles = await articleService.loadAllArticles(vaultPath)
    articles.value = loadedArticles

    // 設置檔案監聽
    await setupFileWatching(vaultPath)
  } catch (error) {
    console.error('Failed to load articles:', error)
    articles.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 設置檔案監聽
 */
async function setupFileWatching(vaultPath: string) {
  try {
    // 開始監聽
    await fileWatchService.startWatching(vaultPath)

    // 訂閱檔案變化事件
    fileWatchService.subscribe((event) => {
      handleFileChangeEvent(event)
    })
  } catch (error) {
    console.error('Failed to setup file watching:', error)
  }
}

/**
 * 處理檔案變化事件
 */
async function handleFileChangeEvent(event: FileChangeEvent) {
  const { event: type, path: filePath } = event

  // 解析路徑以判斷是哪個資料夾的哪個分類
  const pathInfo = parseArticlePath(filePath, configStore.config.paths.articlesDir)
  if (!pathInfo) {
    return // 不是文章檔案，忽略
  }

  switch (type) {
    case 'add':
    case 'change':
      // 重新載入該文章
      await reloadArticleFromDisk(filePath, pathInfo.status, pathInfo.category)
      break

    case 'unlink':
      // 從 Store 移除
      removeArticleFromMemory(filePath)
      break
  }
}
```

### 4. 新增輔助函數

```typescript
/**
 * 從磁碟重新載入文章
 */
async function reloadArticleFromDisk(
  filePath: string,
  status: ArticleStatus,
  category: ArticleCategory
) {
  try {
    const article = await articleService.loadArticle(filePath, status, category)

    const existingIndex = articles.value.findIndex(
      a => normalizePath(a.filePath) === normalizePath(filePath)
    )

    if (existingIndex !== -1) {
      // 更新現有文章
      articles.value[existingIndex] = article

      if (currentArticle.value &&
          normalizePath(currentArticle.value.filePath) === normalizePath(filePath)) {
        currentArticle.value = article
        notify.info('檔案已更新', '外部修改已同步')
      }
    } else {
      // 新增文章
      articles.value.push(article)
      notify.info('新增文章', `偵測到新文章：${article.title}`)
    }
  } catch (error) {
    console.warn(`Failed to reload article ${filePath}:`, error)
  }
}

/**
 * 從記憶體移除文章
 */
function removeArticleFromMemory(filePath: string) {
  const normalizedPath = normalizePath(filePath)
  const index = articles.value.findIndex(
    a => normalizePath(a.filePath) === normalizedPath
  )

  if (index !== -1) {
    const article = articles.value[index]
    articles.value.splice(index, 1)

    if (currentArticle.value &&
        normalizePath(currentArticle.value.filePath) === normalizedPath) {
      currentArticle.value = null
    }

    notify.info('文章已移除', `偵測到文章被刪除：${article.title}`)
  }
}

/**
 * 解析文章路徑，取得狀態和分類
 */
function parseArticlePath(
  filePath: string,
  vaultPath: string
): { status: ArticleStatus; category: ArticleCategory } | null {
  const relativePath = normalizePath(filePath)
    .replace(normalizePath(vaultPath), '')
    .replace(/^\//, '')

  const parts = relativePath.split('/')
  if (parts.length < 3 || !parts[2].endsWith('.md')) {
    return null
  }

  const [statusFolder, category] = parts
  const status = statusFolder === 'Publish' ? ArticleStatus.Published : ArticleStatus.Draft

  if (!['Software', 'growth', 'management'].includes(category)) {
    return null
  }

  return {
    status,
    category: category as ArticleCategory
  }
}
```

---

## 📋 Phase 1 待辦清單（已完成✅）

- [x] 在 ArticleService 中實作 `loadAllArticles` 和 `loadArticle` ✅
- [x] ArticleService 單元測試（13/13 通過）✅
- [x] 新增 `generateSlug` 和 `generateId` 輔助方法 ✅
- [x] 導出 `articleService` 單例 ✅
- [x] 更新 article.ts 的 `loadArticles` 使用 ArticleService ✅
- [x] 更新 article.ts 的 `saveArticle` 使用 `ignoreNextChange` ✅
- [x] 新增 `updateArticleInMemory`，移除舊的 `updateArticle` ✅
- [x] 新增 `setupFileWatching` 和相關輔助函數 ✅
- [x] 移除舊的 `reloadArticleByPath`, `removeArticleByPath`, `handleFileChange` 等 ✅
- [x] 移除 `watchingFiles` 狀態 ✅
- [x] 移除 `generateId` 和 `generateSlug` 從 article.ts（已移到 Service）✅
- [x] 更新測試（199/199 單元測試通過）✅

## 📋 Phase 2 待辦清單（當前階段）

- [ ] 手動測試：確認列表不會跳動
- [ ] 建立手動測試報告
- [ ] 更新 Bug Fix 報告（確認問題已解決）
- [ ] 重構 `article.path-handling.test.ts`（目前 skip 的 7 個測試）

---

## 🧪 測試計劃

### 單元測試
1. FileWatchService.test.ts ✅ 已完成
2. ArticleService.test.ts - 需要更新
3. article.test.ts - 需要更新

### 手動測試場景
1. **場景 1**: 點擊文章 → 等待 6 秒 → 列表不應跳動
2. **場景 2**: 編輯並儲存 → 等待 6 秒 → 列表不應跳動
3. **場景 3**: 外部編輯器修改文章 → Store 應該同步
4. **場景 4**: 外部編輯器新增文章 → 列表應該更新
5. **場景 5**: 外部編輯器刪除文章 → 列表應該更新

---

## 📊 當前進度

- **Phase 1A**: ✅ 完成（FileWatchService 建立完成）
- **Phase 1B**: ✅ 完成（Article Store 重構完成，199/199 測試通過）
- **Phase 2**: 🚧 進行中（手動測試驗證）

**相關 Commits**:
- `1916f2b` - feat(service): 實作 ArticleService 的文章載入方法
- `27c98f7` - docs(refactor): 更新重構計劃進度
- `9b0c8aa` - refactor(store): 重構 article store 使用新的服務層架構
- `c475943` - test: 修復所有單元測試使其通過

**下一步**: 手動測試應用程式，驗證列表跳動問題已修復
