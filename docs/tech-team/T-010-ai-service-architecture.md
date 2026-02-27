# T-010 AI Service 技術架構設計

**日期**: 2026-02-16
**負責人**: Taylor + Sam
**狀態**: ✅ 完成

## 任務背景

圓桌會議 #014 決策：在 WriteFlow 內串接 AI API，分兩個 Phase 實施：
- **Phase 1**：SEO 生成（Slug、Meta Description、Keywords）
- **Phase 2**：文章檢視與撰寫建議

本次技術會議目標：設計 AI Service 架構，確定實作方向，讓 Phase 1 可以立即開始。

## 設計決策

### 1. API Key 加密儲存

**決定**：採用 `electron.safeStorage.encryptString()`

**理由**：Electron 內建、跨平台一致、不需要額外 native binding。WriteFlow 為桌面應用，Linux headless keyring 問題不適用。

### 2. IAIProvider Adapter 介面

**決定**：抽象 `IAIProvider` 介面，放在 `src/main/services/AIProvider/`

```typescript
export interface SEOGenerationInput {
  title: string
  content: string       // 只傳前 300 字
  existingSlug?: string
}

export interface SEOGenerationResult {
  slug: string
  metaDescription: string  // ≤ 160 字
  keywords: string[]        // 5-7 個
}

export interface IAIProvider {
  generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult>
  analyzeArticleQuality?(content: string): Promise<QualityAnalysis>  // Phase 2 預留
}
```

**錯誤分類**：`AI_KEY_MISSING` / `AI_API_TIMEOUT` / `AI_API_ERROR`

### 3. API Key 管理

**決定**：Phase 1 只做 BYOK，不提供 Demo Key

**理由**：省掉配額管理複雜度，onboarding 在 Settings 頁面加 Anthropic Console 連結即可。

**ConfigService 擴充**：
- `setApiKey(provider: 'claude', key: string)` — 加密存
- `getApiKey(provider: 'claude')` — 解密取

### 4. 前端 UX 架構

**決定**：
- 「✨ 生成 SEO」按鈕放在 Frontmatter 面板操作列
- 新增 `seoStore`（不污染 articleStore）
- 只傳標題 + 前 300 字給 AI
- Keywords 用 Tag 樣式（可刪除、可手動新增）
- Fallback：API 失敗顯示 Toast + 按鈕恢復可重試，欄位保留既有內容

### 5. 檔案結構

```
src/main/services/
  AIProvider/
    types.ts          # IAIProvider 介面、Input/Result 型別
    ClaudeProvider.ts # Claude API 實作
    index.ts          # 匯出
  AIService.ts        # 呼叫 IAIProvider，處理 error，整合 ConfigService

src/renderer/
  stores/
    seoStore.ts       # 生成狀態管理
  components/
    SEOGenerateButton.vue  # ✨ 生成 SEO 按鈕
```

## 討論記錄

### 第一輪：開場與初步方向（2026-02-16）

Sam：「早上好各位。今天要敲定 AI Service 的技術架構，這直接影響後續開發效率。我先拋出兩個最關心的問題：第一，API Key 加密儲存——用 Electron 的 `safeStorage` 還是搭配系統密鑰環？前者簡單但跨平台一致性問題，後者更安全但 Linux 上支援不穩定。第二，IAIProvider Adapter 層——對「單一 API 層」與「多 Provider 無感切換」的權衡，這會決定 Fallback 的複雜度。」

Lin：「我建議這樣設計介面——

```typescript
// src/main/services/AIProvider/types.ts
export interface SEOGenerationInput {
  title: string
  content: string
  existingSlug?: string
}

export interface SEOGenerationResult {
  slug: string
  metaDescription: string  // ≤ 160 字
  keywords: string[]       // 5-7 個
}

export interface IAIProvider {
  generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult>
  analyzeArticleQuality?(content: string): Promise<QualityAnalysis>  // Phase 2 預留
}
```

API Key 放在現有 ConfigService 的加密儲存，透過 `setProviderKey(provider, key)` 設定。IPC 由 Renderer 傳入未加密的 Key，Main Process 加密後存檔。核心邏輯與 API 層解耦，測試只需 Mock IAIProvider。」

Wei：「SEO 生成放在 **Frontmatter 面板的操作列**，靠近標題和日期，放『✨ 生成 SEO』按鈕。狀態管理新增 `seoStore`，避免 articleStore 複雜化。BYOK 設定放 Settings 頁面專用區域。生成過程用 inline loading，成功後直接更新 Frontmatter 的 slug、description、keywords 欄位。流程最自然，不用切頁。」

Alex（UI/UX）：「從 UX 角度，SEO 生成要『一步完成、立即可用』。Frontmatter 右側放『✨ 生成 SEO』按鈕，點擊後直接填入欄位，不彈窗、不覆寫確認。BYOK 設定用漸進式揭露——第一次使用時按鈕旁出現『⚠ 需要 API Key』氣泡，三步完成配置。API 失敗時，按鈕降級為灰色、保留既有內容，不中斷工作流。Jordan 不需要看文件就能上手。」

---

### 第二輪：API Key 加密方案 & Fallback 機制（2026-02-16）

Sam：「我的傾向是 `electron.safeStorage`。Electron 內建、不需要額外依賴、跨平台行為一致。Linux 上 unlock keyring 的問題只在 headless 環境才會發生，WriteFlow 是桌面應用，不是問題。`keytar` 有 native binding，打包時容易踩坑，直接用 `safeStorage` 降低維護負擔。」

Lin：「同意 `safeStorage`，從 Service 層最好實作——在 ConfigService 加兩個方法：`setApiKey(key)` 加密存、`getApiKey()` 解密取，AIService 只管拿 Key 用。Fallback 方面，`generateSEO` 拋出分類 error code：`AI_KEY_MISSING`、`AI_API_TIMEOUT`、`AI_API_ERROR`——IPC handler 統一捕捉，回傳結構化錯誤給 Renderer，不讓例外直接往上炸。」

Wei：「Fallback UI 三種狀態：生成中（按鈕 spinner）、成功（欄位自動填入）、失敗（Toast 顯示錯誤訊息 + 按鈕恢復可重試）。Demo Key 配額超限時 Toast 直接說『Demo 配額已用完，請填入自己的 API Key』並引導到 Settings。不讓使用者不知道為什麼失敗。」

Alex（UI/UX）：「關於傳多少內容給 AI——建議只傳標題 + 前 300 字。使用者信任感比生成品質更重要，草稿狀態傳全文會讓人不安。Keywords 的呈現用 Tag 樣式，每個 Tag 有 × 可以刪除，也允許手動新增。讓使用者有掌控感，不只是純文字輸出。」


---

### 第三輪：收斂決策（2026-02-16）

Sam：「OK，兩輪下來方向很清楚了。`safeStorage` 確定採用；IAIProvider Adapter 介面照 Lin 的設計，加 error code 分類；傳給 AI 的內容限制標題 + 前 300 字；Keywords 用 Tag UI。還有一個沒討論到的：Demo Key 要不要在 Phase 1 就做？我傾向先不做，讓使用者強制 BYOK，省掉配額管理的複雜度。大家有異議嗎？」

Lin：「Demo Key 同意先不做，省事。但要確保 BYOK onboarding 夠順——第一次沒有 Key 時，要明確告訴使用者去哪裡取得 Claude API Key。Settings 頁面放 Anthropic Console 連結就夠了。」

Wei：「同意。Settings 加一行說明 + 連結搞定。API Key 存好之後，下次開啟應用不需要重新輸入。」

Alex（UI/UX）：「沒問題。Phase 1 就這樣，簡單乾淨。Phase 2 文章建議複雜很多，到時候再討論 UX 流程。」

Sam：「好，決策確認。Lin 先動手寫 IAIProvider 介面和 ConfigService 擴充，Wei 同步設計 Settings BYOK 區塊和 seoStore 骨架，Alex 出 Frontmatter 按鈕 UI 草稿。T-010 設計決策章節已更新。」

---

## 相關檔案

新增：
- `src/main/services/AIProvider/types.ts`
- `src/main/services/AIProvider/ClaudeProvider.ts`
- `src/main/services/AIProvider/index.ts`
- `src/main/services/AIService.ts`
- `src/renderer/stores/seoStore.ts`
- `src/renderer/components/SEOGenerateButton.vue`

修改：
- `src/main/services/ConfigService.ts`（新增 `setApiKey` / `getApiKey`）
- `src/renderer/components/FrontmatterPanel.vue`（新增生成按鈕）
- `src/renderer/views/Settings.vue`（新增 BYOK 設定區塊）

## 相關 Commit

> 待實作後補充
