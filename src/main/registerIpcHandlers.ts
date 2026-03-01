/**
 * A6-02: IPC Handler 集中登錄模組
 *
 * 將原本散佈於 main.ts app.whenReady() 中的 ~150 行 IPC handler 登錄邏輯
 * 提取至此獨立模組，以單一職責原則拆分 main.ts God Function。
 *
 * 每個領域的 handler 以區塊分組，方便日後進一步拆分為個別 domain 模組。
 */
import { ipcMain, dialog } from "electron";
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import { IPC } from "./ipc-channels.js";
import { AIError } from "./services/AIService.js";
import { logger } from "./mainLogger.js";
import { AppConfigSchema } from "./schemas/config.schema.js";
import type { FileService } from "./services/FileService.js";
import type { ConfigService } from "./services/ConfigService.js";
import type { ProcessService } from "./services/ProcessService.js";
import type { PublishService } from "./services/PublishService.js";
import type { GitService } from "./services/GitService.js";
import type { SearchService } from "./services/SearchService.js";
import type { AIService } from "./services/AIService.js";
import type { BrowserWindow as BrowserWindowType } from "electron";
import type { SearchQuery, Article } from "../types/index.js";
import type { PublishConfig, PublishProgressCallback } from "./services/PublishService.js";
import type { SEOGenerationInput } from "./services/AIProvider/types.js";

/** 傳入主進程所有服務實例的容器介面 */
export interface AppServices {
  fileService: FileService;
  configService: ConfigService;
  processService: ProcessService;
  publishService: PublishService;
  gitService: GitService;
  searchService: SearchService;
  aiService: AIService;
  getMainWindow: () => BrowserWindowType | null;
}

/**
 * 統一登錄所有 IPC handlers。
 * 應於 app.whenReady() 初始化完成後呼叫。
 */
export function registerIpcHandlers(services: AppServices): void {
  const { fileService, configService, processService, publishService, gitService, searchService, aiService, getMainWindow } = services;

  // ─── File ───────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.READ_FILE, (_, path: string) => fileService.readFile(path));
  ipcMain.handle(IPC.WRITE_FILE, (_, path: string, content: string) => fileService.writeFile(path, content));
  ipcMain.handle(IPC.DELETE_FILE, (_, path: string) => fileService.deleteFile(path));
  ipcMain.handle(IPC.COPY_FILE, (_, sourcePath: string, targetPath: string) => fileService.copyFile(sourcePath, targetPath));
  // S6-07: 從 vault 外部匯入圖片（拖放 / 系統暫存）——只驗證目標路徑
  ipcMain.handle(IPC.IMPORT_EXTERNAL_FILE, (_, sourcePath: string, targetPath: string) => fileService.importExternalFile(sourcePath, targetPath));
  ipcMain.handle(IPC.READ_DIRECTORY, (_, path: string) => fileService.readDirectory(path));
  ipcMain.handle(IPC.CREATE_DIRECTORY, (_, path: string) => fileService.createDirectory(path));
  ipcMain.handle(IPC.GET_FILE_STATS, (_, path: string) => fileService.getFileStats(path));

  // Directory selection
  ipcMain.handle(IPC.SELECT_DIRECTORY, async (_, options?: { title?: string; defaultPath?: string }) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {return null;}
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: options?.title || "選擇資料夾",
      defaultPath: options?.defaultPath,
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // ─── Config ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.GET_CONFIG, () => configService.getConfig());
  ipcMain.handle(IPC.SET_CONFIG, async (_, rawConfig: unknown) => {
    // S-04: Zod 驗證—防止惡意 renderer 傳入非法 config 繞過路徑白名單
    const result = AppConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join("; ");
      throw new Error(`config 驗證失敗: ${messages}`);
    }
    const config = result.data;
    await configService.setConfig(config);
    // 同步更新檔案存取白名單，防止路徑穿越攻擊
    fileService.setAllowedPaths([config.paths.articlesDir, config.paths.targetBlog, config.paths.imagesDir]);
  });
  ipcMain.handle(IPC.VALIDATE_ARTICLES_DIR, (_, path: string) => configService.validateArticlesDir(path));
  ipcMain.handle(IPC.VALIDATE_ASTRO_BLOG, (_, path: string) => configService.validateAstroBlog(path));

  // ─── Publish ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.PUBLISH_ARTICLE, async (_, article: Article, config: PublishConfig, onProgress?: PublishProgressCallback) => {
    return await publishService.publishArticle(article, config, onProgress);
  });
  ipcMain.handle(IPC.SYNC_ALL_PUBLISHED, async (event, config: PublishConfig) => {
    return await publishService.syncAllPublished(config, (current, total, title) => {
      event.sender.send(IPC.EVENT_SYNC_PROGRESS, { current, total, title });
    });
  });

  // ─── Git ─────────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.GIT_STATUS, (_, repoPath: string) => gitService.getStatus(repoPath));
  ipcMain.handle(IPC.GIT_ADD, (_, repoPath: string, paths?: string[]) => gitService.add(repoPath, paths));
  ipcMain.handle(IPC.GIT_COMMIT, (_, repoPath: string, options: { message: string; addAll?: boolean }) => gitService.commit(repoPath, options));
  ipcMain.handle(IPC.GIT_PUSH, (_, repoPath: string, options?: { remote?: string; branch?: string }) => gitService.push(repoPath, options));
  ipcMain.handle(IPC.GIT_ADD_COMMIT_PUSH, (_, repoPath: string, commitMessage: string) => gitService.addCommitPush(repoPath, commitMessage));
  ipcMain.handle(IPC.GIT_LOG, (_, repoPath: string, count?: number) => gitService.getLog(repoPath, count));

  // ─── Dev Server ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.START_DEV_SERVER, (_, projectPath: string) => processService.startDevServer(projectPath));
  ipcMain.handle(IPC.STOP_DEV_SERVER, () => processService.stopDevServer());
  ipcMain.handle(IPC.GET_SERVER_STATUS, () => processService.getServerStatus());

  // ─── Search ──────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SEARCH_QUERY, (_event, query: SearchQuery) => searchService.search(query));
  ipcMain.handle(IPC.SEARCH_BUILD_INDEX, async (_event, articlesDir: string) => {
    await searchService.buildIndex(articlesDir);
    return searchService.getIndexSize();
  });

  // ─── File Watching ───────────────────────────────────────────────────────────
  ipcMain.handle(IPC.START_FILE_WATCHING, (_, watchPath: string) => {
    fileService.startWatching(watchPath, (event, filePath) => {
      // 只監聽 .md 檔案
      if (filePath.endsWith(".md")) {
        getMainWindow()?.webContents.send(IPC.EVENT_FILE_CHANGE, { event, path: filePath });
        // 增量更新搜尋索引
        if (event === "unlink") {
          searchService.removeFile(filePath);
        } else {
          searchService.updateFile(filePath).catch((err) => {
            logger.error("[SearchService] 增量索引更新失敗:", err);
          });
        }
      }
    });
    return true;
  });
  ipcMain.handle(IPC.STOP_FILE_WATCHING, () => {
    fileService.stopWatching();
    return true;
  });
  ipcMain.handle(IPC.IS_FILE_WATCHING, () => fileService.isWatching());

  // ─── Auto-Update ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.DOWNLOAD_UPDATE, async () => {
    // QUAL6-03: autoDownload=false，使用者在通知中確認後才觸發下載
    await autoUpdater.downloadUpdate();
  });
  ipcMain.handle(IPC.INSTALL_UPDATE, () => {
    autoUpdater.quitAndInstall();
  });

  // ─── AI ──────────────────────────────────────────────────────────────────────
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

  const VALID_AI_PROVIDERS = ["claude", "gemini", "openai"] as const;
  type ValidProvider = (typeof VALID_AI_PROVIDERS)[number];

  ipcMain.handle(IPC.AI_SET_API_KEY, (_, provider: string, key: string) => {
    // S6-06: runtime 白名單驗證，防止惡意 Renderer 注入任意 provider 字串
    if (!VALID_AI_PROVIDERS.includes(provider as ValidProvider)) {
      return { success: false, error: `無效的 AI Provider: ${provider}` };
    }
    try {
      configService.setApiKey(provider as ValidProvider, key);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
  ipcMain.handle(IPC.AI_GET_HAS_API_KEY, (_, provider: string) => {
    if (!VALID_AI_PROVIDERS.includes(provider as ValidProvider)) {return false;}
    return configService.hasApiKey(provider as ValidProvider);
  });
  ipcMain.handle(IPC.AI_GET_ACTIVE_PROVIDER, () => aiService.getActiveProvider());
}
