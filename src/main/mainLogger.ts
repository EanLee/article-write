/**
 * Main Process Logger
 * Dev 模式：同時輸出到終端機與 log 檔（%AppData%\{appName}\logs\main.log）
 * Prod 模式：僅輸出 warn/error 到終端機，不寫檔
 */

import log from "electron-log/main";
import { app } from "electron";
import { join } from "node:path";

const isDev = process.env.NODE_ENV !== "production";

// initialize() 須在 app.ready 前呼叫（設定 IPC handler）
log.initialize();

// resolvePathFn 在第一次寫 log 時才執行；variables.userData 由 electron-log 自動解析
log.transports.file.resolvePathFn = (variables) =>
  join(variables.userData ?? app.getPath("userData"), "logs", "main.log");

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
