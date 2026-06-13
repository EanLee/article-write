---
title: "WriteFlow SOLID 原則評估報告（第二次）"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-03-01
source_of_truth: false
---

# WriteFlow SOLID 原則評估報告（第二次）

**評估日期**: 2026-03-01
**評估角色**: Software Architect
**技術堆疊**: Electron v39 + Vue 3 + TypeScript + Pinia

---

## 一、SOLID 遵循度評分表

| 原則 | 評分 | 說明 |
|------|------|------|
| **S** - 單一職責原則 | **5 / 10** | `MarkdownService` 是典型的 God Class；`article.ts` Store 包含 12+ 種職責；`MainEditor.vue` 重複了 AutoSave 邏輯；`PublishService` 內嵌屬其他服務的邏輯 |
| **O** - 開放封閉原則 | **6 / 10** | AI 供應商系統設計良好，但 `AIProviderFactory` 仍需 switch 修改；Markdown 外掛機制無擴充點 |
| **L** - 里氏替換原則 | **8 / 10** | `IAIProvider` 介面完整，三個供應商完全可互換；`IFileSystem` 抽象設計良好 |
| **I** - 介面隔離原則 | **7 / 10** | `IAIProvider` 極為精簡；但 `AutoSaveService` 暴露 Vue `ref()` 作為公開屬性，混合了 UI 框架關切 |
| **D** - 依賴反轉原則 | **4 / 10** | `article.ts` Store 直接依賴 5 個 singleton 與 `window.electronAPI`；IPC 層缺乏介面抽象 |

**加權總分**: **30 / 50 分**（60% 遵循率）

---

## 二、違反原則的具體案例

### 🔴 案例 1 — SRP 違反：`MarkdownService` 是 God Class

**檔案**: `src/services/MarkdownService.ts`

```typescript
// 這個類別同時承擔 7 種職責：
export class MarkdownService {
  // 1. Markdown → HTML 渲染
  // 2. Frontmatter 解析
  // 3. Frontmatter 驗證（含商業規則：有效分類清單硬編碼）
  // 4. Frontmatter 生成（YAML 序列化）
  // 5. Obsidian 特殊語法規則（WikiLink、圖片）
  // 6. Markdown 語法驗證
  // 7. 圖片/Wiki連結提取工具
}
```

任何一項改變（換渲染引擎、更新分類清單、加新 Obsidian 語法）都會觸碰同一檔案。

---

### 🔴 案例 2 — SRP 違反：`PublishService` 重複實作已有邏輯

**檔案**: `src/main/services/PublishService.ts`

`PublishService` 自行實作了 frontmatter 序列化（`stringifyFrontmatter`）和文章解析（`parseArticleFromFile`），完全複製 `MarkdownService` 和 `ArticleService` 的功能。

---

### 🔴 案例 3 — SRP 違反：`MainEditor.vue` 同時管理兩套 AutoSave 機制

**檔案**: `src/components/MainEditor.vue`

元件內部**重複**了 `AutoSaveService` 已提供的功能：

```typescript
// MainEditor.vue — 元件自己管理第二個 auto-save timer（2 秒）
// 同時 AutoSaveService 有 30 秒 timer
// 兩者都呼叫儲存，但互不知情，存在競態條件（race condition）
const autoSaveTimer = ref<number | null>(null)
function scheduleAutoSave() {
  autoSaveTimer.value = setTimeout(() => { saveArticle() }, 2000)
}
```

---

### 🔴 案例 4 — SRP 違反：`article.ts` Store 是 God Module

**檔案**: `src/stores/article.ts`

```typescript
// 12+ 種職責並存：
// 職責 1：文章列表狀態管理
// 職責 2：文章過濾與計算（含排序演算法）
// 職責 3：檔案系統掃描
// 職責 4：檔案監聽管理
// 職責 5：路徑解析（含業務規則：Publish/Drafts 資料夾名稱）
// 職責 6：文章 CRUD
// 職責 7：狀態切換
// 職責 8：Frontmatter 資料移轉（含欄位舊版相容邏輯）
// 職責 9：AutoSave 初始化
// ... 更多
```

---

### 🟡 案例 5 — OCP 違反：`AIProviderFactory` 需修改才能新增供應商

```typescript
// 每加一個供應商就要改這裡
export class AIProviderFactory {
  static create(provider: AIProviderName, apiKey: string): IAIProvider {
    switch (provider) {
      case 'claude': return new ClaudeProvider(apiKey)
      case 'gemini': return new GeminiProvider(apiKey)
      case 'openai': return new OpenAIProvider(apiKey)
      // 若要加 Mistral，必須改此檔案 → OCP 違反
    }
  }
}
```

---

### 🔴 案例 6 — DIP 違反：`article.ts` 直接依賴 `window.electronAPI`

```typescript
// Store 全域 14 處直接呼叫 window.electronAPI
async function createArticle(title: string, category: string) {
  if (!window.electronAPI) throw new Error("Electron API not available")
  await window.electronAPI.createDirectory(categoryPath)       // ← 直接呼叫底層 IPC
}
```

IPC 層沒有任何介面抽象，使測試困難、平台鎖定。

---

### 🔴 案例 7 — 程式碼缺陷：`MainEditor.vue` 呼叫不存在的 Store 方法

```typescript
// MainEditor.vue 中的 saveArticle 函式
await articleStore.updateArticle(updatedArticle)   // ❌ updateArticle 不存在！
// Store 實際暴露的是 updateArticleInMemory
```

---

### 🔴 案例 8 — 程式碼缺陷：`MainEditor.vue` 對 computed 進行賦值

```typescript
const allTags = computed(() => articleStore.allTags)  // computed（唯讀）

// 但在 initializeObsidianSupport 中嘗試賦值：
allTags.value = Array.from(tagSet)  // ❌ computed 不可賦值，執行時報錯
```

---

## 三、設計模式應用分析

### ✅ 已正確使用的設計模式

| 模式 | 使用位置 | 評價 |
|------|---------|------|
| **策略模式 (Strategy)** | `IAIProvider` + 三大供應商 | 設計優良，完全可互換 |
| **工廠模式 (Factory)** | `AIProviderFactory.create()` | 基本實作，但 switch 方式可強化 |
| **觀察者模式 (Observer)** | `FileWatchService.subscribe()` | 設計合理 |
| **依賴注入 (DI)** | `ArticleService(fileSystem?, ...)` | 最佳實踐範例 |
| **Composition API** | 所有 Vue Composables | 良好的函式封裝 |

### 🔧 建議引入的設計模式

| 模式 | 應用場景 | 效益 |
|------|---------|------|
| **Registry Pattern** | 替代 `AIProviderFactory` 的 switch | 新增供應商無需修改工廠程式碼 |
| **Plugin Pattern** | `MarkdownService` 的 Obsidian 規則 | 可動態注入語法外掛 |
| **Facade Pattern** | 統一 IPC 呼叫介面 | 抽象 `window.electronAPI` |
| **Command Pattern** | 文章操作（建立/刪除/移動） | 支援 Undo/Redo |
| **Mediator Pattern** | 協調 Editor ↔ AutoSave ↔ Store | 消除雙重 auto-save 機制 |

---

## 四、重構建議（優先順序排序）

### 🔥 P0 — 立即修復（功能缺陷）

**P0.1** 修正 `MainEditor.vue` 的 Store 方法名稱：
```typescript
// 重構前（錯誤）
await articleStore.updateArticle(updatedArticle)
// 重構後（正確）
articleStore.updateArticleInMemory(updatedArticle)
```

**P0.2** 修正 computed 賦值缺陷：移除 `initializeObsidianSupport` 中的手動 `allTags.value = ...` 賦值

---

### 🔥 P1 — 高優先（架構健康度）

**P1.1** 消除雙重 AutoSave 機制：`MainEditor.vue` 移除 `scheduleAutoSave`，改呼叫 `autoSaveService.markAsModified()`

**P1.2** 抽象 IPC 層：

```typescript
// 新建 src/types/IElectronBridge.ts
export interface IElectronBridge {
  createDirectory(path: string): Promise<void>
  readFile(path: string): Promise<string>
  // ...
}
```

---

### 🟡 P2 — 中優先（可維護性）

**P2.1** 拆分 `MarkdownService` 為四個單一職責類別：`FrontmatterParser`、`MarkdownRenderer`（支援外掛注入）、`MarkdownValidator`

**P2.2** 修正 `PublishService` 的 DIP 違反：依賴 `IFileSystem` 介面，移除重複 YAML 序列化邏輯

**P2.3** 使用 Registry Pattern 強化 `AIProviderFactory`：

```typescript
// 新增供應商無需修改工廠
AIProviderRegistry.register('mistral', MistralProvider)
```

---

## 五、技術負債評估

| 負債項目 | 嚴重程度 | 預估重構工時 |
|---------|---------|------------|
| MainEditor 雙重 AutoSave | 🔴 高 | 4h（含測試） |
| store.updateArticle 方法名缺陷 | 🔴 高 | 0.5h |
| computed 賦值問題 | 🔴 高 | 1h |
| MarkdownService God Class | 🟡 中 | 1-2天 |
| PublishService 重複邏輯 | 🟡 中 | 4h |
| article.ts God Store | 🟡 中 | 2-3天 |
| IPC 無介面抽象 | 🟡 中 | 1天 |
| AIProviderFactory OCP | 🟢 低 | 2h |

**預估總重構工時**: 7-12 工作天

### 重構切入順序

```
Sprint 1（修正缺陷）:  P0.1 → P0.2 → P1.1（1週）
Sprint 2（架構修正）:  P1.2 → P2.2 → P2.3（2週）
Sprint 3（分拆重構）:  P2.1 → P3.1（2週）
Sprint 4（長期預防）:  P3.2 + 建立 DI Container（3週）
```

---

## 六、正面評估

1. ✅ **`ArticleService`** 是最接近 SOLID 理想的設計，依賴注入完整
2. ✅ **`IAIProvider` + 三大供應商**：LSP 實作完美，完全可互換
3. ✅ **`AutoSaveService`** 內聚良好，防抖、定時、狀態管理清晰
4. ✅ **Composables 設計**（`useAutocomplete`, `useEditorShortcuts` 等）：有效分解 Vue 元件邏輯
5. ✅ **`FileService`** 職責清晰，提供穩定的檔案 I/O 抽象
