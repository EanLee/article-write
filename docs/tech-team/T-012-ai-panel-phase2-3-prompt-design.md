# T-012 AI Panel Phase 2/3 + 使用者自訂 Prompt 設計

**日期**: 2026-02-17
**負責人**: Sam（Tech Lead）
**狀態**: ✅ 完成

## 任務背景

圓桌 #015 定義了 AI Panel 三個 Section：
- Section 1：SEO 助手 ✅ 已完成
- Section 2：文章建議（品質分析、具體改善建議）
- Section 3：寫作助手（使用者輸入提示，AI 給方向，Streaming）

新增需求：**Prompt 有預設值，使用者可在 AI Panel 中自訂**

## 討論記錄

---

### Section 2：文章建議 介面設計

Sam：「Section 2 要分析文章結構和清晰度，輸出具體可執行的建議，不是打分數——分數沒有可操作性。IAIProvider 擴充一個新方法：

```typescript
export interface ArticleAnalysisInput {
  title: string
  content: string     // 全文傳，不像 SEO 只傳 300 字
  wordCount: number   // 讓 AI 回應時有上下文
}

export interface SuggestionItem {
  section: string       // 「開頭」、「第 X 段」、「整體」
  issue: string         // 問題描述
  suggestion: string    // 具體建議，可直接參考修改
  severity: 'high' | 'medium' | 'low'
}

export interface ArticleAnalysisResult {
  suggestions: SuggestionItem[]
}

// IAIProvider 加入：
analyzeArticleQuality(input: ArticleAnalysisInput): Promise<ArticleAnalysisResult>
```

為什麼不要 overallScore？因為使用者最需要『我該改什麼』，不是一個數字。」

Wei：「UI 這樣做：頂部有『分析文章』按鈕，結果出來後上面放灰色背景的 summary，底部用 list 展示每條建議，每條左邊有個小圖示表示 severity，右邊是建議文字。Loading 用 spinner，empty state 文案『點擊分析文章品質』，error 時友善提示。」

---

### Section 3：寫作助手 Streaming 設計

Sam：「Section 3 需要 Streaming，但 ipcMain.handle 是 request-response，不支援。要改用 ipcMain.on + event.sender.send 分批推送 chunk。」

Lin：「我來說怎麼做。不用 handle，改成雙向 on 模式。流程是：

1. renderer 送 `ipcRenderer.send('ai:writing-assist:start', { sessionId, prompt, provider })`
2. main 端把 AI stream 綁到 sessionId，每個 chunk 回傳 `event.sender.send('ai:writing-assist:chunk', { sessionId, chunk })`
3. 完成後送 `ai:writing-assist:done`，錯誤送 `ai:writing-assist:error`

Session ID 一定要有——renderer 自己產生 UUID，main 端用 `Map<sessionId, AbortController>` 維護活躍 session。取消就送 `ai:writing-assist:cancel`，main 找到對應的 AbortController 呼叫 `.abort()`，claude-sdk 和其他 SDK 都有支援 AbortSignal。

preload API：
- 發起：`startWritingAssist(prompt, provider)` → 回傳 sessionId
- 訂閱：`onWritingAssistChunk(cb)`、`onWritingAssistDone(cb)`、`onWritingAssistError(cb)`（各回傳 unsubscribe function）
- 取消：`cancelWritingAssist(sessionId)`

Vue 組件 unmount 時要 cancelWritingAssist + 清理訂閱，不然會 memory leak。」

Wei：「UI 這樣：一個大 textarea，placeholder 是『請輸入寫作方向、想討論的主題，或想讓 AI 給建議的內容』，下面放『獲取建議』和『清除』兩個按鈕。Streaming 輸出放在一個獨立的 div，文字逐字 append（用 `ref<string>` 逐次 append chunk），同時顯示『停止生成』按鈕，使用者可以中途取消。用 `isStreaming ref` 控制按鈕狀態。」

---

### Prompt 自訂 設計

Sam：「Prompt 不是敏感資料，存在 `userData/ai-prompts.json`，明文 JSON。預設 Prompt 寫成常數放在 `src/main/constants/aiPrompts.ts`，版本更新時可以同步升級。ConfigService 加三個方法：

```typescript
getPrompt(feature: 'seo' | 'articleAnalysis' | 'writingAssistant'): string
// 優先回傳 custom，沒有就用 default

setCustomPrompt(feature: string, prompt: string): void
// 寫入 ai-prompts.json

resetPrompt(feature: string): void
// 刪除 custom，回到 default
```」

Alex：「Prompt 編輯器放在 **AI Panel Header 的『設定』按鈕**，點開一個 modal——不要放在 Settings 的 AI tab 裡，那樣太遠；也不要塞在每個 Section 的展開裡，太擠。

UI 三層設計：
1. 編輯器上方放 badge，顯示『使用預設』或黃色的『已自訂』
2. 輸入框下方放淡色的『還原預設值』按鈕
3. 展開式區塊顯示預設值，讓使用者可以對比

文案避免技術詞，不要寫『System Prompt』，改成『AI 行為設定』或『回應風格設定』。引導文案：『自訂 AI 的回應風格。如果不確定要改什麼，保留預設就可以』。

進階：可以提供幾個風格模板（專業、輕鬆、簡潔），使用者選一個模板直接套用，不用從零開始寫 Prompt。」

Lin：「Prompt 的 IPC 要加：

- `ai:get-prompt` — 取得某個 feature 的 prompt（custom 或 default）
- `ai:set-custom-prompt` — 儲存 custom prompt
- `ai:reset-prompt` — 還原預設
- `ai:get-all-prompts` — 一次取得三個 feature 的所有狀態（是否已自訂 + 內容）」

---

### 收斂

Sam：「好，方案敲定：

1. IAIProvider 加 `analyzeArticleQuality`
2. Streaming 用 ipcMain.on + session ID + AbortController 模式
3. Prompt 存 userData/ai-prompts.json，預設在 constants 裡
4. Prompt 編輯 UI 放在 AI Panel Header 的設定按鈕（Alex 方案 C）

Wei 去實作 AIPanelView 的 Section 2 + 3 UI，Lin 做 streaming IPC 和 prompt IPC，Sam 做 IAIProvider 介面擴充和 ClaudeProvider/GeminiProvider/OpenAIProvider 實作。AI Panel Header 設定按鈕 Alex 出 spec，Wei 實作。」

## 設計決策

### 決策 1：Section 2 型別

```typescript
export interface ArticleAnalysisInput {
  title: string
  content: string    // 全文
  wordCount: number
}

export interface SuggestionItem {
  section: string
  issue: string
  suggestion: string
  severity: 'high' | 'medium' | 'low'
}

export interface ArticleAnalysisResult {
  suggestions: SuggestionItem[]
}

// IAIProvider 新增：
analyzeArticleQuality(input: ArticleAnalysisInput): Promise<ArticleAnalysisResult>
```

### 決策 2：Section 3 Streaming IPC

```
Events（main → renderer）：
  ai:writing-assist:chunk   { sessionId, chunk }
  ai:writing-assist:done    { sessionId }
  ai:writing-assist:error   { sessionId, code, message }

Commands（renderer → main）：
  ai:writing-assist:start   { sessionId, prompt, provider? }
  ai:writing-assist:cancel  { sessionId }

Preload API：
  startWritingAssist(prompt, provider?) → sessionId (UUID)
  onWritingAssistChunk(cb) → unsubscribe
  onWritingAssistDone(cb) → unsubscribe
  onWritingAssistError(cb) → unsubscribe
  cancelWritingAssist(sessionId) → void

Main 端：Map<sessionId, AbortController> 維護 active sessions
```

### 決策 3：Prompt 自訂架構

- 儲存：`userData/ai-prompts.json`（明文，非加密）
- 預設：`src/main/constants/aiPrompts.ts` 常數

```typescript
// ConfigService 新增
getPrompt(feature: 'seo' | 'articleAnalysis' | 'writingAssistant'): string
setCustomPrompt(feature: string, prompt: string): void
resetPrompt(feature: string): void
```

IPC handlers：`ai:get-prompt`、`ai:set-custom-prompt`、`ai:reset-prompt`、`ai:get-all-prompts`

### 決策 4：Prompt 編輯 UI

位置：AI Panel Header 右側「設定」按鈕（⚙），點開 Prompt 管理 modal

UI：
- 每個功能一個 textarea
- Badge 顯示「使用預設」/ 黃色「已自訂」
- 淡色「還原預設值」按鈕
- 引導文案避免「System Prompt」等技術詞
- 展開區塊可對比預設值
- （選配）風格模板：專業、輕鬆、簡潔

## 相關檔案

**新增**：
- `src/main/constants/aiPrompts.ts` — 預設 Prompt 常數
- `userData/ai-prompts.json` — 執行時儲存（不進 repo）

**修改**：
- `src/main/services/AIProvider/types.ts` — 新增 Section 2 型別、Section 3 型別
- `src/main/services/AIProvider/ClaudeProvider.ts` — 實作 analyzeArticleQuality + streaming
- `src/main/services/AIProvider/GeminiProvider.ts` — 同上
- `src/main/services/AIProvider/OpenAIProvider.ts` — 同上
- `src/main/services/AIService.ts` — 新增 analyzeArticleQuality() + startWritingAssist()
- `src/main/services/ConfigService.ts` — 新增 Prompt 管理方法
- `src/main/main.ts` — 新增 IPC handlers
- `src/main/preload.ts` — 新增 preload API
- `src/types/electron.d.ts` — 型別定義
- `src/stores/aiPanel.ts` — 新增 Section 2/3 狀態
- `src/components/AIPanelView.vue` — 加入 Section 2/3 UI + Header 設定按鈕

## 相關 Commit

<!-- 實作完成後填入 -->
