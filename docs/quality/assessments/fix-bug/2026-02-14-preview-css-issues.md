# Preview CSS 樣式問題報告

**日期**: 2026-02-14
**影響範圍**: 預覽區 CSS 樣式
**嚴重程度**: Medium（inline code 完全不可見，影響技術文章可讀性）

## 問題描述

安裝 `@tailwindcss/typography` 後，`prose` 排版生效，但部分自訂樣式與 typography 的預設樣式有衝突或不一致的情況：

1. **內容透出問題**：部分 CSS 樣式造成某些元素「看到內容」（可能是背景色、邊框、padding 問題）
2. **整體風格不合**：自訂的 Obsidian 特殊語法樣式（tag、highlight、callout 等）與 prose 的基礎樣式混搭後視覺不一致

## 已確認問題

### CSS-01（確認）：inline code 全白不可見
**語法**：`` `code` ``
**現象**：預覽區 inline code 顯示全白，文字完全看不到
**根本原因（初步）**：`@tailwindcss/typography` 的 `prose` 對 `code` 元素設定了 color，與 DaisyUI 或現有 `:deep(code)` 的 `background-color: #f2f2f2` 衝突，導致文字色與背景色相同（白字白底）
**影響**：技術文章大量使用 inline code，此問題嚴重影響可讀性

## 其他待確認問題

可能的衝突點（尚未確認）：
- `.obsidian-tag`（`#tag` 語法）— 藍色 badge 樣式
- `.obsidian-highlight`（`==text==`）— 黃色背景
- `.obsidian-callout`（`> [!NOTE]`）— 左側邊框區塊
- `prose` 對 `table`、`blockquote` 的預設樣式

## 原因分析（CSS-01）

`@tailwindcss/typography` 的 `prose` class 會對 `code` 元素注入 color 樣式。由於 DaisyUI 的 base theme 在某些情境下讓文字色繼承為白色，而現有的 `:deep(code)` 樣式只設定了 `background-color: #f2f2f2`，**缺少明確的 `color` 宣告**，導致 prose 注入的白色文字疊在淺灰背景上，造成白字白底。

## 修正方式（CSS-01）

修改 `src/components/PreviewPane.vue`，在 `:deep(code)` 明確加入 `color: #1f2937`（深灰色），確保 inline code 文字在任何主題下都清晰可見。`pre code` 則改為 `color: inherit`，繼承語法高亮套件的顏色。

```css
/* 修正前 */
.markdown-preview :deep(code) {
  background-color: #f2f2f2;
  padding: 0.125rem 0.25rem;
  /* 缺少 color，被 prose 覆蓋 */
}

/* 修正後 */
.markdown-preview :deep(code) {
  background-color: #f2f2f2;
  color: #1f2937;  /* 明確設定深灰，避免 prose 覆蓋 */
  padding: 0.125rem 0.25rem;
}
```

## 其他待確認問題

可能的衝突點（尚未確認）：
- `.obsidian-tag`（`#tag` 語法）— 藍色 badge 樣式
- `.obsidian-highlight`（`==text==`）— 黃色背景
- `.obsidian-callout`（`> [!NOTE]`）— 左側邊框區塊
- `prose` 對 `table`、`blockquote` 的預設樣式

## 相關 Commit

- `4d0ec27`: fix(ui): 修復 Preview inline code 文字全白不可見問題（CSS-01）

---

> **狀態**: CSS-01 已修復，待使用者驗證；其他樣式衝突待觀察
> **回報者**: Jordan（端對端驗收時發現）
