---
title: 編輯器內完全無法貼上或拖放圖片，必須另開圖片管理面板手動上傳再複製路徑貼回
date: 2026-07-30
status: fixed
branch: fix/frontmatter-editor-structuredclone
---

## 問題描述

**現象**：在 CodeMirror 編輯器內按 Ctrl+V 貼上剪貼簿截圖，或直接把圖片檔案拖放到編輯器裡，完全沒有反應——不會自動存檔、也不會插入任何 markdown 語法。使用者必須：另外開啟 ImageManager 面板 → 拖放/選擇檔案上傳 → 複製產生的路徑文字 → 切回編輯器手動貼上，至少多 3 個手動步驟。這是幾乎所有現代筆記工具（含 Obsidian）都有的零配置基本功能，缺少此功能已低於「最基本文件撰寫工具」的門檻。

**確認方式**：全 repo 搜尋 `paste|drop|clipboard|drag`，`CodeMirrorEditor.vue`／`MainEditor.vue`／`EditorPane.vue` 皆無相關事件處理，唯一命中的拖放/剪貼簿程式碼在獨立的 `ImageManager.vue`，且其 `clipboard` 用法是「複製圖片路徑文字」而非「貼上圖片檔案」。

## 原因分析

**根本原因**：`CodeMirrorEditor.vue` 的 `EditorView.domEventHandlers` 只註冊了 `keydown`／`scroll`，從未註冊 `paste`／`drop`，且沒有任何機制把圖片檔案上傳所需的 `ImageService`（存在 `MainEditor.vue`）與編輯器綁定。這不是某處邏輯寫錯，而是這個功能從未被實作。

## 修正方式

**修改檔案**：`src/components/CodeMirrorEditor.vue`、`src/components/MainEditor.vue`

1. **`CodeMirrorEditor.vue`**：仿照既有 `setSuggestionsProvider` 的「provider 橋接」設計（`ImageService` 依賴留在 `MainEditor`，`CodeMirrorEditor` 保持純粹），新增 `setImagePasteHandler(fn)`。在既有的 `EditorView.domEventHandlers` 加上 `paste`／`drop`：偵測 `event.clipboardData`/`event.dataTransfer` 中 `file.type.startsWith("image/")` 的檔案，呼叫注入的上傳函式取得檔名後，用 `view.dispatch` 在游標（貼上）或放開座標（拖放，用 `view.posAtCoords`）處插入 `![[檔名]]`；非圖片檔案則放行給 CodeMirror 內建行為處理（不 `preventDefault`）。
2. **`MainEditor.vue`**：新增 `handleImagePasteUpload(file)` 呼叫既有的 `imageService.uploadImageFile(file)`（此方法早已存在，供 `ImageManager.vue` 使用，直接複用）。用 `watch(editorPaneRef, ..., { immediate: true })` 注入，而非只在 `onMounted` 呼叫一次——因為 `CodeMirrorEditor` 是 `v-if="editorMode === 'compose'"` 條件渲染，掛載時機不固定，只在父層 `onMounted` 呼叫一次會在子元件尚未掛載時注入失敗（且日後切換 `editorMode` 重新掛載時也不會補注入）。

**踩雷記錄（撰寫元件測試時發現，過程即修正）**：
- 一開始把 `paste`/`drop` 事件 dispatch 在 `view.dom`（CM6 外層容器）上，測試一直收不到——查 CodeMirror 6 原始碼確認 `domEventHandlers`（除 `scroll` 外）實際掛在 `view.contentDOM`（可編輯內容區），事件必須從 `contentDOM` 或其子節點觸發／冒泡才會被接住，改成 dispatch 在 `view.contentDOM` 後測試才收得到。
- 「非圖片貼上不應攔截」測試在整體測試套件下曾出現 `TypeError: data.getData is not a function`（單獨跑該檔案不會重現）——查明是 CM6 內建也有自己的 `paste` handler（在我的 handler 放行、不呼叫 `preventDefault` 後會接續執行），它會呼叫 `event.clipboardData.getData(...)`；測試裡的假 `clipboardData` 只給了 `{ files: [...] }`，沒有 `getData` 方法，導致 CM6 內建 handler 炸掉。修正方式是讓測試的假 `clipboardData`/`dataTransfer` 補上 `getData: () => ""`，讓它更貼近真實 `DataTransfer` 介面，而非修改產品程式碼（產品邏輯本身沒有問題，這是測試替身不夠完整）。

**為何有效**：`uploadImageFile` 已存在、已被 `ImageManager.vue` 驗證過（檔案轉 buffer、經 `electronAPI.writeFileBuffer` 寫入 vault images 目錄、回傳唯一檔名），直接複用避免重複實作圖片儲存邏輯；`watch(editorPaneRef, ..., { immediate: true })` 對齊 Vue 元件 ref 生命週期，不受 `v-if` 條件渲染影響。

**影響範圍**：`CodeMirrorEditor.vue`、`MainEditor.vue`；不影響 `ImageManager.vue` 既有的手動上傳流程（兩者並存，貼上/拖放是新增的快速路徑）。

**已知限制（未涵蓋，非本次範圍）**：拖放/貼上多檔案時依序處理、每張各自插入一行；未處理拖放「非圖片檔案」到編輯器內容區時的行為（放行給瀏覽器預設）；未新增 E2E 測試（僅涵蓋元件層 domEventHandlers 行為，真實 Electron clipboard/drag 互動建議後續視需要補 Playwright 測試）。

**測試**：新增 3 個元件測試於 `tests/components/CodeMirrorEditor.paste.test.ts`（貼上圖片插入 `![[檔名]]`、非圖片貼上不攔截、拖放圖片插入 `![[檔名]]`），全數通過；`pnpm run test`：49 test files / 677 passed / 1 skipped；`pnpm run lint`：0 errors。

**相關 commit**：`feat(editor): 支援編輯器內直接貼上/拖放圖片`
