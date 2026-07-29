---
title: FrontmatterEditor DataCloneError 導致文章無法開啟
date: 2026-07-08
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：點擊側邊欄文章後，文章無法開啟，看不到內容。瀏覽器 console 出現：

```
Uncaught (in promise) DataCloneError: Failed to execute 'structuredClone' on 'Window': #<Object> could not be cloned.
```

**觸發條件**：選取任何文章時，只要 `articleStore.currentArticle` 從 `null` 變成有值即觸發。

**重現步驟**：
1. 啟動 app
2. 側邊欄點擊任意文章
3. Console 出現 DataCloneError，文章內容不顯示

## 原因分析

完整呼叫鏈：

```
ArticleList.vue → selectArticle(article) → articleStore.setCurrentArticle(article)
  → currentArticle.value = article（article 是 reactive Proxy）
  → FrontmatterEditor.vue 的 watch(() => props.article, ..., { immediate: true }) 觸發
  → structuredClone(newArticle)  ← 根本原因
  → DataCloneError: #<Object> could not be cloned
```

**根本原因**：`FrontmatterEditor.vue` 的兩個 watcher 對 Vue reactive Proxy 呼叫 `structuredClone()`。

`structuredClone` 與 `JSON.stringify` 的關鍵差異：

- `JSON.stringify`：只讀 enumerable string 屬性，跳過 Symbol key → 安全
- `structuredClone`：透過 V8 internal `ownKeys` 遍歷，會接觸 Vue reactive Proxy 注入的 Symbol property（如 `__v_isReactive` 等），這些 Symbol property 的 value 是 Vue 內部追蹤物件，在 Electron/Chromium 下被視為無法序列化的 C++ host object → DataCloneError

> 注意：此行為是 Electron/Chromium 特有。Node.js 環境的 `structuredClone` 實作對 Proxy 更寬鬆，因此在 Vitest 中不會觸發。

## 修正方式

**修改檔案**：`src/components/FrontmatterEditor.vue`（第 318、336 行）

```diff
- localArticle.value = structuredClone(newArticle)
+ localArticle.value = JSON.parse(JSON.stringify(newArticle)) as Article
```

```diff
- localArticle.value = structuredClone(props.article)
+ localArticle.value = JSON.parse(JSON.stringify(props.article)) as Article
```

**為何有效**：`JSON.stringify` 透過 Proxy 的 `get` trap 讀取每個屬性，只接觸 enumerable string properties，跳過 Symbol key。`JSON.parse` 返回純 JS 物件，不含任何 Vue reactive 追蹤資訊。

**副作用**：`Article.lastModified`（`Date` 型別）經 JSON 序列化後變為 ISO string。不影響 FrontmatterEditor 運作，因為 `handleSave()` 在第 299 行以 `new Date()` 覆寫 `lastModified` 再 emit。

**替代方案**：`toRaw()` from Vue（但需遞迴處理巢狀 reactive，較複雜）。

**相關 commit**：`fix(frontmatter-editor): 修正 Vue reactive Proxy DataCloneError`
