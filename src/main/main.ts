import { initSentry } from "./sentry.js";
import { app, BrowserWindow, ipcMain, dialog } from "electron";
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
import { AIService, AIError } from "./services/AIService.js";
import { IPC } from "./ipc-channels.js";
import type { SearchQuery } from "../types/index.js";
import type { SEOGenerationInput } from "./services/AIProvider/types.js";

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
const gitService = new GitService();
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

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info: { version: string }) => {
    mainWindow?.webContents.send(IPC.EVENT_UPDATE_AVAILABLE, { version: info.version });
  });

  autoUpdater.on("update-downloaded", (info: { version: string }) => {
    mainWindow?.webContents.send(IPC.EVENT_UPDATE_DOWNLOADED, { version: info.version });
  });

  autoUpdater.on("error", (err: Error) => {
    // 更新失敗不影響 App，僅 log
    console.error("[AutoUpdater] error:", err.message);
  });

  autoUpdater.checkForUpdates();
}

app.whenReady().then(async () => {
  createWindow();
  setupAutoUpdater();

  // 載入設定並初始化檔案路徑白名單
  try {
    const initialConfig = await configService.getConfig();
    fileService.setAllowedPaths([initialConfig?.paths?.articlesDir, initialConfig?.paths?.targetBlog]);
  } catch {
    // 設定尚未建立時允許不設定（白名單將為空陣列，不限制存取）
  }

  // Register IPC handlers
  ipcMain.handle(IPC.READ_FILE, (_, path: string) => fileService.readFile(path));
  ipcMain.handle(IPC.WRITE_FILE, (_, path: string, content: string) => fileService.writeFile(path, content));
  ipcMain.handle(IPC.DELETE_FILE, (_, path: string) => fileService.deleteFile(path));
  ipcMain.handle(IPC.COPY_FILE, (_, sourcePath: string, targetPath: string) => fileService.copyFile(sourcePath, targetPath));
  ipcMain.handle(IPC.READ_DIRECTORY, (_, path: string) => fileService.readDirectory(path));
  ipcMain.handle(IPC.CREATE_DIRECTORY, (_, path: string) => fileService.createDirectory(path));
  ipcMain.handle(IPC.GET_FILE_STATS, (_, path: string) => fileService.getFileStats(path));

  ipcMain.handle(IPC.GET_CONFIG, () => configService.getConfig());
  ipcMain.handle(IPC.SET_CONFIG, async (_, config: any) => {
    await configService.setConfig(config);
    // 同步更新檔案存取白名單，防止路徑穿越攻擊
    fileService.setAllowedPaths([config?.paths?.articlesDir, config?.paths?.targetBlog]);
  });
  ipcMain.handle(IPC.VALIDATE_ARTICLES_DIR, (_, path: string) => configService.validateArticlesDir(path));
  ipcMain.handle(IPC.VALIDATE_ASTRO_BLOG, (_, path: string) => configService.validateAstroBlog(path));

  // Publish Service
  ipcMain.handle(IPC.PUBLISH_ARTICLE, async (_, article: any, config: any, onProgress?: any) => {
    return await publishService.publishArticle(article, config, onProgress);
  });

  ipcMain.handle(IPC.SYNC_ALL_PUBLISHED, async (event, config: any) => {
    return await publishService.syncAllPublished(config, (current, total, title) => {
      event.sender.send(IPC.EVENT_SYNC_PROGRESS, { current, total, title });
    });
  });

  // Git Service
  ipcMain.handle(IPC.GIT_STATUS, (_, repoPath: string) => gitService.getStatus(repoPath));
  ipcMain.handle(IPC.GIT_ADD, (_, repoPath: string, paths?: string[]) => gitService.add(repoPath, paths));
  ipcMain.handle(IPC.GIT_COMMIT, (_, repoPath: string, options: { message: string; addAll?: boolean }) => gitService.commit(repoPath, options));
  ipcMain.handle(IPC.GIT_PUSH, (_, repoPath: string, options?: { remote?: string; branch?: string }) => gitService.push(repoPath, options));
  ipcMain.handle(IPC.GIT_ADD_COMMIT_PUSH, (_, repoPath: string, commitMessage: string) => gitService.addCommitPush(repoPath, commitMessage));
  ipcMain.handle(IPC.GIT_LOG, (_, repoPath: string, count?: number) => gitService.getLog(repoPath, count));

  ipcMain.handle(IPC.START_DEV_SERVER, (_, projectPath: string) => processService.startDevServer(projectPath));
  ipcMain.handle(IPC.STOP_DEV_SERVER, () => processService.stopDevServer());
  ipcMain.handle(IPC.GET_SERVER_STATUS, () => processService.getServerStatus());

  // 搜尋
  ipcMain.handle(IPC.SEARCH_QUERY, (_event, query: SearchQuery) => {
    return searchService.search(query);
  });
  ipcMain.handle(IPC.SEARCH_BUILD_INDEX, async (_event, articlesDir: string) => {
    await searchService.buildIndex(articlesDir);
    return searchService.getIndexSize();
  });

  // 檔案監聽
  ipcMain.handle("start-file-watching", (_, watchPath: string) => {
    fileService.startWatching(watchPath, (event, filePath) => {
      // 只監聽 .md 檔案
      if (filePath.endsWith(".md")) {
        mainWindow?.webContents.send("file-change", { event, path: filePath });
        // 增量更新搜尋索引
        if (event === "unlink") {
          searchService.removeFile(filePath);
        } else {
          searchService.updateFile(filePath).catch(() => {});
        }
      }
    });
    return true;
  });
  ipcMain.handle("stop-file-watching", () => {
    fileService.stopWatching();
    return true;
  });
  ipcMain.handle("is-file-watching", () => fileService.isWatching());

  // Auto-Update
  ipcMain.handle(IPC.INSTALL_UPDATE, () => {
    autoUpdater.quitAndInstall();
  });

  // Directory selection
  ipcMain.handle(IPC.SELECT_DIRECTORY, async (_, options?: { title?: string; defaultPath?: string }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: options?.title || "選擇資料夾",
      defaultPath: options?.defaultPath,
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  // AI Service
  ipcMain.handle(IPC.AI_GENERATE_SEO, async (_, input: SEOGenerationInput, provider?: "claude" | "gemini" | "openai") => {
    try {
      const data = await aiService.generateSEO(input, provider);
      return { success: true, data };
    } catch (e) {
      if (e instanceof AIError) {
        return { success: false, code: e.code, message: e.message };
      }
      return { success: false, code: "AI_API_ERROR", message: String(e) };
    }
  });
  ipcMain.handle(IPC.AI_SET_API_KEY, (_, provider: string, key: string) => {
    configService.setApiKey(provider as "claude" | "gemini" | "openai", key);
  });
  ipcMain.handle(IPC.AI_GET_HAS_API_KEY, (_, provider: string) => {
    return configService.hasApiKey(provider as "claude" | "gemini" | "openai");
  });
  ipcMain.handle(IPC.AI_GET_ACTIVE_PROVIDER, () => {
    return aiService.getActiveProvider();
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
  processService.stopDevServer();
});
