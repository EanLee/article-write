---
name: testing-standards
description: 測試規範與 Definition of Done。修改任何程式碼前後必讀，確認 Service/UI 測試覆蓋與完成標準。
---

# 測試規範

## 核心鐵則

所有修改完成前必執行：

```bash
pnpm run test
```

- ✅ 全數通過（0 failures）才算完成
- ❌ 不允許跳過此步驟，即使「只改了一行」
- ❌ 不允許以「應該不影響」代替實際執行驗證
- 適用於所有程式碼修改（Feature、Bug Fix、重構）

> 與 `superpowers:verification-before-completion` skill 一致：evidence before claims, always。

## Service Layer 測試

- 對應：`src/services/X.ts` → `tests/services/X.test.ts`
- 工具：Vitest
- 新增功能：100% 覆蓋新增程式碼
- 修改功能：覆蓋修改的邏輯路徑
- Bug Fix：必須有重現問題的測試案例

## UI 層測試

- 對應：`src/components/X.vue` → `tests/e2e/x.spec.ts`
- 工具：Playwright（`pnpm run test:e2e`）
- 涵蓋：關鍵使用者流程、互動行為、錯誤狀態、邊界條件

### E2E（Electron + Playwright）除錯流程 — 必讀 `docs/quality/assessments/E2E_TESTING_GUIDE.md`

- ❌ **禁止盲跑全套 E2E 猜原因**：每輪 build + Electron 啟動約 3~7 分鐘，從 Playwright 表層錯誤訊息猜測根因會浪費大量時間與 token
- ✅ **失敗時第一步讀 `test-results/renderer-console.log`**：`electron-fixture.ts` 會把 renderer 端 `console.log` 全部捕捉到此檔，可直接看到 app 端實際發生什麼（例如 `File conflict detected`）
- ✅ **正確流程**：單測（`playwright test <spec> -g "<test name>"`）→ 讀 `renderer-console.log` → 修 → 單測 → 全 spec → 全 unit
- ✅ **落盤類測試**：UI 顯示正確 ≠ 磁碟內容正確（topic-020 核心教訓），必須 `expect.poll(() => fs.readFileSync(...))` 驗證實際檔案內容

## Definition of Done — Feature 開發

- [ ] 程式碼符合規範，ESLint / TypeScript 檢查通過
- [ ] Service 層 Unit Test 撰寫並通過
- [ ] UI 層 Playwright Test 撰寫並通過
- [ ] `pnpm run test` 全部通過
- [ ] Commit Message 符合規範

## Definition of Done — Bug Fix

詳細流程見 `bugfix-workflow` skill（重現步驟、根因記錄、使用者驗證關卡）。額外要求：

- [ ] 撰寫重現問題的測試（修復前應失敗，修復後通過）
- [ ] 相關功能回歸測試通過，無副作用
- [ ] Service/UI 對應測試已更新
