/**
 * 搜尋/替換功能
 */

import { ref } from "vue"

export function useSearchReplace(
  getContent: () => string,
  setContent: (content: string) => void,
  getCursorPosition: () => number,
  setCursorPosition: (position: number) => void
) {
  const isSearchVisible = ref(false)

  /**
   * 開啟搜尋面板
   */
  function openSearch() {
    isSearchVisible.value = true
  }

  /**
   * 關閉搜尋面板
   */
  function closeSearch() {
    isSearchVisible.value = false
  }

  /**
   * 切換搜尋面板
   */
  function toggleSearch() {
    isSearchVisible.value = !isSearchVisible.value
  }

  /**
   * 執行替換
   */
  function replace(searchText: string, replaceText: string, replaceAll: boolean) {
    const content = getContent()
    
    if (replaceAll) {
      // 全部替換
      const newContent = content.replace(new RegExp(escapeRegex(searchText), "g"), replaceText)
      setContent(newContent)
    } else {
      // 替換當前匹配
      const cursorPos = getCursorPosition()
      const afterCursor = content.substring(cursorPos)
      
      // 在游標位置之後尋找第一個匹配
      const searchIndex = afterCursor.indexOf(searchText)
      
      if (searchIndex !== -1) {
        const actualIndex = cursorPos + searchIndex
        const newContent = 
          content.substring(0, actualIndex) +
          replaceText +
          content.substring(actualIndex + searchText.length)
        
        setContent(newContent)
        setCursorPosition(actualIndex + replaceText.length)
      }
    }
  }

  /**
   * 跳到指定匹配位置
   */
  function jumpToMatch(match: { start: number; end: number }) {
    setCursorPosition(match.start)
    
    // 選取匹配的文字
    // 注意：這需要 textarea 元素的 reference
    // 可以在調用此函數後，由父組件處理選取邏輯
  }

  /**
   * 轉義正則表達式特殊字元
   */
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  return {
    isSearchVisible,
    openSearch,
    closeSearch,
    toggleSearch,
    replace,
    jumpToMatch,
  }
}
