# 架構評估報告 — 第七次全面評估

**評審者**: Arch（架構師）  
**評審日期**: 2026-03-02  
**評審範圍**: 整體層次邊界、資料流、模組耦合、IPC 設計

---

## 一、前次架構問題確認

| A6 ID | 描述 | 狀態 |
|-------|------|------|
| A6-01 | Store 雙重依賴路徑，reloadArticle 資料不一致 | ✅ 已修（統一委派 articleService.loadArticle） |
| A6-02 | main.ts IPC 登錄為 God Function（~150 行）| ✅ 已修（提取 registerIpcHandlers.ts） |
| A6-03 | migrateArticleFrontmatter fire-and-forget 競態 | ✅ 已修（失敗時 notify.error()） |
| A6-04 | Preload 暴露低階 FS 原語，可繞過業務邏輯 | ⬜ **仍待修**（P3）|
| A6-05 | ArticleFilterCategory enum | ⬜ **仍待修**（P3）|
| A6-06 | Store nextTick/watch 隱式觸發 | ⬜ **仍待修**（P3）|

---

## 二、現況架構層次圖（Q7 確認）

```
┌─────────────────────────────────────────────────────────┐
│  Renderer Process                                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │  Stores  │  │Composable│  │     Components        │ │
│  │ article  │  │useFilter │  │ MainEditor            │ │
│  │ config   │  │useFileW. │  │ ArticleList           │ │
│  │ aiPanel  │  │          │  │ PreviewPane ─DOMPurify│ │
│  └────┬─────┘  └──────────┘  └───────────────────────┘ │
│       │  calls via ElectronFileSystem / ArticleService  │
│  ┌────▼──────────────────────────────────────────────┐  │
│  │  Renderer Services                                │  │
│  │  AutoSaveService  MarkdownService  SearchPanel... │  │
│  └────┬──────────────────────────────────────────────┘  │
│       │  window.electronAPI.xxx（preload bridge）       │
└───────┼─────────────────────────────────────────────────┘
        │  Electron IPC（invoke / on）
┌───────┼─────────────────────────────────────────────────┐
│  Main Process                                           │
│  ┌────▼──────────────────────────┐                      │
│  │  registerIpcHandlers.ts       │                      │
│  │  (IPC routing layer)          │                      │
│  └────────────┬──────────────────┘                      │
│               │ calls                                   │
│  ┌────────────▼──────────────────────────────────────┐  │
│  │  Services                                         │  │
│  │  FileService(✅路徑白名單)  ConfigService         │  │
│  │  SearchService(✅Trigram)  GitService(⚠️無驗證)  │  │
│  │  AIService  ProcessService  PublishService        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**架構評估**: 層次分離清晰，IPC routing 獨立於 main.ts，各 Service 單例管理清楚。  
**主要缺口**: GitService 未接入路徑白名單（架構與安全交叉問題）。

---

## 三、本次新發現

### A7-01 🟠 — GitService 缺少架構邊界接入（與 S7-01 呼應）

**位置**: `registerIpcHandlers.ts` GIT 區塊

```typescript
ipcMain.handle(IPC.GIT_STATUS, (_, repoPath: string) => gitService.getStatus(repoPath));
// ↑ repoPath 直接從 renderer 傳入，沒有路徑層的過濾
```

從架構角度看，GitService 操作的對象語意上應是 **唯一確定的 targetBlog 目錄**（AppConfig.paths.targetBlog），但目前 IPC handler 允許 renderer 任意指定 `repoPath`，這破壞了 `Config → FileService 白名單 → 業務服務` 的一致授權鏈。

**建議**: 兩種方案擇一
1. **最小改動**：在 IPC handler 層驗證 `repoPath === configService.getConfig().paths.targetBlog`
2. **架構對齊**：GitService 注入 `configService`，內部取得 `targetBlog` 而非要求 renderer 傳入

**方案 2 更符合「配置集中、不暴露實作細節到 Renderer」原則**，推薦採用。

### A7-02 🟡 — SearchService 增量更新與 FileService 事件的間接耦合

**位置**: `registerIpcHandlers.ts`，START_FILE_WATCHING handler

```typescript
ipcMain.handle(IPC.START_FILE_WATCHING, (_, watchPath: string) => {
  fileService.startWatching(watchPath, (event, filePath) => {
    if (filePath.endsWith(".md")) {
      getMainWindow()?.webContents.send(IPC.EVENT_FILE_CHANGE, { event, path: filePath });
      // 增量更新搜尋索引
      if (event === "unlink") {
        searchService.removeFile(filePath);
      } else {
        searchService.updateFile(filePath).catch(...)
      }
    }
  });
});
```

`registerIpcHandlers.ts`（路由層）目前承擔了業務協調責任（同時推送事件給 renderer 且更新搜尋索引）。這是 **route layer 混入 orchestration logic** 的問題。

**影響**: 目前規模尚可，若之後增加更多「檔案變更後的副作用」（如觸發 MetadataCache 更新），會繼續在此累積。

**建議**: 可提取 `FileEventOrchestrator`（或更輕量地，在 `SearchService` 中訂閱 `FileService` 事件，而非在 handler 中協調）。**P3 觀察**。

### A7-03 🟢 — AppServices 介面是良好的架構邊界

```typescript
export interface AppServices {
  fileService: FileService;
  configService: ConfigService;
  // ...
  getMainWindow: () => BrowserWindowType | null;
}
```

`AppServices` 介面清晰定義了 IPC routing layer 所需的依賴，符合 DIP 精神，也方便測試時注入 mock。這是從 Q6 架構重構中帶來的良好設計，**值得保留並推廣**。

---

## 四、A6-04（Preload 暴露低階 FS 原語）重新評估

Preload 目前暴露的方法包括 `readFile`、`writeFile`、`deleteFile`、`copyFile` 等，這些繞過業務服務直接操作檔案系統。

**當前緩解措施**:
- FileService 已有白名單驗證（CRIT-01 修復）
- Zod 驗證配置輸入（S6-04 修復）

**殘餘風險**: Renderer 可以使用 `readFile` 讀取 Vault 中任何合法路徑的檔案，不經過 ArticleService 的業務邏輯（frontmatter 解析、備份等）。

**重新評估**: 目前 Renderer 需要直接讀寫（CodeMirror 存檔、圖片預覽），完全封裝到高階 API 需要大量 IPC 設計工作，收益相對有限。**維持 P3**，記錄為架構技術債，不阻礙當前迭代。

---

## 五、架構健康評分（本次）

| 面向 | Q6 | Q7 | 說明 |
|------|----|----|------|
| 層次邊界清晰度 | B | B+ | registerIpcHandlers 提取後改善 |
| 服務隔離 | B+ | B+ | 各 Service 關注點分離 |
| 資料流一致性 | C+ | B | reloadArticle 統一後一致 |
| 授權邊界完整性 | B | B- | GitService 缺口（A7-01）新發現 |
| 可測試性 | C | C+ | ConfigService 建構子耦合待改 |
