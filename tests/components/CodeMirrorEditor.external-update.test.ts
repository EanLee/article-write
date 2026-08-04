import { describe, it, expect, vi, afterEach } from "vitest"
import { mount, type VueWrapper } from "@vue/test-utils"
import CodeMirrorEditor from "@/components/CodeMirrorEditor.vue"
import { autoSaveService } from "@/services/AutoSaveService"

/**
 * CodeMirrorEditor - 外部（v-model prop）內容更新不應誤標記為使用者編輯
 *
 * 背景：切換文章時，MainEditor 會把 content.value 設成新文章的內容，
 * 透過 v-model 傳進 CodeMirrorEditor 的 modelValue prop。這條路徑會走
 * watch(modelValue) -> view.dispatch(...) -> updateListener 的 docChanged
 * 分支 -> autoSaveService.markAsModified()，跟使用者真的手動打字觸發的是
 * 同一個 docChanged 分支，沒有區分「外部程式化設定內容」跟「使用者編輯」，
 * 導致單純切換文章（沒有真的編輯任何內容）就顯示「未儲存」。
 */
function makeProps(modelValue = "") {
  return {
    modelValue,
    showPreview: false,
    syntaxErrors: [],
    imageValidationWarnings: [],
  }
}

describe("CodeMirrorEditor - 外部內容更新不應觸發 markAsModified", () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("modelValue prop 從外部變更（模擬切換文章）不應呼叫 autoSaveService.markAsModified", async () => {
    wrapper = mount(CodeMirrorEditor, { props: makeProps("文章 A 的內容"), attachTo: document.body })
    await wrapper.vm.$nextTick()

    const markAsModifiedSpy = vi.spyOn(autoSaveService, "markAsModified")

    // 模擬切換文章：外部（父層 v-model）把 modelValue 換成另一篇文章的內容
    await wrapper.setProps({ modelValue: "文章 B 的內容" })
    await wrapper.vm.$nextTick()

    // markAsModified 有 100ms debounce，等過debounce 視窗確認真的沒被排程觸發
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(markAsModifiedSpy).not.toHaveBeenCalled()
  })

  it("對照組：使用者在編輯器內實際打字，應該呼叫 autoSaveService.markAsModified", async () => {
    wrapper = mount(CodeMirrorEditor, { props: makeProps("原始內容"), attachTo: document.body })
    await wrapper.vm.$nextTick()

    const markAsModifiedSpy = vi.spyOn(autoSaveService, "markAsModified")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (wrapper.vm as any).editorView
    view.dispatch({
      changes: { from: view.state.doc.length, insert: "使用者輸入的文字" },
    })
    await wrapper.vm.$nextTick()

    expect(markAsModifiedSpy).toHaveBeenCalled()
  })
})
