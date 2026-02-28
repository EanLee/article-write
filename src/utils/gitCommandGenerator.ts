import type { Article } from '@/types'

/**
 * Git 操作指令
 */
export interface GitCommands {
  /** Git add 指令 */
  add: string
  /** Git commit 指令 */
  commit: string
  /** Git push 指令 */
  push: string
  /** 完整的指令序列（用 && 連接） */
  full: string
  /** Commit message */
  commitMessage: string
}

/**
 * 根據文章生成 Git 操作指令
 *
 * @param article 文章物件
 * @param targetPath 目標檔案路徑（相對於 Astro 專案根目錄）
 * @returns Git 指令物件
 */
export function generateGitCommands(article: Article, targetPath: string): GitCommands {
  // 生成 commit message
  const commitMessage = generateCommitMessage(article)

  // 生成各個指令
  const add = `git add "${targetPath}"`
  const commit = `git commit -m "${escapeShellArg(commitMessage)}"`
  const push = `git push`

  // 完整指令（使用 && 連接）
  const full = `${add} && ${commit} && ${push}`

  return {
    add,
    commit,
    push,
    full,
    commitMessage
  }
}

/**
 * 生成符合 Conventional Commits 規範的 commit message
 *
 * @param article 文章物件
 * @returns Commit message
 */
function generateCommitMessage(article: Article): string {
  const { title, category } = article
  const tags = article.frontmatter.tags

  // 判斷是新增還是更新
  const type = 'docs'
  const scope = getCategoryScope(category)

  // 生成簡短描述
  const subject = `新增文章 - ${title}`

  // 生成詳細描述（可選）
  let body = ''
  if (tags && tags.length > 0) {
    body = `\n\n標籤: ${tags.join(', ')}`
  }

  return `${type}(${scope}): ${subject}${body}`
}

/**
 * 根據分類決定 commit scope
 */
function getCategoryScope(category: string): string {
  const scopeMap: Record<string, string> = {
    Software: 'tech',
    growth: 'growth',
    management: 'management'
  }

  return scopeMap[category] || 'blog'
}

/**
 * 轉義 shell 參數中的特殊字元
 */
function escapeShellArg(arg: string): string {
  // 轉義雙引號和反斜線
  return arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * 複製文字到剪貼簿
 *
 * @param text 要複製的文字
 * @returns 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback: 使用舊的 execCommand 方法
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * 格式化 Git 指令為顯示用的 HTML（支援語法高亮）
 *
 * @param commands Git 指令物件
 * @returns 格式化的指令列表
 */
export function formatGitCommandsForDisplay(commands: GitCommands): {
  title: string
  command: string
  description: string
}[] {
  return [
    {
      title: '1. 新增檔案到 Git',
      command: commands.add,
      description: '將發布的文章檔案加入 Git 追蹤'
    },
    {
      title: '2. 提交變更',
      command: commands.commit,
      description: '提交變更並使用標準化的 commit message'
    },
    {
      title: '3. 推送到遠端',
      command: commands.push,
      description: '將 commit 推送到遠端儲存庫'
    }
  ]
}
