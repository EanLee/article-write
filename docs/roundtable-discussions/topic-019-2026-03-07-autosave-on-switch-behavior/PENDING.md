# topic-019｜切換文章時自動儲存的行為決策

**日期**: 2026-03-07（待排程）
**狀態**: ⚠️ 待圓桌決議
**發起人**: 技術團隊（Sam）
**討論層次**: 戰略層次（使用者行為期望 × 產品安全性）

---

## 背景與緊急程度

本議題由以下三個嚴重 Bug 的根因分析觸發（詳見 `docs/fix-bug/2026-03-07-article-list-critical-bugs.md`）。

其中 **Bug 3「切換文章觸發非預期 Save」** 暴露出系統缺乏明確的產品層決策支撐，
技術實作的行為（「切換文章時自動儲存前一篇」）從未通過圓桌決議。

---

## 議題一：「切換文章時自動儲存」應該存在嗎？

### 現況

`setCurrentArticle` 在切換文章時，會呼叫 `autoSaveService.saveOnArticleSwitch(previousArticle)`，
若偵測到內容有變更，則會立即將前一篇文章寫入磁碟。

此行為的來源：
- 加入於 commit `d025d64`（refactor: remove Vue ref coupling from AutoSaveService）
- 無任何圓桌決議支撐
- 推測為開發者自行加入的「保護機制」

### 問題

使用者「只是點一下不同文章」就發生了 Save，且：
1. **靜默發生**：Save 狀態顯示一閃而過，使用者可能不注意
2. **無法取消**：使用者沒有選擇「不要存」的機會
3. **Race Condition 風險**：（已由技術修復緩解，詳見議題二）

### 需要決策的問題

- 使用者是否期望「切換文章時，上一篇的未存變更會被自動保留」？
- 若是，使用者應該如何得知這件事發生了？
- 若否，「未存變更切換」時應該怎麼辦（詢問 / 放棄 / 暫存）？

### 選項對比

| 選項 | 行為 | 優點 | 風險 |
|------|------|------|------|
| A. 保留現行（靜默存） | 切換時自動存 | 不打斷操作流 | 靜默，不透明 |
| B. 詢問使用者 | 彈出確認 | 透明、使用者控制 | 打斷流程 |
| C. 暫存（草稿快取） | 切換不存磁碟，只存記憶體 | 安全且不打斷 | 需實作暫存機制 |
| D. 移除此行為（僅靠計時器） | 切換不做任何儲存 | 最簡單安全 | 計時器間距內的變更有遺失風險 |

---

## 議題二：Race Condition 與資料損毀風險（已部分緩解）

### 已修復（本次 fix branch 已處理）

1. **ID 碰撞根因**（commit 待合併）：
   - `generateIdFromPath` 從 `btoa(encodeURIComponent()).substring(0,16)` 改為 FNV-1a 雙向 hash
   - 相同目錄下所有文章因共享路徑前綴導致 ID 相同的問題已解決

2. **Reactive Reference 問題**（commit 待合併）：
   - `setCurrentArticle` 現在對 `previousArticle` 製作 shallow snapshot
   - 防止 Vue 響應系統在非同步 migration save 完成後修改 `previousSnapshot` 的內容

### 仍待決議的風險

即使 Race Condition 已緩解，「切換時儲存」的根本行為**是否符合使用者期望**仍是未決問題。

技術修復讓「切換時儲存」更安全，但不能決定「是否應該這樣做」。

---

## 議題三：AutoSave Timer 行為與「切換時儲存」的關係

### 現況

系統有兩套儲存機制：
1. **計時器自動儲存**：每 `autoSaveInterval`（預設 30 秒）儲存一次
2. **切換觸發儲存**：`saveOnArticleSwitch`（無圓桌決議）

### 問題

若兩者並存，使用者的心智模型是什麼？
- 「我隨時可以切換，系統會幫我存」？
- 「我知道每 30 秒自動存一次」？
- 使用者可能根本沒有意識到任何自動儲存行為

---

## 建議的討論層次

| 議題 | 建議層次 | 原因 |
|------|----------|------|
| 切換時是否自動儲存 | **圓桌（戰略）** | 涉及使用者心智模型與產品承諾 |
| 自動儲存的 UX 反饋 | **圓桌（戰略）** | 透明度 = 信任的基礎 |
| Race Condition 修復 | ✅ 已由技術團隊處理 | 純技術安全問題，不需決策 |
| AutoSave interval 值 | 技術層（Sam + Wei） | 純配置，可在技術層決定 |

---

## 關聯文件

- `docs/fix-bug/2026-03-07-article-list-critical-bugs.md` — Bug 報告（含 Bug 3 根因分析）
- `docs/roundtable-discussions/README.md` — 本議題索引
- AutoSave 重構來源：commit `d025d64`
- `setCurrentArticle` 修改歷史：commit `e1417ff`（A6-01 fix）
