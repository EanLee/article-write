import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateGitCommands, copyToClipboard, formatGitCommandsForDisplay } from '@/utils/gitCommandGenerator'
import type { Article } from '@/types'
import { ArticleStatus, ArticleCategory } from '@/types'

describe('gitCommandGenerator', () => {
  describe('generateGitCommands', () => {
    const mockArticle: Article = {
      id: '1',
      title: '測試文章標題',
      slug: 'test-article',
      filePath: 'test.md',
      content: '# 測試內容',
      status: ArticleStatus.Published,
      category: ArticleCategory.Software,
      lastModified: new Date('2024-01-01'),
      frontmatter: {
        title: '測試文章標題',
        date: '2024-01-01',
        tags: ['Vue', 'TypeScript']
      }
    }

    it('應該生成正確的 Git 指令', () => {
      const targetPath = 'src/content/blog/test-article.md'
      const commands = generateGitCommands(mockArticle, targetPath)

      expect(commands.add).toBe('git add "src/content/blog/test-article.md"')
      expect(commands.commit).toContain('git commit -m')
      expect(commands.commit).toContain('docs(tech)')
      expect(commands.commit).toContain('測試文章標題')
      expect(commands.push).toBe('git push')
      expect(commands.full).toContain('&&')
    })

    it('應該為 Software 分類生成 tech scope', () => {
      const commands = generateGitCommands(mockArticle, 'test.md')

      expect(commands.commitMessage).toContain('docs(tech)')
    })

    it('應該為 Growth 分類生成 growth scope', () => {
      const growthArticle = {
        ...mockArticle,
        category: ArticleCategory.Growth
      }
      const commands = generateGitCommands(growthArticle, 'test.md')

      expect(commands.commitMessage).toContain('docs(growth)')
    })

    it('應該為 Management 分類生成 management scope', () => {
      const managementArticle = {
        ...mockArticle,
        category: ArticleCategory.Management
      }
      const commands = generateGitCommands(managementArticle, 'test.md')

      expect(commands.commitMessage).toContain('docs(management)')
    })

    it('應該在 commit message 中包含標籤', () => {
      const commands = generateGitCommands(mockArticle, 'test.md')

      expect(commands.commitMessage).toContain('標籤: Vue, TypeScript')
    })

    it('應該處理沒有標籤的文章', () => {
      const noTagsArticle = {
        ...mockArticle,
        tags: []
      }
      const commands = generateGitCommands(noTagsArticle, 'test.md')

      expect(commands.commitMessage).not.toContain('標籤:')
    })

    it('應該正確轉義特殊字元', () => {
      const specialCharsArticle = {
        ...mockArticle,
        title: '測試"引號"與\\反斜線'
      }
      const commands = generateGitCommands(specialCharsArticle, 'test.md')

      // commit 指令中的引號應該被轉義
      expect(commands.commit).toContain('\\"')
    })

    it('應該生成完整的指令序列', () => {
      const commands = generateGitCommands(mockArticle, 'test.md')

      expect(commands.full).toContain(commands.add)
      expect(commands.full).toContain('&&')
      expect(commands.full).toContain(commands.commit)
      expect(commands.full).toContain('&&')
      expect(commands.full).toContain(commands.push)
    })
  })

  describe('formatGitCommandsForDisplay', () => {
    const mockCommands = {
      add: 'git add "test.md"',
      commit: 'git commit -m "docs(tech): 測試"',
      push: 'git push',
      full: 'git add "test.md" && git commit -m "docs(tech): 測試" && git push',
      commitMessage: 'docs(tech): 測試'
    }

    it('應該返回三個步驟的指令', () => {
      const formatted = formatGitCommandsForDisplay(mockCommands)

      expect(formatted).toHaveLength(3)
    })

    it('應該包含正確的標題', () => {
      const formatted = formatGitCommandsForDisplay(mockCommands)

      expect(formatted[0].title).toBe('1. 新增檔案到 Git')
      expect(formatted[1].title).toBe('2. 提交變更')
      expect(formatted[2].title).toBe('3. 推送到遠端')
    })

    it('應該包含正確的指令', () => {
      const formatted = formatGitCommandsForDisplay(mockCommands)

      expect(formatted[0].command).toBe(mockCommands.add)
      expect(formatted[1].command).toBe(mockCommands.commit)
      expect(formatted[2].command).toBe(mockCommands.push)
    })

    it('應該包含描述', () => {
      const formatted = formatGitCommandsForDisplay(mockCommands)

      formatted.forEach(item => {
        expect(item.description).toBeTruthy()
        expect(typeof item.description).toBe('string')
      })
    })
  })

  describe('copyToClipboard', () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('應該成功複製文字到剪貼簿', async () => {
      const text = 'git add test.md'
      const result = await copyToClipboard(text)

      expect(result).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text)
    })

    it('應該處理複製失敗的情況', async () => {
      // Mock writeText to reject
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Failed'))

      const result = await copyToClipboard('test')

      expect(result).toBe(false)
    })

    it('應該在 clipboard API 不可用時使用 fallback', async () => {
      // Remove clipboard API
      const originalClipboard = navigator.clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true
      })

      // Mock execCommand
      document.execCommand = vi.fn().mockReturnValue(true)

      const result = await copyToClipboard('test')

      expect(result).toBe(true)

      // Restore
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true
      })
    })
  })
})
