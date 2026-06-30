/**
 * Undo/Redo 系統
 * 提供完整的編輯歷史記錄與復原功能
 */

import { ref, computed } from "vue"

interface HistoryState {
  content: string
  cursorPosition: number
  timestamp: number
}

export function useUndoRedo() {
  // 歷史堆疊
  const history = ref<HistoryState[]>([])
  const currentIndex = ref(-1)
  const maxHistorySize = 100 // 最多保留 100 個歷史記錄

  // 是否可以撤銷/重做
  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)

  /**
   * 添加新的歷史記錄
   */
  function pushHistory(content: string, cursorPosition: number) {
    // 如果當前不在歷史堆疊的最後位置，刪除後面的所有記錄
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // 添加新記錄
    const newState: HistoryState = {
      content,
      cursorPosition,
      timestamp: Date.now(),
    }

    history.value.push(newState)
    currentIndex.value = history.value.length - 1

    // 限制歷史記錄大小
    if (history.value.length > maxHistorySize) {
      history.value.shift()
      currentIndex.value--
    }
  }

  /**
   * 撤銷
   */
  function undo(): HistoryState | null {
    if (!canUndo.value) {
      return null
    }

    currentIndex.value--
    return history.value[currentIndex.value]
  }

  /**
   * 重做
   */
  function redo(): HistoryState | null {
    if (!canRedo.value) {
      return null
    }

    currentIndex.value++
    return history.value[currentIndex.value]
  }

  /**
   * 取得當前狀態
   */
  function getCurrentState(): HistoryState | null {
    if (currentIndex.value >= 0 && currentIndex.value < history.value.length) {
      return history.value[currentIndex.value]
    }
    return null
  }

  /**
   * 清空歷史記錄
   */
  function clearHistory() {
    history.value = []
    currentIndex.value = -1
  }

  /**
   * 初始化（設定初始狀態）
   */
  function initialize(content: string, cursorPosition: number = 0) {
    clearHistory()
    pushHistory(content, cursorPosition)
  }

  /**
   * 取得歷史記錄統計
   */
  const stats = computed(() => ({
    total: history.value.length,
    current: currentIndex.value + 1,
    canUndo: canUndo.value,
    canRedo: canRedo.value,
  }))

  return {
    // 狀態
    canUndo,
    canRedo,
    stats,

    // 方法
    pushHistory,
    undo,
    redo,
    getCurrentState,
    clearHistory,
    initialize,
  }
}
