import { z } from "zod"

/**
 * Zod schema for AppConfig — IPC setConfig handler 的入口驗證
 *
 * 設計目標：
 * 1. 確保路徑欄位為字串（防止非字串值繞過 FileService 白名單）
 *    注意：路徑允許為空字串（用於初始設定或部分設定的情境）；
 *    FileService.setAllowedPaths() 已透過 filter(Boolean) 過濾空路徑，不會產生安全漏洞
 * 2. 確保 autoSaveInterval 在合理範圍（防止惡意值造成效能攻擊）
 * 3. 確保 theme 只能是已知值（防止 XSS 透過 theme 注入）
 */
export const AppConfigSchema = z.object({
  paths: z.object({
    articlesDir: z.string(),
    targetBlog: z.string(),
    imagesDir: z.string(),
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
