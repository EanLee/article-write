import { promises as fs, constants as fsConstants } from "fs";
import { dirname, normalize, resolve, sep } from "path";
import { watch, type FSWatcher } from "chokidar";

export class FileService {
  private watcher: FSWatcher | null = null;
  private watchCallback: ((event: string, path: string) => void) | null = null;
  private allowedBasePaths: string[] = [];

  /**
   * 設定允許存取的根目錄白名單（由 main.ts 在取得 config 後呼叫）
   * 之後所有檔案操作都必須在這些目錄之下
   */
  setAllowedPaths(paths: string[]): void {
    this.allowedBasePaths = paths.filter(Boolean).map((p) => normalize(resolve(p)));
  }

  /**
   * 驗證路徑是否在許可的白名單範圍內
   * 若尚未設定白名單（初始化前），不限制
   * @throws Error 若路徑在白名單外
   */
  private validatePath(filePath: string): void {
    if (this.allowedBasePaths.length === 0) {
      return;
    }
    const normalized = normalize(resolve(filePath));
    const allowed = this.allowedBasePaths.some((base) => normalized === base || normalized.startsWith(base + sep));
    if (!allowed) {
      throw new Error(`Access denied: path outside allowed directories: ${filePath}`);
    }
  }

  async readFile(filePath: string): Promise<string> {
    this.validatePath(filePath);
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (err) {
      throw new Error(`Failed to read file: ${filePath}`, { cause: err });
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.validatePath(filePath);
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
    } catch (err) {
      throw new Error(`Failed to write file: ${filePath}`, { cause: err });
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    this.validatePath(filePath);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      throw new Error(`Failed to delete file: ${filePath}`, { cause: err });
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    this.validatePath(dirPath);
    try {
      return await fs.readdir(dirPath);
    } catch (err) {
      throw new Error(`Failed to read directory: ${dirPath}`, { cause: err });
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    this.validatePath(dirPath);
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create directory: ${dirPath}`, { cause: err });
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
    this.validatePath(filePath);
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
    this.validatePath(sourcePath);
    this.validatePath(targetPath);
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
