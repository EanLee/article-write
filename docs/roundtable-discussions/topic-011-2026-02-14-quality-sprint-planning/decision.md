# 決策記錄：v0.2 品質鞏固 Sprint

> **話題編號**: topic-011
> **決策日期**: 2026-02-14
> **決策類型**: 全體一致

---

## 決策結果

**最終決定**：在等待 Jordan 使用回饋的空窗期，執行「品質鞏固 Sprint」——以補齊 E2E 測試保護網為核心目標，不新增功能。

**決策理由**：
1. Jordan 剛完成 v0.1 驗收，需要 1~2 週實際使用才能給出有價值的功能需求
2. 目前 UI 層幾乎零 E2E 測試，CodeMirror 6 遷移後編輯器行為複雜度大增，無測試保護的下次改動風險極高
3. 技術債有複利效應，此空窗期還債是最高投資報酬率的選擇
4. 穩定的品質保護是後續功能 Sprint 快速推進的前提

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| PM (Alex) | ✅ 支持 | 空窗期最高效利用，為功能 Sprint 打地基 |
| Marketing (Lisa) | ✅ 支持 | 穩定是口碑前提，等精準回饋再加功能 |
| User (Jordan) | ✅ 支持 | 怕已有功能壞掉，需時間沉浸使用後再回報 |
| Ops (Sam) | ✅ 強烈支持 | 無 E2E 等於無保障，Electron 越早建立越好 |
| CTO (Taylor) | ✅ 支持 | 還 CLAUDE.md 欠的技術債，CM6 後必須補保護 |

**結果**：5 支持、0 反對、0 中立 → **全體一致**

---

## ✅ Action Items

| # | 行動項目 | 負責人 | 優先級 | 完成條件 | 狀態 |
|---|---------|-------|-------|---------|------|
| Q-01 | 建立 Playwright + Electron 測試環境 | Lin | P0 | `pnpm run test:e2e` 可執行，Electron 視窗能被 Playwright 操控，CI-ready | ⏳ 待開始 |
| Q-02 | E2E：編輯器核心流程 | Lin | P1 | 「開啟文章 → 編輯內容 → AutoSave 觸發」Happy Path 通過 | ⏳ 待開始 |
| Q-03 | E2E：同步發布流程 | Lin | P1 | 「切換 published → 點擊同步 → 目標資料夾出現正確檔案」Happy Path 通過 | ⏳ 待開始 |
| Q-04 | E2E：設定路徑流程 | Lin | P1 | 「填入路徑 → 儲存 → 重啟後路徑保留」Happy Path 通過 | ⏳ 待開始 |
| Q-05 | Unit Test：補強 Store 層覆蓋率 | Lin | P1 | `articleStore`、`settingsStore` 主要 actions 有對應測試；`pnpm run test` 全通過 | ⏳ 待開始 |
| Q-06 | 評估 CI Pipeline 整合可行性 | Sam | P2 | 產出評估報告：Electron Playwright 在 GitHub Actions 的 `xvfb` 設定可行性與工量估算 | ⏳ 待開始 |
| Q-07 | 收集 Jordan 使用回饋 | Alex | P2 | 2 週後（2026-02-28）圓桌前，整理 Jordan 的功能需求清單，作為下個 Sprint 規劃輸入 | ⏳ 待開始 |

---

## 追蹤

**驗證方式**：`pnpm run test` + `pnpm run test:e2e` 全部通過；三個核心 Happy Path 有對應 Playwright 測試
**回顧日期**：2026-02-28（品質 Sprint 結束後，同步收集 Jordan 回饋，規劃下個 Sprint）
**負責追蹤**：Alex (PM)
