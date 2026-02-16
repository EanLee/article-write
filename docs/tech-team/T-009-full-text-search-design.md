# T-009 全文搜尋功能設計

**日期**: 2026-02-16
**負責人**: Lin（Services Engineer）
**狀態**: ✅ 完成

## 任務背景

圓桌 #013 決策：全文搜尋為 v0.2 後半 Sprint P0 功能。
Jordan（User）每天 2~3 次因找不到舊文章內容而困擾。

**圓桌決策重點**：
- 本地 markdown 檔，Node.js `fs` + regex，不需搜尋引擎
- 索引設計預留 wikilink 擴充空間（為 topic-014 文章間連結打基礎）
- 搜尋結果 scroll-to CM6 Editor 先留 stub，待 CM6 scroll-to API 確認穩定

## 討論記錄

### 第一輪 (2026-02-16)

Sam：「好，今天 T-009 全文搜尋，核心問題三個：索引住在哪、什麼時機建立或重建、搜尋請求走哪條路。今天要決定：索引儲存位置、觸發重建時機、IPC channel 設計。Lin，SearchService 要獨立出來，還是直接擴充 MetadataCacheService？」

Lin：「提案如下——索引資料結構每筆存：`filePath`、`title`、`tags`、`category`、`status`、`wikilinks`（`string[]`，先掃 `[[...]]` 塞進來備用）、`contentSnippet`（去掉 markdown 語法的純文字）、`updatedAt`。存放位置建議**獨立**：`articlesDir/.writeflow/search-index.json`。metadata-cache 塞內文摘要會變肥、職責不清楚，兩個檔案各自單純。建立時機：**啟動全量建，之後增量更新**（chokidar `add`/`change`/`unlink`）。Lazy 不考慮，搜尋是高頻操作，第一次才建會讓使用者等。IPC handler：`search:query`，送 `{ query, filters? }`，回傳 `{ filePath, title, matchSnippet, score }[]`，score 先用 match 次數排序。」

Wei：「快捷鍵 `Cmd/Ctrl+Shift+F` 開 modal overlay，不佔常駐版面。每筆顯示標題 + snippet（前後約 50 字）+ 關鍵字高亮。點擊後切換文章，scroll-to 先做 `scrollToMatch(index)` stub，UI 保留按鈕，CM6 串接後填實作。Alex，modal 開著底層編輯器要 dim 嗎？結果列表要支援鍵盤上下選嗎？」

Alex：「搜尋入口建議 `Cmd/Ctrl+F` 浮動面板，Jordan 在寫作中途找東西，不應該切換版面上下文。每筆要顯示：標題、日期、命中段落前後兩行——光標題判斷不了『這篇是不是我要的』。高亮用 DaisyUI `warning` 色，但只高亮當前選中那筆，其他低飽和度，焦點要集中。**UX 陷阱**：Jordan 的真實需求是『上週寫的』，預設排序應該是**時間倒序**，相關度是次選。Wei 如果只做相關度排序，Jordan 一定找不到。」

---

### 第二輪 (2026-02-16)

Sam：「好，我來拍板。SearchService 獨立建，MetadataCacheService 職責已夠重，塞搜尋進去違反 SRP。排序預設時間倒序——Alex 說得對，使用者通常找最近的，score 做成切換選項但不預設。快捷鍵 `Cmd/Ctrl+F`，Notion、Obsidian 都這樣，降低學習成本。還有一個沒人提到：search-index.json 要 persist 嗎？還是每次啟動都重建？cold start 效能預期要說清楚。」

Wei：「浮動面板、不 dim，確認採用。鍵盤上下選支援——`↑↓` 導航、`Enter` 開啟，基本可用性。Lin，IPC response 補 `updatedAt`（timestamp），預設時間倒序排序要靠這個。`score` 留著給相關度切換用。快捷鍵改 `Cmd/Ctrl+F`，沒問題。」

Lin：「`updatedAt` 加進去。`matchSnippet` 只回傳第一個命中片段，回傳陣列 UI 端複雜很多。暫定型別：`{ id, title, matchSnippet, updatedAt, category, status }`。Wei，這樣欄位夠用嗎？」

---

### 第三輪 (2026-02-16)

Lin：「建議每次啟動重建，不 persist。個人部落格頂多幾百篇，全量掃描實測約 200–500ms，維護 persist 機制的複雜度完全不成比例。MetadataCacheService 已有 metadata cache，search index 從 cache 直接建立就夠快。cold start 的瓶頸不在這裡。」

Wei：「欄位基本夠用，但需要補 `filePath`——光靠 `id` 還要再查一次才知道開哪個檔案，直接帶 `filePath` 乾淨多了。其他欄位都用得到。」

---

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

- `1f05e75`: feat(types): 新增 SearchQuery、SearchResult 型別定義
- `f96275b`: feat(service): 實作 SearchService — 全文搜尋核心邏輯
- `2bdad48`: feat(ipc): 新增 search:query 與 search:build-index IPC handler
- `35e048f`: feat(store): 新增 search store — 搜尋狀態管理
- `8bfe7e4`: feat(ui): 新增 SearchPanel 浮動搜尋面板組件
- `e8403f4`: feat(app): 整合全文搜尋 — Cmd/Ctrl+F 快捷鍵 + 啟動建立索引
- `70584cd`: test(e2e): 新增全文搜尋 E2E 測試
- `5508c5b`: fix(store): 使用 optional chaining 防止測試環境缺少 searchBuildIndex
