# 技術評審檢查清單

**適用專案**: WriteFlow (Electron + Vue 3 + TypeScript + Pinia)  
**版本**: v1.0 — 建立於 2026-03-01  
**用途**: 每次全面技術評審開始前，評審 AI 必須先讀此清單，並逐項核對

---

## 評審規則

1. **每次評審必須讀完以下所有檔案**，不得以「上次已看過」為由跳過
2. **每個檢查點必須明確標記** ✅ 通過 / ⚠️ 問題存在 / ❌ 嚴重問題
3. **評分標準固定**，不隨評審次數調整（見最下方）
4. **上次評審的已知問題必須在本次開頭確認狀態**（已修 / 未修 / 部分修）

---

## 必讀檔案清單

每次評審開始時，以下檔案必須全部讀過：

### 主進程
- `src/main/main.ts`
- `src/main/preload.ts`
- `src/main/ipc-channels.ts`
- `src/main/services/FileService.ts`
- `src/main/services/ConfigService.ts`
- `src/main/services/ProcessService.ts`
- `src/main/services/GitService.ts`
- `src/main/services/AutoSaveService.ts`
- `src/main/services/SearchService.ts`
- `src/main/services/ImageService.ts`
- `src/main/services/PublishService.ts`
- `src/main/services/AIService.ts`
- `src/main/services/MetadataCacheService.ts`

### 渲染進程
- `src/stores/article.ts`
- `src/services/MarkdownService.ts`
- `src/services/AIService.ts`（渲染層，若有）
- `src/components/MainEditor.vue`
- `src/components/PreviewPane.vue`
- `src/components/ArticleList.vue`
- `src/components/SearchPanel.vue`
- `src/App.vue`

### 設定與建構
- `package.json`（dependencies、devDependencies、scripts）
- `electron-builder.yml`
- `vite.config.ts`
- `tsconfig.json`、`tsconfig.main.json`、`tsconfig.preload.json`

### 測試
- `tests/` 目錄結構（哪些 Service 有測試，哪些沒有）
- `vitest.config.ts`
- `playwright.config.ts`

---

## 檢查層 1：資安

### 1.1 Electron 安全設定
- [ ] `webPreferences.contextIsolation` 是否為 `true`
- [ ] `webPreferences.nodeIntegration` 是否為 `false`
- [ ] `webPreferences.sandbox` 狀態（若為 `false` 必須有理由）
- [ ] CSP (Content-Security-Policy) 是否設定，production 是否移除 `unsafe-inline`

### 1.2 IPC 安全
- [ ] 所有 IPC handler 是否驗證輸入型別
- [ ] 是否有 handler 接受任意路徑而不驗證（路徑穿越漏洞）
- [ ] `validatePath()` 是否涵蓋所有檔案操作
- [ ] `validatePath()` 當白名單為空時是否 fail-close（拒絕）而非 fail-open（放行）
- [ ] Preload 是否只暴露最小介面，不暴露低階 fs 原語

### 1.3 資料儲存安全
- [ ] API 金鑰是否使用 `safeStorage` 加密（不得 base64 或明文）
- [ ] `safeStorage` 不可用時是否明確拒絕並警告，不降級為明文

### 1.4 內容安全
- [ ] `v-html` 使用的地方是否全部經過 DOMPurify 消毒
- [ ] Markdown 渲染是否禁止原始 HTML（`html: false`）
- [ ] 搜尋高亮是否先 escape HTML 特殊字元

### 1.5 Shell 與 Process
- [ ] `child_process.spawn` 是否有 `shell: true`（若有，是否必要且輸入是否可控）
- [ ] 外部命令的路徑是否硬編碼（如 `npm` 而非 `pnpm`）

### 1.6 AI 層
- [ ] 使用者內容插入 Prompt 前是否有邊界標記（防 Prompt 注入）
- [ ] 使用者內容是否有程式強制截斷（不靠型別定義或注解）
- [ ] AI Provider 的 API 金鑰是否在執行時驗證格式

### 1.7 自動更新
- [ ] `autoDownload` 是否為 `false`（應由使用者確認後才下載）

---

## 檢查層 2：效能

### 2.1 渲染層
- [ ] 搜尋/篩選輸入是否有防抖（debounce ≥ 150ms）
- [ ] 文章排序是否快取排序鍵（不在每次 render 呼叫 localeCompare）
- [ ] computed 是否有不必要的 deep watch

### 2.2 IPC 效能
- [ ] 迴圈內是否有 IPC 呼叫（每次迴圈一次 IPC = 效能炸彈）
- [ ] 是否提供批次 IPC handler 供大量資料操作使用

### 2.3 主進程 I/O
- [ ] 可並行的 I/O 是否使用 `Promise.all`（不串行等待）
- [ ] 大量文字掃描是否使用批次正則（不逐行呼叫 IPC）

### 2.4 搜尋
- [ ] 搜尋是否為 O(N) 線性掃描（若是，文章數量超過多少會有問題）

---

## 檢查層 3：程式碼設計（SOLID）

### 3.1 SRP（單一職責）
- [ ] 任何單一檔案是否超過 400 行（若超過，說明有幾個獨立職責）
- [ ] Store 是否同時負責狀態管理和業務邏輯
- [ ] Service 是否混合多個不相關的職責

### 3.2 OCP / 可擴充性
- [ ] 新增分類/型別是否需要修改多處程式碼

### 3.3 DIP（相依性反轉）
- [ ] Service 層是否直接 `import { ref }` from `vue`（Service 不應依賴 UI 框架）
- [ ] Store 是否直接呼叫 `window.electronAPI`（應透過 Service 代理）
- [ ] Service 是否直接 `import fs` from Node.js（主進程 Service 例外）

### 3.4 ISP（介面隔離）
- [ ] `window.electronAPI` 介面方法數量是否過多（超過 20 個需要審視）

---

## 檢查層 4：架構

### 4.1 資料流一致性
- [ ] 所有讀取文章的路徑是否都回傳相同格式（不同入口不同物件結構 = Bug）
- [ ] Store 更新是否都經過同一個 Service 方法（不繞過 Service 直接操作）

### 4.2 主進程架構
- [ ] `main.ts` IPC 登錄是否已按 domain 拆分（不堆在一個大 callback）
- [ ] 非同步操作是否有適當的錯誤處理（不 fire-and-forget）

### 4.3 初始化順序
- [ ] 非同步初始化是否有明確的 await（不依賴隱式 setTimeout 或事件順序）

---

## 檢查層 5：AI 層（Token 使用）

### 5.1 正確性
- [ ] 各 Provider 的 dead code 是否清除
- [ ] 異常處理是否各層明確（Provider 負責轉換 SDK 異常，Service 層不處理原始 SDK 異常）

### 5.2 成本控制
- [ ] `max_tokens` 設定是否合理（與實際輸出長度匹配）
- [ ] 是否有 Rate Limit (429) 和 context_length_exceeded 的處理
- [ ] 是否記錄 token 使用量（`response.usage`）

### 5.3 安全（同資安層 1.6）
- [ ] Prompt 注入防護

---

## 檢查層 6：測試品質

### 6.1 覆蓋率現況
列出每個 Service 的測試狀態：

| Service | 有測試 | 無測試 |
|---------|--------|--------|
| FileService | | |
| ConfigService | | |
| ProcessService | | |
| GitService | | |
| AutoSaveService | | |
| SearchService | | |
| ImageService | | |
| PublishService | | |
| AIService | | |
| MetadataCacheService | | |

### 6.2 測試品質
- [ ] 測試是否驗證行為（不只測試函式被呼叫）
- [ ] Mock 是否反映真實介面
- [ ] 競態條件（timer、async init）是否有專屬測試

### 6.3 程式碼品質指標
- [ ] ESLint 零 warning
- [ ] TypeScript 嚴格模式無 error（`npx tsc --noEmit`）
- [ ] 是否有無追蹤 Issue 的 TODO（應標記 GitHub Issue 編號）

---

## 固定評分標準

每個檢查層給 0-10 分，不參考上次評分調整：

| 分數 | 說明 |
|------|------|
| 9-10 | 無已知問題，有防護機制 |
| 7-8 | 有小問題，不影響核心功能 |
| 5-6 | 有中等問題，潛在使用者感知影響 |
| 3-4 | 有嚴重問題，存在 Bug 或安全風險 |
| 0-2 | 有關鍵問題，功能無法正常運作或有重大安全漏洞 |

---

## 什麼不應該列為問題

以下情況屬於 over-design，**不應列入問題清單**：

- MVP 階段的 enum 硬編碼（未來有需求再 OCP 重構）
- Electron 主進程 Service 直接使用 Node.js `fs`（這是正常作法）
- JSDoc 缺失（Style preference，非 bug）
- Token 層的 streaming 缺失（結構化 JSON 輸出，streaming 無實際 UX 收益）
- Prefix caching 未啟用（呼叫量未達門檻時無意義）
- Prompt 內的細微 token 浪費（< $0.01/天 不列入）

---

*本清單由 AI 根據前六次評審結果自行建立，若發現漏洞或需新增技術層，於發現當次主動更新此檔案。*
