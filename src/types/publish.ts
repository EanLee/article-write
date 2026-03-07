/**
 * 發布相關型別定義
 * 集中管理，避免型別散落於 main/services/PublishService.ts
 */

/** 發布配置 */
export interface PublishConfig {
  /** 文章來源目錄 */
  articlesDir: string;
  /** Astro 部落格目錄 */
  targetBlogDir: string;
  /** 圖片來源目錄 */
  imagesDir?: string;
}

/** 發布結果 */
export interface PublishResult {
  success: boolean;
  message: string;
  targetPath?: string;
  errors?: string[];
  warnings?: string[];
}

/** 發布進度回調 */
export type PublishProgressCallback = (step: string, progress: number) => void;

/** 全量同步結果 */
export interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
  warnings: string[];
}
