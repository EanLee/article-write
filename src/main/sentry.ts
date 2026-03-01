/**
 * Sentry 設定模組（Main Process 用）
 *
 * Renderer Process 請使用 src/config/sentry.ts
 *
 * - dev / test 環境下不啟用，避免開發期間產生雜訊
 * - 從環境變數 VITE_SENTRY_DSN 讀取 DSN
 */
import * as Sentry from "@sentry/electron/main"

/** 是否為生產環境（electron 已打包） */
function isProd(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * 初始化 Sentry（Main Process）
 *
 * 應在 app.whenReady() 之前或最早期呼叫，
 * 以確保能捕捉到啟動階段的錯誤。
 */
export function initSentry(): void {
  const dsn = process.env.VITE_SENTRY_DSN ?? ""

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

  // 捕捉未處理的同步例外
  process.on("uncaughtException", (error: Error) => {
    Sentry.captureException(error)
    setTimeout(() => process.exit(1), 1000)
  })

  // 捕捉未處理的 Promise rejection
  process.on("unhandledRejection", (reason: unknown) => {
    Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)))
  })
}
