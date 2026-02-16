import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchService } from '../../src/main/services/SearchService'

const mockReaddir = vi.fn()
const mockReadFile = vi.fn()
const mockFs = { readdir: mockReaddir, readFile: mockReadFile } as any

const mockArticlesDir = '/mock/vault'

describe('SearchService', () => {
  let service: SearchService

  beforeEach(() => {
    service = new SearchService(mockFs)
    mockReaddir.mockReset()
    mockReadFile.mockReset()
  })

  it('初始狀態索引為空', () => {
    const results = service.search({ query: 'test' })
    expect(results).toEqual([])
  })

  it('能以關鍵字搜尋文章內容', async () => {
    mockReaddir.mockResolvedValue(['article.md'])
    mockReadFile.mockResolvedValue(
      '---\ntitle: Hello World\ndate: 2026-01-01\n---\nThis is a test article about TypeScript.'
    )

    await service.buildIndex(mockArticlesDir)
    const results = service.search({ query: 'TypeScript' })

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Hello World')
    expect(results[0].matchSnippet).toContain('TypeScript')
  })

  it('結果依 updatedAt 時間倒序排列', async () => {
    mockReaddir.mockResolvedValue(['a.md', 'b.md'])
    mockReadFile
      .mockResolvedValueOnce('---\ntitle: Old\ndate: 2026-01-01\n---\nkeyword here')
      .mockResolvedValueOnce('---\ntitle: New\ndate: 2026-02-01\n---\nkeyword here')

    await service.buildIndex(mockArticlesDir)
    const results = service.search({ query: 'keyword' })

    expect(results[0].title).toBe('New')
    expect(results[1].title).toBe('Old')
  })

  it('解析 wikilink 並存入索引', async () => {
    mockReaddir.mockResolvedValue(['article.md'])
    mockReadFile.mockResolvedValue(
      '---\ntitle: Linked\ndate: 2026-01-01\n---\nSee [[Other Article]] for details.'
    )

    await service.buildIndex(mockArticlesDir)
    const wikilinks = service.getWikilinks('/mock/vault/article.md')

    expect(wikilinks).toContain('Other Article')
  })

  it('query 為空字串時回傳空陣列', () => {
    const results = service.search({ query: '' })
    expect(results).toEqual([])
  })
})
