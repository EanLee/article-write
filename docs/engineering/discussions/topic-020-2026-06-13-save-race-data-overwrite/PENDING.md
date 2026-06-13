# topic-020｜儲存競態：自動儲存以舊快照覆寫磁碟

**日期**: 2026-06-13（待排程）
**狀態**: ⚠️ 待圓桌決議
**發起人**: 技術團隊（E2E 檢驗時發現）
**討論層次**: 圓桌（戰略）— 涉及資料可能被錯誤寫入（Critical）

## 背景與情境

在為寫作基線功能補 E2E 測試（`tests/e2e/writing-baseline.spec.ts`）時，間歇性重現以下現象：

1. 使用者以快捷鍵格式化文字（編輯器內容正確）
2. Ctrl+S 手動儲存，UI 顯示「已儲存」
3. **磁碟檔案內容為格式化前的舊版本**，且 frontmatter 的 `date`、`draft` 欄位遺失

三輪測試中兩輪失敗（間歇性），隔離單跑時通過——典型競態特徵。

## 問題核心

系統存在**兩個儲存來源**且內容可能不一致：

| 儲存機制 | 內容來源 | 更新時機 |
|----------|----------|----------|
| 手動儲存（Ctrl+S） | 編輯器即時 `content.value`（v-model） | 每次按鍵即時 |
| 自動儲存（30s 計時器） | store 的 `currentArticle.content` | **僅在儲存成功後**（`updateArticleInMemory`） |

自動儲存若在手動儲存後觸發，會以 store 中的**舊快照**覆寫磁碟，造成使用者已儲存的內容靜默遺失。使用者完全不會知道發生了什麼。

## 已確認的技術事實

- 手動儲存路徑：`MainEditor.saveArticle()` → `content.value` → `articleService.saveArticle()`（事實）
- 自動儲存路徑：`AutoSaveService` → `getCurrentArticleCallback()`（store）→ 同一 `saveArticle()`（事實）
- store 的 `currentArticle.content` 只在儲存成功後更新，編輯期間為舊值（事實）
- E2E 重現：UI 斷言通過、磁碟斷言失敗，磁碟內容為 app 序列化格式的舊內容（事實）
- frontmatter `date`/`draft` 在儲存後遺失（事實，可能為獨立的序列化問題，需一併釐清）
- 確切觸發時序（哪個寫入後到）尚未完全定位（待決策後深入）

## 待決策項目

1. **儲存來源單一化**：自動儲存應改取編輯器即時內容？或編輯時即同步 store？（架構方向）
2. **兩套儲存機制是否並存**：與 topic-019（切換時儲存）合併討論——使用者的儲存心智模型到底是什麼？
3. **frontmatter 欄位遺失**是否為既有設計（型別化欄位以外丟棄）或 bug？
4. **修復前的風險揭露**：是否需要在 release note / 已知問題中告知？

## 建議的討論層次

| 議題 | 建議層次 | 原因 |
|------|----------|------|
| 儲存機制整體設計（與 topic-019 合併） | 圓桌（戰略） | 資料可能被錯誤寫入 + 使用者不知情 |
| 儲存來源單一化的實作方案 | 技術會議 | 架構選擇，決議後執行 |
| frontmatter 序列化欄位保留 | 技術會議 | 需先確認是否為規格 |

## 關聯文件

- Bug Fix 報告：`docs/quality/assessments/fix-bug/2026-06-13-outline-empty-on-load.md`（附帶發現章節）
- 重現測試：`tests/e2e/writing-baseline.spec.ts`（`test.fixme` 標記的磁碟寫入測試）
- 關聯議題：topic-019（切換文章時自動儲存行為決策，同源問題）
