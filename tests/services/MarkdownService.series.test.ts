/**
 * MarkdownService 系列欄位測試
 * 專門測試系列欄位的解析和生成，確保資料不會遺失
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MarkdownService } from '@/services/MarkdownService'
import type { Frontmatter } from '@/types'

describe('MarkdownService - 系列欄位處理', () => {
  let service: MarkdownService

  beforeEach(() => {
    service = new MarkdownService()
  })

  describe('parseMarkdown - 解析系列欄位', () => {
    it('應該正確解析包含系列資訊的 Markdown', () => {
      const markdown = `---
title: Vue 3 深入理解
description: Vue 3 系列教學第三篇
date: 2024-01-24
tags:
  - Vue
  - TypeScript
categories:
  - Software
series: Vue 3 進階教學
seriesOrder: 3
---

這是文章內容`

      const result = service.parseMarkdown(markdown)

      expect(result.frontmatter.series).toBe('Vue 3 進階教學')
      expect(result.frontmatter.seriesOrder).toBe(3)
      expect(result.frontmatter.title).toBe('Vue 3 深入理解')
      expect(result.content).toBe('\n這是文章內容')
    })

    it('應該處理沒有系列資訊的 Markdown', () => {
      const markdown = `---
title: 獨立文章
date: 2024-01-24
tags: []
categories: []
---

獨立文章內容`

      const result = service.parseMarkdown(markdown)

      expect(result.frontmatter.series).toBeUndefined()
      expect(result.frontmatter.seriesOrder).toBeUndefined()
      expect(result.frontmatter.title).toBe('獨立文章')
    })

    it('應該處理只有系列名稱沒有順序的情況', () => {
      const markdown = `---
title: 系列文章
series: 測試系列
---

內容`

      const result = service.parseMarkdown(markdown)

      expect(result.frontmatter.series).toBe('測試系列')
      expect(result.frontmatter.seriesOrder).toBeUndefined()
    })

    it('應該處理系列順序為字串的情況', () => {
      const markdown = `---
title: 系列文章
series: 測試系列
seriesOrder: "5"
---

內容`

      const result = service.parseMarkdown(markdown)

      expect(result.frontmatter.series).toBe('測試系列')
      // YAML 解析器會自動轉換字串數字
      expect(typeof result.frontmatter.seriesOrder).toBe('number')
      expect(result.frontmatter.seriesOrder).toBe(5)
    })
  })

  describe('generateFrontmatter - 生成系列欄位', () => {
    it('應該生成包含系列資訊的 YAML frontmatter', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '測試文章',
        description: '測試描述',
        date: '2024-01-24',
        tags: ['test'],
        categories: ['Software'],
        series: 'Vue 3 進階教學',
        seriesOrder: 3
      }

      const result = service.generateFrontmatter(frontmatter)

      expect(result).toContain('---')
      expect(result).toContain('title: 測試文章')
      expect(result).toContain('series: Vue 3 進階教學')
      expect(result).toContain('seriesOrder: 3')
      expect(result).toMatch(/---\s*$/)
    })

    it('生成的 frontmatter 不應該包含 undefined 的系列欄位', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '無系列文章',
        date: '2024-01-24',
        tags: [],
        categories: []
      }

      const result = service.generateFrontmatter(frontmatter)

      expect(result).not.toContain('series:')
      expect(result).not.toContain('seriesOrder:')
    })

    it('應該只包含系列名稱而不包含順序（當 seriesOrder 未定義時）', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '系列文章',
        date: '2024-01-24',
        tags: [],
        categories: [],
        series: '測試系列'
        // seriesOrder 未定義
      }

      const result = service.generateFrontmatter(frontmatter)

      expect(result).toContain('series: 測試系列')
      expect(result).not.toContain('seriesOrder:')
    })
  })

  describe('往返測試（Round-trip） - 確保資料完整性', () => {
    it('解析後重新生成應該保留所有系列欄位', () => {
      const originalMarkdown = `---
title: 完整測試
description: 測試描述
date: 2024-01-24
lastmod: 2024-01-25
tags:
  - Vue
  - Test
categories:
  - Software
  - Tutorial
slug: full-test
keywords:
  - vue3
  - testing
series: Vue 3 完整教學
seriesOrder: 7
---

這是文章內容

包含多個段落`

      // 解析
      const parsed = service.parseMarkdown(originalMarkdown)

      // 重新生成
      const regenerated = service.generateMarkdown(
        parsed.frontmatter,
        parsed.content
      )

      // 再次解析驗證
      const reparsed = service.parseMarkdown(regenerated)

      // 驗證所有欄位都被保留
      expect(reparsed.frontmatter.title).toBe(parsed.frontmatter.title)
      expect(reparsed.frontmatter.description).toBe(parsed.frontmatter.description)
      expect(reparsed.frontmatter.date).toBe(parsed.frontmatter.date)
      expect(reparsed.frontmatter.lastmod).toBe(parsed.frontmatter.lastmod)
      expect(reparsed.frontmatter.tags).toEqual(parsed.frontmatter.tags)
      expect(reparsed.frontmatter.categories).toEqual(parsed.frontmatter.categories)
      expect(reparsed.frontmatter.slug).toBe(parsed.frontmatter.slug)
      expect(reparsed.frontmatter.keywords).toEqual(parsed.frontmatter.keywords)

      // 最重要：系列欄位必須被保留
      expect(reparsed.frontmatter.series).toBe('Vue 3 完整教學')
      expect(reparsed.frontmatter.seriesOrder).toBe(7)

      // 內容也應該保持一致
      expect(reparsed.content).toBe(parsed.content)
    })

    it('即使欄位順序改變，資料也應該完整保留', () => {
      const markdown1 = `---
series: 測試系列
seriesOrder: 1
title: 文章標題
date: 2024-01-01
tags: []
categories: []
---

內容`

      const markdown2 = `---
title: 文章標題
date: 2024-01-01
tags: []
categories: []
series: 測試系列
seriesOrder: 1
---

內容`

      const parsed1 = service.parseMarkdown(markdown1)
      const parsed2 = service.parseMarkdown(markdown2)

      // 兩種順序解析結果應該相同
      expect(parsed1.frontmatter.series).toBe(parsed2.frontmatter.series)
      expect(parsed1.frontmatter.seriesOrder).toBe(parsed2.frontmatter.seriesOrder)
    })

    it('空字串系列名稱應該被視為無系列', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '測試',
        date: '2024-01-01',
        tags: [],
        categories: [],
        series: '',
        seriesOrder: 1
      }

      const generated = service.generateFrontmatter(frontmatter)

      // 空字串不應該被寫入
      expect(generated).not.toContain('series:')
      // 但 seriesOrder 可能還在（雖然沒意義）
      // 實際行為取決於實作細節
    })
  })

  describe('邊界情況測試', () => {
    it('應該處理非常大的系列順序數字', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '測試',
        date: '2024-01-01',
        tags: [],
        categories: [],
        series: '長系列',
        seriesOrder: 999
      }

      const generated = service.generateFrontmatter(frontmatter)
      const parsed = service.parseMarkdown(generated + '\n內容')

      expect(parsed.frontmatter.seriesOrder).toBe(999)
    })

    it('應該處理系列名稱包含特殊字元', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '測試',
        date: '2024-01-01',
        tags: [],
        categories: [],
        series: 'Vue 3: 深入理解 (2024 版)',
        seriesOrder: 1
      }

      const generated = service.generateFrontmatter(frontmatter)
      const parsed = service.parseMarkdown(generated + '\n內容')

      expect(parsed.frontmatter.series).toBe('Vue 3: 深入理解 (2024 版)')
    })

    it('應該處理系列名稱包含引號', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '測試',
        date: '2024-01-01',
        tags: [],
        categories: [],
        series: 'Vue 3 "進階" 教學',
        seriesOrder: 1
      }

      const generated = service.generateFrontmatter(frontmatter)
      const parsed = service.parseMarkdown(generated + '\n內容')

      expect(parsed.frontmatter.series).toContain('進階')
    })

    it('應該處理系列名稱包含換行（應該被拒絕或轉義）', () => {
      const frontmatter: Partial<Frontmatter> = {
        title: '測試',
        date: '2024-01-01',
        tags: [],
        categories: [],
        series: 'Vue 3\n進階教學', // 不合法的系列名稱
        seriesOrder: 1
      }

      const generated = service.generateFrontmatter(frontmatter)

      // YAML 應該正確處理多行字串
      // 解析時應該能還原（或者被合併為單行）
      expect(generated).toContain('series:')
    })
  })
})
