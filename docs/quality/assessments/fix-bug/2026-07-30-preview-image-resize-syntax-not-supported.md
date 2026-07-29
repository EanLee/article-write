---
title: Obsidian 圖片縮圖語法 ![[image.png|300]] 未被識別為圖片，改顯示「嵌入內容預覽」佔位框
date: 2026-07-30
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：Obsidian vault 中常見的圖片縮圖語法 `![[image.png|300]]`（設定寬度）與 `![[image.png|300x200]]`（設定寬高），在預覽畫面中完全沒有顯示圖片，而是顯示「📄 image.png|300 / 嵌入內容預覽」的非圖片嵌入佔位框。

**重現步驟（已用單元測試驗證，非讀程式碼推論）**：
1. 呼叫 `previewService.renderPreview("![[test-image.png|300]]")`
2. 預期：輸出含 `<img ... width="300" ...>`
3. 實際（修復前）：輸出為 `<div class="obsidian-embed" data-embed="test-image.png|300">...嵌入內容預覽...</div>`，完全沒有 `<img>` 標籤

對應測試（修復前為 RED）：`tests/services/PreviewService.test.ts` 內 `"![[image.png|300]] 應解析 Obsidian 縮圖語法為 width=300"`。

## 原因分析

呼叫鏈：

```
PreviewService.preprocessObsidianSyntax("![[test-image.png|300]]")
  → 正規式 /!\[\[([^\]]+)\]\]/g 擷取 imageName = "test-image.png|300"（整段含 | 都當檔名）
  → this.isImageFile("test-image.png|300")
      → ext = filename.substring(filename.lastIndexOf("."))
      → lastIndexOf(".") 找到的是 "test-image.png" 裡的 "."，
        substring 出來是 ".png|300"（因為 |300 在 .png 之後，被一起截進來）
      → imageExtensions.includes(".png|300") === false
      ← 根本原因：isImageFile 沒有先把縮圖尺寸語法從檔名中拆出來，
        導致含 |300 後綴的檔名一律判定為「非圖片」
  → 因 isImageFile 回傳 false，落入 else 分支
      → 回傳 <div class="obsidian-embed">...嵌入內容預覽...</div>（非圖片筆記嵌入的佔位框）
```

**根本原因**：`preprocessObsidianSyntax` 的圖片判斷邏輯，在檔名副檔名擷取之前，沒有先解析 Obsidian 的 `|width` / `|widthxheight` 縮圖語法，導致縮圖語法被當成檔名的一部分，副檔名擷取失敗，圖片被誤判為「非圖片筆記嵌入」。

## 修正方式

**修改檔案**：`src/services/PreviewService.ts`

新增 `parseImageEmbedTarget(raw)` 方法，在檢查是否為圖片檔案**之前**，先用 `lastIndexOf("|")` 拆出 `|` 後半段，並用正規式 `/^(\d+)(?:[xX](\d+))?$/` 驗證是否為「數字」或「數字x數字」格式：
- 符合 → 視為縮圖語法，拆出乾淨的檔名 + width/height，`isImageFile` 只拿乾淨檔名判斷
- 不符合（例如筆記標題本身含 `|` 字元）→ 視為一般嵌入，行為不變

產生的 `<img>` 標籤依解析結果加上 `width="..."`（與可選的 `height="..."`）屬性。

**為何有效**：先拆分再判斷副檔名，`isImageFile` 拿到的永遠是乾淨檔名，不會被縮圖語法干擾；只有在 `|` 後半段確實是數字格式時才啟用縮圖語法解析，避免誤判標題含 `|` 的一般嵌入。

**替代方案（未採用）**：曾考慮用單一正規式 `/!\[\[([^\]|]+)(?:\|(\d+)(?:x(\d+))?)?\]\]/` 一次擷取檔名與尺寸，但這樣會排除「檔名含 `|alias`（非數字）」的一般嵌入語法，需要額外分支處理，改動面積比「先拆、驗證失敗則原樣返回」更大，故採用後者。

**影響範圍**：僅 `PreviewService.preprocessObsidianSyntax` 內圖片 embed 分支；不影響非圖片筆記嵌入、wiki 連結、其他語法規則。

**測試**：新增 3 個單元測試於 `tests/services/PreviewService.test.ts`（`|300` 寬度、`|300x200` 寬高、無縮圖語法時不應產生 width/height 屬性），修復前 RED、修復後全數通過。

**已知限制（未涵蓋，非本次範圍）**：Obsidian 另有 `![[image.png|alt 文字]]`（非數字別名）語法，本次修正刻意不處理此模糊語法（`|` 後接非數字時一律視為一般嵌入原樣處理），避免與縮圖語法混淆誤判；標準 Markdown 語法 `![alt|300](path)` 的類似縮圖寫法也不在本次範圍內。

**相關 commit**：`feat(preview): 支援 Obsidian 圖片縮圖語法 ![[image.png|300]]`
