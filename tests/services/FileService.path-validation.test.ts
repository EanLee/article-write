/**
 * Q4-T01: FileService 路徑白名單驗證測試
 * 驗證 src/main/services/FileService.ts 的 setAllowedPaths / validatePath 行為
 * 符合第四次技術評審 S4-02 安全要求
 *
 * 測試策略：
 *   validatePath 在任何 fs 操作前被呼叫，路徑驗證失敗時拋出 "Access denied"。
 *   允許的路徑嘗試實際 fs 讀寫（會因檔案不存在拋出 "Failed to..."）。
 *   如此不需 mock fs 即可區分「被拒絕」vs「允許但檔案不存在」。
 */
import { describe, it, expect, beforeEach } from "vitest"
import { FileService } from "@/main/services/FileService"
import path from "path"

// 測試用根目錄（不需實際存在）
const VAULT = path.resolve("/test/vault_unit")
const BLOG = path.resolve("/test/blog_unit")
const OUTSIDE = path.resolve("/etc/passwd_test")

/** 判斷成功通過路徑驗證（嘗試實際 fs 操作，會因不存在而失敗但不是 "Access denied"） */
function isAllowed(err: unknown): boolean {
  return err instanceof Error && !err.message.includes("Access denied")
}

// ─── setAllowedPaths 行為 ─────────────────────────────────────────────────────

describe("FileService — setAllowedPaths", () => {
  let service: FileService

  beforeEach(() => {
    service = new FileService()
  })

  it("未設定白名單時，任何路徑應被允許（初始化前不限制）", async () => {
    let err: unknown
    try {
      await service.readFile(OUTSIDE)
    } catch (e) {
      err = e
    }
    // 應因檔案不存在而失敗，即通過路徑驗證
    expect(isAllowed(err)).toBe(true)
  })

  it("設定白名單後，白名單內路徑應被允許", async () => {
    service.setAllowedPaths([VAULT])
    const filePath = path.join(VAULT, "article.md")
    let err: unknown
    try {
      await service.readFile(filePath)
    } catch (e) {
      err = e
    }
    expect(isAllowed(err)).toBe(true)
  })

  it("設定白名單後，白名單外路徑應拋出 Access denied", async () => {
    service.setAllowedPaths([VAULT])
    await expect(service.readFile(OUTSIDE)).rejects.toThrow("Access denied")
  })

  it("允許根目錄本身被存取", async () => {
    service.setAllowedPaths([VAULT])
    let err: unknown
    try {
      await service.readFile(VAULT)
    } catch (e) {
      err = e
    }
    expect(isAllowed(err)).toBe(true)
  })

  it("多個白名單根目錄應同時生效", async () => {
    service.setAllowedPaths([VAULT, BLOG])
    const vaultFile = path.join(VAULT, "a.md")
    const blogFile = path.join(BLOG, "b.md")
    let vaultErr: unknown, blogErr: unknown
    try { await service.readFile(vaultFile) } catch (e) { vaultErr = e }
    try { await service.readFile(blogFile) } catch (e) { blogErr = e }
    expect(isAllowed(vaultErr)).toBe(true)
    expect(isAllowed(blogErr)).toBe(true)
  })
})

// ─── 路徑穿越攻擊防禦 ─────────────────────────────────────────────────────────

describe("FileService — 路徑穿越攻擊防禦", () => {
  let service: FileService

  beforeEach(() => {
    service = new FileService()
    service.setAllowedPaths([VAULT])
  })

  it("../ 路徑穿越應被拒絕", async () => {
    const traversal = path.join(VAULT, "..", "secret.txt")
    await expect(service.readFile(traversal)).rejects.toThrow("Access denied")
  })

  it("../../ 多層路徑穿越應被拒絕", async () => {
    const traversal = path.join(VAULT, "..", "..", "etc", "passwd")
    await expect(service.readFile(traversal)).rejects.toThrow("Access denied")
  })

  it("相似字首但非子目錄的路徑應被拒絕", async () => {
    // /test/vault_unit_evil 不應被 /test/vault_unit 的白名單允許
    const similar = path.resolve("/test/vault_unit_evil/file.txt")
    await expect(service.readFile(similar)).rejects.toThrow("Access denied")
  })

  it("writeFile 也應進行路徑驗證", async () => {
    const outside = path.join(VAULT, "..", "evil.sh")
    await expect(service.writeFile(outside, "malicious")).rejects.toThrow("Access denied")
  })

  it("deleteFile 也應進行路徑驗證", async () => {
    await expect(service.deleteFile(OUTSIDE)).rejects.toThrow("Access denied")
  })

  it("readDirectory 也應進行路徑驗證", async () => {
    await expect(service.readDirectory(OUTSIDE)).rejects.toThrow("Access denied")
  })

  it("exists() 也應進行路徑驗證", async () => {
    await expect(service.exists(OUTSIDE)).rejects.toThrow("Access denied")
  })

  it("checkWritable() 也應進行路徑驗證", async () => {
    await expect(service.checkWritable(OUTSIDE)).rejects.toThrow("Access denied")
  })
})
