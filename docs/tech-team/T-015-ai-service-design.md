# T-015 AI Service 技術架構設計文件

**日期**: 2026-02-27
**負責人**: Taylor + Sam
**狀態**: ✅ 完成

## 任務背景

本文件旨在讓所有技術成員對 AI Service 架構有共識，並補完「為什麼這樣設計」的決策理由。內容涵蓋：

- Phase 1（SEO 生成）的完整實作架構
- Phase 2（三角度文章品質分析）的介面預留設計
- Phase 3（寫作助手 Streaming）的規劃說明
- API Key 加密儲存機制的選型理由
- Error Code 分類設計的決策背景
- 多 Provider 架構的設計考量

本文件整合了 T-010（AI Service 架構設計）、T-012（AI Panel Phase 2/3 設計）以及 topic-016（三角度分析框架）的決策，作為 AI Service 模組的權威技術參考文件。

---

## IAIProvider 介面設計

AI 功能依複雜度分三個 Phase 遞進推進，介面設計反映此演進路徑。

### Phase 1：SEO 生成（已實作）

SEO 生成是最高優先的 Phase 1 功能，已完整實作。核心介面定義於 `src/main/services/AIProvider/types.ts`：

```typescript
export interface SEOGenerationInput {
  title: string
  contentPreview: string  // 前 300 字
  existingSlug?: string
}

export interface SEOGenerationResult {
  slug: string
  metaDescription: string  // ≤ 160 字
  keywords: string[]       // 5-7 個
}

export interface IAIProvider {
  generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult>
}
```

**為什麼只傳前 300 字而非全文？**

這是 UX 和信任感的決策（出自 T-010 Alex 的分析）：使用者在草稿狀態下，對「文章內容被傳出去」有隱性不安。只傳前 300 字足以讓 AI 理解主題脈絡，同時降低使用者的疑慮。SEO 生成的品質與傳多少字的邊際效益在此場景不顯著。

**`existingSlug` 是選填的**

給 AI 參考現有 Slug，可以讓生成結果風格更一致，也減少覆寫既有 Slug 的衝突機率。如果是新文章則省略。

**`keywords` 限制 5-7 個**

在 ClaudeProvider 實作中透過 `slice(0, 7)` 強制截斷。過多關鍵字對 SEO 無意義，且 UI 用 Tag 樣式展示時版面需要控制。

### Phase 2：文章品質分析（介面預留）

Phase 2 採用 **SEO / 行銷 / 學習者**三角度分析框架（出自 topic-016 圓桌決策）。本 Phase 的介面已完成設計，**尚未實作**。

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

// IAIProvider 待新增方法：
async function analyzeArticle(
  article: Article,
  perspectives: ArticlePerspective[]
): Promise<ArticleAnalysisResult>
```

**為什麼不用 `overallScore`（整體分數）？**

使用者最需要的是「我該改什麼」，而非一個無法直接採取行動的數字。具體建議（`suggestion` 欄位）可以讓使用者直接參考修改，這是 topic-016 全體一致確認的設計方向。

**為什麼分三個角度？**

SEO、行銷、學習者三個角度的需求有高度重疊（例如文章結構、開頭清晰度），整合為一次 API 呼叫（single prompt）可以避免重複計費和延遲。UI 提供三個 checkbox 讓使用者選擇要分析的角度，預設全選。

**`perspectives[]` 參數的設計**

這個設計讓使用者可以選擇只分析特定角度（例如只關心 SEO），同時 API 呼叫只執行需要的部分，不浪費 token。

**`ArticleAnalysisResult` 的欄位為 Optional**

`seo?`、`marketing?`、`learner?` 均為 optional，因為使用者可能只選擇部分角度分析，沒有選擇的角度結果就是 `undefined`。

**注意**：`ArticleAnalysisResult` 與 T-012 中定義的 `ArticleAnalysisResult`（含 `suggestions: SuggestionItem[]`）不同——topic-016 的設計更精細，加入了 `field` 欄位並改用三角度分組結構。最終實作應以 topic-016 的型別定義為準。

### Phase 3：寫作助手（規劃中）

Phase 3 需要 Streaming 架構，與 Phase 1/2 的 request-response 模式不同，尚未實作。

**架構方向（出自 T-012 Lin 的設計）**：

- 改用 `ipcMain.on` + `event.sender.send` 雙向事件模式，而非 `ipcMain.handle`
- 以 `sessionId`（UUID）識別每次 Streaming session
- Main Process 用 `Map<sessionId, AbortController>` 維護 active sessions
- 使用者可以中途取消，透過 `AbortSignal` 通知 AI SDK 停止生成

```
Events（main → renderer）：
  ai:writing-assist:chunk   { sessionId, chunk }
  ai:writing-assist:done    { sessionId }
  ai:writing-assist:error   { sessionId, code, message }

Commands（renderer → main）：
  ai:writing-assist:start   { sessionId, prompt, provider? }
  ai:writing-assist:cancel  { sessionId }
```

**IAIProvider 的 Streaming 介面**尚在評估中，Anthropic SDK、Gemini SDK、OpenAI SDK 的 Streaming API 差異需要統一抽象，複雜度較高，待 Phase 2 完成後再設計。

---

## API Key 加密儲存

### 實作架構

API Key 存放於 Electron `userData` 目錄下的 `ai-keys.json`，透過 `ConfigService` 管理。

```typescript
// src/main/services/ConfigService.ts

setApiKey(provider: 'claude' | 'gemini' | 'openai', key: string): void {
  // 讀取現有 keys
  let keys: Record<string, string> = {}
  try {
    const raw = readFileSync(this.aiKeysPath, 'utf-8')
    keys = JSON.parse(raw)
  } catch {
    // 檔案不存在或解析失敗，使用空物件
  }

  // 加密後轉為 base64 存檔
  if (safeStorage.isEncryptionAvailable()) {
    keys[provider] = safeStorage.encryptString(key).toString('base64')
  } else {
    keys[provider] = Buffer.from(key).toString('base64')
  }
  writeFileSync(this.aiKeysPath, JSON.stringify(keys))
}

getApiKey(provider: 'claude' | 'gemini' | 'openai'): string | null {
  try {
    const raw = readFileSync(this.aiKeysPath, 'utf-8')
    const keys: Record<string, string> = JSON.parse(raw)
    const encoded = keys[provider]
    if (!encoded) { return null }

    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
    } else {
      return Buffer.from(encoded, 'base64').toString('utf-8')
    }
  } catch {
    return null
  }
}

hasApiKey(provider: 'claude' | 'gemini' | 'openai'): boolean {
  return this.getApiKey(provider) !== null
}
```

### 為什麼選 safeStorage 而不是 keytar？

**決策來源**：T-010 Sam 在第二輪討論中的分析。

| 比較項目 | `electron.safeStorage` | `keytar` |
|---------|----------------------|---------|
| 來源 | Electron 內建 | 第三方套件 |
| 安全性 | 使用 OS 加密機制（macOS Keychain、Windows DPAPI、Linux Secret Service） | 直接存取系統密鑰環 |
| 依賴 | 無額外依賴 | 需要 native binding |
| 打包 | 無問題 | 容易踩坑（node-gyp、rebuild） |
| Linux headless | 不適用（WriteFlow 是桌面應用） | headless 環境下 unlock keyring 不穩定 |
| 跨平台一致性 | 高 | 中（平台行為差異較大） |

**結論**：WriteFlow 是桌面應用，不需要面對 headless Linux 環境問題。`electron.safeStorage` 是 Electron 官方推薦的機制，無需 native binding，打包和維護成本顯著低於 `keytar`。

**Fallback 機制**：當 `safeStorage.isEncryptionAvailable()` 回傳 `false`（極少發生，通常是系統金鑰環異常），降級為純 base64 編碼。這不是真正的加密，但確保功能不會完全中斷。未來可考慮在此情況下向使用者顯示警告。

---

## Error Code 分類設計

### 型別定義

```typescript
// src/main/services/AIProvider/types.ts

export enum AIErrorCode {
  KeyMissing = 'AI_KEY_MISSING',
  Timeout    = 'AI_API_TIMEOUT',
  ApiError   = 'AI_API_ERROR',
}

export class AIError extends Error {
  constructor(public code: AIErrorCode, message: string) {
    super(message)
    this.name = 'AIError'
  }
}
```

### 為什麼這樣分類？

**決策來源**：T-010 Lin 在第二輪討論中的提案，目標是讓 Renderer 端的 Fallback UI 能夠針對不同錯誤類型給出不同的提示。

| Error Code | 觸發條件 | 前端 UX 行為 |
|-----------|---------|------------|
| `AI_KEY_MISSING` | API Key 未設定，或指定 Provider 沒有 Key | Toast 提示「請先設定 API Key」，引導到 Settings |
| `AI_API_TIMEOUT` | `Anthropic.APIConnectionTimeoutError` 或網路逾時 | Toast 提示「請求逾時，請稍後再試」，按鈕恢復可重試 |
| `AI_API_ERROR` | JSON 解析失敗、欄位不完整、其他 API 異常 | Toast 提示錯誤訊息，保留既有欄位內容 |

**為什麼不用 HTTP Status Code？**

HTTP 狀態碼對終端使用者沒有意義（使用者看到 429 不知道是配額超限）。語意化的 Error Code 讓前端可以直接對應 UX 文案，也讓 Sentry 監控時的 tag 有明確的語意。

**Sentry 整合**：AIService 在捕捉到 `AIError` 時，會將 `code` 作為 Sentry tag 上報，方便監控特定錯誤類型的頻率。

```typescript
// src/main/services/AIService.ts
Sentry.captureException(e, { tags: { ai_error_code: e.code } })
```

---

## Fallback 機制

AIService 有兩層 Fallback 設計：

### 層一：Provider 自動切換

當使用者沒有指定 Provider，`resolveProvider()` 依優先順序自動選擇有設定 API Key 的 Provider：

```typescript
// src/main/services/AIService.ts

resolveProvider(): AIProviderName | null {
  if (this.configService.hasApiKey('claude'))  { return 'claude'  }
  if (this.configService.hasApiKey('gemini'))  { return 'gemini'  }
  if (this.configService.hasApiKey('openai'))  { return 'openai'  }
  return null
}
```

優先順序為 **Claude → Gemini → OpenAI**，反映 WriteFlow 的主要整合對象（ClaudeProvider 是最先實作的，功能驗證最完整）。

若三個 Provider 都沒有設定 Key，回傳 `null`，上層拋出 `AI_KEY_MISSING` 錯誤。

### 層二：UI 層 Fallback

前端 SEO 生成流程的三種狀態：

1. **生成中**：按鈕顯示 spinner，禁用點擊
2. **成功**：slug、metaDescription、keywords 欄位自動填入
3. **失敗**：Toast 顯示錯誤訊息 + 按鈕恢復可重試，**既有欄位內容保留不被覆寫**

Fallback 設計的核心原則是「不中斷工作流」——API 失敗不應導致使用者的手動編輯內容消失。

---

## 多 Provider 架構（AIProviderFactory）

### Factory 實作

```typescript
// src/main/services/AIProvider/AIProviderFactory.ts

export type AIProviderName = 'claude' | 'gemini' | 'openai'

export class AIProviderFactory {
  static create(provider: AIProviderName, apiKey: string): IAIProvider {
    switch (provider) {
      case 'claude': return new ClaudeProvider(apiKey)
      case 'gemini': return new GeminiProvider(apiKey)
      case 'openai': return new OpenAIProvider(apiKey)
    }
  }
}
```

### 目錄結構

```
src/main/services/
  AIProvider/
    types.ts              # IAIProvider 介面、Input/Result 型別、AIErrorCode
    ClaudeProvider.ts     # Anthropic claude-haiku 實作
    GeminiProvider.ts     # Google Gemini 實作
    OpenAIProvider.ts     # OpenAI 實作
    AIProviderFactory.ts  # Factory，依 provider name 建立對應實例
    index.ts              # 統一匯出
  AIService.ts            # 服務層，整合 ConfigService + AIProviderFactory
  ConfigService.ts        # API Key 加密存取、應用設定管理
```

### 為什麼支援三個 Provider？

**決策背景**：Phase 1 初期只有 `ClaudeProvider`。隨後在 T-010 和 T-012 討論中逐步引入 Gemini 和 OpenAI 的支援，原因如下：

1. **降低使用門檻**：不是每個使用者都有 Claude API Key。WriteFlow 以「BYOK（Bring Your Own Key）」策略運作，允許使用者使用自己已有的 API Key，不限定單一廠商。

2. **風險分散**：單一 Provider 的 API 服務中斷或限流時，使用者可以切換到其他 Provider 繼續使用功能。

3. **IAIProvider 介面的設計紅利**：因為所有 Provider 都實作相同的 `IAIProvider` 介面，AIService 不需要關心底層是哪個廠商的 API，新增 Provider 只需要新增一個實作類別和 Factory 的 case，不影響上層邏輯。

4. **測試友善**：Mock `IAIProvider` 即可測試 AIService 的邏輯，不需要真實的 API Key 或網路連線。

### ClaudeProvider 的模型選擇

目前使用 `claude-haiku-4-5-20251001`。選 Haiku 而非 Sonnet/Opus 的理由：

- SEO 生成是相對簡單的結構化輸出任務，不需要頂級模型的推理能力
- Haiku 回應速度更快（使用者等待時間短）
- Token 成本顯著低於 Sonnet（SEO 生成不涉及長文，但頻繁使用場景下成本積累明顯）

---

## 相關檔案

**已實作**：
- `src/main/services/AIProvider/types.ts` — 型別定義
- `src/main/services/AIProvider/ClaudeProvider.ts` — Claude 實作
- `src/main/services/AIProvider/GeminiProvider.ts` — Gemini 實作
- `src/main/services/AIProvider/OpenAIProvider.ts` — OpenAI 實作
- `src/main/services/AIProvider/AIProviderFactory.ts` — Factory
- `src/main/services/AIProvider/index.ts` — 統一匯出
- `src/main/services/AIService.ts` — 服務層
- `src/main/services/ConfigService.ts` — API Key 加密存取

**Phase 2 待實作**（介面已設計）：
- `src/main/services/AIProvider/types.ts` — 新增 `AnalysisSuggestion`、`ArticleAnalysisResult`、`ArticlePerspective`
- `src/main/services/AIService.ts` — 新增 `analyzeArticle()` 方法
- 各 Provider 實作 `analyzeArticle()`

**Phase 3 待規劃**：
- Streaming IPC 架構（需評估後再實作）

---

## 相關 Commit

- `5de552e`: feat(service): 新增 AIProvider 介面與 ClaudeProvider 實作
- `be9ef83`: feat(service): 擴充 ConfigService API Key 加密儲存及 IPC handlers
- `0f2f4a7`: feat(service): 新增 Gemini Provider 支援，AI 服務可選 Claude 或 Gemini
- `9c14b0f`: feat(service): 新增 OpenAI Provider 支援並抽出 AIProviderFactory
- `a090c7b`: feat(service): 在 AIService 加入 Sentry 錯誤上報

---

## 延伸閱讀

- [T-010 AI Service 架構設計](./T-010-ai-service-architecture.md) — 原始設計討論與決策記錄
- [T-012 AI Panel Phase 2/3 設計](./T-012-ai-panel-phase2-3-prompt-design.md) — Phase 2/3 介面與 Streaming 架構設計
- [topic-016 三角度分析框架決策](../roundtable-discussions/topic-016-2026-02-27-blog-content-analysis/decision.md) — SEO / 行銷 / 學習者三角度的 TypeScript 型別設計
