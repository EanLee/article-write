import { promises as fs, constants as fsConstants } from "fs";
import { dirname } from "path";
import { watch, type FSWatcher } from "chokidar";

export class FileService {
  private watcher: FSWatcher | null = null;
  private watchCallback: ((event: string, path: string) => void) | null = null;

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
    } catch (err) {
      throw new Error(`Failed to write file: ${filePath}`, { cause: err });
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      throw new Error(`Failed to delete file: ${filePath}`);
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch {
      throw new Error(`Failed to read directory: ${dirPath}`);
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 檢查路徑是否存在且可寫入
   * 用於發布前置驗證，回傳結構化結果而非拋出例外
   */
  async checkWritable(dirPath: string): Promise<{ exists: boolean; writable: boolean }> {
    try {
      await fs.access(dirPath, fsConstants.F_OK);
    } catch {
      return { exists: false, writable: false };
    }
    try {
      await fs.access(dirPath, fsConstants.W_OK);
      return { exists: true, writable: true };
    } catch {
      return { exists: true, writable: false };
    }
  }

  async getFileStats(filePath: string): Promise<{ isDirectory: boolean; mtime: number } | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        isDirectory: stats.isDirectory(),
        mtime: stats.mtime.getTime(), // 回傳毫秒時間戳，與 IFileSystem.FileStats.mtime: number 一致
      };
    } catch {
      return null;
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      // Ensure target directory exists
      await fs.mkdir(dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    } catch (err) {
      throw new Error(`Failed to copy file from ${sourcePath} to ${targetPath}`, { cause: err });
    }
  }

  /**
   * 開始監聽指定目錄的檔案變更
   */
  startWatching(watchPath: string, callback: (event: string, path: string) => void): void {
    // 如果已有監聽器，先停止
    this.stopWatching();

    this.watchCallback = callback;
    this.watcher = watch(watchPath, {
      ignored: /(^|[/\\])\../, // 忽略隱藏檔案
      persistent: true,
      ignoreInitial: true,
      depth: 3, // 監聽深度：vault/status/category/file.md
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.watcher
      .on("add", (path) => this.watchCallback?.("add", path))
      .on("change", (path) => this.watchCallback?.("change", path))
      .on("unlink", (path) => this.watchCallback?.("unlink", path));
  }

  /**
   * 停止檔案監聽
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.watchCallback = null;
    }
  }

  /**
   * 檢查是否正在監聽
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }
}
