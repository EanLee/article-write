# 第五次全面評審 — 問題追蹤驗證表

**狀態基準**: commit `3fbb641` (2026-03-01)
**評審日期**: 2026-03-01

---

## 上次評審問題確認（第四次 → 已修正）

| 問題 ID | 描述 | 狀態 | 修正 Commit |
|--------|------|------|------------|
| Q4-TS | TypeScript 12 個型別錯誤 | ✅ 已修正 | TS-ZERO branch |
| Q4-M01 | 錯誤訊息英中混用（6 個服務） | ✅ 已修正 | `339d4fa` |
| Q4-M07 | aiPanel store 直接依賴 useArticleStore | ✅ 已修正 | `5639ce1` |
| Q4-SOLID-AppConfig | AppConfig 型別雙來源 | ✅ 已修正 | 前次評審 |
| Q4-SOLID-FileService | stopWatching 職責混合 | ✅ 已修正 | 前次評審 |
| Q4-ERR-article | "Article not found" 英文 | ✅ 已修正 | `339d4fa` |
| Q4-PERF-ImageManager | 大量圖片無虛擬捲動 | ✅ 已修正 | 前次評審 |
| Q4-ARCH-SearchStore | search store 架構 | ✅ 已修正 | 前次評審 |

---

## 本次評審新問題（待修正）

### 資安問題

| 問題 ID | 嚴重度 | 描述 | 狀態 | 建議分支 |
|--------|--------|------|------|---------|
| S5-01 | 🔴 高 | 29 個 console 呼叫繞過 logger.ts，production 可見敏感路徑 | ✅ 已修正 `18549ea` | `fix/replace-console-with-logger` |
| S5-02 | 🟠 中 | ConverterService slug/path 輸入驗證缺口 | ✅ 已修正 `68ca085` | `refactor/split-converter-service` |

### 效能問題

| 問題 ID | 嚴重度 | 描述 | 狀態 | 建議分支 |
|--------|--------|------|------|---------|
| P5-01 | 🟠 中 | SettingsPanel.vue 941行，v-show 全 tab 渲染 | ✅ 已修正 `2971709` | `refactor/split-settings-panel` |
| P5-02 | 🟠 中 | 批次圖片轉換使用 Promise.all，無 concurrency 上限 | ✅ 已修正 `68ca085` | `refactor/split-converter-service` |
| P5-03 | 🟡 低 | MetadataCacheService 無 TTL，快取可能無限成長 | ✅ 已修正 `94566c9` | `fix/metadata-cache-ttl` |

### SOLID 問題

| 問題 ID | 嚴重度 | 描述 | 狀態 | 建議分支 |
|--------|--------|------|------|---------|
| SOLID5-01 | 🔴 高 | ConverterService.ts 988行，5+ 職責 SRP 違反 | ✅ 已修正 `68ca085` | `refactor/split-converter-service` |
| SOLID5-02 | 🟠 中 | SettingsPanel.vue 941行，5 設定域 SRP 違反 | ✅ 已修正 `2971709` | `refactor/split-settings-panel` |

### 架構問題

| 問題 ID | 嚴重度 | 描述 | 狀態 | 建議分支 |
|--------|--------|------|------|---------|
| A5-01 | 🟡 中 | ConverterService 缺少 IConverterService 介面 | ✅ 已修正 `68ca085` | `refactor/split-converter-service` |
| A5-02 | 🟡 中 | aiPanel/search/seo/server 4 個 store 零測試覆蓋 | ✅ 已修正 `bdebbca` `8250f73` | `test/aiPanel-seo-stores` |

### 品質問題

| 問題 ID | 嚴重度 | 描述 | 狀態 | 建議分支 |
|--------|--------|------|------|---------|
| Q5-01 | 🔴 高 | 29 個 console.log 繞過 logger（同 S5-01） | ✅ 已修正 `18549ea` | `fix/replace-console-with-logger` |
| Q5-02 | ✅ 完成 | 106 個 ESLint no-explicit-any 警告積累於測試 | ✅ `bfddd3f` — 0 warnings（3 pre-existing v-html 保留） | 消除所有 any |

### 可維護性問題

| 問題 ID | 嚴重度 | 描述 | 狀態 | 建議分支 |
|--------|--------|------|------|---------|
| M5-01 | 🔴 高 | ConverterService.ts 988行最難維護（同 SOLID5-01） | ✅ 已修正 `68ca085` | `refactor/split-converter-service` |
| M5-02 | 🟡 中 | 4 store + 3 service 無測試覆蓋（同 A5-02） | ✅ 已修正 `bdebbca` `8250f73` | `test/aiPanel-seo-stores` |

---

## 問題彙整（去重後）

實際需要處理的獨立工作：

| 優先序 | 工作 | 涵蓋問題 | 狀態 | Commit |
|------|------|---------|------|--------|
| P0 | console.log → logger 替換 + ESLint rule | S5-01, Q5-01 | ✅ 已完成 | `18549ea` |
| P1 | aiPanel + seo store 測試 | A5-02, M5-02 (部分) | ✅ 已完成 | `bdebbca` |
| P2 | ConverterService 拆分（含介面 + logger + 驗證）| SOLID5-01, A5-01, S5-02, P5-02, M5-01 | ✅ 已完成 | `68ca085` |
| P3 | search + server store 測試 | A5-02, M5-02 (全) | ✅ 已完成 | `8250f73` |
| P4 | SettingsPanel 子元件提取 | SOLID5-02, P5-01 | ✅ 已完成 | `2971709` |
| P5 | MetadataCacheService TTL | P5-03 | ✅ 已完成 | `94566c9` |
| 持續 | ESLint any 警告清理 | Q5-02 | ✅ 0 warnings | — |

---

## 基準線指標

| 指標 | Q4 | Q5 起始 | Q5 完成後 |
|------|----|---------|---------|
| TypeScript 錯誤 | 12 | **0** | **0** |
| 測試通過數 | 373 | **424** | **569** (+145) |
| 測試檔案數 | — | **N/A** | **43 files** |
| ESLint errors | 0 | **0** | **0** |
| ESLint warnings | ~80 | **106** | **77** (-29) |
| console 違規次數 | N/A | **29** | **0** ✅ |
| 最大模組行數 | ~820 | **988 (ConverterService)** | **~235 (SettingsPanel)** |
| MetadataCache TTL | 無 | **無** | **5 分鐘** ✅ |
| 加權評分 | 7.7 | **8.0** | **8.5+（估）** |
