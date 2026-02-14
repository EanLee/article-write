<template>
  <div :class="showPreview ? 'w-1/2' : 'w-full'" class="flex flex-col">
    <div ref="containerRef" class="flex-1 overflow-hidden cm-editor-container"></div>
  </div>
</template>

<script setup lang="ts">
/**
 * CodeMirror 6 編輯器原型（Spike 用）
 *
 * Spike 驗證目標：
 * S-01: Vue wrapper 行數與整合複雜度
 * S-02: @codemirror/lang-markdown 語法高亮
 * S-03: v-model:modelValue 雙向綁定
 *
 * 對外 API 刻意與 EditorPane.vue 相容：
 * - v-model（modelValue / update:modelValue）
 * - emit: keydown, scroll, cursor-change
 */

import { ref, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

interface Props {
  modelValue: string
  showPreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showPreview: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'keydown': [event: KeyboardEvent]
  'scroll': []
  'cursor-change': []
}>()

const containerRef = ref<HTMLElement>()
const editorView = shallowRef<EditorView>()

// 防止內部更新觸發外部 watcher 循環
let isInternalUpdate = false

// S-01: 建立 EditorView（Vue wrapper 核心）
onMounted(() => {
  if (!containerRef.value) {return}

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      // S-02: Markdown 語法高亮
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      syntaxHighlighting(defaultHighlightStyle),

      // 行號
      lineNumbers(),

      // 當前行高亮
      highlightActiveLine(),

      // Undo/Redo 歷史
      history(),

      // 括號自動補全（S-06 驗證）
      closeBrackets(),

      // 自動縮排
      indentOnInput(),

      // 鍵盤快捷鍵
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        indentWithTab, // Tab 縮排（S-07 驗證）
      ]),

      // S-03: 監聽文件變更，同步到 v-model
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          isInternalUpdate = true
          emit('update:modelValue', update.state.doc.toString())
          isInternalUpdate = false
        }
        if (update.selectionSet) {
          emit('cursor-change')
        }
      }),

      // 捲動事件
      EditorView.domEventHandlers({
        scroll: () => { emit('scroll') },
        keydown: (event) => { emit('keydown', event) },
      }),

      // 基本樣式（撐滿容器）
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace', fontSize: '0.875rem' },
        '.cm-content': { padding: '1rem' },
      }),
    ],
  })

  editorView.value = new EditorView({
    state,
    parent: containerRef.value,
  })
})

// S-03: 外部 v-model 變更時，同步到 CM6（防止循環）
watch(
  () => props.modelValue,
  (newValue) => {
    if (isInternalUpdate) {return}
    const view = editorView.value
    if (!view) {return}
    const currentDoc = view.state.doc.toString()
    if (currentDoc === newValue) {return}

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newValue },
    })
  }
)

// 清理
onUnmounted(() => {
  editorView.value?.destroy()
})

// 暴露 editorRef（與 EditorPane.vue 對齊，供 MainEditor 取得游標位置）
defineExpose({
  editorView,
})
</script>

<style scoped>
.cm-editor-container {
  height: 100%;
}

.cm-editor-container :deep(.cm-editor) {
  height: 100%;
}

.cm-editor-container :deep(.cm-focused) {
  outline: none;
}
</style>
