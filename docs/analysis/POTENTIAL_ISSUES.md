# 🐛 潛在問題清單

本文件記錄了程式碼庫中發現的所有潛在問題，依優先級和類別分類。

## 📋 目錄

- [🔴 高優先級 (Critical)](#-高優先級-critical)
- [🟡 中優先級 (High)](#-中優先級-high)
- [🟢 低優先級 (Medium)](#-低優先級-medium)
- [🔵 優化建議 (Low)](#-優化建議-low)

---

## 🔴 高優先級 (Critical)

### ✅ Issue #1: MainEditor 事件監聽器記憶體洩漏 (已修復)

**檔案:** `src/components/MainEditor.vue:594`
**修復提交:** `7188e9a`

**問題描述:**
```typescript
// onMounted 中加入了 document 事件監聽器，但沒有在 onUnmounted 清理
document.addEventListener('click', (event) => {
    if (!editorRef.value?.contains(event.target as Node)) {
        hideSuggestions();
    }
});
```

**影響:**
- 組件卸載後事件監聽器仍然存在
- 每次掛載組件都會新增一個監聽器
- 導致記憶體洩漏和潛在的崩潰

**解決方案:**
```typescript
// 在組件外部定義處理函數
const handleClickOutside = (event: MouseEvent) => {
    if (!editorRef.value?.contains(event.target as Node)) {
        hideSuggestions();
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
```

**優先級:** 🔴 Critical - 會導致記憶體洩漏

---

### ✅ Issue #2: ResizableSidebar 拖曳時組件卸載導致監聽器洩漏 (已修復)

**檔案:** `src/components/ResizableSidebar.vue:127-128`
**修復提交:** `7188e9a`

**問題描述:**
```typescript
function startResize(e: MouseEvent) {
  // ...
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// onMouseUp 會清理，但如果組件在拖曳過程中卸載，監聽器會洩漏
onUnmounted(() => {
  if (isResizing.value) {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    // ❌ 缺少 removeEventListener
  }
})
```

**影響:**
- 在拖曳過程中切換視圖會造成監聽器洩漏
- 累積大量監聽器會影響效能

**解決方案:**
```typescript
onUnmounted(() => {
  // 清理樣式
  if (isResizing.value) {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  // 強制移除事件監聽器
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
```

**優先級:** 🔴 Critical

---

### ✅ Issue #3: ServerControlPanel 拖曳時組件卸載導致監聽器洩漏 (已修復)

**檔案:** `src/components/ServerControlPanel.vue:240-241`
**修復提交:** `7188e9a`

**問題描述:**
同 Issue #2，相同的模式

**解決方案:**
```typescript
// 需要加入 onUnmounted 清理
onUnmounted(() => {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})
```

**優先級:** 🔴 Critical

---

## 🟡 中優先級 (High)

### ✅ Issue #4: Frontmatter 類型定義與實際數據不一致 (已修復)

**檔案:** `src/types/index.ts:14-25`
**修復提交:** `cb6df6f`

**問題描述:**
```typescript
export interface Frontmatter {
  tags: string[]        // ❌ 定義為必填，但實際可能是 undefined
  categories: string[]  // ❌ 定義為必填，但實際可能是 undefined
  series?: string       // ✅ 正確標記為可選
  seriesOrder?: number  // ✅ 正確標記為可選
}
```

**影響:**
- TypeScript 類型檢查無法捕捉到 `tags` 和 `categories` 可能為 undefined 的情況
- 導致之前的多個崩潰問題（已修復，但類型定義仍需修正）

**解決方案:**
```typescript
export interface Frontmatter {
  title: string
  description?: string
  date: string
  lastmod?: string
  tags?: string[]       // 改為可選
  categories?: string[] // 改為可選
  slug?: string
  keywords?: string[]
  series?: string
  seriesOrder?: number
}
```

**注意:** 修改後需要全域檢查所有使用 `frontmatter.tags` 和 `frontmatter.categories` 的地方

**優先級:** 🟡 High - 影響類型安全

---

### ✅ Issue #5: Article.content 可能為空字串導致的邏輯問題 (已修復)

**檔案:** 多個位置
**修復提交:** `0544c71`

**問題描述:**
```typescript
// src/stores/article.ts:52
const contentMatch = article.content.toLowerCase().includes(searchLower)

// src/services/ImageService.ts:191
const lines = article.content.split('\n')
```

雖然 `content` 定義為 `string` 不是可選的，但新建立的文章可能是空字串。

**影響:**
- 空字串不會導致崩潰，但可能產生不預期的行為
- 搜尋空內容總是返回 false

**解決方案:**
考慮在搜尋邏輯中加入空值檢查：
```typescript
const contentMatch = article.content
  ? article.content.toLowerCase().includes(searchLower)
  : false
```

**優先級:** 🟡 High

---

### ✅ Issue #6: AutoSaveService 初始化檢查不足 (已修復)

**檔案:** `src/services/AutoSaveService.ts`
**修復提交:** `c621b75`

**問題描述:**
服務在未初始化時調用方法可能導致錯誤

**影響:**
- 如果在 `initialize()` 之前調用 `markDirty()` 等方法，可能產生 undefined 錯誤

**解決方案:**
在關鍵方法中加入初始化檢查：
```typescript
markDirty(articleId: string): void {
  if (!this.initialized) {
    console.warn('AutoSaveService not initialized')
    return
  }
  // ...
}
```

**優先級:** 🟡 High

---

## 🟢 低優先級 (Medium)

### Issue #7: 檔案監聽 unsubscribe 函數可能未清理

**檔案:** `src/stores/article.ts:399`

**問題描述:**
```typescript
unsubscribeFileChange = window.electronAPI.onFileChange(async (data) => {
  await handleFileChange(data.event, data.path)
})
```

雖然有 `stopFileWatching()` 方法，但不確定是否在所有情況下都會被調用（如應用關閉時）

**解決方案:**
確保在應用關閉前調用清理函數，或在 store 中加入 dispose 模式

**優先級:** 🟢 Medium

---

### Issue #8: Watch 回調沒有清理機制

**檔案:** `src/stores/article.ts:601`

**問題描述:**
```typescript
watch(
  () => configStore.config.editorConfig,
  (newConfig) => {
    autoSaveService.setEnabled(newConfig.autoSave)
    autoSaveService.setInterval(newConfig.autoSaveInterval || 30000)
  },
  { deep: true }
)
```

Pinia store 中的 watch 會在整個應用生命週期中存在，但如果需要動態 dispose，沒有保留 stop handle

**解決方案:**
如果需要動態清理：
```typescript
const stopWatch = watch(/* ... */)
// 在需要時調用 stopWatch()
```

**優先級:** 🟢 Medium - store 通常是單例，不需要清理

---

### Issue #9: EditorPane ref 在 Raw 模式下為 undefined 的邊界情況

**檔案:** `src/components/MainEditor.vue`

**問題描述:**
雖然已經在大部分地方加入了 `editorRef.value?.` 檢查，但仍有一些邊界情況：

```typescript
// useUndoRedo 中的游標位置獲取
() => editorRef.value?.selectionStart || 0
```

在 Raw 模式下，`editorRef.value` 是 undefined，返回 0 作為默認值是合理的，但可能不是最佳的語義。

**解決方案:**
考慮在 Raw 模式下完全禁用 undo/redo 功能，或使用獨立的歷史系統

**優先級:** 🟢 Medium

---

## 🔵 優化建議 (Low)

### Issue #10: ArticleListTree setInterval 頻率過高

**檔案:** `src/components/ArticleListTree.vue:312`

**問題描述:**
```typescript
const saveTimer = setInterval(saveSettings, 1000)
```

每秒儲存一次設定可能過於頻繁，特別是 localStorage 操作有一定開銷

**建議:**
- 改為 3-5 秒儲存一次
- 或使用 debounce/throttle 模式
- 或改用 watch + debounce

**優先級:** 🔵 Low - 優化建議

---

### Issue #11: 缺少全域錯誤邊界

**檔案:** 應用層級

**問題描述:**
Vue 應用沒有設置全域錯誤處理器

**建議:**
```typescript
// src/main.ts
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err, info)
  // 可以整合到 NotificationService
}
```

**優先級:** 🔵 Low

---

### Issue #12: 類型安全可以加強

**問題描述:**
一些地方使用了 `any` 或類型斷言

**建議:**
- 全域搜尋 `as any` 並替換為更精確的類型
- 啟用更嚴格的 TypeScript 配置

**優先級:** 🔵 Low

---

## 📝 檢查清單

### 已完成 ✅
- [x] 檢查事件監聽器洩漏
- [x] 檢查定時器洩漏
- [x] 檢查可選屬性訪問
- [x] 檢查異步錯誤處理
- [x] 檢查 Watch 和 Computed

### 需要修復 ⚠️
- [x] Issue #1: MainEditor 事件監聽器清理 ✅ (commit: 7188e9a)
- [x] Issue #2: ResizableSidebar 監聽器清理 ✅ (commit: 7188e9a)
- [x] Issue #3: ServerControlPanel 監聽器清理 ✅ (commit: 7188e9a)
- [x] Issue #4: Frontmatter 類型定義修正 ✅ (commit: cb6df6f)
- [x] Issue #5: Article.content 空值處理 ✅ (commit: 0544c71)
- [x] Issue #6: AutoSaveService 初始化檢查 ✅ (commit: c621b75)

### 開發注意事項 📌

#### Frontmatter `date` 欄位語意說明

**欄位名稱**：`date`（沿用部落格框架，不可更改）
**實際語意**：公開/發佈時間，**不是建立時間**

| 情況 | 行為 |
|------|------|
| frontmatter 已有 `date` | 直接沿用，不覆蓋 |
| frontmatter 無 `date` | 同步時由 `PublishService.convertFrontmatter()` 自動填入當日日期 |

> 在文章發佈前，`date` 可以是空值。建立時間不單獨儲存。
> 相關位置：`src/types/index.ts` → `Frontmatter.date`；`src/main/services/PublishService.ts` → `convertFrontmatter()`

### 可選優化 💡
- [ ] Issue #7-12: 中低優先級優化

---

## 🎯 建議修復順序

1. **第一階段（Critical）:** 修復 Issue #1-3 的事件監聽器洩漏
2. **第二階段（High）:** 修復 Issue #4-6 的類型和初始化問題
3. **第三階段（Medium/Low）:** 根據需求選擇性修復其他問題

---

**檢查日期:** 2025-01-24
**檢查者:** Claude Code
**程式碼版本:** develop branch (commit: c621b75)
**最後更新:** 2025-01-24
- **階段 1 完成:** 修復 Issue #1-3 (Critical)
- **階段 2 完成:** 修復 Issue #4-6 (High Priority)
- **狀態:** 所有 Critical 和 High Priority issues 已修復 ✅
