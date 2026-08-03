/**
 * ServerControlPanel — 掛載進編輯模式前的兩個既有缺陷
 * 1. `expanded` 預設值需為 false（掛載進編輯模式時預設收合）
 * 2. startServer/stopServer/updateStatus 失敗時呼叫 logger.error，但檔案從未 import logger，
 *    掛載後首次觸發錯誤路徑會直接 runtime crash（ReferenceError: logger is not defined）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils"
import { setActivePinia, createPinia } from "pinia"
import { useConfigStore } from "@/stores/config"
import ServerControlPanel from "@/components/ServerControlPanel.vue"

function setupElectronAPI(overrides: Record<string, unknown> = {}) {
  Object.defineProperty(window, "electronAPI", {
    value: {
      getServerStatus: vi.fn().mockResolvedValue({ running: false, url: undefined }),
      startDevServer: vi.fn().mockResolvedValue(undefined),
      stopDevServer: vi.fn().mockResolvedValue(undefined),
      onServerLog: vi.fn(() => vi.fn()),
      ...overrides,
    },
    writable: true,
    configurable: true,
  })
}

function findButtonByText(wrapper: VueWrapper, text: string) {
  const btn = wrapper.findAll("button").find((b) => b.text().includes(text))
  if (!btn) {throw new Error(`Button with text "${text}" not found`)}
  return btn
}

describe("ServerControlPanel - 預設收合狀態", () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    setupElectronAPI()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it("首次掛載時日誌面板應為收合狀態（不可見）", async () => {
    wrapper = mount(ServerControlPanel)
    await flushPromises()
    expect(wrapper.find(".log-panel").exists()).toBe(false)
  })
})

describe("ServerControlPanel - logger 未 import 的 bug 修復", () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    const configStore = useConfigStore()
    configStore.config.paths.targetDir = "/blog/target"
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it("啟動伺服器失敗時應把錯誤訊息寫入日誌（若 logger 未 import 會在寫入前就拋出）", async () => {
    setupElectronAPI({ startDevServer: vi.fn().mockRejectedValue(new Error("啟動失敗")) })
    wrapper = mount(ServerControlPanel, { attachTo: document.body })
    await flushPromises()

    // 日誌預設收合，先展開才看得到錯誤訊息
    await wrapper.find('button[title="展開"]').trigger("click")
    await findButtonByText(wrapper, "啟動").trigger("click")
    await flushPromises()

    expect(wrapper.text()).toContain("啟動失敗")
  })

  it("停止伺服器失敗時點擊不應觸發未捕捉的 Promise rejection", async () => {
    setupElectronAPI({
      getServerStatus: vi.fn().mockResolvedValue({ running: true, url: "http://localhost:4321" }),
      stopDevServer: vi.fn().mockRejectedValue(new Error("停止失敗")),
    })
    wrapper = mount(ServerControlPanel, { attachTo: document.body })
    await flushPromises()

    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => { rejections.push(reason) }
    process.on("unhandledRejection", onRejection)

    try {
      await findButtonByText(wrapper, "停止").trigger("click")
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 0))
    } finally {
      process.off("unhandledRejection", onRejection)
    }

    expect(rejections).toEqual([])
  })

  it("初始載入伺服器狀態失敗時不應觸發未捕捉的 Promise rejection", async () => {
    setupElectronAPI({ getServerStatus: vi.fn().mockRejectedValue(new Error("取得狀態失敗")) })

    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => { rejections.push(reason) }
    process.on("unhandledRejection", onRejection)

    try {
      wrapper = mount(ServerControlPanel, { attachTo: document.body })
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 0))
    } finally {
      process.off("unhandledRejection", onRejection)
    }

    expect(rejections).toEqual([])
  })
})
