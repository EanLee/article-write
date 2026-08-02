/**
 * 側邊欄「新增文章」快速按鈕 E2E 測試
 *
 * 背景（IA 稽核 Phase 1）：編輯模式的側邊欄原本沒有新增文章入口，
 * 使用者必須先切到「管理模式」才能新增文章，寫作動線被迫中斷。
 * 這裡驗證側邊欄工具列的新增按鈕能直接建立文章並設為當前文章。
 *
 * 選擇器策略：data-testid 優先（E2E 穩定性最高）
 */

import { test, expect } from "./helpers/electron-fixture";

test.describe("側邊欄新增文章按鈕", () => {
  test("點擊側邊欄新增按鈕能建立文章並直接開啟於編輯器", async ({ window }) => {
    // 新增按鈕只在「文章列表」頁籤渲染；不假設其他測試留下的頁籤狀態，主動切回
    await window.locator(".tab-btn", { hasText: "文章列表" }).click();

    await window.getByTestId("sidebar-new-article-button").click();

    // 新文章應出現在樹狀列表中
    const newArticleRow = window
      .locator('[data-testid="article-tree-item"]')
      .filter({ hasText: "未命名文章" });
    await expect(newArticleRow.first()).toBeVisible({ timeout: 10000 });

    // 新文章應直接成為當前編輯中的文章（編輯器出現而非空狀態提示）
    await expect(window.locator(".cm-editor")).toBeVisible({ timeout: 10000 });
  });
});
