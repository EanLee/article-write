/**
 * Q4-T03: SearchPanel highlightKeyword XSS 防護測試
 * 驗證 src/utils/dom.ts 的 escapeHtml 與 highlightKeyword 函式
 * 符合第四次技術評審的安全要求
 */
import { describe, it, expect } from "vitest"
import { escapeHtml, highlightKeyword } from "@/utils/dom"

// ─── escapeHtml ───────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("應轉換 & 為 &amp;", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b")
  })

  it("應轉換 < 為 &lt;", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;")
  })

  it("應轉換 > 為 &gt;", () => {
    expect(escapeHtml("2 > 1")).toBe("2 &gt; 1")
  })

  it('應轉換 " 為 &quot;', () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;")
  })

  it("應同時處理所有特殊字元", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    )
  })

  it("純文字不應被修改", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123")
  })

  it("空字串應回傳空字串", () => {
    expect(escapeHtml("")).toBe("")
  })
})

// ─── highlightKeyword XSS 防護 ────────────────────────────────────────────────

describe("highlightKeyword — XSS 防護", () => {
  it("text 中的 HTML 標籤應被 escape（不得渲染為 HTML）", () => {
    const result = highlightKeyword("<script>alert('xss')</script>", "")
    expect(result).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;")
    expect(result).not.toContain("<script>")
  })

  it("keyword 中的 HTML 不應讓 text 逸出 escape", () => {
    const result = highlightKeyword("<b>粗體</b>", "粗")
    expect(result).toContain("&lt;b&gt;")
    expect(result).not.toContain("<b>粗")
  })

  it("text 含 & 符號應被正確 escape", () => {
    const result = highlightKeyword("AT&T 公司", "")
    expect(result).toBe("AT&amp;T 公司")
    expect(result).not.toContain("AT&T")
  })

  it("text 含引號不應破壞 HTML 屬性", () => {
    const result = highlightKeyword('onclick="alert(1)"', "")
    expect(result).toBe("onclick=&quot;alert(1)&quot;")
    expect(result).not.toContain('"alert(1)"')
  })

  it("keyword 中包含 regex 特殊字元不應拋出錯誤", () => {
    expect(() => highlightKeyword("(test)", "(")).not.toThrow()
    expect(() => highlightKeyword("file.txt", ".")).not.toThrow()
    expect(() => highlightKeyword("a*b", "*")).not.toThrow()
  })
})

// ─── highlightKeyword 功能行為 ────────────────────────────────────────────────

describe("highlightKeyword — 關鍵字標示", () => {
  it("空 keyword 應回傳 escaped text（不含 <mark>）", () => {
    const result = highlightKeyword("Hello World", "")
    expect(result).toBe("Hello World")
    expect(result).not.toContain("<mark")
  })

  it("純空白 keyword 應視為空（不含 <mark>）", () => {
    const result = highlightKeyword("Hello World", "   ")
    expect(result).toBe("Hello World")
    expect(result).not.toContain("<mark")
  })

  it("符合的關鍵字應被 <mark> 包裹", () => {
    const result = highlightKeyword("Hello World", "World")
    expect(result).toContain("<mark")
    expect(result).toContain("World")
    expect(result).toContain("</mark>")
  })

  it("比對應不分大小寫（case-insensitive）", () => {
    const lower = highlightKeyword("TypeScript", "typescript")
    const upper = highlightKeyword("TypeScript", "TYPESCRIPT")
    expect(lower).toContain("<mark")
    expect(upper).toContain("<mark")
  })

  it("多次出現的關鍵字應全部標示", () => {
    const result = highlightKeyword("cat and catfish", "cat")
    const markCount = (result.match(/<mark/g) ?? []).length
    expect(markCount).toBe(2)
  })

  it("keyword 不存在時不應插入 <mark>", () => {
    const result = highlightKeyword("Hello World", "xyz")
    expect(result).toBe("Hello World")
    expect(result).not.toContain("<mark")
  })

  it("標示包含 HTML 字元的關鍵字（關鍵字本身應 escape）", () => {
    // text: "a<b" keyword: "<b" → 應在 escaped 後的 "&lt;b" 中找到 "&lt;b" 並標示
    const result = highlightKeyword("a<b>content", "b")
    // "b>" is escaped to "b&gt;" - keyword "b" should be highlighted inside the escaped text
    expect(result).toContain("<mark")
    expect(result).toContain("&lt;")
    expect(result).not.toContain("<b>") // 原始 HTML 標籤不得出現
  })
})
