# Phase 0 功能缺口分析

**分析時間**: 2026-01-25
**基準文件**: CORRECT_PRIORITY_ROADMAP.md

---

## ✅ 已完成的功能

### 1. Content Security Policy 設定
- **狀態**: ✅ 完成
- **位置**: 已在 Electron 主進程中設定

### 2. 基礎 UI/UX 問題修復

#### 2.1 文章列表選中狀態
- **狀態**: ✅ 已實作
- **位置**: `src/components/ArticleList.vue:50-54`
- **實作細節**:
  ```vue
  :class="{
    'bg-primary/5 border-l-4 border-l-primary shadow-md': article.id === currentArticle?.id,
    'border border-base-300': article.id !== currentArticle?.id
  }"
  ```
- **視覺效果**:
  - 選中文章有明顯的藍色左側邊框 (4px)
  - 背景色變為 primary/5
  - 陰影加深
  - 標題使用粗體和 primary 顏色

#### 2.2 編輯器工具列設計
- **狀態**: ✅ 已圖標化
- **位置**: `src/components/EditorHeader.vue`
- **使用圖標庫**: lucide-vue-next
- **已實作圖標**:
  - Save, Undo, Redo (計畫中，目前僅有 Save)
  - FileEdit, FileCode (模式切換)
  - Edit3 (Frontmatter 編輯)
  - Upload (發佈)
  - Eye, EyeOff (預覽切換)
  - Maximize, Minimize (專注模式)
- **功能分組**: 已有分組和 tooltip

#### 2.3 儲存狀態指示器
- **狀態**: ✅ 完整實作
- **位置**: `src/components/SaveStatusIndicator.vue`
- **功能**:
  - ✅ 不同狀態使用不同圖標和顏色（已儲存/儲存中/未儲存/錯誤）
  - ✅ 顯示相對時間（剛剛儲存、X秒前、X分鐘前等）
  - ✅ 支援 compact 和 icon-only 模式
  - ✅ 綠色勾選表示成功、旋轉圖標表示儲存中

#### 2.4 錯誤訊息友善化
- **狀態**: ✅ 部分完成
- **位置**: `src/components/EditorPane.vue:65-95`
- **已實作**:
  - 語法錯誤面板，顯示行號和錯誤訊息
  - 圖片驗證警告
  - 有建議修復提示
- **待改善**: 可以進一步優化錯誤訊息的平易近人程度

### 3. 關鍵缺失功能補完

#### 3.1 全局撤銷/重做
- **狀態**: ✅ 完整實作
- **位置**: `src/composables/useUndoRedo.ts`
- **功能**:
  - ✅ 完整的 Undo/Redo 堆疊
  - ✅ 快捷鍵: Ctrl+Z / Ctrl+Shift+Z
  - ✅ 最多保留 100 個歷史記錄
  - ✅ 自動記錄游標位置
- **代碼行數**: 122 行
- **整合**: 已在 `MainEditor.vue` 中整合使用

#### 3.2 搜尋與替換
- **狀態**: ✅ 完整實作（超越預期）
- **位置**: `src/components/SearchReplace.vue`
- **功能**:
  - ✅ Ctrl+F: 搜尋
  - ✅ Ctrl+H: 替換
  - ✅ 搜尋工具列（顯示匹配數量）
  - ✅ 支援正則表達式
  - ✅ 區分大小寫選項
  - ✅ 整字匹配選項
  - ✅ 上一個/下一個導航
  - ✅ 替換單個/全部替換
- **代碼行數**: 270+ 行
- **UI 完整度**: 超越 roadmap 預期的功能

#### 3.3 字數統計（即時）
- **狀態**: ✅ 完整實作
- **位置**: `src/components/EditorStatusBar.vue:wordCount`
- **功能**:
  - ✅ 即時字數統計（中英文分別計算）
  - ✅ 移除 Markdown 語法後統計
  - ✅ 段落數統計
  - ✅ 預估閱讀時間
  - ✅ 選取文字的字數（via selectionLength）
  - ✅ Tooltip 顯示詳細資訊
- **統計精準度**: 高（正確處理 Markdown 語法）

#### 3.4 行號顯示
- **狀態**: ⚠️ **僅有 UI 開關，缺少實作**
- **位置**: `src/components/EditorStatusBar.vue` 有 toggle
- **問題**:
  - ❌ `EditorPane.vue` 只有一個 `<textarea>`，沒有行號渲染
  - ❌ 沒有行號列的 UI 元素
  - ❌ 沒有行號點擊選取整行的功能
  - ❌ 只有游標位置顯示（行:列），但沒有視覺化行號
- **需要實作**:
  - 添加行號列 UI
  - 實作行號與編輯器內容的同步滾動
  - 實作點擊行號選取整行

---

## ❌ 缺失的功能

### 1. 行號顯示（視覺化）
- **優先級**: P1
- **roadmap 位置**: Phase 0 - 3. 關鍵缺失功能補完 - 4
- **當前狀態**: 僅有 toggle 按鈕，無實際實作
- **需要實作**:
  1. 在 `EditorPane.vue` 中添加行號列
  2. 行號與內容同步滾動
  3. 點擊行號選取整行
  4. 當前行高亮顯示

### 2. 同步滾動
- **優先級**: P0 (Phase 1，但被提到是基礎功能)
- **roadmap 位置**: Phase 1 - 1.1.A
- **當前狀態**: 僅有 toggle 按鈕，無實際實作
- **需要實作**:
  1. 創建 `src/composables/useSyncScroll.ts`
  2. 編輯器滾動時，計算滾動百分比
  3. 預覽面板同步滾動到相應位置
  4. （可選）預覽滾動時同步編輯器
  5. 在 `EditorPane.vue` 和 `PreviewPane.vue` 添加 `@scroll` 事件處理

**roadmap 參考實作**:
```typescript
// src/composables/useSyncScroll.ts
export function useSyncScroll(
  editorRef: Ref<HTMLTextAreaElement>,
  previewRef: Ref<HTMLElement>
) {
  const syncEnabled = ref(true)
  
  function onEditorScroll() {
    if (!syncEnabled.value) return
    
    const editor = editorRef.value
    const preview = previewRef.value
    
    const scrollPercentage = 
      editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
    
    preview.scrollTop = 
      scrollPercentage * (preview.scrollHeight - preview.clientHeight)
  }
  
  return { syncEnabled, onEditorScroll }
}
```

---

## 📊 Phase 0 完成度總結

### 整體完成度: **85%**

| 類別 | 完成度 | 說明 |
|------|--------|------|
| CSP 設定 | 100% | ✅ 完成 |
| UI/UX 修復 | 95% | ✅ 文章列表、工具列、儲存指示器都很完善 |
| 撤銷/重做 | 100% | ✅ 完整實作 |
| 搜尋/替換 | 120% | ✅ 超越預期（支援 regex、case-sensitive 等） |
| 字數統計 | 100% | ✅ 完整且精準 |
| **行號顯示** | **20%** | ⚠️ 僅有開關，缺少視覺化實作 |
| **同步滾動** | **10%** | ⚠️ 僅有開關，缺少邏輯實作 |

### 優先修復項目

**必須完成 (本週內)**:
1. ❌ **實作行號顯示** (1-2 天)
   - 影響: 多人協作時難以溝通位置
   - 技術難度: 中等（需要處理滾動同步）

2. ❌ **實作同步滾動** (1 天)
   - 影響: 編輯和預覽不同步，體驗差
   - 技術難度: 低（roadmap 已提供範例）

**可以延後**:
- 錯誤訊息進一步優化（Phase 0 已基本完成）

---

## 🎯 下一步建議

### 立即任務（預計 2-3 天）

**Day 1-2: 實作行號顯示**
- [ ] 修改 `EditorPane.vue`，添加行號列 UI
- [ ] 實作行號與編輯器內容的同步滾動
- [ ] 實作點擊行號選取整行功能
- [ ] 當前行高亮顯示
- [ ] 與 `EditorStatusBar` 的 toggle 整合

**Day 3: 實作同步滾動**
- [ ] 創建 `src/composables/useSyncScroll.ts`
- [ ] 在 `EditorPane.vue` 添加 `@scroll` 事件
- [ ] 在 `PreviewPane.vue` 添加滾動同步邏輯
- [ ] 與 `EditorStatusBar` 的 toggle 整合
- [ ] 測試邊界情況（空文件、長文件等）

### Phase 0 完成後

完成這兩個功能後，Phase 0 將達到 **100% 完成**，可以正式進入 **Phase 1: 編輯器核心功能完善**。

---

## 📝 備註

### 已超越 Phase 0 預期的功能

以下功能雖然在 Phase 1 才要求，但已經完成：

1. ✅ **專注模式** (Phase 1 - 1.3.C)
   - 位置: `src/composables/useFocusMode.ts`
   - 功能: F11 切換、全螢幕、隱藏側邊欄等

2. ✅ **進階搜尋功能** (Phase 1 - 1.1.B)
   - 正則表達式
   - 區分大小寫
   - 整字匹配
   - 已超越 Phase 0 基本搜尋的要求

這表示團隊在某些方面已經提前完成了 Phase 1 的工作，非常棒！

### 技術債務

目前技術債務很低，程式碼品質良好：
- ✅ 使用 Composition API
- ✅ TypeScript 型別完整
- ✅ Composables 設計良好
- ✅ 元件職責清晰

唯一需要補齊的就是**行號顯示**和**同步滾動**這兩個基礎 UI 功能的實際邏輯。
