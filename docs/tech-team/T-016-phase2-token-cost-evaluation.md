# T-016 Phase 2 三角度分析 Token 消耗評估

**日期**: 2026-02-27
**負責人**: Lin
**狀態**: ✅ 完成

## 任務背景

topic-016 圓桌決策確認 Phase 2「文章建議」功能採用 SEO / 行銷 / 學習者三角度框架，並明確要求「一次 API 呼叫，AI 同時分析三個角度」（Sam 的條件支持前提）。

在進入 Sprint 3 規劃前，Sam（Ops）負責評估此設計的 token 消耗是否可接受，以作為模型選型和成本預算的決策依據。

本文件為估算報告，不涉及實際 API 呼叫，基於：
- 三角度 Checklist 定義（decision.md 內容）
- Phase 2 介面設計（T-015 中的 `AnalysisSuggestion` 型別）
- Claude 官方定價（2026 年）

---

## Prompt 架構設計

### System Prompt（含三角度 Checklist 定義）

```
You are an expert content analyst for blog articles. Analyze the provided article from three perspectives: SEO, Marketing, and Learner experience.

For each perspective, return a JSON array of suggestions. Each suggestion must follow this structure:
{
  "priority": "high" | "medium" | "low",
  "field": "<the specific element being evaluated>",
  "issue": "<concise description of the problem found>",
  "suggestion": "<specific, actionable improvement recommendation>"
}

## SEO Perspective Checklist
Evaluate the following (check only what is applicable based on article content):
- HIGH: Slug contains keywords and is concise
- HIGH: Meta Description is 120-160 characters and includes a CTA
- HIGH: H1 is unique (only one H1 in the article)
- MEDIUM: H2/H3 structure has logical hierarchy
- MEDIUM: Article contains at least 1-2 internal links
- MEDIUM: Article length is 700+ words
- LOW: All images have Alt Text
- LOW: `lastmod` date reflects the latest modification

## Marketing Perspective Checklist
Evaluate the following:
- HIGH: First 100 words contain a Hook (explains what problem this article solves)
- HIGH: Article ends with a CTA (subscribe, comment, or read more)
- MEDIUM: Title includes a number, benefit statement, or question
- MEDIUM: Tone is consistent throughout the article
- MEDIUM: Article contains a quotable insight or shareable statement
- LOW: Visual rhythm with subheadings and bullet points

## Learner Perspective Checklist
Evaluate the following:
- HIGH: Opening section states learning objectives
- HIGH: Technical articles include executable code examples
- MEDIUM: Target audience and prerequisites are stated
- MEDIUM: Articles over 1000 words include a Table of Contents
- MEDIUM: First-time technical terms are explained
- LOW: Long articles include a TL;DR summary
- LOW: `pubDate` and `lastmod` are present and up to date

## Output Format
Return a JSON object with three keys. Only include keys for perspectives that were requested:
{
  "seo": [ /* AnalysisSuggestion[] */ ],
  "marketing": [ /* AnalysisSuggestion[] */ ],
  "learner": [ /* AnalysisSuggestion[] */ ]
}

Return ONLY valid JSON. Do not include any explanation text outside the JSON object.
```

### User Prompt 模板

```
Analyze the following article. Perspectives to analyze: {{perspectives}}

Title: {{article.title}}
Word count: {{article.wordCount}}
Frontmatter:
- slug: {{article.slug}}
- description: {{article.description}}
- keywords: {{article.keywords}}
- pubDate: {{article.pubDate}}
- lastmod: {{article.lastmod}}

Article content:
{{article.content}}
```

### 預期輸出格式

```json
{
  "seo": [
    {
      "priority": "high",
      "field": "slug",
      "issue": "Slug 目前是 'post-2024-01'，不含關鍵字",
      "suggestion": "建議改為 'vue3-composables-guide' 以提升搜尋可見性"
    },
    {
      "priority": "medium",
      "field": "internal-links",
      "issue": "文章未連結到任何其他文章",
      "suggestion": "建議加入 2 個相關文章的內部連結"
    }
  ],
  "marketing": [
    {
      "priority": "high",
      "field": "opening-hook",
      "issue": "開頭直接進入技術細節，缺乏 Hook",
      "suggestion": "建議前 100 字說明讀者能解決的具體問題"
    }
  ],
  "learner": [
    {
      "priority": "high",
      "field": "learning-objectives",
      "issue": "文章沒有學習目標聲明",
      "suggestion": "建議在第一段後加上：『讀完本文，你將能夠...』"
    },
    {
      "priority": "high",
      "field": "code-examples",
      "issue": "說明了概念但缺少可執行的程式碼範例",
      "suggestion": "建議加入至少一個可複製貼上的程式碼片段"
    }
  ]
}
```

---

## Token 消耗估算

### 計算基準

- 英文 token 換算：1 token ≈ 4 個字元（英文），1 個中文字 ≈ 1-2 token
- 此評估以英文 Prompt + 中英混合文章內容為計算基準
- 每個中文字按 1.5 token 估算（保守值）

### 輸入 Token

#### System Prompt 估算

System Prompt 包含 Checklist 定義、格式說明與輸出指示，全文約 600 英文字，估算如下：

| 部分 | 字數估算 | Token 估算 |
|------|---------|-----------|
| 角色設定與任務說明 | ~50 字 | ~65 |
| SEO Checklist（8 項 × 25 字） | ~200 字 | ~260 |
| 行銷 Checklist（6 項 × 20 字） | ~120 字 | ~155 |
| 學習者 Checklist（7 項 × 22 字） | ~154 字 | ~200 |
| 輸出格式說明與 JSON schema | ~120 字 | ~155 |
| **System Prompt 合計** | **~644 字** | **~835** |

#### User Prompt 估算

| 部分 | Token 估算 |
|------|-----------|
| Prompt 框架文字（模板固定部分） | ~30 |
| 文章標題（平均 10 個字） | ~15 |
| Frontmatter 欄位（slug + description + keywords + 日期） | ~60 |
| **500 字文章內容**（500 字 × 1.5 token/字） | ~750 |
| **1000 字文章內容**（1000 字 × 1.5 token/字） | ~1,500 |
| **2000 字文章內容**（2000 字 × 1.5 token/字） | ~3,000 |

#### 輸入 Token 合計

| 情境 | System Prompt | User Prompt | 合計 |
|------|--------------|------------|------|
| 500 字文章（三角度全選） | ~835 | ~855 | **~1,690** |
| 1000 字文章（三角度全選） | ~835 | ~1,605 | **~2,440** |
| 2000 字文章（三角度全選） | ~835 | ~3,105 | **~3,940** |
| 500 字文章（僅 SEO） | ~835 | ~855 | **~1,690** |

> 注意：僅選擇單一角度時，System Prompt token 數不變（仍需傳送完整 Checklist），但輸出 token 會減少。優化空間在於動態裁切 System Prompt，僅包含所選角度的 Checklist，可節省約 40-50% 的 System Prompt token（約 350-420 token）。

### 輸出 Token

每條建議的 JSON 結構估算（4 個欄位）：
- `priority` 欄位：~5 token
- `field` 欄位（短識別符）：~8 token
- `issue` 欄位（問題描述，20-30 字）：~35 token
- `suggestion` 欄位（具體建議，25-40 字）：~45 token
- JSON 格式符號（括號、引號、逗號）：~10 token
- 每條建議合計：**~103 token**（取整數 ~100 token）

| 角度 | 建議數（估算） | 每條 Token | 小計 |
|------|--------------|-----------|------|
| SEO | 6-8 條 | ~100 | ~700 |
| 行銷 | 5-6 條 | ~100 | ~550 |
| 學習者 | 6-7 條 | ~100 | ~650 |
| JSON 外層結構符號 | — | — | ~30 |
| **三角度合計** | **17-21 條** | | **~1,930** |
| 僅 SEO 角度 | 6-8 條 | ~100 | **~730** |
| 僅行銷角度 | 5-6 條 | ~100 | **~580** |
| 僅學習者角度 | 6-7 條 | ~100 | **~680** |

### 成本估算

#### 定價基準（Anthropic 2026 年定價）

| 模型 | Input 費率 | Output 費率 |
|------|-----------|------------|
| claude-haiku-4-5 | $0.80 / MTok | $4.00 / MTok |
| claude-sonnet-4-6 | $3.00 / MTok | $15.00 / MTok |

> MTok = 每百萬 token（Million Tokens）

#### 500 字文章、三角度全選情境

| 模型 | Input Token | Output Token | 總 Token | Input 成本 | Output 成本 | 單次成本 | 30 次/月成本 |
|------|-----------|------------|---------|-----------|------------|---------|------------|
| claude-haiku-4-5 | ~1,690 | ~1,930 | ~3,620 | ~$0.00135 | ~$0.00772 | **~$0.0091** | **~$0.27** |
| claude-sonnet-4-6 | ~1,690 | ~1,930 | ~3,620 | ~$0.00507 | ~$0.02895 | **~$0.034** | **~$1.02** |

#### 1000 字文章、三角度全選情境

| 模型 | Input Token | Output Token | 總 Token | Input 成本 | Output 成本 | 單次成本 | 30 次/月成本 |
|------|-----------|------------|---------|-----------|------------|---------|------------|
| claude-haiku-4-5 | ~2,440 | ~1,930 | ~4,370 | ~$0.00195 | ~$0.00772 | **~$0.0097** | **~$0.29** |
| claude-sonnet-4-6 | ~2,440 | ~1,930 | ~4,370 | ~$0.00732 | ~$0.02895 | **~$0.036** | **~$1.09** |

#### 2000 字文章、三角度全選情境

| 模型 | Input Token | Output Token | 總 Token | Input 成本 | Output 成本 | 單次成本 | 30 次/月成本 |
|------|-----------|------------|---------|-----------|------------|---------|------------|
| claude-haiku-4-5 | ~3,940 | ~1,930 | ~5,870 | ~$0.00315 | ~$0.00772 | **~$0.0109** | **~$0.33** |
| claude-sonnet-4-6 | ~3,940 | ~1,930 | ~5,870 | ~$0.01182 | ~$0.02895 | **~$0.041** | **~$1.22** |

#### 僅分析單一角度（以 SEO 為例，500 字文章）

| 模型 | 單次成本 | 30 次/月成本 |
|------|---------|------------|
| claude-haiku-4-5 | ~$0.0046 | **~$0.14** |
| claude-sonnet-4-6 | ~$0.0171 | **~$0.51** |

> 注意：WriteFlow 採 BYOK（Bring Your Own Key）策略，費用由使用者的 API 帳戶承擔，非 WriteFlow 平台成本。上述成本估算主要供使用者評估自身的 API 消耗是否可接受。

---

## 結論與建議

### 1. token 消耗是否可接受？

**結論：可接受**。

三角度全選、500 字文章情境下，單次約消耗 3,620 token，成本對於個人開發者使用者而言極低（Haiku 約 $0.009/次）。即使每日進行 10 次分析，月消耗也不超過 $3（Haiku）或 $10（Sonnet）。對 BYOK 使用者而言，這是完全合理的消耗水準。

### 2. 推薦模型

**Phase 2 預設使用 `claude-haiku-4-5`**，與 Phase 1 SEO 生成保持一致。理由：

- 三角度分析本質是「依照 Checklist 逐項評估並輸出結構化建議」，屬於中等複雜度的結構化輸出任務，Haiku 的能力足以勝任
- Haiku 的回應速度較快，分析三個角度的等待時間對使用者體驗更友善
- 成本比 Sonnet 低約 73%（單次 $0.009 vs $0.034）

**允許使用者升級至 `claude-sonnet-4-6`** 的場景：
- 文章超過 2000 字，需要更強的長文理解能力
- 使用者對建議品質要求較高，願意接受較高費用

### 3. 優化空間

#### 優化方案一：動態裁切 System Prompt（推薦）

當使用者未全選三個角度時，System Prompt 中只包含所選角度的 Checklist，預估可節省 350-420 token（約 42-50% 的 System Prompt）。

實作方式：`buildSystemPrompt(perspectives: ArticlePerspective[])` 依所選角度動態組合 Prompt 字串。

**節省效益**：僅選單一角度時，input token 從 ~1,690 降至 ~1,270，成本節省約 25%。

#### 優化方案二：限制文章傳送字數

類似 Phase 1 SEO 生成「只傳前 300 字」的設計，可考慮對長文設定上限（如：最多傳送前 1500 字）。但此方案會影響分析品質（後半部內容的問題無法被偵測），需要在 Sprint 3 規劃時進行 UX 決策討論。

#### 優化方案三：快取 System Prompt（Prompt Caching）

Anthropic 的 Prompt Caching 功能可對重複的 System Prompt 提供 90% 的 token 折扣（cache hit 情境）。由於 System Prompt 內容固定，此功能適用性高，可在 Phase 2 實作時納入考量。啟用後，System Prompt 的實際費用可從 ~$0.00135 降至 ~$0.000135（Haiku）。

### 4. Sprint 3 規劃建議

| 項目 | 建議 |
|------|------|
| 預設模型 | `claude-haiku-4-5` |
| System Prompt 設計 | 動態裁切（依選取的角度） |
| 文章長度上限 | 暫不限制；2000 字以上再評估 |
| Prompt Caching | 列入 Phase 2 實作項目 |
| 使用者模型選擇 | 在 Settings 提供模型切換選項 |

---

## 相關文件

- [T-015 AI Service 技術架構設計](./T-015-ai-service-design.md)
- [topic-016 三角度分析框架決策](../roundtable-discussions/topic-016-2026-02-27-blog-content-analysis/decision.md)
- [T-012 AI Panel Phase 2/3 設計](./T-012-ai-panel-phase2-3-prompt-design.md)

## 相關 Commit

- 待補充（文件建立後填入）
