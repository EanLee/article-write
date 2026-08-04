---
title: "切換文章誤標記為「未儲存」 Bug 報告"
domain: quality
type: assessment
status: draft
owner: tech-team
updated: 2026-08-05
source_of_truth: false
---

# 切換文章誤標記為「未儲存」 Bug 報告

**日期**: 2026-08-05
**影響範圍**: `MainEditor.vue`、`CodeMirrorEditor.vue`
**嚴重程度**: Medium（功能誤作動，影響使用者對儲存狀態的信任感）

## 問題描述

使用者只是在側邊欄點擊開啟另一篇文章（**未進行任何內容修改**），儲存狀態指示器卻立刻顯示「未儲存」。

**重現步驟**：
1. 開啟一篇文章（狀態應為「已儲存」）
2. 不做任何輸入，直接點擊側邊欄另一篇文章
3. 觀察儲存狀態指示器變成「未儲存」

**預期行為**：切換文章時若未實際編輯，狀態應維持「已儲存」。
**實際行為**：切換文章本身就會觸發「未儲存」。

## 原因分析

這個症狀類別 2026-02-14 修過一次（見 `2026-02-14-autosave-false-positive-on-open.md`），當時的修法是在 `MainEditor.vue` 加 `isLoadingArticle` 旗標。這次重新調查發現**該保護在目前的架構下已經失效，而且有兩條互相獨立的路徑會各自誤觸 `autoSaveService.markAsModified()`**，必須都修才能真正解決。

### 根因 1：`CodeMirrorEditor.vue` 內部的 docChanged 事件沒有區分「外部設值」與「使用者編輯」

```
MainEditor 的 currentArticle watcher（切換文章時 id 改變）
  └─ content.value = newArticle.content              ← 程式化重設，非使用者輸入
       └─ CodeMirrorEditor 的 watch(modelValue) 偵測到 prop 變化
            └─ view.dispatch({ changes: {...} })       ← 把新內容寫入 CodeMirror
                 └─ EditorView.updateListener 偵測到 docChanged
                      └─ autoSaveService.markAsModified()  ← 誤觸：跟使用者真的打字走同一條路
```

CodeMirror 6 整合（`ADR-0001-codemirror6-editor-migration.md`）之後，`CodeMirrorEditor.vue` 自己內部維護了一份 `docChanged` → `markAsModified()` 的呼叫（`CodeMirrorEditor.vue:280`），這條路徑跟 `MainEditor.vue` 完全無關，`isLoadingArticle` 旗標（存在於 `MainEditor.vue`）根本碰不到它。已有的 `isInternalUpdate` 旗標只用來防止 v-model 循環更新，並未區分「這次 docChanged 是外部 prop 設值造成的、還是使用者真的打字造成的」。

**驗證方式**：以單元測試直接 mount `CodeMirrorEditor.vue`，spy `autoSaveService.markAsModified`，只改 `modelValue` prop（模擬外部設值）——修復前測試失敗（`markAsModified` 被呼叫），修復後通過。見 `tests/components/CodeMirrorEditor.external-update.test.ts`。

### 根因 2：`MainEditor.vue` 自己的 `isLoadingArticle` 旗標從未被讀取

```
MainEditor 的 currentArticle watcher（切換文章時 id 改變）
  └─ isLoadingArticle.value = true                    ← 正確設值
  └─ content.value = newArticle.content
       └─ watch(content, ...) 偵測到變化
            └─ 只檢查 isSwitchingMode（模式切換用旗標，跟切換文章無關）
            └─ 從未檢查 isLoadingArticle              ← 根本原因：讀取端遺失
                 └─ handleContentChange()
                      └─ autoSaveService.markAsModified()  ← 誤觸
  └─ nextTick(() => { isLoadingArticle.value = false })   ← 設回 false，但反正沒人讀過
```

2026-02-14 的修法原本是對的（`isLoadingArticle` 這個旗標本身邏輯完整：切換文章時設 true、`nextTick` 後設回 false），但目前 `watch(content, (newContent) => {...})`（`MainEditor.vue:240`）的守衛條件只有 `isSwitchingMode.value`（防的是「撰寫/Raw 模式切換」，不是「切換文章」），從來沒有加上 `isLoadingArticle.value` 的檢查。推測是後續某次重構（可能是 CodeMirror 6 整合，或 IA Phase 3 之前的其他重構）動到這段程式碼時，讀取端的檢查被遺漏，只留下設值端的程式碼，成為死碼，保護實質上失效了一段時間。

**驗證方式**：以單元測試 mount 真正的 `MainEditor.vue`（`CodeMirrorEditor` 用 stub 隔離），切換 `articleStore.currentArticle` 到不同 id 的文章，檢查 `autoSaveService.saveState.status`——修復前測試失敗（狀態變成 `modified`），修復後通過。見 `tests/components/MainEditor.test.ts` 案例 (d)。

### 為什麼兩個根因都要修

這兩條路徑互相獨立、平行存在：根因 1 在 `CodeMirrorEditor.vue` 內部，根因 2 在 `MainEditor.vue` 內部，任一條沒修，使用者切換文章時都還是會看到「未儲存」。撰寫模式（compose）下兩條路徑同時存在；Raw 模式下只有根因 2 存在（Raw 模式不經過 `CodeMirrorEditor.vue`）。

## 修正方式

### 修正 1：`CodeMirrorEditor.vue` 新增 `isExternalUpdate` 旗標

在 `watch(modelValue, ...)` 呼叫 `view.dispatch(...)` 前後設置 `isExternalUpdate = true/false`，`updateListener` 的 `docChanged` 分支多檢查這個旗標，外部設值時跳過 `emit`/`markAsModified`：

```ts
if (update.docChanged && !isExternalUpdate) {
  isInternalUpdate = true
  emit("update:modelValue", update.state.doc.toString())
  autoSaveService.markAsModified()
  isInternalUpdate = false
}
```

### 修正 2：`MainEditor.vue` 的 `watch(content, ...)` 補上 `isLoadingArticle` 檢查

```ts
watch(content, (newContent) => {
    if (isSwitchingMode.value) { return; }
    if (isLoadingArticle.value) { return; }   // 新增：接回原本就存在、但從未被讀取的旗標
    handleContentChange();
    ...
```

**替代方案考慮**：曾考慮把 `isLoadingArticle` 整個移除、改成統一用一個新旗標涵蓋「模式切換」與「文章切換」兩種情境。放棄理由：`isSwitchingMode`／`isLoadingArticle` 語意上是兩種不同情境（前者是同一篇文章內切換編輯模式、後者是切換到不同文章），合併會讓兩種情境的副作用耦合在一起，且改動範圍會擴大到 `toggleEditorMode()`／`handleRawContentChange()` 等其他呼叫點，不符合本次修復的最小範圍原則。維持兩個旗標分開、只補上遺漏的讀取端是風險最低的修法。

## 相關 Commit

- `16fb2e8`：`fix(editor): 切換文章時不應誤標記為未儲存` — 根因 1
- `39570e3`：`fix(editor): 修復 isLoadingArticle 旗標從未被讀取，導致切換文章誤標未儲存` — 根因 2

## 驗證

- `pnpm run test`：712 passed | 1 skipped，0 failures
- `pnpm run lint`：0 errors

---

> **狀態**: 已修復，待使用者驗證
