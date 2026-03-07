import { initSentry } from "./sentry.js";
import { app, BrowserWindow } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import { FileService } from "./services/FileService.js";
import { ConfigService } from "./services/ConfigService.js";
import { ProcessService } from "./services/ProcessService.js";
import { PublishService } from "./services/PublishService.js";
import { GitService } from "./services/GitService.js";
import { SearchService } from "./services/SearchService.js";
import { AIService } from "./services/AIService.js";
import { IPC } from "./ipc-channels.js";
import { logger } from "./mainLogger.js";
import { registerIpcHandlers } from "./registerIpcHandlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isTest = process.env.NODE_ENV === "test";
const isDev = !app.isPackaged && !isTest;
// 只有開發模式從 Vite dev server 載入；測試模式從 dist/renderer/index.html 載入
const loadFromDevServer = isDev;

// 盡早初始化 Sentry，確保能捕捉啟動階段的錯誤
initSentry();

// 停用 Autofill 功能以消除 DevTools protocol 警告
app.commandLine.appendSwitch("disable-features", "AutofillServerCommunication");

let mainWindow: BrowserWindow;

// 模組級別服務實例，確保整個應用生命週期使用同一實例
const fileService = new FileService();
const configService = new ConfigService();
const processService = new ProcessService();
const publishService = new PublishService(fileService);
const gitService = new GitService(configService); // S7-01: 注入 ConfigService 以啟用 repoPath 白名單驗證
const searchService = new SearchService();
const aiService = new AIService(configService);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: false 允許 preload 使用 ESM import 語法（NodeNext 模組系統）
      // 安全性由 contextIsolation: true 保障
      sandbox: false,
      preload: join(__dirname, "../preload/preload.js"),
    },
  });

  // 設定 Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          loadFromDevServer
            ? // 開發模式：允許 Vite 開發伺服器和熱更新
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' http://localhost:3002; " +
              "style-src 'self' 'unsafe-inline' http://localhost:3002; " +
              "img-src 'self' data: http://localhost:3002; " +
              "connect-src 'self' ws://localhost:3002 http://localhost:3002; " +
              "font-src 'self' data:;"
            : // 生產模式：更嚴格的策略
              "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data:; " +
              "connect-src 'self'; " +
              "font-src 'self' data:;",
        ],
      },
    });
  });

  if (loadFromDevServer) {
    mainWindow.loadURL("http://localhost:3002");
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function setupAutoUpdater() {
  // 開發/測試模式不執行更新檢查
  if (isDev || isTest) {
    return;
  }

  autoUpdater.autoDownload = false; // QUAL6-03: 改為使用者確認後才下載，防止供應鏈攻擊
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info: { version: string }) => {
    mainWindow?.webContents.send(IPC.EVENT_UPDATE_AVAILABLE, { version: info.version });
  });

  autoUpdater.on("update-downloaded", (info: { version: string }) => {
    mainWindow?.webContents.send(IPC.EVENT_UPDATE_DOWNLOADED, { version: info.version });
  });

  autoUpdater.on("error", (err: Error) => {
    // 更新失敗不影響 App，僅 log
    logger.error("[AutoUpdater] error:", err.message);
  });

  autoUpdater.checkForUpdates();
}

app.whenReady().then(async () => {
  createWindow();
  setupAutoUpdater();

  // 載入設定並初始化檔案路徑白名單
  try {
    const initialConfig = await configService.getConfig();
    fileService.setAllowedPaths([initialConfig?.paths?.articlesDir, initialConfig?.paths?.targetDir, initialConfig?.paths?.imagesDir]);
  } catch {
    // 設定尚未建立；白名單為空陣列，所有檔案操作將被 fail-close 拒絕直到使用者完成路徑設定
  }

  // A6-02: IPC handler 登錄委派至 registerIpcHandlers.ts
  // 避免 app.whenReady() 成為 God Function（~150 行）
  registerIpcHandlers({
    fileService,
    configService,
    processService,
    publishService,
    gitService,
    searchService,
    aiService,
    getMainWindow: () => mainWindow ?? null,
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  // 清理運行中的進程和檔案監聽
  fileService.stopWatching();
  fileService.clearWatchListeners(); // app 完全關閉時才清除所有訂閱者
  processService.stopDevServer();
});
