import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AppConfig, Article } from "../types/index.js";
import { IPC } from "./ipc-channels.js";
import { FileService } from "./services/FileService.js";
import { ConfigService } from "./services/ConfigService.js";
import { ProcessService } from "./services/ProcessService.js";
import { PublishService } from "./services/PublishService.js";
import type { PublishConfig } from "./services/PublishService.js";
import { GitService } from "./services/GitService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow;

// 模組級別服務實例，確保整個應用生命週期使用同一實例
const fileService = new FileService();
const configService = new ConfigService();
const processService = new ProcessService();
const publishService = new PublishService(fileService);
const gitService = new GitService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  // 設定 Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          isDev
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

  if (isDev) {
    mainWindow.loadURL("http://localhost:3002");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Register IPC handlers
  ipcMain.handle(IPC.READ_FILE,        (_, path: string) => fileService.readFile(path));
  ipcMain.handle(IPC.WRITE_FILE,       (_, path: string, content: string) => fileService.writeFile(path, content));
  ipcMain.handle(IPC.DELETE_FILE,      (_, path: string) => fileService.deleteFile(path));
  ipcMain.handle(IPC.COPY_FILE,        (_, sourcePath: string, targetPath: string) => fileService.copyFile(sourcePath, targetPath));
  ipcMain.handle(IPC.READ_DIRECTORY,   (_, path: string) => fileService.readDirectory(path));
  ipcMain.handle(IPC.CREATE_DIRECTORY, (_, path: string) => fileService.createDirectory(path));
  ipcMain.handle(IPC.GET_FILE_STATS,   (_, path: string) => fileService.getFileStats(path));

  ipcMain.handle(IPC.GET_CONFIG,            () => configService.getConfig());
  ipcMain.handle(IPC.SET_CONFIG,            (_, config: AppConfig) => configService.setConfig(config));
  ipcMain.handle(IPC.VALIDATE_ARTICLES_DIR, (_, path: string) => configService.validateArticlesDir(path));
  ipcMain.handle(IPC.VALIDATE_ASTRO_BLOG,   (_, path: string) => configService.validateAstroBlog(path));

  // Publish Service
  ipcMain.handle(IPC.PUBLISH_ARTICLE, async (event, article: Article, config: PublishConfig) => {
    // 注意：IPC 無法傳遞函式；改用 event.sender.send 事件推播，Renderer 端監聽 EVENT_PUBLISH_PROGRESS
    return await publishService.publishArticle(article, config, (step, progress) => {
      event.sender.send(IPC.EVENT_PUBLISH_PROGRESS, { step, progress });
    });
  });

  ipcMain.handle(IPC.SYNC_ALL_PUBLISHED, async (event, config: PublishConfig) => {
    return await publishService.syncAllPublished(config, (current, total, title) => {
      event.sender.send(IPC.EVENT_SYNC_PROGRESS, { current, total, title });
    });
  });

  // Git Service
  ipcMain.handle(IPC.GIT_STATUS,          (_, repoPath: string) => gitService.getStatus(repoPath));
  ipcMain.handle(IPC.GIT_ADD,             (_, repoPath: string, paths?: string[]) => gitService.add(repoPath, paths));
  ipcMain.handle(IPC.GIT_COMMIT,          (_, repoPath: string, options: { message: string; addAll?: boolean }) => gitService.commit(repoPath, options));
  ipcMain.handle(IPC.GIT_PUSH,            (_, repoPath: string, options?: { remote?: string; branch?: string }) => gitService.push(repoPath, options));
  ipcMain.handle(IPC.GIT_ADD_COMMIT_PUSH, (_, repoPath: string, commitMessage: string) => gitService.addCommitPush(repoPath, commitMessage));
  ipcMain.handle(IPC.GIT_LOG,             (_, repoPath: string, count?: number) => gitService.getLog(repoPath, count));

  ipcMain.handle(IPC.START_DEV_SERVER, (_, projectPath: string) => processService.startDevServer(projectPath));
  ipcMain.handle(IPC.STOP_DEV_SERVER,  () => processService.stopDevServer());
  ipcMain.handle(IPC.GET_SERVER_STATUS, () => processService.getServerStatus());

  // 檔案監聽
  ipcMain.handle(IPC.START_FILE_WATCHING, (_, watchPath: string) => {
    fileService.startWatching(watchPath, (event, filePath) => {
      // 只監聽 .md 檔案
      if (filePath.endsWith(".md")) {
        mainWindow?.webContents.send(IPC.EVENT_FILE_CHANGE, { event, path: filePath });
      }
    });
    return true;
  });
  ipcMain.handle(IPC.STOP_FILE_WATCHING, () => {
    fileService.stopWatching();
    return true;
  });
  ipcMain.handle(IPC.IS_FILE_WATCHING, () => fileService.isWatching());

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
