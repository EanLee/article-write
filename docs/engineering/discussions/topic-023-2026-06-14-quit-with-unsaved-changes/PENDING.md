---
title: "App 在有未儲存變更時關閉視窗，會無聲卡住（無提示、無法關閉）"
domain: engineering
type: discussion
status: draft
owner: roundtable-discussions
updated: 2026-06-14
source_of_truth: false
related_docs:
  - docs/quality/assessments/fix-bug/2026-06-14-e2e-electron-teardown-timeout.md
---

# topic-023｜App 在有未儲存變更時關閉視窗，會無聲卡住

**日期**: 2026-06-14
**狀態**: ⚠️ 待排程
**發起人**: 技術團隊（修復 E2E `electronApp` teardown 逾時時發現）
**討論層次**: 技術會議 — 需先決定退出流程的預期 UX，技術實作明確

## 背景與情境

修復 [E2E electronApp worker teardown 偶發逾時](../../../quality/assessments/fix-bug/2026-06-14-e2e-electron-teardown-timeout.md) 時，定位到以下行為：

- [`src/App.vue:143`](../../../../src/App.vue) `handleBeforeUnload`：若 `autoSaveService.hasUnsavedChanges()` 為 `true`，呼叫 `e.preventDefault()` 阻止 `beforeunload`
- Electron 對應會在主程序的 `webContents` 上觸發 `will-prevent-unload` 事件
- [`src/main/main.ts`](../../../../src/main/main.ts) 目前**未註冊**任何 `will-prevent-unload` 監聽器

## 已確認的技術事實

- `will-prevent-unload` 無監聽器時，Electron 的預設行為是**直接採用 preventDefault**，即視窗不會關閉，且**不會顯示任何對話框或提示**（事實，已用 E2E 重現）
- 因此目前若使用者在編輯器有未儲存變更時關閉 WriteFlow（點 X 或 Cmd/Ctrl+Q），視窗會卡住、無法關閉，使用者也不會看到任何「未儲存變更」提示（推論：production build 與測試環境的主程序邏輯相同，理論上會有相同行為，但尚未在打包後的正式安裝版手動驗證）
- E2E 測試環境下，此行為導致 `app.close()` 永遠不 resolve，已透過 [electron-fixture.ts](../../../../tests/e2e/helpers/electron-fixture.ts) 加上逾時強制終止程序處理（純測試基礎設施修復，未變更 production code）

## 待決策項目

1. **退出流程的預期 UX**：使用者在有未儲存變更時關閉 App，應該：
   - (a) 直接允許關閉並捨棄變更（簡單，但可能造成資料遺失）
   - (b) 彈出對話框「儲存 / 不儲存 / 取消」（類似一般文字編輯器慣例）
   - (c) 自動儲存後再關閉（與目前 `autoSave: false` 的設計衝突，需一併討論）
2. **技術實作**：決策後於 `src/main/main.ts` 註冊 `webContents.on('will-prevent-unload', ...)`，依決策結果呼叫 `event.preventDefault()`（允許關閉）或搭配 `dialog.showMessageBoxSync` 詢問使用者
3. **正式環境驗證**：目前推論基於原始碼閱讀與測試環境重現，需在打包後的安裝版手動驗證是否有相同卡住現象

## 建議討論層次

| 情境 | 層次 |
|------|------|
| 退出流程 UX 方向（直接捨棄 / 提示儲存 / 自動儲存） | PM（Alex）決策 |
| `will-prevent-unload` 處理方式技術實作 | 技術會議（待 UX 方向確定後執行） |

## 關聯文件

- Bug Fix 報告：[2026-06-14-e2e-electron-teardown-timeout.md](../../../quality/assessments/fix-bug/2026-06-14-e2e-electron-teardown-timeout.md)
- 重現測試：`tests/e2e/teardown-unsaved-changes.spec.ts`
- 相關程式碼：`src/App.vue`（`handleBeforeUnload`）、`src/main/main.ts`（`app.on("before-quit"/"window-all-closed")`）、`src/services/AutoSaveService.ts`（`hasUnsavedChanges`）
