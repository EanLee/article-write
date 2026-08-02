/**
 * 發布狀態按鈕文案 E2E 測試
 *
 * 背景（IA 稽核 Phase 1）：EditorHeader 的「標記發布」按鈕容易讓使用者誤以為
 * 點擊後文章已經同步上線，但實際上只是修改 frontmatter 的 status 標籤。
 * 這裡驗證 tooltip 已清楚說明只是狀態標籤，並指出真正同步的位置（管理模式）。
 *
 * 選擇器策略：data-testid 優先（E2E 穩定性最高）
 */

import { test, expect } from "./helpers/electron-fixture";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARTICLE_FILE = "writing-baseline-main.md";
const ARTICLE_TITLE = "寫作基線主文章";
const FIXTURES_DIR = path.join(__dirname, "fixtures");

function ensureTestArticle(vaultPath: string) {
  const dir = path.join(vaultPath, "Drafts", "Software");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, ARTICLE_FILE);
  if (!fs.existsSync(filePath)) {
    fs.copyFileSync(path.join(FIXTURES_DIR, ARTICLE_FILE), filePath);
  }
}

test.describe("發布狀態按鈕文案", () => {
  test.beforeEach(async ({ window, testVaultPath }) => {
    ensureTestArticle(testVaultPath);
    await window.reload();
    await window.waitForFunction(
      () => {
        const app = document.getElementById("app");
        return app !== null && app.children.length > 0;
      },
      undefined,
      { timeout: 15000 },
    );

    await window.locator(".tab-btn", { hasText: "文章列表" }).click();
    const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: ARTICLE_TITLE });
    await articleRow.waitFor({ state: "visible", timeout: 15000 });
    await articleRow.click();
  });

  test("draft 狀態的 tooltip 說明僅變更標籤，並指向管理模式的同步入口", async ({ window }) => {
    const button = window.getByTestId("publish-status-toggle-button");
    const tooltip = button.locator("xpath=..");
    await expect(button).toBeVisible({ timeout: 5000 });
    await expect(tooltip).toHaveAttribute("data-tip", /僅變更狀態標籤/);
    await expect(tooltip).toHaveAttribute("data-tip", /同步到 Blog/);
  });

  test("切換為已發布後 tooltip 改為說明不影響已同步內容", async ({ window }) => {
    const button = window.getByTestId("publish-status-toggle-button");
    const tooltip = button.locator("xpath=..");
    await button.click();

    await expect(tooltip).toHaveAttribute("data-tip", /改為草稿/);
    await expect(tooltip).toHaveAttribute("data-tip", /不影響已同步的內容/);

    // 還原狀態，避免影響共用 worker 內的其他測試
    await button.click();
    await expect(tooltip).toHaveAttribute("data-tip", /僅變更狀態標籤/);
  });
});
