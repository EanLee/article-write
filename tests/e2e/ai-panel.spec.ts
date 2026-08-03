/**
 * AI 助手面板 E2E 測試
 *
 * 背景（IA 稽核 Phase 1）：ActivityBar 的 AI 按鈕原本只 emit toggle-ai-panel，
 * 但 App.vue 沒有監聽也沒有渲染 AIPanelView，點擊完全無反應。
 * 這裡驗證面板已經真正接通。
 *
 * 選擇器策略：data-testid 優先（E2E 穩定性最高）
 */

import { test, expect } from "./helpers/electron-fixture";

test.describe("AI 助手面板", () => {
  test("點擊 ActivityBar 的 AI 按鈕能開啟與關閉面板", async ({ window }) => {
    const toggleButton = window.getByTestId("ai-panel-toggle-button");
    const panel = window.getByTestId("ai-panel");

    await expect(panel).not.toBeVisible();

    await toggleButton.click();
    await expect(panel).toBeVisible({ timeout: 5000 });
    await expect(panel.locator("span", { hasText: "AI 助手" })).toBeVisible();

    // 再點一次 ActivityBar 按鈕（toggle）應該關閉
    await toggleButton.click();
    await expect(panel).not.toBeVisible();
  });

  test("面板內的關閉按鈕能關閉面板", async ({ window }) => {
    const toggleButton = window.getByTestId("ai-panel-toggle-button");
    const panel = window.getByTestId("ai-panel");

    await toggleButton.click();
    await expect(panel).toBeVisible({ timeout: 5000 });

    await window.getByTestId("ai-panel-close-button").click();
    await expect(panel).not.toBeVisible();
  });

  test("管理模式下點擊也能正常開啟面板（按鈕不分模式都可點，避免 active 卻沒反應）", async ({ window }) => {
    await window.locator('button[title^="管理模式"]').click();

    const toggleButton = window.getByTestId("ai-panel-toggle-button");
    const panel = window.getByTestId("ai-panel");

    await toggleButton.click();
    await expect(panel).toBeVisible({ timeout: 5000 });

    // 還原狀態與模式，避免影響共用 worker 內的其他測試
    await window.getByTestId("ai-panel-close-button").click();
    await window.locator('button[title^="編輯模式"]').click();
  });
});
