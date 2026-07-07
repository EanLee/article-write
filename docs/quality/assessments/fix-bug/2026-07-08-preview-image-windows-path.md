---
title: 預覽畫面圖片不顯示（Windows 路徑磁碟代號遺失）
date: 2026-07-08
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：預覽畫面中 Obsidian 語法 `![[image.png]]` 的圖片全部無法顯示（破圖），僅顯示 alt text。

**觸發條件**：在 Windows 環境下，vault 路徑為 Windows 絕對路徑（如 `C:/Users/...`）。

**重現步驟**：
1. 設定 vault 路徑為 Windows 絕對路徑（如 `C:/Users/user/vault`）
2. 開啟含有 `![[image.png]]` 的文章
3. 預覽畫面圖片破圖，DevTools 顯示 404 或路徑錯誤

## 原因分析

完整呼叫鏈：

```
MainEditor.updatePreview()
  → imageBasePath = `${vaultPath}/images`  // e.g. "C:/Users/user/vault/images"
  → previewService.setImageBasePath(imageBasePath)
  → previewService.renderPreview(content, { enableObsidianSyntax: true })
    → preprocessObsidianSyntax()
      → resolveImagePath("photo.png")
        → return `local-file://${base}/${imageName}`
        // = "local-file://C:/Users/user/vault/images/photo.png"
        ← 根本原因：兩斜線 URL 將 C 解析為 hostname
    → <img src="local-file://C:/Users/user/vault/images/photo.png">

Electron main process protocol.handle("local-file"):
  → new URL("local-file://C:/Users/user/vault/images/photo.png")
    url.hostname = "c"           ← 磁碟代號被當作 hostname
    url.pathname = "/Users/user/vault/images/photo.png"  ← 遺失 C:
  → net.fetch("file:///Users/user/vault/images/photo.png")
  ← 路徑不存在 → 404
```

**根本原因**：`PreviewService.resolveImagePath` 產生 `local-file://C:/path` 格式（兩斜線）。依 Web URL 規範，`//` 後為 authority（host:port），Windows 磁碟代號 `C` 被解析為 hostname，pathname 中磁碟代號遺失。protocol handler 取 `url.pathname` 後拼出的 `file://` URL 缺少磁碟代號，導致 404。

**Unix 不受影響**：Unix 路徑以 `/` 開頭，`local-file:///home/...`（三斜線），hostname 為空字串，pathname 完整保留。

## 修正方式

**修改檔案**：`src/services/PreviewService.ts`，`resolveImagePath` 方法

```diff
  if (base) {
-   return `local-file://${base}/${imageName}`
+   const normalizedBase = base.replace(/\\/g, "/").replace(/^\/+/, "")
+   return `local-file:///${normalizedBase}/${imageName}`
  }
```

**為何有效**：
- 三斜線 `local-file:///C:/path` → `url.hostname = ""`，`url.pathname = "/C:/path"` → `file:///C:/path` 正確
- `replace(/\\/g, "/")` 正規化 Windows 反斜線，避免路徑格式不一致
- `replace(/^\/+/, "")` 移除開頭斜線（Unix 路徑如 `/home/...`），再加 `///` 前綴，兩種系統皆正確

**路徑對照**：

| 系統 | 輸入 base | 修正前 | 修正後 |
|------|-----------|--------|--------|
| Windows | `C:/Users/vault/images` | `local-file://C:/Users/...`（broken） | `local-file:///C:/Users/...` ✓ |
| Unix | `/home/vault/images` | `local-file:///home/...`（已正確） | `local-file:///home/...` ✓ |

**影響範圍**：僅 `PreviewService.resolveImagePath`，不影響其他服務或 E2E 路徑。無需連動調整。

**測試**：新增 4 個單元測試於 `tests/services/PreviewService.test.ts`（`resolveImagePath - Windows 路徑相容性`），覆蓋 Windows 正斜線、反斜線、Unix 路徑、無 basePath fallback。

**相關 commit**：`fix(preview): 修正 Windows 路徑 local-file:// 磁碟代號遺失導致圖片無法顯示`

---

## 追加修復 (2026-07-08)

### 問題描述

標準 Markdown 圖片語法 `![alt](../../images/grafana_k6_dashboard_mock.png)` 在預覽中仍不顯示，即使上方 Obsidian `![[]]` 語法已修復。

### 原因分析

```
MainEditor.updatePreview()
  → previewService.renderPreview(content, options)
    → preprocessObsidianSyntax()  // 只處理 ![[image.png]]
    → markdownService.renderForPreview()
        // 標準 Markdown ![alt](../../images/...) 的 src 原封不動輸出
        → <img src="../../images/grafana_k6_dashboard_mock.png">
    → postProcessHtml()  // 不處理 <img> src
    ← 瀏覽器以 http://localhost:3002/ 為 base 解析相對路徑
    ← 解析到 http://localhost:3002/images/... → 不存在 → 破圖
```

**根本原因**：`PreviewService` 只轉換 Obsidian `![[]]` 語法的路徑，對標準 Markdown `![alt](relative/path)` 完全沒有路徑解析。Electron renderer 的 document base URL 是 `http://localhost:3002`（dev）或 `file:///dist/renderer/index.html`（prod），都不是文章所在目錄，相對路徑解析結果錯誤。

### 修正方式

**修改檔案**：
- `src/services/PreviewService.ts`：新增 `resolveStandardMarkdownImagePaths` 方法，在渲染前將相對路徑轉為 `local-file:///` 絕對 URL
- `src/components/MainEditor.vue`：renderPreview 呼叫新增 `articleFilePath` 參數
- `src/services/PreviewService.ts`：`PreviewOptions` 介面新增 `articleFilePath?: string`

**核心邏輯**：利用瀏覽器原生 `URL` API（不需 Node `path` 模組）做相對路徑解析：
```ts
const base = `file://${articleDir}/`
const resolved = new URL("../../images/photo.png", base)
// → file:///C:/vault/images/photo.png
// 再轉 local-file:///C:/vault/images/photo.png
```

**測試**：新增 4 個單元測試（`resolveStandardMarkdownImagePaths - 標準 Markdown 圖片相對路徑解析`），覆蓋 Windows、Unix、http 路徑不變、無 articleFilePath 時原樣保留。

**相關 commit**：`fix(preview): 修正標準 Markdown 圖片相對路徑無法在 Electron 中顯示`

---

## 追加修復 2 (2026-07-08)

### 問題描述

加入 source-level 轉換後，圖片在 app 中仍不顯示。

### 原因分析

Source-level 轉換（`resolveStandardMarkdownImagePaths`）有兩個致命弱點：

1. **路徑含空格**：`new URL(src, base)` 中 `base` 含未編碼空格（如 `file:///C:/My Vault/`），URL 構建拋出 `TypeError`，被 catch 靜默返回原值，路徑未轉換。
2. **`articleFilePath` 為 undefined**：若 `renderPreview` 呼叫時 `options.articleFilePath` 尚未設定（例如 `currentArticle` 剛切換、watcher 尚未觸發），整段邏輯跳過，相對路徑保留。

```
MainEditor.updatePreview()
  → previewService.renderPreview(content, { articleFilePath: currentArticle?.filePath })
    → resolveStandardMarkdownImagePaths()
        → new URL(src, "file:///C:/My Vault/...")  ← TypeError: Invalid URL（空格未編碼）
        → catch → return match（原相對路徑）
    → markdownService.renderForPreview()
        → <img src="../../images/...">  ← 相對路徑保留
    → postProcessHtml()
        → 未處理 <img> src
  → <img src="../../images/...">
  ← 瀏覽器以 http://localhost:3002 為 base 解析 → 404
```

### 修正方式

**修改檔案**：`src/services/PreviewService.ts`、`src/components/MainEditor.vue`

**兩項修正：**

1. **`encodeURI` 修正 source-level**：`resolveStandardMarkdownImagePaths` 的 `base` 改用 `encodeURI()` 包裝，空格轉為 `%20`，`new URL()` 不再拋出。
2. **HTML post-processing 防線**：新增 `setArticleFilePath(filePath)` 方法（同 `setImageBasePath` 的存活週期），在 `postProcessHtml` 中將殘留的相對 `<img src>` 轉換為 `local-file:///` 絕對 URL——source-level 失敗時的安全防線。

```ts
// MainEditor.updatePreview() 現在同時呼叫：
previewService.setArticleFilePath(articleStore.currentArticle?.filePath ?? "")
// → this.articleDir 持久化存儲文章目錄
// postProcessHtml 使用 this.articleDir 修正殘留相對路徑
```

**測試**：新增 4 個單元測試（`setArticleFilePath + HTML post-processing`），覆蓋 Windows、Unix、空路徑、http 不動。

**相關 commit**：`fix(preview): 補強圖片路徑解析：encodeURI + HTML 後處理防線`
