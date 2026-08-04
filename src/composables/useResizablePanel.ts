import { ref, onScopeDispose, type Ref } from "vue"

export interface UseResizablePanelOptions {
  /** 最小寬度（px） */
  min: number
  /** 最大寬度（px） */
  max: number
  /** 預設寬度（px），也是找不到／找到不合法的持久化值時的 fallback */
  default: number
}

export interface UseResizablePanelReturn {
  /** 目前寬度（px），拖曳中會即時更新 */
  width: Ref<number>
  /** 綁在 resize-handle 的 mousedown 事件上，開始拖曳 */
  startResize: (e: MouseEvent) => void
}

/**
 * 側邊可調寬面板的通用拖曳/持久化邏輯（左側 resize-handle）。
 *
 * 從 AIPanelView.vue 抽出，避免 InspectorView.vue 另外複製一份幾乎一樣的實作
 * （同樣的 min/max/default 模式、同樣的 startResize/handleMouseMove/stopResize、
 * 同樣的監聽器掛載/卸載邏輯，只有 localStorage key 不同）。
 *
 * 與原本 AIPanelView.vue 的實作差一點：這裡的 mousemove/mouseup 監聽器只在拖曳期間
 * （startResize 之後、stopResize 之前）才掛在 document 上，而不是元件掛載期間全程掛著，
 * 減少非拖曳狀態下不必要的全域事件監聽。
 *
 * @param storageKey localStorage 持久化寬度用的 key，呼叫端需自行確保跨元件不重複
 * @param options 寬度上下限與預設值
 */
export function useResizablePanel(storageKey: string, options: UseResizablePanelOptions): UseResizablePanelReturn {
  const { min, max, default: defaultWidth } = options

  function loadPersistedWidth(): number {
    const saved = localStorage.getItem(storageKey)
    if (saved !== null) {
      const parsed = Number.parseInt(saved, 10)
      if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
        return parsed
      }
    }
    return defaultWidth
  }

  const width = ref(loadPersistedWidth())
  const isResizing = ref(false)

  function handleMouseMove(e: MouseEvent) {
    if (!isResizing.value) { return }
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= min && newWidth <= max) {
      width.value = newWidth
    }
  }

  function stopResize() {
    if (!isResizing.value) { return }
    isResizing.value = false
    localStorage.setItem(storageKey, width.value.toString())
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", stopResize)
  }

  function startResize(e: MouseEvent) {
    isResizing.value = true
    e.preventDefault()
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", stopResize)
  }

  // 使用 onScopeDispose（而非 onUnmounted）：此 composable 可能被多個元件各自呼叫一次，
  // onScopeDispose 會在呼叫端所在的 effect scope（元件 setup）結束時觸發，
  // 不需要依賴呼叫端一定是在元件內部才會生效的 onMounted/onUnmounted 生命週期鉤子。
  onScopeDispose(() => {
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", stopResize)
  })

  return {
    width,
    startResize,
  }
}
