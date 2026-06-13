# topic-021｜ArticleListTree 在完整 E2E 套件中無法顯示新偵測文章

**日期**: 2026-06-13（待排程）
**狀態**: ⚠️ 待技術會議排查
**發起人**: 技術團隊（topic-020 E2E 驗收時發現）
**討論層次**: 技術會議 — 根因未定位的 reactivity 問題，需技術層深入調查後再決定是否升級

## 背景與情境

在 `tests/e2e/writing-baseline.spec.ts` 第 6 個測試「切換文章時自動儲存前一篇的編輯器即時內容（topic-020）」中：

1. 測試建立第二篇文章 `switch-target.md`，由 FileWatch 偵測並寫入 `articleStore.articles`
2. 等待 `ArticleListTree` 出現「切換目標文章」項目，逾時 15 秒失敗
3. **單獨執行此測試（`-g` 指定）可通過**；在完整 7 項 serial 套件中執行則必定逾時

## 已確認的技術事實

- 資料層正確：透過 debug log 確認 `articleStore.articles.value` 在 push 後長度由 1→2（事實）
- 與 focus mode 衝突（Fix #4）為**獨立問題**：已修復 `useFocusMode.ts` 的 `Ctrl+Shift+F` 與編輯器腳註快捷鍵衝突（測試 4 觸發），並以隔離 debug 測試驗證 `localStorage["editor-focus-mode"]` 維持 `null`、`.tab-btn "文章資訊"` 全程可見（事實）
- 即使 `SideBarView`／`ArticleListTree` 確認全程保持掛載與可見，full-suite 執行仍在同一行 `otherRow.waitFor` 逾時（15354ms）（事實）
- `filteredArticles` 的計算鏈：`articleStore.filteredArticles` → `useArticleFilter(articles)` → `ArticleListTree.filteredArticles`（依 `searchText` 過濾）→ `seriesGroups`（事實，尚未逐層驗證在 full-suite 下是否正確重新計算）
- 確切斷裂點（computed 快取 / Pinia store 跨測試共享狀態 / effect scope 生命週期）尚未定位（待查）

## 待決策項目

1. **根因調查方向**：是否為 `computed` 快取在 full-suite 長時間執行下未正確標記 dirty？或 Pinia store 在多個 `window.reload()`/測試間的 effect scope 被提前釋放？
2. **修復策略**：根因確定後，是技術層自行修復（明確 bug）還是需重新檢視 `useArticleFilter` 的設計（可能涉及「當初為何這樣設計」）？
3. **test 6/7 暫時狀態**：目前 test 6 已標記 `test.fixme` 並附註本文件連結；test 7（大綱面板）在 test 6 fixme 後因不再切換文章、留在主文章上，可正常通過——是否接受此暫時狀態直到根因修復？

## 建議的討論層次

| 議題 | 建議層次 | 原因 |
|------|----------|------|
| Reactivity 斷裂根因調查 | 技術會議 | 需要逐層加 log / 隔離測試，屬技術深挖 |
| 若根因為架構設計問題（如 effect scope） | 視調查結果可能升級圓桌 | 「當初為何這樣設計」 |

## 關聯文件

- Bug Fix 報告：`docs/fix-bug/2026-06-13-topic-020-e2e-acceptance-fixes.md`
- 重現測試：`tests/e2e/writing-baseline.spec.ts`（`test.fixme` 標記的切換測試）
- 關聯議題：topic-020（儲存來源單一化，本問題於其 E2E 驗收階段發現）
