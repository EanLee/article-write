# 跨角色技術討論 — 第五次全面評估

**形式**: 圓桌討論
**日期**: 2026-03-01
**出席角色**: 資安、效能、SOLID、架構、品質、可維護性

---

## 議題一：ConverterService 應如何分解？（SOLID5-01 / M5-01）

**SOLID 架構師**: ConverterService 是本次評審最大的技術債。988 行、5 個職責，每次新增轉換規則都造成整個模組的 diff 爆炸。我建議提取 `FrontmatterConverter`、`ImageCopyService`、`ConversionValidator` 三個獨立類別。

**資深架構師**: 同意。但更重要的是**同步建立 `IConverterService` 介面**。若先拆分再加介面，兩個 PR 的協調成本更高。建議一個 PR 同時完成：建立介面、提取 3 個子類別、更新所有注入點。

**可維護性工程師**: 支持架構師的一步到位策略。同時提醒：ConverterService 現有 21 個 console.log，分解時一併改為 `logger.debug/warn/error`，否則 21 個散落到 4 個新檔案，後面更難追。

**效能工程師**: 我有另一個角度——分解同時順便處理 P5-02（批次轉換無 concurrency 上限）。`ImageCopyService` 提取後，可以直接在新類別加上 `p-limit` 控制。兩個問題一次解決。

**品質工程師**: 我在擔心測試。ConverterService 現在有 `tests/services/ConverterService.test.ts`，分解後這些測試要怎麼遷移？建議先把現有測試拆成對應子類別的測試檔，再做實作分解，避免在 refactor 過程中失去測試保護。

**資安工程師**: 從資安角度再加一點：ConverterService 原先 S5-02 指出的 slug path validation gap，應在分解時在 `ConversionValidator` 類別中統一加入路徑驗證，不要留在 ConverterService 主類別。

**共識決議**:
> ConverterService 拆分 PR 應一次完成：介面定義 + 子類別提取 + logger 替換 + slug 驗證補強 + 測試遷移。這是工作量最大但技術債最高的一張牌，建議作為獨立 sprint 主題。

---

## 議題二：console.log 替換策略（Q5-01 / S5-01）

**資安工程師**: 29 個 console 呼叫是資安隱患，production 的 DevTools 可見路徑等資訊。這個問題和 ConverterService 分解可以分開，不需要等到大重構。

**品質工程師**: 完全同意。這是最典型的 quick-win。範圍明確（grep 可列出所有位置）、風險低（只是換 function call）、收益立竿見影（production log 乾淨）。我估計 2-3 小時可以完成整個 `src/` 的替換。

**可維護性工程師**: 另外建議配合一個 ESLint 規則：

```js
// eslint.config.js
rules: {
  'no-console': ['error', { allow: [] }]
}
```

這樣只要有人誤用 `console.log` 就會變成 error，不再累積到下次評審。

**資深架構師**: 同意，但要在 eslint ignore 中排除 `tests/` 目錄（測試本來可以用 console.log）。

**共識決議**:
> console.log 替換獨立為一個小 PR，和 ConverterService 分解並行（不互相 block）。完成後加 ESLint `no-console` error rule，防止回歸。

---

## 議題三：未覆蓋 Store 的測試補充順序（A5-02 / M5-02）

**品質工程師**: 4 個 store 零測試，優先級我認為是 `aiPanel` > `search` > `seo` > `server`。aiPanel 是本次 M-07 的主角，解耦後的新簽名（`generateSEO(article)` / `applySEOResult(article)`）正需要測試驗證。

**資深架構師**: 補 `aiPanel` 測試的成本現在是最低的——M-07 剛完成，aiPanel 現在沒有任何 store 相依，mock 非常乾淨。

**SOLID 架構師**: 記憶力提醒：`seo` store 和 `aiPanel` 有關聯（applySEOResult 把資料寫入 article，SEO 建議由 seo store 管理）。補 `aiPanel` 測試時，可能需要 mock `seo` store。建議兩個 store 一起補。

**可維護性工程師**: 同意協同補測。同時 `ElectronFileSystem` 需要 mock Electron IPC，這個難度較高。建議放在最後，或等 Testing 工具鏈更成熟時處理。

**共識決議**:
> 第一波: 補 `aiPanel.ts` + `seo.ts` store 測試（一個 PR）
> 第二波: 補 `search.ts` + `server.ts` store 測試
> 第三波: 處理 `ElectronFileSystem` / `FileScannerService` 的 Electron mock 方案

---

## 議題四：SettingsPanel.vue 如何處理（SOLID5-02 / 效能 P5-01）

**效能工程師**: SettingsPanel.vue 941 行且用 `v-show` 渲染所有 tab，建議改 `v-if + KeepAlive`。這需要先把 5 個設定區塊各自提取為子元件。

**SOLID 架構師**: 這和我的 SOLID5-02 建議完全一致。提取子元件後，每個子元件可以獨立是 `v-if`，效能和 SRP 同時解決。

**品質工程師**: 但 SettingsPanel 目前無測試。分解前應先補測試，確保分解不導致靜默回歸。

**資深架構師**: SettingsPanel 的 UI 邏輯（使用者互動、表單驗證）通常需要 E2E 測試，而不只是單元測試。建議在分解 SettingsPanel 前，先把 E2E test 的設定涵蓋到 Settings 相關場景。

**共識決議**:
> SettingsPanel 分解放在 ConverterService 分解之後（避免同時有兩個大重構）。分解前需先有 E2E 或整合測試覆蓋現有行為。

---

## 優先行動計畫

根據本次討論，技術團隊同意以下優先順序：

| 優先序 | 工作 | 預估大小 | 分支命名 |
|------|------|--------|---------|
| **P0** | console.log → logger 替換 + ESLint rule | S | `fix/replace-console-with-logger` |
| **P1** | aiPanel + seo store 測試補充 | M | `test/aiPanel-seo-stores` |
| **P2** | ConverterService 拆分（含介面、logger、slug 驗證） | XL | `refactor/split-converter-service` |
| **P3** | search + server store 測試補充 | S | `test/search-server-stores` |
| **P4** | SettingsPanel 子元件提取（需 E2E 先準備） | L | `refactor/split-settings-panel` |

---

## 本次評審 vs 前次評審

| 角色 | Q4 分數 | Q5 分數 | 變化 |
|------|--------|--------|------|
| 資安 | 7.5 | 8.5 | ▲ +1.0 |
| 效能 | 8.5 | 8.5 | ─ 持平 |
| SOLID | 8.0 | 7.5 | ▼ -0.5 |
| 架構 | 7.5 | 8.0 | ▲ +0.5 |
| 品質 | 7.0 | 8.0 | ▲ +1.0 |
| 可維護性 | 8.0 | 7.5 | ▼ -0.5 |
| 加權平均 | **7.7** | **8.0** | ▲ +0.3 |

---

*第五次全面評估 — 跨角色討論 | 前次: [第四次評審討論](../2026-03-01-fourth-review/07-cross-discussion.md)*
