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
