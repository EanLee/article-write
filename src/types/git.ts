/**
 * Git 操作相關型別定義
 * 集中管理，避免型別散落於 main/services/GitService.ts
 */

export interface GitResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface GitCommitOptions {
  message: string;
  addAll?: boolean;
}

export interface GitPushOptions {
  remote?: string;
  branch?: string;
}
