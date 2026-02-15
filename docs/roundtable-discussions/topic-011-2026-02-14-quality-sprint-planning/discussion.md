# 圓桌會議 #011：v0.2 Sprint 方向決策

> **日期**: 2026-02-14
> **主題**: v0.1 完成後，下一個 Sprint 的優先方向
> **觸發**: CodeMirror 6 遷移 Jordan 驗收通過，v0.1 MVP 全部完成
> **出席**: Alex（PM）、Jordan（User）、Taylor（CTO）、Sam（Ops）、Lisa（Marketing）

---

## 背景與前情提要

今日 CodeMirror 6 遷移通過 Jordan 驗收，合併至 develop。至此 v0.1 MVP 所有功能全數完成：

- F-01~F-05 核心功能 ✅
- I-01~I-05 基礎設施（含 Electron 打包）✅
- UX-01~04 體驗修復 ✅
- UX-02 CodeMirror 6 遷移 ✅

現在需要決定 v0.2 Sprint 的方向。

---

## 討論記錄

### Part 1：開場，三個方向

**Alex（PM）**：好，v0.1 今天正式收工。Jordan 的 CM6 驗收剛過，我們直接進 v0.2 規劃。我列三個方向，先讓大家說想法，不要憋著：

- **方向 A：功能擴展** — Git 自動化（F-06）、Wikilink inline 高亮、多游標、CM6 自訂主題
- **方向 B：品質鞏固** — 補齊 E2E 測試、Store 層 Unit Test、效能優化
- **方向 C：等 Jordan 回饋** — 讓 Jordan 用 1~2 週，再根據真實痛點決定

**Taylor（CTO）**：我直說——方向 B 是唯一合理的選擇。我們整個 UI 層現在幾乎是裸奔狀態，零 E2E 測試。CLAUDE.md 寫得很清楚「所有 `.vue` 變更必須有 E2E 測試」，我們一直在欠這筆債。CodeMirror 6 上線之後，`MainEditor.vue` 和 `CodeMirrorEditor.vue` 的邏輯複雜度是以前的好幾倍——下次有人動這裡，出了問題要怎麼抓？靠肉眼看 code？

**Sam（Ops）**：說得對。我補一句更直接的：現在是賭運氣在維運。沒有 E2E，我不知道每次更新完使用者端到底壞了什麼。Electron 的測試環境越早建越好，這種東西拖到後面只會更難補。

---

### Part 2：Jordan 的立場

**Alex**：Jordan，你有沒有特別急著要的新功能？如果有，我們要把這個放進來考量。

**Jordan（User）**：沒有。你現在問我「還缺什麼功能」，我說不出準確答案——我才剛開始真的用，需要時間才知道哪裡卡。猜出來的需求，八成是錯的。

再說，我最不想看到的是「我以為能用的東西突然壞了」。上次 AutoSave 出 bug 的時候，我寫了一段文字，後來發現根本沒存，那種感覺很差。有完整的測試保護，我才敢放心每天用。

**Alex**：好，你說得清楚。品質先，等你兩週後有真實回饋，我再開圓桌。

---

### Part 3：Lisa 要替 F-06 爭一下

**Lisa（Marketing）**：等一下，我不是完全反對品質 Sprint，但 F-06 Git 自動化我想說幾句話。同步完自動 commit push，這個對使用者非常有感——現在同步完還要自己打 terminal，這是個明顯的摩擦點，也是我們和其他工具拉開差距的機會。真的要等到下個 Sprint？

**Taylor**：Lisa，F-06 工時不是問題，`simple-git` 接上去 2~3 天可以做完。問題是：做完之後我用什麼驗證沒壞掉同步流程？手動跑一遍？那如果下個人改了什麼，又要手動跑一遍？我要的是一個可以跑的測試，不是靠人工巡邏。

**Lisa**：所以你的意思是——先建測試框架，F-06 才加得安全？

**Taylor**：對。而且 F-06 加進去之後，測試場景本身就更複雜了：local 寫入 + git 操作要一起驗。趁現在只有 local 寫入，先把基礎建好，後面才接得住。

**Lisa**：好，我服了。但 F-06 的行銷文案我先寫，準備好等你們做完。

**Sam**：這才是正確分工。

---

### Part 4：範圍確認

**Alex**：Taylor，這個 Sprint 測試要做到哪裡？給我一個具體範圍，不要說「盡量補」。

**Taylor**：三個 Happy Path E2E，這樣：
1. 開啟文章 → 在編輯器輸入 → AutoSave 觸發、儲存正確
2. 切換文章為 published → 點擊同步 → 目標資料夾出現正確 Leaf 結構
3. 設定填路徑 → 儲存 → 重啟後路徑還在

加上 Store 層：`articleStore`、`settingsStore` 主要 actions 補 Unit Test。

整體工量約一週。這不是「盡量補」，這是最小可信任的保護底線。

**Sam**：CI 整合的部分——Electron + Playwright 在 Linux 要跑 `xvfb`，這個我來評估。如果這個 Sprint 搞得定，我會直接設定好；搞不定就出報告，下個 Sprint 再跟。

**Jordan**：三個流程我到時候跑一遍做驗收，但你們有自動測試之後，我也比較放心多試邊界情況，知道不會搞壞基本功能。

---

### Part 5：拍板

**Alex**：我來收尾：v0.2 主題是品質鞏固，不加功能。Lin 建環境跑測試，Sam 評估 CI，Alex 兩週後收 Jordan 回饋。F-06 等下個 Sprint，Lisa 先備料。有人要反對嗎？

**Taylor**：沒有。

**Sam**：沒有。

**Lisa**：沒有，但我有記在備忘錄了。

**Jordan**：好，我繼續用，有問題我回報。

**Alex**：全體一致。散會。

---

## 結論與 Action Items

### 決策

| # | 決策 | 結果 |
|---|------|------|
| D-01 | v0.2 Sprint 主方向：品質鞏固，不新增功能 | ✅ 全票通過 |
| D-02 | 核心目標：Playwright + Electron E2E 環境，覆蓋三個 Happy Path | ✅ 通過 |
| D-03 | F-06 Git 自動化延後至下個功能 Sprint | ✅ 通過 |
| D-04 | Jordan 使用 2 週後回報，2026-02-28 圓桌收集功能需求 | ✅ 通過 |

### Action Items

| # | 項目 | 負責人 | 完成條件 | 狀態 |
|---|------|--------|----------|------|
| Q-01 | 建立 Playwright + Electron 測試環境 | Lin | `pnpm run test:e2e` 可執行，Electron 視窗能被 Playwright 操控 | ⏳ 待開始 |
| Q-02 | E2E：編輯器核心流程（開啟→編輯→AutoSave）| Lin | Happy Path 通過 | ⏳ 待開始 |
| Q-03 | E2E：同步發布流程（published→同步→檔案出現）| Lin | Happy Path 通過 | ⏳ 待開始 |
| Q-04 | E2E：設定路徑流程（填路徑→儲存→重啟保留）| Lin | Happy Path 通過 | ⏳ 待開始 |
| Q-05 | Unit Test：補強 Store 層覆蓋率 | Lin | `articleStore`、`settingsStore` 主要 actions 有測試，全通過 | ⏳ 待開始 |
| Q-06 | 評估 CI Pipeline 整合可行性 | Sam | 產出評估報告：xvfb 設定可行性與工量估算 | ⏳ 待開始 |
| Q-07 | 收集 Jordan 使用回饋 | Alex | 2026-02-28 前整理 Jordan 功能需求清單，作為下個 Sprint 規劃輸入 | ⏳ 待開始 |

---

**圓桌狀態**: ✅ 結論明確，進入執行階段
