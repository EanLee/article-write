# 端到端發布流程文件

> **建立日期**: 2026-02-13
> **版本**: v1.0
> **狀態**: 已實作，待端到端驗證

---

## 概覽

WriteFlow 的完整發布流程：從 Obsidian Vault 的草稿，到出現在 Astro Blog。

```
Obsidian Vault (.md)
  │
  ▼
[1] 使用者在 WriteFlow 選擇文章並點「發布」
  │
  ▼
[2] article store: moveToPublished()
    - 更新 frontmatter status: draft → published
    - 寫回 Obsidian vault 原始位置
    - 背景觸發 git commit（vault 備份）
  │
  ▼
[3] PublishService: publishArticle()
    - 讀取文章內容
    - 轉換 Obsidian 語法
    - 複製圖片到 Astro public/images/
    - 寫入 Astro src/content/blog/
  │
  ▼
Astro Blog (src/content/blog/{slug}.md)
```

---

## 詳細流程

### Step 1：使用者操作

**入口**：`ArticleManagement.vue` 或 `ConversionPanel.vue` 的「發布」按鈕

**觸發**：
```typescript
// store action
await articleStore.moveToPublished(articleId)
```

---

### Step 2：article store — moveToPublished()

**檔案**：`src/stores/article.ts`

```typescript
async function moveToPublished(id: string) {
  const article = articles.value.find(a => a.id === id)

  if (article.status === ArticleStatus.Draft) {
    const updatedArticle = {
      ...article,
      status: ArticleStatus.Published,
      frontmatter: {
        ...article.frontmatter,
        status: ArticleStatus.Published,  // ← 寫入 frontmatter
      },
      lastModified: new Date(),
    }

    await saveArticle(updatedArticle)  // ← 寫回 vault

    // 背景 git 備份（靜默，失敗不影響使用者）
    window.electronAPI
      .gitAddCommitPush(blogPath, `backup: publish ${article.slug}`)
      .catch(err => console.warn('Git backup failed:', err))
  }
}
```

**⚠️ 注意**：此步驟只處理 Obsidian vault 內的狀態，**尚未複製到 Astro**。

---

### Step 3：PublishService — publishArticle()

**檔案**：`src/main/services/PublishService.ts`

**呼叫方式（IPC）**：
```typescript
// Renderer → Main
const result = await window.electronAPI.publishArticle(article, {
  articlesDir: config.paths.articlesDir,   // Obsidian vault 路徑
  targetBlogDir: config.paths.targetBlog,  // Astro blog 根目錄
  imagesDir: undefined,                     // 預設為 articlesDir/images
})
```

**內部流程**：

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
  │     ├── 來源：articlesDir/images/ （或 imagesDir）
  │     └── 目標：targetBlogDir/public/images/
  ├── combineContent()          — 重組 frontmatter + content
  └── writeToAstro()            — 寫入目標路徑
        └── 目標：targetBlogDir/src/content/blog/{slug}.md
```

**回傳值**：
```typescript
interface PublishResult {
  success: boolean
  message: string
  targetPath?: string    // 寫入的完整路徑
  errors?: string[]
  warnings?: string[]    // 圖片找不到等非致命警告
}
```

---

### Step 4：Git 備份（背景）

**兩個觸發點**：

| 觸發點 | 備份對象 | 時機 |
|--------|---------|------|
| `moveToPublished` | Obsidian vault | 更新 status 後 |
| 未來可加 | Astro blog | `publishArticle` 成功後 |

**目前行為**：
- `moveToPublished` 成功 → git commit vault（保護草稿不丟失）
- `publishArticle` 成功 → **尚未觸發** Astro 的 git commit

---

## 目錄結構對應

### Obsidian Vault（來源）

```
{articlesDir}/
  Software/
    my-article.md        ← status: published
    another-article.md
  growth/
    ...
  images/
    screenshot.png       ← 圖片來源
```

### Astro Blog（目標）

```
{targetBlogDir}/
  src/
    content/
      blog/
        my-article.md    ← 轉換後寫入（{slug}.md）
  public/
    images/
      screenshot.png     ← 圖片複製到此
```

---

## 設定對應

```typescript
// AppConfig (src/types/index.ts)
interface AppConfig {
  paths: {
    articlesDir: string   // → PublishConfig.articlesDir
    targetBlog: string    // → PublishConfig.targetBlogDir
  }
}
```

---

## IPC 通訊層

```
Renderer (Vue)
  │ window.electronAPI.publishArticle(article, config)
  ▼
Preload (contextBridge)
  │ ipcRenderer.invoke('publish-article', article, config)
  ▼
Main (ipcMain.handle)
  │ publishService.publishArticle(article, config, onProgress)
  ▼
PublishService
```

---

## 已知問題與待驗證項目

### 🔴 待驗證（端到端未跑過）

- [ ] `readArticleContent`：當 `article.filePath` 是絕對路徑時，`join(articlesDir, filePath)` 的行為
- [ ] `writeToAstro`：目標格式是 `{slug}.md`，Astro 的實際需求（有些 Astro blog 用 `{slug}/index.md`）
- [ ] 圖片來源路徑：Obsidian vault 的圖片通常在 `attachments/` 而非 `images/`
- [ ] `convertFrontmatter`：`status` 欄位是否需要從 frontmatter 移除（Astro 不認識 `status`）

### 🟡 已知限制

- `processImages` 只處理已轉換成 `![alt](./images/name)` 的圖片，原始 Obsidian `![[img]]` 語法已先轉換
- `combineContent` 使用自製 YAML 序列化，有特殊字元處理邏輯，未使用 js-yaml

### 🟢 已確認可行

- Wiki Links 轉換
- Obsidian 圖片語法轉換
- `nothing to commit` git 邊界情況
- 所有 Unit Test 通過（311 pass）

---

## 端到端測試計畫

### 手動測試步驟

1. 在 WriteFlow 設定頁設定：
   - `articlesDir` = 本機 Obsidian vault 路徑
   - `targetBlog` = 本機 Astro blog 路徑

2. 建立一篇測試文章（含 Wiki Link、圖片、frontmatter）

3. 點「發布」，驗證：
   - [ ] Obsidian vault 中 `status` 變為 `published`
   - [ ] `{targetBlog}/src/content/blog/{slug}.md` 存在且內容正確
   - [ ] Wiki Links 已轉換
   - [ ] 圖片已複製到 `{targetBlog}/public/images/`
   - [ ] frontmatter 格式 Astro 可接受

4. 執行 `astro build` 確認無錯誤

### 整合測試（TODO）

目前缺少真實檔案系統的整合測試，所有測試都使用 mock。
需要考慮新增使用真實 temp 目錄的整合測試。

---

## 相關檔案

| 功能 | 檔案 |
|------|------|
| 發布核心邏輯 | `src/main/services/PublishService.ts` |
| Git 自動化 | `src/main/services/GitService.ts` |
| 文章狀態管理 | `src/stores/article.ts` |
| IPC 通訊設定 | `src/main/main.ts` |
| Preload 橋接 | `src/main/preload.ts` |
| 發布 UI（待建） | `src/components/（P0-4）` |
