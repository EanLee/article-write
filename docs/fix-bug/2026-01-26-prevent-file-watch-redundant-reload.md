# 防止檔案監聽重複 Reload Bug Fix 報告

**日期**: 2026-01-26
**影響範圍**: Article Store / 檔案監聽
**嚴重程度**: Medium

## 問題描述

即使修復了路徑問題和滾動位置問題，列表仍然會跳動。

### 根本原因分析

**問題不在於誤判儲存，而在於檔案監聽的延遲觸發**：

```
時間軸：
T=0s   : 用戶點擊文章 A → setCurrentArticle(A)
         → 可能觸發 saveArticle(previousArticle)
         → 寫入檔案到磁碟
         → updateArticle → 第一次更新 articles.value

T=0.1s : 列表重新渲染（第一次）
         → 滾動位置被恢復（我們的修復）
         → ✅ 看起來正常

T=2-5s : Windows 檔案監聽偵測到檔案變化
         → handleFileChange → reloadArticleByPath
         → 再次更新 articles.value
         → 列表重新渲染（第二次）
         → ❌ 滾動位置可能再次被重置（nextTick 只處理了第一次）
```

### 問題核心

**檔案監聽會在自己儲存後重複觸發 reload**：
1. 我們儲存文章 → 寫入磁碟
2. 立即更新 Store（updateArticle）
3. 幾秒後，檔案監聽偵測到「有檔案變化」
4. 又執行一次 reloadArticleByPath
5. **即使內容完全相同，也會觸發 articles.value 的響應式更新**

## 修正方式

### 方案：去抖（Debounce）檔案監聽的 reload

**核心思路**：
- 記錄每個檔案最後一次 reload 的時間
- 如果在短時間內（如 3 秒）重複 reload 同一個檔案，且內容沒變，則跳過

### 實作

#### 在 article.ts 中添加去抖邏輯

```typescript
// 記錄每個檔案最後一次 reload 的時間
const fileReloadTimestamps = new Map<string, number>()
const RELOAD_DEBOUNCE_MS = 3000 // 3 秒內不重複 reload

async function reloadArticleByPath(
  filePath: string,
  status: ArticleStatus,
  category: ArticleCategory
) {
  if (typeof window === 'undefined' || !window.electronAPI) {return}

  const normalizedFilePath = normalizePath(filePath)

  // 去抖檢查：如果剛剛 reload 過，跳過
  const lastReloadTime = fileReloadTimestamps.get(normalizedFilePath) || 0
  const now = Date.now()
  const timeSinceLastReload = now - lastReloadTime

  if (timeSinceLastReload < RELOAD_DEBOUNCE_MS) {
    console.log(`⏭️  跳過重複 reload: ${filePath} (距離上次 ${timeSinceLastReload}ms)`)
    return
  }

  try {
    const content = await window.electronAPI.readFile(filePath)
    const { frontmatter, content: articleContent } = _markdownService.parseMarkdown(content)
    const fileStats = await window.electronAPI.getFileStats(filePath)
    const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date()

    const filename = filePath.split(/[/\\]/).pop()?.replace('.md', '') || ''

    const existingIndex = articles.value.findIndex(
      a => normalizePath(a.filePath) === normalizedFilePath
    )

    // 如果找到現有文章，檢查內容是否真的有變化
    if (existingIndex !== -1) {
      const existingArticle = articles.value[existingIndex]

      // 內容比對（避免無意義的更新）
      const contentChanged = existingArticle.content !== articleContent ||
                            JSON.stringify(existingArticle.frontmatter) !== JSON.stringify(frontmatter)

      if (!contentChanged) {
        console.log(`⏭️  內容無變化，跳過更新: ${filePath}`)
        fileReloadTimestamps.set(normalizedFilePath, now)
        return
      }
    }

    const article: Article = {
      id: existingIndex !== -1 ? articles.value[existingIndex].id : generateId(),
      title: frontmatter.title || filename,
      slug: filename,
      filePath,
      status,
      category,
      lastModified,
      content: articleContent,
      frontmatter
    }

    if (existingIndex !== -1) {
      // 更新現有文章
      articles.value[existingIndex] = article
      if (currentArticle.value && normalizePath(currentArticle.value.filePath) === normalizedFilePath) {
        const timeDiff = Date.now() - lastModified.getTime()
        if (timeDiff > 2000) {
          notify.info('檔案已更新', '外部修改已同步')
        }
        currentArticle.value = article
      }
      console.log(`✅ 更新現有文章: ${article.title}`)
    } else {
      // 新增文章
      articles.value.push(article)
      notify.info('新增文章', `偵測到新文章：${article.title}`)
      console.log(`✅ 新增文章: ${article.title}`)
    }

    // 記錄 reload 時間
    fileReloadTimestamps.set(normalizedFilePath, now)
  } catch (error) {
    console.warn(`Failed to reload article ${filePath}:`, error)
  }
}
```

### 優點

1. **避免重複更新**：
   - 自己儲存後 3 秒內，檔案監聽的觸發會被忽略
   - 減少不必要的響應式更新

2. **內容比對**：
   - 即使通過去抖檢查，仍會比對內容
   - 只有真的有變化才更新

3. **保留外部修改偵測**：
   - 如果超過 3 秒，或內容真的變了，仍會正常 reload
   - 不影響外部編輯器修改檔案的同步

## 相關 Commit

- fix(store): 新增檔案 reload 去抖機制，防止列表跳動

---

**修復狀態**: 準備實作
