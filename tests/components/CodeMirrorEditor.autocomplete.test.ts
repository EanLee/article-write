import { describe, it, expect, vi, afterEach } from "vitest"
import { mount, type VueWrapper } from "@vue/test-utils"
import { startCompletion, currentCompletions } from "@codemirror/autocomplete"
import CodeMirrorEditor from "@/components/CodeMirrorEditor.vue"
import type { SuggestionItem } from "@/services/ObsidianSyntaxService"

/**
 * CodeMirrorEditor - Obsidian 自動完成 Provider 橋接
 *
 * 根因（已用本測試驗證，非讀程式碼推論）：CodeMirrorEditor 的 onMounted 在建立
 * EditorState 時呼叫 buildExtensions(_getSuggestions)，若當下 _getSuggestions 為 null，
 * autocompletion() 擴充功能就完全不會被加進該次 EditorState 的 extensions 陣列。
 * MainEditor 只能在子元件（CodeMirrorEditor）掛載「之後」透過 ref 呼叫
 * setSuggestionsProvider（Vue 子元件先於父元件掛載，ref 才會有值），這必然晚於
 * onMounted 建立 EditorState 的時機——單純「呼叫 setSuggestionsProvider」永遠補救不了，
 * 因為 extensions 陣列已經在呼叫之前就固定了。
 */
function makeProps(modelValue = "") {
  return {
    modelValue,
    showPreview: false,
    syntaxErrors: [],
    imageValidationWarnings: [],
  }
}

function makeSuggestions(): SuggestionItem[] {
  return [
    { text: "[[Existing Note]]", displayText: "Existing Note", description: "wikilink", type: "wikilink" },
  ]
}

describe("CodeMirrorEditor - Obsidian 自動完成 Provider 橋接", () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it("掛載後（模擬 MainEditor 的晚綁定時機）呼叫 setSuggestionsProvider，輸入 [[ 應能觸發自動完成建議", async () => {
    wrapper = mount(CodeMirrorEditor, { props: makeProps(""), attachTo: document.body })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (wrapper.vm as any).editorView
    const getSuggestions = vi.fn().mockReturnValue(makeSuggestions())
    // 模擬 MainEditor 的真實時機：子元件掛載完成後才由父元件呼叫（見 MainEditor.vue 的 watch(editorPaneRef, ...)）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).setSuggestionsProvider(getSuggestions)

    view.dispatch({ changes: { from: 0, to: 0, insert: "[[" }, selection: { anchor: 2 } })
    startCompletion(view)

    // CM6 的 completion source 呼叫是透過內部 setTimeout debounce（預設 ~100ms）非同步觸發，
    // 不是單一 microtask 就能拿到結果，用 vi.waitFor 輪詢直到 currentCompletions 有值。
    await vi.waitFor(() => {
      expect(currentCompletions(view.state).length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    const completions = currentCompletions(view.state)
    expect(completions.some((c: { label: string }) => c.label === "Existing Note")).toBe(true)
    expect(getSuggestions).toHaveBeenCalled()
  })
})
