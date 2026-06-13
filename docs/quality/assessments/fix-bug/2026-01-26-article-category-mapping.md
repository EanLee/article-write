# 文章分類映射錯誤 Bug Fix 報告

**日期**: 2026-01-26
**影響範圍**: 文章管理 / 資料層 / Store
**嚴重程度**: Critical

## 問題描述

### 問題現象
1. **Series 被誤判為 Category**：
   - frontmatter 中的 `series` 欄位（系列文，如「React 入門系列」）被當作文章分類
   - 導致文章列表的 collection（系列分組）功能完全失效

2. **分類亂指定**：
   - 有些文章沒有 frontmatter 或缺少 `categories` 欄位
   - 系統隨機或錯誤地指定分類
   - 分類值未經驗證，出現無效的 category

### 發生條件
- 載入文章時
- 文章沒有明確的 frontmatter.categories
- 或 categories 值不在 ArticleCategory enum 中

### 影響範圍
- 所有文章的分類顯示錯誤
- 文章列表按系列分組功能失效
- 文章管理頁面的篩選功能異常
- 數據統計不準確

### 重現步驟
1. 建立一篇文章，frontmatter 中只有 `series: "某系列"`，沒有 `categories`
2. 載入應用程式
3. 觀察文章列表：series 被當作 category
4. 系列分組功能不起作用

## 原因分析

### 程式碼層面問題

在 `src/stores/article.ts` 的 `loadArticles` 函數中：

```typescript
const article: Article = {
  id: generateId(),
  title: frontmatter.title || file.replace('.md', ''),
  slug: file.replace('.md', ''),
  filePath,
  status: folder.status,
  category: category as 'Software' | 'growth' | 'management',  // ❌ 問題
  lastModified,
  content: articleContent,
  frontmatter
}
```

### 根本原因

1. **錯誤的映射邏輯**：
   - 直接將資料夾名稱（`category` 變數）當作文章分類
   - 完全忽略 frontmatter.categories 欄位
   - Series 和 Category 概念混淆

2. **缺少驗證機制**：
   - 沒有檢查資料夾名稱是否為有效的 ArticleCategory
   - 沒有處理 frontmatter.categories 不存在的情況
   - 沒有預設值機制

3. **型別系統繞過**：
   - 使用 `as` 類型斷言強制轉換
   - 繞過了 TypeScript 的型別檢查
   - 導致執行時期出現無效值

### 資料結構設計

**正確的概念**：
- `category`：文章分類（Software / Growth / Management）
- `series`：系列文標記（如「React 入門系列」）
- 兩者是獨立的概念，不應混淆

**Frontmatter 結構**：
```yaml
---
title: "文章標題"
categories: ["Software"]  # 分類（陣列）
series: "React 入門系列"   # 系列（可選）
seriesOrder: 1           # 系列順序（可選）
---
```

## 修正方式

### 修改的檔案
`src/stores/article.ts`

### 修改的邏輯

**新增驗證與映射邏輯**：

```typescript
// 決定文章分類：優先從 frontmatter.categories 取得，其次使用資料夾名稱
let articleCategory: ArticleCategory

if (frontmatter.categories && frontmatter.categories.length > 0) {
  // 從 frontmatter.categories 陣列取第一個有效值
  const firstCategory = frontmatter.categories[0]
  if (Object.values(ArticleCategory).includes(firstCategory as ArticleCategory)) {
    articleCategory = firstCategory as ArticleCategory
  } else {
    // 如果 categories 值不在 enum 中，使用資料夾名稱或預設值
    articleCategory = (Object.values(ArticleCategory).includes(category as ArticleCategory)
      ? category
      : ArticleCategory.Software) as ArticleCategory
  }
} else {
  // 沒有 frontmatter.categories，使用資料夾名稱或預設值
  articleCategory = (Object.values(ArticleCategory).includes(category as ArticleCategory)
    ? category
    : ArticleCategory.Software) as ArticleCategory
}

const article: Article = {
  id: generateId(),
  title: frontmatter.title || file.replace('.md', ''),
  slug: frontmatter.slug || file.replace('.md', ''),
  filePath,
  status: folder.status,
  category: articleCategory,  // ✅ 使用經過驗證的分類
  lastModified,
  content: articleContent,
  frontmatter  // series 正確保留在 frontmatter 中
}
```

### 邏輯流程圖

```
開始
  ↓
檢查 frontmatter.categories 是否存在且有值？
  ├─ 是 → 第一個值是否在 ArticleCategory enum 中？
  │        ├─ 是 → 使用該值 ✅
  │        └─ 否 → 繼續下一步
  └─ 否 → 繼續下一步
       ↓
檢查資料夾名稱是否在 ArticleCategory enum 中？
  ├─ 是 → 使用資料夾名稱 ✅
  └─ 否 → 使用預設值 ArticleCategory.Software ✅
```

### 為什麼這個方案能解決問題

1. **優先級明確**：
   - 優先使用 frontmatter.categories（明確的使用者意圖）
   - 其次使用資料夾名稱（結構化組織）
   - 最後使用預設值（確保不會出現無效值）

2. **嚴格驗證**：
   - 所有值都透過 `Object.values(ArticleCategory).includes()` 驗證
   - 確保只有 enum 中定義的值才會被使用
   - 防止執行時期的型別錯誤

3. **概念分離**：
   - `category` 和 `series` 各司其職
   - series 保留在 frontmatter 中，供文章列表分組使用
   - category 用於文章分類和篩選

4. **向後相容**：
   - 沒有 frontmatter.categories 的舊文章仍能正常運作
   - 使用資料夾名稱作為後備方案
   - 不會破壞現有資料

### 其他替代方案

**方案 A**：強制要求所有文章必須有 frontmatter.categories
```typescript
if (!frontmatter.categories || frontmatter.categories.length === 0) {
  throw new Error('Article must have categories in frontmatter')
}
```
❌ 缺點：破壞向後相容性，需要修改所有舊文章

**方案 B**：從資料夾結構自動推斷 category
```typescript
// 根據檔案路徑判斷：.../Software/... → Software
const pathCategory = filePath.split('/').find(seg =>
  Object.values(ArticleCategory).includes(seg as ArticleCategory)
)
```
❌ 缺點：過度依賴檔案結構，不夠彈性

**選擇理由**：
採用的方案平衡了**明確性**（優先使用 frontmatter）、**向後相容**（支援資料夾名稱）和**安全性**（嚴格驗證 + 預設值）。

## 相關 Commit

- `a7e9c47`: fix(store): 修復 frontmatter 與 category 映射邏輯
