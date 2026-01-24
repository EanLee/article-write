/**
 * 編輯器快捷鍵處理 Composable
 */
import { type Ref } from 'vue'

export interface EditorShortcutsOptions {
  onSave?: () => void
  onTogglePreview?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onSearch?: () => void
  onReplace?: () => void
}

export function useEditorShortcuts(
  editorRef: Ref<HTMLTextAreaElement | undefined>,
  contentRef: Ref<string>,
  options: EditorShortcutsOptions = {}
) {
  /**
   * 插入 Markdown 語法
   */
  function insertMarkdownSyntax(before: string, after: string, placeholder: string) {
    const textarea = editorRef.value
    if (!textarea) {return}

    const { selectionStart, selectionEnd } = textarea
    const selectedText = textarea.value.substring(selectionStart, selectionEnd)
    const textToInsert = selectedText || placeholder

    const beforeText = textarea.value.substring(0, selectionStart)
    const afterText = textarea.value.substring(selectionEnd)

    const newText = beforeText + before + textToInsert + after + afterText
    contentRef.value = newText

    // 設定游標位置
    const newCursorStart = selectionStart + before.length
    const newCursorEnd = newCursorStart + textToInsert.length

    setTimeout(() => {
      textarea.setSelectionRange(newCursorStart, newCursorEnd)
      textarea.focus()
    }, 0)
  }

  /**
   * 插入表格
   */
  function insertTable() {
    const tableTemplate = `| 標題1 | 標題2 | 標題3 |
|-------|-------|-------|
| 內容1 | 內容2 | 內容3 |
| 內容4 | 內容5 | 內容6 |

`
    insertMarkdownSyntax('', '', tableTemplate)
  }

  /**
   * 處理快捷鍵
   */
  function handleShortcuts(event: KeyboardEvent): boolean {
    // 編輯器快捷鍵
    if (event.ctrlKey || event.metaKey) {
      // 處理 Shift 組合鍵
      if (event.shiftKey) {
        switch (event.key) {
          case 'Z': // Ctrl+Shift+Z: 重做
            event.preventDefault()
            options.onRedo?.()
            return true
        }
      }
      
      // 處理一般 Ctrl 鍵
      switch (event.key) {
        case 's':
          event.preventDefault()
          options.onSave?.()
          return true
        case 'z': // Ctrl+Z: 撤銷
          event.preventDefault()
          options.onUndo?.()
          return true
        case 'f': // Ctrl+F: 搜尋
          event.preventDefault()
          options.onSearch?.()
          return true
        case 'h': // Ctrl+H: 替換
          event.preventDefault()
          options.onReplace?.()
          return true
        case 'b':
          event.preventDefault()
          insertMarkdownSyntax('**', '**', '粗體文字')
          return true
        case 'i':
          event.preventDefault()
          insertMarkdownSyntax('*', '*', '斜體文字')
          return true
        case 'k':
          event.preventDefault()
          insertMarkdownSyntax('[[', ']]', '連結文字')
          return true
        case 'e':
          event.preventDefault()
          insertMarkdownSyntax('==', '==', '高亮文字')
          return true
        case '/':
          event.preventDefault()
          options.onTogglePreview?.()
          return true
      }
    }

    return false
  }

  /**
   * 處理自動配對括號和引號
   */
  function handleAutoPairing(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {return false}

    const textarea = event.target as HTMLTextAreaElement
    const { selectionStart } = textarea

    switch (event.key) {
      case '[':
        if (textarea.value[selectionStart - 1] === '[') {
          event.preventDefault()
          insertMarkdownSyntax('', ']]', '')
          return true
        }
        break
      case '(':
        event.preventDefault()
        insertMarkdownSyntax('(', ')', '')
        return true
      case '"':
        event.preventDefault()
        insertMarkdownSyntax('"', '"', '')
        return true
      case "'":
        event.preventDefault()
        insertMarkdownSyntax("'", "'", '')
        return true
      case '`':
        event.preventDefault()
        if (selectionStart > 0 && textarea.value[selectionStart - 1] === '`') {
          insertMarkdownSyntax('`', '```', '')
        } else {
          insertMarkdownSyntax('`', '`', '')
        }
        return true
    }

    return false
  }

  return {
    insertMarkdownSyntax,
    insertTable,
    handleShortcuts,
    handleAutoPairing
  }
}
