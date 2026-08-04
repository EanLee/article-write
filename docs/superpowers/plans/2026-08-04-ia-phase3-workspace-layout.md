# IA Phase 3 子專案 1：三欄工作區骨架與 Inspector 實作計畫

**Goal:** 把編輯模式改成三欄（Navigator／Editor／Inspector），新建 `InspectorView.vue` 整合屬性（Frontmatter 內聯編輯）／AI 助手／發布三個頁籤，取代現有的獨立 AI 面板、Frontmatter Modal、底部發布控制台。
**Architecture:** 三個既有元件（`AIPanelView.vue`／`FrontmatterEditor.vue`／`ServerControlPanel.vue`）各自拆出「內容」邏輯成新元件，外殼（寬度/resize/折疊）統一交給新建的 `InspectorView.vue`；`aiPanel` store 拆成 `inspector`（面板開關）與 `seoResult`（SEO 結果暫存）兩個 store。
**Tech Stack:** Vue 3 `<script setup>`、Pinia、Vitest + `@vue/test-utils`（unit）、Playwright（e2e）
**Spec:** `docs/engineering/discussions/2026-08-04-ia-phase3-workspace-layout-inspector.md`

---

### Task 1：拆分 aiPanel store

**Files:**
- Create: `src/stores/inspector.ts`（`useInspectorStore`：`isOpen`/`toggle`/`open`/`close`）
- Create: `tests/stores/inspector.test.ts`
- Modify: `src/stores/aiPanel.ts` → 重新命名為 `src/stores/seoResult.ts`（`useSeoResultStore`：只保留 `seoResult`/`seoError`/`generateSEO`/`applySEOResult`/`clearSEO`）
- Modify: `tests/stores/aiPanel.test.ts` → 重新命名為 `tests/stores/seoResult.test.ts`

- [ ] Step 1：建立 `tests/stores/inspector.test.ts`，把既有 `tests/stores/aiPanel.test.ts` 裡「初始狀態: isOpen」與「Panel 開關操作」兩組（共 6 案例）搬過來，改用 `useInspectorStore`
- [ ] Step 2：執行測試確認失敗 — `npx vitest run tests/stores/inspector.test.ts`，Expected: FAIL（`@/stores/inspector` 尚不存在）
- [ ] Step 3：建立 `src/stores/inspector.ts`，只含 `isOpen`/`toggle`/`open`/`close`
- [ ] Step 4：執行測試確認通過 — Expected: PASS（6 tests）
- [ ] Step 5：把 `src/stores/aiPanel.ts` 改名為 `src/stores/seoResult.ts`，`useAIPanelStore` 改名 `useSeoResultStore`，移除 `isOpen`/`toggle`/`open`/`close`
- [ ] Step 6：把 `tests/stores/aiPanel.test.ts` 改名為 `tests/stores/seoResult.test.ts`，移除已搬移的「初始狀態: isOpen」與「Panel 開關操作」兩組，其餘改用 `useSeoResultStore`
- [ ] Step 7：執行測試確認通過 — `npx vitest run tests/stores/seoResult.test.ts`，Expected: PASS（17 tests）
- [ ] Step 8：Commit — `git commit -m "refactor(stores): 拆分 aiPanel store 為 inspector（開關）與 seoResult（SEO 暫存）"`

### Task 2：抽出 AIPanelContent.vue

**Files:**
- Create: `src/components/AIPanelContent.vue`（原 `AIPanelView.vue` 的 SEO 生成等內容邏輯，改用 `useSeoResultStore`，移除外框 CSS）
- Modify: `src/components/AIPanelView.vue`（暫時改為只是 `AIPanelContent` 的薄外殼包裝，維持現有 E2E 測試通過，供後續 Task 6 整批替換前的過渡態）
- Test: 沿用既有 `tests/e2e/ai-panel.spec.ts`（此 task 不改測試，用來驗證抽取後行為不變）

- [ ] Step 1：執行既有 E2E 確認現況綠燈 — `npx playwright test tests/e2e/ai-panel.spec.ts`，Expected: PASS（3 tests，作為抽取前的基準線）
- [ ] Step 2：建立 `AIPanelContent.vue`，把 `AIPanelView.vue` 的 SEO 生成區塊與相關邏輯搬入，改為呼叫 `useSeoResultStore`；`AIPanelView.vue` 改為單純渲染 `<AIPanelContent>` 並保留原本外框（border/width/resize-handle/`data-testid="ai-panel"`）
- [ ] Step 3：執行 E2E 確認行為不變 — `npx playwright test tests/e2e/ai-panel.spec.ts`，Expected: PASS（3 tests）
- [ ] Step 4：Commit — `git commit -m "refactor(ai-panel): 抽出 AIPanelContent.vue，AIPanelView 暫為過渡外殼"`

### Task 3：抽出 PublishTab.vue

**Files:**
- Create: `src/components/PublishTab.vue`（原 `ServerControlPanel.vue` 內容邏輯：狀態列/日誌/啟停按鈕，移除外框 CSS 與 `data-testid="server-control-panel"`）
- Modify: `src/components/ServerControlPanel.vue`（暫時改為 `PublishTab` 的薄外殼包裝，維持過渡態）
- Test: 沿用既有 `tests/components/ServerControlPanel.test.ts`、`tests/e2e/server-control-panel.spec.ts`

- [ ] Step 1：執行既有測試確認現況綠燈 — `npx vitest run tests/components/ServerControlPanel.test.ts` 與 `npx playwright test tests/e2e/server-control-panel.spec.ts`，Expected: PASS（作為基準線）
- [ ] Step 2：建立 `PublishTab.vue`，搬入內容邏輯；`ServerControlPanel.vue` 改為單純渲染 `<PublishTab>` 並保留外框
- [ ] Step 3：執行測試確認行為不變 — Expected: PASS（unit 4 tests、e2e 3 tests）
- [ ] Step 4：Commit — `git commit -m "refactor(publish): 抽出 PublishTab.vue，ServerControlPanel 暫為過渡外殼"`

### Task 4：新建 PropertiesTab.vue（Frontmatter 內聯編輯）

**Files:**
- Create: `src/components/PropertiesTab.vue`（改寫自 `FrontmatterEditor.vue` 的表單欄位邏輯：標題/slug/日期/分類/標籤/關鍵字，內聯樣式、無 Modal 遮罩、無 `v-model` 開關，掛載即顯示）
- Create: `tests/components/PropertiesTab.test.ts`

- [ ] Step 1：撰寫 `tests/components/PropertiesTab.test.ts`，涵蓋：(a) 傳入文章後表單欄位顯示對應值 (b) 修改標題欄位觸發 `articleStore` 更新 (c) 新增/移除標籤 (d) 無文章時顯示空狀態
- [ ] Step 2：執行測試確認失敗 — `npx vitest run tests/components/PropertiesTab.test.ts`，Expected: FAIL（元件不存在）
- [ ] Step 3：建立 `PropertiesTab.vue`，參考 `FrontmatterEditor.vue` 的 `updateSlug`/`addTag`/`removeTag`/`addKeyword`/`removeKeyword`/`handleSave` 邏輯，改為即時寫回（不需等待「儲存」按鈕，比照內聯編輯慣例：欄位 blur 或 change 時即呼叫 `articleStore` 更新）
- [ ] Step 4：執行測試確認通過 — Expected: PASS（4+ tests）
- [ ] Step 5：Commit — `git commit -m "feat(properties): 新建 PropertiesTab.vue 內聯 Frontmatter 編輯元件"`

### Task 5：新建 InspectorView.vue 外殼

**Files:**
- Create: `src/components/InspectorView.vue`（外殼：寬度/resize-handle/折疊狀態接 `useInspectorStore`/內部 3 頁籤切換）
- Create: `tests/components/InspectorView.test.ts`

- [ ] Step 1：撰寫 `tests/components/InspectorView.test.ts`，涵蓋：(a) `inspectorStore.isOpen` 為 true 時可見、false 時不可見 (b) 預設頁籤為「屬性」 (c) 點擊頁籤切換顯示對應子元件 (d) 折疊按鈕呼叫 `inspectorStore.toggle()`
- [ ] Step 2：執行測試確認失敗 — Expected: FAIL（元件不存在）
- [ ] Step 3：建立 `InspectorView.vue`，內部渲染 `<PropertiesTab>`／`<AIPanelContent>`／`<PublishTab>` 三選一，resize 邏輯比照 `AIPanelView.vue` 現有實作
- [ ] Step 4：執行測試確認通過 — Expected: PASS（4+ tests）
- [ ] Step 5：Commit — `git commit -m "feat(inspector): 新建 InspectorView.vue 外殼，整合三個頁籤"`

### Task 6：App.vue 佈線與舊掛載點清理

**Files:**
- Modify: `src/App.vue`（移除 `AIPanelView`/`ServerControlPanel` 掛載，改掛 `InspectorView`；`aiPanelStore` 改為 `inspectorStore`）
- Modify: `src/components/ActivityBar.vue`（AI 按鈕改為觸發 `inspectorStore.toggle()`，`title`/圖示調整為「Inspector」語意）
- Modify: `src/components/SideBarView.vue`（移除「文章資訊」頁籤與 `FrontmatterView` 掛載，`SidebarView` 只剩文章列表/大綱）
- Modify: `src/components/MainEditor.vue`（移除 `FrontmatterEditor` 掛載與 `showFrontmatterEditor`/`openFrontmatterEditor` 相關程式碼）
- Modify: `src/types/index.ts`（`SidebarView` enum 移除 `Frontmatter`）

- [ ] Step 1：修改 `App.vue`：`import ServerControlPanel`/`import AIPanelView` 改為 `import InspectorView`；`<ServerControlPanel v-if=.../>` 與 `<AIPanelView v-if=.../>` 兩處掛載合併成一個 `<InspectorView v-if="currentMode === ViewMode.Editor" />`；`aiPanelStore` 改用 `inspectorStore`
- [ ] Step 2：修改 `ActivityBar.vue`：`toggle-ai-panel` emit 改為呼叫傳入的 `inspectorStore.toggle()`（或改 prop 名稱為 `toggle-inspector`），按鈕 `title` 改為「Inspector」相關文字
- [ ] Step 3：修改 `SideBarView.vue`：移除文章資訊頁籤按鈕、`FrontmatterView` import 與掛載、`@edit`/`edit-frontmatter` 相關 emit
- [ ] Step 4：修改 `MainEditor.vue`：移除 `FrontmatterEditor` import/掛載/`showFrontmatterEditor` ref/`openFrontmatterEditor()`/`defineExpose` 中的對應項
- [ ] Step 5：修改 `types/index.ts`：`SidebarView` enum 移除 `Frontmatter` 成員
- [ ] Step 6：執行完整單元測試確認沒有因型別/引用錯誤而失敗 — `pnpm run test`，Expected: 型別檢查與既有測試通過（E2E 留待 Task 8 一併處理，此步驟先確保 unit 層不壞）
- [ ] Step 7：Commit — `git commit -m "feat(app): 編輯模式改掛 InspectorView 三欄佈線，移除舊有分散掛載點"`

### Task 7：移除死碼

**Files:**
- Delete: `src/components/FrontmatterEditor.vue`
- Delete: `src/components/AIPanelView.vue`（邏輯已在 Task 2 搬進 `AIPanelContent.vue`，Task 6 後不再被任何地方 import）
- Delete: `src/components/ServerControlPanel.vue`（邏輯已在 Task 3 搬進 `PublishTab.vue`，Task 6 後不再被任何地方 import）

- [ ] Step 1：確認三個檔案已無任何引用 — 對每個檔名執行 `npx serena search_for_pattern` 或等效的引用搜尋，Expected: 除自身檔案外無其他引用
- [ ] Step 2：刪除三個檔案
- [ ] Step 3：執行 `pnpm run build` 確認型別檢查與打包成功 — Expected: 無錯誤
- [ ] Step 4：Commit — `git commit -m "chore(cleanup): 移除已被 Inspector 取代的孤立元件"`

### Task 8：重寫受影響的 E2E 測試

**Files:**
- Modify: `tests/e2e/ai-panel.spec.ts` → 內容併入新建的 `tests/e2e/inspector.spec.ts`（刪除舊檔）
- Modify: `tests/e2e/frontmatter-sidebar-edit.spec.ts` → 併入 `tests/e2e/inspector.spec.ts`（刪除舊檔）
- Modify: `tests/e2e/server-control-panel.spec.ts` → 併入 `tests/e2e/inspector.spec.ts`（刪除舊檔）
- Create: `tests/e2e/inspector.spec.ts`

- [ ] Step 1：撰寫 `tests/e2e/inspector.spec.ts`，涵蓋：(a) 編輯模式下 Inspector 預設可見，預設頁籤為屬性 (b) 點擊 ActivityBar 按鈕可折疊/展開 Inspector (c) 切換到「AI 助手」頁籤能看到 SEO 生成功能（沿用原 ai-panel.spec.ts 案例邏輯） (d) 屬性頁籤修改欄位後 `articleStore` 實際更新（沿用原 frontmatter-sidebar-edit.spec.ts 案例邏輯） (e) 切換到「發布」頁籤能看到伺服器控制列與展開日誌（沿用原 server-control-panel.spec.ts 案例邏輯） (f) 切換到管理模式後 Inspector 消失
- [ ] Step 2：執行測試確認失敗 — Expected: FAIL（若 Task 6/7 尚未完成）或 PASS（若已完成，此為收尾驗證性質，非嚴格 red-green）
- [ ] Step 3：刪除 `tests/e2e/ai-panel.spec.ts`、`tests/e2e/frontmatter-sidebar-edit.spec.ts`、`tests/e2e/server-control-panel.spec.ts`
- [ ] Step 4：執行測試確認通過 — `npx playwright test tests/e2e/inspector.spec.ts`，Expected: PASS
- [ ] Step 5：Commit — `git commit -m "test(e2e): 重寫 Inspector 相關 E2E 測試，取代三支舊 spec"`

### Task 9：全量驗證

**Files:**
- （無新增/修改檔案，純驗證）

- [x] Step 1：執行完整單元測試 — `pnpm run test`，Expected: PASS（0 failures）。實測：56 files，709 passed | 1 skipped，0 failures
- [x] Step 2：執行完整 E2E 套件 — `pnpm run test:e2e`，Expected: PASS（0 failures）。實測：首次跑出現 1 個 `editor-flow.spec.ts` 失敗（`save-status-text` 逾時），單獨重跑該測試與重跑整套 E2E 皆為 30 passed/1 skipped/0 failed，判定為平行 worker 資源競爭造成的既有 flaky，非本次改動迴歸
- [x] Step 3：執行 Lint — `pnpm run lint`，Expected: 0 errors。實測：0 errors, 23 warnings（皆既有檔案的既存警告）
- [x] Step 4：手動檢查 `git diff develop..HEAD --stat`，確認管理模式（`ArticleManagement.vue`、`ViewMode.Management`）與文章狀態模型（`ArticleStatus` enum）完全未被觸碰，符合子專案範圍界線。實測：29 files changed，diff 內無 `ArticleManagement.vue`/`ViewMode.Management`/`ArticleStatus`，範圍界線正確
