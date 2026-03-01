# 第二次技術評估修正記錄

**建立日期**：2026-03-01
**來源**：技術團隊第二次全面評估
**修正方針**：Bug fix → commit on develop，Refactor → 開 branch merge 回 develop

---

## 修正清單總覽

| # | 類型 | 問題 | 狀態 | Commit/Branch |
|---|------|------|------|--------------|
| 1 | Bug | `MainEditor.vue` computed `allTags.value` 被賦值 | ✅ | `863f625` |
| 2 | Bug | `aiPanel.ts` 呼叫不存在的 `updateArticle` 方法 | ✅ | `863f625` |
| 3 | Bug | Claude model 名稱 `claude-haiku-4-5-20251001` 可能無效 | ✅ | `9f919a4` |
| 4 | Bug | Gemini `generateContent` 缺少 `maxOutputTokens` | ✅ | `bc3a6ea` |
| 5 | Bug | `FileService.ts` catch 吞掉原始 Error cause | ✅ | `0b5ee6f` |
| 6 | Refactor | `ArticleService.generateId()` 非確定性 ID，破壞 Vue key 穩定性 | ✅ | `refactor/stable-article-id` → `547a455` |
| 7 | Refactor | `FileService` 無路徑白名單（CRIT-01 Path Traversal） | ✅ | `refactor/file-service-path-validation` → `5f19c93` |
| 8 | Refactor | `markdown-it html:true` + `v-html` 無 sanitize（CRIT-02 XSS） | ✅ | `refactor/xss-protection` → merge |
| 9 | Refactor | `ipc-channels.ts` 常數從未被 `main.ts`/`preload.ts` 引用 | ✅ | `refactor/ipc-channels-constants` → merge |
| 10 | Refactor | `MainEditor.vue` 重複定義 2 秒 AutoSave timer，與 AutoSaveService 衝突 | ✅ | `refactor/remove-duplicate-autosave` → merge |
| 11 | Refactor | 三個 AI Provider Prompt 完全重複（DRY 違反） | ✅ | `refactor/ai-prompts-extraction` → merge |

---

## 詳細修正說明

### Fix-01：MainEditor.vue computed allTags.value 賦值

**問題分類**：Runtime Bug（Critical）
**發現者**：SOLID 工程師、程式品質工程師
**嚴重程度**：🔴 執行時崩潰

**根本原因**：
Vue 3 的 `computed()` 建立的是**唯讀** ref，無法對 `.value` 進行賦值。
`MainEditor.vue` 第 207 行宣告：`const allTags = computed(() => articleStore.allTags)`
然後在第 556 行 `initializeObsidianSupport` 函式中嘗試：`allTags.value = Array.from(tagSet)`
此行程式碼在執行時會拋出 Vue 警告並觸發 runtime error，導致 Obsidian 支援初始化失敗。

**修正方案**：
`articleStore.allTags` 的 computed 已經從所有文章中彙整 tags，因此 `MainEditor.vue` 中的手動彙整邏輯是完全多餘的死碼。
移除 `initializeObsidianSupport` 中的 `tagSet` 建立與 `allTags.value = ...` 賦值行，改由 `articleStore.allTags` 自動維護。

**影響範圍**：`src/components/MainEditor.vue`

---

### Fix-02：aiPanel.ts 呼叫不存在的 updateArticle 方法

**問題分類**：Runtime Bug（Critical）
**發現者**：SOLID 工程師
**嚴重程度**：🔴 功能靜默失敗（applySEOResult 永遠不會更新文章）

**根本原因**：
`src/stores/aiPanel.ts` 中 `applySEOResult()` 呼叫 `articleStore.updateArticle(updated)`，
但 `article.ts` store 實際暴露的方法名稱是 `updateArticleInMemory`，`updateArticle` 從未存在。
這導致使用者點擊「套用 SEO」後，文章內容在記憶體中不會更新，頁面看似無回應。

**修正方案**：
將 `articleStore.updateArticle(updated)` 改為 `articleStore.updateArticleInMemory(updated)`。
這是正確的公開 API，會將更新後的文章寫回 `articles` ref 陣列並觸發 Vue 響應式更新。

**影響範圍**：`src/stores/aiPanel.ts`

---

### Fix-03：Claude model 名稱不符合 Anthropic 命名規範

**問題分類**：Runtime Bug（High）
**發現者**：AI Token 工程師
**嚴重程度**：🔴 AI 功能在 Claude 供應商下必定失敗

**根本原因**：
`ClaudeProvider.ts` 中使用 `model: 'claude-haiku-4-5-20251001'`，
此名稱不符合 Anthropic 的模型命名規範（格式應為 `claude-{size}-{version}-{date}`）。
正確的 Claude Haiku 模型名稱應為 `claude-3-5-haiku-20241022`（2024年10月22日發布、符合官方目錄）。
若模型名稱不存在，Anthropic SDK 會在執行時拋出 404 錯誤，使 Claude AI 功能完全無法使用。

**修正方案**：
將 `model: 'claude-haiku-4-5-20251001'` 更正為 `model: 'claude-3-5-haiku-20241022'`。

**影響範圍**：`src/main/services/AIProvider/ClaudeProvider.ts`

---

### Fix-04：Gemini generateContent 缺少 maxOutputTokens

**問題分類**：Bug（High）—潛在高成本風險
**發現者**：AI Token 工程師
**嚴重程度**：🟠 無輸出 token 上限，可能觸發超長回應與意外費用

**根本原因**：
`GeminiProvider.ts` 的 `generateContent` 呼叫缺少輸出 token 限制設定，
相比之下 `ClaudeProvider.ts` 和 `OpenAIProvider.ts` 均正確設定了 `max_tokens: 400`。
若使用者文章內容很長或 Gemini 自由發揮，可能生成遠超預期的輸出，徒增 API token 費用。

**修正方案**：
在 `generateContent` 呼叫中加入 `config: { maxOutputTokens: 400 }`，
與其他兩個 Provider 的輸出限制對齊，確保三個供應商行為一致。

**影響範圍**：`src/main/services/AIProvider/GeminiProvider.ts`

---

### Fix-05：FileService.ts catch 區塊吞掉原始 Error cause

**問題分類**：Bug（High）—診斷能力喪失
**發現者**：程式品質工程師、資安工程師（間接）
**嚴重程度**：🟠 生產環境中 OS 錯誤碼（ENOENT、EACCES）完全消失

**根本原因**：
`FileService.ts` 的 `readFile`、`deleteFile`、`readDirectory`、`createDirectory` 等方法，
在 catch 區塊中建立新的 `Error` 物件但**不傳入** `cause` 參數。
這導致原始的 OS 錯誤（如「檔案不存在 ENOENT」「無權限 EACCES」）在捕獲後就消失，
只剩下一個通用字串錯誤訊息。在生產環境排查問題時，無法得知真實的失敗原因。
`writeFile` 和 `copyFile` 已有正確保留 `reason`，其餘方法未一致對待。

**修正方案**：
在所有 catch 區塊中，將新 `Error` 的建構改為傳入 `{ cause: err }` 選項，
利用 ES2022 的 Error Cause 標準将原始錯誤鏈接保存，方便後續 `err.cause` 追溯。
例外：`exists()` 和 `checkWritable()` 的 catch 是預期行為（檢查是否存在），保持不變。

**影響範圍**：`src/main/services/FileService.ts`

---

### Refactor-06：ArticleService.generateId() 穩定化（路徑 Hash）

**問題分類**：Refactor（Performance P0-C）
**發現者**：效能工程師、SOLID 工程師
**嚴重程度**：🔴 每次 loadArticles() 後所有 Vue v-for key 作廢，觸發全量 DOM 重建

**根本原因**：
`ArticleService.generateId()` 使用 `Date.now().toString(36) + Math.random().toString(36)`。
每次呼叫回傳不同值，每次 `loadArticles()` 後同一篇文章得到不同 ID。
`v-for :key` 的設計前提是 key 代表「同一個邏輯實體的穩定識別碼」，
若 ID 每次不同，Vue 無法追蹤元件對應關係，被迫卸載並重新掛載所有 ArticleTreeItem 元件。
在 100 篇文章場景，每次切換設定或重新載入都會觸發一次全量 DOM 重建。

**修正方案**：
改用文章的 `filePath` 作為 ID 的 hash 基礎，確保同一個檔案路徑永遠產生相同 ID。
使用 Node.js 內建的 `crypto.createHash('sha256')` 對 normalized path 計算摘要，
取前 16 字元作為 ID（sha256 的碰撞率極低，16 hex 字元 = 2^64 空間）。
`FileScannerService.generateIdFromPath()` 的 base64 截斷方式碰撞率較高，一併統一為相同的 sha256 策略。

**Branch**：`refactor/stable-article-id`

**影響範圍**：`src/services/ArticleService.ts`、`src/services/FileScannerService.ts`

---

### Refactor-07：FileService 路徑白名單（CRIT-01 Path Traversal）

**問題分類**：Refactor（Security Critical CVSS 8.8）
**發現者**：資安工程師
**嚴重程度**：🔴 IPC 直接暴露任意路徑讀寫能力

**根本原因**：
`FileService` 的所有路徑操作（`readFile`、`writeFile`、`deleteFile`、`createDirectory` 等）
對傳入路徑完全不做任何驗證，preload.ts 也將這些方法直接暴露給 Renderer。
若 Renderer 被 XSS 或其他方式入侵，攻擊者可讀取 `~/.ssh/id_rsa`、覆寫系統檔案等。
與 CRIT-02 XSS 結合後形成完整的本機攻擊鏈。

**修正方案**：
在 `FileService` 中新增 `allowedBasePaths` 設定與 `validatePath()` 方法，
使用 `path.resolve()` + `path.normalize()` 消除相對路徑與 `..` 穿越，
確認解析後的絕對路徑必須以允許的基底路徑開頭。
`main.ts` 在設定 articles dir 和 target blog 路徑後呼叫 `fileService.setAllowedPaths()` 更新白名單。
`exists()` 和 `getFileStats()` 維持寬鬆（用於預檢查）；讀寫刪創操作嚴格驗證。

**Branch**：`refactor/file-service-path-validation`

**影響範圍**：`src/main/services/FileService.ts`、`src/main/main.ts`

---

### Refactor-08：markdown-it html:false + DOMPurify sanitize（CRIT-02 XSS）

**問題分類**：Refactor（Security Critical CVSS 8.2）
**發現者**：資安工程師
**嚴重程度**：🔴 Markdown 中的 `<script>` 可直接觸及 Electron API（本機 RCE 鏈）

**根本原因**：
`MarkdownService.ts` 初始化 `markdown-it` 時設定 `html: true`，允許 Markdown 中嵌入任意 HTML。
輸出的 HTML 字串透過 `v-html` 指令直接注入 DOM，沒有任何 sanitize。
攻擊者只需在文章中寫入 `<script>window.electronAPI.readFile('~/.ssh/id_rsa')...</script>` 即可執行。
另有 `SearchPanel.vue` 的 `highlightKeyword()` 也使用 `innerHTML` 插入搜尋結果摘要，同樣未做 escape。

**修正方案**：
1. 安裝 `dompurify` 和 `@types/dompurify`
2. `MarkdownService.ts` 改為 `html: false`（禁止內嵌 HTML）
3. 在所有 `v-html` 使用點（`PreviewPane.vue`、`AIPanelView.vue` 等），輸出前先過 `DOMPurify.sanitize()`
4. `SearchPanel.vue` 的 `highlightKeyword()` 改為先 escape 純文字再插入 highlight `<mark>` 標籤

**Branch**：`refactor/markdown-xss-sanitize`

**影響範圍**：`src/services/MarkdownService.ts`、`src/components/PreviewPane.vue`、`src/components/SearchPanel.vue`

---

### Refactor-09：ipc-channels.ts 常數統一引用

**問題分類**：Refactor（Architecture W-01）
**發現者**：架構師
**嚴重程度**：🟠 型別安全形同虛設，未來重命名 IPC channel 需同步修改多處

**根本原因**：
`src/main/ipc-channels.ts` 定義了所有 IPC channel 名稱的 `as const` 常數，
但 `src/main/main.ts` 和 `src/main/preload.ts` 完全沒有引用這個檔案，
而是各自寫硬編碼字串（`"read-file"`、`"write-file"` 等）。
若 channel 名稱拼錯，TypeScript 不會報錯，只會在執行時靜默失敗（IPC handler 找不到）。

**修正方案**：
在 `main.ts` 和 `preload.ts` 中 `import { IPC_CHANNELS } from './ipc-channels.js'`，
將所有硬編碼的 `"read-file"` 等字串換成 `IPC_CHANNELS.READ_FILE` 等常數引用。
如果現有常數定義不完整（未涵蓋所有 channel），一併補齊 `ipc-channels.ts`。

**Branch**：`refactor/ipc-channels-constants`

**影響範圍**：`src/main/main.ts`、`src/main/preload.ts`、`src/main/ipc-channels.ts`

---

### Refactor-10：消除 MainEditor.vue 雙重 AutoSave Timer

**問題分類**：Refactor（SOLID SRP / Architecture Race Condition）
**發現者**：SOLID 工程師、程式品質工程師
**嚴重程度**：🟠 潛在競態條件（兩個 timer 對同一篇文章獨立觸發儲存）

**根本原因**：
`MainEditor.vue` 元件內部有自己的 `scheduleAutoSave()`（2 秒 timer），
同時 `AutoSaveService` 有獨立的 30 秒 periodic timer，兩者各自呼叫儲存函式，互不知情。
這違反 SRP（元件不應自行管理儲存排程），也可能在極端情況下產生同一時間點兩次寫入。
`AutoSaveService` 的 `markAsModified()` 加上 100ms debounce 已能處理編輯中的增量觸發，
元件內的 2 秒 timer 屬於重複且不必要的機制。

**修正方案**：
移除 `MainEditor.vue` 中的 `autoSaveTimer` ref 和 `scheduleAutoSave()` 函式，
改為在內容變更時直接呼叫 `autoSaveService.markAsModified()`，
讓 `AutoSaveService` 統一管理所有儲存排程邏輯（單一職責）。

**Branch**：`refactor/remove-duplicate-autosave`

**影響範圍**：`src/components/MainEditor.vue`

---

### Refactor-11：AI Provider Prompt 抽出共用常數（DRY）

**問題分類**：Refactor（Code Quality / Maintainability）
**發現者**：AI Token 工程師、程式品質工程師
**嚴重程度**：🟡 維護地雷 — 三份 Prompt 各自修改有遺漏風險

**根本原因**：
`ClaudeProvider.ts`、`GeminiProvider.ts`、`OpenAIProvider.ts` 三個檔案的 Prompt 文字完全相同（逐字複製）。
任何 Prompt 優化（加入 Few-shot 範例、調整格式說明、修正關鍵字數量限制）
都需要同步修改三個檔案，容易遺漏，造成三個供應商輸出不一致。

**修正方案**：
新建 `src/main/services/AIProvider/prompts.ts`，
將共用 Prompt template 抽為具名 export 的函式 `buildSEOPrompt(input: SEOGenerationInput): string`，
三個 Provider 各自 import 並呼叫，不再各自維護 Prompt 字串。
此舉同時也是未來新增「文章摘要」、「標題建議」等功能的 Prompt 集中管理基礎。

**Branch**：`refactor/ai-prompt-extraction`

**影響範圍**：`src/main/services/AIProvider/ClaudeProvider.ts`、`GeminiProvider.ts`、`OpenAIProvider.ts`，新增 `prompts.ts`

---

## 修正結果（完成後更新）

| # | 問題 | Commit SHA | 完成時間 |
|---|------|------------|---------|
| 1 | computed allTags runtime crash | `863f625` | 2026-03-01 |
| 2 | updateArticle 方法名稱 | `863f625` | 2026-03-01 |
| 3 | Claude model 名稱 | `9f919a4` | 2026-03-01 |
| 4 | Gemini maxOutputTokens | `bc3a6ea` | 2026-03-01 |
| 5 | FileService Error cause | `0b5ee6f` | 2026-03-01 |
| 6 | generateId 穩定化 | `38f54c3` (branch) → `547a455` (merge) | 2026-03-01 |
| 7 | FileService 路徑白名單 | `2843666` (branch) → `5f19c93` (merge) | 2026-03-01 |
| 8 | markdown-it XSS sanitize | `b82ea5d` (branch) → merge | 2026-03-01 |
| 9 | ipc-channels 常數統一 | `6f8cacf` (branch) → merge | 2026-03-01 |
| 10 | 雙重 AutoSave 移除 | `042c255` (branch) → merge | 2026-03-01 |
| 11 | AI Prompt 共用化 | `68de973` (branch) → merge | 2026-03-01 |
