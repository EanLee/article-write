# 問題追蹤 — 第七次全面評估

**評審日期**: 2026-03-02  
**基準狀態**: 第六次 Sprint 所有 P0/P1 已完成  
**前次問題追蹤**: [第六次 VERIFICATION.md](../2026-03-01-sixth-review/VERIFICATION.md)

---

## 🔒 資安問題

### 新發現（Q7）

| ID | 嚴重性 | 描述 | 狀態 | 建議分支 |
|----|--------|------|------|---------|
| S7-01 | 🟠 CVSS 6.3 | GitService.repoPath 無路徑白名單驗證，Renderer 可傳任意 cwd 給 git 命令 | ⬜ 待修 | `fix/git-service-path-validation` |
| S7-02 | 🟡 CVSS 3.7 | ConfigService.getApiKey 加密不可用時靜默返回亂碼（setApiKey fail-close 但 getApiKey 返回損毀值）| ⬜ 待修（搭 QUAL7-04）| `fix/config-service-async` |
| S7-03 | 🟢 CVSS 2.1 | AppConfigSchema 路徑未驗證是否為絕對路徑（FileService 有縱深防禦）| 🟡 可選修 | — |

### 維持現況

| ID | 描述 | 決策 |
|----|------|------|
| S6-05 | sandbox: false | ✅ 接受現況（有技術文件）|
| S6-08 | Dev CSP unsafe-inline | ✅ 接受現況 |

---

## ⚡ 效能問題

### 遺留（Q6→Q7 仍待修）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| P6-03 | 🟡 | MetadataCacheService 串行 I/O | ⬜ 待修（P2，搭入下 Sprint）|
| P6-04 | 🟡 | ConverterService processImages 未使用 batchCopyImages | ⬜ 待修（P2）|
| P6-06 | 🟡 | Vue deep watch + articles 全量替換觸發全體重算 | ⬜ 待修（P3）|

### 新發現（Q7）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| P7-01 | 🟢 | ProcessService.stopDevServer 懸空 setTimeout，正常退出後 5 秒 timer 仍在佇列 | ⬜ 待修（P3）|

### 接受現況

| ID | 描述 | 決策 |
|----|------|------|
| P7-03 | SearchService 短查詢（<3字元）線性掃描 | ✅ 接受現況（文章 >1000 篇時重評，當前規模無影響）|

---

## 🏗️ SOLID 問題

### 遺留（Q6→Q7 仍待修）

| ID | 嚴重性 | 原則 | 描述 | 狀態 |
|----|--------|------|------|------|
| SOLID6-03 | 🟡 | SRP | AutoSaveService 混合 timer 與狀態職責 | ⬜ P3（重新評估拆分成本 > 收益，降級觀察）|
| SOLID6-04 | 🟡 | OCP | ArticleFilterCategory enum 硬編碼 | ⬜ P3 |
| SOLID6-07 | 🟡 | LSP | AutoSaveService.initialize() 隱含前置條件 | ⬜ P3 |
| SOLID6-09 | 🟡 | ISP | Frontmatter 混合廢棄欄位 | ⬜ P3 |
| SOLID6-12 | 🟡 | DIP | PublishService 直接 import Node fs | ⬜ P3 |

### 新發現（Q7）

| ID | 嚴重性 | 原則 | 描述 | 狀態 |
|----|--------|------|------|------|
| SOLID7-01 | 🟡 | DIP | ConfigService 建構子硬連結 Electron 環境（app.getPath 無法注入）| ⬜ 待修（P2，搭 QUAL7-04）|

---

## 🧱 架構問題

### 遺留（Q6→Q7 仍待修）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| A6-04 | 🟡 | Preload 暴露低階 FS 原語，可繞過業務邏輯 | ✅ **改為接受現況**（FileService 白名單提供縱深防禦，改動成本高收益低）|
| A6-05 | 🟡 | ArticleFilterCategory enum（同 SOLID6-04）| ⬜ P3 |
| A6-06 | 🟡 | Store nextTick/watch 隱式觸發 | ⬜ P3 |

### 新發現（Q7）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| A7-01 | 🟠 | GitService 缺少架構邊界接入（路由層直接轉發 repoPath）與 S7-01 同根源 | ⬜ 待修（同 S7-01 分支）|
| A7-02 | 🟡 | registerIpcHandlers 混入業務協調邏輯（FileWatch + SearchService 更新）| ⬜ P3 觀察，超過 200 行時拆分 |

---

## 💰 AI Token 問題

### 遺留（Q6→Q7 仍待修）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| TOKEN6-03 | 🟡 | max_tokens=400 過於保守，複雜輸出可能截斷 | ⬜ 待修（P2，改為 600）|
| TOKEN6-06 | 🟡 | Claude 未使用 System Prompt（無 Prefix Caching）| ⬜ P3 |
| TOKEN6-07 | 🟡 | 三個 Provider 全部阻塞式呼叫，無 Streaming | ⬜ P3 |
| TOKEN6-08 | 🟡 | 無 Token 使用量回報與成本追蹤 | ⬜ P2 |

### 新發現（Q7）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| TOKEN7-01 | 🟢 | title 欄位無長度截斷（XML 標記外，異常長標題增加 Token 消耗）| ⬜ 待修（一行 `.slice(0, 200)`，搭 TOKEN6-03）|
| TOKEN7-02 | 🟡 | 三個 Provider 模型名稱硬編碼，棄用時需修改程式碼 | ⬜ P3（提取 ai-config.ts 常數）|

---

## ✅ 品質問題

### 遺留（Q6→Q7 仍待修）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| QUAL6-05 | 🟡 | article.ts 測試維護成本 | ✅ **降級為觀察**（SOLID6-01 拆分後行數降低，核心 Store 責任更清晰）|
| QUAL6-06 | 🟠 | ImageService 648 行，型別定義混入實作 | ⬜ P3 |
| QUAL6-08 | 🟡 | 4 個 TODO stub 無 Issue 追蹤標記 | ⬜ P3 |
| QUAL6-10 | 🟡 | ProcessService 完全無 JSDoc | ⬜ P3（有行內注解，無方法級 JSDoc）|

### 新發現（Q7）

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| QUAL7-01 | 🟢 | ProcessService.stopDevServer 懸空 setTimeout（同 P7-01）| ⬜ P3 |
| QUAL7-02 | 🟡 | AutoSaveService 單例（autoSaveService）跨測試狀態污染風險 | ⬜ P2（測試配置加 afterEach destroy）|
| QUAL7-03 | 🟢 | IPC Channel 常數化確認完整（無殘留硬編碼）| ✅ 健康，本次確認 |
| QUAL7-04 | 🟡 | ConfigService 同步/非同步 I/O 不一致（setApiKey/getApiKey 用 readFileSync）| ⬜ P2（搭 SOLID7-01 改為 async + 注入）|

---

## 已關閉項目（Q7 決策）

| 問題 | 描述 | 決策 |
|------|------|------|
| A6-04 | Preload 暴露低階 FS 原語 | 接受現況（縱深防禦足夠）|
| P7-03 | SearchService 短查詢線性掃描 | 接受現況（規模 < 1000 篇無影響）|
| QUAL6-05 | article.ts 測試維護 | 降級觀察（SOLID6-01 修復後已改善）|


