/**
 * Logger 工具
 * 在開發環境下輸出 debug/info 日誌，在生產環境只輸出 warn/error
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * 除錯日誌（僅在開發環境輸出）
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.log("[DEBUG]", ...args);
    }
  },

  /**
   * 資訊日誌（僅在開發環境輸出）
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info("[INFO]", ...args);
    }
  },

  /**
   * 警告日誌（總是輸出）
   */
  warn: (...args: unknown[]): void => {
    console.warn("[WARN]", ...args);
  },

  /**
   * 錯誤日誌（總是輸出）
   */
  error: (...args: unknown[]): void => {
    console.error("[ERROR]", ...args);
  },
};
