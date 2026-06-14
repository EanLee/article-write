/**
 * FileWatchService - 檔案監聽服務
 *
 * 職責：
 * - 監聽指定目錄的檔案變化
 * - 提供檔案變化事件的訂閱機制
 * - 防止重複觸發（去抖機制）
 *
 * 單一職責：只負責檔案監聽，不包含任何商業邏輯
 */

import { normalizePath } from "@/utils/path";
import { logger } from "@/utils/logger";

export type FileChangeEvent = {
  event: "add" | "change" | "unlink";
  path: string;
};

export type FileChangeCallback = (event: FileChangeEvent) => void;

export class FileWatchService {
  private isWatching = false;
  private watchedPath: string | null = null;
  private callbacks: Set<FileChangeCallback> = new Set();
  private unsubscribeElectron: (() => void) | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // own-write 忽略清單：路徑 -> 忽略到期時間（任何事件類型皆忽略，避免自己寫入觸發重新載入）
  private ignoredPaths = new Map<string, number>();

  // 去抖機制：依「路徑+事件類型」分別記錄最近處理時間，避免不同事件類型互相覆蓋去抖判斷
  private recentEvents = new Map<string, number>();
  private readonly DEBOUNCE_MS = 1000; // 1 秒內相同類型的重複事件會被忽略

  constructor() {
    // 每 10 秒清理一次過期事件（定期清理而非每次清理）
    this.cleanupInterval = setInterval(() => {
      this.cleanupRecentEvents();
    }, 10000);
  }

  /**
   * 開始監聽目錄
   */
  async startWatching(path: string): Promise<void> {
    if (this.isWatching && this.watchedPath === path) {
      logger.debug("Already watching this path:", path);
      return;
    }

    if (this.isWatching) {
      await this.stopWatching();
    }

    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    try {
      await window.electronAPI.startFileWatching(path);

      this.unsubscribeElectron = window.electronAPI.onFileChange((data) => {
        this.handleFileChange(data.event, data.path);
      });

      this.isWatching = true;
      this.watchedPath = path;

      logger.debug("FileWatchService: Started watching", path);
    } catch (error) {
      logger.error("Failed to start file watching:", error);
      throw error;
    }
  }

  /**
   * 停止監聽
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    if (this.unsubscribeElectron) {
      this.unsubscribeElectron();
      this.unsubscribeElectron = null;
    }

    if (window.electronAPI) {
      try {
        await window.electronAPI.stopFileWatching();
      } catch (error) {
        logger.error("Failed to stop file watching:", error);
      }
    }

    // 清理定期清理的 interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isWatching = false;
    this.watchedPath = null;
    this.recentEvents.clear();
    this.ignoredPaths.clear();

    logger.debug("FileWatchService: Stopped watching");
  }

  /**
   * 訂閱檔案變化事件
   */
  subscribe(callback: FileChangeCallback): () => void {
    this.callbacks.add(callback);

    // 返回取消訂閱函數
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 忽略特定檔案的變化（用於避免自己儲存觸發的事件）
   * 忽略期間內，無論事件類型（add/change/unlink）皆視為 own-write，一律忽略。
   */
  ignoreNextChange(filePath: string, durationMs: number = 3000): void {
    const normalized = normalizePath(filePath);

    this.ignoredPaths.set(normalized, Date.now() + durationMs);

    setTimeout(() => {
      this.ignoredPaths.delete(normalized);
    }, durationMs);

    logger.debug(`FileWatchService: Will ignore changes to ${filePath} for ${durationMs}ms`);
  }

  /**
   * 處理檔案變化事件
   */
  private handleFileChange(event: string, path: string): void {
    const normalized = normalizePath(path);

    // own-write 忽略檢查（任何事件類型）
    const ignoredUntil = this.ignoredPaths.get(normalized);
    if (ignoredUntil && Date.now() < ignoredUntil) {
      logger.debug(`FileWatchService: Ignored own-write ${event} for ${normalized}`);
      return;
    }

    // 去抖檢查：僅對相同路徑＋相同事件類型的重複觸發去抖
    const debounceKey = `${normalized}::${event}`;
    const lastTimestamp = this.recentEvents.get(debounceKey);
    if (lastTimestamp !== undefined) {
      const timeSinceLastEvent = Date.now() - lastTimestamp;

      if (timeSinceLastEvent < this.DEBOUNCE_MS) {
        logger.debug(`FileWatchService: Debounced ${event} for ${normalized} (${timeSinceLastEvent}ms ago)`);
        return;
      }
    }

    // 記錄此事件
    this.recentEvents.set(debounceKey, Date.now());

    // 通知所有訂閱者
    const fileEvent: FileChangeEvent = {
      event: event as "add" | "change" | "unlink",
      path: normalized,
    };

    logger.debug("FileWatchService: File changed", fileEvent);

    this.callbacks.forEach((callback) => {
      try {
        callback(fileEvent);
      } catch (error) {
        logger.error("Error in file change callback:", error);
      }
    });
  }

  /**
   * 清理過期的事件記錄
   */
  private cleanupRecentEvents(): void {
    const now = Date.now();

    const expiredEventKeys: string[] = [];
    this.recentEvents.forEach((timestamp, key) => {
      if (now - timestamp > 5000) {
        expiredEventKeys.push(key);
      }
    });
    expiredEventKeys.forEach((key) => this.recentEvents.delete(key));

    const expiredIgnoredPaths: string[] = [];
    this.ignoredPaths.forEach((expiry, key) => {
      if (now > expiry) {
        expiredIgnoredPaths.push(key);
      }
    });
    expiredIgnoredPaths.forEach((key) => this.ignoredPaths.delete(key));
  }

  /**
   * 取得當前監聽狀態
   */
  getStatus(): { isWatching: boolean; watchedPath: string | null } {
    return {
      isWatching: this.isWatching,
      watchedPath: this.watchedPath,
    };
  }
}

// 單例實例
export const fileWatchService = new FileWatchService();
