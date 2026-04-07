import { describe, it, expect } from "vitest"
import { EditorState } from "@codemirror/state"
import {
  toggleInlineFormatSpec,
  toggleHeadingSpec,
  insertLinkSpec,
  insertCodeBlockSpec,
  insertFootnoteSpec,
} from "@/utils/editorCommands"

// Helper: create a state with a selection
function stateWith(doc: string, anchor: number, head: number) {
  return EditorState.create({ doc }).update({ selection: { anchor, head } }).state
}

describe("toggleInlineFormatSpec", () => {
  it("wraps selected text with marker", () => {
    const state = stateWith("hello world", 0, 5)
    const spec = toggleInlineFormatSpec("**", "bold text", state)
    const newDoc = state.update(spec).state.doc.toString()
    expect(newDoc).toBe("**hello** world")
  })

  it("inserts placeholder when no selection", () => {
    const state = stateWith("", 0, 0)
    const spec = toggleInlineFormatSpec("**", "bold text", state)
    const newState = state.update(spec).state
    expect(newState.doc.toString()).toBe("**bold text**")
    // Selection covers the placeholder
    expect(newState.selection.main.from).toBe(2)
    expect(newState.selection.main.to).toBe(11)
  })

  it("unwraps when selection is already wrapped", () => {
    const state = stateWith("**hello**", 0, 9)
    const spec = toggleInlineFormatSpec("**", "bold text", state)
    const newDoc = state.update(spec).state.doc.toString()
    expect(newDoc).toBe("hello")
  })
})

describe("toggleHeadingSpec", () => {
  it("adds heading prefix to plain line", () => {
    const state = stateWith("Hello world", 0, 0)
    const spec = toggleHeadingSpec(2, state)
    expect(state.update(spec).state.doc.toString()).toBe("## Hello world")
  })

  it("changes existing heading level", () => {
    const state = stateWith("# Hello world", 0, 0)
    const spec = toggleHeadingSpec(2, state)
    expect(state.update(spec).state.doc.toString()).toBe("## Hello world")
  })

  it("removes heading when same level pressed", () => {
    const state = stateWith("## Hello world", 0, 0)
    const spec = toggleHeadingSpec(2, state)
    expect(state.update(spec).state.doc.toString()).toBe("Hello world")
  })
})

describe("insertLinkSpec", () => {
  it("wraps selected text as link display", () => {
    const state = stateWith("Click here", 6, 10)
    const spec = insertLinkSpec(state)
    expect(state.update(spec).state.doc.toString()).toBe("Click [here](url)")
  })

  it("inserts placeholder link when no selection", () => {
    const state = stateWith("", 0, 0)
    const newState = state.update(insertLinkSpec(state)).state
    expect(newState.doc.toString()).toBe("[link text](url)")
  })
})

describe("insertCodeBlockSpec", () => {
  it("wraps selection in code block", () => {
    const state = stateWith("console.log()", 0, 13)
    const newState = state.update(insertCodeBlockSpec(state)).state
    expect(newState.doc.toString()).toBe("```\nconsole.log()\n```")
  })

  it("inserts empty code block when no selection", () => {
    const state = stateWith("", 0, 0)
    const newState = state.update(insertCodeBlockSpec(state)).state
    expect(newState.doc.toString()).toBe("```\n\n```")
  })
})

describe("insertFootnoteSpec", () => {
  it("inserts [^1] at cursor and definition at end when no existing footnotes", () => {
    const state = stateWith("Some text", 4, 4) // cursor after "Some"
    const newState = state.update(insertFootnoteSpec(state)).state
    const doc = newState.doc.toString()
    expect(doc).toContain("[^1]")
    expect(doc).toContain("[^1]: ")
    expect(doc.startsWith("Some[^1] text")).toBe(true)
  })

  it("increments footnote number based on existing ones", () => {
    const state = stateWith("Text[^1] more\n\n[^1]: first note", 13, 13)
    const newState = state.update(insertFootnoteSpec(state)).state
    expect(newState.doc.toString()).toContain("[^2]")
    expect(newState.doc.toString()).toContain("[^2]: ")
  })
})
