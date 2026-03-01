/**
 * Sentry 設定模組（Renderer Process 用）
 *
 * Main Process 請使用 src/main/sentry.ts
 *
 * - dev 環境下不啟用，避免開發期間產生雜訊
 * - 從 VITE_SENTRY_DSN 環境變數讀取 DSN
 */
import * as Sentry from "@sentry/electron/renderer"

/** 是否為生產環境 */
function isProd(): boolean {
  return import.meta.env.PROD === true
}

/** 初始化 Sentry（Renderer Process） */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

  if (!isProd()) {
    return
  }

  if (!dsn) {
    console.warn("[Sentry] VITE_SENTRY_DSN is not configured in production")
    return
  }

  Sentry.init({
    dsn,
  })
}
