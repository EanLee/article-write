---
title: 階段 1 編輯器核心功能完善
domain: delivery
type: plan
status: draft
owner: tech-team
updated: 2026-06-27
source_of_truth: true
producer: ai-generated
review_status: pending-human-review
related_docs:
  - docs/delivery/plans/CORRECT_PRIORITY_ROADMAP.md
---

# 階段 1 編輯器核心功能完善

## 動機

WriteFlow 已完成 MVP（v0.1.0），核心發布流程可用。
但主編輯器（CodeMirror 6）與多個現有 composable 之間存在接線缺口，
導致搜尋定位、搜尋替換高亮、同步滾動等功能在 CM6 模式下實際上無法正常運作。

此外，四項新功能（拖放圖片、智慧貼上、擴充快捷鍵、斜線命令）尚未實作，
影響日常寫作效率。

本計畫目標：讓「已有骨架」的功能真正接通，並補完核心寫作輔助功能。

## 納入範圍

### A. CM6 接線修復（補完既有功能）

1. **SearchPanel scrollToMatch**
   全域搜尋（Ctrl+F）開啟文章後，編輯器應捲動至匹配位置。
   目前 `openResult()` 切換文章後有 `scrollToMatch` stub 尚未實作。

2. **SearchReplace ↔ CM6 選取高亮**
   編輯器內搜尋替換（SearchReplace 元件）找到匹配後，
   應在 CM6 編輯器內選取並高亮該位置。
   目前 `handleSearchHighlight` 使用 textarea `setSelectionRange`，在 CM6 模式下無效。

3. **SyncScroll 捲軸元素修正**
   同步滾動讀取 `editorRef.scrollTop`，但 CM6 的可捲動元素是 `editorView.scrollDOM`，
   導致 CM6 模式下同步滾動不準確。

### B. 新功能實作

4. **拖放圖片上傳**
   拖曳圖片檔案至 CM6 編輯器區域，自動複製圖片到文章圖片目錄並插入 Markdown 語法。
   複用現有 `imageService.uploadImageFile()`。

5. **智慧貼上**
   - 貼上純 URL → 自動轉為 `[url](url)` Markdown 連結
   - 貼上剪貼簿圖片 → 上傳並插入 `![](path)` 語法

6. **擴充 CM6 快捷鍵**
   補完 Roadmap 列出但尚未在 CM6 keymap 中實作的快捷鍵：
   跳至指定行（Ctrl+G）、刪除當前行（Ctrl+D）、複製當前行（Ctrl+Shift+D）。

7. **斜線命令（Slash Commands）**
   在 CM6 編輯器中輸入 `/` 觸發命令選單，支援插入標題、程式碼區塊、表格、日期等常用語法。
   以 CM6 原生 autocomplete extension 實作，整合現有 `@codemirror/autocomplete`。

## 排除範圍

- **多文章標籤**：獨立為 PLAN-002，工作量與本計畫相互獨立
- **AI 輔助功能**：屬階段 3，需等階段 1、2 完成後啟動
- **版本歷史與復原**：屬階段 2
- **文章模板系統**：屬階段 2
- **發布前檢查清單**：屬階段 2

## 驗收條件

| 功能 | Done 定義 |
|------|-----------|
| SearchPanel scrollToMatch | 全域搜尋開啟文章後，CM6 編輯器捲動至匹配行，視覺可見 |
| SearchReplace CM6 高亮 | 搜尋匹配時，CM6 編輯器選取範圍正確覆蓋匹配文字 |
| SyncScroll 修正 | 開啟預覽模式並啟用同步滾動，上下捲動編輯器時預覽同步移動 |
| 拖放圖片 | 拖曳 PNG/JPG 至編輯器，圖片複製至文章目錄，Markdown 語法自動插入游標位置 |
| 智慧貼上 URL | 貼上純 URL，編輯器插入 `[url](url)` 而非原始文字 |
| 智慧貼上圖片 | 貼上剪貼簿圖片，上傳並插入 `![](path)` |
| 擴充快捷鍵 | Ctrl+G 跳行、Ctrl+D 刪行、Ctrl+Shift+D 複製行均可操作 |
| 斜線命令 | 輸入 `/` 後出現命令選單，選擇後正確插入對應 Markdown 語法 |
