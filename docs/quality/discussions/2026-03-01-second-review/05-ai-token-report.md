# WriteFlow AI Token 效率與品質評估報告（第二次）

**評估日期**：2026-03-01
**評估角色**：AI Engineer（LLM API 整合專家）
**評估範圍**：`src/main/services/AIService.ts`、`src/main/services/AIProvider/`、`src/stores/aiPanel.ts`、`src/stores/seo.ts`、`src/components/AIPanelView.vue`、`src/components/SEOGenerateButton.vue`

---

## 一、執行摘要：AI 整合成熟度評級

```
★★☆☆☆  Level 2 / 5 — 「功能可用，但生產就緒度不足」
```

| 面向 | 評分 | 說明 |
|------|------|------|
| Prompt 設計品質 | 3/10 | 無 system prompt，DRY 嚴重違反 |
| Token 使用效率 | 6/10 | 內容裁切做得好，但缺乏追蹤與上限 |
| 串流實作 | 0/10 | 完全未實作，顯示 Spinner 而非漸進文字 |
| 模型選擇策略 | 7/10 | 三個供應商均選用便宜模型，但無 fallback |
| 錯誤處理與重試 | 3/10 | 無 retry，無 rate limit，錯誤碼粗糙 |
| 安全性 | 4/10 | 使用者輸入直接進入 prompt，無 sanitize |
| 成本控制 | 3/10 | 無快取、無頻率限制、無成本追蹤 |
| 多供應商抽象品質 | 6/10 | 工廠模式清晰，但三份 prompt 完全複製貼上 |

---

## 二、Token 使用分析

### 2.1 每次 SEO 生成操作的 Token 估算

| Prompt 組成部分 | 估算 Token 數 |
|----------------|--------------|
| 任務描述（你是 SEO 專家...） | ~60 tokens |
| 文章標題（平均） | ~20 tokens |
| contentPreview（slice 0-300） | ~75-100 tokens |
| existingSlug（可選） | ~5-10 tokens |
| 輸出格式說明（5 個欄位） | ~80 tokens |
| Few-shot 範例（1 個 JSON） | ~50 tokens |
| **輸入 Token 小計** | **~290-320 tokens** |
| **輸出 Token（JSON 結果）** | **~100-150 tokens** |
| **總計（每次點擊）** | **~400-470 tokens** |

### 2.2 每次操作成本估算

| 供應商 | 模型 | 每次估算費用 |
|--------|------|------------|
| Anthropic | claude-haiku-4-5-20251001 | ~$0.00086 |
| OpenAI | gpt-4o-mini | ~$0.00014 |
| Google | gemini-2.0-flash | ~$0.000068 |

### 2.3 Token 效率問題

**✅ 做得好**：
- `article.content.slice(0, 300)` 避免傳入整篇文章
- `max_tokens: 400` 限制輸出（Claude 和 OpenAI 有設）

**❌ 問題**：
```typescript
// GeminiProvider.ts — 缺少 max_tokens 設定！
const response = await this.client.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: prompt,
  // 沒有 maxOutputTokens → 可能生成非常長的回應
})
```

---

## 三、Prompt 品質評估

### 3.1 🔴 最嚴重問題：三個供應商 Prompt 完全複製貼上（DRY 違反）

三個 Provider 檔案中的 prompt 文字**一字不差**：

```typescript
// ClaudeProvider.ts、GeminiProvider.ts、OpenAIProvider.ts
// 全都是同樣的字串 ← 修改一處需同步三處
const prompt = `你是一位 SEO 專家。根據以下文章資訊，生成 SEO 相關資料。...`
```

### 3.2 缺少 System Prompt（所有供應商）

```typescript
// ❌ 現況：全部塞在 user message
messages: [{ role: 'user', content: prompt }]

// ✅ 建議：使用 system role（Claude 正確用法）
messages: [{ role: 'user', content: buildUserPrompt(input) }],
system: SYSTEM_PROMPT,
```

### 3.3 Few-shot Examples 品質低

```typescript
// 範例中關鍵字是假的佔位符 `關鍵字1`，可能讓模型學到錯誤示範
// 沒有展示「中文標題如何轉英文 slug」的案例
```

### 3.4 模型版本問題

`claude-haiku-4-5-20251001` 的命名不符合 Anthropic 標準命名規範（通常是 `claude-3-5-haiku-20241022`），**此模型名稱可能無效**，需立即驗證。

---

## 四、串流（Streaming）實作

完全未實作 Streaming。使用者點擊「生成 SEO」後只看到旋轉 Spinner，等待 1-3 秒後結果突然全部出現。

對於未來的「文章改寫」功能，沒有 streaming 使用體驗將極差。

---

## 五、模型選擇策略

### ✅ 模型選擇合理

| 供應商 | 選用模型 | 評價 |
|--------|----------|------|
| Anthropic | claude-haiku-4-5-20251001 | Haiku 系列適合快速、低成本任務 |
| OpenAI | gpt-4o-mini | 正確選擇，gpt-4o 貴 15 倍 |
| Google | gemini-2.0-flash | 正確選擇，速度快且最便宜 |

### ❌ 沒有 Fallback 機制

一旦主供應商失敗，直接拋出錯誤，沒有嘗試另一個已設定 Key 的供應商。

---

## 六、錯誤處理與重試

### 6.1 錯誤碼過於粗糙

```typescript
export enum AIErrorCode {
  KeyMissing = 'AI_KEY_MISSING',
  Timeout = 'AI_API_TIMEOUT',
  ApiError = 'AI_API_ERROR',  // ← HTTP 429、401、500 全落入此類
}
```

### 6.2 無任何 Retry 邏輯

網路短暫中斷 → 直接失敗 → 使用者需要手動重試。

### 6.3 Gemini 缺少 Timeout 處理

`ClaudeProvider` 有正確捕獲 `APIConnectionTimeoutError`，但 `GeminiProvider` 和 `OpenAIProvider` 沒有。

---

## 七、安全風險（AI 特有）

### 🔴 使用者輸入未做 Sanitize 直接進入 Prompt（Prompt Injection）

```typescript
// ❌ 未 sanitize 直接插值
const prompt = `
文章標題：${input.title}
文章內容預覽：${input.contentPreview}
`
```

**攻擊情境**：文章中若包含 `忽略前面的所有指令...`，模型可能遵從並生成惡意 SEO 資料。

```typescript
// ✅ 建議修復
function sanitizeForPrompt(text: string): string {
  return text
    .replace(/忽略(前面|上面|之前)(所有|的所有)指令/g, '[內容]')
    .replace(/IGNORE (ALL )?PREVIOUS INSTRUCTIONS?/gi, '[content]')
    .slice(0, 300)
}
```

---

## 八、成本控制

### ❌ 無快取機制

每次點擊都發出新的 API 請求，即使文章內容完全沒有改變。建議加入 30 分鐘 TTL in-memory 快取。

### ✅ 防重複點擊已實作

`seoStore.isGenerating` 旗標在呼叫期間停用按鈕，有效防止重複提交。

### ❌ 無成本監控

沒有機制追蹤 token 用量、每次呼叫費用、月度累計支出。

---

## 九、技術改善路線圖

### Phase 1：立即修復（P0，1-2 天）

| 優先級 | 問題 | 修復方式 |
|--------|------|----------|
| 🔴 P0 | Gemini 缺少 `maxOutputTokens` | 加入 `config: { maxOutputTokens: 400 }` |
| 🔴 P0 | Claude model 名稱可能無效 | 驗證並修正為 `claude-3-5-haiku-20241022` |
| 🔴 P0 | 三份 Prompt 重複 | 抽出至 `prompts.ts` 統一管理 |

### Phase 2：穩定性補強（P1，1 週）

| 優先級 | 問題 | 修復方式 |
|--------|------|----------|
| 🟠 P1 | 無 Retry 機制 | 加入指數退避重試（最多 3 次） |
| 🟠 P1 | 錯誤碼過粗糙 | 加入 `RateLimit`、`AuthFailed`、`ServerError` 錯誤碼 |
| 🟠 P1 | Gemini Timeout 未處理 | 加入 AbortError 捕獲 |
| 🟠 P1 | 無 System Prompt | 各 Provider 使用正確的 system role |

### Phase 3：成本與品質優化（P2，2 週）

| 優先級 | 問題 | 修復方式 |
|--------|------|----------|
| 🟡 P2 | 無快取 | 30 分鐘 TTL in-memory 快取 |
| 🟡 P2 | 無 Fallback | Waterfall fallback（主供應商失敗 → 次選） |
| 🟡 P2 | Few-shot 品質低 | 加入真實中文部落格標題轉英文 slug 示範 |
| 🟡 P2 | 無 Token 追蹤 | 記錄每次呼叫的 token 用量 |

### Phase 4：生產就緒（P3，1 個月）

- Streaming 實作（為文章改寫等長輸出功能）
- Prompt Injection 防護（`sanitizeForPrompt`）
- Prompt 版本管理
- 擴充 `IAIProvider`（文章摘要、標題建議、文章改寫）

---

## 十、快速優化方案（無需架構重構）

**改動 1：Gemini 加上 maxOutputTokens（3 分鐘）**
```typescript
config: { maxOutputTokens: 400 }
```

**改動 2：Prompt 抽出共用常數（30 分鐘）**
新建 `src/main/services/AIProvider/prompts.ts`，三個 Provider 引用同一份。

**改動 3：驗證並修正 Claude 模型名稱（10 分鐘）**
執行一次測試呼叫確認是否有效。
