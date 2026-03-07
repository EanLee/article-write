import { z } from "zod"

/**
 * Zod schema for AppConfig — IPC setConfig handler 的入口驗證
 *
 * 設計目標：
 * 1. articlesDir 為必填（唯一啟動條件）；targetDir/imagesDir 為選填。
 *    FileService.setAllowedPaths 已有 .filter(Boolean) 過濾空路徑，不存在安全疑慮。
 * 2. 確保 autoSaveInterval 在合理範圍（防止惡意值造成效能攻擊）
 * 3. 確保 theme 只能是已知值（防止 XSS 透過 theme 注入）
 */
export const AppConfigSchema = z.object({
  paths: z.object({
    articlesDir: z.string().min(1, "articlesDir 不得為空"),
    targetDir: z.string(),
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
// AppConfig 型別定義集中於 src/types/index.ts，此處不重複 export
