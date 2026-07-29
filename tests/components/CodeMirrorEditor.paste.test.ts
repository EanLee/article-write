import { describe, it, expect, vi, afterEach } from "vitest"
import { mount, type VueWrapper } from "@vue/test-utils"
import CodeMirrorEditor from "@/components/CodeMirrorEditor.vue"

/**
 * CodeMirrorEditor - 貼上/拖放圖片
 *
 * 最基本的寫作需求：貼上剪貼簿截圖應直接上傳並在游標處插入 ![[檔名]]，
 * 不需要另外開圖片管理面板手動上傳、複製路徑、再貼回編輯器。
 * ImageService 依賴留在 MainEditor，這裡用 setImagePasteHandler 注入 mock 上傳函式，
 * 只驗證 CodeMirrorEditor 自己的行為：偵測圖片檔案、呼叫 handler、插入文字。
 */
function makeProps(modelValue = "") {
  return {
    modelValue,
    showPreview: false,
    suggestions: [],
    showSuggestions: false,
    selectedSuggestionIndex: -1,
    syntaxErrors: [],
    imageValidationWarnings: [],
    dropdownPosition: { top: 0, left: 0 },
  }
}

function makeImageFile(name = "screenshot.png") {
  return new File(["fake-image-bytes"], name, { type: "image/png" })
}

describe("CodeMirrorEditor - 貼上圖片", () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it("貼上剪貼簿圖片時應呼叫上傳 handler 並在游標處插入 ![[檔名]]", async () => {
    wrapper = mount(CodeMirrorEditor, { props: makeProps(""), attachTo: document.body })
    const uploadHandler = vi.fn().mockResolvedValue("pasted-image.png")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).setImagePasteHandler(uploadHandler)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (wrapper.vm as any).editorView
    const file = makeImageFile()
    const event = new Event("paste", { bubbles: true, cancelable: true })
    Object.defineProperty(event, "clipboardData", { value: { files: [file], getData: () => "" } })
    view.contentDOM.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(uploadHandler).toHaveBeenCalledWith(file)
    })
    await wrapper.vm.$nextTick()

    expect(view.state.doc.toString()).toContain("![[pasted-image.png]]")
  })

  it("貼上非圖片檔案時不應攔截，也不應呼叫上傳 handler", () => {
    wrapper = mount(CodeMirrorEditor, { props: makeProps(""), attachTo: document.body })
    const uploadHandler = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).setImagePasteHandler(uploadHandler)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (wrapper.vm as any).editorView
    const file = new File(["text"], "note.txt", { type: "text/plain" })
    const event = new Event("paste", { bubbles: true, cancelable: true })
    Object.defineProperty(event, "clipboardData", { value: { files: [file], getData: () => "" } })
    view.contentDOM.dispatchEvent(event)

    expect(uploadHandler).not.toHaveBeenCalled()
    expect(view.state.doc.toString()).toBe("")
  })

  it("拖放圖片時應呼叫上傳 handler 並在放開位置插入 ![[檔名]]", async () => {
    wrapper = mount(CodeMirrorEditor, { props: makeProps("既有內容"), attachTo: document.body })
    const uploadHandler = vi.fn().mockResolvedValue("dropped-image.png")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).setImagePasteHandler(uploadHandler)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (wrapper.vm as any).editorView
    const file = makeImageFile("dropped.png")
    const event = new Event("drop", { bubbles: true, cancelable: true })
    Object.defineProperty(event, "dataTransfer", { value: { files: [file], getData: () => "" } })
    Object.defineProperty(event, "clientX", { value: 0 })
    Object.defineProperty(event, "clientY", { value: 0 })
    view.contentDOM.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(uploadHandler).toHaveBeenCalledWith(file)
    })
    await wrapper.vm.$nextTick()

    expect(view.state.doc.toString()).toContain("![[dropped-image.png]]")
  })
})
