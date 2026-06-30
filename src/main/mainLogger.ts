/**
 * Main Process Logger
 * 在開發環境下輸出 debug/info 日誌，在生產環境只輸出 warn/error
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.log("[DEBUG]", ...args);
    }
  },
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info("[INFO]", ...args);
    }
  },
  warn: (...args: unknown[]): void => {
    console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]): void => {
    console.error("[ERROR]", ...args);
  },
};
