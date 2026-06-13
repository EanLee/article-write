---
name: bugfix-workflow
description: 修復任何 bug、撰寫 Bug Fix 報告、記錄根本原因、建立 PENDING 待議文件時必用。涵蓋 fix/* 分支流程、報告格式、假修復防範、使用者驗證關卡。
---

# Bug Fix 工作流程

## 流程（fix/* 與 hotfix/* 分支）

1. 從 `develop` 建立 `fix/問題描述` 分支（hotfix 從 `main`）
2. **重現問題**：能描述具體重現步驟，看到問題實際發生
3. **撰寫重現問題的測試**（修復前應失敗）
4. 修復問題
5. 執行測試確認通過（`pnpm run test` 全綠）＋手動驗證
6. 提交修復（commit 格式見 CLAUDE.md）
7. 撰寫 Bug Fix 報告（見下方規範）
8. 若發現待討論異常 → 建立 PENDING 文件（見下方）
9. 推送分支，**通知使用者驗證並列出具體驗證步驟**
10. **等待使用者確認通過後**才能 `git merge --no-ff` 進 develop（**hotfix 需同時合併進 `main` 與 `develop`**）

**⚠️ 禁止在使用者驗證前合併。驗證失敗時回到原分支追加修復，禁止另開新分支（RETRO-001）。**

## Bug Fix 報告規範

- 位置：`docs/quality/assessments/fix-bug/YYYY-MM-DD-簡短描述.md`
- 必含三部分：**問題描述**（現象/條件/重現步驟）、**原因分析**（根本原因）、**修正方式**（檔案/邏輯/為何有效/替代方案）＋相關 Commit
- 同一問題的追加修復**補充在原報告底部**（`## 追加修復 (YYYY-MM-DD)`），不建新檔
- 在使用者驗證**之前**完成報告

## 根本原因記錄（必須）

報告中必須記錄**完整呼叫鏈**到最底層原因，不接受表面描述：

```
問題現象 → 呼叫鏈（每一層）→ 根本原因（最底層）→ 為什麼修復有效
```

❌ 「問題：圖片顯示錯誤；修復：修改了 ImageService」
✅ 列出 `MainEditor.onMounted → validateSyntax() → checkImageExists() → !this.vaultPath → return false ← 根本原因`

## 假修復自我檢查（宣稱完成前必答）

1. 我有重現問題嗎？ 2. 我有驗證修復嗎？ 3. 我理解根本原因嗎？ 4. 我有檢查副作用嗎？

禁止：只改測試不改程式碼、只修表面、沒實際測試就宣稱完成、修復後立即合併。

## PENDING 待議文件（觸發即建，不可自行決定方向）

**觸發條件**：行為缺乏圓桌決議支撐／修復揭露產品層行為問題／根因涉及「當初為何這樣設計」／修復後仍有 Race Condition、資料損毀等風險。

- 位置：`docs/<domain>/discussions/topic-NNN-YYYY-MM-DD-描述/PENDING.md`（`<domain>` 依議題性質判斷；編號讀 `docs/conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md` 最新值加一）
- 必含：背景與情境、問題核心、已確認的技術事實（區分事實與待決策）、待決策項目、建議討論層次表、關聯文件
- 建立後**同步更新** `docs/conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md` 索引與統計

**討論層次判斷**：
| 情境 | 層次 |
|------|------|
| 使用者不知道發生什麼／資料可能被錯誤寫入 | 圓桌（Critical） |
| 哪種技術方案更好 | 技術會議 |
| 功能優先級、UX 方向 | PM（Alex）決策 |
| 明確 bug（不符已決策規格） | 技術層自行修復 |
