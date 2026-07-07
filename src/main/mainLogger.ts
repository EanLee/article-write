/**
 * Main Process Logger
 * Dev 模式：同時輸出到終端機與 log 檔（%AppData%\WriteFlow\logs\main.log）
 * Prod 模式：僅輸出 warn/error 到終端機，不寫檔
 */

import log from "electron-log/main";

const isDev = process.env.NODE_ENV !== "production";

log.initialize();

if (isDev) {
  log.transports.file.level = "debug";
  log.transports.console.level = "debug";
  log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
} else {
  log.transports.file.level = false;
  log.transports.console.level = "warn";
}

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
