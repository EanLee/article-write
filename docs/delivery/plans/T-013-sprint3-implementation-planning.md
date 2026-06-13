---
title: "Sprint 3 實作規劃"
domain: delivery
type: plan
status: approved
owner: tech-team
updated: 2026-02-17
source_of_truth: true
---

# T-013 Sprint 3 實作優先順序與分工規劃

**日期**: 2026-02-27
**負責人**: Sam（Tech Lead）
**狀態**: ✅ 完成

## 任務背景

圓桌會議 #017 決策（2026-02-27）確立 Sprint 3 主線：

1. 全文搜尋（S-01）完成合併
2. AI Phase 1（SEO 生成）上線
3. 前提：T-015 設計文件 + Sentry 先到位

本次技術會議目標：
- 確認 S-01 合併前還有哪些缺口
- 盤點 AI Service 現有實作與設計文件的落差
- 訂出 Sprint 3 的每人具體分工與順序

## 現況盤點（會議前確認）

### S-01 全文搜尋

- SearchService.ts ✅ 已實作
- search store ✅ 已實作
- SearchPanel.vue ✅ 已實作
- 分支：feature/s01-full-text-search（尚未合併到 develop）

### AI Service 現況

- AIProvider/ClaudeProvider.ts ✅
- AIProvider/GeminiProvider.ts ✅
- AIProvider/OpenAIProvider.ts ✅
- AIService.ts ✅（generateSEO 已實作）
- seoStore ✅
- aiPanel store ✅

**落差**：T-015 設計文件（IAIProvider 正式介面文件）尚未產出，topic-017 所有 Action Items 標記「待開始」

## 討論記錄

---

### 第一輪（2026-02-27）

Sam：「好，我們直接進重點。topic-017 剛投票完，Sprint 3 主線是『S-01 全文搜尋完成合併 → AI Phase 1 上線』，但現在有三個 P0 擋點必須馬上清，不然中間會吹。先問 Lin：SearchService 那邊測試覆蓋有沒有到位？我看分支還在 feature/s01-full-text-search，有測試用例卡在什麼地方嗎？」

Sam：「再來是設計文件。AI Service 程式碼都超前實作了——三個 Provider、AIService.ts 都有、store 也都在——但 T-015 這份 IAIProvider 介面設計文件還沒產，這是決策文件明確標的 P0，三天內要定案的。沒有介面文件，Phase 2 的 TypeScript 型別無法啟動，反過來又會拖 Sprint 4 的排程。」

Sam：「第三個問題其實更尷尬：Sentry 整合同樣是 P0，但我完全看不到有人動過。決策要讓 AI Phase 1 上線，但不打 Sentry 的話，用戶萬一 API 呼叫失敗、Key 失效，我們是瞎的。Wei，你們 UI 層有遇到什麼依賴阻塞嗎？還是 S-01 本身就卡在某個地方？」

---

Lin：「從 Service 層角度點出三個最關鍵的卡點。第一個是 S-01 合併前的 IPC 壓力測試——`search:query` 的 response 結構穩定，但 build-index 那塊還有坑：每次啟動全量重建涉及檔案 I/O + 正則掃描，幾百篇沒問題，但 article 目錄結構變化時 chokidar 增量更新的邏輯會漂移。建議合併前補一份壓力測試，模擬 1000 篇文章的索引建立時長，確認 UI 不會 block。Sam，這塊是我在 Service 層寫 bench，還是交給 Wei 端到端測試？」

Lin：「第二個是 AI Service 已超前 T-015 文件的問題。我傾向『補文件描述現況』而不是『重審架構』——現在的設計（IAIProvider Adapter + error code 分類 + Config 加密儲存）邏輯是對的。但文件要補清楚：`analyzeArticle` 的簽名還沒定，topic-016 決定三角度分析，需要新的 interface。建議 T-015 直接整合 Phase 1 和 Phase 2 的介面定義，省掉後面再改的麻煩。」

Lin：「第三個是 topic-016 的三角度分析 token 消耗，我沒看到評估結果。假設 Prompt 1000 token（title + content + checklist 定義），回應估計 1000-1500 token，一次分析 2000+ token。Jordan 一天檢視 5 篇文章，就 10000+ token。這個 P2 action item 我建議拉到 Phase 1 實作同時進行，在 Service 層加一個 dry run 測試，用真實文章跑三角度分析記下 token 數據，不要延到 Sprint 3 中期才算。」

---

Wei：「好消息是 AI Phase 1 的前端框架基本到位——SEOGenerateButton 已實作，FrontmatterPanel 也整合了，aiPanelStore 也有。壞消息是 S-02 的 wikilink 高亮在 CM6 層還沒看到實作，只在 markdown-it 那邊有基礎的 token 生成。另外 AIPanelView 目前只有 SEO 這一個 Section，topic-015 說的三個 Section 的獨立狀態管理還完全沒開始。」

Wei：「關於 AI Panel Phase 2 的 checkbox UI，我的想法是在 Section 上方加一個 Collapsible 的『分析角度』區塊，三個 checkbox：SEO 角度、行銷角度、學習者角度，預設全選。但這取決於 Prompt 結構——如果三個角度 Prompt 複雜度差異大，checkbox 的 UI 排版可能需要調整。Alex，你對這個 Layout 有什麼想法嗎？」

---

Alex：「我從 Jordan 使用的角度，提出三個 UX 關切。第一是 Phase 2 三角度建議的顯示方式——topic-016 每個角度 6-8 項建議，加上優先級標記、問題描述、具體建議，資訊密度很高，直接列表會讓 Jordan 眼花。我的提案是 **Tab 切換 + 優先級篩選**：預設顯示所有角度的 🔴 高優先建議，提供三個 Tab 切換到單個角度，每項建議用 card，左側色塊代表優先級，右側是問題與建議兩行文字。Wei，State 管理有難度嗎？」

Alex：「第二個是等待 AI 分析的體驗問題。Phase 2 一次 API 呼叫三個角度，可能要 10-15 秒，空白等待會讓 Jordan 以為卡住了。我的設計是**漸進式提示**而不是轉圈菊花——例如『正在評估 SEO 角度...』→『正在評估行銷角度...』→『正在評估學習者角度...』，讓他知道 AI 在做什麼。如果後端支援 Streaming，可以讓結果逐步出現。Lin，現在 Phase 2 的 API 呼叫是一次性還是支援 Streaming 返回？」

Alex：「第三個是 BYOK onboarding flow——Jordan 第一次開 AI Panel 時如果沒有 Key，不要顯示紅色錯誤，而是出現三步引導彈窗：解釋什麼是 API Key → 附 Anthropic 控制台連結 → Input + 驗證按鈕。驗證通過才 unlock AI 功能。這個引導邏輯的架構責任要先確認：偵測 Key 是否設定是 Main Process 的 ConfigService，但觸發引導 UI 是 Frontend——Lin，這個 IPC 訊號要怎麼設計？」

### 第二輪（2026-02-27）

Sam：「好，我們先理一遍 Round 1 的關鍵待辦。Lin 提的 S-01 壓力測試分工——我的建議是：Lin 你在 Service 層寫 bench，Wei 則做端到端的實際編輯場景測試。理由很簡單，S-01 是序列化層的效能關鍵，bench 在 Service 寫更精準；Wei 的 E2E 則驗證真實使用者流程下的瓶頸。分工清楚，兩邊結果互補。你們同意嗎？」

Sam：「再來 T-015 文件的立場。Lin 傾向『補現況描述』而不重審架構——這我接受，但前提是：IAIProvider 的 error code 分類決策理由、以及為什麼選 safeStorage 而不是 keytar，這兩個點要在文件裡寫清楚。補現況不是放過這些細節，是在現況上把『為什麼』補完整。」

Sam：「Wei，直說——topic-013 S-02 是 P1 任務，現在 S-01 都要合併了，S-02 的 CM6 wikilink 高亮目前卡在哪？我需要具體的完成時間表，特別是 Phase 2 三個 Section 的獨立狀態管理，不能再拖。最後，Alex 提的漸進式提示很好——問題是這需要真實 Streaming 還是假時間軸？Lin，AI 調用的真實耗時範圍是多少？」

---

Lin：「Streaming 的代價很大——要改 Client 的 fetch 邏輯改成 ReadableStream、UI 層改成增量更新 state、Service 層要支援 SSE。改這個會延遲 Phase 2 兩個 Sprint。我建議先維持一次性回傳，視覺上加假進度條，Sprint 3 先解決，Sprint 4 根據實際使用者反饋再評估 Streaming。耗時估算：AI API 正常回應約 3-8 秒，Token 多的話可到 12 秒。前端假進度條設計成 3-5 個階段剛好。」

Lin：「onboarding 的 IPC 設計我有想法：新增 `ai:check-key-status` 訊號，Frontend 主動請求，Main Process 的 ConfigService 回傳 `{ hasKey: boolean, provider: string | null, updatedAt?: number }`。Frontend 根據 hasKey 決定顯示引導彈窗還是跳過。UI 和 ConfigService 解耦，Main Process 是單一真實來源。」

Lin：「Sentry 分工建議：我負責 Main Process + Service 層，加 `@sentry/electron` main integration 和 AIService 的 captureException；Wei 負責 Renderer 的 `@sentry/vue` init。共同設定 `src/config/sentry.ts` 統一管環境區分。下週一可以開始裝，跟 S-01 合併同步到位。」

---

Wei：「UI 層沒有依賴阻塞，AIPanelView 骨架已準備好，可以並行開發。Tab 切換和篩選的狀態管理不複雜：`activePerspectiveTab`、`showHighPriorityOnly` 兩個 reactive state，搭配 `filteredPerspectiveResults` computed property，在 aiPanel store 統一維護就夠了。假進度條用 `useInterval` 每 3 秒切換提示——『分析中...』→『整理重點...』→『生成建議...』，API 返回後立即清除。Jordan 感知流暢，不會以為卡住。」

Wei：「S-02 的 CM6 wikilink 高亮需要 2-3 天，不會卡 AI Phase 1 進度，並行處理。Phase 2 三個 Section 的狀態集中在 aiPanel store，結構是 `{ sectionName: { loading, error, result, lastFetchedAt } }`，統一控制加載邏輯和快取，後續擴展新 Section 也容易。Alex，你說的常駐 checkbox 我傾向，UI 上我會用 Pill Button 三個並排，視覺更緊湊。」

---

Alex：「Wei 問的 checkbox layout，我傾向常駐列表不摺疊。理由是 AI 功能對 Jordan 來說是新東西，他還在探索怎麼用，讓選項常駐可以降低探索成本。如果空間吃緊，改成三個 Pill Toggle Button 並排，視覺更緊湊。如果真的要 Collapsible，header 要加明確意圖的標籤——不是只有 chevron，要寫『⚙ 分析選項』，讓 Jordan 知道裡面有什麼。」

Alex：「Lin 說 token 消耗 2000+ 一次——UI 上我建議不要直接顯示 token 數字，改顯示『成本級別』的人話提示，例如按鈕 hover 顯示『此操作預計消耗中等 API 配額』。進階選項：Settings 裡開關『API 配額預警』，讓 Jordan 自己決定是否看 token 數字。」

Alex：「Sentry 的事不是我的 concern，但 error UX 是。現有的 Toast 紅色提示太模糊，Jordan 看到『生成失敗』不知道是 Key 失效、quota 用完還是 network 問題。我建議 error message 要具體：『❌ API Key 無效，請到設定頁更新』、『❌ 網路連線失敗，請稍後再試』——而不是通用的 Error 500。SEO 生成按鈕旁加個『?』提示：『需要網路連線和有效的 API Key』，設定好心理預期。」

---

### 第三輪：收斂決策（2026-02-27）

Sam：「好，第三輪收斂，我直接拍板四個問題。」

Sam：「第一個，S-01 合併時間。Lin 的壓力測試需要 1-2 天才有基準線，Wei 的 E2E 平行跑，但 S-01 本身已功能完整。我的決定是：**今天先把分支從 develop 拉最新同步，Lin 和 Wei 各自在平行環境跑測試，通過後明天（2026-02-28）直接合併到 develop**。不能無限期等待，S-01 已超期，Sentry 上線後真實使用數據比開發環境壓測更有價值。」

Sam：「第二個，T-015 vs S-01——並行，不串行。T-015 三天內定案不會卡 S-01 合併。Taylor，三天內把 IAIProvider 介面設計和選型理由補完整——『為什麼 safeStorage 而不 keytar』、『error code 分類這樣設計的理由』——這是 Phase 2 開發前的前置知識，不是可選項。」

Sam：「第三個，Sentry 安裝時機——跟 S-01 同一天（2026-02-28）上線。Lin 負責 Main Process + AIService 層，Wei 負責 Renderer + Vue 層，共用 `src/config/sentry.ts`。Phase 1 SEO 一上線就要能捕捉 API 失敗、Key 驗證錯誤、quota 用完的事件，不能等到 Phase 2 才做。」

Sam：「第四個，Phase 2 token 消耗評估——接受 Lin 的提議，提前到 Phase 1 同步進行。但這不是開始實作 Phase 2，是把真實文章跑三角度分析 dry run，記下 token 數據和耗時。下週一 Lin 開始，三天內有初步數據，決定 Phase 2 是否能拉入 Sprint 3。分工清楚，每個人知道自己的 deadline。T-013 會議結束，Lin 明天報告合併狀態，Taylor 三天內交 T-015。」

---

## 設計決策

| 議題 | 決定 | 理由 |
|------|------|------|
| S-01 合併時機 | 2026-02-28 合併（Lin bench + Wei E2E 同日通過） | 功能完整，Sentry 上線後補真實數據 |
| T-015 文件方向 | 補現況描述 + 補決策理由（不重審架構） | 程式碼邏輯正確，只需補「為什麼」 |
| Phase 2 Streaming | 不做，維持一次性回傳 + 前端假進度條 | 改 Streaming 代價高，延遲兩個 Sprint |
| Phase 2 假進度條 | `useInterval` 每 3 秒切換提示文字，API 返回後清除 | 3-8 秒等待體驗流暢 |
| Sentry 時機 | 與 S-01 同一天（2026-02-28） | AI Phase 1 上線前必要條件 |
| BYOK onboarding IPC | 新增 `ai:check-key-status`，回傳 `{ hasKey, provider }` | UI 與 ConfigService 解耦 |
| Phase 2 checkbox UI | 常駐 Pill Toggle Button 三個並排 | 降低 Jordan 探索成本 |
| Phase 2 建議列表 | Tab 切換 + 優先級篩選，aiPanel store 統一管理 | 高資訊密度下的可掃描設計 |
| error message | 具體化（Key 失效 / 網路失敗 / quota 用完分開說） | 模糊 Error 500 無法引導 Jordan 行動 |
| token 消耗評估 | 提前到 Phase 1 同步做 dry run | 低成本，高決策價值 |

---

## 行動項目

| # | 項目 | 負責人 | 優先級 | 完成條件 | 預計時間 |
|---|------|--------|--------|---------|---------|
| 1 | S-01 壓力測試（Service bench + E2E） | Lin + Wei | P0 | 穩定性驗證通過，無致命 bug | 2026-02-27 |
| 2 | S-01 合併到 develop | Lin | P0 | 測試通過，分支合併完成 | 2026-02-28 |
| 3 | Sentry 集成（Main Process + Renderer） | Lin + Wei | P0 | Dashboard 可見 AI 相關錯誤事件 | 2026-02-28 |
| 4 | T-015 設計文件（IAIProvider 介面 + 選型理由 + Fallback） | Taylor | P0 | 文件完成，架構契約對齊 | 2026-03-02 |
| 5 | Phase 2 TypeScript 介面定義（AnalysisSuggestion 等） | Taylor | P1 | 型別落地程式碼，通過 TypeScript 檢查 | 2026-03-05 |
| 6 | AI Phase 1 SEO 生成 UI（+ 具體化 error message） | Wei | P1 | FrontmatterPanel 整合 + E2E 通過 | 2026-03-08 |
| 7 | Phase 2 token 消耗 dry run | Lin | P2 | 測試報告完成，供 Sprint 3 規劃決策用 | 2026-03-02 |
| 8 | Phase 1 推廣素材準備 | Lisa | P2 | 素材就位，Phase 1 上線後可立即發布 | 2026-03-08 |

---

## 相關檔案

- `docs/product/discussions/topic-017-2026-02-27-feature-direction-integration/decision.md`
- `docs/engineering/discussions/T-010-ai-service-architecture.md`
- `docs/engineering/discussions/T-012-ai-panel-phase2-3-prompt-design.md`

## 相關 Commit

> 待補充
