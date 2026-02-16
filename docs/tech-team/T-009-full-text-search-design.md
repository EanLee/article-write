# T-009 全文搜尋功能設計

**日期**: 2026-02-16
**負責人**: Lin（Services Engineer）
**狀態**: 📋 規劃中

## 任務背景

圓桌 #013 決策：全文搜尋為 v0.2 後半 Sprint P0 功能。
Jordan（User）每天 2~3 次因找不到舊文章內容而困擾。

**圓桌決策重點**：
- 本地 markdown 檔，Node.js `fs` + regex，不需搜尋引擎
- 索引設計預留 wikilink 擴充空間（為 topic-014 文章間連結打基礎）
- 搜尋結果 scroll-to CM6 Editor 先留 stub，待 CM6 scroll-to API 確認穩定

## 設計決策

### 架構

| 項目 | 決定 | 理由 |
|------|------|------|
| SearchService | 獨立建立，不擴充 MetadataCacheService | SRP，職責清楚，日後換搜尋算法不影響 metadata |
| 索引 persistence | 不 persist，每次啟動重建 | 幾百篇文章全量掃描約 200–500ms，維護 persist 複雜度不成比例 |
| 索引建立時機 | 啟動時全量建，之後 chokidar 增量更新 | 高頻操作不能 lazy |
| 存放位置 | 記憶體（不存檔） | 從 MetadataCacheService 的 metadata 直接建立 |
| 預設排序 | **時間倒序**（`updatedAt`） | Jordan 通常找最近的文章；相關度排序做成切換選項 |
| 快捷鍵 | `Cmd/Ctrl+F` | 符合 Notion、Obsidian 主流慣例 |

### UI 設計

| 項目 | 決定 |
|------|------|
| 入口 | 浮動面板 overlay，不佔常駐版面 |
| 底層 dim | 不 dim，不打斷寫作上下文 |
| 每筆顯示 | 標題 + 日期 + 命中段落前後兩行 |
| 高亮 | DaisyUI `warning` 色；只高亮當前選中筆，其他低飽和度 |
| 鍵盤導航 | `↑↓` 選擇，`Enter` 開啟 |
| scroll-to | 先實作 `scrollToMatch(index)` stub，CM6 API 確認後填入 |

### IPC 設計

**Handler**：`search:query`

**Request**：
```typescript
interface SearchQuery {
  query: string
  filters?: {
    category?: string
    status?: ArticleStatus
    tags?: string[]
  }
}
```

**Response**：
```typescript
interface SearchResult {
  id: string
  filePath: string      // 跳轉直接用
  title: string
  matchSnippet: string  // 第一個命中片段，含前後文
  updatedAt: string     // ISO 8601，預設排序依據
  category: ArticleCategory
  status: ArticleStatus
}
```

### wikilink 擴充預留

索引建立時，同步解析每篇文章的 `[[...]]` 語法並存入記憶體（獨立 Map），供未來 topic-014 文章間連結功能使用，共用同一次全量掃描。

## 實作說明

**檔案結構（預計）**：
```
src/main/services/SearchService.ts     ← 新建
src/renderer/stores/search.ts          ← 新建
src/components/SearchPanel.vue         ← 新建
```

**啟動流程**：
1. Main process 啟動後，`SearchService.buildIndex()` 讀取 MetadataCache 的文章列表
2. 逐篇讀取 `contentSnippet`（去 markdown 語法的純文字）
3. 監聽 chokidar 事件做增量更新
4. IPC handler `search:query` 在記憶體索引中 regex 搜尋後回傳

## 相關檔案

- `src/main/services/MetadataCacheService.ts`（依賴來源）
- `src/main/services/FileService.ts`（fs 操作）
- `src/components/CodeMirrorEditor.vue`（scroll-to stub 整合點）

## 相關 Commit

> 待實作後補充
