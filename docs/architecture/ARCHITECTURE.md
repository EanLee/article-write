# 架構設計文件

> 基於 PRODUCT_SPEC.md 的技術架構說明

---

## 🏗️ 系統架構概覽

```
┌─────────────────────────────────────────────────────────┐
│                     Electron App                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   文章管理    │  │   編輯器     │  │  發布工具    │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
│         │                 │                  │          │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│  ┌────────────────────────┴─────────────────────────┐  │
│  │              Service Layer                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │Converter   │  │ Git        │  │ Publish    │ │  │
│  │  │Service     │  │ Service    │  │ Service    │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  │         │                                         │  │
│  │  ┌──────┴──────────────────────────────┐         │  │
│  │  │        Blog Adapter (抽象層)         │         │  │
│  │  │  ┌──────┐  ┌──────┐  ┌──────┐      │         │  │
│  │  │  │Astro │  │ Hugo │  │ Hexo │ ...  │         │  │
│  │  │  └──────┘  └──────┘  └──────┘      │         │  │
│  │  └─────────────────────────────────────┘         │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
    ┌────┴────┐                          ┌────┴────┐
    │文章庫    │                          │部落格專案│
    │(用戶管理)│                          │(Git Repo)│
    └─────────┘                          └─────────┘
```

---

## 📂 資料夾結構分離

### 用戶文章庫（自由選擇位置）

```
~/my-articles/              ← 用戶可自由選擇
├── articles/
│   ├── article-1.md        ← 包含 Wiki Links [[]]
│   ├── article-2.md
│   └── draft-article.md
├── images/                 ← 統一圖片目錄
│   ├── screenshot-1.png
│   └── diagram-2.png
└── .git (可選)             ← 用戶可選擇是否版本控制
```

### 部落格專案（Astro/Hugo/...）

```
~/my-blog/                  ← 靜態網站專案
├── src/content/blog/
│   ├── article-1/
│   │   ├── index.md        ← 標準 Markdown（無 Wiki Links）
│   │   └── images/
│   │       └── screenshot-1.png
│   └── article-2/
│       └── index.md
└── .git                    ← 部落格的 Git 倉庫
```

**關鍵分離點**：
- 寫作時使用 Wiki Links → 自由
- 發布時轉換為標準 Markdown → 相容
- 圖片集中管理 → 發布時自動分配

---

## 🔌 Adapter 模式設計

### 核心介面

```typescript
// src/services/adapters/BlogAdapter.ts

export interface BlogAdapter {
  /** Adapter 名稱 */
  name: string

  /**
   * 轉換 Wiki Link 為該框架支援的格式
   * @param link - Wiki Link 文字（不含 [[]]）
   * @param displayText - 顯示文字（如果有 | 分隔）
   * @param allArticles - 所有文章列表（用於驗證連結存在）
   * @returns 轉換後的 Markdown 連結
   */
  convertWikiLink(
    link: string,
    displayText: string | null,
    allArticles: Article[]
  ): string

  /**
   * 轉換圖片引用為該框架支援的格式
   * @param imageName - 圖片檔名
   * @returns 轉換後的圖片語法
   */
  convertImageReference(imageName: string): string

  /**
   * 轉換 Frontmatter 為該框架要求的格式
   * @param frontmatter - 通用 Frontmatter
   * @returns 框架特定的 Frontmatter
   */
  convertFrontmatter(frontmatter: Frontmatter): Record<string, any>

  /**
   * 取得文章在部落格專案中的目標路徑
   * @param article - 文章資料
   * @param blogRepo - 部落格專案根目錄
   * @returns 完整的目標檔案路徑
   */
  getArticleTargetPath(article: Article, blogRepo: string): string

  /**
   * 取得圖片在部落格專案中的目標路徑
   * @param article - 所屬文章
   * @param imageName - 圖片檔名
   * @param blogRepo - 部落格專案根目錄
   * @returns 完整的目標圖片路徑
   */
  getImageTargetPath(
    article: Article,
    imageName: string,
    blogRepo: string
  ): string

  /**
   * 驗證部落格專案結構是否正確
   * @param blogRepo - 部落格專案根目錄
   * @returns 驗證結果
   */
  validateBlogStructure(blogRepo: string): Promise<ValidationResult>
}
```

### Astro Adapter 實作

```typescript
// src/services/adapters/AstroAdapter.ts

export class AstroAdapter implements BlogAdapter {
  name = 'Astro'

  convertWikiLink(
    link: string,
    displayText: string | null,
    allArticles: Article[]
  ): string {
    const slug = this.generateSlug(link)
    const text = displayText || link
    return `[${text}](../${slug}/)`
  }

  convertImageReference(imageName: string): string {
    return `![${imageName}](./images/${imageName})`
  }

  convertFrontmatter(fm: Frontmatter): Record<string, any> {
    return {
      title: fm.title,
      description: fm.description || '',
      pubDate: fm.pubDate,
      tags: fm.tags || [],
      // Astro 特定欄位
      draft: fm.status === 'draft',
      ...(fm.series && {
        series: fm.series,
        seriesOrder: fm.seriesOrder
      })
    }
  }

  getArticleTargetPath(article: Article, blogRepo: string): string {
    const slug = this.generateSlug(article.title)
    return path.join(blogRepo, 'src/content/blog', slug, 'index.md')
  }

  getImageTargetPath(
    article: Article,
    imageName: string,
    blogRepo: string
  ): string {
    const slug = this.generateSlug(article.title)
    return path.join(blogRepo, 'src/content/blog', slug, 'images', imageName)
  }

  async validateBlogStructure(blogRepo: string): Promise<ValidationResult> {
    const contentPath = path.join(blogRepo, 'src/content/blog')
    const exists = await fs.pathExists(contentPath)

    if (!exists) {
      return {
        valid: false,
        message: '找不到 src/content/blog 目錄，請確認是 Astro 專案'
      }
    }

    return { valid: true, message: 'Astro 專案結構正確' }
  }

  private generateSlug(title: string): string {
    // Slug 生成邏輯
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  }
}
```

### 未來擴展：Hugo Adapter

```typescript
// src/services/adapters/HugoAdapter.ts

export class HugoAdapter implements BlogAdapter {
  name = 'Hugo'

  convertWikiLink(link: string, displayText: string | null): string {
    const slug = this.generateSlug(link)
    const text = displayText || link
    // Hugo 使用絕對路徑
    return `[${text}](/${slug}/)`
  }

  convertImageReference(imageName: string): string {
    // Hugo 圖片放在 static/ 或使用 Page Resources
    return `![${imageName}](images/${imageName})`
  }

  getArticleTargetPath(article: Article, blogRepo: string): string {
    const slug = this.generateSlug(article.title)
    // Hugo 使用 content/posts/
    return path.join(blogRepo, 'content/posts', slug, 'index.md')
  }

  // ... 其他方法
}
```

---

## 🔄 轉換流程

### 完整發布流程

```typescript
// src/services/PublishService.ts

export class PublishService {
  constructor(
    private adapter: BlogAdapter,
    private converter: ConverterService,
    private git: GitService,
    private fileService: FileService
  ) {}

  async publish(
    article: Article,
    config: AppConfig
  ): Promise<PublishResult> {
    const steps: PublishStep[] = []

    try {
      // Step 1: 驗證
      steps.push({ name: '驗證設定', status: 'running' })
      await this.validateConfig(config)
      steps[0].status = 'completed'

      // Step 2: 轉換內容
      steps.push({ name: '轉換 Wiki Links', status: 'running' })
      const convertedContent = await this.convertContent(article)
      steps[1].status = 'completed'

      // Step 3: 處理圖片
      steps.push({ name: '複製圖片', status: 'running' })
      await this.processImages(article, config)
      steps[2].status = 'completed'

      // Step 4: 寫入部落格專案
      steps.push({ name: '寫入檔案', status: 'running' })
      const targetPath = this.adapter.getArticleTargetPath(
        article,
        config.paths.blogRepo
      )
      await this.fileService.writeFile(targetPath, convertedContent)
      steps[3].status = 'completed'

      // Step 5: Git 操作
      steps.push({ name: 'Git Commit', status: 'running' })
      await this.git.add(config.paths.blogRepo, ['.'])
      await this.git.commit(
        config.paths.blogRepo,
        `publish: ${article.title}`
      )
      steps[4].status = 'completed'

      steps.push({ name: 'Git Push', status: 'running' })
      await this.git.push(config.paths.blogRepo)
      steps[5].status = 'completed'

      return {
        success: true,
        steps,
        message: '發布成功！'
      }

    } catch (error) {
      return {
        success: false,
        steps,
        error: error instanceof Error ? error.message : '未知錯誤'
      }
    }
  }

  private async convertContent(article: Article): Promise<string> {
    let content = article.content

    // 轉換 Wiki Links
    content = this.convertWikiLinks(content)

    // 轉換圖片
    content = this.convertImages(content)

    // 轉換 Frontmatter
    const frontmatter = this.adapter.convertFrontmatter(article.frontmatter)

    // 組合最終內容
    return `---\n${yaml.stringify(frontmatter)}---\n\n${content}`
  }

  private convertWikiLinks(content: string): string {
    // 處理 [[link|display]] 格式
    content = content.replace(
      /\[\[([^|\]]+)\|([^\]]+)\]\]/g,
      (_, link, display) => this.adapter.convertWikiLink(link, display, this.articles)
    )

    // 處理 [[link]] 格式
    content = content.replace(
      /\[\[([^\]]+)\]\]/g,
      (_, link) => this.adapter.convertWikiLink(link, null, this.articles)
    )

    return content
  }

  private convertImages(content: string): string {
    return content.replace(
      /!\[\[([^\]]+)\]\]/g,
      (_, imageName) => this.adapter.convertImageReference(imageName)
    )
  }

  private async processImages(
    article: Article,
    config: AppConfig
  ): Promise<void> {
    // 提取所有圖片引用
    const imageRefs = this.extractImageReferences(article.content)

    for (const imageName of imageRefs) {
      const sourcePath = path.join(config.paths.imagesDir, imageName)
      const targetPath = this.adapter.getImageTargetPath(
        article,
        imageName,
        config.paths.blogRepo
      )

      // 複製圖片
      await this.fileService.copy(sourcePath, targetPath)
    }
  }
}
```

---

## 🔧 Git 自動化設計

### Git Service

```typescript
// src/services/GitService.ts

export class GitService {
  /**
   * 在指定倉庫執行 Git 操作
   */
  async executeInRepo<T>(
    repoPath: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const originalCwd = process.cwd()
    try {
      process.chdir(repoPath)
      return await operation()
    } finally {
      process.chdir(originalCwd)
    }
  }

  async add(repoPath: string, files: string[]): Promise<void> {
    await this.executeInRepo(repoPath, async () => {
      const git = simpleGit()
      await git.add(files)
    })
  }

  async commit(repoPath: string, message: string): Promise<void> {
    await this.executeInRepo(repoPath, async () => {
      const git = simpleGit()
      await git.commit(message)
    })
  }

  async push(repoPath: string, remote = 'origin', branch?: string): Promise<void> {
    await this.executeInRepo(repoPath, async () => {
      const git = simpleGit()

      // 如果沒指定 branch，使用當前分支
      if (!branch) {
        const status = await git.status()
        branch = status.current
      }

      await git.push(remote, branch)
    })
  }

  async getStatus(repoPath: string): Promise<GitStatus> {
    return await this.executeInRepo(repoPath, async () => {
      const git = simpleGit()
      const status = await git.status()

      return {
        current: status.current,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        isClean: status.isClean()
      }
    })
  }

  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    const status = await this.getStatus(repoPath)
    return !status.isClean
  }
}
```

### 錯誤處理與回滾

```typescript
// src/services/PublishService.ts

async publish(article: Article, config: AppConfig): Promise<PublishResult> {
  const backup = await this.createBackup(config.paths.blogRepo)

  try {
    await this.performPublish(article, config)
    return { success: true }
  } catch (error) {
    // 發生錯誤時回滾
    await this.rollback(backup)
    throw error
  }
}

private async createBackup(blogRepo: string): Promise<Backup> {
  // 記錄目前的 Git 狀態
  const status = await this.git.getStatus(blogRepo)
  return {
    repoPath: blogRepo,
    originalStatus: status
  }
}

private async rollback(backup: Backup): Promise<void> {
  // 如果有未提交的變更，復原它們
  await this.git.executeInRepo(backup.repoPath, async () => {
    const git = simpleGit()
    await git.reset(['--hard'])
  })
}
```

---

## 🎨 UI 層設計

### 發布按鈕與進度顯示

```vue
<!-- src/components/PublishButton.vue -->

<template>
  <div>
    <button
      @click="handlePublish"
      :disabled="isPublishing"
      class="btn btn-primary"
    >
      <Upload v-if="!isPublishing" :size="16" />
      <Loader v-else :size="16" class="animate-spin" />
      {{ isPublishing ? '發布中...' : '發布到部落格' }}
    </button>

    <!-- 發布進度 Modal -->
    <div v-if="showProgress" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg">發布進度</h3>

        <div class="space-y-2 mt-4">
          <div
            v-for="step in publishSteps"
            :key="step.name"
            class="flex items-center gap-2"
          >
            <Check v-if="step.status === 'completed'" class="text-success" />
            <Loader v-else-if="step.status === 'running'" class="animate-spin" />
            <Circle v-else class="text-base-content/30" />
            <span>{{ step.name }}</span>
          </div>
        </div>

        <div v-if="publishError" class="alert alert-error mt-4">
          {{ publishError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useArticleStore } from '@/stores/article'
import { useConfigStore } from '@/stores/config'
import { publishService } from '@/services'

const articleStore = useArticleStore()
const configStore = useConfigStore()

const isPublishing = ref(false)
const showProgress = ref(false)
const publishSteps = ref<PublishStep[]>([])
const publishError = ref<string>()

async function handlePublish() {
  const currentArticle = articleStore.currentArticle
  if (!currentArticle) return

  isPublishing.value = true
  showProgress.value = true
  publishError.value = undefined

  try {
    const result = await publishService.publish(
      currentArticle,
      configStore.config
    )

    publishSteps.value = result.steps

    if (!result.success) {
      publishError.value = result.error || '發布失敗'
    } else {
      // 成功提示
      setTimeout(() => {
        showProgress.value = false
      }, 2000)
    }
  } catch (error) {
    publishError.value = error instanceof Error
      ? error.message
      : '未知錯誤'
  } finally {
    isPublishing.value = false
  }
}
</script>
```

---

## 📊 配置管理

### 新的配置結構

```typescript
// src/types/index.ts

export interface AppConfig {
  // 路徑設定
  paths: {
    /** 文章目錄（用戶的 Markdown 文章存放位置） */
    contentDir: string

    /** 部落格專案路徑（Git 倉庫） */
    blogRepo: string

    /** 圖片目錄（預設為 contentDir/images） */
    imagesDir: string
  }

  // 部落格設定
  blog: {
    /** 部落格類型 */
    type: 'astro' | 'hugo' | 'hexo' | 'jekyll' | 'custom'

    /** 自訂設定（當 type 為 custom 時使用） */
    custom?: {
      contentPath: string      // 部落格內容目錄（相對於 blogRepo）
      imagePath: string        // 圖片路徑格式
      linkFormat: string       // 連結格式（支援變數）
    }
  }

  // Git 設定
  git: {
    /** 是否自動 commit */
    autoCommit: boolean

    /** 是否自動 push */
    autoPush: boolean

    /** Commit message 模板 */
    commitTemplate: string  // 預設: "publish: {title}"

    /** 遠端倉庫名稱 */
    remote: string  // 預設: "origin"
  }

  // 編輯器設定
  editorConfig: {
    autoSave: boolean
    autoSaveInterval: number
    theme: 'light' | 'dark'
  }
}
```

### 配置遷移

```typescript
// src/services/ConfigMigration.ts

export class ConfigMigration {
  /**
   * 從舊版配置遷移到新版
   */
  migrate(oldConfig: any): AppConfig {
    return {
      paths: {
        contentDir: oldConfig.paths?.obsidianVault || '',
        blogRepo: oldConfig.paths?.targetBlog || '',
        imagesDir: oldConfig.paths?.imagesDir || ''
      },
      blog: {
        type: 'astro',  // 預設為 Astro
        custom: undefined
      },
      git: {
        autoCommit: true,
        autoPush: true,
        commitTemplate: 'publish: {title}',
        remote: 'origin'
      },
      editorConfig: oldConfig.editorConfig || {
        autoSave: true,
        autoSaveInterval: 30000,
        theme: 'light'
      }
    }
  }
}
```

---

## 🧪 測試策略

### 單元測試

```typescript
// src/services/adapters/__tests__/AstroAdapter.spec.ts

describe('AstroAdapter', () => {
  let adapter: AstroAdapter

  beforeEach(() => {
    adapter = new AstroAdapter()
  })

  describe('convertWikiLink', () => {
    it('should convert simple wiki link', () => {
      const result = adapter.convertWikiLink('My Article', null, [])
      expect(result).toBe('[My Article](../my-article/)')
    })

    it('should convert wiki link with display text', () => {
      const result = adapter.convertWikiLink('My Article', 'Read this', [])
      expect(result).toBe('[Read this](../my-article/)')
    })
  })

  describe('convertImageReference', () => {
    it('should convert image reference', () => {
      const result = adapter.convertImageReference('screenshot.png')
      expect(result).toBe('![screenshot.png](./images/screenshot.png)')
    })
  })
})
```

### 整合測試

```typescript
// src/services/__tests__/PublishService.integration.spec.ts

describe('PublishService Integration', () => {
  it('should publish article successfully', async () => {
    // 設定測試環境
    const testArticle = createTestArticle()
    const testConfig = createTestConfig()

    // 執行發布
    const result = await publishService.publish(testArticle, testConfig)

    // 驗證結果
    expect(result.success).toBe(true)

    // 驗證檔案已複製
    const targetFile = path.join(
      testConfig.paths.blogRepo,
      'src/content/blog',
      'test-article',
      'index.md'
    )
    expect(await fs.pathExists(targetFile)).toBe(true)

    // 驗證內容已轉換
    const content = await fs.readFile(targetFile, 'utf-8')
    expect(content).not.toContain('[[')  // Wiki Links 已轉換
  })
})
```

---

## 📝 總結

### 設計原則

1. **分離關注點**：文章庫與部落格專案分離
2. **可擴展性**：Adapter 模式支援多框架
3. **自動化**：Git 操作全自動
4. **錯誤處理**：完善的回滾機制
5. **測試友善**：依賴注入，易於測試

### 技術棧

- **前端**：Vue 3 + TypeScript
- **狀態管理**：Pinia
- **Git 操作**：simple-git
- **檔案系統**：fs-extra
- **Markdown**：markdown-it (現有)

### 未來擴展

- [ ] Hugo Adapter
- [ ] Hexo Adapter
- [ ] Jekyll Adapter
- [ ] 自訂 Adapter（用戶可配置）
- [ ] 發布預覽（顯示將要提交的變更）
- [ ] 發布歷史記錄
- [ ] 批量發布
