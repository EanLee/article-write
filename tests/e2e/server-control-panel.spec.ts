/**
 * 底部開發伺服器控制台 E2E 測試（IA 稽核 Phase 2 第一項）
 *
 * 背景：ServerControlPanel.vue 原本完全沒有掛載進 App.vue，是徹底孤立元件。
 * 這裡驗證它已掛載進編輯模式、預設收合，且只在編輯模式顯示。
 *
 * 選擇器策略：data-testid 優先（E2E 穩定性最高）
 */

import { test, expect } from "./helpers/electron-fixture";

test.describe("底部開發伺服器控制台", () => {
  test("編輯模式下預設可見且收合，日誌面板不可見", async ({ window }) => {
    const panel = window.getByTestId("server-control-panel");
    const log = window.getByTestId("server-panel-log");

    await expect(panel).toBeVisible();
    await expect(log).not.toBeVisible();
  });

  test("點擊展開按鈕能看到日誌面板，再點一次收合", async ({ window }) => {
    const toggle = window.getByTestId("server-panel-toggle");
    const log = window.getByTestId("server-panel-log");

    await toggle.click();
    await expect(log).toBeVisible();

    // 還原收合狀態，避免影響共用 worker 內的其他測試
    await toggle.click();
    await expect(log).not.toBeVisible();
  });

  test("切換到管理模式後控制台消失，切回編輯模式後再次出現", async ({ window }) => {
    const panel = window.getByTestId("server-control-panel");

    await window.locator('button[title^="管理模式"]').click();
    await expect(panel).not.toBeVisible();

    // 還原模式，避免影響共用 worker 內的其他測試
    await window.locator('button[title^="編輯模式"]').click();
    await expect(panel).toBeVisible();
  });
});
