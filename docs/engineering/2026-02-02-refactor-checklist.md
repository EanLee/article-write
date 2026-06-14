---
title: "重構檢查清單"
domain: engineering
type: plan
status: approved
owner: tech-team
updated: 2026-02-02
source_of_truth: true
---

# 重構檢查清單

> 基於產品規劃文件（PRODUCT_SPEC.md）的具體執行清單

---

## 🎯 目標

移除 Obsidian 依賴，重新定位為**通用 Markdown 部落格寫作工具**

---

## Phase 1：移除 Obsidian 概念

### 1.1 設定面板重構

**檔案**：`src/components/SettingsPanel.vue`

- [ ] 移除 "Obsidian Vault" 字眼
- [ ] 改為 "文章目錄" 或 "內容目錄"
- [ ] 更新提示文字：
  ```
  舊：應包含 Publish、Drafts、Images 資料夾
  新：存放您的文章與圖片的資料夾
  ```
- [ ] 移除 Obsidian 特定驗證邏輯

**修改範例**：
```vue
<!-- 舊 -->
<label>Obsidian Vault</label>
<span>應包含 Publish、Drafts、Images 資料夾</span>

<!-- 新 -->
<label>文章目錄</label>
<span>存放您的 Markdown 文章與圖片</span>
```

### 1.2 配置類型重構

**檔案**：`src/types/index.ts`

- [ ] 重新命名配置欄位：
  ```typescript
  // 舊
  interface AppConfig {
    paths: {
      obsidianVault: string  // ❌
      targetBlog: string
      imagesDir: string
    }
  }

  // 新
  interface AppConfig {
    paths: {
      contentDir: string     // ✓ 文章目錄
      blogRepo: string       // ✓ 部落格專案路徑
      imagesDir: string      // ✓ 圖片目錄
    }
    blogType?: 'astro' | 'hugo' | 'hexo' | 'jekyll' | 'custom'
  }
  ```

### 1.3 文件名稱重構

- [ ] 移除或重新命名任何包含 "obsidian" 的變數名稱
- [ ] 搜尋程式碼中的 "obsidian" 字眼並替換

---

## Phase 2：實作 Adapter 模式

### 2.1 創建 Adapter 介面

**新增檔案**：`src/services/adapters/BlogAdapter.ts`

```typescript
export interface BlogAdapter {
  name: string

  // 轉換 Wiki Link
  convertWikiLink(link: string, allArticles: Article[]): string

  // 轉換圖片引用
  convertImageReference(imageName: string): string

  // 轉換 Frontmatter
  convertFrontmatter(frontmatter: Frontmatter): any

  // 取得文章目標路徑
  getArticleTargetPath(article: Article, blogRepo: string): string

  // 取得圖片目標路徑
  getImageTargetPath(article: Article, imageName: string, blogRepo: string): string
}
```

### 2.2 實作 Astro Adapter

**新增檔案**：`src/services/adapters/AstroAdapter.ts`

- [ ] 實作所有介面方法
- [ ] 從 `ConverterService` 提取現有邏輯
- [ ] 測試與現有功能的相容性

```typescript
export class AstroAdapter implements BlogAdapter {
  name = 'Astro'

  convertWikiLink(link: string, allArticles: Article[]): string {
    // 現有的轉換邏輯
    const slug = generateSlug(link)
    return `[${link}](../${slug}/)`
  }

  convertImageReference(imageName: string): string {
    return `![${imageName}](./images/${imageName})`
  }

  // ... 其他方法
}
```

### 2.3 重構 ConverterService

**檔案**：`src/services/ConverterService.ts`

- [ ] 注入 `BlogAdapter`
- [ ] 使用 Adapter 方法取代硬編碼邏輯
- [ ] 保持向後相容

```typescript
class ConverterService {
  constructor(
    private adapter: BlogAdapter,
    private fileService: FileService,
    private markdownService: MarkdownService
  ) {}

  private convertWikiLinks(content: string): string {
    // 使用 adapter 而非硬編碼
    return this.adapter.convertWikiLink(content, this.articles)
  }
}
```

---

## Phase 3：Git 自動化發布

### 3.1 創建 Git Service

**新增檔案**：`src/services/GitService.ts`

```typescript
export class GitService {
  async executeInRepo(repoPath: string, commands: GitCommand[]): Promise<void>

  async add(repoPath: string, files: string[]): Promise<void>

  async commit(repoPath: string, message: string): Promise<void>

  async push(repoPath: string): Promise<void>

  async getStatus(repoPath: string): Promise<GitStatus>
}
```

- [ ] 實作基本 Git 操作
- [ ] 錯誤處理
- [ ] 執行結果回報

### 3.2 創建 PublishService

**新增檔案**：`src/services/PublishService.ts`

```typescript
export class PublishService {
  constructor(
    private converter: ConverterService,
    private git: GitService,
    private fileService: FileService
  ) {}

  async publish(article: Article, config: AppConfig): Promise<PublishResult> {
    // 1. 轉換文章
    const converted = await this.converter.convertSingleArticle(article, config)

    // 2. 複製到部落格專案
    await this.copyToBlog(converted, config.paths.blogRepo)

    // 3. Git 操作
    await this.git.add(config.paths.blogRepo, ['.'])
    await this.git.commit(config.paths.blogRepo, `publish: ${article.title}`)
    await this.git.push(config.paths.blogRepo)

    return { success: true }
  }
}
```

- [ ] 實作發布流程
- [ ] 處理錯誤回滾
- [ ] 提供進度回報

### 3.3 UI 整合

**檔案**：`src/components/EditorToolbar.vue` 或新增發布按鈕

- [ ] 新增「發布」按鈕
- [ ] 發布前確認對話框
- [ ] 顯示發布進度
- [ ] 成功/失敗提示

```vue
<button @click="handlePublish" class="btn btn-primary">
  <Upload :size="16" />
  發布到部落格
</button>
```

---

## Phase 4：UI 文案更新

### 4.1 應用程式標題

**檔案**：
- `package.json` - 更新 `productName` 和 `description`
- `src/index.html` - 更新 `<title>`
- `README.md` - 更新專案標題與描述

```json
// package.json
{
  "name": "markdown-blog-writer",
  "productName": "Markdown Blog Writer",
  "description": "Markdown 部落格寫作與發布工具"
}
```

### 4.2 設定面板文案

**檔案**：`src/components/SettingsPanel.vue`

- [ ] 標題：應用程式設定 → 部落格設定
- [ ] 路徑設定 tab 的說明文字
- [ ] 錯誤提示訊息

### 4.3 文章列表文案

**檔案**：`src/components/ArticleList.vue`

- [ ] 空狀態提示文字
- [ ] 操作按鈕文字

---

## Phase 5：文件更新

### 5.1 README.md

- [ ] 更新專案描述
- [ ] 移除 Obsidian 相關說明
- [ ] 新增「適用於」章節：
  ```markdown
  ## 適用於

  - Astro 部落格用戶
  - 習慣使用 Wiki Link 互相引用文章
  - 希望簡化發布流程的部落客
  ```

### 5.2 使用文件

**新增檔案**：`docs/USER_GUIDE.md`

- [ ] 首次設定指南
- [ ] 寫作工作流程
- [ ] 發布流程說明
- [ ] 常見問題

### 5.3 開發文件

**更新檔案**：`docs/DEVELOPMENT.md`

- [ ] Adapter 開發指南
- [ ] 如何新增新的部落格框架支援
- [ ] 架構設計說明

---

## Phase 6：測試與驗證

### 6.1 功能測試

- [ ] Wiki Link 轉換正確性
- [ ] 圖片複製功能
- [ ] Git 自動化流程
- [ ] 錯誤處理機制

### 6.2 端對端測試

建立測試場景：
1. [ ] 新用戶首次設定
2. [ ] 撰寫包含 Wiki Link 的文章
3. [ ] 插入圖片
4. [ ] 一鍵發布
5. [ ] 驗證部落格專案的檔案正確

### 6.3 相容性測試

- [ ] Astro 部落格（現有）
- [ ] 不同的資料夾結構
- [ ] Windows/macOS/Linux

---

## 🎯 驗收標準

### 完成 Phase 1-3 後，應達成：

✅ **產品定位清晰**
- 不再提及 Obsidian
- UI 文案符合新定位
- README 清楚說明產品價值

✅ **核心功能完整**
- Wiki Link 轉換 ✓
- 圖片自動處理 ✓
- 一鍵發布 ✓

✅ **用戶體驗流暢**
- 設定步驟 ≤ 3 步
- 發布只需 1 鍵
- 錯誤訊息清楚

✅ **技術架構健全**
- Adapter 模式可擴展
- Git 自動化穩定
- 程式碼可維護

---

## 📋 執行順序建議

1. **先做 Phase 1** - 移除 Obsidian 概念（影響範圍最廣）
2. **再做 Phase 2** - 實作 Adapter（為未來擴展打基礎）
3. **接著 Phase 3** - Git 自動化（核心價值）
4. **最後 Phase 4-6** - 完善 UI 與文件

---

## 🚨 注意事項

### 相容性
- 重構時保持現有功能運作
- 考慮現有用戶的設定遷移
- 提供設定遷移腳本（如果需要）

### 測試
- 每個 Phase 完成後都要測試
- 確保沒有破壞現有功能
- 手動測試完整流程

### 文件
- 程式碼變更同步更新文件
- commit message 清楚說明變更
- 遵循 Conventional Commits

---

## ✅ 檢查點

在開始下一個 Phase 前，確認：

- [ ] 當前 Phase 的所有項目都完成
- [ ] 所有測試通過
- [ ] 沒有破壞現有功能
- [ ] 程式碼已 commit
- [ ] 文件已更新

---

**最後提醒**：每次 commit 前，回顧 `PRODUCT_SPEC.md` 確保沒有偏離初衷。
