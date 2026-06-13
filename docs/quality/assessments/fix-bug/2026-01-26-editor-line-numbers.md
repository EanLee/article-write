# 編輯器行號顯示異常 Bug Fix 報告

**日期**: 2026-01-26
**影響範圍**: 編輯器 / UI
**嚴重程度**: High

## 問題描述

### 問題現象
當使用者在編輯器中開啟行號顯示功能時，編輯器內的文章內容完全消失，只能看到行號列。

### 發生條件
- 在 EditorPane 組件中點擊「顯示行號」按鈕
- 行號列正常顯示
- 但 textarea 編輯區域被推出可視範圍

### 影響範圍
- 所有使用編輯器的功能
- 無法正常編輯文章
- 嚴重影響使用體驗

### 重現步驟
1. 開啟任意文章進行編輯
2. 點擊狀態列的「顯示行號」開關
3. 觀察編輯器內容消失

## 原因分析

### 程式碼層面問題
在 `EditorPane.vue` 的 template 中，textarea 使用了 `w-full` class：

```vue
<textarea
  class="textarea textarea-bordered w-full h-full ..."
  :class="{ 'with-line-numbers-padding': showLineNumbers }"
>
```

### 根本原因
1. **Flex 佈局衝突**：
   - `.editor-container` 使用 `display: flex`
   - 子元素包含：行號列（固定寬度 50px）+ textarea（`w-full`）
   - `w-full` (width: 100%) 導致 textarea 寬度為父容器的 100%
   - 行號列（50px）+ textarea（100%）> 100% 容器寬度
   - 結果：textarea 被推出可視範圍

2. **CSS 計算錯誤**：
   - Tailwind 的 `w-full` 不考慮同層其他元素
   - 應該使用 `flex: 1` 讓元素自動填滿剩餘空間

### 相關技術細節
- Flexbox 佈局中，固定寬度元素 + 百分比寬度元素會導致溢出
- 正確做法是使用 `flex-1` 或 `flex: 1` 讓元素自適應

## 修正方式

### 修改的檔案
`src/components/EditorPane.vue`

### 修改的邏輯

**1. Template 層修改**：
```vue
<!-- 修改前 -->
<textarea
  class="textarea textarea-bordered w-full h-full ..."
>

<!-- 修改後 -->
<textarea
  class="textarea textarea-bordered h-full editor-textarea ..."
>
```

- 移除 `w-full` class
- 新增 `editor-textarea` class 統一管理樣式

**2. Style 層修改**：
```css
/* 修改前 */
.editor-content-wrapper {
  position: relative;
  overflow: hidden;
}

.with-line-numbers-padding {
  padding-left: 8px !important;
}

/* 修改後 */
.editor-content-wrapper {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-textarea {
  width: 100%;
  flex: 1;
  border: 1px solid oklch(var(--bc) / 0.2);
  border-radius: 0.5rem;
  padding: 1rem;
  background: oklch(var(--b1));
}
```

### 為什麼這個方案能解決問題

1. **正確的 Flex 使用**：
   - `.editor-content-wrapper` 使用 `display: flex; flex-direction: column`
   - textarea 使用 `flex: 1` 自動填滿剩餘空間
   - 不再依賴百分比寬度

2. **樣式統一管理**：
   - 新增 `editor-textarea` class 集中管理編輯器樣式
   - 避免內聯樣式和分散的 class 造成維護困難

3. **移除不必要的 class**：
   - 移除 `with-line-numbers-padding`（不再需要）
   - 簡化條件樣式邏輯

### 其他替代方案

**方案 A**：使用 `calc()` 計算寬度
```css
.textarea {
  width: calc(100% - 50px); /* 扣除行號列寬度 */
}
```
❌ 缺點：硬編碼寬度值，不夠彈性

**方案 B**：使用 Grid 佈局
```css
.editor-container {
  display: grid;
  grid-template-columns: 50px 1fr;
}
```
❌ 缺點：需要更多結構調整，過度工程

**選擇理由**：
使用 Flexbox 是最簡單且符合現有架構的方案，只需要修改樣式即可，不影響 DOM 結構。

## 相關 Commit

- `e3d6403`: fix(editor): 修復開啟行號後文章內容消失的問題
