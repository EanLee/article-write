---
title: "正確的開發優先級路線圖"
domain: delivery
type: plan
status: approved
owner: tech-team
updated: 2026-02-02
source_of_truth: true
---

# 正確的開發優先級路線圖

**核心原則**: 先打好基礎，再添加 AI 能力

> **基礎編輯器體驗 → 工作流完善 → AI 輔助功能 → 進階特性**

---

## 🎯 開發階段概覽

```
階段 0: 基礎修復與體驗優化 (1 週)          ← 當前應該做的
階段 1: 編輯器核心功能完善 (2 週)          ← 最重要
階段 2: 寫作工作流優化 (2 週)
階段 3: AI 輔助功能 (3 週)
階段 4: 進階特性 (2-4 週)
```

---

## 📋 階段 0: 基礎修復與體驗優化（1 週）

### 必須立即修復的問題

#### 1. Content Security Policy 設定 ✅ (已完成)
- 修復 Electron 安全警告
- 設定適當的 CSP headers

#### 2. 基礎 UI/UX 問題修復 (2 天)

**問題清單**:

```typescript
// 1. 文章列表選中狀態不明顯
問題: 當前選中的文章視覺反饋不足
影響: 用戶不確定正在編輯哪篇文章
優先級: P0

修復建議:
- 選中文章使用明顯的背景色（藍色/綠色）
- 添加左側邊框或圖標
- 使用不同的字重


// 2. 編輯器工具列混亂
問題: 純文字按鈕，視覺層級不清
影響: 用戶找不到功能
優先級: P0

修復建議:
- 使用圖標代替文字
- 功能分組（儲存 | 格式 | 插入 | 視圖）
- 添加分隔線


// 3. 缺少儲存狀態的明確提示
問題: 用戶不確定文章是否已儲存
影響: 可能導致內容遺失的焦慮
優先級: P0

修復建議:
- 明顯的儲存狀態指示器
- 未儲存時顯示警告圖標
- 儲存成功時顯示綠色勾選（短暫）


// 4. 錯誤訊息不友善
問題: 錯誤訊息過於技術性
影響: 用戶不知道如何解決問題
優先級: P1

修復建議:
- 使用平易近人的語言
- 提供具體的解決步驟
- 添加「查看詳情」選項
```

**實作清單**:
- [ ] 改善文章列表選中狀態視覺設計
- [ ] 重新設計編輯器工具列（圖標化）
- [ ] 改善儲存狀態指示器
- [ ] 優化錯誤訊息與提示

---

#### 3. 關鍵缺失功能補完 (3 天)

**必須有的基礎功能**:

```typescript
// 1. 全局撤銷/重做
問題: 目前依賴瀏覽器原生 Ctrl+Z
限制: 無法跨模式、無法視覺化歷史
優先級: P0

實作:
- 實作完整的 Undo/Redo 堆疊
- 快捷鍵: Ctrl+Z / Ctrl+Shift+Z
- （進階）顯示歷史操作清單


// 2. 搜尋與替換
問題: 目前無法在編輯器中搜尋文字
影響: 長文章難以定位與修改
優先級: P0

實作:
- Ctrl+F: 搜尋
- Ctrl+H: 替換
- 搜尋工具列（顯示匹配數量）
- 支援正則表達式（進階）


// 3. 字數統計（即時）
問題: 目前僅在預覽面板顯示
影響: 用戶需要開啟預覽才能看到字數
優先級: P1

實作:
- 編輯器狀態列即時顯示字數
- 顯示選取文字的字數
- 顯示段落數、句子數


// 4. 行號顯示
問題: 無法快速定位特定行
影響: 多人協作時難以溝通位置
優先級: P1

實作:
- 可切換的行號顯示
- 顯示當前游標位置（行:列）
- 點擊行號選取整行
```

**實作清單**:
- [ ] 實作完整的撤銷/重做系統
- [ ] 實作編輯器內搜尋與替換功能
- [ ] 在狀態列添加即時字數統計
- [ ] 添加行號顯示選項

---

## 📝 階段 1: 編輯器核心功能完善（2 週）

### 1.1 編輯器基礎功能強化 (4 天)

#### A. 同步滾動 (1 天) - P0

**問題**: 編輯器與預覽面板不同步

**實作方案**:
```typescript
// src/composables/useSyncScroll.ts

export function useSyncScroll(
  editorRef: Ref<HTMLTextAreaElement>,
  previewRef: Ref<HTMLElement>
) {
  const syncEnabled = ref(true)
  
  // 編輯器滾動 → 預覽同步
  function onEditorScroll() {
    if (!syncEnabled.value) return
    
    const editor = editorRef.value
    const preview = previewRef.value
    
    // 計算滾動百分比
    const scrollPercentage = 
      editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
    
    // 應用到預覽
    preview.scrollTop = 
      scrollPercentage * (preview.scrollHeight - preview.clientHeight)
  }
  
  // 預覽滾動 → 編輯器同步（可選）
  function onPreviewScroll() {
    // 類似邏輯
  }
  
  return { syncEnabled, onEditorScroll, onPreviewScroll }
}
```

---

#### B. 進階搜尋與替換 (1 天) - P0

**UI 設計**:
```
編輯器上方顯示搜尋列:

┌─────────────────────────────────────────────────┐
│ 🔍 [搜尋________] [↑] [↓] [Aa] [.*] [✕]         │
│    第 3/12 個匹配                               │
│                                                 │
│ 🔄 [替換________] [替換] [全部替換]             │
└─────────────────────────────────────────────────┘

按鈕說明:
↑/↓   - 上一個/下一個匹配
Aa    - 區分大小寫
.*    - 正則表達式模式
✕     - 關閉搜尋
```

**功能**:
- 即時高亮匹配文字
- 顯示匹配數量
- 支援正則表達式
- 支援全部替換
- Esc 關閉搜尋

---

#### C. 拖放與剪貼簿增強 (2 天) - P1

**功能 1: 圖片拖放上傳**
```typescript
// 編輯器拖放處理

function onDrop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files) return
  
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      // 1. 複製圖片到專案圖片目錄
      const imagePath = await uploadImage(file)
      
      // 2. 插入 Markdown 語法
      const markdown = `![${file.name}](${imagePath})`
      insertAtCursor(markdown)
    }
    
    if (file.name.endsWith('.md')) {
      // 開啟 Markdown 文件
      openArticle(file.path)
    }
  }
}
```

**功能 2: 剪貼簿圖片貼上**
```typescript
function onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      
      const blob = item.getAsFile()
      const imagePath = await uploadImage(blob)
      
      insertAtCursor(`![貼上的圖片](${imagePath})`)
    }
  }
}
```

**功能 3: 智慧貼上**
```typescript
function onSmartPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text/plain')
  const html = event.clipboardData?.getData('text/html')
  
  // 如果是 URL，自動轉為連結
  if (isURL(text)) {
    event.preventDefault()
    insertAtCursor(`[${text}](${text})`)
  }
  
  // 如果是 HTML，轉為 Markdown
  if (html) {
    event.preventDefault()
    const markdown = htmlToMarkdown(html)
    insertAtCursor(markdown)
  }
}
```

---

### 1.2 快捷鍵系統完善 (2 天) - P0

#### 完整的快捷鍵清單

**目前已有**:
```
Ctrl+S    - 儲存
Ctrl+B    - 粗體
Ctrl+I    - 斜體
Ctrl+K    - 插入連結
Ctrl+E    - 高亮
Ctrl+/    - 切換預覽
```

**必須新增**:
```typescript
// 基礎編輯
Ctrl+Z           - 撤銷
Ctrl+Shift+Z     - 重做
Ctrl+X           - 剪下
Ctrl+C           - 複製
Ctrl+V           - 貼上
Ctrl+A           - 全選
Ctrl+D           - 刪除當前行
Ctrl+Shift+D     - 複製當前行
Ctrl+L           - 選取當前行

// 搜尋與導航
Ctrl+F           - 搜尋
Ctrl+H           - 替換
Ctrl+G           - 跳到指定行
Ctrl+Home        - 跳到文件開頭
Ctrl+End         - 跳到文件結尾

// 格式化
Ctrl+1~6         - 標題 H1~H6
Ctrl+Shift+K     - 插入程式碼區塊
Ctrl+Shift+L     - 插入清單
Ctrl+Shift+O     - 插入有序清單
Ctrl+Shift+C     - 插入引用

// 視圖切換
Ctrl+\           - 切換側邊欄
Ctrl+Shift+P     - 命令面板（未來）
F11              - 全螢幕/專注模式

// 文章操作
Ctrl+N           - 新建文章
Ctrl+W           - 關閉當前文章
Ctrl+Tab         - 下一篇文章（如果有多文章標籤）
Ctrl+Shift+Tab   - 上一篇文章
```

**實作**:
```typescript
// src/composables/useEditorShortcuts.ts (擴充版)

export function useEditorShortcuts(editor: Ref<HTMLTextAreaElement>) {
  function handleKeydown(event: KeyboardEvent) {
    const ctrl = event.ctrlKey || event.metaKey
    const shift = event.shiftKey
    const key = event.key
    
    // 基礎編輯
    if (ctrl && key === 'z' && !shift) {
      event.preventDefault()
      undo()
    }
    if (ctrl && key === 'z' && shift) {
      event.preventDefault()
      redo()
    }
    if (ctrl && key === 'd') {
      event.preventDefault()
      deleteLine()
    }
    
    // 搜尋
    if (ctrl && key === 'f') {
      event.preventDefault()
      openSearchPanel()
    }
    if (ctrl && key === 'h') {
      event.preventDefault()
      openReplacePanel()
    }
    
    // 格式化
    if (ctrl && /^[1-6]$/.test(key)) {
      event.preventDefault()
      insertHeading(parseInt(key))
    }
    
    // ... 其他快捷鍵
  }
  
  onMounted(() => {
    editor.value?.addEventListener('keydown', handleKeydown)
  })
  
  onUnmounted(() => {
    editor.value?.removeEventListener('keydown', handleKeydown)
  })
}
```

**顯示快捷鍵提示**:
```
按下 ? 或 Ctrl+? 顯示快捷鍵清單

┌─────────────────────────────────────────────────┐
│              快捷鍵清單                         │
├─────────────────────────────────────────────────┤
│ 基礎編輯                                        │
│   Ctrl+Z        撤銷                            │
│   Ctrl+Shift+Z  重做                            │
│   Ctrl+S        儲存                            │
│   Ctrl+F        搜尋                            │
│                                                 │
│ 格式化                                          │
│   Ctrl+B        粗體                            │
│   Ctrl+I        斜體                            │
│   Ctrl+1~6      標題 H1~H6                      │
│                                                 │
│ 視圖                                            │
│   Ctrl+/        切換預覽                        │
│   F11           全螢幕模式                      │
│                                                 │
│ [列印] [關閉]                                   │
└─────────────────────────────────────────────────┘
```

---

### 1.3 編輯器 UI 改善 (3 天) - P1

#### A. 改善工具列設計 (1 天)

**目前問題**: 純文字按鈕，功能不明顯

**改善設計**:
```
┌─────────────────────────────────────────────────┐
│ [💾] [↶] [↷] │ [H▼] [B] [I] [≡] [{}] │ [👁] [⚙] │
│  儲 撤 重做  │ 標題 粗 斜 連結 程式碼│ 預覽 設定│
└─────────────────────────────────────────────────┘

使用 lucide-vue-next 圖標:
- Save (💾)
- Undo (↶)
- Redo (↷)
- Heading (H)
- Bold (B)
- Italic (I)
- Link (🔗)
- Code (</> 或 {})
- Eye (👁)
- Settings (⚙)
```

**圖標按鈕組件**:
```vue
<!-- ToolbarButton.vue -->
<template>
  <button 
    class="toolbar-btn"
    :class="{ active: isActive }"
    :title="`${label} (${shortcut})`"
    @click="onClick"
  >
    <component :is="icon" :size="18" />
  </button>
</template>

<script setup lang="ts">
import { Save, Undo, Redo, Bold, Italic } from 'lucide-vue-next'

defineProps<{
  icon: Component
  label: string
  shortcut: string
  isActive?: boolean
}>()
</script>

<style scoped>
.toolbar-btn {
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.toolbar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.toolbar-btn.active {
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
}
</style>
```

---

#### B. 狀態列設計 (1 天)

**顯示資訊**:
```
編輯器底部狀態列:

┌─────────────────────────────────────────────────┐
│                                                 │
│  [編輯區域]                                      │
│                                                 │
└─────────────────────────────────────────────────┘
  第 42 行，第 15 列 | 字數: 1,234 | 💾 已儲存 (2 秒前)
  
滑鼠移到狀態項目顯示更多資訊:
  字數: 1,234 
    ↓ (Hover)
  字數: 1,234 字
  段落: 12 段
  字元: 5,678 字元 (含空格)
```

**實作**:
```vue
<!-- EditorStatusBar.vue -->
<template>
  <div class="status-bar">
    <div class="status-item">
      第 {{ lineNumber }} 行，第 {{ columnNumber }} 列
    </div>
    
    <div class="status-item" :title="wordCountDetail">
      字數: {{ wordCount }}
    </div>
    
    <div class="status-item" :class="saveStatusClass">
      <component :is="saveIcon" :size="14" />
      {{ saveStatusText }}
    </div>
    
    <div class="status-item clickable" @click="toggleSyncScroll">
      <component :is="syncScrollIcon" :size="14" />
      同步滾動
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Save, Check, AlertCircle, Link, LinkOff } from 'lucide-vue-next'

// 儲存狀態圖標
const saveIcon = computed(() => {
  switch (saveStatus.value) {
    case 'saved': return Check
    case 'saving': return Save
    case 'error': return AlertCircle
    default: return Save
  }
})

// 同步滾動圖標
const syncScrollIcon = computed(() => 
  syncScrollEnabled.value ? Link : LinkOff
)
</script>
```

---

#### C. 專注模式 (1 天)

**功能**: 隱藏所有干擾元素，全螢幕沉浸式寫作

**UI 設計**:
```
一般模式:
┌────────────┬────────────────┬──────────────┐
│  側邊欄    │   編輯器       │   預覽       │
└────────────┴────────────────┴──────────────┘

按 F11 進入專注模式:
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│         [編輯器全螢幕，最大寬度 800px]          │
│         [其他元素全部隱藏]                       │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘

底部懸浮工具列（滑鼠移到底部顯示）:
    [字數: 1,234] [退出專注模式 (F11)]
```

**實作**:
```typescript
// src/composables/useFocusMode.ts

export function useFocusMode() {
  const isFocusMode = ref(false)
  
  function enterFocusMode() {
    isFocusMode.value = true
    document.body.classList.add('focus-mode')
    
    // 隱藏元素
    document.querySelector('.sidebar')?.classList.add('hidden')
    document.querySelector('.toolbar')?.classList.add('hidden')
    document.querySelector('.preview')?.classList.add('hidden')
    
    // 編輯器全螢幕
    document.querySelector('.editor')?.classList.add('fullscreen')
  }
  
  function exitFocusMode() {
    isFocusMode.value = false
    document.body.classList.remove('focus-mode')
    
    // 恢復元素
    document.querySelector('.sidebar')?.classList.remove('hidden')
    document.querySelector('.toolbar')?.classList.remove('hidden')
    document.querySelector('.preview')?.classList.remove('hidden')
    document.querySelector('.editor')?.classList.remove('fullscreen')
  }
  
  function toggleFocusMode() {
    isFocusMode.value ? exitFocusMode() : enterFocusMode()
  }
  
  // F11 切換
  onMounted(() => {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFocusMode()
      }
    })
  })
  
  return { isFocusMode, enterFocusMode, exitFocusMode, toggleFocusMode }
}
```

**CSS**:
```css
/* 專注模式樣式 */
body.focus-mode {
  overflow: hidden;
}

.editor.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: var(--bg-color);
  padding: 80px 20px;
}

.editor.fullscreen textarea {
  max-width: 800px;
  margin: 0 auto;
  font-size: 18px;
  line-height: 1.8;
}
```

---

### 1.4 自動完成增強 (2 天) - P1

**目前狀態**: 有基礎自動完成（Wiki Links、圖片、標籤）

**需要增強**:

#### A. 更智慧的觸發時機
```typescript
// 目前: 輸入 [[ 或 ![ 或 # 時觸發
// 改善: 更多觸發情境

const triggers = {
  '[[': 'wikilink',      // Wiki 連結
  '![': 'image',         // 圖片
  '#': 'tag',            // 標籤
  '@': 'mention',        // 提及（如果有協作功能）
  ':': 'emoji',          // Emoji（可選）
  '/': 'command',        // 斜線命令（類似 Notion）
}
```

#### B. 斜線命令（Slash Commands）
```typescript
// 輸入 / 觸發命令選單

命令清單:
/h1, /h2, /h3...    - 插入標題
/code              - 插入程式碼區塊
/table             - 插入表格
/img               - 插入圖片
/link              - 插入連結
/quote             - 插入引用
/hr                - 插入分隔線
/todo              - 插入待辦清單
/date              - 插入當前日期
/time              - 插入當前時間
```

**UI**:
```
編輯器中輸入 /

┌─────────────────────────────────────────────────┐
│ / [搜尋命令______]                              │
├─────────────────────────────────────────────────┤
│ 📝 /h1          插入一級標題                    │
│ 📝 /h2          插入二級標題                    │
│ 💻 /code        插入程式碼區塊                  │
│ 📊 /table       插入表格                        │
│ 🖼️ /img         插入圖片                        │
│ 🔗 /link        插入連結                        │
│ 💬 /quote       插入引用                        │
│ ➖ /hr          插入分隔線                      │
│ ☑️ /todo        插入待辦清單                    │
│ 📅 /date        插入日期 (2026-01-24)          │
└─────────────────────────────────────────────────┘

↑/↓ 選擇  Enter 插入  Esc 取消
```

**實作**:
```typescript
// src/composables/useSlashCommands.ts

export function useSlashCommands() {
  const commands = [
    {
      name: 'h1',
      label: '一級標題',
      icon: '📝',
      template: '# ',
    },
    {
      name: 'code',
      label: '程式碼區塊',
      icon: '💻',
      template: '```\n\n```',
      cursorOffset: -4, // 游標位置偏移
    },
    {
      name: 'table',
      label: '表格',
      icon: '📊',
      template: `
| 欄位 1 | 欄位 2 | 欄位 3 |
|--------|--------|--------|
|        |        |        |
`,
    },
    {
      name: 'date',
      label: '插入日期',
      icon: '📅',
      template: () => new Date().toISOString().split('T')[0],
    },
    // ... 更多命令
  ]
  
  function executeCommand(command: Command) {
    const template = 
      typeof command.template === 'function' 
        ? command.template() 
        : command.template
    
    insertAtCursor(template, command.cursorOffset)
  }
  
  return { commands, executeCommand }
}
```

---

### 1.5 多文章標籤支援 (3 天) - P2

**問題**: 目前一次只能編輯一篇文章，切換文章時會關閉當前文章

**改善**: 類似瀏覽器的多標籤介面

**UI 設計**:
```
┌─────────────────────────────────────────────────┐
│ [Vue 3 進階.md ✕] [React Hooks.md ✕] [+]       │
├─────────────────────────────────────────────────┤
│                                                 │
│  [當前文章編輯區域]                              │
│                                                 │
└─────────────────────────────────────────────────┘

功能:
- 點擊標籤切換文章
- 點擊 ✕ 關閉標籤
- 點擊 + 開啟新標籤
- 拖曳標籤重新排序
- Ctrl+Tab / Ctrl+Shift+Tab 切換標籤
- Ctrl+W 關閉當前標籤
```

**實作**:
```typescript
// src/stores/editorTabs.ts

interface EditorTab {
  id: string
  article: Article
  content: string
  cursorPosition: number
  scrollPosition: number
  isDirty: boolean // 是否有未儲存的變更
}

export const useEditorTabsStore = defineStore('editorTabs', () => {
  const tabs = ref<EditorTab[]>([])
  const activeTabId = ref<string | null>(null)
  
  // 開啟新標籤
  function openTab(article: Article) {
    const existingTab = tabs.value.find(t => t.article.id === article.id)
    
    if (existingTab) {
      // 切換到已存在的標籤
      activeTabId.value = existingTab.id
    } else {
      // 建立新標籤
      const newTab: EditorTab = {
        id: generateId(),
        article,
        content: article.content,
        cursorPosition: 0,
        scrollPosition: 0,
        isDirty: false,
      }
      
      tabs.value.push(newTab)
      activeTabId.value = newTab.id
    }
  }
  
  // 關閉標籤
  function closeTab(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    
    // 如果有未儲存的變更，提示確認
    if (tab?.isDirty) {
      const confirmed = confirm('文章有未儲存的變更，確定要關閉嗎？')
      if (!confirmed) return
    }
    
    tabs.value = tabs.value.filter(t => t.id !== tabId)
    
    // 如果關閉的是當前標籤，切換到最後一個標籤
    if (activeTabId.value === tabId && tabs.value.length > 0) {
      activeTabId.value = tabs.value[tabs.value.length - 1].id
    }
  }
  
  // 切換標籤
  function switchTab(direction: 'next' | 'prev') {
    const currentIndex = tabs.value.findIndex(t => t.id === activeTabId.value)
    
    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % tabs.value.length
      activeTabId.value = tabs.value[nextIndex].id
    } else {
      const prevIndex = (currentIndex - 1 + tabs.value.length) % tabs.value.length
      activeTabId.value = tabs.value[prevIndex].id
    }
  }
  
  return { tabs, activeTabId, openTab, closeTab, switchTab }
})
```

---

## 📊 階段 2: 寫作工作流優化（2 週）

### 2.1 文章模板系統 (3 天) - P1

（保留之前的設計）

### 2.2 發佈前檢查清單 (2 天) - P1

**功能**: 發佈前自動檢查文章品質

```
點擊「發佈」按鈕時，顯示檢查清單:

┌─────────────────────────────────────────────────┐
│ 📋 發佈前檢查清單                               │
├─────────────────────────────────────────────────┤
│ ✅ 已完成:                                      │
│   ✓ 有標題                                      │
│   ✓ 有描述                                      │
│   ✓ 有標籤                                      │
│   ✓ 字數 > 500                                  │
│   ✓ 有標題結構 (H2, H3)                         │
│                                                 │
│ ⚠️ 建議改善:                                    │
│   ⚠ 缺少封面圖片                                │
│   ⚠ 標題過長 (65 字元，建議 < 60)               │
│   ⚠ 描述過短 (80 字元，建議 120-160)            │
│                                                 │
│ ❌ 必須修正:                                    │
│   ✗ 有 2 個斷鏈 (連結到不存在的文章)             │
│   ✗ 有 1 張圖片缺少 alt 文字                    │
│                                                 │
│ ☐ 我已確認所有內容正確                          │
│                                                 │
│ [修正問題] [仍要發佈] [取消]                    │
└─────────────────────────────────────────────────┘
```

### 2.3 寫作統計儀表板 (3 天) - P2

（顯示寫作習慣、生產力統計）

### 2.4 版本歷史與復原 (5 天) - P1

（之前設計的本地版本歷史系統）

---

## 🤖 階段 3: AI 輔助功能（3 週）

**只有在階段 1、2 完成後才開始**

### 3.1 AI 核心功能 (2 週)
- AI 續寫
- AI 改寫
- AI 語法檢查
- AI SEO 分析

### 3.2 AI 進階功能 (1 週)
- AI 資料查詢
- AI 標題生成
- AI 翻譯

---

## 🌟 階段 4: 進階特性（2-4 週）

### 4.1 可選的進階功能
- 關係圖視圖（僅作為視覺化輔助）
- Git 整合
- 協作功能
- 自訂主題

---

## 📊 重新調整的優先級總覽

### 立即開始（本週）- 階段 0
```
1. ✅ CSP 設定（已完成）
2. 🔴 基礎 UI/UX 修復（2 天）
   - 文章列表選中狀態
   - 工具列設計
   - 儲存狀態指示
   
3. 🔴 關鍵缺失功能（3 天）
   - 撤銷/重做
   - 搜尋/替換
   - 字數統計
   - 行號顯示
```

### 第 2-3 週 - 階段 1
```
4. 🔴 編輯器核心強化（4 天）
   - 同步滾動
   - 進階搜尋/替換
   - 拖放圖片上傳
   - 智慧貼上
   
5. 🔴 快捷鍵系統（2 天）
   
6. 🟡 UI 改善（3 天）
   - 工具列圖標化
   - 狀態列
   - 專注模式
   
7. 🟡 自動完成增強（2 天）
   - 斜線命令
   
8. 🟢 多文章標籤（3 天）
```

### 第 4-5 週 - 階段 2
```
9. 文章模板
10. 發佈檢查清單
11. 版本歷史
12. 寫作統計
```

### 第 6-8 週 - 階段 3
```
13. AI 功能開始實作
```

---

## 🎯 總結

您完全正確！**基礎編輯功能才是根本**。

### 正確的開發順序

```
第 1 優先: 編輯器好用 ✍️
  → 能舒服地寫作
  → 不會有挫折感
  → 基本功能完整

第 2 優先: 工作流順暢 🔄
  → 從起草到發佈流程清晰
  → 模板、檢查、版本控制

第 3 優先: AI 錦上添花 ✨
  → 在好用的編輯器基礎上
  → 添加智慧輔助功能
  → 提升效率與品質

第 4 優先: 進階特性 🚀
  → 視覺化、協作等
```

### 建議立即開始

**本週工作清單**（5 天）:
- [ ] Day 1-2: 基礎 UI/UX 修復
  - [ ] 改善文章列表選中狀態
  - [ ] 重新設計工具列（圖標化）
  - [ ] 改善儲存狀態指示器
  - [ ] 優化錯誤訊息

- [ ] Day 3-5: 關鍵缺失功能
  - [ ] 實作完整撤銷/重做
  - [ ] 實作搜尋/替換功能
  - [ ] 添加即時字數統計
  - [ ] 添加行號顯示

**這 5 天的改進會立即提升編輯體驗！**

---

需要我提供任何功能的詳細實作程式碼嗎？