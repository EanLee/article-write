import { ref, onMounted, onUnmounted } from "vue"

const STORAGE_KEY = "editor-focus-mode"

// Module-level singleton — 跨元件共享同一個狀態
const focusMode = ref<boolean>(false)

// 初始化一次（首次 import 時從 localStorage 讀取）
const saved = localStorage.getItem(STORAGE_KEY)
if (saved !== null) {
  focusMode.value = saved === "true"
}

/**
 * 專注模式管理（Singleton）
 *
 * 提供專注模式的狀態管理和快捷鍵支援
 * - 專注模式下自動隱藏 Header 和 Sidebar
 * - 支援 Ctrl+Shift+F 快捷鍵切換
 * - 持久化到 localStorage
 */
export function useFocusMode() {
  function toggleFocusMode() {
    focusMode.value = !focusMode.value
    localStorage.setItem(STORAGE_KEY, focusMode.value ? "true" : "false")
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      e.preventDefault()
      toggleFocusMode()
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown)
  })

  return {
    focusMode,
    toggleFocusMode
  }
}
