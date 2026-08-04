/**
 * InspectorView 組件測試
 *
 * InspectorView.vue 是 Inspector 的外殼元件（IA Phase 3 子專案 1：三欄式工作區骨架）：
 * 負責寬度／resize-handle／開合狀態（接 useInspectorStore），並在內部切換三個頁籤——
 * 屬性（PropertiesTab）、AI 助手（AIPanelContent）、發布（PublishTab），resize 邏輯比照
 * AIPanelView.vue 現有實作。
 *
 * 涵蓋：
 *   (a) inspectorStore.isOpen 為 true 時可見、false 時不可見
 *   (b) 預設頁籤為「屬性」
 *   (c) 點擊頁籤切換顯示對應子元件
 *   (d) 折疊按鈕呼叫 inspectorStore.toggle()
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { setActivePinia, createPinia } from "pinia"
import { useInspectorStore } from "@/stores/inspector"
import InspectorView from "@/components/InspectorView.vue"

// ---------- 全域 mock（比照 PropertiesTab.test.ts／ServerControlPanel.test.ts 慣例，
// 涵蓋三個頁籤子元件掛載時各自會用到的 electronAPI 方法） ----------

Object.defineProperty(window, "electronAPI", {
  value: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    getFileStats: vi.fn().mockResolvedValue(null),
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    watchDirectory: vi.fn(),
    unwatchDirectory: vi.fn(),
    startFileWatching: vi.fn().mockResolvedValue(undefined),
    stopFileWatching: vi.fn().mockResolvedValue(undefined),
    onFileChange: vi.fn(() => vi.fn()),
    onSyncProgress: vi.fn(() => vi.fn()),
    syncAllPublished: vi.fn().mockResolvedValue({ succeeded: 0, failed: 0, errors: [], warnings: [] }),
    getServerStatus: vi.fn().mockResolvedValue({ running: false, url: undefined }),
    startDevServer: vi.fn().mockResolvedValue(undefined),
    stopDevServer: vi.fn().mockResolvedValue(undefined),
    onServerLog: vi.fn(() => vi.fn()),
    aiGetActiveProvider: vi.fn().mockResolvedValue(null),
  },
  writable: true,
  configurable: true,
})

describe("InspectorView", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it("(a) inspectorStore.isOpen 為 true 時可見、為 false 時不可見", () => {
    const inspectorStore = useInspectorStore()

    inspectorStore.isOpen = true
    const wrapperOpen = mount(InspectorView)
    expect(wrapperOpen.find('[data-testid="inspector-view"]').exists()).toBe(true)
    wrapperOpen.unmount()

    inspectorStore.isOpen = false
    const wrapperClosed = mount(InspectorView)
    expect(wrapperClosed.find('[data-testid="inspector-view"]').exists()).toBe(false)
    wrapperClosed.unmount()
  })

  it("(b) 預設頁籤為「屬性」，掛載後即顯示 PropertiesTab 內容", () => {
    const inspectorStore = useInspectorStore()
    inspectorStore.isOpen = true

    const wrapper = mount(InspectorView)

    expect(wrapper.find(".properties-tab").exists()).toBe(true)
    expect(wrapper.find('[data-testid="inspector-tab-properties"]').classes()).toContain("tab-active")
  })

  it("(c) 點擊頁籤能切換顯示對應子元件", async () => {
    const inspectorStore = useInspectorStore()
    inspectorStore.isOpen = true

    const wrapper = mount(InspectorView)

    // 切到「AI 助手」：PropertiesTab 消失、AIPanelContent 的無文章空狀態出現
    await wrapper.find('[data-testid="inspector-tab-ai"]').trigger("click")
    expect(wrapper.find(".properties-tab").exists()).toBe(false)
    expect(wrapper.text()).toContain("請先選擇一篇文章")

    // 切到「發布」：AIPanelContent 消失、PublishTab 內容出現
    await wrapper.find('[data-testid="inspector-tab-publish"]').trigger("click")
    expect(wrapper.text()).not.toContain("請先選擇一篇文章")
    expect(wrapper.text()).toContain("開發伺服器")

    // 切回「屬性」
    await wrapper.find('[data-testid="inspector-tab-properties"]').trigger("click")
    expect(wrapper.find(".properties-tab").exists()).toBe(true)
  })

  it("(d) 折疊按鈕呼叫 inspectorStore.toggle()", async () => {
    const inspectorStore = useInspectorStore()
    inspectorStore.isOpen = true

    const wrapper = mount(InspectorView)
    const toggleSpy = vi.spyOn(inspectorStore, "toggle")

    await wrapper.find('[data-testid="inspector-collapse-button"]').trigger("click")

    expect(toggleSpy).toHaveBeenCalledTimes(1)
  })
})
