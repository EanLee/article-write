---
title: CodeMirror 編輯器內 Obsidian 自動完成（[[、![[、#tag）從未真正跳出建議清單
date: 2026-07-30
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：在編輯器裡輸入 `[[`、`![[` 或 `#`，理論上應該跳出 wiki 連結／圖片／標籤的自動完成建議清單，實際上完全沒有反應。

**確認方式**：全 repo 搜尋 `setSuggestionsProvider(`，唯一命中的是 `CodeMirrorEditor.vue` 自己的定義處，`MainEditor.vue` 從未呼叫過它——`_getSuggestions` 恆為 `null`。另外發現 `MainEditor.vue` 樣板上傳給 `CodeMirrorEditor` 的 `suggestions`/`showSuggestions`/`selectedSuggestionIndex`/`dropdown-position` 這組 props（來自 `useAutocomplete` composable，設計給舊版 `<textarea>` 編輯器用的手刻下拉選單）在 `CodeMirrorEditor.vue` 的 `<template>` 裡完全沒有被渲染——這組手刻下拉選單的實作只存在於已經沒有任何地方引用的 `EditorPane.vue`（死檔案，全 repo 搜尋 `EditorPane` 只剩 `MainEditor.vue` 裡一行過期註解提到它）。也就是說，Obsidian 自動完成有兩套並存但都不完整的實作，都沒有真正生效。

## 原因分析

**候選機制盤點**：
1. 舊版手刻下拉選單（`useAutocomplete` composable + `EditorPane.vue` 的 dropdown 樣板）——`EditorPane.vue` 已死，`CodeMirrorEditor.vue` 沒有對應的渲染樣板，此路徑確認完全斷開。
2. CM6 原生 `autocompletion()` 擴充功能（`CodeMirrorEditor.vue` 內建的 `createObsidianCompletionSource`）——邏輯完整、CSS 樣式（`.cm-tooltip-autocomplete`）也已寫好，唯一缺口是 `setSuggestionsProvider` 從未被 `MainEditor.vue` 呼叫。

**用單元測試直接驗證（非讀程式碼推論）**：即使照著既有的 `setSuggestionsProvider` 呼叫慣例補上呼叫，也無法讓自動完成生效——寫了一個測試模擬「子元件掛載後才呼叫 `setSuggestionsProvider`」（這正是 Vue 子元件先於父元件掛載、父層透過 ref 呼叫子層方法的真實時機），結果 `startCompletion` 之後完全沒有任何建議項目：

```
CodeMirrorEditor.onMounted()
  → EditorState.create({ extensions: buildExtensions(_getSuggestions) })
      // _getSuggestions 此時仍是 null（尚未被 MainEditor 呼叫）
      → ...(getSuggestions ? [autocompletion({ override: [...] })] : [])
      // getSuggestions 為 null → 整個 autocompletion() 擴充功能完全沒有被加進這次 EditorState
  ← EditorState 建立完成，extensions 陣列已固定
MainEditor（父元件，稍後才 mount 完成）
  → watch(editorPaneRef, instance => instance?.setSuggestionsProvider(fn))
      → _getSuggestions = fn  // 只是改了一個閉包變數的值
      ← 但 EditorState 的 extensions 陣列不會因為外部變數改變而重新演算，
        autocompletion() 擴充功能本來就不存在於這個 EditorState 裡，
        setSuggestionsProvider 呼叫了也沒用
```

**根本原因**：`buildExtensions(getSuggestions)` 把 `getSuggestions` 當「參數」在 `onMounted` 建立 `EditorState` 的當下就決定「要不要加入 `autocompletion()` 擴充功能」，是一次性判斷、之後不會重新演算。而 Vue 的 ref 賦值機制決定了父元件（`MainEditor`）只能在子元件（`CodeMirrorEditor`）掛載「之後」才拿得到 instance 呼叫 `setSuggestionsProvider`——這個時間點必然晚於 `onMounted` 建立 `EditorState` 的時刻。所以無論 `setSuggestionsProvider` 被呼叫的時機抓得多準，都補救不了：`autocompletion()` 擴充功能在它被呼叫之前就已經確定不存在。

## 修正方式

**修改檔案**：`src/components/CodeMirrorEditor.vue`、`src/components/MainEditor.vue`

1. **`CodeMirrorEditor.vue`**：`createObsidianCompletionSource()` 改為不接受參數，內部直接讀取 `_getSuggestions` 閉包變數（在每次觸發 completion 時才讀取，而非在 `buildExtensions` 呼叫當下就固定值）；`buildExtensions()` 也拿掉參數，`autocompletion({ override: [createObsidianCompletionSource()] })` 改為無條件加入 extensions 陣列（不再用 `getSuggestions ? [...] : []` 判斷是否加入）。這樣 `autocompletion()` 擴充功能永遠存在於 `EditorState` 裡，`setSuggestionsProvider` 不論何時被呼叫，下一次觸發 completion 時都能讀到最新的 provider。
2. **`MainEditor.vue`**：新增 `getObsidianSuggestions(text, pos)` 橋接函式，組出 `AutocompleteContext` 呼叫既有的 `obsidianSyntax.getAutocompleteSuggestions(context)`（`ObsidianSyntaxService` 早已具備完整的 wiki 連結／圖片／標籤建議邏輯，直接複用）。用既有的 `watch(editorPaneRef, ..., { immediate: true })`（與貼上圖片 provider 共用同一個 watch callback）呼叫 `instance.setSuggestionsProvider(getObsidianSuggestions)`。

**為何有效**：把「擴充功能是否存在」與「provider 函式的值」解耦——前者永遠固定存在，後者透過閉包變數在每次觸發時讀取最新值，不再受 Vue 元件掛載順序的時機限制。

**替代方案（未採用）**：曾考慮完成舊版手刻下拉選單（把 `EditorPane.vue` 的 dropdown 樣板搬進 `CodeMirrorEditor.vue`，並把 `useAutocomplete` 的 `calculateDropdownPosition` 改成用 CM6 的 `view.coordsAtPos()` 算座標，取代原本假設 `<textarea>` DOM 屬性的 mirror-div 測量邏輯）。這個方案改動面積大很多（`ObsidianSyntaxService.calculateDropdownPosition` 需要整個重寫成 CM6-aware），且 CM6 原生 `autocompletion()` 這條路徑已經 95% 完整、只缺一個時機修正，直接完成它是風險與工作量都更小的選擇。`useAutocomplete` composable 與 `suggestions`/`showSuggestions`/`selectedSuggestionIndex`/`dropdownPosition` 這組 props 因此依然是未使用的死狀態，本次未清理，留待後續決定是否要整個移除。

**影響範圍**：僅 `CodeMirrorEditor.vue`、`MainEditor.vue`；不影響 `useAutocomplete`/`EditorPane.vue`（本來就已經是死路徑，維持原狀）。

**測試**：新增元件測試 `tests/components/CodeMirrorEditor.autocomplete.test.ts`，模擬「子元件掛載後才呼叫 setSuggestionsProvider」的真實時機，驗證輸入 `[[` 後透過 `startCompletion`/`currentCompletions`（`@codemirror/autocomplete` 提供的狀態查詢 API）確認真的能拿到建議項目；修復前用 `git stash` 暫時還原程式碼重新驗證過一次紅燈（同一份測試、同一個 2000ms 輪詢逾時，確認不是測試本身的等待邏輯造成誤判），修復後綠燈。`pnpm run test`：50 test files / 681 passed / 1 skipped；`pnpm run lint`：0 errors。

**相關 commit**：`fix(editor): 修正 Obsidian 自動完成因擴充功能建立時機錯誤而從未生效`

---

## 追加清理 (2026-07-30)

CM6 原生自動完成確認可用後，`useAutocomplete` composable 與 `MainEditor.vue`/`CodeMirrorEditor.vue` 裡配合它的一整組手刻下拉選單狀態（`suggestions`、`showSuggestions`、`selectedSuggestionIndex`、`dropdownPosition`、`updateAutocomplete`、`applySuggestion`、`hideSuggestions`、`handleAutocompleteKeydown`）確認完全沒有其他呼叫端，全數移除：

- 刪除 `src/composables/useAutocomplete.ts`（全 repo 搜尋確認 `MainEditor.vue` 是唯一使用者，且無獨立測試檔）
- `MainEditor.vue`：移除 `useAutocomplete` 匯入與解構、樣板上傳給 `CodeMirrorEditor` 的 4 個 props 與 2 個事件監聽、`handleContentChange` 裡的 `updateAutocomplete()` 呼叫、`handleKeydown` 裡的 `handleAutocompleteKeydown` 攔截、`handleClickOutside`（唯一用途是呼叫 `hideSuggestions()`，一併移除其註冊/清除）、過期註解
- `CodeMirrorEditor.vue`：`Props`/`emit` 型別移除 `suggestions`/`showSuggestions`/`selectedSuggestionIndex`/`dropdownPosition`/`apply-suggestion`/`cursor-change`，`cursor-change` 的 emit 呼叫點一併移除（其唯一用途是觸發 `updateAutocomplete`）

**未清理（刻意保留）**：`ObsidianSyntaxService.calculateDropdownPosition`、`applySuggestionToText` 這兩個原本供 `useAutocomplete` 呼叫的方法，因為 (a) 各自都有獨立的服務層單元測試（`applySuggestionToText` 在 `tests/services/ObsidianSyntaxService.test.ts` 已有 3 案），(b) 移除它們屬於「要不要精簡 `ObsidianSyntaxService`」的另一個範疇更大的決定，非本次「清掉 `useAutocomplete` 死碼」的範圍，故保留現狀。

**測試**：既有測試檔的 `makeProps` 移除對應欄位，`pnpm run test`：50 test files / 681 passed / 1 skipped；`pnpm run lint`：0 errors。用 `git stash` 交叉比對確認這次清理沒有引入新的 `vue-tsc` 型別錯誤（`MainEditor.vue` 現存的 3 個 `editorRef` duck-type 型別不相容錯誤在清理前就已存在，與本次改動無關，不在本次處理範圍）。

**相關 commit**：`refactor(editor): 移除已由 CM6 原生自動完成取代的 useAutocomplete 死碼`
