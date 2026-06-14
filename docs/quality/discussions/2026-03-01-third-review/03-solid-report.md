---
title: "SOLID 原則評估報告 — 第三次全面評估"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-03-01
source_of_truth: false
---

# SOLID 原則評估報告 — 第三次全面評估

**審查者**: SOLID 架構師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦五大 SOLID 原則的遵循程度

---

## 執行摘要

第二次 review 後，ArticleService 的依賴注入重構（Refactor-07）顯著改善了 DIP 遵循度，IFileSystem 介面設計正確。然而 `article.ts` store 中存在 **重大的 SRP 違反** 與 **DRY 破壞**（ID 生成邏輯重複），以及 **硬編碼常數違反 OCP**。

---

## 總分評估

| 原則 | 第二次評分 | 第三次評分 | 趨勢 |
|------|-----------|-----------|------|
| SRP 單一職責 | 7/10 | 6/10 | ⬇️ （store 過重）|
| OCP 開放封閉 | 8/10 | 7/10 | ⬇️ （硬編碼文字）|
| LSP 里氏替換 | 9/10 | 9/10 | ➡️ |
| ISP 介面隔離 | 8/10 | 8/10 | ➡️ |
| DIP 依賴反轉 | 9/10 | 9/10 | ➡️ （fix 成果維持）|

---

## S — 單一職責原則（SRP）

### 違反 SOLID-01 🔴 `article.ts` store 職責過多

`src/stores/article.ts` 目前承擔：
1. **文章狀態管理** — 符合 store 原始職責
2. **ID 生成邏輯** — `createArticle()` 內聯 `Date.now().toString(36) + Math.random()`
3. **檔案監聽訂閱管理** — `setupFileWatching()`
4. **前言遷移邏輯** — `migrateArticleFrontmatter()`
5. **自動儲存生命週期** — `initializeAutoSave()`
6. **路徑解析邏輯** — `parseArticlePath()`

這是六個不同的「改變原因」，清楚違反 SRP。

**ID 生成問題（最嚴重）**:

```typescript
// article.ts createArticle() — 內聯非確定性 ID
const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

// ArticleService.generateId() — SHA-256 確定性 ID（Refactor-06 成果）
static generateId(filePath: string): string {
  return sha256(filePath).slice(0, 16);
}
```

兩套 ID 生成策略並存：
- store 的 `createArticle()` 生成隨機 ID
- `ArticleService.generateId()` 生成路徑導出的確定性 ID

這不只是 SRP 問題，也是 **DRY 原則違反**，可能導致衝突、重複或不一致的 ID 格式。

**修正方向**:
```typescript
// article.ts 應委派 ID 生成
async function createArticle(params: CreateArticleParams) {
  const id = ArticleService.generateId(params.filePath); // 委派給專責服務
  // ...
}
```

### 遵循良好的 SRP 案例

| 類別 | 評分 | 說明 |
|------|------|------|
| `AutoSaveService` | ✅ 9/10 | 專注自動儲存，單一職責 |
| `BackupService` | ✅ 9/10 | 專注備份，清晰邊界 |
| `MarkdownService` | ✅ 8/10 | 專注 Markdown 解析/渲染 |
| `ArticleService` | ✅ 8/10 | 協調層，委派給子服務 |

---

## O — 開放封閉原則（OCP）

### 違反 SOLID-02 🟡 硬編碼 "Publish" 字串

**位置**: `src/stores/article.ts:parseArticlePath()`

```typescript
function parseArticlePath(filePath: string) {
  // ...
  const isPublished = parts.some(p => p === "Publish"); // ← 硬編碼字串
  // 而非 ArticleStatus.Published 或可設定的路徑
}
```

`ArticleStatus.Published` 常數已存在（`src/types`），但 `parseArticlePath()` 繞過它使用字面字串 "Publish"。當業務邏輯需要更改「已發佈」的路徑名稱時，需要修改兩個地方（OCP 違反）。

**修正**:
```typescript
import { ArticleStatus } from "@/types";
// 或更好：注入路徑設定
const STATUS_PATH_MAP: Record<string, ArticleStatus> = {
  "Publish": ArticleStatus.Published,
  // 可擴充
};
```

### 正面案例

- `AIService` 透過 `provider` 參數選擇 Claude/Gemini/OpenAI — 新增 provider 不需改現有程式碼 ✅
- `IFileSystem` 介面允許注入不同實作 — ElectronFileSystem/MockFileSystem 各自獨立 ✅

---

## L — 里氏替換原則（LSP）

### 遵循良好 ✅

```typescript
// IFileSystem 介面
interface IFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  // ...
}

// ElectronFileSystem 實作
class ElectronFileSystem implements IFileSystem { ... }

// MockFileSystem（測試用）
class MockFileSystem implements IFileSystem { ... }
```

`ArticleService` 的測試中用 `MockFileSystem` 替換 `ElectronFileSystem`，行為一致，LSP 遵循完整。

---

## I — 介面隔離原則（ISP）

### 遵循良好 ✅

`IFileSystem` 介面涵蓋的方法（readFile, writeFile, deleteFile, readDirectory, getFileStats, createDirectory）都是合理的最小集合，沒有強迫使用者實作不需要的方法。

### 潛在改善 🟡

`MainEditor.vue` 透過 `useServices()` composable 同時取得 4 個服務：

```typescript
const { markdownService, obsidianSyntaxService, previewService, imageService } = useServices();
```

`MainEditor.vue` 是否真的需要 `imageService`？如果部份元件只需要 markdown 渲染，可考慮更細粒度的 composable 分解。但在實務規模上屬於 over-engineering 疑慮，暫時可接受。

---

## D — 依賴反轉原則（DIP）

### 遵循良好 ✅（Refactor-07 成果維持）

```typescript
// ArticleService 依賴介面，不依賴具體實作
class ArticleService {
  constructor(
    private fileSystem: IFileSystem,      // ← 介面
    private markdownService: MarkdownService,
    private backupService: BackupService,
  ) {}
}
```

建構子注入正確，可測試性高。

### 例外：直接依賴 🟡

`article.ts` store 中的 `window.electronAPI.searchBuildIndex` 是直接對 Electron API 的依賴，沒有透過介面抽象。這在 store 層（非 Main Process 服務層）是合理的折衷，但在測試中需要 mock `window.electronAPI`。

---

## 彙整 — 第三次評估 SOLID 問題清單

| 編號 | 原則 | 描述 | 嚴重度 | 位置 |
|------|------|------|--------|------|
| SOLID-01 | SRP | `article.ts` 六職責過重 | 🟠 中高 | `stores/article.ts` |
| SOLID-02 | SRP/DRY | `createArticle()` 內聯 ID 生成，與 ArticleService.generateId() 重複 | 🟠 中高 | `stores/article.ts:createArticle` |
| SOLID-03 | OCP | 硬編碼 "Publish" 字串而非使用 `ArticleStatus.Published` | 🟡 中 | `stores/article.ts:parseArticlePath` |
| SOLID-04 | DIP | store 層直接依賴 `window.electronAPI` 無介面抽象 | 🟢 低 | `stores/article.ts` |

---

## 修正優先順序

1. **立即** (SOLID-02): `createArticle()` 改用 `ArticleService.generateId()`，移除重複 ID 生成
2. **本 Sprint** (SOLID-03): `parseArticlePath()` 改引用 `ArticleStatus.Published` 常數
3. **下 Sprint** (SOLID-01): 評估能否將 `setupFileWatching` 拆出到獨立 composable 或 service
4. **Backlog** (SOLID-04): 評估是否需要抽象 `electronAPI` 介面（目前測試影響有限）

---

*SOLID 評估結束 ｜ 下一份: [架構報告](./04-architecture-report.md)*
