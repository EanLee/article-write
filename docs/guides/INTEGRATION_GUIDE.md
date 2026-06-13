---
title: "核心功能整合指南"
domain: engineering
type: guide
status: approved
owner: tech-team
updated: 2026-02-02
source_of_truth: true
---

# 核心功能整合指南

本文檔說明如何將新開發的核心功能整合到編輯器中。

---

## 📋 已完成的功能

### 1️⃣ Undo/Redo 系統
- ✅ **檔案**: `src/composables/useUndoRedo.ts`
- ✅ **功能**: 完整的編輯歷史記錄與復原
- ✅ **快捷鍵**: Ctrl+Z (撤銷), Ctrl+Shift+Z (重做)

### 2️⃣ 搜尋/替換功能
- ✅ **組件**: `src/components/SearchReplace.vue`
- ✅ **Composable**: `src/composables/useSearchReplace.ts`
- ✅ **功能**: 
  - 即時搜尋與高亮
  - 區分大小寫
  - 正則表達式支援
  - 全字匹配
  - 單個/全部替換
- ✅ **快捷鍵**: Ctrl+F (搜尋), Ctrl+H (替換)

### 3️⃣ 編輯器狀態列
- ✅ **組件**: `src/components/EditorStatusBar.vue`
- ✅ **功能**:
  - 游標位置顯示（行/列）
  - 即時字數統計
  - 段落數、閱讀時間
  - 編輯器選項切換（同步滾動、行號、自動換行）

### 4️⃣ 擴充快捷鍵系統
- ✅ **檔案**: `src/composables/useEditorShortcuts.ts`
- ✅ **新增快捷鍵**:
  - Ctrl+Z: 撤銷
  - Ctrl+Shift+Z: 重做
  - Ctrl+F: 搜尋
  - Ctrl+H: 替換

---

## 🔧 整合步驟

### 步驟 1: 在 MainEditor.vue 中引入功能

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SearchReplace from './SearchReplace.vue'
import EditorStatusBar from './EditorStatusBar.vue'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useSearchReplace } from '@/composables/useSearchReplace'
import { useEditorShortcuts } from '@/composables/useEditorShortcuts'

// 現有的 refs
const content = ref('')
const editorRef = ref<HTMLTextAreaElement>()

// 1. 初始化 Undo/Redo
const {
  canUndo,
  canRedo,
  pushHistory,
  undo,
  redo,
  initialize: initializeHistory,
} = useUndoRedo()

// 2. 初始化搜尋/替換
const {
  isSearchVisible,
  openSearch,
  closeSearch,
  replace,
  jumpToMatch,
} = useSearchReplace(
  () => content.value,
  (newContent) => { content.value = newContent },
  () => editorRef.value?.selectionStart || 0,
  (position) => {
    if (editorRef.value) {
      editorRef.value.setSelectionRange(position, position)
      editorRef.value.focus()
    }
  }
)

// 3. 初始化快捷鍵（擴充版本）
const {
  handleShortcuts,
  insertMarkdownSyntax,
  insertTable,
} = useEditorShortcuts(editorRef, content, {
  onSave: () => {
    // 儲存邏輯
    autoSaveService.saveCurrentArticle()
  },
  onTogglePreview: () => {
    showPreview.value = !showPreview.value
  },
  onUndo: handleUndo,
  onRedo: handleRedo,
  onSearch: openSearch,
  onReplace: () => {
    openSearch()
    // 如果需要，可以自動切換到替換模式
  },
})

// Undo/Redo 處理函數
function handleUndo() {
  const state = undo()
  if (state) {
    content.value = state.content
    // 恢復游標位置
    setTimeout(() => {
      if (editorRef.value) {
        editorRef.value.setSelectionRange(
          state.cursorPosition,
          state.cursorPosition
        )
      }
    }, 0)
  }
}

function handleRedo() {
  const state = redo()
  if (state) {
    content.value = state.content
    setTimeout(() => {
      if (editorRef.value) {
        editorRef.value.setSelectionRange(
          state.cursorPosition,
          state.cursorPosition
        )
      }
    }, 0)
  }
}

// 監聽內容變化，記錄歷史
let historyTimeout: ReturnType<typeof setTimeout> | null = null
watch(content, (newContent) => {
  // 防抖：500ms 後才記錄歷史
  if (historyTimeout) {
    clearTimeout(historyTimeout)
  }
  
  historyTimeout = setTimeout(() => {
    const cursorPos = editorRef.value?.selectionStart || 0
    pushHistory(newContent, cursorPos)
  }, 500)
})

// 初始化
onMounted(() => {
  initializeHistory(content.value, 0)
})
</script>
```

---

### 步驟 2: 在模板中添加組件

```vue
<template>
  <div class="h-full flex flex-col relative">
    <!-- 編輯器頭部 -->
    <EditorHeader ... />

    <!-- 搜尋/替換面板（絕對定位在編輯器上方） -->
    <SearchReplace
      :visible="isSearchVisible"
      :content="content"
      @close="closeSearch"
      @replace="(search, replace, all) => replace(search, replace, all)"
      @highlight="handleHighlight"
    />

    <!-- 編輯器內容區域 -->
    <div class="flex-1 overflow-hidden">
      <textarea
        ref="editorRef"
        v-model="content"
        @keydown="handleShortcuts"
        class="w-full h-full p-4 resize-none"
      ></textarea>
    </div>

    <!-- 編輯器狀態列 -->
    <EditorStatusBar
      :content="content"
      :cursor-position="cursorPosition"
      :selection-start="selectionStart"
      :selection-end="selectionEnd"
      :show-preview="showPreview"
      :sync-scroll="syncScroll"
      :show-line-numbers="showLineNumbers"
      :word-wrap="wordWrap"
      @toggle-sync-scroll="syncScroll = !syncScroll"
      @toggle-line-numbers="showLineNumbers = !showLineNumbers"
      @toggle-word-wrap="wordWrap = !wordWrap"
    />
  </div>
</template>
```

---

### 步驟 3: 處理搜尋高亮

```typescript
// 搜尋匹配的高亮處理
function handleHighlight(
  matches: Array<{ start: number; end: number }>,
  currentIndex: number
) {
  if (matches.length === 0 || !editorRef.value) return

  const match = matches[currentIndex]
  
  // 選取匹配的文字
  editorRef.value.setSelectionRange(match.start, match.end)
  editorRef.value.focus()

  // 滾動到可見區域
  scrollToSelection()
}

function scrollToSelection() {
  if (!editorRef.value) return
  
  const textarea = editorRef.value
  const selectionStart = textarea.selectionStart
  const textBeforeSelection = textarea.value.substring(0, selectionStart)
  const lines = textBeforeSelection.split('\n')
  const lineHeight = 24 // 根據實際行高調整
  const scrollTop = (lines.length - 1) * lineHeight
  
  textarea.scrollTop = scrollTop - textarea.clientHeight / 2
}
```

---

## 🎨 UI 布局建議

### 編輯器整體布局

```
┌─────────────────────────────────────────────────┐
│  EditorHeader (工具列)                          │
├─────────────────────────────────────────────────┤
│  SearchReplace (搜尋面板，條件顯示)             │
├─────────────────────────────────────────────────┤
│                                                 │
│  編輯器內容區域                                  │
│  (EditorPane 或 Textarea)                       │
│                                                 │
├─────────────────────────────────────────────────┤
│  EditorStatusBar (狀態列)                       │
└─────────────────────────────────────────────────┘
```

---

## ⌨️ 完整快捷鍵清單

### 基本編輯
- `Ctrl+Z` - 撤銷
- `Ctrl+Shift+Z` - 重做
- `Ctrl+S` - 儲存
- `Ctrl+A` - 全選
- `Ctrl+C` - 複製
- `Ctrl+X` - 剪下
- `Ctrl+V` - 貼上

### 搜尋與導航
- `Ctrl+F` - 搜尋
- `Ctrl+H` - 替換
- `Enter` (搜尋面板) - 下一個匹配
- `Shift+Enter` (搜尋面板) - 上一個匹配
- `Esc` (搜尋面板) - 關閉搜尋

### 格式化
- `Ctrl+B` - 粗體
- `Ctrl+I` - 斜體
- `Ctrl+K` - 插入連結
- `Ctrl+E` - 高亮文字

### 視圖
- `Ctrl+/` - 切換預覽

---

## 📊 功能測試清單

### Undo/Redo 測試
- [ ] 輸入文字後按 Ctrl+Z 可以撤銷
- [ ] 撤銷後按 Ctrl+Shift+Z 可以重做
- [ ] 連續撤銷多次可以回到之前的狀態
- [ ] 撤銷後修改內容，重做歷史被清除
- [ ] 游標位置在撤銷/重做時正確恢復

### 搜尋/替換測試
- [ ] Ctrl+F 開啟搜尋面板
- [ ] 輸入搜尋文字後顯示匹配數量
- [ ] Enter 跳到下一個匹配
- [ ] Shift+Enter 跳到上一個匹配
- [ ] 區分大小寫選項正常工作
- [ ] 正則表達式搜尋正常工作
- [ ] 全字匹配正常工作
- [ ] 單個替換正常工作
- [ ] 全部替換正常工作（有確認提示）
- [ ] Esc 關閉搜尋面板

### 狀態列測試
- [ ] 游標移動時行列數字即時更新
- [ ] 字數統計正確（排除 Markdown 語法）
- [ ] 段落數統計正確
- [ ] 閱讀時間計算合理
- [ ] 選取文字時顯示選取長度
- [ ] Tooltip 顯示詳細統計資訊
- [ ] 切換按鈕（同步滾動、行號、換行）正常工作

---

## 🐛 已知問題與限制

### Undo/Redo
- 防抖間隔設為 500ms，快速輸入時可能錯過某些狀態
- 最多保留 100 個歷史記錄
- 不支援跨文章的 undo/redo

### 搜尋/替換
- 目前不支援多行搜尋模式
- 正則表達式錯誤時只是靜默失敗，沒有錯誤提示
- 搜尋高亮目前透過選取實現，可能與編輯衝突

### 狀態列
- 字數統計可能對複雜 Markdown 不夠精確
- 中英文混合時的單字統計可能不準確

---

## 🚀 後續優化建議

### 短期（1-2 天）
1. **搜尋高亮優化**
   - 使用背景色高亮而非選取
   - 支援多個匹配同時高亮

2. **Undo/Redo 視覺化**
   - 顯示歷史記錄清單
   - 可以跳到任意歷史點

3. **錯誤提示**
   - 正則表達式錯誤時顯示提示
   - 搜尋無結果時的友善提示

### 中期（3-5 天）
4. **進階搜尋**
   - 支援多行搜尋
   - 搜尋歷史記錄
   - 搜尋結果預覽

5. **狀態列增強**
   - 顯示編碼格式
   - 顯示 Markdown 語法錯誤數

6. **快捷鍵自訂**
   - 允許用戶自訂快捷鍵
   - 顯示快捷鍵清單（按 ? 顯示）

---

## 📝 Commit 建議

```bash
# 提交這些新功能時的 commit 訊息

git add src/composables/useUndoRedo.ts
git commit -m "feat(editor): 實作完整的 Undo/Redo 系統

- 支援 Ctrl+Z 撤銷和 Ctrl+Shift+Z 重做
- 保留最多 100 個歷史記錄
- 自動記錄游標位置
- 支援防抖以避免過度記錄

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git add src/components/SearchReplace.vue src/composables/useSearchReplace.ts
git commit -m "feat(editor): 實作搜尋/替換功能

- 支援即時搜尋與匹配計數
- 支援區分大小寫、正則表達式、全字匹配
- 支援單個/全部替換
- 快捷鍵: Ctrl+F (搜尋), Ctrl+H (替換)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git add src/components/EditorStatusBar.vue
git commit -m "feat(editor): 實作編輯器狀態列

- 即時顯示游標位置（行/列）
- 智慧字數統計（排除 Markdown 語法）
- 顯示段落數和閱讀時間
- 提供編輯器選項切換（同步滾動、行號、換行）

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git add src/composables/useEditorShortcuts.ts
git commit -m "refactor(editor): 擴充編輯器快捷鍵系統

- 新增 Ctrl+Z (撤銷) 和 Ctrl+Shift+Z (重做)
- 新增 Ctrl+F (搜尋) 和 Ctrl+H (替換)
- 統一快捷鍵處理邏輯

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

完成！✅ 所有核心功能已準備就緒，等待整合到 MainEditor.vue 中。
