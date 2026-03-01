import { onMounted, onUnmounted, type Ref } from "vue"

/**
 * Activity Bar 快捷鍵管理
 * 
 * @param activeView - 當前活動視圖的 ref
 * 
 * 支援的快捷鍵：
 * - Ctrl+Shift+E: 切換文章列表
 * - Ctrl+Shift+I: 切換文章資訊
 * - Ctrl+Shift+M: 切換文章管理
 * - Ctrl+B: 切換側邊欄
 */
export function useActivityBarShortcuts(activeView: Ref<string>) {
  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+Shift+E: 文章列表
    if (e.ctrlKey && e.shiftKey && e.key === "E") {
      e.preventDefault()
      activeView.value = activeView.value === "articles" ? "" : "articles"
      return
    }

    // Ctrl+Shift+I: 文章資訊
    if (e.ctrlKey && e.shiftKey && e.key === "I") {
      e.preventDefault()
      activeView.value = activeView.value === "frontmatter" ? "" : "frontmatter"
      return
    }

    // Ctrl+Shift+M: 文章管理
    if (e.ctrlKey && e.shiftKey && e.key === "M") {
      e.preventDefault()
      activeView.value = activeView.value === "manage" ? "" : "manage"
      return
    }

    // Ctrl+B: 切換側邊欄（如果已開啟則關閉，如果關閉則開啟文章列表）
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault()
      activeView.value = activeView.value ? "" : "articles"
      return
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown)
  })
}
