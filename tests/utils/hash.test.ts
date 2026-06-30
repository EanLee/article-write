import { describe, it, expect } from "vitest"
import { fnv1aHash } from "@/utils/hash"

describe("fnv1aHash", () => {
  it("相同字串應產生相同 hash", () => {
    expect(fnv1aHash("hello world")).toBe(fnv1aHash("hello world"))
  })

  it("不同字串應產生不同 hash", () => {
    expect(fnv1aHash("hello world")).not.toBe(fnv1aHash("hello world!"))
  })

  it("空字串應可正常處理", () => {
    expect(fnv1aHash("")).toBe(fnv1aHash(""))
  })

  it("回傳值應為固定長度的 16 進位字串", () => {
    expect(fnv1aHash("test")).toMatch(/^[0-9a-f]{8}$/)
  })
})
