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
const SHIFT_KEY_TO_VIEW: Record<string, string> = {
  E: "articles",
  I: "frontmatter",
  M: "manage",
}

export function useActivityBarShortcuts(activeView: Ref<string>) {
  function handleKeydown(e: KeyboardEvent) {
    if (!e.ctrlKey) {return}

    if (e.shiftKey) {
      const view = SHIFT_KEY_TO_VIEW[e.key]
      if (view) {
        e.preventDefault()
        activeView.value = activeView.value === view ? "" : view
      }
      return
    }

    // Ctrl+B: 切換側邊欄（如果已開啟則關閉，如果關閉則開啟文章列表）
    if (e.key === "b") {
      e.preventDefault()
      activeView.value = activeView.value ? "" : "articles"
    }
  }

  onMounted(() => {
    globalThis.addEventListener("keydown", handleKeydown)
  })

  onUnmounted(() => {
    globalThis.removeEventListener("keydown", handleKeydown)
  })
}
