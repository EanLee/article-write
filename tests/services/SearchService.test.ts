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

  describe('tags 篩選', () => {
    beforeEach(async () => {
      mockReaddir.mockResolvedValue(['a.md', 'b.md', 'c.md'])
      mockReadFile
        .mockResolvedValueOnce(
          '---\ntitle: A\ndate: 2026-01-01\ntags: [vue, typescript]\n---\nkeyword'
        )
        .mockResolvedValueOnce(
          '---\ntitle: B\ndate: 2026-01-02\ntags: [vue]\n---\nkeyword'
        )
        .mockResolvedValueOnce(
          '---\ntitle: C\ndate: 2026-01-03\n---\nkeyword'
        )
      await service.buildIndex(mockArticlesDir)
    })

    it('以單一 tag 篩選，只回傳含該 tag 的文章', () => {
      const results = service.search({ query: 'keyword', filters: { tags: ['typescript'] } })
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('A')
    })

    it('以多個 tags 篩選，文章須同時包含所有指定 tag', () => {
      const results = service.search({ query: 'keyword', filters: { tags: ['vue', 'typescript'] } })
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('A')
    })

    it('篩選條件不符時回傳空陣列', () => {
      const results = service.search({ query: 'keyword', filters: { tags: ['react'] } })
      expect(results).toHaveLength(0)
    })

    it('tags 篩選為空陣列時不過濾，回傳所有符合的文章', () => {
      const results = service.search({ query: 'keyword', filters: { tags: [] } })
      expect(results).toHaveLength(3)
    })

    it('無 tags 的文章在無 tags 篩選時也能被搜尋到', () => {
      const results = service.search({ query: 'keyword' })
      expect(results).toHaveLength(3)
    })

    it('解析多行 YAML 陣列格式的 tags', async () => {
      service = new SearchService(mockFs)
      mockReaddir.mockResolvedValue(['d.md'])
      mockReadFile.mockResolvedValueOnce(
        '---\ntitle: D\ndate: 2026-01-01\ntags:\n  - vue\n  - typescript\n---\nkeyword'
      )
      await service.buildIndex(mockArticlesDir)
      const results = service.search({ query: 'keyword', filters: { tags: ['typescript'] } })
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('D')
    })

    it('tags 篩選大小寫不敏感', () => {
      const results = service.search({ query: 'keyword', filters: { tags: ['Vue', 'TYPESCRIPT'] } })
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('A')
    })
  })
})
