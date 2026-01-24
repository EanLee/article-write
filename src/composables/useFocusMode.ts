import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 專注模式管理
 *
 * 提供專注模式的狀態管理和快捷鍵支援
 * - 專注模式下自動隱藏 Header
 * - 支援 Ctrl+Shift+F 快捷鍵切換
 * - 持久化到 localStorage
 */
export function useFocusMode() {
  const STORAGE_KEY = 'editor-focus-mode'

  // 從 localStorage 載入初始狀態
  const focusMode = ref<boolean>(false)

  /**
   * 切換專注模式
   */
  function toggleFocusMode() {
    focusMode.value = !focusMode.value
    // 持久化到 localStorage
    localStorage.setItem(STORAGE_KEY, focusMode.value ? 'true' : 'false')
  }

  /**
   * 快捷鍵處理
   */
  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+Shift+F: 切換專注模式
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault()
      toggleFocusMode()
    }
  }

  onMounted(() => {
    // 載入儲存的狀態
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      focusMode.value = saved === 'true'
    }

    // 註冊快捷鍵
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    focusMode,
    toggleFocusMode
  }
}
