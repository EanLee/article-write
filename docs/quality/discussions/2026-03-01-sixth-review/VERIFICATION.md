# 問題追蹤 — 第六次全面評估

**評審日期**: 2026-03-01
**基準 Commit**: `e9b525a`
**更新日期**: 2026-03-01（所有 P0/P1 sprint 項目已完成）

---

## 🔒 資安問題

| ID | 嚴重性 | 描述 | 狀態 | 建議分支 |
|----|--------|------|------|---------|
| S6-01 | 🔴 CVSS 6.8 | ProcessService `shell: true` 命令注入 | ✅ 已修（`a5af894` 內嵌，`pnpm.cmd` 直接呼叫） | `fix/process-service-race` |
| S6-02 | 🔴 CVSS 7.1 | ConfigService safeStorage 靜默 base64 降級 | ✅ 已修（`71e69ed`） | `fix/config-safe-storage` |
| S6-03 | 🟠 CVSS 6.5 | 路徑白名單缺口（imagesDir / GitService / FileWatch） | ✅ 已修（`44a3183`） | `fix/path-whitelist-gaps` |
| S6-04 | 🟠 | validatePath fail-open（白名單空時放行） | ✅ 已修（`44a3183`） | `fix/path-whitelist-gaps` |
| S6-05 | 🟡 | sandbox: false（有技術文件支撐） | 🟡 接受現況 | — |
| S6-06 | 🟡 CVSS 4.3 | AI_SET_API_KEY provider 無 runtime 驗證 | ✅ 已修（`a5af894`，VALID_AI_PROVIDERS 白名單驗證） | `fix/path-whitelist-gaps` |
| S6-07 | 🟡 | ImageService sourcePath 未受白名單保護 | ✅ 已修（`a5af894`，importExternalFile） | P2 |
| S6-08 | 🟢 | Dev 模式 CSP unsafe-inline（正常設計） | ✅ 可接受 | — |

---

## ⚡ 效能問題

| ID | 嚴重性 | 描述 | 狀態 | 建議分支 |
|----|--------|------|------|---------|
| P6-01 | 🔴 | filteredArticles 無防抖 + zh-TW 校對排序 | ✅ 已修（`5f2fa3f`，隨 SOLID6-01） | `perf/filtered-articles-debounce` |
| P6-02 | 🔴 | SearchService O(N×L) 線性掃描，無倒排索引 | ✅ 已修（`d870ae9`） | `perf/search-trigram-index` |
| P6-03 | 🟡 | MetadataCacheService 串行 I/O | ⬜ 待修 | P2 |
| P6-04 | 🟡 | ConverterService processImages 未使用 batchCopyImages | ⬜ 待修 | P2 |
| P6-05 | 🔴 CRITICAL | ImageService O(I×A×C) + 500 IPC 炸彈 | ✅ 已修（`1bed3b4`） | `fix/image-validation-batch` |
| P6-06 | 🟡 | Vue deep watch + articles 全量替換觸發全體重算 | ⬜ 待修 | P3 |

---

## 🏗️ SOLID 問題

| ID | 嚴重性 | 原則 | 描述 | 狀態 |
|----|--------|------|------|------|
| SOLID6-01 | 🔴 | SRP | article.ts 上帝 Store（611 行 9 職責） | ✅ 已修（`5f2fa3f`） |
| SOLID6-02 | 🟡 | SRP | reloadArticle 複製 ArticleService 邏輯 | ✅ 已修（`e1417ff`，合併 A6-01） |
| SOLID6-03 | 🟡 | SRP | AutoSaveService 混合 timer 與 Vue 狀態 | ⬜ P2 |
| SOLID6-04 | 🟡 | OCP | ArticleFilterCategory enum 硬編碼 | ⬜ P3 |
| SOLID6-07 | 🟡 | LSP | AutoSaveService.initialize() 隱含前置條件 | ⬜ P3 |
| SOLID6-08 | 🔴 | ISP | window.electronAPI 肥介面（30+ 方法） | ✅ 已修（`a4c3c62`） |
| SOLID6-09 | 🟡 | ISP | Frontmatter 混合廢棄欄位 | ⬜ P3 |
| SOLID6-10 | 🔴 | DIP | article.ts 7 次直呼 window.electronAPI | ✅ 已修（`1f58dc5`） |
| SOLID6-11 | 🔴 | DIP | AutoSaveService import Vue ref | ✅ 已修（`d025d64`） |
| SOLID6-12 | 🟡 | DIP | PublishService 直接 import Node fs | ⬜ P3 |

---

## 🧱 架構問題

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| A6-01 | 🔴 | Store 雙重依賴路徑，reloadArticle 資料不一致 | ✅ 已修（`e1417ff`） |
| A6-02 | 🟠 | main.ts IPC 登錄為 God Function（~150 行） | ✅ 已修（`a5af894`，提取 registerIpcHandlers.ts） |
| A6-03 | 🟠 | migrateArticleFrontmatter fire-and-forget 競態 | ✅ 已修（`a5af894`，失敗時 notify.error()） |
| A6-04 | 🟠 | Preload 暴露低階 FS 原語，可繞過業務邏輯 | ⬜ P3 |
| A6-05 | 🟡 | ArticleFilterCategory enum（→ 同 SOLID6-04） | ⬜ P3 |
| A6-06 | 🟡 | Store nextTick/watch 在模組初始化時隱式觸發 | ⬜ P3 |

---

## 💰 AI Token 問題

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| TOKEN6-01 | 🔴 | contentPreview 直插 Prompt，Prompt 注入風險 | ✅ 已修（`2271a34`） |
| TOKEN6-02 | 🟠 | contentPreview 無程式強制截斷 | ✅ 已修（`2271a34`） |
| TOKEN6-03 | 🟡 | max_tokens=400 過於保守 | ⬜ P2 |
| TOKEN6-04 | 🟠 | 三個 Provider 缺少 429/context_length 處理 | ✅ 已修（`2271a34`） |
| TOKEN6-05 | 🟠 | AIService Anthropic dead code | ✅ 已修（`2271a34`） |
| TOKEN6-06 | 🟡 | Claude 未使用 System Prompt（無 Prefix Caching） | ⬜ P3 |
| TOKEN6-07 | 🟡 | 三個 Provider 全部阻塞式呼叫，無 Streaming | ⬜ P3 |
| TOKEN6-08 | 🟡 | 無 Token 使用量回報與成本追蹤 | ⬜ P2 |
| TOKEN6-09 | 🟡 | Prompt 範例 JSON 冗餘 30 token | ✅ 已修（`2271a34`） |

---

## ✅ 品質問題

| ID | 嚴重性 | 描述 | 狀態 |
|----|--------|------|------|
| QUAL6-01 | 🔴 | ProcessService 零測試 + hardcoded IPC channel | ✅ 已修（`420e292`） |
| QUAL6-02 | 🔴 | startDevServer() 競態計時器假就緒 | ✅ 已修（`e168a1f`） |
| QUAL6-03 | 🔴 | autoDownload = true，未改為使用者確認 | ✅ 已修（`05d5c50`） |
| QUAL6-04 | 🟠 | ConfigService 零測試（捆綁 S6-02）| ✅ 已修（`a5af894`，12 項測試） |
| QUAL6-05 | 🟠 | article.ts 611 行測試維護成本高（→ SOLID6-01）| ⬜ P3 |
| QUAL6-06 | 🟠 | ImageService 648 行，型別定義混入實作檔 | ⬜ P3 |
| QUAL6-07 | 🟠 | ProcessService hardcoded `npm run dev`（應為 pnpm）| ✅ 已修（`420e292`） |
| QUAL6-08 | 🟡 | 4 個 TODO stub 無 Issue 追蹤標記 | ⬜ P3 |
| QUAL6-09 | 🟡 | stopDevServer() 未等待 process exit | ✅ 已修（`e168a1f`） |
| QUAL6-10 | 🟡 | ProcessService 完全無 JSDoc | ⬜ P3 |

---

## 已修正（Q5 → Q6 期間）

| 問題 | 描述 | 修正 Commit |
|------|------|------------|
| CRIT-01 | FileService 路徑穿越漏洞 | 前次 Sprint |
| CRIT-02 | XSS 未防護（DOMPurify） | 前次 Sprint |
| IPC-CONST | 硬編碼 channel 字串（13 個）| 前次 Sprint |
| S5-01 | console.log 繞過 logger（29 個）| 前次 Sprint |
| Q5-02 | ESLint no-explicit-any 106 warnings | `bfddd3f` |
| AutoSave 競態 | MainEditor 雙重 timer | 前次 Sprint |

---

## 優先行動計畫（Sprint 分配建議）

### 安全優先 Sprint（P0 + P1 安全项）

| 工作項 | 問題 | 工時 |
|------|------|------|
| autoDownload 改使用者確認 | QUAL6-03 | 2h |
| ProcessService IPC 常數 + pnpm | QUAL6-01, QUAL6-07 | 1h |
| Prompt XML 邊界 + contentPreview 截斷 + dead code | TOKEN6-01/02/05 | 1.5h |
| tests/main/ 基礎設施 | 架構 | 2h |
| ConfigService 修復 + 測試（S6-02 捆綁）| S6-02, QUAL6-04 | 7h |
| 路徑白名單缺口（S6-03/04/06）| 安全 | 3.5h |

### 效能 Sprint（ImageService + Search）

| 工作項 | 問題 | 工時 |
|------|------|------|
| ImageService 批次正則掃描 hotfix | P6-05 | 0.5h |
| ProcessService Bug 修復 + 測試 | QUAL6-02/09/01 | 7h |
| A6-01 reloadArticle 統一委派 | A6-01 | 2h |
| TOKEN6-04 Rate Limit 處理 | TOKEN6-04 | 2h |
| Main 進程批次 IPC handler | P6-05 | 4h |
| SearchService trigram index（TDD）| P6-02 | 8h |

### 架構 Sprint（長期整理）

| 工作項 | 問題 | 工時 |
|------|------|------|
| main.ts IPC domain 拆分 | A6-02 | 6h |
| AutoSaveService 解除 Vue 耦合 | SOLID6-11 | 4h |
| article.ts useArticleFilter composable | SOLID6-01 | 6h |
| filteredArticles 防抖 + 排序鍵快取 | P6-01 | 3h |
| MetadataCacheService Promise.all | P6-03 | 2h |
| ImageService 型別抽離 types/image.ts | QUAL6-06 | 2h |

---

*前次問題追蹤: [第五次 VERIFICATION.md](../2026-03-01-fifth-review/VERIFICATION.md)*
