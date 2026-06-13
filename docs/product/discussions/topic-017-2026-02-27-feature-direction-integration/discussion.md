# topic-017 整合 AI 規格與後續 Sprint 功能走向

**議題**：整合 topic-014（AI API 整合）、topic-015（AI Panel 設計）、topic-016（文章建議三角度分析）的決策，確定後續 Sprint 功能走向。
**發起日期**：2026-02-27
**發起人**：使用者
**狀態**：✅ 決策完成

---

## 背景

WriteFlow 於 2026-02-16 集中完成了三場 AI 功能的戰略討論（topic-014/015/016），確立了 AI API 整合策略、AI Panel 三段式設計框架，以及 Phase 2 文章建議的三角度分析規格。然而，截至 2026-02-27，所有相關 Action Items 仍處於「⏳ 待開始」狀態。

同時，全文搜尋功能（S-01，topic-013）正在 `feature/s01-full-text-search` 分支積極開發中。

**核心問題**：決策完整，但執行缺位。全文搜尋完成後，下一個 Sprint 應該如何排序 AI 功能的開發？

### 相關決策回顧

| 話題 | 主要決策 | Action Items 狀態 |
|------|---------|-----------------|
| topic-013 | 全文搜尋（S-01）+ CM6 wikilink 高亮並行 | 全文搜尋進行中 ✅ |
| topic-014 | AI API：Phase 1 SEO 生成、Phase 2 文章建議、BYOK + Demo Key、Adapter 模式 | 全部 ⏳ 待開始 |
| topic-015 | AI Panel 三段式（SEO 助手 / 文章建議 / 寫作助手） | 全部 ⏳ 待開始 |
| topic-016 | Phase 2 三角度分析框架（SEO / 行銷 / 學習者），analyzeArticle 函式設計 | 全部 ⏳ 待開始 |

---

## 討論記錄

### 第一輪：現況確認與各角色優先級（2026-02-27）

Alex：「好，大家都到了，我們開始。今天是 topic-017，2026-02-27。先講現況——我們這兩週開了三場圓桌，topic-014 定了 AI API 整合策略，topic-015 定了 AI Panel 三段式設計，topic-016 定了 Phase 2 文章建議的三角度分析框架，決策品質都很高。但有個問題：三場討論的 Action Items，沒有一項是『進行中』，全部都是『⏳ 待開始』。

同時，唯一在跑的是全文搜尋——feature/s01-full-text-search 分支，這是 Jordan 每天 2-3 次的痛點，P0 等級，方向沒有問題。

今天我需要我們做三件事：第一，全文搜尋完成後，Sprint 3 的第一個功能是什麼？第二，topics 14/15/16 的 Action Items 要怎麼排序，誰先動？第三，有沒有功能需要重新評估優先級，或者直接先凍結？

讓我說清楚——我們不缺好的決策，我們缺的是把決策變成可交付的節奏。今天開完，我要每個 Action Item 都有明確的『誰、做什麼、什麼時候開始』，不能再帶著一堆待開始離場。

讓我先說我的看法：Sprint 3 的第一個功能應該是 AI Phase 1——SEO 生成，不是 Phase 2，不是文章建議。理由很簡單：Jordan 發布文章前要手寫 Slug、Meta Description、Keywords，每次都要花時間，這是高頻且有明確終點的痛點。Phase 1 的範圍小、可測試、Lisa 有推廣素材可以用，風險低、效益高。讓我們聽聽大家的看法。」

---

Lisa：「好，全文搜尋終於快收尾了，我等這個時刻很久了！現在是時候認真談 Sprint 3 的方向。

從行銷角度來說，我的立場很清楚：**AI Phase 1（SEO 生成）必須盡快啟動**。你們知道嗎，現在 AI 功能是最容易上 Product Hunt 的賣點，市場視窗不等人。Slug 自動生成、Meta Description、Keywords——這三個功能加在一起，就是一個完整的『AI 驅動 SEO 工作流』，光這個故事就能寫好幾篇推廣文章。

而且說實話，我自己的 Action Item——Phase 1 的推廣素材還是待開始狀態，我需要有實際功能可以截圖、可以 demo，才能真正做出有說服力的產品文案。沒有 demo 的行銷就是空話。

所以我的優先順序建議：Sprint 3 先衝 AI Phase 1，讓我們有第一個 AI 功能可以公開展示。全文搜尋是核心體驗，但它不是差異化賣點——AI SEO 才是我們能在市場上講出來的故事！」

---

Jordan：「好，終於要討論這個了。全文搜尋快好了我很開心，但說真的，下一步我最想要的是 AI 幫我生 SEO 那些東西。每次寫完文章，我還要自己想 Slug、寫 Meta Description、想關鍵字⋯⋯這根本就是在浪費我的時間。隨便一篇文章我都要花個 5-10 分鐘在這上面，而且常常想出來的 Slug 又醜又不好記。

AI Phase 1 如果能一鍵幫我搞定這三樣，我馬上就想用。順序的話我覺得很簡單：搜尋先完成，然後馬上做 SEO 生成，文章建議的事可以之後再說。我又不是每天都在重構文章，但我每篇文章都要寫 SEO。先做最高頻的事，這樣不是很合理嗎？」

---

Sam：「好，我直說。AI Phase 1 最大的風險就是外部 API 依賴——Claude API 掛掉、延遲飆高、或是用戶的 BYOK Key 出問題，我們現在完全是盲飛狀態。Sentry 還沒設定，發生問題我們根本不知道用戶那邊出了什麼事。這不行。

我的立場是：Phase 1 可以開始，但有前提條件。第一，Sentry 必須先到位，至少要能捕捉 API 呼叫失敗、timeout、Key 驗證錯誤這幾個關鍵事件。第二，Fallback 機制要驗證過，不只是寫在設計文件裡。

至於 Phase 1 和 Phase 2 同時開始——我反對。Phase 1 還沒穩定，就疊上 Phase 2 的複雜度，出問題的時候你根本不知道是哪一層壞掉的。穩定壓倒一切，先把 Phase 1 跑起來、監控確認正常，再談 Phase 2。」

---

Taylor：「讓我先把幾個技術依賴關係理清楚，再談 Sprint 3 的排程。

從架構角度看，目前有三條待啟動的技術線：CM6 Adapter 文件（AI-05）、IAIProvider 介面設計、還有 analyzeArticle 的 TypeScript 介面。這三條線不是獨立的——IAIProvider 是整個 AI 功能的地基，所有上層功能都依賴它。如果地基不穩，Phase 2 的 analyzeArticle 實作會累積技術債，而且很難回頭重構。

所以我的優先序是：**第一，先完成 T-015 技術設計文件**，把 IAIProvider 介面和 Claude Adapter 的設計定案。這不是寫文件的形式主義，而是讓 Sam 和其他成員有共同的接口契約，避免各自實作時產生不一致。**第二，才進入 Phase 1 的 SEO 生成實作**。

CM6 文件（AI-05）的優先序相對較低——它是 S-01 全文搜尋的技術資產，不影響 AI 功能的主路徑。Sprint 3 可以安排在 AI 主線穩定後再補。從長期來看，Adapter 模式保證了未來換 AI 供應商的靈活性，這個架構決策我認為是正確的，值得花時間把介面設計做好，不要急著跳到 UI 實作。」

---

### 第二輪：交叉回應——分歧與收斂（2026-02-27）

Alex（回應 Taylor）：「Taylor，你說的是對的——IAIProvider 要先定案。問題是：T-015 技術設計文件要花多少時間？我不想讓這件事變成 Sprint 3 的開門阻塞。能不能給個時間預估？」

Taylor：「如果聚焦在 IAIProvider 介面和 Claude Adapter 的接口定義，不含實作，三天內可以完成。這不是大型設計文件，是精準的型別定義和接口契約。」

---

Sam（回應 Lisa）：「Lisa，我理解你要推廣素材，但你要我拿一個沒有監控的 AI 功能去做 demo——萬一 demo 當場 API 失敗怎麼辦？比沒有 demo 更糟。Sentry 設定我可以和 T-015 並行推進，不會卡 AI Phase 1 的開發，但在功能上線前必須到位。」

Lisa（回應 Sam）：「好，Sam 說的合理——沒有監控的 demo 是雙刃劍。那我們可以這樣：Sentry 和 T-015 同步做，Phase 1 開發中途，我開始準備推廣文案和截圖規劃，等功能穩定後直接出素材，不需要等功能上線才開始行銷準備。」

---

Jordan（回應 Taylor）：「Taylor，我不太懂 IAIProvider 是什麼，但如果你說要先做三天的設計，我就只有一個問題：做完設計，到我實際可以用 AI 幫我生 Slug，還要多久？」

Taylor：「設計三天，Phase 1 實作包含 SEO 生成和 UI 整合，保守估計一到兩週。所以全文搜尋完成後，三週內你應該有可用的 AI SEO 生成功能。」

Jordan：「好，三週我可以接受。但如果拖到一個月，我要來申訴。」

---

Alex（整合第一輪分歧）：「好，讓我整合一下。目前的共識是：一、T-015 設計文件和 Sentry 監控並行推進，不互卡；二、Phase 1 建在 T-015 之上，Taylor 三天內定案，然後進入實作；三、Phase 2 的 analyzeArticle TypeScript 介面可以和 Phase 1 平行設計，但實作等 Phase 1 穩定；四、Lisa 的推廣素材在 Phase 1 開發期間並行準備，功能穩定後立即發布。還有沒有其他分歧？」

---

### 第三輪：Phase 2 時程與 Sprint 4 預期（2026-02-27）

Alex：「再確認一件事——Phase 2 的技術介面（analyzeArticle 函式的 TypeScript 定義）要在 Sprint 3 內完成嗎？」

Taylor：「應該要。topic-016 定義的介面已經很清楚了，把 AnalysisSuggestion、ArticleAnalysisResult 這些型別落地到程式碼，並不複雜，但如果等到 Sprint 4 才做，Sprint 4 的實作就會在沒有型別約束的情況下啟動，增加重構風險。我建議 Sprint 3 期間完成 TypeScript 介面定義，Sprint 4 才是實作。」

Sam：「Phase 2 的一次 API 呼叫策略，token 消耗評估我也可以在 Sprint 3 期間做，不影響主線開發，只是跑幾個 Prompt 測試，一到兩天的事。這樣 Sprint 4 啟動時，token 成本就有依據，不是盲目設計。」

Lisa：「Phase 2 什麼時候推廣的問題——我建議等 Phase 2 功能完成後，統一做一波『AI 文章助手 2.0』的行銷，把 Phase 1（SEO 生成）和 Phase 2（文章建議）打包在同一個故事裡，這樣的傳播效果比分兩次推廣更好。Sprint 4 完成後，我要有完整的 AI Panel 功能截圖和演示。」

Jordan：「聽起來我在 Sprint 4 結束的時候，AI Panel 會有兩個真的可用的 Section——SEO 助手和文章建議？如果是這樣的話，我對 Phase 3 的寫作助手就不急了，這兩個先給我就夠了。」

Alex：「好，Jordan 說的是合理的產品階段。Phase 3 寫作助手作為 Placeholder 是正確的——它的複雜度最高，Streaming 輸出架構需要獨立評估，不應該在 Sprint 3/4 就開始實作。讓我來整理最終的功能走向。」

---

## 觀點總結

| 角色 | 立場 | 核心論點 |
|------|------|---------|
| PM (Alex) | ✅ AI Phase 1 優先 | Sprint 3 = Phase 1，Phase 2 介面並行，實作在 Sprint 4 |
| Marketing (Lisa) | ✅ AI Phase 1 優先 | 差異化賣點，需要 demo 素材，Phase 1+2 打包行銷 |
| User (Jordan) | ✅ AI Phase 1 優先 | 高頻需求（每篇文章），三週時程可接受 |
| Ops (Sam) | ⚠️ 條件支持 | Sentry 和 T-015 先到位，Phase 1 和 Phase 2 不同時實作 |
| CTO (Taylor) | ✅ 架構優先 | T-015 先定案（三天），Phase 2 介面 Sprint 3 完成，實作 Sprint 4 |

---

## 共識與分歧

### 共識點

1. Sprint 3 主線：AI Phase 1（SEO 生成功能），全文搜尋完成後立即啟動
2. T-015 技術設計文件（IAIProvider + Claude Adapter）是 Phase 1 的前置條件，三天內完成
3. Sentry 監控必須在 Phase 1 上線前到位
4. Phase 2 TypeScript 介面在 Sprint 3 設計完成，Sprint 4 才進入實作主線
5. Phase 2 token 消耗評估在 Sprint 3 期間完成，供 Sprint 4 使用
6. Phase 3 寫作助手維持 Placeholder，不在 Sprint 3/4 實作
7. Lisa 的推廣素材在 Phase 1 開發期間同步準備，Phase 1+2 合併行銷

### 主要分歧（已收斂）

- **Sam vs Lisa（快推廣 vs 先穩定）**：Sentry 和 T-015 並行推進，不阻擋行銷準備。Lisa 可在開發期間預備文案和截圖規劃。
- **Jordan vs Taylor（快用 vs 先設計）**：T-015 三天內完成，不造成顯著延遲，Jordan 接受三週時程。

---

## ✅ Action Items 摘要

| # | 行動項目 | 負責人 | 優先級 |
|---|---------|-------|-------|
| 1 | 完成 T-015 技術設計文件（IAIProvider 介面、Claude Adapter 設計） | Taylor + Sam | P0 |
| 2 | 設定 Sentry 錯誤追蹤（API 失敗、timeout、Key 驗證） | Sam | P0 |
| 3 | 實作 IAIProvider 介面和 Claude Adapter | Taylor | P1 |
| 4 | 實作 AI Phase 1 SEO 生成功能（Slug / Meta Description / Keywords） | 技術團隊（Lin + Wei） | P1 |
| 5 | 定義 Phase 2 TypeScript 介面（AnalysisSuggestion、ArticleAnalysisResult） | Taylor | P1 |
| 6 | 評估 Phase 2 一次 API 呼叫的 Prompt 設計與 token 消耗 | Sam | P2 |
| 7 | 準備 Phase 1 推廣素材（文案規劃、截圖計畫、Product Hunt 草稿） | Lisa | P2 |
| 8 | CM6 Adapter 文件（AI-05）補齊 | Taylor | P3 |
