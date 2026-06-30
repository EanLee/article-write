/**
 * 圖片相關型別定義
 *
 * QUAL6-06: 將圖片型別從 ImageService 實作檔案提取至此，
 * 避免消費端因引用型別而意外耦合 ImageService 實作細節。
 * 請從 @/types/image 匯入這些介面，而非從 @/services/ImageService。
 */

/**
 * 圖片資訊介面
 */
export interface ImageInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  isUsed: boolean;
  exists: boolean;
  preview?: string;
}

/**
 * 圖片引用資訊介面
 */
export interface ImageReference {
  imageName: string;
  articleId: string;
  articleTitle: string;
  line: number;
  exists: boolean;
}

/**
 * 圖片驗證結果介面
 */
export interface ImageValidationResult {
  validImages: string[];
  invalidImages: string[];
  unusedImages: string[];
  totalImages: number;
}

/**
 * 圖片驗證詳細結果介面
 */
export interface ImageValidationDetails {
  imageName: string;
  exists: boolean;
  isUsed: boolean;
  referencedIn: string[];
  filePath?: string;
  errorMessage?: string;
}

/**
 * 圖片驗證警告介面
 */
export interface ImageValidationWarning {
  imageName: string;
  line: number;
  column: number;
  type: "missing-file" | "invalid-format" | "broken-reference";
  message: string;
  suggestion: string;
  severity: "error" | "warning";
}
