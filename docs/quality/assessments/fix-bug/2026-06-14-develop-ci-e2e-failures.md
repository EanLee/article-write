# develop 分支 CI「E2E 測試」job 失敗修復

> 分支：`fix/e2e-ci-failures`
> 對應 CI：PR #38 run `27489039298` / job `81250576691`（develop run `27463632400`，合併 PR #37 後開始失敗）

本報告記錄 develop 分支 CI 在合併 PR #37 後，「E2E 測試」job 持續失敗的 3 個獨立問題的調查與修復。
3 個問題彼此無關，分別影響 `settings-path.spec.ts`、`writing-baseline.spec.ts`、`seo-generation.spec.ts`（flaky）。

---

## Fix #1：`settings-path.spec.ts` 因 articlesDir 驗證新規則而失敗

### 問題描述

- **現象**：「設定路徑流程 › 填入 articlesDir → 儲存設定 → 重啟後路徑保留」測試失敗。
- **重現步驟**：測試前置步驟透過 `electronAPI.setConfig()` 將 `config.paths.articlesDir` 設為 `""`（空字串）以模擬「乾淨狀態」，呼叫後 IPC 回傳驗證錯誤，導致後續斷言失敗。

### 原因分析（呼叫鏈）

```
settings-path.spec.ts 前置步驟
  → window.electronAPI.setConfig({ ...config, paths: { articlesDir: "", targetDir: "" } })
    → registerIpcHandlers.ts 的 SET_CONFIG handler
      → AppConfigSchema.safeParse(rawConfig)
        → config.schema.ts: paths.articlesDir = z.string().min(1, "articlesDir 不得為空")（S-04 安全修復新增）
          → success: false，丟出 "config 驗證失敗: articlesDir 不得為空" ← 根本原因
            → 測試前置步驟的 setConfig 呼叫失敗，後續「填入 articlesDir → 儲存 → 重啟」流程從非預期狀態開始
```

根本原因：PR #37 之前的 S-04 安全修復為 `AppConfigSchema.paths.articlesDir` 新增 `min(1)` 必填驗證（理由：articlesDir 為應用程式唯一啟動條件），但 `settings-path.spec.ts` 的「清空 config 回到乾淨狀態」前置步驟仍將 `articlesDir` 設為 `""`，與新驗證規則衝突。

### 修正方式

[tests/e2e/settings-path.spec.ts:9-22](../../tests/e2e/settings-path.spec.ts#L9)：

```diff
+ import os from "os";
+ import path from "path";
  import { test, expect } from "./helpers/electron-fixture";

  test.describe("設定路徑流程", () => {
    test("填入 articlesDir → 儲存設定 → 重啟後路徑保留", async ({ window, testVaultPath }) => {
-     // 前置：清空 config，從乾淨狀態開始
-     await window.evaluate(async () => {
-       const config = await (window as any).electronAPI.getConfig();
-       config.paths.articlesDir = "";
-       config.paths.targetDir = "";
-       await (window as any).electronAPI.setConfig(config);
-     });
+     // 前置：將 articlesDir 設為與 testVaultPath 不同的路徑，從「尚未設定目標路徑」的狀態開始
+     // （AppConfigSchema 要求 articlesDir 不得為空，故不能設為 ""）
+     const placeholderDir = path.join(os.tmpdir(), "writeflow-settings-path-placeholder");
+     await window.evaluate(async (placeholder) => {
+       const config = await (window as any).electronAPI.getConfig();
+       config.paths.articlesDir = placeholder;
+       config.paths.targetDir = "";
+       await (window as any).electronAPI.setConfig(config);
+     }, placeholderDir);
```

**為何有效**：前置步驟改為將 `articlesDir` 設為一個與測試目標 `testVaultPath` 不同、但非空的暫存路徑，符合 `AppConfigSchema` 的驗證規則，同時保留測試原意——驗證「填入 articlesDir → 儲存設定 → 重啟後路徑保留」這一流程在 `articlesDir` 從一個值變更為另一個值時能正確持久化。

### 替代方案考量

- 也可放寬 `AppConfigSchema` 允許 `articlesDir` 為空字串，但這會回退 S-04 安全修復（articlesDir 必填是唯一啟動條件的設計決策），不應為配合測試而調整正式規格。

---

## Fix #2：`MarkdownService` 未加引號的 YAML 日期被 js-yaml 解析為 Date 物件，導致 frontmatter 日期欄位整個遺失

### 問題描述

- **現象**：「寫作基線：Markdown 快捷鍵與大綱面板 › 快捷鍵格式化後 Ctrl+S，內容實際寫入磁碟」測試在第 149 行 `expect(savedContent).toContain("2026-06-13")` 失敗，儲存後的檔案內容不含 `pubDate: 2026-06-13`（topic-007 將 `date` 移轉為 `pubDate` 後的欄位）。
- 同時，`tests/components/EditorModeToggle.test.ts` 中有 2 個既存的 `it.skip` 測試，斷言 `result.frontmatter.date` 應為 truthy，過去因同一問題被跳過。

### 原因分析（呼叫鏈）

```
測試 fixture（writing-baseline-main.md）frontmatter:
  title: 寫作基線主文章
  date: 2026-06-13        ← 未加引號的 YYYY-MM-DD 純量
  draft: true

MarkdownService.parseFrontmatter(rawContent)
  → js-yaml.load(frontmatterText)
    → DEFAULT_SCHEMA 將未加引號的 YYYY-MM-DD 純量自動解析為 JS Date 物件
      → data.date = Date 物件（非字串）← 根本原因起點

  → validateAndNormalizeFrontmatter(data)
    → const dateStr = String(data.date)
      → String(Date 物件) = Date.prototype.toString() 的本地時間表示
        （例如 "Thu Jun 13 2026 00:00:00 GMT+0800 (...)"）
          → isValidDateString(dateStr)
            → /^\d{4}-\d{2}-\d{2}$/.test(dateStr) → false
              → date 欄位驗證失敗，整個欄位被捨棄（不寫入 normalized frontmatter）

article.ts: migrateArticleFrontmatter(article)
  → fm.date === undefined（已被上一步丟棄）
    → "2. 移轉 date → pubDate" 區塊的 if (legacyDate !== undefined) 不成立
      → fm.pubDate 從未被設定
        → generateFrontmatter() 輸出不含 pubDate
          → savedContent 不含 "2026-06-13" ← 測試斷言失敗
```

根本原因：`MarkdownService.validateAndNormalizeFrontmatter()` 對 `date`/`lastmod`/`created`/`pubDate` 四個日期欄位的驗證皆直接呼叫 `String(data.X)`，未考慮 js-yaml 將未加引號的 `YYYY-MM-DD` 純量自動解析為 `Date` 物件的行為，導致 `String()` 產出本地時間字串而非 ISO 日期字串，無法通過格式驗證。

### 修正方式

[src/services/MarkdownService.ts](../../src/services/MarkdownService.ts) 新增私有方法 `toDateString()`：

```ts
/**
 * 將 frontmatter 日期欄位轉為字串
 *
 * js-yaml 的預設 schema 會將未加引號的 YYYY-MM-DD 純量（例如 `date: 2026-06-13`）
 * 自動解析為 JS Date 物件，而非字串。若直接 String(date) 會得到
 * Date.toString() 的本地時間表示，無法通過 isValidDateString 的格式驗證，
 * 導致欄位被整個捨棄。此處將 Date 物件轉回 ISO 的 YYYY-MM-DD
 *（yaml 解析的純日期一律為 UTC 午夜）。
 */
private toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return String(value);
}
```

並將 `validateAndNormalizeFrontmatter()` 中 `date`/`lastmod`/`created`/`pubDate` 四處的 `String(data.X)` 改為 `this.toDateString(data.X)`。

**為何有效**：`toDateString()` 在輸入為 `Date` 物件時改用 `toISOString().split("T")[0]` 取得 UTC 午夜對應的 `YYYY-MM-DD`，與 yaml 純量 `2026-06-13` 的原始字面值一致，可通過 `isValidDateString()` 驗證；輸入已是字串時行為與原 `String()` 相同，不影響既有邏輯。修復後 `fm.date` 能正確保留，`migrateArticleFrontmatter()` 的 `date → pubDate` 移轉才能正常運作。

### 替代方案考量

- 也可在 `js-yaml.load()` 時改用不自動轉換日期的 schema（例如 `JSON_SCHEMA`），但會影響其他可能依賴 `DEFAULT_SCHEMA` 解析行為的欄位（例如 boolean、number 純量），影響範圍較大；在驗證層做型別正規化的修改範圍更小、更聚焦。

### 測試

- [tests/components/EditorModeToggle.test.ts](../../tests/components/EditorModeToggle.test.ts) 取消 2 個既存 `it.skip`（「應該正確解析包含 frontmatter 的 markdown」「應該處理完整的 frontmatter 結構」），修復前兩者皆因 `expected undefined to be truthy` 失敗，修復後通過（10/10）。
- E2E：`writing-baseline.spec.ts` 第 118 行測試通過。

---

## Fix #3：`search-flow.spec.ts` 未關閉 SearchPanel，遮罩殘留導致同 worker 內後續測試的點擊被 intercept（flaky）

### 問題描述

- **現象**：「SEO 生成功能 › Settings 頁面能顯示 AI tab」flaky，`window.getByTestId("settings-button").click()` 逾時 30s，Playwright 錯誤訊息顯示有一個 `<div class="fixed inset-0 z-50 flex items-start justify-center pt-20">` 的元素 intercept 了點擊。

### 原因分析（呼叫鏈）

```
tests/e2e/helpers/electron-fixture.ts
  → electronApp / window 為 worker-scoped fixture
    → 同一 Playwright worker 內的多個 spec 檔共用同一個 Electron App 實例與視窗狀態

search-flow.spec.ts「輸入關鍵字後顯示搜尋結果或無結果訊息」
  → 按 Ctrl+F 開啟 SearchPanel（searchStore.isOpen = true）
    → 輸入關鍵字、斷言結果列表 / 「找不到」訊息
      → 測試結束，但從未關閉 SearchPanel ← 根本原因
        → searchStore.isOpen 維持 true
          → SearchPanel.vue: <div v-if="searchStore.isOpen"
               class="fixed inset-0 z-50 flex items-start justify-center pt-20" ...>
            → 該 overlay 持續存在於 DOM 中

seo-generation.spec.ts「Settings 頁面能顯示 AI tab」（同 worker，緊接在後執行）
  → window.getByTestId("settings-button").click()
    → 點擊座標被殘留的 SearchPanel overlay（z-50，覆蓋全螢幕）attach pointer-events
      → Playwright actionability check 持續失敗 → 30s timeout ← 測試失敗
```

根本原因：`search-flow.spec.ts` 的「輸入關鍵字後顯示搜尋結果或無結果訊息」測試開啟 SearchPanel 後未關閉，且 `electronApp`/`window` 為 worker-scoped fixture（同一 worker 內跨 spec 檔共享視窗狀態），導致殘留的全螢幕 overlay 影響後續在同一 worker 執行的 `seo-generation.spec.ts` 測試的點擊操作。是否 flaky 取決於 Playwright 排程是否將這兩個測試分配到同一 worker、以及執行順序。

### 修正方式

[tests/e2e/search-flow.spec.ts](../../tests/e2e/search-flow.spec.ts) 「輸入關鍵字後顯示搜尋結果或無結果訊息」測試結尾新增：

```ts
// 關閉搜尋面板，避免遮罩殘留影響共用同一 Electron App 實例的後續測試
await window.keyboard.press("Escape");
await expect(window.locator('input[placeholder="搜尋文章內容..."]')).not.toBeVisible();
```

**為何有效**：測試結束前主動關閉 SearchPanel（`Escape` 觸發 `searchStore.close()`），並以斷言確認面板已從 DOM 移除，使該測試不再對共享的 worker-scoped 視窗留下副作用，後續在同一 worker 執行的測試不會再被殘留 overlay 攔截點擊。

### 替代方案考量

- 也可將 `electronApp`/`window` 改為 test-scoped fixture（每個測試獨立啟動 Electron App），可徹底消除跨測試狀態污染，但會大幅增加 E2E 執行時間（每個測試都要重新啟動 Electron），且影響所有 E2E spec 的 fixture 設計，範圍過大；在問題測試結尾補上清理動作是風險與成本最低的修正。

---

## 整體測試結果

- 單元測試：`pnpm run test` 全數通過（45 個測試檔，628 passed | 1 skipped，0 failures）。
- E2E（`settings-path.spec.ts` / `writing-baseline.spec.ts` / `seo-generation.spec.ts` / `search-flow.spec.ts`）：12 passed，2 skipped（皆為既存且與本次修復無關：`writing-baseline.spec.ts` 的 topic-020 文章切換自動儲存測試為 `test.fixme`；`seo-generation.spec.ts` 的「API Key 未設定時 Frontmatter Panel 顯示引導按鈕」為條件性 skip）。
- 全套 E2E（`playwright test`，21 個測試）：19 passed，2 skipped（同上 2 個既存 skip），0 failed。

## 相關 Commit

見本分支 `fix/e2e-ci-failures` 後續 commit（依 Fix #1-3 與測試分別提交，採 Conventional Commits + SRP）。
