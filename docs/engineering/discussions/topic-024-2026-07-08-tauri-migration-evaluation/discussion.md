---
title: "Tauri 底層遷移評估（Electron → Tauri + Rust）"
topic: "024"
date: 2026-07-08
domain: engineering
status: decided
participants: [Alex Chen (PM), Lisa Wang (Marketing), Jordan Lee (User), Sam Liu (Ops), Taylor Wu (CTO)]
---

# 圓桌會議 #024 — Tauri 底層遷移評估

## 議題描述

### 背景

WriteFlow 目前基於 Electron + Vue 3 + TypeScript 架構。使用者（開發者）提出底層遷移至 Tauri（Rust 後端 + WebView 前端）的評估需求，理由如下：

1. **目前問題過多**：近期連續出現 electron-log 無法寫入、自動儲存啟動/停止重複兩次、FrontmatterEditor DataCloneError 等 bug，影響正常使用
2. **檔案太大**：Electron 安裝包含完整 Chromium，Windows 安裝檔 ~130MB，不易分享與移動
3. **線上更新機制**：未來可能需要 auto-update（topic-012 已延後，Tauri 內建此功能）

### 目標

全面評估從 Electron 遷移至 Tauri 的技術與商業可行性，做出明確決策：**遷移、不遷移、或附條件觀察**。

### 範圍

- Tauri 2.0 的技術特性對比 Electron
- 遷移成本（人力、時程、風險）
- 現有 bug 是否為遷移的真正理由
- 替代方案

---

## 討論記錄

### 開場

Alex：「各位，今天的議題很明確：要不要把 WriteFlow 從 Electron 換到 Tauri？這是個戰略決定，影響接下來至少半年的開發方向。我先說背景：過去幾週我們修了 logging、autosave、DataCloneError 三個 bug，開發者提出這些問題反映的是 Electron 本身的問題，還是我們自己程式碼的問題？Taylor，你先說。」

---

### 觀點串 A：現有 bug 是否構成遷移理由

**Taylor 提出觀點 A1**：

Taylor：「我必須先澄清一件事，因為這個問題直接影響決策邏輯：那三個 bug，**沒有一個是 Electron 的問題**。

- electron-log 寫不到檔 → 我們自己同時執行了 `log.initialize()` 和 `import 'electron-log/preload'`，衝突了
- autosave 雙重啟動 → 我們的初始化時序寫錯了
- DataCloneError → 我們在 Vue reactive Proxy 上呼叫了 structuredClone，任何框架都一樣會爆

這些 bug 換了 Tauri 一樣會出現，因為根因是**我們的程式碼邏輯**，不是 Electron 平台。用「bug 太多所以換框架」來合理化遷移，是在逃避根本問題。」

**Jordan 回應**：

Jordan：「等等，我是使用者的角度，我不在乎 bug 是誰的錯，我只在乎：**現在開不了文件，我就是沒辦法用**。Taylor 你說這些不是 Electron 的問題，OK，但不管是誰的問題，這個產品現在不好用。如果換了 Tauri 能讓團隊更專注、更快修好，那我支持換。」

**Taylor 回應 Jordan**：

Taylor：「Jordan，我理解你的感受。但邏輯是反的：如果問題是程式碼品質，換框架不會讓程式碼品質變好，只會新增一大堆**遷移期間的新 bug**。Rust 的 IPC 跟 Electron 的 IPC 完全不同，整個 main process 要重寫，這段時間你面對的是更多的不穩定，不是更少。」

**Jordan 被說服，立場修正**：

Jordan：「好，你這個邏輯我接受。所以 bug 的數量本身不是遷移的好理由。但其他兩個理由——檔案大小和 auto-update——還是要評估。」

> 🟢 **主持人 Alex 宣告共識**：現有 bug 不構成遷移 Tauri 的充分理由，bug 根因在程式碼邏輯，與底層框架無關。

---

### 觀點串 B：檔案大小問題

**Lisa 提出觀點 B1**：

Lisa：「我從行銷角度說：130MB 的安裝包在 2026 年已經是心理障礙了。我在推廣時，使用者第一個問題就是『這要下載多少？』Tauri 的 Windows 包大概 5~10MB，這是一個可以放在 landing page 上的賣點：*輕量級、原生效能*。這不只是技術問題，是品牌定位問題。」

**Sam 反對**：

Sam：「Lisa，5MB vs 130MB 聽起來很漂亮，但背後代價是什麼？Tauri 不打包 Chromium，它用 **OS WebView**：Mac 用 WKWebView、Windows 用 WebView2、Linux 用 WebKitGTK。這三個版本的行為**不一致**。我做維運，我知道「在我電腦上沒問題」這句話在跨平台環境有多可怕。你今天在 Mac 上測試好的，Windows 使用者打開來 CSS 跑版、JS 行為不同——這種 bug 的追查成本比 bundle size 省下來的成本高出十倍。」

**Lisa 回應**：

Lisa：「Sam，這個風險是真實的，但不是必然。Tauri 2.0 已經成熟，很多大型專案在用——比如 Clash Verge、Zed（部分功能）。而且 WriteFlow 的受眾是技術型部落客，他們用的基本上是 Windows 10+ 或 Mac，WebView2 和 WKWebView 都很穩定。只有 Linux 會有 WebKitGTK 的問題，但 Linux 使用者本來就是少數。」

**Sam 立場微調**：

Sam：「Linux 使用者確實是少數，這個我承認。但 WebView2 在 Windows 10 1803 以前的版本是不預裝的——雖然 Tauri 可以內嵌安裝 WebView2 Runtime，但那又增加了安裝複雜度。另外，WebView2 本身有更新週期，不完全受我們控制，這是潛在的維護風險。我不是絕對反對，但這些風險要列在帳上。」

**Taylor 補充**：

Taylor：「Sam 說的 WebView2 這個點很重要。更根本的是：現在 WriteFlow 的 CSS 和 JS 是針對 Chromium 測試的。遷移後，我們需要在三個 WebView 引擎上重新做完整 E2E 測試，測試矩陣直接翻三倍。這個成本不能忽視。」

**Alex 引導**：

Alex：「所以 bundle size 是真實的痛點，但解法不只有換框架。Taylor，有沒有在 Electron 框架內縮小 bundle 的選項？」

**Taylor 提出替代方案**：

Taylor：「有。electron-builder 有 `asar` 壓縮、`nsis` 差分安裝、`--publish` 只包含必要檔案等選項。另外，Electron 28+ 開始用共享的 Chromium，如果走 Microsoft Store 或類似的方式分發，使用者可能已經有對應的 runtime。不能把 130MB 壓到 5MB，但 60~80MB 是可能的。再說，**Obsidian** 也是 Electron，安裝包 ~90MB，並沒有因此不受歡迎。」

> 🟡 **主持人 Alex 標記**：bundle size 是真實用戶痛點，但「換 Tauri」不是唯一解法；短期可用 Electron 優化，遷移評估需獨立看整體遷移成本。

---

### 觀點串 C：Auto-Update 需求

**Alex 提出觀點 C1**：

Alex：「topic-012 我們延後了 auto-update，理由是時程壓力。現在重新看這件事——Tauri 內建 `tauri-plugin-updater`，Electron 要用 `electron-updater` 並自己維護更新伺服器。這個差異有多大？」

**Taylor 回應**：

Taylor：「差距比想像中小。`electron-updater` 配合 GitHub Releases 做 auto-update 是完全成熟的方案，topic-012 我們評估過，方案本身沒問題，只是當時沒排進去。如果今天要加 auto-update，在 Electron 上我估計 **1~2 週**可以完成。Tauri 的 updater 雖然是內建，但 Rust 的遷移成本是 **3~6 個月**——用 3~6 個月換一個 1~2 週就能做到的功能，CP 值太低。」

**Sam 附議 Taylor**：

Sam：「完全同意。auto-update 不應該是換框架的理由，它是一個可以獨立完成的功能。」

> 🟢 **主持人 Alex 宣告共識**：auto-update 在現有 Electron 架構下可獨立實現，不構成遷移 Tauri 的充分理由。

---

### 觀點串 D：Tauri 的真實優勢與遷移成本對抗

**Taylor 提出觀點 D1（正面評估 Tauri）**：

Taylor：「我想反過來，正面說 Tauri 的真實優勢，不要只停在反對遷移。Tauri 有幾點是 Electron 真的給不了的：

1. **記憶體佔用**：Electron 的 main + renderer process 加起來容易 200~400MB，Tauri 的 Rust 後端加上 OS WebView 通常 50~100MB。對寫作工具這類長時間開著的 app，差距使用者感受得到。
2. **IPC 型別安全**：Tauri 的 commands 是 type-safe 的，不需要 `contextBridge.exposeInMainWorld` 這種 boilerplate，也不會出現 structuredClone 問題——因為 Tauri IPC 走的是 Rust 原生序列化（serde_json）。
3. **未來性**：Rust 生態系在系統工具領域快速成長，長期維護性比 Node.js 更強。

但——遷移成本是真實存在的：整個 main process 要用 Rust 重寫，包括 FileSystem、ConfigService、ArticleService、PublishService 的所有邏輯。保守估計 **3~4 個月**，而且期間前端也要重新對接新的 IPC interface。」

**Lisa 回應**：

Lisa：「Taylor，你說的記憶體和型別安全我理解，但我有個問題：**使用者現在感受到的問題是什麼？** 是記憶體佔用太高？還是 app 不穩定、有 bug？如果是後者，換框架不能解決問題，反而在遷移期間讓使用者沒有可用的 app。我寧可在 Electron 上穩定下來，出一個可用的版本，再評估下一代架構。」

**Jordan 強力附議 Lisa**：

Jordan：「Lisa 說到重點了。我不在乎底層是 Electron 還是 Tauri，我要的是一個今天可以打開、打字、儲存的 app。現在告訴我說要花三個月重寫——那三個月我用什麼？我會去用 Obsidian 加插件，然後就不回來了。」

**Taylor 被動搖**：

Taylor：「Jordan 這個點我承認很有力。從純技術角度我支持 Tauri，但從 **產品連續性** 的角度……三個月的空窗期確實是個高風險。如果我們現在使用者基數小，還沒到被競品拉走的關鍵期，這個風險或許可以承受；但如果 Jordan 代表的使用者很容易流失，就不值得冒。」

**Alex 介入裁量**：

Alex：「我來做個歸納。Tauri 的技術優勢是真實的，但遷移成本對現階段的 WriteFlow 而言代價過高。原因：

1. 現有 bug 根因是程式碼品質，換框架不能改善
2. bundle size 可透過 Electron 優化緩解
3. auto-update 是獨立功能，不需換框架
4. 3~4 個月遷移空窗期，使用者留存風險高

這不是說 Tauri 不好——而是說**現在不是時候**。」

> 🟡 **主持人 Alex 標記分歧**：Taylor 技術上認可 Tauri 優勢，但認同「現在不是時候」；Jordan 強烈希望先有穩定可用版本。

---

### 觀點串 E：何時才是「對的時機」（前瞻決策）

**Taylor 提出觀點 E1**：

Taylor：「既然大家同意現在不遷移，我希望把『什麼條件下重啟評估』訂清楚，不然這個議題會一直以不確定的形式懸在那裡：

1. 使用者基數達到有意義的規模（例如 500 MAU）後，才值得考慮重大架構投資
2. 當 auto-update 需求真正排進 roadmap，且 Tauri updater 的優勢明顯優於 electron-updater 時
3. 或者 Electron 出現我們無法 workaround 的重大問題（安全漏洞、平台封鎖等）」

**Sam 附議並補充**：

Sam：「同意 Taylor 的框架。我加一條：如果團隊有 Rust 工程師加入，遷移成本才能大幅降低。現在用 JavaScript/TypeScript 的團隊去寫 Rust，學習曲線就是遷移成本的一半。」

**Lisa 同意**：

Lisa：「從行銷角度，我支持這個觀察期的設定。Tauri 作為技術賣點的時機是——當我們有穩定的 v1.0 版本，有足夠的使用者基礎，然後可以說『WriteFlow 2.0 重建於 Rust，效能提升 XX%，安裝包縮小 XX%』。這比『我們現在正在重寫中』更有力。」

**Jordan 最後確認**：

Jordan：「OK，我聽懂了。現在的決定是：先把現有 app 做穩，別再讓我遇到開不了文件的問題；Tauri 是未來的選項，但不是現在的行動。我可以接受。」

> 🟢 **主持人 Alex 宣告共識**：設定「Tauri 重啟評估」的觸發條件，現階段決定維持 Electron，集中資源穩定現有產品。

---

## 觀點總結表

| 角色 | 初始立場 | 最終立場 | 關鍵論點 |
|------|---------|---------|---------|
| 🎯 Alex（PM） | 中立，需要評估 | 維持 Electron，設觀察期 | 遷移空窗期使用者流失風險；三項理由均有替代解法 |
| 📢 Lisa（Marketing） | 支持遷移（bundle size 賣點） | 有條件支持——等 v1.0 穩定後再遷 | Tauri 是行銷賣點，但時機不對；先有穩定版再說 |
| 👤 Jordan（User） | 支持遷移（不在乎底層） | 反對立即遷移 | 三個月空窗期使用者會流失；先要可用的 app |
| 🔧 Sam（Ops） | 反對遷移（WebView 複雜度） | 反對立即遷移 | WebView 跨平台維護成本高；等有 Rust 工程師再談 |
| 💻 Taylor（CTO） | 技術上支持 Tauri | 支持長期目標，反對立即遷移 | Tauri 優勢真實，但現在遷移代價高於收益 |

---

## 共識與分歧

### ✅ 共識點

1. **現有 bug 不是遷移理由**：三個已修復的 bug 根因均為程式碼邏輯，與 Electron 平台無關
2. **auto-update 獨立執行**：可在現有 Electron 架構下用 `electron-updater` + GitHub Releases 實作，不需換框架
3. **Tauri 技術優勢是真實的**：記憶體佔用、IPC 型別安全、bundle size，但需在正確時機才值得遷移成本
4. **現階段不遷移**：3~4 個月遷移空窗期對現有使用者規模代價過高
5. **設定重啟評估觸發條件**：有意義的使用者基數 + Rust 工程師加入 + Electron 出現不可 workaround 問題

### 🔴 主要分歧（已收斂）

- Lisa 初期認為 bundle size 是強遷移理由 → 接受「先穩定 v1.0 再議」的折衷

### ❓ 待釐清問題

- Electron bundle size 優化的具體目標（壓到多少 MB 算可接受？）
- auto-update 的優先級（何時排進 roadmap？）

---

## ✅ Action Items 摘要

| # | 行動項目 | 負責人 | 優先級 | 完成條件 |
|---|---------|--------|--------|---------|
| A1 | 研究 Electron bundle 優化方案（electron-builder asar 壓縮、差分安裝），提出可達成的 target size | Taylor | P2 | 產出一份技術評估報告，含目標大小與實作步驟 |
| A2 | 將 auto-update（electron-updater + GitHub Releases）排入 roadmap 並估時 | Alex | P2 | Roadmap 更新，auto-update 有明確排期 |
| A3 | 記錄「Tauri 重啟評估觸發條件」於 decision.md，供未來參考 | Taylor | P3 | decision.md 完成並更新索引 |
