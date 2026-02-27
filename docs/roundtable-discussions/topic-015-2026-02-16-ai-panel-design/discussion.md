# topic-015 AI Panel 設計討論

**議題**：Left sidebar 加入 AI icon 後，右側 AI 操作 Panel 應該放什麼？
**發起日期**：2026-02-16
**發起人**：使用者
**狀態**：✅ 決策完成

---

## 背景

Phase 1 SEO 生成功能已實作完成（SEOGenerateButton 放在 FrontmatterPanel header）。
使用者提出：在 Left Sidebar 加入 AI icon，點擊後展開右側的 AI 操作 Panel。
此 Panel 的內容與功能設計需要討論決策。

---

## 討論記錄

### 第一輪：開場與各方觀點（2026-02-16）

Alex：「好，我來開場。我們今天要討論的是——Left Sidebar 加了 AI icon 之後，右側的 AI Panel 要放什麼。我先把自己的想法拋出來：Phase 1 SEO 生成已經做完，它是獨立、快速、立竿見影的功能。但 AI Panel 這個新入口不能只是把 SEO 生成搬過去，那太浪費了。從 Jobs-to-be-Done 角度，使用者打開 AI Panel 的 job 應該是『讓這篇文章更好、更快發出去』——不只是填 SEO 欄位。」

Jordan：「我每天用 WriteFlow 的流程很簡單——寫完一篇文章，按一下『發布』就完事。現在你們要加 AI Panel，我最想問的是：能不能幫我檢查一下這篇文章有沒有寫爛的地方？我不是說什麼 SEO 分析、字數統計這種花哨的東西啦，我是真的需要有人告訴我『嘿，這個段落邏輯不通』或『這個詞用法有問題』。就像我會給編輯看一遍一樣——但編輯沒空，我就靠 AI。」

Jordan：「還有啊，最煩的是我寫到一半，想不出下一段該怎麼起承轉合，結果要跳出 WriteFlow，開 ChatGPT 另一個視窗，貼過來再貼回去——超麻煩。能不能直接在右側 panel 打個提示，Claude 就幫我想出幾個寫法的方向？不要幫我全寫，就告訴我『你這邊可以從 XXX 角度切入』就夠了。」

Lisa：「好的，我先說實話——AI 功能對我們的差異化有多關鍵。編輯器滿地都是，但能幫使用者『快速產出 SEO 優化文案』的編輯器就不多了。所以 Phase 1 的 SEO 生成對我們來說是金牌功能，不是附加題。我們要把它做成故事、做成推廣點。AI Panel 如果做好，上 Product Hunt 時直接講『一鍵生成 SEO，把時間省給寫作』，這就是我們的 USP。」

Lisa：「第二個期待是——API Key 設定要讓新使用者一點都不害怕。不要複雜的設定流程，Settings 頁面放『取得 API Key』連結，新手點一下就去 Anthropic 官網，複製貼上進來就完成。Jordan 試用時根本不應該為了 API Key 卡住。至於 Phase 2 的文章建議功能——我不急。先把 SEO 生成打磨到完美，收集使用者回饋，再想下一步。」

Sam：「稍等——我有幾個技術面的顧慮要先講清楚。首先，Jordan 說的『文章品質檢查』和『寫作方向建議』，聽起來很好用，但這兩個功能的 token 消耗會比 SEO 生成高很多。SEO 生成只需要標題 + 前 300 字，但品質分析可能需要傳全文，成本和回應時間都會增加。這個不是說不能做，但要先在架構上設計好 loading 狀態和 timeout 機制，不然使用者等半天什麼都不知道，比沒有還糟。」

Sam：「再來是 AI Panel 本身的入口設計——如果只有一個 icon 打開一個 panel，裡面放多個功能，那 panel 的組織方式很重要。我建議按功能模組分區塊，SEO 生成放一個區，品質分析放另一個區，而不是把所有東西都攤在同一個平面上。這樣以後加功能也好擴展。穩定壓倒一切，但架構先設計好也是穩定的一部分。」

Taylor：「從架構角度，我同意 Sam 說的分區塊。我更想聊的是這個 Panel 的定位——它應該是一個『文章上下文感知的 AI 助手』，而不是一個功能清單。每個功能都知道當前正在編輯的是哪篇文章、內容是什麼，不需要使用者複製貼上。我們已經有 IAIProvider Adapter 架構，現在要考慮的是前端的 AI Panel Store 怎麼設計——要能統一管理各功能的 loading、error、result 狀態，而不是每個功能各自為政。」

Taylor：「關於功能優先級，我的看法是：Phase 1 的 SEO 生成保持在 FrontmatterPanel 的按鈕即可，AI Panel 做成 Phase 2 文章建議功能的主戰場。這樣 Panel 的定位更清晰——它是『深度 AI 操作空間』，FrontmatterPanel 的 SEO 按鈕是『快速 SEO 工具』，兩個不衝突。或者，可以在 Panel 裡也放一個 SEO section，讓使用者集中在一個地方管理所有 AI 功能。」

---

### 第二輪：聚焦 Panel 結構與功能邊界

Alex：「聽下來，大家的共識是 AI Panel 要做成功能中樞，而不只是 SEO 的搬家。我想提個具體的 Panel 結構方案——分三個 Section：

**Section 1：SEO 助手**（Phase 1 已有，搬進來整合）
- 一鍵生成 Slug / Meta Description / Keywords
- 顯示目前已有的 SEO 欄位值
- 可以直接在 Panel 裡編輯後套用

**Section 2：文章建議**（Phase 2，目前 Placeholder）
- 品質分析（結構、清晰度）
- 改進建議列表
- 顯示『即將推出』灰色狀態

**Section 3：寫作助手**（Phase 3，Jordan 需求）
- 輸入提示，AI 給寫作方向建議
- Streaming 輸出

這樣 Panel 有路線圖感，使用者看到後兩個 section 也會期待。」

Jordan：「但話說回來，我也不想 panel 出現那種『段落 1：很好，段落 2：需要改進』的機械式評分，那根本沒用。給我真實、直接、可以立刻用的建議就好。如果一個功能用過一次就膩了，那還不如不加。還有——我不想要很多設定，打開 Panel 直接就能用是最重要的。」

Sam：「Alex 的三個 Section 我可以接受，但有一個前提：每個 Section 的 loading、error 狀態要完全獨立。Section 1 在生成 SEO 的時候，Section 2 的按鈕不能跟著 disable 掉。用一個 `aiPanelStore` 統一管理，每個功能有獨立的 `isLoading` 和 `error` 狀態。另外，Phase 2 和 Phase 3 的 Placeholder 不要做成死的，要有明確的文案告訴使用者是『即將推出』還是『需要 API Key』。」

Taylor：「我要補充一點 UX 原則：AI Panel 不應該是一個獨立的工作流，它應該是輔助編輯器的工具——使用者在左邊編輯，右邊的 Panel 提供建議，兩邊是協作關係。所以 Panel 的操作結果要能一鍵套用到文章，不需要手動複製。這個『套用』機制需要 Panel 和 articleStore 有清楚的通訊介面，這也是架構上需要先設計好的。」

---

### 第三輪：收斂決策（2026-02-16）

Alex：「好，我來整理一下。AI Panel 確認三個 Section：SEO 助手（已完成）、文章建議、寫作助手，後兩個先放 Placeholder。每個 Section 狀態獨立，結果可一鍵套用到 articleStore。設定從零開始，打開就能用。

Action Items：
1. Sam／Taylor：定義 Panel 與 articleStore 的通訊介面
2. 實作 Panel 骨架（三 Section + 狀態管理）
3. 文章建議設計實用建議格式（對應 Jordan 的需求）

大家有異議嗎？」

Sam：「好，來確認幾個重點。aiPanelStore 設計上，每個 Section 獨立管理自己的 `loading`、`error`、`result` 狀態，互不干擾。Phase 2 的 placeholder 現在只要 UI 佔位加 `coming-soon` 標記就夠，不用預建 store slice。套用功能優先做 SEO 那塊，其他兩個等 Phase 2 再說。這樣可以嗎？」

Taylor：「好，我來具體定義介面。

\`\`\`typescript
interface AIPanelSectionState<T> {
  isLoading: boolean
  error: string | null
  result: T | null
}

interface AIPanelStore {
  seo: AIPanelSectionState<SEOGenerationResult>
  suggestions: AIPanelSectionState<unknown>  // Phase 2
  writing: AIPanelSectionState<unknown>      // Phase 3
  applyToArticle: (field: keyof ArticleFrontmatter, value: unknown) => void
}
\`\`\`

Panel 透過 `applyToArticle` 直接寫入 articleStore，不需要中間層。SEO section 先實作，其他 section 等 Placeholder 就位再擴充介面。這樣最乾淨。」

