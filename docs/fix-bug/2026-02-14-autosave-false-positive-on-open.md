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

## 修正方式

> ⏳ 待安排

## 相關 Commit

> ⏳ 待修復後補充

---

> **狀態**: 已記錄，待排入下一 Sprint 修復
> **回報者**: Jordan（端對端驗收時發現）
