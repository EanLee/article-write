---
title: 程式碼區塊複製按鈕自加入以來從未真正生效（onclick 被 DOMPurify 剝除）
date: 2026-07-30
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：預覽畫面裡程式碼區塊右上角的「📋 複製」按鈕，點擊後沒有任何反應——剪貼簿不會有內容。

**發現經過**：本次修圖片破圖容錯（見 `2026-07-30-preview-image-broken-fallback-missing.md`）時，為了確認 `<img onerror="...">` 是否會被 DOMPurify 剝除，實際跑了一次 DOMPurify + jsdom：

```js
DOMPurify.sanitize('<img src="x.png" onerror="alert(1)" onclick="doStuff()">', { USE_PROFILES: { html: true } })
// => '<img src="x.png">'   ← onerror、onclick 均被剝除
```

`PreviewPane.vue` 的 `sanitizedContent` 用的正是同一組 `DOMPurify.sanitize(props.renderedContent, { USE_PROFILES: { html: true }, ALLOWED_URI_REGEXP })` 設定，而 `PreviewService.postProcessHtml` 產生的複製按鈕原本帶有 `onclick="navigator.clipboard.writeText(...)"`，同樣會被剝除。

## 原因分析

呼叫鏈：

```
PreviewService.postProcessHtml(html)
  → 產生 <button class="code-copy-btn" onclick="navigator.clipboard.writeText(...)">
PreviewPane.vue
  → sanitizedContent = DOMPurify.sanitize(renderedContent, { USE_PROFILES: { html: true } })
      → DOMPurify 剝除所有 on* inline event handler 屬性（含 onclick）
      ← 根本原因：DOMPurify 的安全清洗會無條件移除 on* 屬性，button 送進 v-html 之前
        onclick 早已不存在，點擊不會觸發任何 JS
  → v-html="sanitizedContent" 插入 DOM
```

**根本原因**：inline `onclick`（連同前述圖片的 inline `onerror`）在通過 `DOMPurify.sanitize()` 這一步時就已經被剝除，是同一個根因在兩個不同 UI 元素上的表現，屬於「HTML 字串裡任何 inline event handler 都無法在這條 v-html 管線上生效」的通用限制。

## 修正方式

**修改檔案**：`src/services/PreviewService.ts`、`src/components/PreviewPane.vue`

1. `PreviewService.postProcessHtml`：移除按鈕的 `onclick` 屬性，只保留 `class="code-copy-btn"` 作為事件代理的掛鉤。
2. `PreviewPane.vue`：新增 `handleCopyButtonClick`，用 `previewContainerRef.value.addEventListener("click", handleCopyButtonClick)` 事件代理（`click` 事件會冒泡，不需要像 `error` 事件那樣用 capture phase）。點擊時用 `event.target.closest(".code-copy-btn")` 判斷是否點在複製按鈕上，取 `button.parentElement.nextElementSibling.textContent`（與原本 inline onclick 的 DOM 遍歷邏輯一致）呼叫 `navigator.clipboard.writeText`。

**為何有效**：`addEventListener` 是內容插入 DOM 之後才呼叫的一般 DOM API，不受 `DOMPurify.sanitize()` 影響，與圖片破圖容錯採用同一套修正原則。

**影響範圍**：僅 `PreviewService.postProcessHtml` 產生的 HTML、`PreviewPane.vue`；不影響其他 `postProcessHtml` 規則（表格包裝、外部連結圖示、標題錨點）。

**測試**：`tests/services/PreviewService.test.ts` 新增 1 案（複製按鈕不應含 `onclick`）；`tests/components/PreviewPane.test.ts` 新增 2 案（點擊按鈕呼叫 `clipboard.writeText` 並帶入正確程式碼文字、點擊按鈕以外區域不觸發），全數通過；`pnpm run test`：49 test files / 680 passed / 1 skipped；`pnpm run lint`：0 errors。

**相關 commit**：`fix(preview): 修正程式碼區塊複製按鈕因 DOMPurify 剝除 onclick 而失效`
