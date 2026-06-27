<template>
  <div :class="showPreview ? 'w-1/2' : 'w-full'" class="flex flex-col">
    <!-- Editor Content Area -->
    <div class="flex-1 relative overflow-hidden">
      <div ref="containerRef" class="h-full cm-editor-wrapper"></div>

      <!-- Syntax Errors and Image Validation Panel -->
      <div
        v-if="syntaxErrors.length > 0 || imageValidationWarnings.length > 0"
        class="absolute bottom-0 left-0 right-0 bg-base-200 border-t border-base-300 max-h-40 overflow-y-auto"
      >
        <div class="p-2">
          <div v-if="syntaxErrors.length > 0" class="mb-2">
            <div class="text-xs font-semibold text-error mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              語法問題 ({{ syntaxErrors.length }})
            </div>
            <div
              v-for="(error, index) in syntaxErrors"
              :key="index"
              class="text-xs mb-1 p-2 rounded border-l-2"
              :class="error.type === 'error' ? 'bg-error/10 border-error text-error' : 'bg-warning/10 border-warning text-warning'"
            >
              <span class="font-mono font-semibold">第 {{ error.line }} 行:</span>
              <span class="ml-1">{{ error.message }}</span>
              <div v-if="error.suggestion" class="text-xs opacity-70 mt-1">💡 {{ error.suggestion }}</div>
            </div>
          </div>
          <div v-if="imageValidationWarnings.length > 0">
            <div class="text-xs font-semibold text-warning mb-1">圖片驗證 ({{ imageValidationWarnings.length }})</div>
            <div
              v-for="(warning, index) in imageValidationWarnings"
              :key="index"
              class="text-xs mb-1 p-2 rounded border-l-2"
              :class="warning.severity === 'error' ? 'bg-error/10 border-error text-error' : 'bg-warning/10 border-warning text-warning'"
            >
              <span class="font-mono font-semibold">第 {{ warning.line }} 行:</span>
              <span class="ml-1">{{ warning.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <EditorStatusBar
      :content="modelValue"
      :cursor-position="cursorPos"
      :selection-start="selStart"
      :selection-end="selEnd"
      :show-preview="showPreview"
      :sync-scroll="syncScroll"
      :show-line-numbers="true"
      :word-wrap="wordWrap"
      @toggle-sync-scroll="$emit('toggle-sync-scroll')"
      @toggle-line-numbers="$emit('toggle-line-numbers')"
      @toggle-word-wrap="toggleWordWrap"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef, computed } from "vue"
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, rectangularSelection } from "@codemirror/view"
import { EditorState, type Extension, type TransactionSpec } from "@codemirror/state"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { defaultKeymap, history, historyKeymap, indentWithTab, deleteLine, copyLineDown } from "@codemirror/commands"
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  type CompletionContext,
  type Completion,
} from "@codemirror/autocomplete"
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import type { Command } from "@codemirror/view"
import {
  toggleInlineFormatSpec,
  toggleHeadingSpec,
  insertLinkSpec,
  insertCodeBlockSpec,
  insertFootnoteSpec,
  insertStrikethroughSpec,
} from "@/utils/editorCommands"
import { autoSaveService } from "@/services/AutoSaveService"
import type { SuggestionItem, SyntaxError } from "@/services/ObsidianSyntaxService"
import type { ImageValidationWarning } from "@/types/image"
import EditorStatusBar from "./EditorStatusBar.vue"

// ─── OutlineHeading ───────────────────────────────────────────────────────────

export interface OutlineHeading {
  level: number   // 1–6
  text: string
  line: number    // 0-indexed line number in document
}

// ─── Props & Emits ────────────────────────────────────────────────────────────

interface Props {
  modelValue: string
  showPreview: boolean
  suggestions: SuggestionItem[]
  showSuggestions: boolean
  selectedSuggestionIndex: number
  syntaxErrors: SyntaxError[]
  imageValidationWarnings: ImageValidationWarning[]
  dropdownPosition: { top: number; left: number }
  syncScroll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  syncScroll: false,
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
  "insert-markdown": [before: string, after: string, placeholder: string]
  "insert-table": []
  "keydown": [event: KeyboardEvent]
  "cursor-change": []
  "apply-suggestion": [suggestion: SuggestionItem]
  "toggle-sync-scroll": []
  "toggle-line-numbers": []
  "toggle-word-wrap": []
  "scroll": []
  "outline-change": [headings: OutlineHeading[]]
  "drop-image": [file: File, pos: number]
  "paste-image": [file: File]
  "paste-url": [url: string]
}>()

// ─── Refs ────────────────────────────────────────────────────────────────────

const containerRef = ref<HTMLElement>()
const editorView = shallowRef<EditorView>()
const wordWrap = ref(true)

// 狀態列資料
const cursorPos = ref(0)
const selStart = ref(0)
const selEnd = ref(0)

// 防止 v-model 循環更新
let isInternalUpdate = false

// ─── ObsidianSyntaxService → CM6 CompletionSource ────────────────────────────

/**
 * 將 ObsidianSyntaxService.getAutocompleteSuggestions 包裝成 CM6 CompletionSource
 * 核心 regex 邏輯保留在 ObsidianSyntaxService，此處只做介面轉換（~30 行）
 */
function createObsidianCompletionSource(getSuggestions: (text: string, pos: number) => SuggestionItem[]) {
  return (ctx: CompletionContext) => {
    const text = ctx.state.doc.toString()
    const pos = ctx.pos
    const beforeCursor = text.substring(0, pos)

    // 只在 [[、![[、# 前綴後觸發（與 ObsidianSyntaxService 邏輯一致）
    const isTriggered =
      /!\[\[[^\]]*?$/.test(beforeCursor) ||
      /\[\[[^\]]*?$/.test(beforeCursor) ||
      /#[a-zA-Z0-9\u4e00-\u9fff]*?$/.test(beforeCursor)

    if (!isTriggered && !ctx.explicit) { return null }

    const items = getSuggestions(text, pos)
    if (items.length === 0) { return null }

    const completions: Completion[] = items.map(item => ({
      label: item.displayText,
      apply: item.text,
      detail: item.description,
      type: item.type === "wikilink" ? "keyword" : item.type === "image" ? "variable" : "type",
    }))

    return { from: pos, options: completions, validFor: /^[^\]]*$/ }
  }
}

// ─── Slash Commands CompletionSource ──────────────────────────────────────────

/**
 * 建立斜線命令 CompletionSource：輸入 / 觸發命令選單
 * 選擇後以 view.dispatch 替換 /command 文字並插入 Markdown 語法
 */
function createSlashCommandSource() {
  return (ctx: CompletionContext) => {
    const match = ctx.matchBefore(/\/\w*/)
    if (!match) { return null }

    const today = new Date().toLocaleDateString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
    })

    const commands: Completion[] = [
      {
        label: "/h1", detail: "一級標題",
        apply(view, _c, from, to) {
          view.dispatch({ changes: { from, to, insert: "# " }, selection: { anchor: from + 2 } })
        },
      },
      {
        label: "/h2", detail: "二級標題",
        apply(view, _c, from, to) {
          view.dispatch({ changes: { from, to, insert: "## " }, selection: { anchor: from + 3 } })
        },
      },
      {
        label: "/h3", detail: "三級標題",
        apply(view, _c, from, to) {
          view.dispatch({ changes: { from, to, insert: "### " }, selection: { anchor: from + 4 } })
        },
      },
      {
        label: "/code", detail: "程式碼區塊",
        apply(view, _c, from, to) {
          const insert = "```\n\n```"
          view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + 4 } })
        },
      },
      {
        label: "/table", detail: "表格",
        apply(view, _c, from, to) {
          const insert = "| 欄位 1 | 欄位 2 |\n| --- | --- |\n| 內容 | 內容 |"
          view.dispatch({ changes: { from, to, insert }, selection: { anchor: from } })
        },
      },
      {
        label: "/date", detail: today,
        apply(view, _c, from, to) {
          view.dispatch({ changes: { from, to, insert: today }, selection: { anchor: from + today.length } })
        },
      },
    ]

    return { from: match.from, options: commands, validFor: /^\/\w*$/ }
  }
}

// ─── 選取後符號包裹 Extension ─────────────────────────────────────────────────

/**
 * 自訂 Extension：選取文字時輸入配對符號，自動包裹選取內容
 * 例：選取 "hello" 後按 *，變成 *hello*
 */
const wrapSelectionExtension = EditorView.domEventHandlers({
  keydown(event, view) {
    const wrapPairs: Record<string, [string, string]> = {
      "*": ["*", "*"],
      "_": ["_", "_"],
      "`": ["`", "`"],
      "~": ["~", "~"],
    }

    const pair = wrapPairs[event.key]
    if (!pair) { return false }

    const { state } = view
    const sel = state.selection.main
    if (sel.empty) { return false } // 無選取，不攔截

    // 有選取時：包裹選取內容
    event.preventDefault()
    const selectedText = state.sliceDoc(sel.from, sel.to)
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: `${pair[0]}${selectedText}${pair[1]}` },
      selection: { anchor: sel.from + pair[0].length, head: sel.to + pair[0].length },
    })
    return true
  },
})

// ─── ** 雙星號自動補全 Extension ──────────────────────────────────────────────

/**
 * closeBrackets 不支援 ** 雙字元配對
 * 此 Extension 偵測輸入第二個 * 時，若前一字元也是 *，則補全為 ****，游標置中
 */
const doubleStarExtension = EditorView.inputHandler.of((view, _from, _to, insert) => {
  if (insert !== "*") { return false }
  const sel = view.state.selection.main
  if (!sel.empty) { return false }

  const charBefore = view.state.sliceDoc(sel.from - 1, sel.from)
  if (charBefore !== "*") { return false }

  // 前一字元是 *，補全為 ****，游標在中間（位置 from + 1，即兩個 * 之間）
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: "***" },
    selection: { anchor: sel.from + 1 },
  })
  return true
})

// ─── Formatting Commands ──────────────────────────────────────────────────────

function makeFormatCommand(
  specFn: (state: EditorState) => TransactionSpec,
): Command {
  return (view) => {
    view.dispatch(view.state.update(specFn(view.state)))
    return true
  }
}

const formattingKeymap = keymap.of([
  { key: "Mod-b", run: makeFormatCommand(s => toggleInlineFormatSpec("**", "bold text", s)) },
  { key: "Mod-i", run: makeFormatCommand(s => toggleInlineFormatSpec("*", "italic text", s)) },
  { key: "Mod-k", run: makeFormatCommand(s => insertLinkSpec(s)) },
  { key: "Mod-Shift-c", run: makeFormatCommand(s => insertCodeBlockSpec(s)) },
  { key: "Mod-Shift-x", run: makeFormatCommand(s => insertStrikethroughSpec(s)) },
  { key: "Mod-Shift-f", run: makeFormatCommand(s => insertFootnoteSpec(s)) },
  { key: "Mod-1", run: makeFormatCommand(s => toggleHeadingSpec(1, s)) },
  { key: "Mod-2", run: makeFormatCommand(s => toggleHeadingSpec(2, s)) },
  { key: "Mod-3", run: makeFormatCommand(s => toggleHeadingSpec(3, s)) },
  { key: "Mod-4", run: makeFormatCommand(s => toggleHeadingSpec(4, s)) },
  { key: "Mod-5", run: makeFormatCommand(s => toggleHeadingSpec(5, s)) },
  { key: "Mod-6", run: makeFormatCommand(s => toggleHeadingSpec(6, s)) },
])

// ─── 編輯快捷鍵 ──────────────────────────────────────────────────────────────

/** Ctrl+G：彈出行號輸入框，捲動至指定行並移動游標 */
function jumpToLineCommand(view: EditorView): boolean {
  const input = window.prompt("跳至行號：")
  if (!input) { return false }
  const lineNum = parseInt(input, 10)
  if (isNaN(lineNum) || lineNum < 1) { return false }
  const target = Math.min(lineNum, view.state.doc.lines)
  const line = view.state.doc.line(target)
  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: "center", yMargin: 80 }),
  })
  view.focus()
  return true
}

const editingKeymap = keymap.of([
  { key: "Mod-g", run: jumpToLineCommand },    // 跳至指定行
  { key: "Mod-d", run: deleteLine },            // 刪除當前行
  { key: "Mod-Shift-d", run: copyLineDown },    // 複製當前行至下一行
])

// ─── EditorView 初始化 ────────────────────────────────────────────────────────

// 解析標題供大綱面板使用（初次掛載與內容變更時都需呼叫）
function emitOutline(doc: EditorState["doc"]) {
  const headings: OutlineHeading[] = []
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const match = line.text.match(/^(#{1,6})\s+(.+)/)
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), line: i - 1 })
    }
  }
  emit("outline-change", headings)
}

const buildExtensions =(getSuggestions: ((text: string, pos: number) => SuggestionItem[]) | null): Extension[] => [
  // Markdown 語法高亮
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  syntaxHighlighting(defaultHighlightStyle),

  // 行號（CM6 內建，取代手工 Vue computed）
  lineNumbers(),

  // 當前行高亮
  highlightActiveLine(),

  // 多選與矩形選取
  drawSelection(),
  rectangularSelection(),

  // Undo/Redo 歷史
  history(),

  // 括號 / 符號自動補全（`、(、[、{）
  closeBrackets(),

  // 自動縮排
  indentOnInput(),

  // 自訂：選取後符號包裹
  wrapSelectionExtension,

  // 自訂：** 雙星號補全
  doubleStarExtension,

  // 自動完成：斜線命令永遠啟用，Obsidian wikilink/tag 在有 getSuggestions 時加入
  autocompletion({
    override: [
      createSlashCommandSource(),
      ...(getSuggestions ? [createObsidianCompletionSource(getSuggestions)] : []),
    ],
  }),

  // 編輯快捷鍵：Ctrl+G 跳行、Ctrl+D 刪行、Ctrl+Shift+D 複製行
  editingKeymap,

  // 格式化快捷鍵（必須在 defaultKeymap 之前，避免被預設行為攔截）
  formattingKeymap,

  // 鍵盤快捷鍵
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...closeBracketsKeymap,
    indentWithTab, // Tab 縮排 / Shift+Tab 反縮排
  ]),

  // 同步 v-model
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      isInternalUpdate = true
      emit("update:modelValue", update.state.doc.toString())
      autoSaveService.markAsModified()
      isInternalUpdate = false
      emitOutline(update.state.doc)
    }
    if (update.selectionSet) {
      const sel = update.state.selection.main
      cursorPos.value = sel.head
      selStart.value = sel.from
      selEnd.value = sel.to
      // 發出游標變更（供父組件取得游標位置做自動完成）
      emit("cursor-change")
    }
  }),

  // 鍵盤事件與拖放圖片事件
  // 注意：scroll 事件改在 onMounted 直接掛到 scrollDOM（此處的 domEventHandlers 無法捕捉 scrollDOM 捲動）
  EditorView.domEventHandlers({
    keydown: (event) => { emit("keydown", event) },
    paste(event) {
      const items = Array.from(event.clipboardData?.items ?? [])

      // 剪貼簿圖片優先（直接截圖或複製圖片）
      const imageItem = items.find((i) => i.type.startsWith("image/"))
      if (imageItem) {
        const file = imageItem.getAsFile()
        if (file) {
          event.preventDefault()
          emit("paste-image", file)
          return true
        }
      }

      // 純 URL → 轉為 Markdown 連結
      const text = event.clipboardData?.getData("text/plain")?.trim() ?? ""
      if (text && /^https?:\/\/\S+$/.test(text)) {
        event.preventDefault()
        emit("paste-url", text)
        return true
      }

      return false
    },
    drop(event, view) {
      const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(
        (f) => f.type.startsWith("image/")
      )
      if (!imageFiles.length) { return false }
      event.preventDefault()
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.doc.length
      imageFiles.forEach((file) => emit("drop-image", file, pos))
      return true
    },
  }),

  // 自動換行（預設開啟）
  EditorView.lineWrapping,

  // 基本樣式
  EditorView.theme({
    "&": { height: "100%", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" },
    ".cm-scroller": { overflow: "auto", lineHeight: "1.6" },
    ".cm-content": { padding: "1rem", fontSize: "0.875rem" },
    ".cm-focused": { outline: "none" },
    ".cm-gutters": { borderRight: "1px solid oklch(var(--bc) / 0.1)", background: "oklch(var(--b2))" },
    ".cm-lineNumbers .cm-gutterElement": {
      color: "oklch(var(--bc) / 0.4)",
      fontSize: "0.875rem",
      padding: "0 8px",
      minWidth: "3rem",
      textAlign: "right",
    },
    ".cm-activeLine": { backgroundColor: "oklch(var(--p) / 0.05)" },
    ".cm-activeLineGutter": { backgroundColor: "oklch(var(--p) / 0.1)", color: "oklch(var(--p))" },
  }),
]

// ─── getSuggestions 橋接（由父組件通過 provide/inject 或 props 傳入）─────────

/**
 * 父組件（MainEditor.vue）透過 ref expose 取得此方法，在 updateAutocomplete 時注入
 * 此設計讓 ObsidianSyntaxService 的依賴留在 MainEditor，CodeMirrorEditor 保持純粹
 */
let _getSuggestions: ((text: string, pos: number) => SuggestionItem[]) | null = null

function setSuggestionsProvider(fn: (text: string, pos: number) => SuggestionItem[]) {
  _getSuggestions = fn
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

// domEventHandlers 掛在 .cm-editor（外層），但 scroll 事件發生在 .cm-scroller（內層）且不冒泡
// 因此需直接對 scrollDOM 掛監聽器，才能正確捕捉 CM6 的捲動事件
let _scrollListener: (() => void) | null = null

onMounted(() => {
  if (!containerRef.value) { return }

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: buildExtensions(_getSuggestions),
  })

  editorView.value = new EditorView({
    state,
    parent: containerRef.value,
  })

  _scrollListener = () => emit("scroll")
  editorView.value.scrollDOM.addEventListener("scroll", _scrollListener)

  // 初次掛載即解析大綱（updateListener 只在 docChanged 時觸發，不含初始載入）
  emitOutline(state.doc)
})

onUnmounted(() => {
  if (_scrollListener) {
    editorView.value?.scrollDOM.removeEventListener("scroll", _scrollListener)
    _scrollListener = null
  }
  editorView.value?.destroy()
})

// ─── v-model 外部同步 ─────────────────────────────────────────────────────────

watch(
  () => props.modelValue,
  (newValue) => {
    if (isInternalUpdate) { return }
    const view = editorView.value
    if (!view) { return }
    if (view.state.doc.toString() === newValue) { return }

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newValue },
    })
  }
)

// ─── Word Wrap 切換 ───────────────────────────────────────────────────────────

function toggleWordWrap() {
  wordWrap.value = !wordWrap.value
  emit("toggle-word-wrap")
}

// ─── 供 MainEditor 使用的公開介面 ─────────────────────────────────────────────

/**
 * editorRef 橋接：MainEditor 原本透過 editorRef.value 操作 textarea（selectionStart、
 * setSelectionRange 等），此處暴露 editorView 讓 MainEditor 可以直接操作 CM6 view。
 *
 * 同時暴露 selectionStart getter，保持向下相容。
 */
const editorRef = computed(() => {
  const view = editorView.value
  if (!view) { return null }

  // 模擬 textarea 介面，讓 MainEditor 現有代碼不需大改
  return {
    get selectionStart() { return view.state.selection.main.from },
    get selectionEnd() { return view.state.selection.main.to },
    get value() { return view.state.doc.toString() },
    setSelectionRange(start: number, end: number) {
      view.dispatch({ selection: { anchor: start, head: end } })
      view.focus()
    },
    focus() { view.focus() },
    contains(node: Node | null) {
      return view.dom.contains(node)
    },
  }
})

/**
 * 捲動至指定行號（0-indexed）
 * @param lineNumber 0-indexed 行號
 */
function scrollToLine(lineNumber: number) {
  const view = editorView.value
  if (!view) { return }
  const targetLine = lineNumber + 1 // lineNumber is 0-indexed
  if (targetLine < 1 || targetLine > view.state.doc.lines) { return }
  const line = view.state.doc.line(targetLine)
  view.dispatch({
    effects: EditorView.scrollIntoView(line.from, { y: "start", yMargin: 50 }),
  })
  view.focus()
}

/**
 * 在 CM6 文件中搜尋關鍵字（大小寫不敏感），捲動至第一個匹配行置中顯示
 * @param query 要搜尋的關鍵字
 */
function scrollToQuery(query: string) {
  const view = editorView.value
  if (!view || !query.trim()) { return }
  const content = view.state.doc.toString()
  const pos = content.toLowerCase().indexOf(query.trim().toLowerCase())
  if (pos === -1) { return }
  const line = view.state.doc.lineAt(pos)
  view.dispatch({
    effects: EditorView.scrollIntoView(line.from, { y: "center", yMargin: 80 }),
  })
  view.focus()
}

/**
 * 在文件指定位置插入文字，游標移至插入內容末尾
 * @param pos 插入位置（文件字元偏移）
 * @param text 要插入的文字
 */
function insertAtPosition(pos: number, text: string) {
  const view = editorView.value
  if (!view) { return }
  view.dispatch({
    changes: { from: pos, insert: text },
    selection: { anchor: pos + text.length },
  })
  view.focus()
}

/**
 * 選取指定字元範圍，並將選取起點捲動至視窗置中（CM6 原生實作）
 * 取代原先 textarea.setSelectionRange + 手動計算 scrollTop 的做法
 * @param from 選取起始位置（文件字元偏移）
 * @param to 選取結束位置（文件字元偏移）
 */
function selectRange(from: number, to: number) {
  const view = editorView.value
  if (!view) { return }
  view.dispatch({
    selection: { anchor: from, head: to },
    effects: EditorView.scrollIntoView(from, { y: "center", yMargin: 80 }),
  })
  view.focus()
}

defineExpose({
  editorRef,
  editorView,
  setSuggestionsProvider,
  scrollToLine,
  scrollToQuery,
  selectRange,
  insertAtPosition,
})
</script>

<style scoped>
.cm-editor-wrapper {
  height: 100%;
}

/* noinspection CssUnusedSymbol */
.cm-editor-wrapper :deep(.cm-editor) {
  height: 100%;
}

/* 自動完成下拉選單樣式（配合 DaisyUI；--b1/--bc/--p/--pc/--s/--a 為 DaisyUI 主題變數，執行期注入）*/
/* noinspection CssUnusedSymbol,CssUnresolvedCustomProperty */
.cm-editor-wrapper :deep(.cm-tooltip-autocomplete) {
  background: oklch(var(--b1));
  border: 1px solid oklch(var(--bc) / 0.2);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* noinspection CssUnresolvedCustomProperty */
.cm-editor-wrapper :deep(.cm-tooltip-autocomplete ul li) {
  padding: 0.375rem 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: oklch(var(--bc));
}

/* noinspection CssUnresolvedCustomProperty */
.cm-editor-wrapper :deep(.cm-tooltip-autocomplete ul li[aria-selected]) {
  background: oklch(var(--p));
  color: oklch(var(--pc));
}

/* Markdown 語法高亮（.ͼb~f 為 CM6 執行期動態生成的 token 類別）*/
/* noinspection CssUnusedSymbol,CssUnresolvedCustomProperty */
.cm-editor-wrapper :deep(.ͼb) { color: oklch(var(--p)); font-weight: 600; }
/* noinspection CssUnusedSymbol,CssUnresolvedCustomProperty */
.cm-editor-wrapper :deep(.ͼc) { color: oklch(var(--s)); }
/* noinspection CssUnusedSymbol,CssUnresolvedCustomProperty */
.cm-editor-wrapper :deep(.ͼd) { color: oklch(var(--a)); }
/* noinspection CssUnusedSymbol */
.cm-editor-wrapper :deep(.ͼe) { font-style: italic; }
/* noinspection CssUnusedSymbol */
.cm-editor-wrapper :deep(.ͼf) { font-weight: bold; }
</style>
