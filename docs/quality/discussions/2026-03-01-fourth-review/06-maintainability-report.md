# 可維護性評估報告 — 第四次全面評估

**審查者**: 可維護性工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦程式碼組織、文件品質、開發工作流

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **可維護性總分** | **8 / 10** | 整體代碼組織顯著改善，文件完整性優秀 |
| 模組組織 | 8.5/10 | composable/util 提取良好，目錄結構清晰 |
| 文件覆蓋 | 9/10 | 完整的技術評審文件體系，ADR 完善 |
| 程式碼可讀性 | 7.5/10 | 良好的注釋密度，中英混用問題仍存 |
| 開發工作流 | 8.5/10 | commitlint + lint-staged + CHANGELOG 自動化 |
| 重構成本 | 8/10 | DI 設計良好，隔離易於替換 |

---

## 執行摘要

整體可維護性從第三次評估（8/10）持平至本次（8/10），新增的 `ipc-channels.ts`、`schemas/config.schema.ts`、`composables/`、`utils/` 目錄均有效提升了程式碼的可尋找性。技術評審文件在本輪持續完善，已形成完整的四輪評審追蹤體系。

新發現問題集中在 **開發者體驗**（TS 錯誤）與 **視覺一致性**（新舊程式碼注釋語言不一）。

---

## 已修正確認（第三次評估可維護性問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| M-02 | article.ts 過大（635行）| ✅ 縮減至 610 行，可讀性改善 |
| M-05 | VaultDirs 常數化 | ✅ `src/config/vault.ts` 集中管理 |
| A-01 | IPC 字串散落各處 | ✅ `ipc-channels.ts` 集中，開發者只需查一個檔案 |

---

## 新增模組品質評估

### `src/main/ipc-channels.ts` ⭐ 優秀

```typescript
/**
 * IPC channel 名稱常數
 * 集中管理 main process 與 renderer process (preload) 之間所有頻道名稱
 * 避免因字串拼錯而造成靜默性通訊失敗
 * 使用 `as const` 確保每個值都是字面型別
 */
export const IPC = { ... } as const
export type IpcChannel = (typeof IPC)[keyof typeof IPC]
```

**評估**: 設計典範。分組注釋清晰（File / Config / Publish / Git / AI / Events），`as const` + `IpcChannel` 型別讓 IDE 自動補全精確。新增 channel 時只需在此檔案加一行，整個系統立即同步。**可維護性的標竿設計。**

---

### `src/main/schemas/config.schema.ts` ✅ 良好

```typescript
/**
 * Zod schema for AppConfig — IPC setConfig handler 的入口驗證
 * 設計目標：
 * 1. 確保路徑欄位為非空字串（防止空白路徑繞過 FileService 白名單）
 * 2. 確保 autoSaveInterval 在合理範圍（防止效能攻擊）
 * 3. 確保 theme 只能是已知值（防止 XSS 透過 theme 注入）
 */
```

**評估**: 目的文件清晰，schema 設計合理。主要問題是與 `types/index.ts` 的型別分裂（見 A4-01 / SOLID4-01）。

---

### `src/composables/useFileWatching.ts` ✅ 良好

**評估**: composable 職責明確（生命週期管理），API 設計符合 Vue 慣例（`start/stop`），返回值清晰。

---

### `src/utils/articlePath.ts` ✅ 良好

**評估**: 純函式設計，無副作用，易於測試。名稱直覺，位置合理。

---

## 新發現問題

### M4-01 🟡 TS 錯誤影響開發者體驗 — 中等

**現象**: `npx tsc --noEmit` 輸出 12 個錯誤，IDE 中相關檔案持續顯示紅色波浪線。

**影響**:
- 新進開發者看到 TypeScript 錯誤，難以判斷是「已知可忽略」還是「需要修正」
- CI 若有 TypeScript 類型檢查步驟，將阻止 merge
- 當 `electron.d.ts` 宣告不完整時，IDE 自動補全對 `window.electronAPI.*` 的提示缺失

**建議**: 在 `GOTCHAS.md` 或 `DEVELOPMENT.md` 中明確記錄哪些 TS 錯誤是「已知 pre-existing」、哪些需要修正，並設立清零里程碑。

---

### M4-02 🟡 FileService.startWatching 與 addWatchListener 行為不對稱 — 中等

**現象**（延伸 SOLID4-02）:
```typescript
// 開發者可能的誤用：
fileService.addWatchListener(callback1)  // 訂閱者 1
fileService.addWatchListener(callback2)  // 訂閱者 2
fileService.startWatching(path, callback3)  // 會清掉 callback1 & 2！
```

**可維護性影響**: API 行為不直覺。`startWatching` 的文件注釋說「若已有不同監聽路徑的監聽器，先停止舊監聽器」，但實際上也清除了 `addWatchListener` 加入的所有 callback。這是文件與行為不一致的問題。

**修正建議**: 更新文件注釋說明副作用，或修改 `stopWatching` 只關閉 watcher 不清空 callbacks。

---

### M4-03 🟢 部分新程式碼仍採英文注釋，與專案中文注釋風格不一 — 低

**觀察**（延伸 M-01 已知問題）:

新增的 `FileService.ts` 路徑驗證方法有中文注釋（✅），但以下位置仍為英文：
```typescript
// FileService.startWatching 中：
ignored: /(^|[/\\])\../, // 忽略隱藏檔案 ← 中文 ✅
// vs
// 其他 service 中仍有英文注釋
```

**評估**: 一致性略有改善，但整體仍是中英混用。可接受現狀，建議設立統一規範（中文或英文選擇一種）。

---

## 目錄結構演進追蹤

```
src/
├── composables/
│   ├── useFileWatching.ts  ← 第四次評估新增 ✅
│   └── (其他既有)
├── config/
│   └── vault.ts            ← 第三次評估新增 ✅
├── main/
│   ├── ipc-channels.ts     ← 第四次評估新增 ✅
│   ├── schemas/
│   │   └── config.schema.ts ← 第三次評估新增 ✅
│   └── services/
│       └── FileService.ts  ← 路徑白名單加強 ✅
├── services/
│   └── ArticleService.ts   ← stable ID 加強 ✅
└── utils/
    └── articlePath.ts      ← 第四次評估新增 ✅
```

**評估**: 目錄語義清晰，各模組放置合理。`schemas/` 子目錄顯示出良好的命名規範意識。

---

## 文件品質評估

| 文件 | 狀態 | 備註 |
|------|------|------|
| 技術評審文件（4輪）| ✅ | 最完整的評審追蹤體系 |
| ADR-0001 CodeMirror6 | ✅ | 決策記錄完整 |
| DEVELOPMENT.md | ✅ | 開發設定指引清楚 |
| GOTCHAS.md | ✅ | 容易踩坑的地方有記錄 |
| fix-bug/ 目錄 | ✅ | 每個 bug 修正有溯源文件 |
| 新增模組的 JSDoc | 🟡 | ipc-channels / schema 有；composable 稍薄 |

---

## 可維護性工程師結語

WriteFlow 的文件體系是本次評審中最令人印象深刻的部分——四輪技術評審追蹤、ADR、GOTCHAS、fix-bug 溯源文件，顯示了成熟的工程文化。程式碼組織的改善也明顯：composable 提取、工具函式分離、常數集中化，都符合後期維護者「容易找到、容易修改」的要求。

**短期建議**:
1. 解決 TypeScript 錯誤（提升 IDE 體驗，降低認知負擔）
2. 在 `DEVELOPMENT.md` 補充「已知 TS 錯誤清單」（避免新人困惑）

**長期建議**:
- M-07 store 過度耦合問題仍在 Backlog，随著功能增長建議提前規劃解耦

---

*第四次全面評估 — 可維護性 | 前次: [第三次評估](../2026-03-01-third-review/06-maintainability-report.md)*
