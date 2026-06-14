---
title: "儲存機制整體設計（合併解決 topic-019）"
domain: engineering
type: rpd
status: approved
owner: roundtable-discussions
updated: 2026-06-13
source_of_truth: true
---

# topic-020 決議｜儲存機制整體設計（合併解決 topic-019）

**日期**: 2026-06-13
**主持**: Alex（PM）
**結果**: 方案 A — 儲存來源單一化，**全體一致**（5 支持，其中 4 條件支持）

---

## 投票結果

| 角色 | 立場 | 關鍵理由與條件 |
|------|------|---------------|
| User (Jordan) | ✅ 支持（無條件） | 「畫面所見即存檔」是底線；B 是在地雷上貼警示牌 |
| CTO (Taylor) | ✅ 條件支持 | 設計缺陷非 bug；條件：frontmatter 欄位遺失同分支修復，列 Sprint 4 第零優先 |
| Ops (Sam) | ✅ 條件支持 | Soft Launch blocker；條件：A 上線前凍結自動儲存過渡、hash 比對＋寫入後驗證＋Sentry 事件 |
| Marketing (Lisa) | ✅ 條件支持 | 公關自殺等級風險；條件：必要時 Launch 順延，不帶地雷上場 |
| PM (Alex) | ✅ 條件支持 | 「已儲存」=銀行帳本等級承諾；條件：過渡期先上寫入前比對 safety net、三路徑 E2E 驗收 |

## 決議內容

1. **方案 A 採行**：所有儲存路徑（30s 計時器、Ctrl+S、切換文章）統一以**編輯器即時內容**為唯一來源（single source of truth），消除 store 舊快照寫入磁碟的可能。
2. **topic-019 一併解決**：「切換文章時自動儲存」行為**保留**，但必須走統一的即時內容路徑；透明方式為儲存狀態列即時反映（正在儲存／已儲存），不另跳通知。
3. **frontmatter 欄位遺失**（date/draft 儲存後消失）認定為同一資料流問題，**同一分支內修復**，不另開分支。
4. **過渡防護（A 完成前，第三輪仲裁定案）**：寫入前 mtime/hash 比對，偵測到衝突時**彈窗詢問使用者**——只偵測不合併、不默默處理；半天工，A 完成後拔除，E2E 涵蓋衝突彈窗情境。（凍結計時器方案經 Jordan 反對後否決；diff/合併邏輯經 Taylor 反對後否決）
5. **防護機制（隨 A 一併實作）**：儲存寫入前後 hash 比對與驗證，不一致時發 Sentry 事件並通知使用者，禁止靜默失敗。
6. **優先級**：Sprint 4 **第零優先**，高於 AI Phase 2；此問題未修復前不得 Soft Launch。
7. **風險揭露**：已知問題清單記載，採安心語氣版文案（Jordan＋Lisa 第二輪修訂）：「正在強化自動儲存的穩定性，過渡期間已加裝寫入前檢查降低覆寫風險；重要修改後可 Ctrl+S 再次確認」。
8. **時程**：估時 1.5~2 天不預先順延；第三天驗收不過才順延 Launch（Lisa 底線）。

## 驗收標準（Alex 提出，全體同意）

- [ ] 三種觸發路徑寫入磁碟前，內容與編輯器當前內容一致——各自有 E2E 覆蓋
- [ ] frontmatter 欄位（date、draft 等）儲存後完整保留
- [ ] UI 顯示「已儲存」時，磁碟內容與畫面 100% 一致
- [ ] 既有 `tests/e2e/writing-baseline.spec.ts` 的 `test.fixme` 解除並通過

## ✅ Action Items

| # | 行動項目 | 負責人 | 優先級 | 完成條件 | 狀態 |
|---|---------|-------|-------|---------|------|
| 1 | 過渡防護：寫入前 mtime/hash 比對＋衝突彈窗（含 E2E） | Sam | P0 | 半天內上線，衝突時彈窗詢問、不覆寫 | ⏳ 待開始 |
| 2 | 儲存來源單一化實作（A 方案，含切換時儲存路徑） | Taylor／技術團隊 | P0 | 三路徑統一取編輯器即時內容，unit + E2E 通過，1.5~2 天 | ⏳ 待開始 |
| 3 | frontmatter 序列化欄位保留修復 | Taylor／技術團隊 | P0 | date/draft 等欄位儲存後不遺失，同分支 | ⏳ 待開始 |
| 4 | 寫入後驗證＋Sentry 事件 | Sam | P1 | 不一致時可在 Sentry 看到事件 | ⏳ 待開始 |
| 5 | 解除 test.fixme 並補三路徑 E2E | 技術團隊 | P1 | 驗收標準四項全過 | ⏳ 待開始 |
| 6 | 已知問題清單揭露文案（安心語氣版） | Lisa＋Jordan | P2 | 措辭定稿並發布，今日內 | ⏳ 待開始 |
| 7 | 第三天驗收，決定是否順延 Launch | Alex | P0 | 驗收標準四項全過或宣布順延 | ⏳ 待開始 |

## 關聯文件

- 討論記錄：`./discussion.md`
- 問題背景：`./PENDING.md`、`../topic-019-2026-03-07-autosave-on-switch-behavior/PENDING.md`
- 技術證據：`docs/quality/assessments/fix-bug/2026-06-13-outline-empty-on-load.md`（附帶發現章節）、`tests/e2e/writing-baseline.spec.ts`
