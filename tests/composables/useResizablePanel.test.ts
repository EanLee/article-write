/**
 * useResizablePanel 組件測試
 *
 * 從 AIPanelView.vue 抽出的可調寬面板共用邏輯（IA Phase 3 子專案 1 code review 回饋：
 * InspectorView.vue 原本複製了一份幾乎一樣的 resize-handle 實作，抽出共用 composable 消除重複）。
 *
 * 涵蓋：
 *   (a) 初始化時應從 localStorage 載入已持久化的寬度
 *   (b) 持久化值超出 min/max 範圍時，應退回使用 default
 *   (c) 拖曳期間應在範圍內即時更新寬度，超出範圍的移動則忽略
 *   (d) 拖曳結束（mouseup）時應把目前寬度寫回 localStorage
 *   (e) effect scope 結束（元件卸載）時應清理監聽器，之後的 mousemove 不應再更新寬度
 */

import { describe, it, expect, beforeEach } from "vitest"
import { effectScope } from "vue"
import { useResizablePanel } from "@/composables/useResizablePanel"

const STORAGE_KEY = "test-resizable-panel-width"
const OPTIONS = { min: 200, max: 500, default: 300 }

function dispatchMouseMove(clientX: number) {
  document.dispatchEvent(new MouseEvent("mousemove", { clientX }))
}

function dispatchMouseUp() {
  document.dispatchEvent(new MouseEvent("mouseup"))
}

describe("useResizablePanel", () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, "innerWidth", { value: 1000, writable: true, configurable: true })
  })

  it("(a) 初始化時應從 localStorage 載入已持久化的寬度", () => {
    localStorage.setItem(STORAGE_KEY, "350")

    const { width } = useResizablePanel(STORAGE_KEY, OPTIONS)

    expect(width.value).toBe(350)
  })

  it("(b) 持久化值超出 min/max 範圍時，應退回使用 default", () => {
    localStorage.setItem(STORAGE_KEY, "9999")
    const { width: overMax } = useResizablePanel(STORAGE_KEY, OPTIONS)
    expect(overMax.value).toBe(OPTIONS.default)

    localStorage.setItem(STORAGE_KEY, "10")
    const { width: underMin } = useResizablePanel(STORAGE_KEY, OPTIONS)
    expect(underMin.value).toBe(OPTIONS.default)

    localStorage.setItem(STORAGE_KEY, "not-a-number")
    const { width: invalid } = useResizablePanel(STORAGE_KEY, OPTIONS)
    expect(invalid.value).toBe(OPTIONS.default)
  })

  it("(c) 拖曳期間應在範圍內即時更新寬度，超出範圍的移動則忽略", () => {
    const { width, startResize } = useResizablePanel(STORAGE_KEY, OPTIONS)

    startResize(new MouseEvent("mousedown"))

    // window.innerWidth(1000) - clientX(700) = 300，在範圍內
    dispatchMouseMove(700)
    expect(width.value).toBe(300)

    // window.innerWidth(1000) - clientX(950) = 50，小於 min(200)，應忽略不更新
    dispatchMouseMove(950)
    expect(width.value).toBe(300)

    dispatchMouseUp()
  })

  it("(d) 拖曳結束（mouseup）時應把目前寬度寫回 localStorage", () => {
    const { width, startResize } = useResizablePanel(STORAGE_KEY, OPTIONS)

    startResize(new MouseEvent("mousedown"))
    dispatchMouseMove(650) // 1000 - 650 = 350
    expect(width.value).toBe(350)

    dispatchMouseUp()

    expect(localStorage.getItem(STORAGE_KEY)).toBe("350")
  })

  it("(e) effect scope 結束時應清理監聽器，之後的 mousemove 不應再更新寬度", () => {
    const scope = effectScope()
    const result = scope.run(() => useResizablePanel(STORAGE_KEY, OPTIONS))
    if (!result) { throw new Error("effectScope.run 未回傳結果") }
    const { width, startResize } = result

    startResize(new MouseEvent("mousedown"))
    dispatchMouseMove(700)
    expect(width.value).toBe(300)

    scope.stop()

    // scope 結束後監聽器應已被移除，即使再 dispatch mousemove 寬度也不應再變化
    dispatchMouseMove(600) // 若監聽器還在會變成 400
    expect(width.value).toBe(300)
  })
})
