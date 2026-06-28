import type { Article } from "@/types";
import type { IFileSystem } from "@/types/IFileSystem";
import { electronFileSystem } from "./ElectronFileSystem";
import { fnv1aHash } from "@/utils/hash";

/**
 * 備份服務
 * 負責檔案備份、衝突偵測和復原功能
 */
export class BackupService {
  private readonly backups: Map<string, ArticleBackup> = new Map();
  private static readonly MAX_BACKUPS_PER_FILE = 5;
  private static readonly BACKUP_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly fileSystem: IFileSystem;

  /**
   * 建構子 - 使用依賴注入
   * @param fileSystem - 檔案系統介面（可選，預設使用 ElectronFileSystem）
   */
  constructor(fileSystem?: IFileSystem) {
    this.fileSystem = fileSystem || electronFileSystem;
  }

  /**
   * 建立文章備份
   */
  createBackup(article: Article): void {
    const key = article.filePath;
    const existingBackups = this.backups.get(key) || {
      filePath: key,
      versions: [],
    };

    // 加入新版本
    existingBackups.versions.push({
      content: article.content,
      frontmatter: JSON.stringify(article.frontmatter),
      timestamp: new Date(),
      id: this.generateBackupId(),
    });

    // 限制備份數量
    if (existingBackups.versions.length > BackupService.MAX_BACKUPS_PER_FILE) {
      existingBackups.versions = existingBackups.versions.slice(-BackupService.MAX_BACKUPS_PER_FILE);
    }

    this.backups.set(key, existingBackups);
    this.cleanupExpiredBackups();
  }

  /**
   * 取得文章的備份列表
   */
  getBackups(filePath: string): BackupVersion[] {
    const backup = this.backups.get(filePath);
    return backup?.versions || [];
  }

  /**
   * 從備份還原文章
   */
  restoreFromBackup(filePath: string, backupId: string): { content: string; frontmatter: Record<string, unknown> } | null {
    const backup = this.backups.get(filePath);
    if (!backup) {
      return null;
    }

    const version = backup.versions.find((v) => v.id === backupId);
    if (!version) {
      return null;
    }

    return {
      content: version.content,
      frontmatter: JSON.parse(version.frontmatter),
    };
  }

  /**
   * 檢測衝突（檔案是否在外部被修改）
   */
  async detectConflict(filePath: string, baselineContent: string | undefined): Promise<ConflictResult> {
    try {
      const stats = await this.fileSystem.getFileStats(filePath);
      if (!stats) {
        return { hasConflict: false };
      }

      const currentContent = await this.fileSystem.readFile(filePath);

      // 基準內容未知時無法比對，視為無衝突（例如尚未載入過的新檔案）
      if (baselineContent === undefined) {
        return { hasConflict: false };
      }

      // 以內容 hash 比對，取代 mtime 比對：磁碟內容與基準內容不同即為外部修改
      if (fnv1aHash(currentContent) !== fnv1aHash(baselineContent)) {
        return {
          hasConflict: true,
          fileModifiedTime: new Date(stats.mtime),
          currentFileContent: currentContent,
        };
      }

      return { hasConflict: false };
    } catch {
      return { hasConflict: false };
    }
  }

  /**
   * 清理過期的備份
   */
  private cleanupExpiredBackups(): void {
    const now = Date.now();

    this.backups.forEach((backup, key) => {
      backup.versions = backup.versions.filter((v) => {
        const age = now - v.timestamp.getTime();
        return age < BackupService.BACKUP_EXPIRY_MS;
      });

      if (backup.versions.length === 0) {
        this.backups.delete(key);
      }
    });
  }

  /**
   * 生成備份 ID
   */
  private generateBackupId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  /**
   * 取得備份統計資訊
   */
  getStats(): BackupStats {
    let totalBackups = 0;
    let oldestBackup: Date | null = null;
    let newestBackup: Date | null = null;

    this.backups.forEach((backup) => {
      totalBackups += backup.versions.length;
      backup.versions.forEach((v) => {
        if (!oldestBackup || v.timestamp < oldestBackup) {
          oldestBackup = v.timestamp;
        }
        if (!newestBackup || v.timestamp > newestBackup) {
          newestBackup = v.timestamp;
        }
      });
    });

    return {
      totalFiles: this.backups.size,
      totalBackups,
      oldestBackup,
      newestBackup,
    };
  }

  /**
   * 清除所有備份
   */
  clearAll(): void {
    this.backups.clear();
  }

  /**
   * 清除特定檔案的備份
   */
  clearBackupsForFile(filePath: string): void {
    this.backups.delete(filePath);
  }
}

// 類型定義
interface ArticleBackup {
  filePath: string;
  versions: BackupVersion[];
}

export interface BackupVersion {
  id: string;
  content: string;
  frontmatter: string;
  timestamp: Date;
}

export interface ConflictResult {
  hasConflict: boolean;
  fileModifiedTime?: Date;
  currentFileContent?: string;
}

export interface BackupStats {
  totalFiles: number;
  totalBackups: number;
  oldestBackup: Date | null;
  newestBackup: Date | null;
}

// 建立單例實例
export const backupService = new BackupService();
