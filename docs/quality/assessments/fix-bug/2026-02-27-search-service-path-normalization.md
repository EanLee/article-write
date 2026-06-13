# SearchService 路徑正規化 Bug Fix 報告

**日期**: 2026-02-27
**影響範圍**: 搜尋服務（全文搜尋 S-01）
**嚴重程度**: Medium

## 問題描述

在 Windows 環境執行單元測試時，`SearchService` 的 `解析 wikilink 並存入索引` 測試案例失敗：

```
AssertionError: expected [] to include 'Other Article'
  ❯ tests/services/SearchService.test.ts:60:23
      const wikilinks = service.getWikilinks('/mock/vault/article.md')
      expect(wikilinks).toContain('Other Article')
```

## 原因分析

`SearchService` 的 `scanDirectory` 方法使用 Node.js 的 `path.join()` 來組合路徑：

```typescript
const fullPath = join(dir, entry)
// 在 Windows：join('/mock/vault', 'article.md') → '\mock\vault\article.md'
// 在 Unix：  join('/mock/vault', 'article.md') → '/mock/vault/article.md'
```

生成的反斜線路徑（`\mock\vault\article.md`）被作為 `wikilinkMap` 的 key 儲存。但測試和前端呼叫 `getWikilinks()` 時使用正斜線路徑（`/mock/vault/article.md`），導致 Map 查找失敗，回傳空陣列。

此問題在 Windows 系統上同樣影響生產環境：`SearchService`（主程序，Node.js）使用 OS 原生路徑格式（反斜線），而 `ArticleService`（renderer，透過 IPC）使用 template literal 字串拼接（正斜線）。若兩者路徑不一致，搜尋結果點擊後將無法導航到對應文章（`openResult()` 的 `filePath` 比對會失敗）。

## 修正方式

在 `SearchService` 的 `indexFile`、`removeFile`、`getWikilinks` 三個方法中，統一將路徑正規化（反斜線轉正斜線）再用於 Map 操作：

**修改檔案**：`src/main/services/SearchService.ts`

```typescript
// indexFile：儲存時正規化
const normalizedPath = filePath.replace(/\\/g, '/')
this.index.set(normalizedPath, { id: normalizedPath, filePath: normalizedPath, ... })
this.wikilinkMap.set(normalizedPath, wikilinks)

// removeFile：刪除時正規化
const normalizedPath = filePath.replace(/\\/g, '/')
this.index.delete(normalizedPath)
this.wikilinkMap.delete(normalizedPath)

// getWikilinks：查詢時正規化
const normalizedPath = filePath.replace(/\\/g, '/')
return this.wikilinkMap.get(normalizedPath) ?? []
```

注意：`scanDirectory` 中的 `join()` 仍保留原始作業系統路徑格式，僅用於實際的 `fs.readFile()` 讀取操作（需要 OS 原生格式）。正規化只在儲存 Map key 時進行。

## 相關 Commit

- 待提交
