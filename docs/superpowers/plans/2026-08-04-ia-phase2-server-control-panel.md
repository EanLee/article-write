# IA Phase 2 第一項：ServerControlPanel 掛載 實作計畫

**Goal:** 把目前完全孤立的 `ServerControlPanel.vue` 掛載進編輯模式，成為橫跨側邊欄＋編輯區、預設收合的底部控制台，並修掉其既有的 logger 未 import 的 runtime bug。
**Architecture:** 不新增 store/IPC/包裝元件；直接在 `App.vue` 的 Editor Mode 區塊加一行 `v-if` 掛載，`ServerControlPanel.vue` 本身只改兩個既有預設值。
**Tech Stack:** Vue 3 `<script setup>`、Vitest + `@vue/test-utils`（unit）、Playwright（e2e）
**Spec:** `docs/engineering/discussions/2026-08-04-ia-phase2-server-control-panel-integration.md`

---

### Task 1：ServerControlPanel 元件修正

**Files:**
- Modify: `src/components/ServerControlPanel.vue`
- Test: `tests/components/ServerControlPanel.test.ts`（create）

- [x] Step 1：建立 `tests/components/ServerControlPanel.test.ts`，沿用 `tests/components/ArticleManagement.list.test.ts` 的 `Object.defineProperty(window, "electronAPI", {...})` mock 慣例，撰寫 3 個案例：(a) mount 後 `expanded` 為 `false`（可從 log 面板 DOM 是否存在間接驗證，不直接讀 component internal state）(b) mock `startDevServer` reject → 觸發 `startServer()` 後不拋出未捕捉例外，且 log 容器出現錯誤訊息 (c) mock `stopDevServer` reject → 同上
- [x] Step 2：執行測試確認失敗 — `npx vitest run tests/components/ServerControlPanel.test.ts`，Expected: FAIL（`expanded` 目前預設 `true`；`logger` 未 import 會讓 (b)(c) 直接拋出 ReferenceError）。實測：3 個案例皆如預期失敗；(c) 案例最初因缺少斷言而誤判通過，補上 `process.on("unhandledRejection", ...)` 追蹤後才驗證出真正的 RED
- [x] Step 3：修正 `ServerControlPanel.vue`：新增 `import { logger } from "@/utils/logger"`；`const expanded = ref(true)` 改為 `const expanded = ref(false)`
- [x] Step 4：執行測試確認通過 — `npx vitest run tests/components/ServerControlPanel.test.ts`，Expected: PASS（3 tests）。實測：PASS (3)
- [x] Step 5：Commit — `git commit -m "fix(server-control-panel): 補上 logger import 並修正預設收合狀態"`

### Task 2：App.vue 掛載與 E2E 驗證

**Files:**
- Modify: `src/App.vue`
- Test: `tests/e2e/server-control-panel.spec.ts`（create）

- [x] Step 1：建立 `tests/e2e/server-control-panel.spec.ts`，撰寫 3 個案例：(a) 進入編輯模式後底部控制台的常駐控制列可見，且日誌面板預設不可見（收合） (b) 點擊展開按鈕後日誌面板可見 (c) 切換到管理模式後底部控制台整個消失。實作時另補上 `data-testid`（server-control-panel / server-panel-toggle / server-panel-log）供穩定選取
- [x] Step 2：執行單一測試確認失敗 — `npx playwright test tests/e2e/server-control-panel.spec.ts`，Expected: FAIL（`ServerControlPanel` 尚未掛載，對應 DOM 選取不到）。實測：3 個案例皆如預期失敗
- [x] Step 3：修改 `App.vue`：在 Editor Mode 區塊（`SideBarView` + `<main>` 的 flex row）之後、同一個 Main Content Area flex-col 內，加入 `<ServerControlPanel v-if="currentMode === ViewMode.Editor" />`；補上對應 import
- [x] Step 4：執行測試確認通過 — `npx playwright test tests/e2e/server-control-panel.spec.ts`，Expected: PASS（3 tests）。實測：PASS (3)
- [x] Step 5：Commit — `git commit -m "feat(editor): 將 ServerControlPanel 掛載進編輯模式底部控制台"`

### Task 3：全量驗證

**Files:**
- （無新增/修改檔案，純驗證）

- [x] Step 1：執行完整單元測試 — `pnpm run test`，Expected: PASS（0 failures）。實測：687 passed | 1 skipped（既有跳過案例，與本次無關）
- [x] Step 2：執行完整 E2E 套件 — `pnpm run test:e2e`，Expected: PASS（0 failures）。實測：31 passed | 1 skipped（既有跳過案例，與本次無關）
- [x] Step 3：執行 Lint — `pnpm run lint`，Expected: 0 errors。實測：0 errors, 23 warnings（皆為既有檔案的既存警告，非本次改動）
- [x] Step 4：確認範圍外項目未被誤動——`git diff develop..HEAD --stat` 只包含 `ServerControlPanel.vue`、`App.vue`、兩支測試檔與 spec/plan 文件。實測：6 files changed，完全符合預期範圍
