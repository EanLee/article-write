import { describe, it, expect } from "vitest"
import { EditorState } from "@codemirror/state"
import {
  toggleInlineFormatSpec,
  toggleHeadingSpec,
  insertLinkSpec,
  insertCodeBlockSpec,
  insertFootnoteSpec,
  insertStrikethroughSpec,
} from "@/utils/editorCommands"

// Helper: create a state with a selection
function stateWith(doc: string, anchor: number, head: number) {
  return EditorState.create({ doc }).update({ selection: { anchor, head } }).state
}

describe("toggleInlineFormatSpec", () => {
  it("有選取時包裹文字", () => {
    const state = stateWith("hello world", 0, 5)
    const spec = toggleInlineFormatSpec("**", "bold text", state)
    const newDoc = state.update(spec).state.doc.toString()
    expect(newDoc).toBe("**hello** world")
  })

  it("無選取時插入佔位文字並選中", () => {
    const state = stateWith("", 0, 0)
    const spec = toggleInlineFormatSpec("**", "bold text", state)
    const newState = state.update(spec).state
    expect(newState.doc.toString()).toBe("**bold text**")
    // Selection covers the placeholder
    expect(newState.selection.main.from).toBe(2)
    expect(newState.selection.main.to).toBe(11)
  })

  it("選取已包裹的文字時移除格式", () => {
    const state = stateWith("**hello**", 0, 9)
    const spec = toggleInlineFormatSpec("**", "bold text", state)
    const newDoc = state.update(spec).state.doc.toString()
    expect(newDoc).toBe("hello")
  })
})

describe("toggleHeadingSpec", () => {
  it("在一般行加入標題前綴", () => {
    const state = stateWith("Hello world", 0, 0)
    const spec = toggleHeadingSpec(2, state)
    expect(state.update(spec).state.doc.toString()).toBe("## Hello world")
  })

  it("變更現有標題層級", () => {
    const state = stateWith("# Hello world", 0, 0)
    const spec = toggleHeadingSpec(2, state)
    expect(state.update(spec).state.doc.toString()).toBe("## Hello world")
  })

  it("按下同層級快捷鍵時移除標題", () => {
    const state = stateWith("## Hello world", 0, 0)
    const spec = toggleHeadingSpec(2, state)
    expect(state.update(spec).state.doc.toString()).toBe("Hello world")
  })
})

describe("insertLinkSpec", () => {
  it("有選取時以選取文字作為連結顯示名稱", () => {
    const state = stateWith("Click here", 6, 10)
    const spec = insertLinkSpec(state)
    expect(state.update(spec).state.doc.toString()).toBe("Click [here](url)")
  })

  it("無選取時插入佔位連結", () => {
    const state = stateWith("", 0, 0)
    const newState = state.update(insertLinkSpec(state)).state
    expect(newState.doc.toString()).toBe("[link text](url)")
  })
})

describe("insertCodeBlockSpec", () => {
  it("有選取時包裹為程式碼區塊", () => {
    const state = stateWith("console.log()", 0, 13)
    const newState = state.update(insertCodeBlockSpec(state)).state
    expect(newState.doc.toString()).toBe("```\nconsole.log()\n```")
  })

  it("無選取時插入空白程式碼區塊", () => {
    const state = stateWith("", 0, 0)
    const newState = state.update(insertCodeBlockSpec(state)).state
    expect(newState.doc.toString()).toBe("```\n\n```")
  })
})

describe("insertFootnoteSpec", () => {
  it("無既有腳註時在游標插入 [^1] 並在末尾新增定義", () => {
    const state = stateWith("Some text", 4, 4) // cursor after "Some"
    const newState = state.update(insertFootnoteSpec(state)).state
    const doc = newState.doc.toString()
    expect(doc).toContain("[^1]")
    expect(doc).toContain("[^1]: ")
    expect(doc.startsWith("Some[^1] text")).toBe(true)
    // Cursor should be at end of definition line
    // "Some text" → "Some[^1] text\n\n[^1]: "
    // inlineRef = "[^1]" (4 chars), definition = "\n\n[^1]: " (8 chars)
    // lastContentPos = 9 (end of "Some text"), defPos = 9 + 4 = 13
    // cursor at 13 + 8 = 21
    expect(newState.selection.main.anchor).toBe(21)
  })

  it("依據現有腳註遞增編號", () => {
    const state = stateWith("Text[^1] more\n\n[^1]: first note", 13, 13)
    const newState = state.update(insertFootnoteSpec(state)).state
    expect(newState.doc.toString()).toContain("[^2]")
    expect(newState.doc.toString()).toContain("[^2]: ")
    // Original doc: "Text[^1] more\n\n[^1]: first note" (31 chars)
    // inlineRef = "[^2]" (4 chars), definition = "\n\n[^2]: " (8 chars)
    // lastContentPos = 31 (end of doc), defPos = 31 + 4 = 35
    // cursor at 35 + 8 = 43
    expect(newState.selection.main.anchor).toBe(43)
  })
})

describe("insertStrikethroughSpec", () => {
  it("有選取時包裹為刪除線", () => {
    const state = stateWith("hello world", 0, 5)
    const spec = insertStrikethroughSpec(state)
    const newDoc = state.update(spec).state.doc.toString()
    expect(newDoc).toBe("~~hello~~ world")
  })

  it("無選取時插入佔位文字", () => {
    const state = stateWith("", 0, 0)
    const newState = state.update(insertStrikethroughSpec(state)).state
    expect(newState.doc.toString()).toBe("~~strikethrough~~")
  })
})
