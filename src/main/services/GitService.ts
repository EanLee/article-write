import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface GitResult {
  success: boolean
  output: string
  error?: string
}

export interface GitCommitOptions {
  message: string
  addAll?: boolean
}

export interface GitPushOptions {
  remote?: string
  branch?: string
}

/**
 * Git 自動化服務
 * 在 Astro Blog 目錄執行 git 操作
 */
export class GitService {
  /**
   * 執行 git status，確認是否有變更
   */
  async getStatus(repoPath: string): Promise<GitResult> {
    try {
      const { stdout } = await execAsync('git status --short', { cwd: repoPath })
      return {
        success: true,
        output: stdout.trim()
      }
    } catch (err) {
      return {
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  /**
   * 執行 git add
   * @param repoPath - 儲存庫路徑
   * @param paths - 要 add 的路徑，預設為 '.'（全部）
   */
  async add(repoPath: string, paths: string[] = ['.']): Promise<GitResult> {
    const pathArgs = paths.map(p => `"${p}"`).join(' ')
    try {
      const { stdout, stderr } = await execAsync(`git add ${pathArgs}`, { cwd: repoPath })
      return {
        success: true,
        output: (stdout + stderr).trim()
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, output: '', error }
    }
  }

  /**
   * 執行 git commit
   * @param repoPath - 儲存庫路徑
   * @param options - commit 選項
   */
  async commit(repoPath: string, options: GitCommitOptions): Promise<GitResult> {
    const { message, addAll = false } = options
    const addFlag = addAll ? '-a ' : ''
    // 轉義 message 中的雙引號
    const escapedMessage = message.replace(/"/g, '\\"')

    try {
      const { stdout, stderr } = await execAsync(
        `git commit ${addFlag}-m "${escapedMessage}"`,
        { cwd: repoPath }
      )
      return {
        success: true,
        output: (stdout + stderr).trim()
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      // "nothing to commit" 不是真正的錯誤
      if (error.includes('nothing to commit')) {
        return { success: true, output: 'nothing to commit' }
      }
      return { success: false, output: '', error }
    }
  }

  /**
   * 執行 git push
   * @param repoPath - 儲存庫路徑
   * @param options - push 選項
   */
  async push(repoPath: string, options: GitPushOptions = {}): Promise<GitResult> {
    const { remote = 'origin', branch = '' } = options
    const branchArg = branch ? ` ${branch}` : ''

    try {
      const { stdout, stderr } = await execAsync(
        `git push ${remote}${branchArg}`,
        { cwd: repoPath }
      )
      return {
        success: true,
        output: (stdout + stderr).trim()
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, output: '', error }
    }
  }

  /**
   * 完整的 add + commit + push 流程
   * @param repoPath - 儲存庫路徑
   * @param commitMessage - commit 訊息
   */
  async addCommitPush(
    repoPath: string,
    commitMessage: string
  ): Promise<{
    success: boolean
    steps: { name: string; result: GitResult }[]
    error?: string
  }> {
    const steps: { name: string; result: GitResult }[] = []

    // Step 1: git add .
    const addResult = await this.add(repoPath)
    steps.push({ name: 'git add', result: addResult })
    if (!addResult.success) {
      return { success: false, steps, error: addResult.error }
    }

    // Step 2: git commit
    const commitResult = await this.commit(repoPath, { message: commitMessage })
    steps.push({ name: 'git commit', result: commitResult })
    if (!commitResult.success) {
      return { success: false, steps, error: commitResult.error }
    }

    // Step 3: git push (如果 nothing to commit 跳過)
    if (commitResult.output === 'nothing to commit') {
      return { success: true, steps }
    }

    const pushResult = await this.push(repoPath)
    steps.push({ name: 'git push', result: pushResult })
    if (!pushResult.success) {
      return { success: false, steps, error: pushResult.error }
    }

    return { success: true, steps }
  }

  /**
   * 取得最近的 commit 記錄
   * @param repoPath - 儲存庫路徑
   * @param count - 要取得的數量
   */
  async getLog(repoPath: string, count = 5): Promise<GitResult> {
    try {
      const { stdout } = await execAsync(
        `git log --oneline -${count}`,
        { cwd: repoPath }
      )
      return { success: true, output: stdout.trim() }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, output: '', error }
    }
  }
}
