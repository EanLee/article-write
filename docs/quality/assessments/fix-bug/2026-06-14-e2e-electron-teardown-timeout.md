---
title: "修復：E2E worker teardown 偶發逾時（electronApp.close() 卡住 60s/90s）"
domain: quality
type: assessment
status: completed
owner: EanLee
updated: 2026-06-14
source_of_truth: true
---

# Bug Fix 報告｜E2E worker teardown 偶發逾時

**日期**: 2026-06-14
**分支**: `fix/e2e-electron-teardown-timeout`
**關聯**: 與 topic-021（ArticleListTree reactivity）無關，為獨立的 E2E 測試基礎設施問題

## 問題描述

### 現象

執行 `pnpm run build` 後 `npx playwright test tests/e2e/writing-baseline.spec.ts`，7 個測試全部通過，但整次執行偶發從約 4.6s 拉長到約 152s，並在報表 `errors` 中出現：

```
Fixture "electronApp" timeout of 60000ms exceeded during teardown.
  at tests\e2e\helpers\electron-fixture.ts:66

Worker teardown timeout of 90000ms exceeded.
Failed worker ran 7 tests: ...
```

7 個測試本身皆為 `passed`，僅 worker 結束時的 teardown 階段卡住。

### 重現步驟

1. `pnpm run build`
2. 重複執行 `npx playwright test tests/e2e/writing-baseline.spec.ts`（約 80% 機率重現，~152s）
3. 新增的 `tests/e2e/teardown-unsaved-changes.spec.ts` 可 100% 穩定重現（單一測試即觸發 ~152s）

## 原因分析

### 完整呼叫鏈

```
worker 最後一個測試結束（編輯器內容已修改但未 Ctrl+S）
  → autoSaveService.hasUnsavedChanges() === true（src/services/AutoSaveService.ts:343）
  → electronApp fixture teardown 呼叫 app.close()（Playwright）
  → app.close() 內部呼叫 app.quit() → 觸發 'window-all-closed'（src/main/main.ts:178）
  → app.quit() → 嘗試關閉 BrowserWindow → webContents 觸發 renderer 的 'beforeunload'
  → src/App.vue:143 handleBeforeUnload(e) → hasUnsavedChanges() === true → e.preventDefault()
  → Electron 對應觸發 webContents 'will-prevent-unload'
  → src/main/main.ts 未註冊任何 'will-prevent-unload' 監聽器
  → ❌ 根本原因：preventDefault 被「預設行為」直接採用 = 視窗無法關閉
  → 'before-quit' 已先執行（fileService.stopWatching() 等清理已完成），
    但 'will-quit' / 'quit' 永遠不會觸發
  → Playwright electronApp.close() 永遠不 resolve
  → Fixture "electronApp" 60s teardown timeout
  → 整個 Electron 程序未被強制終止前，Worker teardown 90s timeout 也跟著超時
  → 累計逾時 ≈ 60s + 90s ≈ 152s 後 Playwright 才強制結束程序
```

### 為何「偶發」

是否觸發取決於 worker 結束時編輯器內容是否與磁碟一致：

- 測試套件 `autoSaveConfig.autoSave = false`，最後一個測試若有編輯但未儲存（如 topic-020 切換文章測試），`hasUnsavedChanges()` 為 `true` → 必定逾時
- 若最後一個測試剛好以 Ctrl+S 儲存收尾，則 `hasUnsavedChanges()` 為 `false`，`beforeunload` 不會 `preventDefault`，teardown 正常（~1.4s）

### 為何最終仍能結束（沒有真的卡死）

`tasklist` 確認程序最終會消失 —— 是 Playwright 在 60s + 90s timeout 後強制終止造成，並非程式自行恢復。

## 修正方式

### 修改檔案

[tests/e2e/helpers/electron-fixture.ts](../../../../tests/e2e/helpers/electron-fixture.ts)（`electronApp` worker fixture teardown）

### 邏輯

1. `app.close()` 與 5 秒逾時 `Promise.race`
2. 若 5 秒內未正常關閉（視窗被 `beforeunload` preventDefault 卡住）：
   - Windows：`taskkill /pid <主程序 pid> /T /F` 終止整個程序樹（含 GPU/renderer/utility 子程序，避免遺留孤兒程序鎖住 `testVaultPath` 內的檔案）
   - 其他平台：`proc.kill()`
   - 再等待最多 5 秒讓 `exit` 事件觸發
3. `fs.rmSync(userDataPath, ...)` 包入 try/catch（程序剛結束時 Windows 檔案鎖可能延遲釋放）

### 為何有效

不論 `app.close()` 是否因 renderer 端 `beforeunload` 而卡住，teardown 最多在 ~10 秒內以強制終止程序的方式結束，避免觸發 Playwright 的 60s/90s 逾時。

### 替代方案（已考慮但未採用）

- **在 `src/main/main.ts` 加上 `webContents.on('will-prevent-unload', e => e.preventDefault())`**：可從根本解決視窗無法關閉的問題，但這同時會改變「使用者在有未儲存變更時關閉 App」的產品行為（目前實際上也會卡住、不會彈出任何提示）。是否該在退出時提示「未儲存變更，是否儲存？」屬產品 UX 決策，已記錄於 PENDING 文件供後續討論，不在本次 E2E 基礎設施修復範圍內處理。

## 驗證

- `tests/e2e/teardown-unsaved-changes.spec.ts`（新增）：故意編輯內容不儲存，修復前 ~152s，修復後 ~8.4s
- `npx playwright test tests/e2e/writing-baseline.spec.ts` 連續執行 3 次：均 7 passed，耗時 6~10s（修復前偶發 152s）
- `pnpm run test`：45 files / 628 passed | 1 skipped，無回歸

## 待議事項（PENDING）

修復過程中發現 `src/main/main.ts` 未處理 `webContents` 的 `will-prevent-unload` 事件：當 `App.vue` 的 `beforeunload` 因未儲存變更呼叫 `e.preventDefault()` 時，視窗會直接無法關閉（無任何提示），可能影響正式環境使用者關閉 App 的體驗。已建立 [topic-023 PENDING](../../../engineering/discussions/topic-023-2026-06-14-quit-with-unsaved-changes/PENDING.md) 待技術會議討論退出流程的預期行為。

## 相關 Commit

- fix(test): 修正 E2E electronApp worker teardown 偶發逾時（unsaved changes 阻擋視窗關閉）
