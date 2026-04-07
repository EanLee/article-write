import type { EditorState, TransactionSpec } from "@codemirror/state"

/**
 * Toggle inline format (bold **, italic *, strikethrough ~~, etc.)
 * - Has selection → wrap or unwrap
 * - No selection → insert marker+placeholder+marker, select placeholder
 */
export function toggleInlineFormatSpec(
  marker: string,
  placeholder: string,
  state: EditorState,
): TransactionSpec {
  const sel = state.selection.main
  if (!sel.empty) {
    const selected = state.sliceDoc(sel.from, sel.to)
    const mLen = marker.length
    if (
      selected.startsWith(marker) &&
      selected.endsWith(marker) &&
      selected.length > mLen * 2
    ) {
      // Unwrap
      return {
        changes: { from: sel.from, to: sel.to, insert: selected.slice(mLen, -mLen) },
        selection: { anchor: sel.from, head: sel.to - mLen * 2 },
      }
    }
    // Wrap
    return {
      changes: { from: sel.from, to: sel.to, insert: `${marker}${selected}${marker}` },
      selection: { anchor: sel.from + mLen, head: sel.to + mLen },
    }
  }
  // No selection — insert with placeholder selected
  return {
    changes: { from: sel.from, insert: `${marker}${placeholder}${marker}` },
    selection: { anchor: sel.from + marker.length, head: sel.from + marker.length + placeholder.length },
  }
}

/**
 * Toggle heading level on the current line.
 * Same level → remove. Different level → replace. No heading → add.
 */
export function toggleHeadingSpec(level: number, state: EditorState): TransactionSpec {
  const line = state.doc.lineAt(state.selection.main.from)
  const text = line.text
  const marker = "#".repeat(level) + " "
  const existing = text.match(/^(#{1,6}) /)

  if (existing) {
    if (existing[1].length === level) {
      // Remove heading
      return { changes: { from: line.from, to: line.from + existing[0].length, insert: "" } }
    }
    // Change level
    return { changes: { from: line.from, to: line.from + existing[0].length, insert: marker } }
  }
  // Add heading
  return { changes: { from: line.from, insert: marker } }
}

/**
 * Insert a Markdown link.
 * Selection becomes the display text; cursor lands on "url".
 */
export function insertLinkSpec(state: EditorState): TransactionSpec {
  const sel = state.selection.main
  if (!sel.empty) {
    const selected = state.sliceDoc(sel.from, sel.to)
    const inserted = `[${selected}](url)`
    return {
      changes: { from: sel.from, to: sel.to, insert: inserted },
      // Select the word "url"
      selection: {
        anchor: sel.from + 1 + selected.length + 2,
        head: sel.from + 1 + selected.length + 5,
      },
    }
  }
  return {
    changes: { from: sel.from, insert: "[link text](url)" },
    selection: { anchor: sel.from + 1, head: sel.from + 10 },
  }
}

/**
 * Wrap selection in a fenced code block (```...```).
 * No selection → empty block, cursor inside.
 */
export function insertCodeBlockSpec(state: EditorState): TransactionSpec {
  const sel = state.selection.main
  if (!sel.empty) {
    const selected = state.sliceDoc(sel.from, sel.to)
    const block = `\`\`\`\n${selected}\n\`\`\``
    return {
      changes: { from: sel.from, to: sel.to, insert: block },
      selection: { anchor: sel.from + 4 + selected.length + 1 },
    }
  }
  return {
    changes: { from: sel.from, insert: "```\n\n```" },
    selection: { anchor: sel.from + 4 },
  }
}

/**
 * Insert a numbered footnote at cursor + definition at end of document.
 * Auto-increments based on existing [^N] references.
 */
export function insertFootnoteSpec(state: EditorState): TransactionSpec {
  const doc = state.doc
  const text = doc.toString()
  const sel = state.selection.main

  // Find highest existing footnote number
  const existing = [...text.matchAll(/\[\^(\d+)\]/g)].map(m => parseInt(m[1], 10))
  const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1

  const inlineRef = `[^${nextNum}]`
  const definition = `\n\n[^${nextNum}]: `

  // Find last non-empty line
  let lastContentPos = doc.length
  for (let i = doc.lines; i >= 1; i--) {
    if (doc.line(i).text.trim() !== "") {
      lastContentPos = doc.line(i).to
      break
    }
  }

  // The definition insertion point in the NEW doc (after inline ref is inserted)
  const defPos = lastContentPos + inlineRef.length

  return {
    changes: [
      { from: sel.from, insert: inlineRef },
      { from: lastContentPos, insert: definition },
    ],
    // Cursor at end of definition line (after "[^N]: ")
    selection: { anchor: defPos + definition.length },
  }
}

/**
 * Insert strikethrough around selection or placeholder.
 */
export function insertStrikethroughSpec(state: EditorState): TransactionSpec {
  return toggleInlineFormatSpec("~~", "strikethrough", state)
}
