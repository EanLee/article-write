---
title: 預覽渲染管線重複執行 Obsidian 語法預處理，#tag 等語法被巢狀重複包裝；圖片語法另有一段恆不生效的死碼
date: 2026-07-30
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：`PreviewService.renderPreview()` 在同一次渲染中，`preprocessObsidianSyntax`（高亮 `==text==`、標籤 `#tag`、圖片 embed `![[img]]`、任務清單、callout）實際被執行了**兩次**——一次在 `PreviewService` 自己的同名方法，一次在它呼叫的 `MarkdownService.renderForPreview()` 內部。凡是「轉換結果的文字內容仍包含可再次被同一組正規式匹配」的語法（例如 `#tag` 轉換後 `<span class="obsidian-tag">#tag</span>` 裡仍留著字面上的 `#tag` 文字），就會被第二次預處理重複轉換，產生巢狀重複包裝的 HTML。

另外，`PreviewService.processImageReferences()` 在目前唯一的呼叫情境（`enableObsidianSyntax` 與 `enableImagePreview` 恆同時為 `true`）下，永遠不會匹配到任何內容，是恆為 no-op 的死碼。

**重現步驟（已用單元測試驗證，非讀程式碼推論）**：
1. 呼叫 `previewService.renderPreview("This has a #test-tag in it.")`
2. 預期：`#test-tag` 只被包裝一層 `<span class="obsidian-tag">#test-tag</span>`
3. 實際：輸出同時包含 `class="obsidian-tag"` 與 `class="tag"` 兩種 class，`#test-tag` 被巢狀包了兩層 `<span>`

對應測試（修復前為 RED）：`tests/services/PreviewService.test.ts` 內 `"#tag 不應被 preprocessObsidianSyntax 重複處理成巢狀 span"`。

## 原因分析

完整呼叫鏈：

```
PreviewService.renderPreview(content, { enableObsidianSyntax: true, ... })
  → this.preprocessObsidianSyntax(content)                              // 第 1 次預處理（PreviewService 自己的版本）
      "#test-tag" → '<span class="obsidian-tag">#test-tag</span>'       // 轉換後文字仍含字面 "#test-tag"
  → this.markdownService.renderForPreview(processedContent, true)
      → isPreview === true
      → this.preprocessObsidianSyntax(content)                          // 第 2 次預處理（MarkdownService 自己的版本，同名但不同實作）
          正規式 /#([a-zA-Z0-9一-鿿_-]+)/g 對已含 HTML 的字串再次掃描
          → 匹配到 span 內殘留的 "#test-tag" 文字
          → 再包一層 '<span class="tag">#test-tag</span>'
          ← 根本原因：兩個服務各自獨立實作了一份「Obsidian 語法預處理」，
            且呼叫鏈讓兩者對同一份內容依序各跑一次，缺乏「這段內容是否已經處理過」的邊界
      → this.md.render(processedContent)
```

**根本原因**：`PreviewService` 與 `MarkdownService` 各自維護一份幾乎重複的 `preprocessObsidianSyntax` 正規式實作（高亮／註解／標籤共三條規則重複，圖片與 callout 僅 `PreviewService` 有）。`PreviewService.renderPreview()` 呼叫 `MarkdownService.renderForPreview(content, true)` 時，`isPreview=true` 會讓 `MarkdownService` 也執行一次自己的預處理，導致同一份內容被處理兩次。因為正規式是對字串做文字匹配、不是對 AST 做一次性標記，轉換後殘留在輸出文字中的原始樣式（如 `#test-tag`）會被第二次預處理誤認為「尚未處理的原始語法」而再次轉換。

`processImageReferences()` 的死碼成因：它與 `preprocessObsidianSyntax()` 用相同的正規式 `/!\[\[([^\]]+)\]\]/g` 匹配圖片 embed，但 `renderPreview()` 呼叫順序上 `preprocessObsidianSyntax()`（受 `enableObsidianSyntax` 控制）先執行、`processImageReferences()`（受 `enableImagePreview` 控制）後執行；而 `DEFAULT_PREVIEW_OPTIONS` 與程式中唯一的正式呼叫點（`MainEditor.vue`）及全部既有測試，都是兩個旗標同時為 `true`，因此圖片 embed 語法在 `processImageReferences()` 執行前早已被 `preprocessObsidianSyntax()` 轉成 `<img>`，留給 `processImageReferences()` 的內容裡不會再有 `![[...]]` 可匹配。

## 修正方式

**修改檔案**：`src/services/PreviewService.ts`、`src/services/MarkdownService.ts`

1. **新增 `MarkdownService.renderPreprocessed(content)`**：只做 `this.md.render(content)`，不執行任何 Obsidian 語法預處理。
2. **`PreviewService.renderPreview()` 改呼叫 `renderPreprocessed()` 而非 `renderForPreview(content, true)`**：內容在進入 `MarkdownService` 前已經由 `PreviewService` 自己的 `preprocessObsidianSyntax` 處理過，不需要也不應該再處理一次。`MarkdownService.renderForPreview()` 本身保持不變，因為它仍被 `MainEditor.vue` 的 render-失敗 fallback 路徑直接呼叫（該路徑不經過 `PreviewService`，需要自己的一次預處理）。
3. **移除 `PreviewService.processImageReferences()` 與其呼叫點**：已確認在目前所有正式呼叫點與測試中恆為 no-op（見上）。`enableImagePreview` 欄位保留在 `PreviewOptions` 介面中（避免變更呼叫端型別），但加註解說明目前不觸發額外處理。

**為何有效**：`renderPreprocessed` 讓「內容進入 markdown-it 渲染」與「Obsidian 語法預處理」變成各自只執行一次、且各自只有一個呼叫點（`PreviewService` 自己的 `preprocessObsidianSyntax` 一次；`MarkdownService.renderForPreview` 的預處理只在它自己的 fallback 呼叫路徑上跑一次），不再有「同一份內容被兩個服務各自的正規式各掃一次」的重疊區間。

**替代方案（未採用）**：曾考慮讓 `MarkdownService.preprocessObsidianSyntax` 具備冪等性（重複執行結果不變，例如用不會再被自身正規式匹配的中介標記包裝），但這需要同時修改兩個服務的正規式與其各自測試，且無法解決「兩個服務各自維護一份幾乎重複的規則」這個架構層根因，故留待後續架構重構（AST-based 單一管線）再處理，本次先以最小變更止血。

**影響範圍**：僅 `PreviewService.renderPreview` 的內部呼叫路徑；`MarkdownService.renderForPreview`（供 fallback 使用）、`MarkdownService.render`（未被任何呼叫端使用）行為不變。不影響 IPC、匯出/發布流程。

**測試**：新增 1 個單元測試於 `tests/services/PreviewService.test.ts`（`#tag 不應被 preprocessObsidianSyntax 重複處理成巢狀 span`），修復前 RED、修復後與既有 668 個測試全數通過（`pnpm run test`：47 test files / 668 passed / 1 skipped）。`pnpm run lint`：0 errors。

**相關 commit**：`refactor(preview): 移除重複的 Obsidian 語法預處理與恆為死碼的圖片處理`
