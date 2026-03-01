# A6-01 修正：reloadArticle 欄位不一致問題

**日期**: 2026-03-01  
**分類**: 正確性 (Architecture Review — A6-01)  
**分支**: `fix/reload-article-consistency`

---

## 問題描述

`reloadArticle(id)` 直接透過 `window.electronAPI.readFile` 讀取檔案，再手動呼叫 `markdownService.parseMarkdown`，重建 `Article` 物件時只更新了 `title`、`content`、`frontmatter`、`lastModified`，**遺漏**以下欄位：

| 遺漏欄位 | 說明 |
|----------|------|
| `wordCount` | 字數計算，由 ArticleService 負責 |
| `slug` | SEO 路徑，由 ArticleService 產生 |
| `tags` | 標籤陣列，由 ArticleService 解析 |
| `excerpt` | 摘要，由 ArticleService 截取 |
| `id` | 依賴 `articleService.generateIdFromPath()`，若手動重建則不一致 |

相比之下，`reloadArticleFromDisk(filePath, category)` 已正確使用 `articleService.loadArticle()`。

---

## 根本原因

功能重複實作：`reloadArticle` 與 `reloadArticleFromDisk` 本質上相同（從磁碟重新載入單一文章），但前者繞過了 `ArticleService` 的完整解析管道。

---

## 解決方案

重寫 `reloadArticle` 函式，改為：
1. 由 id 找出文章取得 `filePath` 與 `category`
2. 委派給 `articleService.loadArticle(filePath, category)` 完整載入
3. 保留原有 `id`，避免 UI 組件因 id 變動而重新掛載
4. 移除對 `window.electronAPI` 的直接依賴（符合 IPC 抽象）
5. 移除不再使用的 `markdownService` import

---

## 修改檔案

| 檔案 | 變更 |
|------|------|
| `src/stores/article.ts` | `reloadArticle` 改用 `articleService.loadArticle()`；移除 `markdownService` import |

---

## 修改前後比較

### 修改前（存在問題）

```typescript
async function reloadArticle(id: string) {
  // ...
  const content = await window.electronAPI.readFile(article.filePath);
  const { frontmatter, content: articleContent } = markdownService.parseMarkdown(content);
  const fileStats = await window.electronAPI.getFileStats(article.filePath);
  const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date();

  const reloadedArticle: Article = {
    ...article,               // ← 舊欄位 spread (wordCount/slug 保持舊值)
    title: frontmatter.title || article.title,
    content: articleContent,
    frontmatter,
    lastModified,             // ← 缺 wordCount, slug, tags, excerpt
  };
}
```

### 修改後（正確）

```typescript
async function reloadArticle(id: string) {
  // ...
  // 使用 ArticleService 載入完整文章（包含 wordCount、slug、tags、excerpt 等欄位）
  const reloadedArticle = await articleService.loadArticle(article.filePath, article.category);

  const index = articles.value.findIndex((a) => a.id === id);
  if (index !== -1) {
    articles.value[index] = { ...reloadedArticle, id }; // 保留原有 id
    if (currentArticle.value?.id === id) {
      currentArticle.value = articles.value[index];
    }
  }
}
```

---

## 影響範圍

- `reloadArticle` 在手動「重新載入」按鈕與儲存衝突後的回呼中被呼叫
- 修正後欄位完整，TipTap/CodeMirror 顯示與清單排序不再使用過時舊值
