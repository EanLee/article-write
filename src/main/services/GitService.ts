import { execFile } from "child_process";
import { promisify } from "util";
import { normalize, resolve, sep } from "path";
import type { ConfigService } from "./ConfigService.js";
import type { GitResult, GitCommitOptions, GitPushOptions } from "../../types/git.js";
export type { GitResult, GitCommitOptions, GitPushOptions };

const execFileAsync = promisify(execFile);

/**
 * Git 自動化服務
 * 在 Astro Blog 目錄執行 git 操作
 *
 * 安全設計 (S7-01 / A7-01):
 * - ConfigService 透過建構子注入，確保架構邊界清晰
 * - 所有接收 repoPath 的公開方法必須先呼叫 validateRepoPath()
 *   驗證路徑只能為 config.paths.targetDir，防止 Renderer 傳入任意 cwd（CVSS 6.3）
 */
export class GitService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * S7-01 路徑白名單驗證
   * 確保 git cwd 只能落於 config.paths.targetDir（或其子目錄）
   * 若路徑不合法則拋出 Error，上層 IPC handler 會回傳 failure 給 Renderer
   */
  private async validateRepoPath(repoPath: string): Promise<void> {
    const config = await this.configService.getConfig();
    const allowed = config.paths?.targetDir;
    if (!allowed) {
      throw new Error("拒絕存取：targetDir 路徑尚未設定，請先完成應用程式設定");
    }
    const normalizedRepo = normalize(resolve(repoPath));
    const normalizedAllowed = normalize(resolve(allowed));
    if (normalizedRepo !== normalizedAllowed && !normalizedRepo.startsWith(normalizedAllowed + sep)) {
      throw new Error(`拒絕存取：Git 操作路徑超出允許範圍。要求路徑：${repoPath}`);
    }
  }

  /**
   * 執行 git status，確認是否有變更
   */
  async getStatus(repoPath: string): Promise<GitResult> {
    try {
      await this.validateRepoPath(repoPath);
      const { stdout } = await execFileAsync("git", ["status", "--short"], { cwd: repoPath });
      return {
        success: true,
        output: stdout.trim(),
      };
    } catch (err) {
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 執行 git add
   * @param repoPath - 儲存庫路徑
   * @param paths - 要 add 的路徑，預設為 '.'（全部）
   */
  async add(repoPath: string, paths: string[] = ["."]): Promise<GitResult> {
    try {
      await this.validateRepoPath(repoPath);
      const { stdout, stderr } = await execFileAsync("git", ["add", ...paths], { cwd: repoPath });
      return {
        success: true,
        output: (stdout + stderr).trim(),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error };
    }
  }

  /**
   * 執行 git commit
   * @param repoPath - 儲存庫路徑
   * @param options - commit 選項
   */
  async commit(repoPath: string, options: GitCommitOptions): Promise<GitResult> {
    const { message, addAll = false } = options;
    // 使用 execFile 參數陣列，徹底避免 shell 注入
    const args = addAll ? ["commit", "-am", message] : ["commit", "-m", message];

    try {
      await this.validateRepoPath(repoPath);
      const { stdout, stderr } = await execFileAsync("git", args, { cwd: repoPath });
      return {
        success: true,
        output: (stdout + stderr).trim(),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      // "nothing to commit" 不是真正的錯誤
      if (error.includes("nothing to commit")) {
        return { success: true, output: "nothing to commit" };
      }
      return { success: false, output: "", error };
    }
  }

  /**
   * 執行 git push
   * @param repoPath - 儲存庫路徑
   * @param options - push 選項
   */
  async push(repoPath: string, options: GitPushOptions = {}): Promise<GitResult> {
    const { remote = "origin", branch = "" } = options;
    const args = branch ? ["push", remote, branch] : ["push", remote];

    try {
      await this.validateRepoPath(repoPath);
      const { stdout, stderr } = await execFileAsync("git", args, { cwd: repoPath });
      return {
        success: true,
        output: (stdout + stderr).trim(),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error };
    }
  }

  /**
   * 完整的 add + commit + push 流程
   * @param repoPath - 儲存庫路徑
   * @param commitMessage - commit 訊息
   */
  async addCommitPush(
    repoPath: string,
    commitMessage: string,
  ): Promise<{
    success: boolean;
    steps: { name: string; result: GitResult }[];
    error?: string;
  }> {
    const steps: { name: string; result: GitResult }[] = [];

    // S7-01: validateRepoPath 已在 add/commit/push 各方法內部呼叫，此處無需重複
    // Step 1: git add .
    const addResult = await this.add(repoPath);
    steps.push({ name: "git add", result: addResult });
    if (!addResult.success) {
      return { success: false, steps, error: addResult.error };
    }

    // Step 2: git commit
    const commitResult = await this.commit(repoPath, { message: commitMessage });
    steps.push({ name: "git commit", result: commitResult });
    if (!commitResult.success) {
      return { success: false, steps, error: commitResult.error };
    }

    // Step 3: git push (如果 nothing to commit 跳過)
    if (commitResult.output === "nothing to commit") {
      return { success: true, steps };
    }

    const pushResult = await this.push(repoPath);
    steps.push({ name: "git push", result: pushResult });
    if (!pushResult.success) {
      return { success: false, steps, error: pushResult.error };
    }

    return { success: true, steps };
  }

  /**
   * 取得最近的 commit 記錄
   * @param repoPath - 儲存庫路徑
   * @param count - 要取得的數量
   */
  async getLog(repoPath: string, count = 5): Promise<GitResult> {
    try {
      await this.validateRepoPath(repoPath);
      const safeCount = Math.max(1, Math.min(100, Math.floor(count))); // 防止參數注入
      const { stdout } = await execFileAsync("git", ["log", "--oneline", `-${safeCount}`], { cwd: repoPath });
      return { success: true, output: stdout.trim() };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error };
    }
  }
}
