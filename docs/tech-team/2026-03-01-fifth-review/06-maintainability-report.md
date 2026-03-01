# 可維護性評估報告 — 第五次全面評估

**審查者**: 資深工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，基準 commit `3fbb641`

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **可維護性總分** | **7.5 / 10** | 兩個超大模組持續未分解，logger 普及不足 |
| 模組大小 | 6.0/10 | ConverterService 988行、SettingsPanel 941行 |
| 測試可維護性 | 7.5/10 | 424 測試，但 7 模組無覆蓋 |
| 日誌可觀測性 | 6.5/10 | logger.ts 存在但覆蓋率僅 2/27+ 檔案 |
| 錯誤一致性 | 9.0/10 | M-01 完成，全中文統一 |
| 變更影響範圍 | 8.0/10 | aiPanel 解耦後影響面縮小 |

---

## 執行摘要

M-01（錯誤訊息中文化）和 M-07（aiPanel 解耦）的完成改善了可維護性基線。但 `ConverterService.ts`（988行）和 `SettingsPanel.vue`（941行）這兩個模組**沒有被分解**，仍是最難維護的技術債。

**可維護性評分從 Q4 的 8.0 降至 7.5**，因為這兩個模組在 Q4 之後進一步增長，而非縮減。

---

## 已修正確認（第四次評估可維護性問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| M-01 | 錯誤訊息英中混用 | ✅ FileService、ConfigService、ConverterService、ImageService、article.ts 全改中文 |
| M-07 | aiPanel store 耦合 | ✅ 解耦，AIPanelView.vue 橋接 |
| TS-ZERO | 12 TS 錯誤 | ✅ 0 errors |

---

## 新發現問題

### M5-01 🔴 ConverterService.ts (988行) 是最難維護的模組 — 高

**位置**: `src/services/ConverterService.ts`

**問題量化**:

| 指標 | 數值 | 參考 |
|------|------|------|
| 行數 | **988** | 建議上限 300-400 |
| console 呼叫 | **21** | 全部未走 logger.ts |
| 測試案例涵蓋 | 部分（無介面，難 mock） | — |
| 職責數量 | **5+** | 見 SOLID5-01 |

**維護負擔**:
- 任何新轉換格式都要修改這一個 988 行檔案
- 21 個 console.log 讓日誌除錯困難（無結構化、無層級）
- 缺少 `IConverterService` 介面，測試必須依賴真實 fs 環境

**建議拆分路線圖**:
```
第一步（1-2天）：建立 IConverterService 介面
第二步（2-3天）：提取 FrontmatterConverter（~100行）
第三步（2-3天）：提取 ImageCopyService（~150行）
第四步（1-2天）：提取 ConversionValidator（~80行）
第五步（1天）：ConverterService 保留 orchestration（~200行）
```

---

### M5-02 🟡 7 個模組缺少測試，增加維護風險 — 中

**背景**: 無測試的模組，每次重構或功能修改都有「靜默迴歸」的風險。

**分級風險**:

| 模組 | 維護風險 | 建議優先序 |
|------|--------|----------|
| `aiPanel.ts` store | 🔴 高（核心業務，剛解耦） | **1** |
| `ElectronFileSystem.ts` | 🔴 高（IPC 通訊層） | **2** |
| `search.ts` store | 🟠 中 | **3** |
| `MetadataCacheService.ts` | 🟠 中 | **4** |
| `seo.ts` store | 🟠 中 | **5** |
| `FileScannerService.ts` | 🟠 中 | **6** |
| `server.ts` store | 🟢 低 | **7** |

---

### M5-03 🟡 logger.ts 普及率僅 7% (2/27+ src 檔案) — 中

**現狀**:
- `src/utils/logger.ts` 設計完整（dev/prod 分流）
- 僅 2 個檔案 (AutoSaveService, FileWatchService) 實際使用
- 27 個其他有日誌需求的 src 檔案直接 `console.log`

**維護影響**:
- 當 bug 在 production 發生，沒有結構化日誌可查
- 未來若要接 log aggregation（Sentry 等），需改 29 處

**Quick-win 建議**: 在 PR/sprint 中規定「新程式碼禁用 console.log，只能用 logger」，並一次性批量替換現有 29 處。

---

## 可維護性熱力圖

```
模組維護難度（數值越高越難維護）

ConverterService.ts   ████████████████████ 988行
SettingsPanel.vue     ████████████████████ 941行
ImageService.ts       ████████████         653行（可接受）
MainEditor.vue        ████████████         663行（可接受）
article.ts store      ████████████         609行（有測試）
ImageManager.vue      █████████████        681行（可接受）
ArticleService.ts     ████████             416行（良好）
FileService.ts        ████                 211行（良好）
```

---

## 可維護性正向清單

以下已建立良好的可維護性模式，應作為其他部分的範本：

| 模式 | 範本模組 |
|------|--------|
| 介面 + 實作分離 | `IFileSystem` + `ElectronFileSystem` |
| 多測試檔案覆蓋 | `tests/stores/article.*.test.ts` |
| logger 使用 | `AutoSaveService.ts`, `FileWatchService.ts` |
| 統一中文錯誤 | `FileService.ts`（M-01 完成後） |
| Store 解耦 | `aiPanel.ts`（M-07 完成後） |

---

## 可維護性工程師結語

WriteFlow 的核心維護問題可用一句話總結：**兩個超大模組（ConverterService + SettingsPanel）吸收了太多職責，但從未被歸還**。它們像黑洞一樣，新功能出現就往裡面塞，直到沒有人敢輕易碰觸它。

技術建議是：**在下個 sprint 專門為 ConverterService 拆分和補 aiPanel 測試**，這兩個動作投資回報最高。

---

*第五次全面評估 — 可維護性 | 前次: [第四次評估](../2026-03-01-fourth-review/06-maintainability-report.md)*
