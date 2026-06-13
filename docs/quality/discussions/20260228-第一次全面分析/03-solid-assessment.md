---
title: "WriteFlow SOLID 原則評估報告"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-02-28
source_of_truth: false
---

# WriteFlow SOLID 原則評估報告

**評估日期：** 2026-02-28
**評估者：** 🏗️ Charlie（資深軟體架構師 — SOLID / OOP 專項）
**評估版本：** 現有 `src/services/` 全體服務層

---

## 執行摘要

| 原則 | 評分 | 等級 |
|------|------|------|
| **S** — 單一職責（SRP） | 6 / 10 | ⚠️ 中等 |
| **O** — 開放封閉（OCP） | 5 / 10 | ⚠️ 待改善 |
| **L** — 里氏替換（LSP） | 8 / 10 | ✅ 良好 |
| **I** — 介面隔離（ISP） | 6 / 10 | ⚠️ 中等 |
| **D** — 依賴反轉（DIP） | 5 / 10 | ⚠️ 待改善 |
| **整體 SOLID 評分** | **60 / 100** | ⚠️ 中等 |

---

## S — 單一職責原則（SRP）｜評分：6/10

### 🔴 違反案例 1：`ConverterService` — 「萬能轉換器」

`ConverterService` 同時承擔了至少 **5 個不同職責**：

```typescript
// 1. Markdown 語法轉換（Wiki 連結）
private convertWikiLinks(content: string): string { ... }

// 2. 圖片複製與路徑管理
private async copyImageFile(sourcePath: string, targetPath: string): Promise<void> {
  await (window.electronAPI as any).copyFile(sourcePath, targetPath) // 直接呼叫 Electron！
}

// 3. 路徑工具函式
private joinPath(...paths: string[]): string { ... }
private getDirname(filePath: string): string { ... }

// 4. 檔案存在性檢查（繞過 IFileSystem 抽象！）
private async fileExists(path: string): Promise<boolean> {
  const stats = await (window.electronAPI as any).getFileStats(path) // 違反 DIP
}

// 5. 轉換結果驗證
async validateConversionResult(targetDir: string, article: Article): Promise<...> { ... }
```

#### ✅ 重構建議：拆分為 3 個職責單一的類別

```typescript
// 1. 純語法轉換（無副作用）
export class MarkdownSyntaxTransformer {
  transform(content: string): string {
    return [
      this.convertWikiLinks.bind(this),
      this.convertHighlightSyntax.bind(this),
      this.convertObsidianImages.bind(this),
    ].reduce((c, fn) => fn(c), content)
  }
}

// 2. 圖片處理（依賴 IFileSystem）
export class ImageProcessor {
  constructor(private fileSystem: IFileSystem) {}
  async processImages(content: string, config: ImageProcessConfig): Promise<{
    content: string; warnings: Warning[]
  }> { ... }
}

// 3. 轉換協調器（只負責協調）
export class ConverterService {
  constructor(
    private transformer: MarkdownSyntaxTransformer,
    private imageProcessor: ImageProcessor,
    private fileSystem: IFileSystem,
  ) {}
}
```

---

### 🔴 違反案例 2：`FileScannerService` — 職責重疊

`FileScannerService` 同時承擔**檔案掃描**和**檔案監控**兩個職責（重複了 `FileWatchService` 的功能），且 `generateSlug` 在三個地方有重複實作：

| 檔案 | 方法名 | 差異 |
|------|--------|------|
| `ArticleService.ts` | `generateSlug()` | 有 `trim()` |
| `FileScannerService.ts` | `private generateSlug()` | `trim()` 位置不同 |
| `MarkdownService.ts` | `generateSlugFromTitle()` | 略有差異 |

#### ✅ 重構建議：統一至 `SlugGenerator`

```typescript
// src/utils/slugUtils.ts
export function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

---

### 🔴 違反案例 3：`article.ts` Store — 商業邏輯大雜燴

```typescript
// article.ts store 中直接包含：
async function setupFileWatching(vaultPath: string) { ... } // 應屬 FileWatchService
async function handleFileChangeEvent(event) { ... }         // 應屬事件協調層
async function reloadArticleFromDisk(filePath, ...) { ... } // 應屬 ArticleService
function parseArticlePath(filePath, vaultPath) { ... }      // 路徑解析業務邏輯
function migrateArticleFrontmatter(article) { ... }         // frontmatter 遷移邏輯
```

---

### ✅ 符合 SRP 的良好設計

- **`FileWatchService`** — 職責純粹，只負責監聽和去抖
- **`NotificationService`** — 職責非常純粹
- **`BackupService`** — 職責清晰（備份、還原、衝突偵測）
- **`ElectronFileSystem`** — 純適配器

---

## O — 開放封閉原則（OCP）｜評分：5/10

### 🔴 違反案例 1：`ConverterService.convertMarkdownContent` — 不可延伸的轉換管線

```typescript
private convertMarkdownContent(content: string): string {
  let converted = content
  converted = this.convertWikiLinks(converted)        // 硬編碼步驟 1
  converted = this.convertHighlightSyntax(converted)  // 硬編碼步驟 2
  converted = this.convertObsidianImages(converted)   // 硬編碼步驟 3
  converted = this.rewriteImagePaths(converted)       // 硬編碼步驟 4
  converted = this.removeObsidianComments(converted)  // 硬編碼步驟 5
  converted = this.convertObsidianTags(converted)     // 硬編碼步驟 6
  converted = this.convertInternalLinks(converted)    // 硬編碼步驟 7
  return converted
}
```

新增「Callout 轉換步驟」必須**修改既有方法**，違反 OCP。

#### ✅ 重構建議：策略模式（Strategy Pattern）

```typescript
export interface IContentTransformer {
  readonly name: string
  readonly priority: number
  transform(content: string, context: TransformContext): string
}

export class TransformPipeline {
  private transformers: IContentTransformer[] = []

  register(transformer: IContentTransformer): this {
    this.transformers.push(transformer)
    this.transformers.sort((a, b) => a.priority - b.priority)
    return this
  }

  execute(content: string, context: TransformContext): string {
    return this.transformers.reduce(
      (c, transformer) => transformer.transform(c, context),
      content
    )
  }
}

// 未來新增 Callout 轉換，不改舊碼：
export class CalloutTransformer implements IContentTransformer {
  readonly name = 'callout'
  readonly priority = 20
  transform(content: string): string { ... }
}
```

---

### 🔴 違反案例 2：`FileScannerService.extractCategoryFromPath` — 硬編碼分類

```typescript
private extractCategoryFromPath(filePath: string): ArticleCategory {
  if (normalizedPath.includes('/Software/')) return ArticleCategory.Software
  if (normalizedPath.includes('/growth/'))   return ArticleCategory.Growth
  if (normalizedPath.includes('/management/')) return ArticleCategory.Management
  return ArticleCategory.Software  // 預設永遠是 Software
}
```

#### ✅ 重構建議：資料驅動

```typescript
export class CategoryResolver {
  constructor(private readonly categoryMap = new Map<string, ArticleCategory>([
    ['Software', ArticleCategory.Software],
    ['growth', ArticleCategory.Growth],
    ['management', ArticleCategory.Management],
  ])) {}

  resolve(filePath: string): ArticleCategory {
    const normalized = filePath.replace(/\\/g, '/')
    for (const [folder, category] of this.categoryMap) {
      if (normalized.includes(`/${folder}/`)) return category
    }
    return ArticleCategory.Software
  }
}
```

---

## L — 里氏替換原則（LSP）｜評分：8/10

### ✅ 符合 LSP 的良好實作

`ElectronFileSystem` 正確實作 `IFileSystem`，所有方法皆忠實履行契約：

```typescript
export class ElectronFileSystem implements IFileSystem {
  async readFile(path: string): Promise<string> {
    this.ensureElectronAPI()
    return await window.electronAPI.readFile(path)  // ✅ 型別契約正確
  }
}
```

### 🟡 違反案例：`BackupService.createBackup` 回傳型別不一致

```typescript
// 宣告為 void，但 ArticleService 卻使用 await
createBackup(article: Article): void { ... }
await this.backupService.createBackup(article) // await void → 語意混亂
```

### 🔴 型別安全漏洞：`AutoSaveService.destroy()` 型別錯誤

```typescript
this.lastSavedFrontmatter = "" // ❌ 宣告為 Partial<Frontmatter>，卻賦值為空字串
// 應改為：
this.lastSavedFrontmatter = {}  // ✅ 正確的空 Partial<Frontmatter>
```

---

## I — 介面隔離原則（ISP）｜評分：6/10

### ✅ 良好設計：`IFileSystem` 介面精煉

7 個方法皆有必要，無臃腫問題。✅

### 🔴 違反案例 1：缺乏服務介面——依賴完整具體類別

多數服務（`AutoSaveService`、`PreviewService`、`ImageService`）**沒有對應的介面**。

#### ✅ 重構建議：依角色拆分介面

```typescript
export interface ISaveTriggerable {
  markAsModified(): void
  saveCurrentArticle(): Promise<void>
}

export interface ISaveStateProvider {
  readonly saveState: Ref<SaveState>
  hasUnsavedChanges(): boolean
}

export interface IAutoSaveManager extends ISaveTriggerable, ISaveStateProvider {
  initialize(...): void
  setEnabled(enabled: boolean): void
  destroy(): void
}
```

### 🔴 違反案例 2：`ObsidianSyntaxService` 混入 DOM 操作

```typescript
export class ObsidianSyntaxService {
  // 純業務邏輯（正確）
  getAutocompleteSuggestions(context: AutocompleteContext): SuggestionItem[] { ... }

  // UI/DOM 操作（不應在 Service 中）
  calculateDropdownPosition(textarea: HTMLTextAreaElement, ...): { top: number; left: number } { ... }
}
```

---

## D — 依賴反轉原則（DIP）｜評分：5/10

### ✅ 良好設計：`ArticleService` 依賴注入

```typescript
export class ArticleService {
  constructor(
    fileSystem?: IFileSystem,     // ✅ 依賴介面
    markdownService?: MarkdownService,
    backupService?: BackupService,
  ) {
    this.fileSystem = fileSystem || electronFileSystem
  }
}
```

### 🔴 違反案例 1：`ConverterService` 直接耦合 `window.electronAPI`

```typescript
// 透過 IFileSystem 讀寫文章（正確）
private fileSystem: IFileSystem

// 但圖片複製和檔案存在檢查直接繞過抽象！
private async copyImageFile(...): Promise<void> {
  await (window.electronAPI as any).copyFile(...)  // ❌ 直接呼叫 Electron
}
private async fileExists(path: string): Promise<boolean> {
  const stats = await (window.electronAPI as any).getFileStats(path)  // ❌
}
```

#### ✅ 修復：擴充 `IFileSystem` 介面

```typescript
export interface IFileSystem {
  // ... 現有方法
  copyFile(sourcePath: string, targetPath: string): Promise<void>  // 新增
}

// ConverterService 使用注入的介面
private async copyImageFile(s: string, t: string): Promise<void> {
  await this.fileSystem.copyFile(s, t)  // ✅
}
```

### 🔴 違反案例 2：`ImageService` 完全沒使用 `IFileSystem`

```typescript
export class ImageService {
  // ❌ 沒有 IFileSystem 依賴！

  async loadImages(): Promise<ImageInfo[]> {
    const stats = await (window.electronAPI as any).getFileStats(imagesPath) // 直接
    const files = await window.electronAPI.readDirectory(imagesPath)         // 直接
  }
}
```

### 🔴 違反案例 3：`PreviewService` 自己 `new MarkdownService()`

```typescript
export class PreviewService {
  constructor() {
    this.markdownService = new MarkdownService()  // ❌ 自己 new，無法替換
  }
}
```

---

## 優先重構清單

### 🔴 P0 — 立即修正（型別錯誤 + 安全漏洞）

1. `AutoSaveService.destroy()` — 修正 `lastSavedFrontmatter = ""` → `{}` （5 分鐘）
2. `ConverterService.fileExists()` — 改用 `this.fileSystem.exists()` （30 分鐘）
3. `ConverterService.copyImageFile()` — 擴充 `IFileSystem.copyFile()` （1 小時）

### 🟠 P1 — 近期重構（架構改善）

4. `ImageService` 全面注入 `IFileSystem` — 移除所有 `window.electronAPI` 直接呼叫（2 小時）
5. `PreviewService` 改用建構子注入（1 小時）
6. 統一 slug 產生邏輯至 `SlugGenerator`（1 小時）

### 🟡 P2 — 中期重構（OCP 改善）

7. `ConverterService` 引入 `IContentTransformer` 策略介面（1 天）
8. `FileScannerService` 移除 chokidar 監控方法（半天）
9. `CategoryResolver` 資料驅動化（2 小時）

### 🔵 P3 — 長期優化（ISP 介面設計）

10. 為主要服務定義介面（`IAutoSaveManager`、`IImageService`、`IPreviewService`）（2 天）
11. 拆分 `ObsidianSyntaxService` DOM 操作至 UI 層（半天）
12. `FrontmatterValidator` 解耦為規格模式（1 天）

---

> **結語：** WriteFlow 整體服務架構有清晰的設計意圖，`IFileSystem` 介面、`ArticleService` 的依賴注入、服務分層結構皆展現了良好的 SOLID 意識。主要的改善空間集中在：`ConverterService` 的職責過重與 DIP 繞過、`ImageService` 完全沒有使用抽象層，以及多處 Obsidian 語法處理邏輯的重複。
