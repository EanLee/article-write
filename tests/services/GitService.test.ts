// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExecFile = vi.hoisted(() => vi.fn())

vi.mock('child_process', () => ({
  execFile: mockExecFile
}))

vi.mock('util', () => ({
  promisify: (_fn: Function) => (...args: any[]) =>
    new Promise((resolve, reject) => {
      _fn(...args, (err: any, stdout: string, stderr: string) => {
        if (err) {reject(err)}
        else {resolve({ stdout, stderr })}
      })
    })
}))

import { GitService } from '../../src/main/services/GitService'

const repoPath = '/test/astro-blog'

function mockExecSuccess(stdout: string, stderr = '') {
  mockExecFile.mockImplementation((_file: string, _args: string[], _opts: object, callback: Function) => {
    callback(null, stdout, stderr)
    return {} as any
  })
}

function mockExecFailure(message: string) {
  mockExecFile.mockImplementation((_file: string, _args: string[], _opts: object, callback: Function) => {
    callback(new Error(message), '', message)
    return {} as any
  })
}

describe('GitService', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.clearAllMocks()
  })

  describe('getStatus', () => {
    it('應該回傳 git status 輸出', async () => {
      mockExecSuccess('M src/content/blog/test.md')

      const result = await service.getStatus(repoPath)

      expect(result.success).toBe(true)
      expect(result.output).toContain('test.md')
    })

    it('git 不可用時應該回傳失敗', async () => {
      mockExecFailure('git: command not found')

      const result = await service.getStatus(repoPath)

      expect(result.success).toBe(false)
      expect(result.error).toContain('git: command not found')
    })
  })

  describe('add', () => {
    it('應該執行 git add .', async () => {
      mockExecSuccess('')

      const result = await service.add(repoPath)

      expect(result.success).toBe(true)
    })

    it('應該支援指定路徑', async () => {
      mockExecSuccess('')

      const result = await service.add(repoPath, ['src/content/blog/test.md'])

      expect(result.success).toBe(true)
    })

    it('執行失敗時應該回傳錯誤', async () => {
      mockExecFailure('not a git repository')

      const result = await service.add(repoPath)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not a git repository')
    })
  })

  describe('commit', () => {
    it('應該執行 git commit', async () => {
      mockExecSuccess('[main abc1234] docs(tech): 新增文章 - 測試')

      const result = await service.commit(repoPath, { message: 'docs(tech): 新增文章 - 測試' })

      expect(result.success).toBe(true)
      expect(result.output).toContain('docs(tech)')
    })

    it('nothing to commit 時應該視為成功', async () => {
      mockExecFailure('nothing to commit, working tree clean')

      const result = await service.commit(repoPath, { message: 'test' })

      expect(result.success).toBe(true)
      expect(result.output).toBe('nothing to commit')
    })

    it('其他 commit 失敗時應該回傳錯誤', async () => {
      mockExecFailure('Author identity unknown')

      const result = await service.commit(repoPath, { message: 'test' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Author identity unknown')
    })
  })

  describe('push', () => {
    it('應該執行 git push origin', async () => {
      mockExecSuccess('Everything up-to-date')

      const result = await service.push(repoPath)

      expect(result.success).toBe(true)
    })

    it('支援指定 remote 和 branch', async () => {
      mockExecSuccess('To github.com:user/repo.git')

      const result = await service.push(repoPath, { remote: 'upstream', branch: 'main' })

      expect(result.success).toBe(true)
    })

    it('push 失敗時應該回傳錯誤', async () => {
      mockExecFailure('Permission denied (publickey)')

      const result = await service.push(repoPath)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Permission denied')
    })
  })

  describe('addCommitPush', () => {
    it('應該依序執行 add → commit → push', async () => {
      let callCount = 0
      mockExecFile.mockImplementation((_file: string, _args: string[], _opts: object, callback: Function) => {
        callCount++
        if (callCount === 1) {callback(null, '', '')} // git add
        else if (callCount === 2) {callback(null, '[main abc] test', '')} // git commit
        else if (callCount === 3) {callback(null, 'To github.com', '')} // git push
        return {} as any
      })

      const result = await service.addCommitPush(repoPath, 'docs(tech): 新增文章')

      expect(result.success).toBe(true)
      expect(result.steps).toHaveLength(3)
      expect(result.steps[0].name).toBe('git add')
      expect(result.steps[1].name).toBe('git commit')
      expect(result.steps[2].name).toBe('git push')
    })

    it('add 失敗時應該中止流程', async () => {
      mockExecFailure('not a git repository')

      const result = await service.addCommitPush(repoPath, 'test')

      expect(result.success).toBe(false)
      expect(result.steps).toHaveLength(1)
      expect(result.error).toBeDefined()
    })

    it('nothing to commit 時不執行 push', async () => {
      let callCount = 0
      mockExecFile.mockImplementation((_file: string, _args: string[], _opts: object, callback: Function) => {
        callCount++
        if (callCount === 1) {callback(null, '', '')} // git add
        else {callback(new Error('nothing to commit'), '', '')} // git commit
        return {} as any
      })

      const result = await service.addCommitPush(repoPath, 'test')

      expect(result.success).toBe(true)
      expect(result.steps).toHaveLength(2) // add + commit（no push）
    })
  })

  describe('getLog', () => {
    it('應該回傳 git log', async () => {
      mockExecSuccess('abc1234 docs(tech): 新增文章\ndef5678 fix: 修復問題')

      const result = await service.getLog(repoPath, 5)

      expect(result.success).toBe(true)
      expect(result.output).toContain('新增文章')
    })
  })
})
