# Full-Text Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓使用者能用 `Cmd/Ctrl+F` 開啟浮動搜尋面板，以關鍵字搜尋所有文章內容，並跳至對應文章。

**Architecture:**
- `SearchService`（Main process）：啟動時全量掃描 markdown 建立記憶體索引，chokidar 增量更新。
- IPC `search:query`：Renderer 送關鍵字，Main 搜尋後回傳 `SearchResult[]`，預設時間倒序排序。
- `SearchPanel.vue`：浮動 overlay，`Cmd/Ctrl+F` 觸發，鍵盤 ↑↓ + Enter 導航，wikilink 解析預留擴充。

**Tech Stack:** Electron IPC、Pinia、Vue 3 Composition API、DaisyUI、chokidar（已有）、Vitest

---

## Task 1：新增型別定義

**Files:**
- Modify: `src/types/index.ts`

**Step 1: 在 `src/types/index.ts` 末尾加入介面**

```typescript
// ===== Search =====

export interface SearchQuery {
  query: string
  filters?: {
    category?: string
    status?: ArticleStatus
    tags?: string[]
  }
}

export interface SearchResult {
  id: string
  filePath: string
  title: string
  matchSnippet: string  // 第一個命中片段，含前後文（約 100 字）
  updatedAt: string     // ISO 8601，排序依據
  category: string
  status: ArticleStatus
}
```

**Step 2: 確認型別可被 import**

```bash
pnpm run build 2>&1 | grep -i "SearchResult\|SearchQuery" | head -5
```
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): 新增 SearchQuery、SearchResult 型別定義"
```

---

## Task 2：實作 SearchService（Main Process）

**Files:**
- Create: `src/main/services/SearchService.ts`
- Test: `tests/services/SearchService.test.ts`

**Step 1: 撰寫失敗測試**

建立 `tests/services/SearchService.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchService } from '../../src/main/services/SearchService'

// Mock fs
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    readdir: vi.fn()
  }
}))

const mockArticlesDir = '/mock/vault'

describe('SearchService', () => {
  let service: SearchService

  beforeEach(() => {
    service = new SearchService()
    vi.clearAllMocks()
  })

  it('初始狀態索引為空', () => {
    const results = service.search({ query: 'test' })
    expect(results).toEqual([])
  })

  it('能以關鍵字搜尋文章內容', async () => {
    const { promises: fs } = await import('fs')
    vi.mocked(fs.readdir).mockResolvedValue(['article.md'] as any)
    vi.mocked(fs.readFile).mockResolvedValue(
      '---\ntitle: Hello World\ndate: 2026-01-01\n---\nThis is a test article about TypeScript.' as any
    )

    await service.buildIndex(mockArticlesDir)
    const results = service.search({ query: 'TypeScript' })

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Hello World')
    expect(results[0].matchSnippet).toContain('TypeScript')
  })

  it('結果依 updatedAt 時間倒序排列', async () => {
    const { promises: fs } = await import('fs')
    vi.mocked(fs.readdir).mockResolvedValue(['a.md', 'b.md'] as any)
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('---\ntitle: Old\ndate: 2026-01-01\n---\nkeyword here' as any)
      .mockResolvedValueOnce('---\ntitle: New\ndate: 2026-02-01\n---\nkeyword here' as any)

    await service.buildIndex(mockArticlesDir)
    const results = service.search({ query: 'keyword' })

    expect(results[0].title).toBe('New')
    expect(results[1].title).toBe('Old')
  })

  it('解析 wikilink 並存入索引', async () => {
    const { promises: fs } = await import('fs')
    vi.mocked(fs.readdir).mockResolvedValue(['article.md'] as any)
    vi.mocked(fs.readFile).mockResolvedValue(
      '---\ntitle: Linked\ndate: 2026-01-01\n---\nSee [[Other Article]] for details.' as any
    )

    await service.buildIndex(mockArticlesDir)
    const wikilinks = service.getWikilinks('/mock/vault/article.md')

    expect(wikilinks).toContain('Other Article')
  })

  it('query 為空字串時回傳空陣列', async () => {
    const results = service.search({ query: '' })
    expect(results).toEqual([])
  })
})
```

**Step 2: 執行測試確認失敗**

```bash
pnpm run test tests/services/SearchService.test.ts
```
Expected: FAIL — `SearchService` not found

**Step 3: 實作 `src/main/services/SearchService.ts`**

```typescript
import { promises as fs } from 'fs'
import { join, relative } from 'path'
import type { SearchQuery, SearchResult } from '../../types'
import { ArticleStatus } from '../../types'

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
  // wikilink 圖（filePath → 引用的文章名稱[]），預留給 topic-014
  private wikilinkMap: Map<string, string[]> = new Map()

  /**
   * 全量建立索引
   * 啟動時呼叫，遞迴掃描 articlesDir 下所有 .md 檔案
   */
  async buildIndex(articlesDir: string): Promise<void> {
    this.index.clear()
    this.wikilinkMap.clear()
    await this.scanDirectory(articlesDir, articlesDir)
  }

  private async scanDirectory(dir: string, articlesDir: string): Promise<void> {
    let entries: string[]
    try {
      entries = await fs.readdir(dir)
    } catch {
      return
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry)
        if (entry.endsWith('.md')) {
          await this.indexFile(fullPath)
        } else if (!entry.startsWith('.')) {
          await this.scanDirectory(fullPath, articlesDir)
        }
      })
    )
  }

  private async indexFile(filePath: string): Promise<void> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
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
    // 解析 frontmatter
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
      if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '')

      const dateMatch = fm.match(/^date:\s*(.+)$/m)
      if (dateMatch) updatedAt = new Date(dateMatch[1].trim()).toISOString()

      const catMatch = fm.match(/^categories?:\s*(.+)$/m)
      if (catMatch) category = catMatch[1].trim()

      const pubMatch = fm.match(/^published:\s*true/m)
      if (pubMatch) status = ArticleStatus.Published
    }

    // 去掉 markdown 語法，只留純文字
    const content = body
      .replace(/```[\s\S]*?```/g, '')   // code block
      .replace(/`[^`]+`/g, '')           // inline code
      .replace(/!\[.*?\]\(.*?\)/g, '')   // images
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links
      .replace(/#{1,6}\s/g, '')          // headings
      .replace(/[*_~]+/g, '')            // bold/italic
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // wikilinks
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
    if (!query.query.trim()) return []

    const keyword = query.query.toLowerCase()
    const results: SearchResult[] = []

    for (const entry of this.index.values()) {
      // 套用 filters
      if (query.filters?.status && entry.status !== query.filters.status) continue
      if (query.filters?.category && entry.category !== query.filters.category) continue

      // 搜尋標題或內容
      const titleMatch = entry.title.toLowerCase().includes(keyword)
      const contentIdx = entry.content.toLowerCase().indexOf(keyword)

      if (!titleMatch && contentIdx === -1) continue

      // 取第一個命中片段（前後各 50 字）
      let matchSnippet = ''
      if (contentIdx !== -1) {
        const start = Math.max(0, contentIdx - 50)
        const end = Math.min(entry.content.length, contentIdx + keyword.length + 50)
        matchSnippet = (start > 0 ? '...' : '') + entry.content.slice(start, end) + (end < entry.content.length ? '...' : '')
      } else {
        matchSnippet = entry.content.slice(0, 100) + '...'
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

    // 預設時間倒序
    return results.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
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
```

**Step 4: 執行測試確認通過**

```bash
pnpm run test tests/services/SearchService.test.ts
```
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/main/services/SearchService.ts tests/services/SearchService.test.ts
git commit -m "feat(service): 實作 SearchService — 全文搜尋核心邏輯

- 啟動全量掃描、chokidar 增量更新
- 時間倒序排序、取第一命中 snippet
- 預留 wikilink 解析供 topic-014 使用"
```

---

## Task 3：整合 IPC + Preload

**Files:**
- Modify: `src/main/main.ts`
- Modify: `src/main/preload.ts`

**Step 1: 在 `src/main/main.ts` 新增 SearchService**

在現有 service 宣告區域（module level）加入：

```typescript
import { SearchService } from './services/SearchService'
// ...（既有 import）

const searchService = new SearchService()
```

在 `app.whenReady()` 的 IPC handler 區塊加入：

```typescript
// Search
ipcMain.handle('search:query', async (_event, query: SearchQuery) => {
  return searchService.search(query)
})

ipcMain.handle('search:build-index', async (_event, articlesDir: string) => {
  await searchService.buildIndex(articlesDir)
  return searchService.getIndexSize()
})
```

在 `FileWatchService` 的 `file-change` 回呼中補充增量更新：

```typescript
fileService.startWatching(watchPath, (event, filePath) => {
  if (filePath.endsWith('.md')) {
    // 既有：
    mainWindow?.webContents.send('file-change', { event, path: filePath })
    // 新增：
    if (event === 'unlink') {
      searchService.removeFile(filePath)
    } else {
      searchService.updateFile(filePath).catch(() => {})
    }
  }
})
```

**Step 2: 在 `src/main/preload.ts` 新增橋接**

```typescript
// 在 contextBridge.exposeInMainWorld('electronAPI', { ... }) 內加入：
searchQuery: (query: SearchQuery) =>
  ipcRenderer.invoke('search:query', query),
searchBuildIndex: (articlesDir: string) =>
  ipcRenderer.invoke('search:build-index', articlesDir),
```

**Step 3: 確認 TypeScript 編譯通過**

```bash
pnpm run build 2>&1 | grep -i error | head -10
```
Expected: 無 error

**Step 4: Commit**

```bash
git add src/main/main.ts src/main/preload.ts
git commit -m "feat(ipc): 新增 search:query 與 search:build-index IPC handler"
```

---

## Task 4：建立 Pinia Search Store

**Files:**
- Create: `src/stores/search.ts`

**Step 1: 建立 `src/stores/search.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchQuery, SearchResult } from '@/types'

export const useSearchStore = defineStore('search', () => {
  const isOpen = ref(false)
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const selectedIndex = ref(0)
  const isLoading = ref(false)

  async function search(q: string) {
    if (!q.trim()) {
      results.value = []
      selectedIndex.value = 0
      return
    }
    isLoading.value = true
    try {
      const searchQuery: SearchQuery = { query: q }
      results.value = await window.electronAPI.searchQuery(searchQuery)
      selectedIndex.value = 0
    } finally {
      isLoading.value = false
    }
  }

  function open() {
    isOpen.value = true
    query.value = ''
    results.value = []
    selectedIndex.value = 0
  }

  function close() {
    isOpen.value = false
  }

  function selectNext() {
    if (selectedIndex.value < results.value.length - 1) {
      selectedIndex.value++
    }
  }

  function selectPrev() {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  }

  return {
    isOpen, query, results, selectedIndex, isLoading,
    search, open, close, selectNext, selectPrev
  }
})
```

**Step 2: 確認編譯**

```bash
pnpm run build 2>&1 | grep -i error | head -10
```

**Step 3: Commit**

```bash
git add src/stores/search.ts
git commit -m "feat(store): 新增 search store — 搜尋狀態管理"
```

---

## Task 5：實作 SearchPanel.vue 組件

**Files:**
- Create: `src/components/SearchPanel.vue`

**Step 1: 建立 `src/components/SearchPanel.vue`**

```vue
<script setup lang="ts">
import { watch, nextTick, ref } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useArticleStore } from '@/stores/article'
import type { SearchResult } from '@/types'

const searchStore = useSearchStore()
const articleStore = useArticleStore()

const inputRef = ref<HTMLInputElement | null>(null)

// 開啟時自動 focus
watch(() => searchStore.isOpen, async (open) => {
  if (open) {
    await nextTick()
    inputRef.value?.focus()
  }
})

// debounce 搜尋
let debounceTimer: ReturnType<typeof setTimeout> | null = null
function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  searchStore.query = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => searchStore.search(val), 200)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); searchStore.selectNext() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); searchStore.selectPrev() }
  else if (e.key === 'Enter') { openSelected() }
  else if (e.key === 'Escape') { searchStore.close() }
}

function openSelected() {
  const result = searchStore.results[searchStore.selectedIndex]
  if (result) openResult(result)
}

async function openResult(result: SearchResult) {
  // 找到對應文章並切換
  const article = articleStore.articles.find(a => a.filePath === result.filePath)
  if (article) {
    articleStore.setCurrentArticle(article)
  }
  searchStore.close()
  // TODO(topic-014): scrollToMatch stub — CM6 scroll-to API 確認後實作
}

function highlightKeyword(text: string, keyword: string): string {
  if (!keyword.trim()) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-warning text-warning-content rounded px-0.5">$1</mark>'
  )
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="searchStore.isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-20"
      @click.self="searchStore.close()"
    >
      <div class="bg-base-100 border border-base-300 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        <!-- 搜尋輸入 -->
        <div class="flex items-center px-4 py-3 border-b border-base-300">
          <svg class="w-5 h-5 text-base-content/50 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref="inputRef"
            type="text"
            :value="searchStore.query"
            @input="onInput"
            @keydown="onKeydown"
            placeholder="搜尋文章內容..."
            class="flex-1 bg-transparent outline-none text-base-content text-base"
          />
          <kbd class="kbd kbd-sm ml-2">Esc</kbd>
        </div>

        <!-- 搜尋結果 -->
        <div class="max-h-96 overflow-y-auto">
          <!-- Loading -->
          <div v-if="searchStore.isLoading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md"></span>
          </div>

          <!-- 無結果 -->
          <div
            v-else-if="searchStore.query && !searchStore.results.length"
            class="text-center py-8 text-base-content/50"
          >
            找不到「{{ searchStore.query }}」的相關文章
          </div>

          <!-- 結果列表 -->
          <ul v-else>
            <li
              v-for="(result, index) in searchStore.results"
              :key="result.id"
              :class="[
                'px-4 py-3 cursor-pointer border-b border-base-200 last:border-0',
                index === searchStore.selectedIndex
                  ? 'bg-primary/10'
                  : 'hover:bg-base-200'
              ]"
              @click="openResult(result)"
              @mouseenter="searchStore.selectedIndex = index"
            >
              <!-- 標題 + 日期 -->
              <div class="flex items-center justify-between mb-1">
                <span
                  class="font-medium text-base-content"
                  v-html="highlightKeyword(result.title, searchStore.query)"
                />
                <span class="text-xs text-base-content/40 ml-2 shrink-0">
                  {{ new Date(result.updatedAt).toLocaleDateString('zh-TW') }}
                </span>
              </div>
              <!-- Snippet -->
              <p
                class="text-sm text-base-content/60 line-clamp-2"
                v-html="highlightKeyword(result.matchSnippet, searchStore.query)"
              />
            </li>
          </ul>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-4 py-2 border-t border-base-300 text-xs text-base-content/40">
          <span v-if="searchStore.results.length">
            {{ searchStore.results.length }} 篇文章
          </span>
          <span v-else />
          <div class="flex gap-3">
            <span><kbd class="kbd kbd-xs">↑↓</kbd> 選擇</span>
            <span><kbd class="kbd kbd-xs">Enter</kbd> 開啟</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

**Step 2: Commit**

```bash
git add src/components/SearchPanel.vue
git commit -m "feat(ui): 新增 SearchPanel 浮動搜尋面板組件

- Cmd/Ctrl+F 觸發，Teleport 至 body
- 鍵盤 ↑↓ 導航、Enter 開啟、Esc 關閉
- 關鍵字高亮（DaisyUI warning 色）
- scroll-to stub 留待 CM6 API 確認後實作"
```

---

## Task 6：整合至 App — 快捷鍵 + 索引建立

**Files:**
- Modify: `src/App.vue`（或掛載點）
- Modify: `src/stores/article.ts`（載入後觸發 buildIndex）

**Step 1: 在 `src/App.vue` 加入快捷鍵監聽與 SearchPanel**

在 `<script setup>` 加入：

```typescript
import SearchPanel from '@/components/SearchPanel.vue'
import { useSearchStore } from '@/stores/search'
import { onMounted, onUnmounted } from 'vue'

const searchStore = useSearchStore()

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault()
    searchStore.open()
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))
```

在 `<template>` 加入（放在最外層 div 內）：

```html
<SearchPanel />
```

**Step 2: 在 `src/stores/article.ts` 的 `loadArticles` 完成後觸發建立索引**

找到 `loadArticles` 函數，在載入完成後加入：

```typescript
// 載入文章後建立搜尋索引
if (configStore.config.paths.articlesDir) {
  window.electronAPI.searchBuildIndex(configStore.config.paths.articlesDir)
    .catch(() => {}) // 不影響主流程
}
```

**Step 3: 確認編譯與執行**

```bash
pnpm run build
```
Expected: 無 error

**Step 4: Commit**

```bash
git add src/App.vue src/stores/article.ts
git commit -m "feat(app): 整合全文搜尋 — Cmd/Ctrl+F 快捷鍵 + 啟動建立索引"
```

---

## Task 7：E2E 驗收測試

**Files:**
- Create: `tests/e2e/search-flow.spec.ts`

**Step 1: 建立 E2E 測試**

```typescript
import { test, expect } from '../e2e/helpers/electron-fixture'

test.describe('全文搜尋流程', () => {
  test('Cmd/Ctrl+F 開啟搜尋面板', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await expect(page.locator('input[placeholder="搜尋文章內容..."]')).toBeVisible()
  })

  test('Esc 關閉搜尋面板', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.keyboard.press('Escape')
    await expect(page.locator('input[placeholder="搜尋文章內容..."]')).not.toBeVisible()
  })

  test('輸入關鍵字後顯示搜尋結果', async ({ electronApp, page }) => {
    await page.keyboard.press('Control+f')
    await page.fill('input[placeholder="搜尋文章內容..."]', 'test')
    await page.waitForTimeout(300) // debounce
    // 有結果或顯示「找不到」
    const hasResults = await page.locator('ul li').count()
    const noResults = await page.locator('text=找不到').count()
    expect(hasResults + noResults).toBeGreaterThan(0)
  })
})
```

**Step 2: Commit**

```bash
git add tests/e2e/search-flow.spec.ts
git commit -m "test(e2e): 新增全文搜尋 E2E 測試"
```

---

## Task 8：執行完整測試並建立 PR

**Step 1: 執行單元測試**

```bash
pnpm run test
```
Expected: All tests PASS

**Step 2: 確認 lint**

```bash
pnpm run lint
```
Expected: 無 error

**Step 3: Push 並建立 PR**

```bash
git push origin feature/s01-full-text-search
gh pr create --base develop --title "feat: 全文搜尋功能（S-01）" --body "## Summary

- SearchService：Main process 全量掃描 + chokidar 增量更新
- IPC \`search:query\`：關鍵字搜尋，預設時間倒序
- SearchPanel.vue：Cmd/Ctrl+F 浮動面板，鍵盤導航
- wikilink 解析預留（topic-014 文章間連結）
- scroll-to stub 保留，待 CM6 API 確認後填入

## Test plan
- [ ] \`pnpm run test\` 全部通過
- [ ] Cmd/Ctrl+F 開啟面板
- [ ] 關鍵字搜尋有結果
- [ ] ↑↓ 鍵盤導航，Enter 開啟文章
- [ ] Esc 關閉
- [ ] Jordan 驗收

🤖 Generated with Claude Code"
```

---

## 完成定義

- [ ] `pnpm run test` 全數通過（含 SearchService 單元測試）
- [ ] `Cmd/Ctrl+F` 開啟浮動面板
- [ ] 輸入關鍵字後出現結果（含 snippet + 日期）
- [ ] `↑↓` 導航，`Enter` 開啟文章，`Esc` 關閉
- [ ] 關鍵字高亮顯示
- [ ] wikilink 解析已實作（`getWikilinks()` 測試通過）
- [ ] PR 建立，等待 Jordan 驗收
