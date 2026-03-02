# SOLID 原則評估報告 — 第七次全面評估

**評審者**: Sol（SOLID 顧問）  
**評審日期**: 2026-03-02  
**評審範圍**: 全程式碼庫（stores、services、composables、main process）

---

## 一、前次 SOLID 問題確認

| ID | 原則 | 描述 | 狀態 |
|----|------|------|------|
| SOLID6-01 | SRP | article.ts 上帝 Store（611 行 9 職責）| ✅ 已修（useArticleFilter、useFileWatching 提取） |
| SOLID6-02 | SRP | reloadArticle 複製 ArticleService 邏輯 | ✅ 已修（統一委派 articleService.loadArticle） |
| SOLID6-08 | ISP | window.electronAPI 肥介面（30+ 方法）| ✅ 已修（介面已拆分） |
| SOLID6-10 | DIP | article.ts 7 次直呼 window.electronAPI | ✅ 已修（透過 ArticleService 抽象） |
| SOLID6-11 | DIP | AutoSaveService import Vue ref | ✅ 已修（改用 observer pattern + 回調） |
| SOLID6-03 | SRP | AutoSaveService 混合 timer 與 Vue 狀態 | ⬜ **仍待修**（P2）|
| SOLID6-04/05 | OCP | ArticleFilterCategory enum 硬編碼 | ⬜ **仍待修**（P3）|
| SOLID6-07 | LSP | AutoSaveService.initialize() 隱含前置條件 | ⬜ **仍待修**（P3）|
| SOLID6-09 | ISP | Frontmatter 混合廢棄欄位 | ⬜ **仍待修**（P3）|
| SOLID6-12 | DIP | PublishService 直接 import Node fs | ⬜ **仍待修**（P3）|

---

## 二、SOLID6-03 現況重新評估（AutoSaveService）

**觀察到的改進**（補充 Q6）：
- AutoSaveService 已成功移除 Vue `ref()`（SOLID6-11 修復）
- 改用 `_listeners: Set<(state: SaveState) => void>` 觀察者模式
- `markAsModified()` 加入 100ms debounce，防止高頻呼叫

**仍存在的混合責任**：
```typescript
// AutoSaveService 同時管理：
// 1. Timer 生命週期（startAutoSave / stopAutoSave）
// 2. 儲存狀態（_saveState + listeners）← 兩個不同職責
// 3. 骯髒標記（hasContentChanged + lastSavedContent）
// 4. 開關邏輯（isEnabled / initialized guard）
```

這些責任高度內聚，拆分會增加協作複雜度，拆分成本 > 收益。  
**重新評估決策**: 維持現況，不拆分（原先 P2 降為 P3 觀察）。

---

## 三、本次新發現

### SOLID7-01 🟡 — ConfigService 在建構子中硬連結 Electron 環境

**原則**: DIP（相依性反轉）  
**位置**: `src/main/services/ConfigService.ts`

```typescript
constructor() {
  const userDataPath = app.getPath("userData"); // ← 建構子直接呼叫 Electron app
  this.configPath = join(userDataPath, "config.json");
  this.aiKeysPath = join(userDataPath, "ai-keys.json");
}
```

**影響**:
- 單元測試必須在 Electron 環境中執行（無法在純 Node 環境 mock `app.getPath`）
- 目前 `tests/main/configService.test.ts` 測試覆蓋率若依賴 Electron 沙盒，則 CI 通過率依賴環境
- **可行修復**（最小改動）：注入 `configDir: string` 參數
  ```typescript
  constructor(configDir?: string) {
    const dir = configDir ?? app.getPath("userData");
    this.configPath = join(dir, "config.json");
  }
  ```
- **優先序**: 🟡 P2——測試環境問題，影響 CI 可靠性

### SOLID7-02 🟢 — AIService.getActiveProvider 是 resolveProvider 的別名

**原則**: SRP（微小的重複）  
**位置**: `src/main/services/AIService.ts`

```typescript
resolveProvider(): AIProviderName | null { ... }
getActiveProvider(): AIProviderName | null {
  return this.resolveProvider()  // ← 100% 委派，無邏輯差異
}
```

`getActiveProvider` 是對外 IPC 的語意名稱，`resolveProvider` 是內部工具方法，兩者共存有其合理性（語意清晰）。**無需修改**，此為刻意設計而非缺陷。

### SOLID7-03 🟡 — registerIpcHandlers.ts：單一函式 100+ 行

**原則**: SRP（大型函式）  
**位置**: `src/main/registerIpcHandlers.ts`

`registerIpcHandlers()` 函式目前管理所有 IPC domain（File、Config、Git、Publish、Search、AI、AutoUpdate、FileWatch），約 110 行。

**是否需要拆分？**
- 函式內有清晰的「domain 區塊」分組（有 `// ─── File ───` 等注解）
- 每個 handler 邏輯都很薄（1-2 行委派）
- 拆分成 `registerFileHandlers()`、`registerGitHandlers()` 等，可在需要時輕易操作
- **當前規模不構成閱讀難度**，P3 觀察，達到 200 行時才考慮

---

## 四、SOLID 健康評分（本次）

| 原則 | Q6 | Q7 | 變化說明 |
|------|----|----|----------|
| SRP | 6/10 | 8/10 | article.ts 拆分後職責更清晰 |
| OCP | 5.5/10 | 5.5/10 | FilterCategory 硬編碼仍待處理 |
| LSP | 7/10 | 7/10 | AutoSaveService 前置條件未改 |
| ISP | 7/10 | 8/10 | electronAPI 介面已拆分 |
| DIP | 5.5/10 | 7/10 | AutoSaveService Vue 解耦；ConfigService 尚有 Electron 耦合 |
| **SOLID 總分** | **6.2/10** | **7.1/10** | ↑ |

**彙總**: SOLID 基線從 Q6 的 C+ 提升至 Q7 的 B-，主要受惠於 SOLID6-01/08/10/11 修復。

---

## 五、本次特別關注：AutoSaveService 雙定時器修復確認

SOLID6-11（MainEditor 雙重 AutoSave timer）已確認修復：
- `MainEditor.vue` 已移除 `autoSaveTimer ref` 與 `scheduleAutoSave()`
- `handleContentChange` 改呼叫 `autoSaveService.markAsModified()`
- `autoSaveService` 的 100ms debounce 統一管理骯髒標記
- **競態條件消除**：不再有兩個 timer 各自判斷是否儲存
