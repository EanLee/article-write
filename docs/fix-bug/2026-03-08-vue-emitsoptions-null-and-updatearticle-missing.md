# Vue emitsOptions null 錯誤與 updateArticle 缺失 Bug Fix 報告

**日期**: 2026-03-08
**影響範圍**: App.vue 條件渲染、MainEditor.vue 儲存邏輯
**嚴重程度**: Critical（Bug 1 導致完全無法開啟文章）

---

## Bug 1：`TypeError: Cannot read properties of null (reading 'emitsOptions')`

### 問題描述

點選文章後，Console 出現以下錯誤，檔案完全無法開啟：

```
chunk-GCUKVLAN.js?v=eae2fdc2:6852 Uncaught (in promise) TypeError:
Cannot read properties of null (reading 'emitsOptions')
```

### 根因分析

**呼叫鏈：**

```
使用者點選文章 → articleStore.setCurrentArticle(article)
  → currentArticle.value 從 null 變為 article
  → App.vue 的 v-else-if 條件變為 false，v-else 條件變為 true
    → Vue 嘗試從「select-article div」PATCH 到「editor div」
      → 因兩個分支標籤相同（均為 <div>），Vue 不 unmount/mount
        → 對 div 進行 patch，嘗試 reconcile 子節點
          → updateComponent(n1, n2) 被呼叫
            → shouldUpdateComponent(n1, n2)
              → const emits = component.emitsOptions  ← n1.component = null，崩潰！
```

**根本原因：**

`App.vue` 中三個條件分支（`v-if` / `v-else-if` / `v-else`）全部使用 `<div>` 元素且沒有 `key` 屬性：

```html
<div v-if="!configStore.config.paths.articlesDir" ...>  <!-- setup -->
<div v-else-if="!articleStore.currentArticle" ...>       <!-- select-article -->
<div v-else class="h-full flex flex-col">                <!-- editor + MainEditor -->
  <MainEditor />
</div>
```

Vue 的 patch 演算法：**相同標籤且無 key → 嘗試 PATCH（重用 DOM），而非 unmount + mount**。

當條件從 `v-else-if`（select-article）切換到 `v-else`（editor）時，Vue 試圖 patch `<div>` 並調和子節點。`select-article` 分支的子 VNode（純文字 + icon）與 `editor` 分支的子 VNode（`<MainEditor />`）結構完全不同，導致 Vue 對一個從未被 mount 過的組件 VNode 呼叫 `updateComponent`，此時 `n1.component`（前一個 VNode 的組件實例）為 null，`shouldUpdateComponent` 存取 `component.emitsOptions` 時崩潰。

**為什麼表現為 "Uncaught (in promise)"：**

Vue 的 scheduler 將 DOM 更新排入 `Promise.then()` microtask queue，因此錯誤在 microtask 中拋出，表現為 Promise rejection。

### 修復方式

在三個條件分支加上唯一 `key`，強制 Vue 在條件切換時做 **unmount + mount**，而非 patch：

```html
<div v-if="!configStore.config.paths.articlesDir" key="setup-required" ...>
<div v-else-if="!articleStore.currentArticle" key="select-article" ...>
<div v-else key="editor" class="h-full flex flex-col">
  <MainEditor />
</div>
```

`key` 不同 → Vue 視為完全不同的節點 → 舊節點 unmount，新節點從零 mount → `component` 實例正確初始化，`shouldUpdateComponent` 不再存取 null。

---

## Bug 2：`articleStore.updateArticle` 不存在（靜默失敗）

### 問題描述

`MainEditor.vue` 的 `saveArticle()` 函式在儲存成功後呼叫：

```ts
await articleStore.updateArticle(updatedArticle);
```

但 `article` store 只 export `updateArticleInMemory`，沒有 `updateArticle`。此呼叫在 try/catch 內靜默失敗，導致儲存成功但 store 記憶體中的文章資料未更新（過時的 title、frontmatter 仍在 UI 顯示）。

### 根因分析

**呼叫鏈：**

```
MainEditor.saveArticle()
  → articleService.saveArticle(updatedArticle) → 成功寫入磁碟 ✓
  → await articleStore.updateArticle(updatedArticle)  ← undefined，拋出 TypeError
    → catch(error) { logger.error(...) }              ← 靜默吸收
      → store 記憶體未更新，UI 仍顯示舊資料
```

`stores/article.ts` 的 export 清單中只有 `updateArticleInMemory`，不存在 `updateArticle`。

### 修復方式

將呼叫改為正確的方法，且因 `updateArticleInMemory` 是同步方法（無需 await）：

```ts
// 修復前
await articleStore.updateArticle(updatedArticle);

// 修復後
articleStore.updateArticleInMemory(updatedArticle);
```

---

## 相關 Commit

- fix(ui): 加入 v-if/v-else-if/v-else key 屬性防止 Vue patch 觸發 emitsOptions null 崩潰
- fix(editor): 修正 saveArticle 呼叫不存在的 updateArticle，改為 updateArticleInMemory
