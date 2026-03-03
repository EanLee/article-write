# topic-018 討論記錄：市場方向與進度對焦

**日期**: 2026-03-03
**發起人**: 使用者（伊恩）
**議題**: 再次確認市場方向與進度對焦
**參與者**: Alex（PM）、Lisa（Marketing）、Jordan（User）、Sam（Ops）、Taylor（CTO）
**主持人**: Alex（PM）

---

## 前置背景摘要

| 項目 | 狀態 |
|------|------|
| 目標上線日 | 2026-03-15（距今 12 天） |
| Sprint 3 主線 | 全文搜尋 → AI Phase 1 SEO 生成 |
| MVP v0.1 完成率 | 91%（11 項中 10 項完成）|
| topic-017 Action Items（2/27 決策） | 8 項，全部「⏳ 待開始」→ 本次確認實際狀態 |
| 最新 git commit | `bd3dd49 fix(security): s7-01/a7-01 GitService 路徑驗證` |

---

## 議題一：Sprint 3 主線進度的真實樣貌

**Alex：** 「好，各位，今天是 3 月 3 日，距離 3/15 剩 12 天。我開門見山：我把 MVP_STATUS、topic-017 的 8 個 Action Items、Jordan 的 2/28 用戶回饋、T-015 設計文件全部看完了。整體結論是——有些事比我預期的好，有些事讓我很在意。先說好的部分：MVP 核心功能 91% 完成，Jordan 已經在真實發文了，這是紮實的。但有一件事我必須現在就點出來：topic-017 的 Action Item #4，AI Phase 1 的完成條件是『E2E 測試通過，Jordan 可一鍵生成 SEO 欄位』——我去 src/ 下查，ClaudeProvider.ts、AIService.ts 這些檔案確實存在，架構是在的。但 Jordan 的 2/28 回饋，她用了兩週、給了 7 分、提了三個優先需求，AI 功能一個字都沒有。這不對。」

**Jordan：** 「Alex，等等。你說 ClaudeProvider 在代碼裡？我完全不知道這件事。我這兩週在用的版本，有 AI 功能的入口嗎？我以為 AI 是還在計畫裡沒開始做的東西——我從來沒看到任何 AI 按鈕、AI 面板、或者任何提示說『你可以試用 AI 生成 SEO』。如果功能在代碼裡但我看不到，那對我來說等於不存在。」

**Taylor：** 「Jordan 說的讓我必須誠實面對一件事。架構是落地的——IAIProvider 介面、三個 Provider 實作、AIService、IPC handler——這些我都確認了，設計是乾淨的。但我剛才重新查了程式碼，`ClaudeProvider.ts` 的 `max_tokens` 還是 400，這個第七次評審（TOKEN6-03）標記要改為 600 的項目，**還沒動**。max_tokens 400 在 SEO 生成的複雜 JSON 輸出下，最壞情況是截斷——`JSON.parse` 失敗，使用者看到 AI 錯誤，但不知道原因是什麼。更讓我不解的是，這是兩行改掉的事，沒有理由還掛著。還有一件事：Sprint 3 承諾要完成的 Phase 2 TypeScript 介面設計——`analyzeArticle()`、`AnalysisSuggestion`、`ArticleAnalysisResult`——T-015 設計文件裡有，**`types.ts` 裡沒有**。所以『架構完成』和『功能可以交付給用戶』之間，還有一段距離。」

**Jordan：** 「好，所以就是說，功能架構做好了，但沒有 UI 入口讓我使用？那對我來說跟沒做一樣。Taylor，我不需要聽完整的架構說明——給我一個具體的時間點：什麼時候可以讓我在 WriteFlow 裡看到一個按鈕、點一下、然後看到 Slug 被填好？不要說『Sprint 3 結束』，給我一個日期。」

**Alex：** 「Jordan 的問題很核心，但我先把另一個問題放上來，因為它可能影響所有的時間點判斷。」

---

## 議題二：Sentry — P0 前提條件的真實狀態

**Sam：** 「我先說。topic-017 的決策記錄寫得很清楚：Sentry 是 AI Phase 1 上線的 P0 前提條件。這不是我個人的保守，是 2/27 全體共識決定的。我去查了程式碼——`src/main/sentry.ts` 和 `src/config/sentry.ts` 都存在，`initSentry()` 有在 Main Process 和 Renderer 兩端呼叫，`AIService` 裡也有帶 tag 的 `captureException`。代碼層面，Sentry 的整合是寫好的。但這裡有一個關鍵的 gap：Sentry 是透過 `VITE_SENTRY_DSN` 環境變數讀取 DSN 的。我沒有看到任何地方確認這個環境變數在生產 build 裡是否已經配好，更沒有看到 Sentry Dashboard 有收到測試 event 的紀錄。代碼寫好不等於監控有效。沒有確認過 DSN 配好、沒有在 Sentry 後台看到事件進來，就帶著 AI API Key 上線——這是盲飛。我的底線：沒有確認過的 Sentry，AI Phase 1 不能上線。」

**Taylor：** 「Sam 說的我完全同意，而且我可以給一個更具體的評估：從目前的代碼狀態到『Sentry 確認有效』，工時大概是 2 到 4 小時——設定 VITE_SENTRY_DSN 在 build 流程、實際觸發一個 AI 錯誤、確認 Sentry Dashboard 有收到帶正確 tag 的 event、設定 alert rule。這不是複雜的工作，就是還沒有人坐下來做這一件事。另外，AI Token 報告對可觀測性給了 1 分滿分 10 分——這個評分是準確的，我不想跟它爭。3/15 之後如果 AI 功能的錯誤率和使用量我們都看不見，我們等於是在盲目運行一個外部 API 依賴。」

**Alex：** 「好，那這件事排在第一優先。Sam，你說估 2-4 小時——你能承接嗎？」

**Sam：** 「可以，但我要先提一個前置條件，這個跟 Sentry 一樣重要，甚至更直接影響 AI Phase 1 的核心 UX。第七次評審的 S7-02：`ConfigService.getApiKey()` 在加密不可用時靜默返回亂碼，`hasApiKey()` 回傳 true，UI 顯示『API Key 已設定』，但所有 AI 呼叫都會失敗，而且使用者完全不知道原因。如果 Jordan 設定了 API Key 然後一鍵生成 SEO 卻持續失敗，她的第一個反應不會是『這是 ConfigService 的加密問題』，她的反應是『這個功能根本不能用』。這個要先修，不是可選的。」

**Taylor：** 「Sam 說的 S7-02 和 QUAL7-04（ConfigService 同步 I/O）是可以合併在同一個分支解決的，評審報告也建議這樣打包。工時估算 3-4 小時，包含測試更新。這個我來承接，但排序上必須是：先修 ConfigService，再驗 Sentry，再開 AI Phase 1 給 Jordan 測試。」

**Alex：** 「好，這個順序我接受。現在把另一個讓大家都在意的問題打開來說。」

---

## 議題三：3/15「上線」到底是什麼意思？

**Jordan：** 「Alex，我直接問你，不要繞。3/15『上線』是什麼意思——是你們繼續讓我測，還是我可以把連結傳給 Twitter 粉絲說『你們去下載』？因為這兩件事的答案會完全不一樣。如果是公開發布，我現在有一個大問題：你的功能清單 AI 那塊幾乎是空的，MVP 文件裡 AI 的字都快看不到。有人問我 WriteFlow 的 AI 能幫我做什麼，我要怎麼回答？『那個還沒有』——這樣說嗎？」

**Lisa：** 「Jordan 這個問題打到點了。Alex，這對我的行銷策略影響非常直接：如果是公開推，而且 AI Phase 1 確定上線，我有 WriteFlow 最強的差異化賣點——『Write in Obsidian. Publish with AI-optimized SEO. Instantly.』這個故事可以推 Product Hunt。功能一完成，給我 48 小時，我可以交出截圖、GIF 操作示範、Product Hunt 文案、Twitter 發文稿的完整素材包。但如果 AI Phase 1 沒有，我要切換到 Soft Launch 模式：不衝 Product Hunt，改去 Reddit r/ObsidianMD 和 Indie Hackers，用早期採用者語氣收回饋，保留 Product Hunt 的新品曝光窗口等 AI 完成後再用。兩個策略都可以，但我現在需要你說清楚是哪個。」

**Alex：** 「我的評估是這樣：如果 ConfigService 修復 + Sentry 驗證 + max_tokens 調整可以在 3/10 前完成，Taylor 有把握讓 Jordan 在 3/11 拿到可以真實使用的 AI Phase 1——那 3/15 我們走 Soft Launch，不是 Product Hunt 正式衝刺，但可以對外公開。Jordan 提的文章列表穩定性問題，那個也必須在 3/15 前修，因為那是你說會讓外部用戶第一次用就覺得不穩定的問題。如果這些時間點做不到，3/15 就只是 Alpha 繼續，不公開。」

**Jordan：** 「好，那我加一個條件：我需要在 3/11 或之前實際用到 AI SEO 生成功能，親自驗收一次。不只是你們說『做好了』，我要自己打開 WriteFlow 生成一篇文章的 Slug 和 Meta Description，覺得有用，才算我同意 3/15 可以公開。你們做出來的這個功能是要解決我的痛點的，不是技術展示。」

**Lisa：** 「Jordan 說的這個『驗收時間點』讓我想到另一個行銷問題。Alex，我之前說 Phase 1+2 打包行銷——現在我要改口了。Phase 2 是 Sprint 4 的事，等到 Phase 1 和 Phase 2 合併再推，可能是 4 月底甚至 5 月，行銷窗口是有時效性的。我的新建議是：Phase 1 完成就推，打『SEO-powered publishing』的單一訴求；Phase 2 完成後做第二波，升級為『AI 文章助手』。兩波比一波好，可以製造持續聲量。競品可能在我們等待的過程中補這個功能，我不想冒這個風險。」

---

## 議題四：接下來 12 天的優先序與決策點

**Taylor：** 「讓我整理一下技術上接下來 12 天裡必做的清單，不是 P2、P3，是我認為上線前不能省的：第一，ConfigService S7-02 + QUAL7-04 合併修復（我承接，3-4 小時，前置於所有 AI 工作）；第二，max_tokens 400 → 600（兩行，TOKEN6-03，半小時，沒有理由再拖）；第三，Sentry DSN 驗證——實際觸發 AI 錯誤確認後台有收到（Sam 承接，2-4 小時）；第四，AI Panel UI 接通到 AIService——讓 Jordan 看得到並能用到按鈕；第五，Phase 2 TypeScript 介面落地到 types.ts（這是 Sprint 3 的承諾，不能讓它只活在設計文件裡）。這五件事，如果我們在 3/8 前全部到位，Jordan 在 3/11 可以驗收，3/15 可以 Soft Launch。這是緊的，但技術上可行。」

**Sam：** 「Taylor 的清單我同意，但我要補一個：文章列表的穩定性問題，Jordan 說『同步完成後選到的文章消失、要重新找』，這個天天發生。如果 3/15 要對外公開，這個 UX bug 必須在裡面，不然第一批外部用戶的第一印象就毀了。這個比 Phase 2 TypeScript 介面的優先級更高。」

**Jordan：** 「Sam 謝謝你提這個，我以為你們沒在意。這個問題真的每天讓我多花一兩分鐘找文章，很煩。還有自動儲存那個跳出『正在儲存...』的虛驚，我游標停著想事情它就跳，每次以為我按錯什麼——這個也一起修掉好嗎？不是大問題，但是日常噪音。」

**Alex：** 「好，讓我把今天的決議整理清楚。我們確認幾件事：

一，2026-03-15 的上線定義：如果 3/11 前 Jordan 驗收通過 AI Phase 1，走 **Soft Launch**（Reddit/Indie Hackers，不是 Product Hunt 正式推）；如果 3/11 前沒有完成驗收，3/15 維持 Alpha Only，不公開。Product Hunt 的正式發布保留給 AI Phase 1 穩定後。

二，12 天內的技術優先序（P0 不可跳過）：
- ConfigService S7-02 修復（Taylor，本週）
- max_tokens 400 → 600（Taylor，今天或明天）
- Sentry DSN 生產驗證（Sam，本週）
- AI Panel UI 接通（讓 Jordan 看到按鈕）
- 文章列表穩定性 bug 修復（Sam 提，影響第一印象）

三，Phase 1+2 合併行銷策略調整：改為 Phase 1 完成即推，Phase 2 另起第二波。Lisa 在 Phase 1 完成後 48 小時內交出素材包。

四，Jordan 在 3/11 或之前進行 AI Phase 1 真實驗收，結果決定 3/15 是否公開。」

**Lisa：** 「最後補一件事，Alex——3/15 前我需要一句話的 pitch 確認，所有素材都要基於這句話延伸，這個不能在最後兩天才定。我的提案是：『Write in Obsidian. Publish with AI-optimized SEO. Instantly.』——各位有意見嗎？Jordan，你拿到這工具後，你會怎麼跟朋友介紹它？你的第一句話是什麼？」

**Jordan：** 「我大概會說：『Obsidian 寫完，自動處理發布的那些雜事，現在還能幫你生成 SEO。』沒那麼酷炫，但這是我真實的使用情境。」

**Lisa：** 「完美。Jordan 的版本比我的更真實，我去把它修成推廣文案。」

**Alex：** 「好，今天的決議到這裡。12 天，可行，但沒有 buffer，每一個任務都要準時。Sam、Taylor，我這週需要你們給我具體的完成時間點，不要是『本週』，是具體的日期。散會。」

---

## 待整合 Action Items

（詳見 decision.md）

| 優先 | 項目 | 負責 | 截止 |
|------|------|------|------|
| P0 | ConfigService S7-02 + QUAL7-04 合併修復 | Taylor | 3/6 前 |
| P0 | max_tokens 400 → 600（TOKEN6-03）| Taylor | 3/4 前 |
| P0 | Sentry DSN 生產環境驗證 | Sam | 3/7 前 |
| P0 | 文章列表穩定性 bug 修復 | 待認領 | 3/10 前 |
| P1 | AI Panel UI 接通 AIService | 待認領 | 3/8 前 |
| P1 | Phase 2 TypeScript 介面落地 types.ts | Taylor | 3/10 前 |
| P1 | Jordan AI Phase 1 實際驗收 | Jordan | 3/11 |
| P2 | 推廣素材包（截圖、GIF、Product Hunt 草稿）| Lisa | Phase 1 驗收後 48h |
| P2 | 一句話 pitch 確認 | Alex + Lisa | 3/6 前 |
