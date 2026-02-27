import { promises as defaultFs } from 'fs'
import { join } from 'path'
import type { SearchQuery, SearchResult } from '../../types/index.js'
import { ArticleStatus } from '../../types/index.js'

type FsLike = Pick<typeof defaultFs, 'readdir' | 'readFile'>

interface IndexEntry {
  id: string
  filePath: string
  title: string
  content: string       // 純文字，用於搜尋
  updatedAt: string
  category: string
  status: ArticleStatus
  wikilinks: string[]   // [[...]] 解析結果，預留給 topic-014
}

export class SearchService {
  private index: Map<string, IndexEntry> = new Map()
  private wikilinkMap: Map<string, string[]> = new Map()
  private fs: FsLike

  constructor(fsImpl: FsLike = defaultFs) {
    this.fs = fsImpl
  }

  /**
   * 全量建立索引
   * 啟動時呼叫，遞迴掃描 articlesDir 下所有 .md 檔案
   */
  async buildIndex(articlesDir: string): Promise<void> {
    this.index.clear()
    this.wikilinkMap.clear()
    await this.scanDirectory(articlesDir)
  }

  private async scanDirectory(dir: string): Promise<void> {
    let entries: string[]
    try {
      entries = await this.fs.readdir(dir)
    } catch {
      return
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry)
        if (entry.endsWith('.md')) {
          await this.indexFile(fullPath)
        } else if (!entry.startsWith('.')) {
          await this.scanDirectory(fullPath)
        }
      })
    )
  }

  private async indexFile(filePath: string): Promise<void> {
    try {
      const raw = await this.fs.readFile(filePath, 'utf-8')
      const { title, updatedAt, category, status, content } = this.parseMarkdown(raw)
      const wikilinks = this.extractWikilinks(raw)
      const id = filePath

      this.index.set(filePath, {
        id,
        filePath,
        title,
        content,
        updatedAt,
        category,
        status,
        wikilinks
      })
      this.wikilinkMap.set(filePath, wikilinks)
    } catch {
      // 跳過無法讀取的檔案
    }
  }

  private parseMarkdown(raw: string): {
    title: string
    updatedAt: string
    category: string
    status: ArticleStatus
    content: string
  } {
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
    let title = ''
    let updatedAt = new Date().toISOString()
    let category = ''
    let status = ArticleStatus.Draft
    let body = raw

    if (fmMatch) {
      const fm = fmMatch[1]
      body = fmMatch[2] ?? ''

      const titleMatch = fm.match(/^title:\s*(.+)$/m)
      if (titleMatch) {title = titleMatch[1].trim().replace(/^["']|["']$/g, '')}

      const dateMatch = fm.match(/^date:\s*(.+)$/m)
      if (dateMatch) {updatedAt = new Date(dateMatch[1].trim()).toISOString()}

      const catMatch = fm.match(/^categories?:\s*(.+)$/m)
      if (catMatch) {category = catMatch[1].trim()}

      const pubMatch = fm.match(/^published:\s*true/m)
      if (pubMatch) {status = ArticleStatus.Published}
    }

    // 去掉 markdown 語法，只留純文字
    const content = body
      .replace(/```[\s\S]*?```/g, '')        // code block
      .replace(/`[^`]+`/g, '')               // inline code
      .replace(/!\[.*?\]\(.*?\)/g, '')        // images
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links
      .replace(/#{1,6}\s/g, '')              // headings
      .replace(/[*_~]+/g, '')                // bold/italic
      .replace(/\[\[([^\]]+)\]\]/g, '$1')    // wikilinks
      .trim()

    return { title, updatedAt, category, status, content }
  }

  private extractWikilinks(raw: string): string[] {
    const matches = raw.matchAll(/\[\[([^\]|#]+?)(?:[|#][^\]]*?)?\]\]/g)
    return [...matches].map((m) => m[1].trim())
  }

  /**
   * 搜尋索引
   */
  search(query: SearchQuery): SearchResult[] {
    if (!query.query.trim()) {return []}

    const keyword = query.query.toLowerCase()
    const results: SearchResult[] = []

    for (const entry of this.index.values()) {
      if (query.filters?.status && entry.status !== query.filters.status) {continue}
      if (query.filters?.category && entry.category !== query.filters.category) {continue}

      const titleMatch = entry.title.toLowerCase().includes(keyword)
      const contentIdx = entry.content.toLowerCase().indexOf(keyword)

      if (!titleMatch && contentIdx === -1) {continue}

      let matchSnippet = ''
      if (contentIdx !== -1) {
        const start = Math.max(0, contentIdx - 50)
        const end = Math.min(entry.content.length, contentIdx + keyword.length + 50)
        matchSnippet =
          (start > 0 ? '...' : '') +
          entry.content.slice(start, end) +
          (end < entry.content.length ? '...' : '')
      } else {
        matchSnippet = entry.content.slice(0, 100) + (entry.content.length > 100 ? '...' : '')
      }

      results.push({
        id: entry.id,
        filePath: entry.filePath,
        title: entry.title,
        matchSnippet,
        updatedAt: entry.updatedAt,
        category: entry.category,
        status: entry.status
      })
    }

    return results.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  /**
   * 增量更新（chokidar 呼叫）
   */
  async updateFile(filePath: string): Promise<void> {
    await this.indexFile(filePath)
  }

  removeFile(filePath: string): void {
    this.index.delete(filePath)
    this.wikilinkMap.delete(filePath)
  }

  /**
   * 取得某篇文章的 wikilink（預留給 topic-014）
   */
  getWikilinks(filePath: string): string[] {
    return this.wikilinkMap.get(filePath) ?? []
  }

  getIndexSize(): number {
    return this.index.size
  }
}
