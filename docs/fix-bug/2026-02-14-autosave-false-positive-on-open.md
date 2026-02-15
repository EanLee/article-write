# AutoSave 開啟文件誤觸儲存 Bug 報告

**日期**: 2026-02-14
**影響範圍**: AutoSaveService、編輯器
**嚴重程度**: Medium（功能誤作動，影響使用者信任感）

## 問題描述

使用者開啟一篇文章進行檢視，**未進行任何內容修改**，但 AutoSave 仍被觸發並執行儲存動作。

**重現步驟**：
1. 從文章列表點擊一篇文章開啟
2. 不做任何輸入或修改
3. 等待數秒
4. 觀察到儲存狀態指示器觸發（或後台執行了 write-file）

**預期行為**：未修改內容時，不應觸發任何儲存動作。

**實際行為**：開啟文件後即觸發儲存。

## 初步原因分析

AutoSaveService 採用三層過濾策略（Dirty Flag → Timer → 字串比對）。
初步懷疑：文章載入時的內容初始化流程可能觸發了 Dirty Flag 或 content watcher，
導致 AutoSave 誤判為「有修改」。

需要排查：
- `content.value` 初始化賦值是否觸發 Vue watcher
- `isDirty` 旗標是否在載入時被意外設為 true
- AutoSave timer 啟動時機是否早於內容穩定

## 原因分析

`MainEditor.vue` 中，`currentArticle` watcher（含 `immediate: true`）在文章載入時執行 `content.value = newArticle.content`，這觸發了 `content` watcher → `handleContentChange()` → `scheduleAutoSave()`。

由於此時 `isLoadingArticle` 旗標不存在，系統不知道這是初始化賦值而非使用者輸入，導致 2 秒後 `saveArticle()` 被執行。

```
currentArticle watcher
  └─ content.value = newArticle.content   ← 觸發 content watcher
       └─ handleContentChange()
            └─ scheduleAutoSave()          ← 誤觸：2秒後儲存
```

## 修正方式

在 `MainEditor.vue` 新增 `isLoadingArticle` flag：

1. `currentArticle` watcher 開始設定 `content.value` 前，設 `isLoadingArticle.value = true`
2. `scheduleAutoSave()` 開頭檢查此旗標，為 true 時直接返回
3. `nextTick()` 後恢復 `isLoadingArticle.value = false`，確保使用者後續編輯仍能正常觸發 AutoSave

```ts
// currentArticle watcher
isLoadingArticle.value = true;
content.value = newArticle.content;
nextTick(() => { isLoadingArticle.value = false; });

// scheduleAutoSave
if (isLoadingArticle.value) return;
```

## 相關 Commit

- `53104d1`: fix(editor): 修復開啟文件時 AutoSave 誤觸儲存（BUG-01）

---

> **狀態**: 已修復，待使用者驗證
> **回報者**: Jordan（端對端驗收時發現）
