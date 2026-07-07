/**
 * Renderer Process Logger
 * Dev 模式：透過 electron-log IPC bridge 寫入與 main process 共用的 log 檔
 * Prod 模式：僅輸出 warn/error 到 console
 */

import log from "electron-log/renderer";

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDev) {log.debug(...args);}
  },
  info: (...args: unknown[]): void => {
    if (isDev) {log.info(...args);}
  },
  warn: (...args: unknown[]): void => {
    log.warn(...args);
  },
  error: (...args: unknown[]): void => {
    log.error(...args);
  },
};
