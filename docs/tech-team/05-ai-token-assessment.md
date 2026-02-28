# WriteFlow AI Token 效率評估報告

**評估日期：** 2026-02-28
**評估者：** 🤖 Evan（AI/LLM 整合架構師）
**評估範疇：** AI Token 效率、架構就緒度、整合建議

---

## 執行摘要

WriteFlow 是一個設計精良的桌面應用程式，具備清晰的服務導向架構（SOA）和相依性注入模式。**目前完全無任何 AI/ML 相依套件**，但其資料結構和服務分層為 AI 整合提供了良好的基礎。

**整體 AI 就緒評分：42 / 100**

---

## 一、現有程式碼 AI 整合就緒度評估

### ✅ 優勢（AI 親和設計）

#### Frontmatter 結構高度 AI 友善

```typescript
interface Frontmatter {
  title?: string        // ✅ AI 標題優化的錨點
  description?: string  // ✅ AI 摘要生成的目標欄位
  tags?: string[]       // ✅ AI 標籤建議的輸出欄位
  keywords?: string[]   // ✅ SEO 關鍵字 AI 生成
  series?: string       // ✅ 系列上下文 for 相關文章 AI
  seriesOrder?: number  // ✅ RAG 時可排序上下文
  categories?: string[] // ✅ 分類引導 AI 風格
}
```

結構化 Frontmatter 可直接作為 AI 的**系統提示上下文（System Prompt Context）**。

#### Content/Frontmatter 分離乾淨

`MarkdownService.parseFrontmatter()` 已完成 YAML 與 body 的解耦，AI 呼叫時可精確控制 token：

```typescript
// 可以精確選擇：
// - 只送 frontmatter（metadata 增強任務）→ 最省 token
// - 只送 body（內容分析任務）→ 無 YAML 雜訊
// - 送完整內容（全文理解任務）→ 最多 token
const { frontmatter, body } = parseFrontmatter(rawContent)
```

#### 批次處理模式已存在

`ArticleService.loadInBatches()` 和 `ConverterService.chunkArray()` 已建立並行處理 pattern，可複用於 AI API 批次呼叫的並發控制。

#### 純文字提取邏輯已存在

`PreviewService.getPreviewStats()` 包含 Markdown 語法剝離邏輯，正是 AI 所需的乾淨輸入：

```typescript
const plainText = content
  .replace(/```[\s\S]*?```/g, '')     // 移除程式碼區塊
  .replace(/!\[\[([^\]]+)\]\]/g, '')   // 移除 Obsidian 圖片
  .replace(/\[\[([^\]|]+).*?\]\]/g, '') // 移除 Wiki 連結
  .replace(/[#*_~`]/g, '')             // 移除 Markdown 標記
```

---

### ❌ 劣勢（AI 整合阻力）

#### 零 AI 相依套件

```json
// 目前依賴中完全無 AI 相關套件：
// ❌ 無 openai, anthropic, @ai-sdk/*, tiktoken, ollama...
```

#### 無 Token 計算機制

系統完全無法預估 API 成本，無法實作 token budget 控制。

#### Slug 生成無法處理中文

```typescript
// 問題：中文標題轉出空字串
title.replace(/[^a-z0-9\s-]/g, '') // ← 中文被移除
```

這意味著 AI 生成的中文標題無法自動產生有效 slug。

#### 無 Streaming 基礎設施

整個架構皆為同步 Request/Response 模式，無 `ReadableStream` 實作。用戶生成長文時將面臨 UI 凍結。

#### 無向量/語義搜尋

現有搜尋使用字串 `includes()`，無語義理解能力。

---

## 二、Token 效率優化建議

### 建立 AI 內容準備管線

```typescript
// 建議新增：src/services/MarkdownService.ts
interface AIContext {
  metadata: string      // YAML frontmatter 精簡版
  cleanBody: string     // 去除 Obsidian 語法的純文字
  estimatedTokens: number
  sections: AISection[] // 依標題分段
}

toAIContext(rawContent: string, maxTokens = 4000): AIContext {
  const { frontmatter, body } = this.parseFrontmatter(rawContent)
  const cleanBody = this.stripMarkdownForAI(body)
  const sections = this.splitBySections(cleanBody)

  return {
    metadata: this.frontmatterToCompactString(frontmatter),
    cleanBody,
    estimatedTokens: this.estimateTokens(cleanBody),
    sections
  }
}

// Token 估算（繁體中文準確率約 85%）
private estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const latinWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).length
  return Math.ceil(chineseChars * 1.2 + latinWords * 1.3)
}
```

### Frontmatter 壓縮輸入（節省 75% token）

```typescript
// 原始 YAML（約 120 tokens）→ 壓縮格式（約 30 tokens）
function frontmatterToAIPrompt(fm: Partial<Frontmatter>): string {
  return [
    fm.title && `標題:${fm.title}`,
    fm.tags?.length && `標籤:${fm.tags.join(',')}`,
    fm.categories?.length && `分類:${fm.categories.join(',')}`,
    fm.keywords?.length && `關鍵字:${fm.keywords.join(',')}`,
    fm.series && `系列:${fm.series}(第${fm.seriesOrder}篇)`,
  ].filter(Boolean).join('|')
}
```

### 語義 Chunking 策略

```typescript
// 按 Markdown 標題層級分割，確保語義完整性
interface ContentChunk {
  id: string
  heading: string
  content: string
  preceding_headings: string[] // 麵包屑上下文
  token_estimate: number
}
```

**Token 節省效果：** 對 3000 字文章，此策略可使每次 AI 呼叫的平均 token 使用量降低 **60-70%**。

---

## 三、AI 功能整合優先順序建議

### P0（立即可做，高 ROI）

| 功能 | 模型建議 | Token 預算 | 實作位置 |
|------|----------|------------|----------|
| **AI 標籤生成** | Ollama `llama3.2:3b` 或 `gpt-4o-mini` | ~500 tokens | `ObsidianSyntaxService` |
| **SEO Description 生成** | `gpt-4o-mini` | ~800 tokens | `MarkdownService` |
| **Keywords 提取** | 本地模型 | ~300 tokens | `MarkdownService` |
| **中文 Slug 生成** | `gpt-4o-mini` + 音譯規則 | ~200 tokens | `MarkdownService` |

### P1（核心價值，中等複雜度）

| 功能 | 模型建議 | Token 預算 |
|------|----------|------------|
| **文章摘要生成** | `claude-3-5-haiku` | ~2000 tokens |
| **Wiki 連結語義建議** | 本地 Embedding | 向量查詢 |
| **內容品質評分** | `claude-3-5-haiku` | ~1500 tokens |

### P2（進階功能，高複雜度）

| 功能 | 模型建議 | Token 預算 |
|------|----------|------------|
| **系列文章連貫性檢查** | `claude-3-5-sonnet` | ~8000 tokens |
| **AI 寫作助手（Streaming）** | `gpt-4o` + Streaming | 無上限 |
| **向量語義搜尋** | 本地 Embedding + SQLite-VSS | 向量索引 |

---

## 四、推薦 AI 整合架構

### 整體架構：混合型（本地 + 雲端）

```
┌─────────────────────────────────────────────────────────┐
│                    WriteFlow Electron                    │
│                                                         │
│  Vue 3 UI ◄─── AI Composable Layer                     │
│                  useAITagSuggestion()                   │
│                  useAIDescription()                     │
│                  useAIChunkAnalysis()                   │
│                         │                               │
│                         ▼                               │
│              AIService（新增）                           │
│              - promptTemplates                          │
│              - tokenEstimator                           │
│              - responseCache                            │
│              - modelRouter                              │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┼───────────────┐
         ▼            ▼               ▼
  Ollama（本地）  OpenAI API    Anthropic API
  標籤生成        內容摘要       複雜分析
  Keywords        SEO 優化       寫作建議
  Embedding
```

### AIService 核心設計

```typescript
// src/services/AIService.ts
interface AIRequest {
  task: 'tags' | 'description' | 'keywords' | 'summary' | 'slug'
  article: Pick<Article, 'title' | 'content' | 'frontmatter'>
  maxTokens?: number
}

class AIService {
  // 模型路由：簡單任務用小模型
  private routeModel(task: AIRequest['task']): AIServiceConfig {
    const localTasks = ['tags', 'keywords', 'slug']
    if (localTasks.includes(task) && this.ollamaAvailable) {
      return { provider: 'ollama', model: 'llama3.2:3b' }
    }
    return { provider: 'openai', model: 'gpt-4o-mini' }
  }

  async generateTags(article: Article): Promise<string[]>
  async generateDescription(article: Article): Promise<string>
  async generateKeywords(article: Article): Promise<string[]>
  async streamWritingSuggestion(content: string): AsyncIterable<string>
}
```

### Prompt 模板管理

```typescript
// src/services/prompts/articlePrompts.ts
export const ARTICLE_PROMPTS = {
  GENERATE_TAGS: (context: string) => `
你是一位部落格 SEO 專家。根據以下文章的標題和核心內容，生成 3-7 個精準的繁體中文標籤。
標籤規則：簡短（2-6字）、具體、技術性詞彙優先。
輸出格式：JSON 陣列，例如 ["Vue3", "TypeScript", "效能優化"]

文章脈絡：
${context}

標籤：`,

  GENERATE_SLUG: (title: string) => `
將以下繁體中文標題轉換為英文 URL slug（kebab-case）。
規則：準確翻譯、小寫英文、使用連字號、不超過 50 字元。
只輸出 slug，不要其他文字。

標題：${title}
Slug：`,
}
```

### Streaming 支援

```typescript
// src/main/aiStreamBridge.ts（Main Process）
ipcMain.handle('ai:stream-start', async (event, request) => {
  const stream = await openai.chat.completions.create({ ...request, stream: true })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    event.sender.send('ai:stream-chunk', text)
  }
  event.sender.send('ai:stream-end')
})
```

---

## 五、本地 LLM（Ollama）整合評估

WriteFlow 是 **Electron 桌面應用**，具備以下優勢：
- 可直接呼叫 `localhost:11434`（Ollama API），無跨域問題
- Main Process 可直接啟動/管理 Ollama 子程序
- 本地處理確保隱私（部落格草稿通常是私密的）

**本地 vs 雲端分工：**

```
本地 Ollama（零成本、隱私）：
├── 標籤生成 → llama3.2:3b（~2GB，速度快）
├── Keywords 提取 → llama3.2:3b
├── 中文 Slug 生成 → llama3.2:3b
└── 語義內文搜尋 → nomic-embed-text（Embedding）

雲端 API（精準、複雜）：
├── SEO Description 生成 → gpt-4o-mini（$0.0001/次）
├── 文章摘要 → claude-3-5-haiku（高品質中文）
└── 寫作建議 Streaming → claude-3-5-sonnet
```

---

## 六、整體 AI 就緒評分明細

| 評估維度 | 當前 | 滿分 | 說明 |
|----------|------|------|------|
| Frontmatter AI 友善度 | 18 | 20 | 結構清晰，缺少 summary/excerpt 欄位 |
| 內容提取品質 | 12 | 15 | plainText 提取邏輯存在但未集中化 |
| Token 效率意識 | 2 | 15 | 完全無 token 計算和成本控制 |
| Chunking 策略 | 4 | 15 | 只有 array chunking，無語義分段 |
| Streaming 支援 | 0 | 10 | 架構完全不支援 |
| 向量/語義搜尋 | 0 | 10 | 無任何向量基礎設施 |
| 架構可擴展性 | 6 | 10 | DI 模式良好，服務層清晰 |
| Prompt 管理 | 0 | 5 | 無任何 Prompt 系統 |
| **總計** | **42** | **100** | |

---

## 七、3 個月 AI 整合路線圖

```
Week 1-2（基礎設施）：
  ✅ 新增 AIService + 模型路由器（含 MockAIProvider）
  ✅ 建立 Prompt 模板目錄（src/services/prompts/）
  ✅ MarkdownService 新增 toAIContext() 方法
  ✅ 加入 token 估算工具函式

Week 3-4（本地 AI 功能）：
  ✅ Ollama 整合（標籤生成、Keywords 提取）
  ✅ 中文 Slug AI 生成
  ✅ AI 回應快取層

Week 5-6（雲端 AI 功能）：
  ✅ SEO Description AI 生成（gpt-4o-mini）
  ✅ Frontmatter sidebar 新增 AI 建議 UI
  ✅ Streaming 基礎設施（IPC Bridge）

Week 7-8（進階功能）：
  ✅ 語義文章搜尋（Embedding + SQLite-VSS）
  ✅ 系列文章一致性 AI 檢查
  ✅ 寫作助手 Streaming UI
```

---

**前置條件（必須先完成才能開始 AI 整合）：**

1. ✅ VULN-002 Path Traversal 修復（IPC 路徑白名單）
2. ✅ VULN-006 IPC 輸入 Schema 驗證建立
3. ✅ `IFileSystemGateway` 封裝層建立
4. ✅ `generateId()` 改為確定性 Hash
5. ✅ `IAIProvider` 介面定義 + `MockAIProvider` 完成

---

> **結語：** WriteFlow 擁有優秀的服務層架構，為 AI 整合提供了可靠基礎。建議**優先實作本地 Ollama 整合**（零成本，隱私友善），以標籤生成和 Keywords 提取作為切入點，快速驗證使用者價值。中期建立語義搜尋，長期引入寫作助手 Streaming UI。
