# 文章列表問題根本原因分析

**日期**: 2026-01-26
**分析者**: Claude Code
**問題描述**:
1. 點選文章後，過幾秒會跳到列表第一個
2. 有時候會意外產生新文件

---

## 完整資料流追蹤

### 用戶點擊文章時的完整流程

```
用戶點擊文章列表中的文章
  ↓
ArticleManagement.vue::handleRowClick()
  ↓
ArticleManagement.vue::handleEditArticle()
  ↓
articleStore.setCurrentArticle(article)  ← 關鍵點 1
  ↓
autoSaveService.saveOnArticleSwitch(previousArticle)  ← 關鍵點 2
  ↓
[檢查內容是否有變更]
  ↓
(如果有變更) articleStore.saveArticle(previousArticle)  ← 關鍵點 3
  ↓
更新 lastModified = new Date()
  ↓
articleService.saveArticle() - 寫入檔案到磁碟
  ↓
articleStore.updateArticle()  ← 關鍵點 4
  ↓
articles.value[index] = { ...updatedArticle }  ← 觸發 Vue 響應式！
  ↓
[響應式連鎖反應]
  ├─ filteredArticles computed 重新計算
  ├─ paginatedArticles computed 重新計算
  └─ ArticleManagement 表格重新渲染
  ↓
[同時] 檔案監聽偵測到檔案變化 (延遲 ~幾秒)  ← 關鍵點 5
  ↓
handleFileChange() → reloadArticleByPath()
  ↓
articles.value[existingIndex] = article  ← 再次觸發響應式！
  ↓
[再次響應式連鎖反應]
```

---

## 問題 1：點選文章後跳到第一個

### 可能的根本原因（按可能性排序）

#### 假設 A：表格容器滾動位置重置 ⭐⭐⭐⭐⭐

**問題描述**：
- 當 `articles.value[index]` 更新時，觸發 `filteredArticles` 和 `paginatedArticles` 重新計算
- Vue 重新渲染表格（雖然內容和順序沒變）
- 表格容器 (`<div class="table-container">`) 的 `scrollTop` 可能被重置為 0

**證據**：
1. ArticleManagement.vue 第 457-461 行定義了可滾動容器：
   ```vue
   <div class="table-container">  <!-- flex: 1, overflow: auto -->
     <table class="table table-sm table-pin-rows table-zebra">
   ```

2. Vue 3 的響應式更新可能導致 DOM 重新創建，進而重置滾動位置

3. 用戶描述「過幾秒會跳」，這與檔案監聽的延遲時間吻合

**驗證方法**：
```typescript
// 在 ArticleManagement.vue 添加
const tableContainerRef = ref<HTMLElement>()

watch(paginatedArticles, () => {
  console.log('paginatedArticles 更新，scrollTop:', tableContainerRef.value?.scrollTop)
})
```

**修復方案**：
保存並恢復滾動位置：
```typescript
const savedScrollTop = ref(0)

function handleEditArticle(article: Article) {
  // 保存滾動位置
  if (tableContainerRef.value) {
    savedScrollTop.value = tableContainerRef.value.scrollTop
  }

  articleStore.setCurrentArticle(article)
  emit('edit-article')

  // 恢復滾動位置
  nextTick(() => {
    if (tableContainerRef.value) {
      tableContainerRef.value.scrollTop = savedScrollTop.value
    }
  })
}
```

---

#### 假設 B：檔案監聽的延遲觸發二次更新 ⭐⭐⭐⭐

**問題描述**：
- 用戶點擊文章 → 立即切換到編輯視圖
- 幾秒後，檔案監聽觸發 `reloadArticleByPath()`
- 再次更新 `articles.value`，觸發重新渲染
- 如果用戶在延遲期間切回 ArticleManagement 視圖，就會看到「跳動」

**證據**：
1. article.ts 第 455-480 行的 `handleFileChange` 會在檔案變化時觸發
2. 第 517-518 行有時間檢查，但只影響通知顯示，不影響更新本身：
   ```typescript
   const timeDiff = Date.now() - lastModified.getTime()
   if (timeDiff > 2000) {  // 只影響是否顯示通知
     notify.info('檔案已更新', '外部修改已同步')
   }
   ```

**時間軸**：
```
T=0s   : 用戶點擊文章 → saveArticle → 寫入檔案
T=0.1s : updateArticle → 第一次觸發響應式
T=0.2s : 切換到編輯視圖
T=2-5s : 檔案監聽偵測到變化 → reloadArticleByPath
T=2-5s : 第二次更新 articles.value → 第二次觸發響應式
         (如果用戶在 ArticleManagement 視圖，就會看到跳動)
```

**修復方案**：
1. 避免重複更新：在 `saveArticle` 成功後，短時間內忽略相同檔案的 `reloadArticleByPath`
2. 或者：在切換文章時，不要立即觸發 `updateArticle`，等檔案監聽統一處理

---

#### 假設 C：AutoSaveService 誤判內容有變更 ⭐⭐⭐

**問題描述**：
- `hasContentChanged()` 可能誤判內容有變更
- 導致不必要的儲存，觸發連鎖反應

**已有證據**：
1. AutoSaveService.ts 第 131-139 行已加入詳細日誌：
   ```typescript
   console.group(`🔍 切換文章檢查: ${previousArticle.title}`)
   console.log('hasChanged:', hasChanged)
   console.log('currentContent length:', currentContent?.length)
   // ...
   ```

2. 存在 Bug Fix 報告：`docs/fix-bug/2026-01-26-autosave-false-positive.md`

**驗證方法**：
需要查看 Console 日誌，確認 `hasChanged` 是否誤判

---

#### 假設 D：currentPage 被意外重置 ⭐⭐

**問題描述**：
- 雖然 watch 只監視 `filters` 和 `pageSize`
- 但組件重新掛載時，`currentPage` 會重置為預設值 `ref(1)`

**證據**：
ArticleManagement.vue 第 239 行：
```typescript
const currentPage = ref(1)  // 預設值為 1
```

如果 ArticleManagement 組件被卸載後重新掛載，`currentPage` 會重置。

**驗證方法**：
```typescript
onMounted(() => {
  console.log('ArticleManagement mounted, currentPage:', currentPage.value)
})

onUnmounted(() => {
  console.log('ArticleManagement unmounted')
})
```

---

#### 假設 E：Vue Key 導致重新渲染 ⭐

**檢查結果**：不太可能

ArticleManagement.vue 第 100 行：
```vue
<tr
  v-for="(article, index) in paginatedArticles"
  :key="article.id"  <!-- ✅ 使用穩定的 ID -->
```

`article.id` 是穩定的，不會改變，因此這不是原因。

---

## 問題 2：有時產生新文件

### 根本原因：Windows 路徑格式不一致 ⭐⭐⭐⭐⭐

**問題描述**：
- `loadArticles` 和檔案監聽產生的 `filePath` 格式不一致
- 導致 `findIndex` 找不到現有文章
- 被誤判為「新文章」加入列表

**證據 1：loadArticles 使用正斜線**

article.ts 第 147 行：
```typescript
const filePath = `${categoryPath}/${file}`
// 例如：C:/Users/Ean/Desktop/R/vault/Drafts/Software/article.md
```

**證據 2：檔案監聽可能傳入反斜線**

article.ts 第 460 行：
```typescript
const relativePath = filePath.replace(vaultPath, '').replace(/\\/g, '/')
```

這裡將反斜線轉換為正斜線，但只處理**相對路徑**！

傳入的 `filePath` (絕對路徑) 可能仍包含反斜線：
```
// Windows 檔案監聽可能返回：
C:\Users\Ean\Desktop\R\vault\Drafts\Software\article.md

// loadArticles 產生的路徑：
C:/Users/Ean/Desktop/R/vault/Drafts/Software/article.md
```

**證據 3：路徑比對失敗導致重複**

article.ts 第 498 行：
```typescript
const existingIndex = articles.value.findIndex(a => a.filePath === filePath)
```

如果 `a.filePath` 使用正斜線，`filePath` 使用反斜線，比對會失敗！

**結果流程**：
```
1. loadArticles() 載入文章
   → article.filePath = "C:/Users/.../article.md"

2. 用戶編輯文章 → 儲存 → 寫入檔案

3. 檔案監聽偵測到變化
   → handleFileChange(event, "C:\Users\...\article.md")  ← 反斜線！

4. reloadArticleByPath("C:\Users\...\article.md", ...)
   → existingIndex = articles.value.findIndex(a => a.filePath === "C:\Users\...\article.md")
   → 比對失敗！(因為 store 中是 "C:/Users/.../article.md")

5. existingIndex === -1
   → 生成新的 ID
   → articles.value.push(article)  ← 加入「新文章」！

6. 結果：列表中出現兩個相同的文章（ID 不同）
```

**修復方案**：

**方案 A：規範化所有路徑（推薦）**
```typescript
// 創建路徑規範化工具函數
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

// 在所有路徑比對前規範化
const existingIndex = articles.value.findIndex(
  a => normalizePath(a.filePath) === normalizePath(filePath)
)
```

**方案 B：在 loadArticles 時就規範化**
```typescript
const filePath = normalizePath(`${categoryPath}/${file}`)
```

**方案 C：在檔案監聽時規範化**
```typescript
async function handleFileChange(event: string, filePath: string) {
  filePath = normalizePath(filePath)  // ← 立即規範化
  // ...
}
```

**最佳實踐**：同時使用方案 A + B + C，確保整個應用程式的路徑格式一致。

---

## 綜合建議

### 立即修復（高優先級）

1. **修復路徑不一致問題** - 避免產生重複文章
   - 實作 `normalizePath()` 工具函數
   - 在所有路徑操作處使用

2. **保存並恢復滾動位置** - 避免跳到第一個
   - 在 `handleEditArticle` 中保存/恢復 `scrollTop`

### 深入調查（中優先級）

3. **檢查 AutoSaveService 日誌** - 確認是否有誤判
   - 執行應用程式
   - 點擊文章切換
   - 檢查 Console 輸出

4. **避免重複更新** - 優化檔案監聽邏輯
   - 在 `saveArticle` 後短時間內（如 3 秒）忽略相同檔案的 `reloadArticleByPath`
   - 或使用去抖（debounce）機制

### 長期優化（低優先級）

5. **改進檔案監聽機制**
   - 考慮使用更可靠的檔案監聽庫
   - 統一路徑格式標準

6. **效能優化**
   - 減少不必要的響應式觸發
   - 考慮使用 `shallowRef` 等優化手段

---

## 驗證清單

修復後需要驗證：

- [ ] **路徑問題**
  - [ ] 新增文章後，不會產生重複
  - [ ] 編輯文章後，不會產生重複
  - [ ] 檔案監聽觸發時，正確更新現有文章

- [ ] **跳動問題**
  - [ ] 點擊文章後，列表不會跳到頂部
  - [ ] 滾動位置保持穩定
  - [ ] 即使過幾秒後也不會跳動

- [ ] **功能正常**
  - [ ] 文章切換正常
  - [ ] 自動儲存正常
  - [ ] 檔案監聽正常
  - [ ] 排序和篩選正常

---

## 附錄：關鍵程式碼位置

- `ArticleManagement.vue`
  - 第 315-323 行：handleRowClick / handleEditArticle
  - 第 286-288 行：currentPage watch
  - 第 457-461 行：表格容器

- `src/stores/article.ts`
  - 第 409-420 行：setCurrentArticle
  - 第 278-317 行：saveArticle
  - 第 325-335 行：updateArticle
  - 第 455-480 行：handleFileChange
  - 第 482-531 行：reloadArticleByPath (第 498 行是關鍵)

- `src/services/AutoSaveService.ts`
  - 第 116-153 行：saveOnArticleSwitch
  - 第 188-196 行：hasContentChanged

---

**結論**：

1. **「跳到第一個」問題** 最可能是 **滾動位置重置** 和 **檔案監聽延遲觸發二次更新** 的組合效應
2. **「產生新文件」問題** 幾乎可以確定是 **Windows 路徑格式不一致** 導致的

建議優先修復路徑問題（確定性高、影響大），然後處理滾動位置問題。
