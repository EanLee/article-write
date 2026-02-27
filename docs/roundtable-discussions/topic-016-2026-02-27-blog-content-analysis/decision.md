# topic-016 決策記錄：部落格文章內容品質分析——SEO / 行銷 / 學習者三角度

> **話題編號**: topic-016
> **決策日期**: 2026-02-27
> **決策類型**: 全體一致
> **相關話題**: [topic-015 AI Panel 設計](../topic-015-2026-02-16-ai-panel-design/)

---

## 決策結果

**最終決定**：

WriteFlow AI Panel Phase 2「文章建議」功能，採用 **SEO / 行銷 / 學習者** 三角度的分析框架，每個角度有明確的 checklist 和優先級標記，AI 輸出具體可行的修改建議（而非抽象評分）。

**決策理由**：

- 三個角度的需求有高度重疊（文章結構、開頭清晰度、內容新鮮度），整合效益高
- 具體建議比抽象分數更能讓寫作者採取行動
- 與 WriteFlow 現有 Frontmatter 欄位（slug、description、keywords、pubDate、lastmod）直接整合
- 補充並確認了 topic-015 對 Phase 2 功能的定義

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| SEO (Casey) | ✅ 支持 | AI 能自動執行 SEO checklist，節省手動審查時間 |
| Marketing (Lisa) | ✅ 支持 | Hook 和 CTA 檢查是行銷最需要的自動化建議 |
| Learner (Morgan) | ✅ 支持 | 學習目標、TOC、程式碼範例的存在性檢查具有實際價值 |
| PM (Alex) | ✅ 支持 | 三角度整合提升 Phase 2 功能的設計清晰度 |
| Ops (Sam) | ✅ 條件支持 | 前提：採用一次 API 呼叫 + 分組建議，而非三次分別呼叫 |
| CTO (Taylor) | ✅ 支持 | `analyzeArticle(perspectives[])` 架構可擴展 |

---

## 三角度 AI 分析 Checklist（核心決策內容）

### 🔍 SEO 角度——搜尋引擎可見性

| 優先級 | 檢查項目 | 具體建議格式範例 |
|--------|---------|----------------|
| 🔴 高 | Slug 是否包含關鍵字且夠簡潔 | 「Slug 目前是 "post-2024-01"，建議改為 "vue3-composables-guide"」 |
| 🔴 高 | Meta Description 長度 120-160 字元且含 CTA | 「Meta Description 僅 60 字，建議延伸至 120 字並加入行動呼籲」 |
| 🔴 高 | H1 是否唯一 | 「文章有 2 個 H1，建議只保留一個作為主標題」 |
| 🟡 中 | H2/H3 結構是否有邏輯層次 | 「第 3 段缺少 H2 標題，建議加上小標提高結構清晰度」 |
| 🟡 中 | 是否有內部連結（至少 1-2 個） | 「文章未連結到任何其他文章，建議加入相關文章連結」 |
| 🟡 中 | 文章長度是否達到 700 字以上 | 「目前 450 字，建議擴充到 700 字以上以提升搜尋排名」 |
| 🟢 低 | 所有圖片是否有 Alt Text | 「第 2 張圖片缺少 Alt Text，建議補上描述性文字」 |
| 🟢 低 | `lastmod` 日期是否反映最新修改 | 「`lastmod` 已超過 6 個月，建議確認內容是否仍然準確」 |

### 📢 行銷角度——讀者吸引與轉換

| 優先級 | 檢查項目 | 具體建議格式範例 |
|--------|---------|----------------|
| 🔴 高 | 前 100 字是否有 Hook | 「開頭直接進入技術細節，建議先說明這篇能幫讀者解決什麼問題」 |
| 🔴 高 | 文章末尾是否有 CTA | 「文章結尾沒有引導讀者採取下一步，建議加上訂閱、留言或閱讀延伸的 CTA」 |
| 🟡 中 | 標題是否包含數字、利益點或疑問句 | 「標題較平白，試試『5 個方法讓你...』或『為什麼...』等吸引點閱的句式」 |
| 🟡 中 | 文章語氣是否前後一致 | 「文章前半用敬語，後半轉為口語，建議統一語氣風格」 |
| 🟡 中 | 是否有可被引用的金句或觀點 | 「文章較平鋪，可考慮加入一句能讓人截圖分享的核心論點」 |
| 🟢 低 | 段落是否有視覺節奏（小標、列點） | 「連續 5 個段落沒有小標，建議加入 H3 或列表提高可掃描性」 |

### 📚 學習者角度——知識傳遞效率

| 優先級 | 檢查項目 | 具體建議格式範例 |
|--------|---------|----------------|
| 🔴 高 | 開頭是否有學習目標聲明 | 「建議在第一段後加上：『讀完本文，你將能夠...』」 |
| 🔴 高 | 技術文章是否有可執行的程式碼範例 | 「文章說明了概念但缺少範例，建議加入可複製貼上的程式碼片段」 |
| 🟡 中 | 是否說明目標讀者和前置知識 | 「建議在開頭加上：『本文適合熟悉 React 基礎的讀者』」 |
| 🟡 中 | 超過 1000 字是否有 TOC | 「文章 1500 字，建議在開頭加入目錄讓讀者快速跳轉」 |
| 🟡 中 | 首次出現的專有名詞是否有解釋 | 「"E-E-A-T" 首次出現未解釋，建議附上全名或簡短說明」 |
| 🟢 低 | 長文是否有 TL;DR 摘要 | 「建議在文章末尾加上 3-5 點的 TL;DR，方便忙碌讀者快速掌握」 |
| 🟢 低 | 是否有明確的 pubDate 和 lastmod | 「`pubDate` 已填寫，建議確保 `lastmod` 在每次修改後更新」 |

---

## 技術架構決策

### `analyzeArticle` 函式設計

```typescript
type ArticlePerspective = 'seo' | 'marketing' | 'learner'

interface AnalysisSuggestion {
  priority: 'high' | 'medium' | 'low'
  field: string         // 問題所在（如 'slug', 'opening-hook', 'code-examples'）
  issue: string         // 問題描述
  suggestion: string    // 具體可行的修改建議
}

interface ArticleAnalysisResult {
  seo?: AnalysisSuggestion[]
  marketing?: AnalysisSuggestion[]
  learner?: AnalysisSuggestion[]
}

// 函式簽名：支援指定要分析的角度
async function analyzeArticle(
  article: Article,
  perspectives: ArticlePerspective[]
): Promise<ArticleAnalysisResult>
```

### API 呼叫策略

- **一次呼叫**：將三個角度合併為一個 Prompt，AI 分段回覆
- **Prompt 結構**：明確指示 AI 分 SEO / 行銷 / 學習者三段，每段獨立輸出 JSON
- **UI**：三個 checkbox 讓使用者選擇分析角度，預設全選

### 優先級顯示

- `🔴 高優先`：影響核心功能，建議立即修改
- `🟡 中優先`：影響品質，建議在發布前修改
- `🟢 低優先`：加分項目，有時間再修改

---

## 行動項目

| # | 任務 | 負責人 | 優先級 | 狀態 |
|---|------|--------|--------|------|
| 1 | 將三角度 checklist 整合進 Phase 2 文章建議功能規格文件 | Alex（PM） | P1 | ⏳ 待開始 |
| 2 | 設計 `analyzeArticle` 函式的 TypeScript 介面與 Prompt 模板 | Taylor（CTO） | P1 | ⏳ 待開始 |
| 3 | 評估一次 API 呼叫的 Prompt 設計與輸出格式，進行 token 消耗測試 | Sam（Ops） | P1 | ⏳ 待開始 |
| 4 | 新增 Casey Lin（SEO）和 Morgan Chen（學習者）角色卡至 CHARACTER_CARDS.md | Alex（PM） | P2 | ✅ 完成 |
| 5 | 實作 AI Panel Phase 2 文章建議 Section（依三角度 checklist） | Wei（Frontend） | P2 | ⏳ 待開始 |

---

## 追蹤

**驗證方式**：使用真實的 WriteFlow 使用者文章（Jordan 的部落格文章）進行 AI 分析測試，確認建議的具體性和準確性

**回顧日期**：Phase 2 功能完成後（預計 2026-03 月中）

---

## 參考討論

- [discussion.md](./discussion.md)
- [topic-015 AI Panel 設計決策](../topic-015-2026-02-16-ai-panel-design/decision.md)
- [CHARACTER_CARDS.md](../CHARACTER_CARDS.md)
