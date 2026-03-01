import { z } from "zod"

/**
 * Zod schema for AppConfig — IPC setConfig handler 的入口驗證
 *
 * 設計目標：
 * 1. 確保路徑欄位為非空字串（防止空白路徑繞過 FileService 白名單）
 * 2. 確保 autoSaveInterval 在合理範圍（防止惡意值造成效能攻擊）
 * 3. 確保 theme 只能是已知值（防止 XSS 透過 theme 注入）
 */
export const AppConfigSchema = z.object({
  paths: z.object({
    articlesDir: z.string().min(1, "articlesDir 不得為空"),
    targetBlog: z.string().min(1, "targetBlog 不得為空"),
    imagesDir: z.string().min(1, "imagesDir 不得為空"),
  }),
  editorConfig: z.object({
    autoSave: z.boolean(),
    autoSaveInterval: z
      .number()
      .int()
      .min(1000, "autoSaveInterval 最小 1000ms")
      .max(300_000, "autoSaveInterval 最大 300000ms"),
    theme: z.enum(["light", "dark"]),
  }),
})

export type AppConfig = z.infer<typeof AppConfigSchema>
