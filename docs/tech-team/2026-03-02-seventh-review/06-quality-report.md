# 程式品質評估報告 — 第七次全面評估

**評審者**: QA（品質工程師）  
**評審日期**: 2026-03-02  
**評審範圍**: 全程式碼庫可測性、JSDoc 覆蓋率、程式碼可讀性、TODO 管理

---

## 一、前次品質問題確認

| QUAL6 ID | 描述 | 狀態 |
|----------|------|------|
| QUAL6-01 | ProcessService 零測試 + hardcoded IPC channel | ✅ 已修（tests 覆蓋 + IPC 常數化）|
| QUAL6-02 | startDevServer() 競態計時器假就緒 | ✅ 已修（settle pattern + URL 偵測就緒）|
| QUAL6-03 | autoDownload=true 未使用者確認 | ✅ 已修（autoDownload=false，需手動觸發）|
| QUAL6-04 | ConfigService 零測試 | ✅ 已修（12 項測試）|
| QUAL6-07 | ProcessService hardcoded `npm run dev` | ✅ 已修（改 pnpm.cmd）|
| QUAL6-09 | stopDevServer() 未等待 process exit | ✅ 已修（await with once("exit")）|
| QUAL6-05 | article.ts 611 行測試維護高成本 | ⬜ **部分改善**（拆分 composable 後行數降低）|
| QUAL6-06 | ImageService 648 行，型別混入實作 | ⬜ **仍待修**（P3）|
| QUAL6-08 | 4 個 TODO stub 無 Issue 追蹤標記 | ⬜ **仍待修**（P3）|
| QUAL6-10 | ProcessService 完全無 JSDoc | ⬜ **部分改善**（有行內注解，無 JSDoc）|

---

## 二、測試覆蓋率現況盤點

### 已有測試的模組（確認）
- `ProcessService`：競態、stopDevServer、URL 偵測就緒邏輯
- `ConfigService`：12 項測試（加解密、降級場景）
- `SearchService`：Trigram index 建立、search、增量更新
- `AutoSaveService`：dirty flag、debounce、切換文章儲存
- `GitService`：正常路徑、nothing to commit 處理
- E2E：`editor-flow.spec.ts`（開啟文章→編輯→Ctrl+S→磁碟驗證）

### 仍缺乏測試的模組

| 模組 | 風險評估 | 建議 |
|------|---------|------|
| `AIService` + 三個 Provider | 🟠 AI API 整合路徑複雜，mock 不完整可能漏掉 | P2 |
| `PublishService` | 🟠 複雜業務流（衝突、備份、同步）| P2 |
| `registerIpcHandlers.ts` | 🟡 路由邏輯薄，但 IPC handler 串接有漏洞風險 | P3 |
| `MarkdownService` | 🟡 純轉換邏輯，易測 | P3 |
| `FileScannerService` | 🟡 I/O 密集，需 mock fs | P3 |

---

## 三、本次新發現

### QUAL7-01 🟡 — ProcessService.stopDevServer 懸空 setTimeout（與 P7-01 交叉）

**位置**: `src/main/services/ProcessService.ts`

```typescript
// 現況：
proc.once("exit", () => resolve());
proc.kill();
setTimeout(() => { /* force kill */ resolve(); }, 5000);
// ↑ 若 proc 在 5 秒內退出，此 setTimeout 仍在 event loop 中佔位
```

**品質影響**: 非技術正確性問題，但會干擾測試中的 fake timer（`jest.useFakeTimers`），導致測試需要主動 flush 5 秒的 timer 才能結束。

**修復簡單**:
```typescript
const forceKillTimer = setTimeout(() => { ... }, 5000);
proc.once("exit", () => { clearTimeout(forceKillTimer); resolve(); });
```

### QUAL7-02 🟡 — AutoSaveService 同時暴露類別與單例，測試汙染風險

**位置**: `src/services/AutoSaveService.ts`

```typescript
// 模組底部：
export class AutoSaveService { ... }
export const autoSaveService = new AutoSaveService();  // ← 全域單例
```

**問題**:
- 多個測試共用同一個模組緩存時，`autoSaveService` 單例跨測試保留狀態
- 若測試 A 呼叫 `autoSaveService.initialize(...)` 後測試 B 不重置，狀態污染
- 目前受益於 `autoSaveService.destroy()` 方法存在，但需要測试工具配置 `afterEach(() => autoSaveService.destroy())`

**建議**: 在測試檔案中使用 `new AutoSaveService()` 建立本地實例而非使用共用單例，或在 vitest 設定中加入自動清除。**P2**（影響測試可靠性）。

### QUAL7-03 🟢 — IPC Channel 常數化確認乾淨

`ipc-channels.ts` 定義所有 37 個 channel，main.ts / preload.ts / registerIpcHandlers.ts 全部使用 `IPC.XXX` 常數。grep 確認無殘留硬編碼字串。**QUAL6-01 相關整理完整**。

### QUAL7-04 🟡 — ConfigService 建構子中同步 readFileSync（AI Key 讀取）

**位置**: `src/main/services/ConfigService.ts`，`getApiKey` / `setApiKey`

```typescript
setApiKey(...): void {
  // ...
  const raw = readFileSync(this.aiKeysPath, "utf-8");  // ← 同步 I/O
  // ...
  writeFileSync(this.aiKeysPath, ...);  // ← 同步 I/O
}
```

vs. `getConfig` / `setConfig` 使用 `async/await fs.readFile/writeFile`

**不一致性**: 同一個 ConfigService，配置檔用非同步、AI Keys 用同步。這不影響正確性（IPC handler 可以不 await void 方法），但：
- 同步 I/O 在 main process 會短暫阻塞 Electron 事件迴圈
- 測試中，mock `readFileSync` 與 mock `fs.readFile` 是不同的 mock 路徑

**建議**: 將 `setApiKey`/`getApiKey` 改為 async，統一 I/O 模式。這同時解決了 SOLID7-01 可測試性問題的一部分。**P2**。

---

## 四、程式碼可讀性評估

### 優秀的可讀性（Q7 確認）

| 位置 | 優點 |
|------|------|
| `FileService.ts` | 有詳盡的 JSDoc，每個安全決策都有注解（S6-03/04/07 等編號）|
| `AutoSaveService.ts` | 概念分層清晰（timer、狀態、骯髒標記），方法名稱語意準確 |
| `SearchService.ts` | Trigram 私有方法有文字說明複雜度目的 |
| `ipc-channels.ts` | 有分組注解，每個 channel 的用途都清楚 |

### 有改善空間（P3）

| 位置 | 問題 |
|------|------|
| `ProcessService.ts` | 方法有行內注解（QUAL6-07等），但缺乏方法級 JSDoc |
| `registerIpcHandlers.ts` | handler 委派很薄，但 S6-07（importExternalFile）的業務例外應有注解 |
| `article.ts` | store 仍有部分複雜的 fileWatcher 初始化順序邏輯（`let fileWatcher; ... fileWatcher = useFileWatching(...)`），前向引用的 workaround 缺乏說明 |

---

## 五、品質健康評分（本次）

| 面向 | Q6 | Q7 | 說明 |
|------|----|----|------|
| 單元測試覆蓋 | D+ | C+ | ProcessService/ConfigService 補齊；AI/Publish 仍缺 |
| E2E 測試覆蓋 | C | C+ | editor-flow 兩個案例完整 |
| 同步/非同步一致性 | B | B- | ConfigService 混用同步發現 |
| JSDoc 完整性 | C+ | B- | FileService 良好；ProcessService 仍弱 |
| 測試隔離性 | B | B- | 單例汙染風險浮現 |

**本次品質結論**: Q6 修復了高優先測試缺口，Q7 主要發現中優先的可靠性與一致性問題，無新增的嚴重品質問題。
