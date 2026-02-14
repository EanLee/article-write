# Preview CSS 樣式問題報告

**日期**: 2026-02-14
**影響範圍**: 預覽區 CSS 樣式
**嚴重程度**: Low（視覺問題，不影響功能）

## 問題描述

安裝 `@tailwindcss/typography` 後，`prose` 排版生效，但部分自訂樣式與 typography 的預設樣式有衝突或不一致的情況：

1. **內容透出問題**：部分 CSS 樣式造成某些元素「看到內容」（可能是背景色、邊框、padding 問題）
2. **整體風格不合**：自訂的 Obsidian 特殊語法樣式（tag、highlight、callout 等）與 prose 的基礎樣式混搭後視覺不一致

## 已知受影響的可能元素

> ⏳ 待 Jordan / 使用者確認具體哪些元素有問題

可能的衝突點：
- `.obsidian-tag`（`#tag` 語法）— 藍色 badge 樣式
- `.obsidian-highlight`（`==text==`）— 黃色背景
- `.obsidian-callout`（`> [!NOTE]`）— 左側邊框區塊
- `prose` 對 `table`、`blockquote` 的預設樣式
- `code` / `pre` 的背景色與 prose 衝突

## 修正方向

> ⏳ 待使用者確認具體問題後安排

可能方案：
1. 調整 `PreviewPane.vue` 的 `:deep()` 樣式，明確覆蓋 prose 預設值
2. 為 prose 設定 `prose-neutral` 或其他 variant 調整基礎色系
3. 針對 Obsidian 特殊語法的 class 加入 `not-prose` 隔離

## 相關 Commit

> ⏳ 待修復後補充

---

> **狀態**: 已記錄，待使用者確認具體問題後排入修復
> **回報者**: Jordan（端對端驗收時發現）
