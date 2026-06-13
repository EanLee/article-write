---
title: "WriteFlow 系統架構評估報告（第二次）"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-03-01
source_of_truth: false
---

# WriteFlow 系統架構評估報告（第二次）

**評估日期**：2026-03-01
**評估角色**：System Architect
**評估版本**：Electron v39 + Vue 3 + TypeScript

---

## 一、架構總覽圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WriteFlow Application                        │
│                                                                     │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐  │
│  │     MAIN PROCESS (Node.js)  │  │   RENDERER PROCESS (Browser) │  │
│  │                             │  │                              │  │
│  │  ┌──────────────────────┐   │  │  ┌────────────────────────┐  │  │
│  │  │      main.ts         │   │  │  │      App.vue           │  │  │
│  │  │  (IPC 登錄中心)       │   │  │  │  (根元件 + 佈局)        │  │  │
│  │  └──────────────────────┘   │  │  └────────────────────────┘  │  │
│  │           │                 │  │           │                  │  │
│  │  ┌────────┴─────────────┐   │  │  ┌────────┴──────────────┐  │  │
│  │  │   Main Services      │   │  │  │    Pinia Stores (6)   │  │  │
│  │  │  ├─ FileService      │   │  │  │  ├─ article.ts        │  │  │
│  │  │  ├─ ConfigService    │   │  │  │  ├─ config.ts         │  │  │
│  │  │  ├─ GitService       │   │  │  │  ├─ search.ts         │  │  │
│  │  │  ├─ SearchService    │   │  │  │  ├─ seo.ts            │  │  │
│  │  │  ├─ PublishService   │   │  │  │  ├─ aiPanel.ts        │  │  │
│  │  │  ├─ ProcessService   │   │  │  │  └─ server.ts         │  │  │
│  │  │  └─ AIService        │   │  │  └───────────────────────┘  │  │
│  │  │      └─ AIProvider   │   │  │           │                  │  │
│  │  │         ├─ Claude    │   │  │  ┌────────┴──────────────┐  │  │
│  │  │         ├─ Gemini    │   │  │  │  Renderer Services    │  │  │
│  │  │         └─ OpenAI    │   │  │  │  ├─ ArticleService    │  │  │
│  │  └──────────────────────┘   │  │  │  ├─ AutoSaveService   │  │  │
│  │                             │  │  │  ├─ BackupService     │  │  │
│  └──────────────┬──────────────┘  │  │  ├─ FileWatchService  │  │  │
│                 │                 │  │  ├─ MarkdownService    │  │  │
│        ContextBridge              │  │  └─ MetadataCache      │  │  │
│        (preload.ts)               │  └────────────────────────┘  │  │
│                 │                 │          │                    │  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ┌───────┴───────────────┐   │  │
│        window.electronAPI         │  │  Vue Components (26)  │   │  │
│        (ipcRenderer.invoke)       │  └───────────────────────┘   │  │
│                                   └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、架構優點（Strengths）

### 2.1 安全性設計完善
- `contextIsolation: true` + `nodeIntegration: false` 正確落實 Electron 安全基線
- AI API Key 使用 `electron.safeStorage` 加密儲存
- 開發/生產環境分開套用 CSP 策略

### 2.2 服務層遵循 SOLID 原則
- `ArticleService` 依賴 `IFileSystem` 介面（DIP）
- `AIService` 透過 `AIProviderFactory` 工廠模式統一管理（Factory Pattern + OCP）
- `ElectronFileSystem` 實作 `IFileSystem`，可在測試中注入 Mock

### 2.3 防衝突與防抖機制完備
- `FileWatchService.ignoreNextChange()` 防止自身寫入觸發重複 reload
- `AutoSaveService` 三層防抖：dirty flag → 字串比對 → lodash `isEqual` 深比
- `BackupService.detectConflict()` 在儲存前執行衝突偵測

### 2.4 IPC 頻道常數集中定義
- `ipc-channels.ts` 以 `as const` 集中管理所有頻道名稱（但實際未被引用，詳見 W-01）

---

## 三、架構缺陷與風險

### 🔴 嚴重問題（W-01）：`ipc-channels.ts` 常數檔形同虛設

`main.ts` 和 `preload.ts` **完全沒有引用** IPC 常數，而是使用硬編碼字串（`"read-file"`、`"write-file"` 等）。常數檔的型別安全完全失效，未來重命名頻道時需同步修改三個檔案。

```typescript
// ❌ 現狀：main.ts 使用硬編碼字串
ipcMain.handle("read-file", ...)

// ✅ 應該使用
import { IPC } from "./ipc-channels.js"
ipcMain.handle(IPC.READ_FILE, ...)
```

---

### 🔴 嚴重問題（W-02）：IPC `publishArticle` 傳遞函式參數

```typescript
// ❌ IPC 序列化無法傳遞函式，onProgress 永遠是 undefined
ipcMain.handle("publish-article", async (_, article, config, onProgress?) => {
  return await publishService.publishArticle(article, config, onProgress);
});
```

實際進度回調應改用 `event.sender.send()` push event 實作。

---

### 🔴 嚴重問題（W-03）：`article.ts` store 直接呼叫 `window.electronAPI`

```typescript
// ❌ store 直接呼叫 IPC（破壞分層）
const content = await window.electronAPI.readFile(article.filePath)

// ✅ 應該通過 ArticleService
await articleService.readArticle(article.filePath)
```

---

### 🟡 中等問題

**W-04**：`ConfigService` 使用同步 I/O（`readFileSync`/`writeFileSync`）阻塞 Main Process Event Loop

**W-05**：`article.ts` store 職責過重（God Store 反模式）— 超過 450 行

**W-06**：`setTimeout(..., 100)` 魔法延遲初始化 — 在慢速機器上可能引發 race condition

**W-07**：`vite.config.ts` 未設定 code splitting，大型套件（CodeMirror、lodash）不拆包，首屏 bundle 過大

**W-08**：`preload.ts` 中多處關鍵 IPC 參數使用 `any` 型別，喪失靜態型別安全

---

## 四、各層職責分析

| 層級 | 評估 |
|------|------|
| Main Process 服務層 | ✅ 整體職責清晰，ConfigService 同步 I/O 和 PublishService 進度回調是主要扣分 |
| Context Bridge 層 | ⚠️ 封裝正確，但頻道字串硬編碼（W-01）、型別洩漏（W-08） |
| Renderer Services 層 | ✅ ArticleService、AutoSaveService 設計優良；MarkdownService 職責過多 |
| Pinia Store 層 | ⚠️ article.ts 是 God Store；其他 5 個 store 精簡合理 |
| Vue 元件層 | ✅ App.vue 根元件協調適當，未過度膨脹 |

---

## 五、資料流動圖

### 5.1 文章儲存流程（自動儲存）

```
CodeMirror 6 Editor（使用者輸入）
    │
    ▼ autoSaveService.markAsModified()（100ms debounce）
    │
    ▼ [30 秒計時器觸發] performAutoSave()
    │── dirty flag 檢查 (O(1))
    │── hasContentChanged() → lodash isEqual 深比
    │
    ▼ article store.saveArticle(article)
    │
    ▼ fileWatchService.ignoreNextChange(filePath, 5000ms) ← 防止自觸發
    │
    ▼ ArticleService.saveArticle(article)
    │── BackupService.detectConflict() → 衝突檢測
    │── serializeToMarkdown() → frontmatter 序列化
    │
    ▼ ElectronFileSystem.writeFile(path, content) (IPC: write-file)
    ▼ FileService.writeFile() — Main Process (fs.writeFile)
    ▼ 磁碟落地
    │
    ▼ chokidar 偵測變化 → ignoreNextChange 命中 → 靜默丟棄 ✓
```

---

## 六、錯誤處理架構

### 主要問題
- **缺乏統一的 IPC 錯誤協議**：`ai:generate-seo` 使用 `{success, code, message}`，其他 handler 直接 throw，格式不一
- **無 Vue 全域 `errorHandler`** — 元件錯誤可能靜默
- **Sentry 只在 Main Process 初始化**，Renderer Process 的錯誤無法自動上報

---

## 七、架構演進建議

### 短期（1-2 週）

| ID | 任務 |
|----|------|
| S-01 | 修復 IPC 常數未使用問題（W-01）— 全面引用 `ipc-channels.ts` |
| S-02 | 修復 `publishArticle` 進度回調為 push event 模式（W-02） |
| S-03 | `reloadArticle` 改用 ArticleService |
| S-04 | `ConfigService` AI Key 操作改為非同步 |
| S-05 | Vite 加入 `sourcemap: true` 設定 |
| S-06 | 建立全域 Vue `errorHandler` |

### 中期（1-2 個月）

| ID | 任務 |
|----|------|
| M-01 | `article.ts` Store 職責拆分（CRUD / FileWatch / 遷移邏輯） |
| M-02 | 建立 `src/types/ipc-api.ts` IPC 型別契約共享 |
| M-03 | 統一 IPC 錯誤協議（`handleIPC` 包裝函式） |
| M-04 | 解決 `setTimeout` 魔法延遲，改用 `watch + immediate` |
| M-05 | 搜尋索引持久化，支援增量更新 |

### 長期（3-6 個月）

| ID | 任務 |
|----|------|
| L-01 | 引入 `electron-vite` 統一建置流程 |
| L-02 | Renderer 端 Sentry 整合 |
| L-03 | CI/CD 程式碼簽名流程自動化 |
| L-04 | IPC API 型別生成工具化 |

---

## 八、技術債務清單

| ID | 技術債務 | 影響範圍 | 優先度 |
|----|---------|---------|-------|
| TD-01 | `ipc-channels.ts` 常數未被使用 | 全局 IPC | 🔴 高 |
| TD-02 | `preload.ts` 多處 `any` 型別 | IPC 型別安全 | 🔴 高 |
| TD-03 | `publishArticle` IPC 函式參數設計錯誤 | 發布功能 | 🔴 高 |
| TD-04 | `reloadArticle` 跳過服務層 | 架構一致性 | 🟡 中 |
| TD-05 | `ConfigService` 同步 I/O | Main Process 效能 | 🟡 中 |
| TD-06 | `article.ts` God Store | 可維護性/可測試性 | 🟡 中 |
| TD-07 | `setTimeout(..., 100)` 魔法延遲 | 穩定性 | 🟡 中 |
| TD-08 | Vite 無 code splitting | 首屏效能 | 🟡 中 |
| TD-09 | Renderer 端無 Sentry 整合 | 可觀測性 | 🟡 中 |
| TD-10 | 搜尋索引每次重建 | 啟動效能 | 🟢 低 |
| TD-11 | 缺乏 IPC 統一錯誤協議 | 錯誤處理一致性 | 🟡 中 |
| TD-12 | electron-builder 缺少代碼簽名設定 | 分發可靠性 | 🟡 中 |
| TD-13 | 無 Vue 全域 errorHandler | 元件錯誤可觀測性 | 🟢 低 |
| TD-14 | 應用圖示缺失（被注解） | 產品品牌 | 🟢 低 |

---

## 九、總結評分

| 面向 | 評分 | 說明 |
|------|------|------|
| 安全架構 | ⭐⭐⭐⭐☆ | 基線正確，AI Key 加密良好 |
| IPC 設計 | ⭐⭐⭐☆☆ | 常數未使用、型別洩漏、進度回調設計錯誤 |
| 服務層設計 | ⭐⭐⭐⭐☆ | DI/抽象設計優秀，ConfigService 同步 I/O 扣分 |
| 狀態管理 | ⭐⭐⭐☆☆ | article.ts 職責過重待拆分 |
| 資料流向 | ⭐⭐⭐⭐☆ | 主流程分層明確，少數例外 |
| 錯誤處理 | ⭐⭐☆☆☆ | 無統一協議，Renderer 端無 Sentry |
| 建置部署 | ⭐⭐⭐☆☆ | 三平台支援完整，但無 code splitting |
| 可測試性 | ⭐⭐⭐⭐☆ | IFileSystem 抽象優秀，God Store 影響測試 |
| **整體** | **⭐⭐⭐☆☆** | **架構思維正確，細節執行存在可識別的技術債務** |
