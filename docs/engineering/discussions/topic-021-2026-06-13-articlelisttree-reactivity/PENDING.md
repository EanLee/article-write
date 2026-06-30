---
title: "ArticleListTree 在完整 E2E 套件中無法顯示新偵測文章（已解決）"
domain: engineering
type: rpd
status: approved
owner: roundtable-discussions
updated: 2026-06-14
source_of_truth: true
---

# topic-021｜ArticleListTree 在完整 E2E 套件中無法顯示新偵測文章

**日期**: 2026-06-13
**狀態**: ✅ 已解決（2026-06-14，[PR #40](https://github.com/EanLee/article-write/pull/40)）
**發起人**: 技術團隊（topic-020 E2E 驗收時發現）
**討論層次**: 技術會議 — 根因已定位，非 reactivity 問題，無需升級圓桌

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

## T-020 技術會議結果（2026-06-14）

已召開技術會議 [T-020](../T-020-articlelisttree-reactivity-investigation.md)，結論如下：

- **已排除的假設**：
  - ❌「多個 `window.reload()`/effect scope 被提前釋放」——全 spec 共用一個 Electron App + window，全程只有一次 `window.reload()`（test 1 的 beforeEach），Pinia store 不會重建
  - ❌「`FileWatchService.recentEvents`/`ignoreNextChange` debounce 污染導致 change 事件未送達」——`articleStore.articles.value` 1→2 是在 full-suite 失敗案例中確認的事實，資料確實送到 store
  - ❌「`ArticleListTree.vue` 的 `loadSettings()` 非同步時序競態使 `collapsedGroups` 收合 `_standalone`」——`loadSettings()` 為同步函式，且 worker 的 `localStorage` 初始為空，`collapsedGroups` 不會被填入
  - ❌「`treeContainerRef` 的 `handleKeydown` 被冒泡鍵盤事件誤觸發收合」——`handleKeydown` 只處理 Ctrl/Cmd+F 聚焦搜尋框，不會動 `collapsedGroups`
- **範圍收斂**：問題確定出在 `useArticleFilter.filteredArticles`（store 層）→ `ArticleListTree.vue` 元件層 `filteredArticles` → `seriesGroups` 這條 computed 鏈中的某一層，在 full-suite 下未正確重新計算或渲染，但純讀程式碼已無法再縮小範圍
- **下一步**：分層 debug log + `renderer-console.log` 比對（T-020 Action Item #1，負責人 Wei，P1）✅ 已完成，見下方「根因確認與解決」
- **附帶發現**：`FileWatchService.recentEvents` 去抖 key 未納入 `event` type，視為獨立技術債，於同分支一併處理（T-020 Action Item #2，負責人 Lin，P2）— 仍為 Backlog，未在本次範圍處理
- **暫時狀態**：test 6 維持 `test.fixme`，待 T-020 Action Item #1 找出斷裂層後再排修復（T-020 Action Item #3）✅ 已完成，已移除 `.fixme`

## 根因確認與解決（2026-06-14）

依 T-020 Action Item #1，在 `useArticleFilter.filteredArticles` → `ArticleListTree.filteredArticles` → `seriesGroups` 各層加入分層 debug log，重新執行 full-suite 並比對 `renderer-console.log`：

```
reloadArticleFromDisk push new article, articles.length= 2
  → useArticleFilter.filteredArticles recompute, articles.length= 2
  → ArticleListTree.filteredArticles recompute, result.length= 2
  → ArticleListTree.seriesGroups recompute, result=[{"name":"_standalone","count":2}]
```

**結論：computed 鏈完全正常，~10ms 內即時更新，本問題從來不是 reactivity 斷裂。**

真正逾時原因與 `docs/quality/assessments/fix-bug/2026-06-13-topic-020-e2e-acceptance-fixes.md` 的 **Fix #5（Ctrl+B 編輯器粗體誤觸發側邊欄收合，commit `be570b4`）同一根因**：

```
測試 1 按下 Ctrl+B → CodeMirror Mod-b 回傳 true → event.preventDefault()
  → 事件冒泡至 App.vue handleGlobalKeydown
  → [be570b4 修復前] 未檢查 e.defaultPrevented → toggleSidebar() → sidebarCollapsed=true
  → 整個側邊欄（含 ArticleListTree）持續收合至測試 6 執行
  → seriesGroups 資料正確，但 DOM 被收合隱藏 → otherRow.waitFor 逾時（表面現象）
```

`be570b4` 已於標記 test 6 `test.fixme` 的 commit（`2f9cac2`）之後 10 分鐘合併進 `develop`，但當時驗證未重新 `pnpm run build`，導致「測試 6 與 Fix #4/#5 無關」為誤判。

**處理結果**：未變更 production code（Fix #5 已存在），移除測試 6 的 `.fixme` 與過時註解。`pnpm run test` 628 passed | 1 skipped；E2E 全套件重跑 2 次皆 7 passed（含測試 6）。詳見追加修復報告與 [PR #40](https://github.com/EanLee/article-write/pull/40)。

## 關聯文件

- Bug Fix 報告（含追加修復）：`docs/quality/assessments/fix-bug/2026-06-13-topic-020-e2e-acceptance-fixes.md`
- 修復測試：`tests/e2e/writing-baseline.spec.ts`（已移除 `test.fixme`）
- 關聯議題：topic-020（儲存來源單一化，本問題於其 E2E 驗收階段發現）
- 修復 PR：[#40](https://github.com/EanLee/article-write/pull/40)
