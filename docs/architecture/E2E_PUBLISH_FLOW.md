# 端到端發布流程文件

> **建立日期**: 2026-02-13
> **最後更新**: 2026-02-14
> **版本**: v2.0
> **狀態**: 已實作，待端到端驗證
> **重大變更**: v2.0 依據圓桌 #006 決策，從「單篇發布」改為「全量同步」機制

---

## 概覽

WriteFlow 的完整發布流程：從 Obsidian Vault 的草稿，到出現在 Blog 的 content 資料夾。

```
Obsidian Vault (.md)
  │
  ▼
[1] 使用者在 WriteFlow 將文章標記為 published
    （EditorHeader 的狀態切換按鈕）
  │
  ▼
[2] article store: toggleStatus()
    - 切換 frontmatter status: draft ↔ published
    - 寫回 Obsidian vault 原始位置
  │
  ▼
[3] 使用者點「同步到 Blog」（ArticleManagement 頂部）
  │
  ▼
[4] PublishService: syncAllPublished()
    - 掃描 articlesDir 所有 .md 檔案
    - 過濾 status: published 的文章
    - 逐篇呼叫 publishArticle()
  │
  ▼
[5] 每篇文章：publishArticle()
    - 讀取文章內容
    - 轉換 Obsidian 語法
    - 複製圖片到 {target}/{slug}/images/
    - 寫入 {target}/{slug}/index.md
  │
  ▼
Blog content 資料夾（{target}/{slug}/index.md）
```

---

## 詳細流程

### Step 1：標記文章狀態

**入口**：`EditorHeader.vue` 的狀態切換按鈕

**行為**：
- 草稿狀態：顯示「標記為已發布」，按下切換為 published
- 已發布狀態：顯示「改為草稿」，按下切換為 draft

**觸發**：
```
articleStore.toggleStatus(articleId)
```

---

### Step 2：article store — toggleStatus()

**檔案**：`src/stores/article.ts`

**行為**：
- 讀取當前 status
- 切換為相反狀態（draft ↔ published）
- 更新 frontmatter status 欄位
- 寫回 Obsidian vault 原始位置（不移動檔案）

**注意**：
- 若 `.md` 沒有 status 欄位，讀取時預設為 draft
- `toggleStatus` 只改 status，不觸發同步

---

### Step 3：使用者觸發全量同步

**入口**：`ArticleManagement.vue` 頂部的「同步到 Blog」按鈕

**觸發**：
```
window.electronAPI.syncAllPublished(config)
```

**進度回報**：IPC 事件 `sync-progress`，每篇文章處理時發送
```
{ current: number, total: number, title: string }
```

---

### Step 4：PublishService — syncAllPublished()

**檔案**：`src/main/services/PublishService.ts`

**流程**：
```
syncAllPublished()
  ├── scanMarkdownFiles()     — 遞迴掃描 articlesDir 所有 .md
  ├── parseArticleFromFile()  — 解析每個 .md 的 frontmatter
  ├── 過濾 status === 'published'
  └── 逐篇呼叫 publishArticle()
```

**回傳值**：
```typescript
interface SyncResult {
  total: number      // 找到幾篇 published 文章
  succeeded: number  // 幾篇成功
  failed: number     // 幾篇失敗
  errors: string[]   // 每篇失敗的原因
  warnings: string[] // 非致命警告（如圖片找不到）
}
```

---

### Step 5：每篇文章 — publishArticle()

**流程**：
```
publishArticle()
  ├── validateConfig()          — 檢查 articlesDir、targetBlogDir 不為空
  ├── validateArticle()         — 檢查 title、slug、filePath 不為空
  ├── readArticleContent()      — 讀取 .md 原始內容
  ├── convertMarkdownContent()  — 轉換 Obsidian 語法
  │     ├── convertObsidianImages()   ![[img.png]] → ![img.png](./images/img.png)
  │     ├── convertWikiLinks()        [[link]] → [link](link)
  │     ├── removeObsidianComments()  %%comment%% → (空)
  │     └── convertHighlightSyntax() ==text== → <mark>text</mark>
  ├── convertFrontmatter()      — 轉換 frontmatter 欄位
  │     ├── pubDate 標準化
  │     └── tags 陣列化 + 移除 # 符號
  ├── processImages()           — 複製圖片
  │     ├── 掃描 content 中的圖片引用
  │     ├── 來源：articlesDir/images/（或 imagesDir）
  │     └── 目標：{target}/{slug}/images/
  ├── combineContent()          — 重組 frontmatter + content
  └── writeToAstro()            — 寫入目標路徑
        └── 目標：{target}/{slug}/index.md
```

---

## 輸出結構（Leaf 模式）

每篇文章輸出為獨立資料夾：

```
{target}/                       ← 使用者設定的 content 資料夾
  my-article/
    index.md                    ← 轉換後的文章
    images/
      screenshot.png            ← 該文章引用的圖片
  another-article/
    index.md
    images/
      photo.jpg
```

### 目錄結構對應

**Obsidian Vault（來源）**：
```
{articlesDir}/
  Software/
    my-article.md      ← status: published（觸發同步的條件）
    draft-article.md   ← status: draft（同步時略過）
  growth/
    ...
  images/              ← 圖片來源（或由 imagesDir 設定）
    screenshot.png
```

**Blog content（目標）**：
```
{target}/              ← 直接指向 content 資料夾
  my-article/
    index.md           ← 轉換後的文章
    images/
      screenshot.png   ← 複製到此
```

---

## 設定對應

```typescript
interface AppConfig {
  paths: {
    articlesDir: string   // Obsidian vault 中文章的根目錄
    targetBlog: string    // 輸出的 content 資料夾（直接指向）
    imagesDir?: string    // 圖片來源目錄（選填，預設為 articlesDir/images）
  }
}
```

**設定範例**：
```
articlesDir = C:\Users\Ean\Obsidian\Blog
targetBlog  = C:\Users\Ean\Projects\my-blog\src\content\blog
```

---

## IPC 通訊層

```
Renderer (Vue)
  │ window.electronAPI.syncAllPublished(config)
  ▼
Preload (contextBridge)
  │ ipcRenderer.invoke('sync-all-published', config)
  ▼
Main (ipcMain.handle)
  │ publishService.syncAllPublished(config, onProgress)
  │   └── event.sender.send('sync-progress', { current, total, title })
  ▼
PublishService
```

---

## Status 欄位規則

| 情況 | 同步行為 |
|------|---------|
| `status: published` | 同步時輸出 |
| `status: draft` | 同步時略過 |
| 無 status 欄位 | 預設視為 draft，略過 |

---

## 已知問題與待驗證項目

### 🔴 待驗證（端到端未跑過）

- [ ] `readArticleContent`：當 `article.filePath` 是絕對路徑時的行為
- [ ] `convertFrontmatter`：`status` 欄位是否需要從 frontmatter 移除（Blog 框架不認識 `status`）
- [ ] 圖片來源路徑：Obsidian vault 的圖片可能在 `attachments/` 而非 `images/`
- [ ] `syncAllPublished` 在真實檔案系統的掃描行為

### 🟡 已知限制

- `processImages` 只處理已轉換成 `![alt](./images/name)` 的圖片
- `combineContent` 使用自製 YAML 序列化，未使用 js-yaml
- `syncAllPublished` 為全量覆蓋，不做差分同步

### 🟢 已確認可行

- Wiki Links 轉換
- Obsidian 圖片語法轉換
- `nothing to commit` git 邊界情況
- 所有 Unit Test 通過（311 pass）
- Leaf 結構路徑邏輯正確

---

## 端到端測試計畫

### 手動測試步驟

1. 在 WriteFlow 設定頁設定：
   - `articlesDir` = 本機 Obsidian vault 路徑
   - `targetBlog` = 本機 Blog content 資料夾路徑

2. 建立一篇測試文章（含 Wiki Link、圖片、frontmatter）

3. 在 WriteFlow 將文章標記為已發布（EditorHeader 按鈕）

4. 按「同步到 Blog」，驗證：
   - [ ] `{target}/{slug}/index.md` 存在且內容正確
   - [ ] Wiki Links 已轉換
   - [ ] 圖片已複製到 `{target}/{slug}/images/`
   - [ ] frontmatter 格式 Blog 框架可接受
   - [ ] 同步進度顯示正確

5. 修改已發布文章，再次同步，驗證覆蓋正確

6. 將文章改回草稿，再次同步，驗證**不會**重新輸出

### 整合測試（TODO）

目前缺少真實檔案系統的整合測試，所有測試使用 mock。

---

## 相關文件

| 功能 | 檔案 |
|------|------|
| 發布哲學與設計決策 | `docs/architecture/PUBLISH_DESIGN.md` |
| 發布核心邏輯 | `src/main/services/PublishService.ts` |
| 文章狀態管理 | `src/stores/article.ts` |
| IPC 通訊設定 | `src/main/main.ts` |
| Preload 橋接 | `src/main/preload.ts` |
| 同步按鈕 UI | `src/components/ArticleManagement.vue` |
| 狀態切換 UI | `src/components/EditorHeader.vue` |

---

## 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-02-13 | 初版，單篇發布流程，target 為 Astro 專案根目錄 |
| v2.0 | 2026-02-14 | 改為全量同步；Leaf 結構輸出；target 直接指向 content 資料夾；依據圓桌 #006 |
