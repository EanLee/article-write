/**
 * 自動完成功能 Composable
 */
import { ref, type Ref } from 'vue'
import type { SuggestionItem, AutocompleteContext } from '@/services/ObsidianSyntaxService'
import { useObsidianSyntaxService } from './useServices'

export function useAutocomplete(
  editorRef: Ref<HTMLTextAreaElement | undefined>,
  contentRef: Ref<string>
) {
  const obsidianSyntax = useObsidianSyntaxService()

  // 自動完成狀態
  const suggestions = ref<SuggestionItem[]>([])
  const showSuggestions = ref(false)
  const selectedSuggestionIndex = ref(0)
  const dropdownPosition = ref({ top: 0, left: 0 })

  /**
   * 更新自動完成建議
   */
  function updateAutocomplete() {
    const textarea = editorRef.value
    if (!textarea) {
      return
    }

    const cursorPosition = textarea.selectionStart
    const text = textarea.value

    // 建立自動完成上下文
    const context: AutocompleteContext = {
      text,
      cursorPosition,
      lineNumber: text.substring(0, cursorPosition).split('\n').length,
      columnNumber: cursorPosition - text.lastIndexOf('\n', cursorPosition - 1)
    }

    // 取得建議
    suggestions.value = obsidianSyntax.getAutocompleteSuggestions(context)

    if (suggestions.value.length > 0) {
      selectedSuggestionIndex.value = 0
      showSuggestions.value = true
      updateDropdownPosition()
    } else {
      hideSuggestions()
    }
  }

  /**
   * 更新下拉選單位置
   */
  function updateDropdownPosition() {
    const textarea = editorRef.value
    if (!textarea) {
      return
    }

    const cursorPosition = textarea.selectionStart
    dropdownPosition.value = obsidianSyntax.calculateDropdownPosition(textarea, cursorPosition)
  }

  /**
   * 應用建議
   */
  function applySuggestion(suggestion: SuggestionItem) {
    const textarea = editorRef.value
    if (!textarea) {
      return
    }

    const cursorPosition = textarea.selectionStart
    const newText = obsidianSyntax.applySuggestionToText(textarea, suggestion, cursorPosition)
    contentRef.value = newText

    hideSuggestions()
  }

  /**
   * 隱藏建議
   */
  function hideSuggestions() {
    showSuggestions.value = false
    suggestions.value = []
    selectedSuggestionIndex.value = 0
  }

  /**
   * 處理自動完成相關的鍵盤事件
   * 返回 true 表示事件已處理，不需要繼續傳播
   */
  function handleAutocompleteKeydown(event: KeyboardEvent): boolean {
    if (!showSuggestions.value || suggestions.value.length === 0) {
      return false
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedSuggestionIndex.value = Math.min(
          selectedSuggestionIndex.value + 1,
          suggestions.value.length - 1
        )
        return true
      case 'ArrowUp':
        event.preventDefault()
        selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
        return true
      case 'Enter':
      case 'Tab':
        event.preventDefault()
        applySuggestion(suggestions.value[selectedSuggestionIndex.value])
        return true
      case 'Escape':
        hideSuggestions()
        return true
    }

    return false
  }

  return {
    // 狀態
    suggestions,
    showSuggestions,
    selectedSuggestionIndex,
    dropdownPosition,
    
    // 方法
    updateAutocomplete,
    applySuggestion,
    hideSuggestions,
    handleAutocompleteKeydown
  }
}
