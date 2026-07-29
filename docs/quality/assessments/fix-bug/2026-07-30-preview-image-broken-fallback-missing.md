---
title: 預覽畫面圖片載入失敗時無任何提示，僅顯示瀏覽器原生破圖 icon
date: 2026-07-30
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：vault 中圖片檔名打錯、圖片被搬移或刪除時，預覽畫面的 `<img>` 只會顯示瀏覽器原生的破圖 icon，沒有任何「找不到圖片」的提示或樣式，使用者難以第一時間察覺是圖片路徑問題還是渲染問題。

**重現步驟（已用元件測試驗證）**：
1. 掛載 `PreviewPane`，`renderedContent` 內含 `<img src="local-file:///missing.png" alt="test-image.png" class="obsidian-image">`
2. 對該 `<img>` 觸發 `error` 事件（模擬圖片載入失敗）
3. 修復前：`<img>` 沒有任何變化，僅瀏覽器層級顯示破圖 icon
4. 修復後：`<img>` 被加上 `obsidian-image-broken` class，`alt` 文字被加上「⚠ 圖片載入失敗：」前綴

## 原因分析

**候選方案盤點**（第一步：列出所有可能作法，而非只鎖定第一個看起來可行的）：
1. 在產生 `<img>` 標籤的地方（`PreviewService.preprocessObsidianSyntax`/`postProcessHtml`）直接內嵌 `onerror="..."` 屬性
2. 在 `PreviewPane.vue` 用 `addEventListener` 在容器上攔截子層 `<img>` 的 `error` 事件

**用實測排除方案 1**：`PreviewPane.vue` 的 `sanitizedContent` 是 `DOMPurify.sanitize(props.renderedContent, { USE_PROFILES: { html: true }, ALLOWED_URI_REGEXP })` 的結果，而 DOMPurify 預設會剝除所有 `on*` inline event handler 屬性。實際跑 DOMPurify + jsdom 驗證：

```js
DOMPurify.sanitize('<img src="x.png" onerror="alert(1)" onclick="doStuff()">', { USE_PROFILES: { html: true } })
// => '<img src="x.png">'   ← onerror、onclick 均被剝除
```

**根本原因**：破圖容錯若寫在 `PreviewService` 產出的 HTML 字串裡（方案 1），會在 `v-html` 真正插入 DOM 之前被 `DOMPurify.sanitize()` 剝除，永遠不會生效——這也是為何寫在 `PreviewService` 層的單元測試（只檢查字串，不經過 DOMPurify）會誤判「已修復」，但實際畫面上完全沒作用。

**意外發現（超出本次範圍，未修復，另行回報）**：用同一個實測方式回頭檢查 `postProcessHtml` 既有的「程式碼區塊複製按鈕」`onclick="navigator.clipboard.writeText(...)"`，同樣會被這組 DOMPurify 設定剝除——代表該複製按鈕自加入以來很可能從未真正生效過。此為現有程式碼的既有缺陷，與本次「圖片破圖容錯」是不同根因，不在本次修復範圍內，建議另開 bugfix 分支處理。

## 修正方式

**修改檔案**：`src/components/PreviewPane.vue`

改用方案 2：在 `<script setup>` 內新增 `handleImageError(event)`，於 `onMounted` 時用 `previewContainerRef.value.addEventListener("error", handleImageError, true)` 掛在預覽容器上（`error` 事件不冒泡，必須用 capture phase 才能攔截到子層 `<img>` 觸發的事件），`onUnmounted` 時移除。事件觸發時：
- 判斷 `event.target instanceof HTMLImageElement`
- 若尚未標記過（避免重複觸發疊加），加上 `obsidian-image-broken` class 並在 `alt` 前綴「⚠ 圖片載入失敗：」

同時在 `<style scoped>` 新增 `.obsidian-image-broken` 樣式（虛線紅框 + 淺紅底），提供可辨識的破圖視覺。

**為何有效**：`addEventListener` 是在內容已經插入 DOM 之後才由 JS 呼叫的一般 DOM API，不受 `DOMPurify.sanitize()` 影響（sanitize 只處理字串轉 DOM 那一步），因此能可靠攔截任何來源的 `<img>`（無論是 Obsidian embed 或標準 Markdown 語法產生的）載入失敗事件。

**替代方案（已評估、未採用）**：讓 `DOMPurify` 設定加上 `ADD_ATTR: ["onerror"]` 白名單允許 `onerror` 屬性通過。缺點：`onerror` 屬性值本身是任意可執行的 inline JS 字串，一旦圖片路徑（`src`，可能來自 vault 檔名，使用者可控字串的一部分）在極端情況下影響到屬性拼接，等於主動放寬 DOMPurify 這道 XSS 防線的其中一項屬性黑名單保護；而事件監聽器改用 `addEventListener` 完全不需要放寬 DOMPurify 設定，安全邊界更小，故採用此案。

**影響範圍**：僅 `PreviewPane.vue`；不影響 `PreviewService` 的 HTML 產出邏輯。

**測試**：新增元件測試 `tests/components/PreviewPane.test.ts`（3 案：觸發 error 後加上樣式與 alt 前綴、重複觸發不重複疊加提示文字、未觸發 error 時不受影響），全數通過。

**相關 commit**：`feat(preview): 圖片載入失敗時顯示破圖提示（改用 addEventListener 避開 DOMPurify 剝除 onerror）`
