# 文章圖片無法顯示 Bug Fix 報告

**日期**: 2026-05-01
**影響範圍**: 預覽面板（PreviewPane）
**嚴重程度**: High

## 問題描述

開啟任何含有圖片引用的文章（Obsidian `![[image.png]]` 或標準 Markdown `![](./images/image.png)`），預覽面板內圖片均無法顯示，呈現破圖狀態。

## 原因分析

### 呼叫鏈

```
MainEditor.updatePreview()
  → previewService.setImageBasePath(imagesDir)    ✅ 路徑正確設定
  → previewService.renderPreview(content, options)
      → preprocessObsidianSyntax()
          → resolveImagePath(imageName)
              → toFileUrl() → "file:///C:/vault/images/image.png"  ✅ URL 正確
      → markdownService.renderForPreview()         ✅ HTML 正確含 file:// src
  → renderedContent = "<img src=\"file:///...\" ...>"               ✅

PreviewPane.vue
  → DOMPurify.sanitize(renderedContent, { USE_PROFILES: { html: true } })
      → ALLOWED_URI_REGEXP 不含 file: 協定
          → src="file:///..." 被移除 → src=""                       ❌ 根本原因在這裡
```

### 根本原因

`DOMPurify` 的預設 `ALLOWED_URI_REGEXP` 只允許 `http:`、`https:`、`mailto:`、`tel:` 等協定，**不包含 `file:` 協定**。

`PreviewService` 雖然正確將 Obsidian 圖片語法轉換為 `file:///path/to/image.png` 的 URL，但在 `PreviewPane.vue` 經 `DOMPurify.sanitize()` 消毒時，所有 `src` 屬性中的 `file://` URL 都被清除，最終呈現為空的 `src` 屬性，導致圖片破圖。

## 修正方式

在 `PreviewPane.vue` 的 `DOMPurify.sanitize()` 設定中，透過 `ALLOWED_URI_REGEXP` 選項加入 `file:` 協定：

```ts
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i

DOMPurify.sanitize(html, {
  USE_PROFILES: { html: true },
  ALLOWED_URI_REGEXP,
})
```

這個修正只允許 `file:` 協定通過，其餘危險協定（如 `javascript:`）仍受 DOMPurify 攔截。在 Electron 應用情境下允許 `file:` 是安全的，因為 Electron 的 CSP 已額外限制 `img-src` 只允許 `'self' data: file:`。

## 相關 Commit

- `6fa3726`: fix(ui): 允許 DOMPurify 保留圖片的 file:// URL
