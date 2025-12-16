# 設計文件

## 概述

部落格撰寫應用程式是一個基於 Electron + Vue3 + TypeScript 的桌面應用程式，旨在提供完整的 Obsidian 到 Astro 部落格發布工作流程。應用程式採用現代化的前端架構，結合檔案系統操作、AI API 整合和即時預覽功能。

## 架構

### 整體架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   File System   │  │   Process Mgmt  │  │   Config Mgmt   │ │
│  │    Manager      │  │    (Astro Dev)  │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ IPC
                                │
┌─────────────────────────────────────────────────────────────┐
│                  Electron Renderer Process                  │
│                        (Vue3 App)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Article Mgmt  │  │   Editor View   │  │   Preview View  │ │
│  │   Component     │  │   Component     │  │   Component     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Frontmatter   │  │   AI Service    │  │   Converter     │ │
│  │   Editor        │  │   Integration   │  │   Service       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 技術堆疊

- **前端框架**: Vue 3 (Composition API)
- **類型系統**: TypeScript
- **桌面框架**: Electron
- **UI 框架**: Element Plus / Naive UI
- **狀態管理**: Pinia
- **Markdown 處理**: markdown-it + 擴充套件
- **程式碼高亮**: Prism.js / highlight.js
- **檔案監控**: chokidar
- **AI API**: OpenAI API / Claude API

## 元件和介面

### 主要元件架構

```
App.vue
├── Layout/
│   ├── Sidebar.vue (文章清單)
│   ├── MainEditor.vue (編輯區域)
│   └── PreviewPane.vue (預覽區域)
├── Components/
│   ├── ArticleList.vue
│   ├── FrontmatterEditor.vue
│   ├── MarkdownEditor.vue
│   ├── ImageManager.vue
│   ├── AIAssistant.vue
│   └── SettingsPanel.vue
└── Services/
    ├── FileService.ts
    ├── ConverterService.ts
    ├── AIService.ts
    ├── PreviewService.ts
    └── ConfigService.ts
```

### 核心介面定義

```typescript
// 文章資料結構
interface Article {
  id: string;
  title: string;
  slug: string;
  filePath: string;
  status: 'draft' | 'published';
  frontmatter: Frontmatter;
  content: string;
  lastModified: Date;
  category: 'Software' | 'growth' | 'management';
}

// 前置資料結構
interface Frontmatter {
  title: string;
  description?: string;
  date: string;
  lastmod?: string;
  tags: string[];
  categories: string[];
  slug?: string;
  keywords?: string[];
}

// 轉換設定
interface ConversionConfig {
  sourceDir: string;
  targetDir: string;
  imageSourceDir: string;
  preserveStructure: boolean;
}

// AI 服務回應
interface AIResponse {
  suggestions: string[];
  seoRecommendations: SEORecommendation[];
  proofreadingResults: ProofreadingResult[];
}
```

## 資料模型

### 檔案系統結構

```
obsidian-vault/
├── publish/
│   ├── Software/
│   ├── growth/
│   └── management/
├── draft/
└── images/

target-blog/
└── src/content/blog/
    ├── Software/
    │   └── {slug}/
    │       ├── index.md
    │       └── images/
    ├── growth/
    └── management/
```

### 狀態管理 (Pinia Stores)

```typescript
// 文章管理 Store
export const useArticleStore = defineStore('article', {
  state: () => ({
    articles: [] as Article[],
    currentArticle: null as Article | null,
    filter: {
      status: 'all' as 'all' | 'draft' | 'published',
      category: 'all' as 'all' | 'Software' | 'growth' | 'management',
      tags: [] as string[]
    }
  }),
  
  actions: {
    async loadArticles(),
    async createArticle(title: string, category: string),
    async updateArticle(article: Article),
    async deleteArticle(id: string),
    async moveToPublished(id: string)
  }
});

// 設定管理 Store
export const useConfigStore = defineStore('config', {
  state: () => ({
    paths: {
      obsidianVault: '',
      targetBlog: '',
      imagesDir: ''
    },
    aiConfig: {
      apiKey: '',
      model: 'gpt-4',
      endpoint: ''
    },
    editorConfig: {
      autoSave: true,
      autoSaveInterval: 30000,
      theme: 'light'
    }
  })
});
```

## 正確性屬性

*屬性是一個特徵或行為，應該在系統的所有有效執行中保持為真——本質上是關於系統應該做什麼的正式陳述。屬性作為人類可讀規範和機器可驗證正確性保證之間的橋樑。*

### 屬性 1: 檔案操作一致性

*對於任何*文章操作（建立、更新、刪除），檔案系統狀態應該與應用程式內部狀態保持一致
**驗證需求: 需求 1.2, 1.4, 1.5**

### 屬性 2: Frontmatter 完整性

*對於任何*儲存的文章，其 frontmatter 應該包含所有必要欄位且格式正確
**驗證需求: 需求 2.1, 2.3, 2.6**

### 屬性 3: 網址代稱唯一性

*對於任何*產生的 slug，在相同分類中應該是唯一的
**驗證需求: 需求 2.4, 2.5**

### 屬性 4: 轉換往返一致性

*對於任何*有效的 Obsidian 格式文章，轉換為 Astro 格式後應該保持內容語義不變
**驗證需求: 需求 4.2, 4.3, 4.4**

### 屬性 5: 圖片引用完整性

*對於任何*文章中的圖片引用，轉換後的圖片檔案應該存在於正確位置
**驗證需求: 需求 4.5, 需求 9.3**

### 屬性 6: 自動儲存可靠性

*對於任何*編輯操作，在指定時間間隔內應該自動儲存且不遺失資料
**驗證需求: 需求 10.1, 10.2**

### 屬性 7: AI API 錯誤處理

*對於任何*AI API 呼叫失敗，應用程式應該優雅處理錯誤且不影響其他功能
**驗證需求: 需求 7.5**

## 錯誤處理

### 檔案系統錯誤

- 檔案不存在或無法存取
- 磁碟空間不足
- 權限不足
- 檔案被其他程序鎖定

### 轉換錯誤

- 無效的 Markdown 語法
- 圖片檔案遺失
- 前置資料格式錯誤
- 目標目錄無法寫入

### AI API 錯誤

- 網路連線問題
- API 金鑰無效
- 請求限制超出
- 回應格式錯誤

### 使用者介面錯誤

- 表單驗證失敗
- 不支援的檔案格式
- 記憶體不足導致的渲染問題

## 測試策略

### 單元測試

- 檔案操作服務測試
- Markdown 轉換邏輯測試
- 前置資料解析和生成測試
- AI API 整合測試（使用 mock）

### 屬性基礎測試

使用 fast-check 進行屬性基礎測試，每個測試執行最少 100 次迭代：

- **屬性 1 測試**: 隨機生成文章操作序列，驗證檔案系統一致性
- **屬性 2 測試**: 隨機生成 frontmatter 資料，驗證格式完整性  
- **屬性 3 測試**: 隨機生成標題，驗證 slug 唯一性
- **屬性 4 測試**: 隨機生成 Obsidian 格式內容，驗證轉換一致性
- **屬性 5 測試**: 隨機生成圖片引用，驗證轉換後檔案存在
- **屬性 6 測試**: 隨機編輯操作，驗證自動儲存可靠性
- **屬性 7 測試**: 模擬 API 失敗情況，驗證錯誤處理

### 整合測試

- 完整的文章建立到發布流程
- Electron 主程序與渲染程序通訊
- 檔案監控和自動重新載入
- Astro 開發伺服器啟動和管理

### 端對端測試

- 使用 Playwright 進行完整使用者流程測試
- 跨平台相容性測試（Windows、macOS、Linux）
- 效能測試（大量文章處理）
