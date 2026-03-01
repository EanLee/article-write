/**
 * Q4-T02: AppConfigSchema Zod 驗證測試
 * 驗證 src/main/schemas/config.schema.ts 的 API 邊界驗證行為
 * 符合第四次技術評審安全要求（防止惡意值繞過白名單）
 */
import { describe, it, expect } from "vitest"
import { AppConfigSchema } from "../../src/main/schemas/config.schema"

// ─── 有效設定 ──────────────────────────────────────────────────────────────────

const VALID_CONFIG = {
  paths: {
    articlesDir: "/vault/articles",
    targetBlog: "/blog",
    imagesDir: "/vault/images",
  },
  editorConfig: {
    autoSave: true,
    autoSaveInterval: 5000,
    theme: "light" as const,
  },
}

describe("AppConfigSchema — 有效設定", () => {
  it("應接受完整有效的設定", () => {
    const result = AppConfigSchema.safeParse(VALID_CONFIG)
    expect(result.success).toBe(true)
  })

  it("theme 為 dark 應被接受", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, theme: "dark" as const } }
    expect(AppConfigSchema.safeParse(config).success).toBe(true)
  })

  it("autoSave 為 false 應被接受", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, autoSave: false } }
    expect(AppConfigSchema.safeParse(config).success).toBe(true)
  })

  it("autoSaveInterval 最小值 1000 應被接受", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, autoSaveInterval: 1000 } }
    expect(AppConfigSchema.safeParse(config).success).toBe(true)
  })

  it("autoSaveInterval 最大值 300000 應被接受", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, autoSaveInterval: 300_000 } }
    expect(AppConfigSchema.safeParse(config).success).toBe(true)
  })
})

describe("AppConfigSchema — 路徑欄位驗證", () => {
  it("articlesDir 為空字串應失敗", () => {
    const config = { ...VALID_CONFIG, paths: { ...VALID_CONFIG.paths, articlesDir: "" } }
    const result = AppConfigSchema.safeParse(config)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((e) => e.message)
      expect(messages.some((m) => m.includes("articlesDir"))).toBe(true)
    }
  })

  it("targetBlog 為空字串應失敗", () => {
    const config = { ...VALID_CONFIG, paths: { ...VALID_CONFIG.paths, targetBlog: "" } }
    expect(AppConfigSchema.safeParse(config).success).toBe(false)
  })

  it("imagesDir 為空字串應失敗", () => {
    const config = { ...VALID_CONFIG, paths: { ...VALID_CONFIG.paths, imagesDir: "" } }
    expect(AppConfigSchema.safeParse(config).success).toBe(false)
  })

  it("paths 缺失應失敗", () => {
    const { paths: _paths, ...noPath } = VALID_CONFIG
    expect(AppConfigSchema.safeParse(noPath).success).toBe(false)
  })
})

describe("AppConfigSchema — editorConfig 驗證", () => {
  it("theme 非 light/dark 應失敗（防 XSS 注入）", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, theme: "invalid" } }
    expect(AppConfigSchema.safeParse(config).success).toBe(false)
  })

  it("theme 為空字串應失敗", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, theme: "" } }
    expect(AppConfigSchema.safeParse(config).success).toBe(false)
  })

  it("autoSaveInterval 小於 1000 應失敗（防 DoS）", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, autoSaveInterval: 999 } }
    const result = AppConfigSchema.safeParse(config)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((e) => e.message)
      expect(messages.some((m) => m.includes("1000ms"))).toBe(true)
    }
  })

  it("autoSaveInterval 大於 300000 應失敗（防 DoS）", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, autoSaveInterval: 300_001 } }
    expect(AppConfigSchema.safeParse(config).success).toBe(false)
  })

  it("autoSaveInterval 為非整數應失敗", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, autoSaveInterval: 5000.5 } }
    expect(AppConfigSchema.safeParse(config).success).toBe(false)
  })

  it("autoSave 為字串 'true' 應失敗（型別嚴格）", () => {
    const config = { ...VALID_CONFIG, editorConfig: { ...VALID_CONFIG.editorConfig, autoSave: "true" } }
    expect(AppConfigSchema.safeParse(config).success).toBe(false)
  })

  it("缺少 editorConfig 應失敗", () => {
    const { editorConfig: _e, ...noEditor } = VALID_CONFIG
    expect(AppConfigSchema.safeParse(noEditor).success).toBe(false)
  })
})

describe("AppConfigSchema — 邊界及惡意輸入", () => {
  it("完全空物件應失敗", () => {
    expect(AppConfigSchema.safeParse({}).success).toBe(false)
  })

  it("null 應失敗", () => {
    expect(AppConfigSchema.safeParse(null).success).toBe(false)
  })

  it("inject SQL-like 字串至路徑欄位仍應通過（schema 只驗型別，路徑安全由 FileService 負責）", () => {
    const config = { ...VALID_CONFIG, paths: { ...VALID_CONFIG.paths, articlesDir: "' OR 1=1 --" } }
    // AppConfigSchema 只驗非空字串，路徑內容安全由 FileService.validatePath 負責
    expect(AppConfigSchema.safeParse(config).success).toBe(true)
  })
})
