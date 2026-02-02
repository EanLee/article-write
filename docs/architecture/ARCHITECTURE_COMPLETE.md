# 系統架構完整文件

> **版本**: 2.0
> **最後更新**: 2026-02-02
> **狀態**: 整合文件（合併 ARCHITECTURE.md + ARCHITECTURE_ANALYSIS.md）

---

## 📑 文件導覽

- [理想架構設計](#理想架構設計)
- [現狀問題分析](#現狀問題分析)
- [重構路線圖](#重構路線圖)

---

# 理想架構設計

> 基於 PRODUCT_SPEC.md 的技術架構藍圖

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

## 🔌 Adapter 模式設計

### 核心介面

```typescript
// src/services/adapters/BlogAdapter.ts

export interface BlogAdapter {
  /** Adapter 名稱 */
  name: string

  /**
   * 轉換 Wiki Link 為該框架支援的格式
   */
  convertWikiLink(
    link: string,
    displayText: string | null,
    allArticles: Article[]
  ): string

  /**
   * 轉換圖片引用為該框架支援的格式
   */
  convertImageReference(imageName: string): string

  /**
   * 轉換 Frontmatter 為該框架要求的格式
   */
  convertFrontmatter(frontmatter: Frontmatter): Record<string, any>

  /**
   * 取得文章在部落格專案中的目標路徑
   */
  getArticleTargetPath(article: Article, blogRepo: string): string

  /**
   * 取得圖片在部落格專案中的目標路徑
   */
  getImageTargetPath(
    article: Article,
    imageName: string,
    blogRepo: string
  ): string

  /**
   * 驗證部落格專案結構是否正確
   */
  validateBlogStructure(blogRepo: string): Promise<ValidationResult>
}
```

*完整的 Adapter 實作細節請參考原 ARCHITECTURE.md*

---

# 現狀問題分析

> **警告**: 目前實作存在嚴重的過度設計問題

## 📋 目前的服務清單

### 檔案相關 Services (11個)

1. **FileService.ts** - 基礎檔案操作
2. **ArticleService.ts** - 文章 CRUD + 備份 + 衝突檢測
3. **AutoSaveService.ts** - 自動儲存邏輯
4. **BackupService.ts** - 備份管理
5. **MarkdownService.ts** - Markdown 解析
6. **FileScannerService.ts** - 檔案掃描
7. **ObsidianSyntaxService.ts** - Obsidian 語法處理
8. **PreviewService.ts** - 預覽渲染
9. **ImageService.ts** - 圖片處理
10. **ConverterService.ts** - 格式轉換
11. **NotificationService.ts** - 通知（跨功能）

## 🔥 核心問題

### 1. 違反單一職責原則

**ArticleService** 做了太多事：
- 檔案讀取、寫入、刪除、移動
- 衝突檢測
- 備份管理

**Article Store** 也做了太多事：
- 狀態管理
- 商業邏輯
- 檔案監聽
- 檔案操作

### 2. 責任重疊

| 功能 | 實作位置 | 重複次數 |
|------|---------|---------|
| 檔案讀取 | FileService, ArticleService, Store | 3次 |
| 檔案寫入 | FileService, ArticleService, Store | 3次 |
| 備份 | BackupService, ArticleService | 2次 |
| Markdown 解析 | MarkdownService, Store | 2次 |

### 3. 調用鏈過長

**儲存文章的調用鏈有 12 層之多**，導致：
- 效能問題
- 難以除錯
- 重複觸發響應式更新
- 檔案監聽造成列表跳動

---

# 重構路線圖

## 💡 理想的分層架構

```
┌─────────────────────────────────────┐
│  UI Layer (Vue Components)          │
│  - 只負責渲染和用戶互動               │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Store Layer (Pinia)                 │
│  - 只負責狀態管理                     │
│  - 不包含商業邏輯                     │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Service Layer (Business Logic)      │
│  - ArticleService: 文章 CRUD         │
│  - FileWatchService: 檔案監聽         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Infrastructure Layer                │
│  - FileSystem: 檔案操作               │
│  - Markdown Parser: 解析              │
└─────────────────────────────────────┘
```

## 🔧 重構階段

### 階段 1：合併重複服務（緊急）

1. 移除 FileService
2. 移除 useServices.ts
3. BackupService 併入 ArticleService

### 階段 2：職責分離（重要）

1. 將 Store 中的商業邏輯移到 Service
2. 簡化 AutoSaveService
3. 獨立 FileWatchService

### 階段 3：統一入口（中期）

1. 所有檔案操作透過 ArticleService
2. Store 只調用 Service
3. 移除重複的 Markdown 解析

---

## 📝 總結

### 設計原則

1. **分離關注點**：文章庫與部落格專案分離
2. **可擴展性**：Adapter 模式支援多框架
3. **單一職責**：每個 Service 只做一件事
4. **測試友善**：依賴注入，易於測試

### 技術棧

- **前端**：Vue 3 + TypeScript
- **狀態管理**：Pinia
- **Git 操作**：simple-git
- **檔案系統**：fs-extra
- **Markdown**：markdown-it

### 未來擴展

- [ ] 多框架支援（Hugo, Hexo, Jekyll）
- [ ] Git 自動化
- [ ] 發布預覽
- [ ] 批量發布

---

**參考文件**：
- [PRODUCT_SPEC.md](../analysis/PRODUCT_SPEC.md)
- [REFACTORING_PLAN.md](../planning/REFACTORING_PLAN.md)
- [SOLID_ANALYSIS.md](./SOLID_ANALYSIS.md)
