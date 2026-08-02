/**
 * 側邊欄「文章資訊」編輯按鈕 E2E 測試
 *
 * 背景（IA 稽核 Phase 1）：FrontmatterView.vue 的「編輯」按鈕原本只呼叫 openEditor()，
 * 內部只有一行 logger.debug，沒有真正開啟 FrontmatterEditor modal，點擊完全無反應。
 * 這裡驗證按鈕已經真正接通既有的 FrontmatterEditor modal（與 EditorHeader 的鉛筆按鈕共用同一顆 modal）。
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

test.describe("側邊欄文章資訊編輯按鈕", () => {
  test.beforeEach(async ({ window, testVaultPath }) => {
    ensureTestArticle(testVaultPath);

    // worker 共用的 App 實例啟動時 vault 是空的，複製 fixture 後需 reload 觸發重新掃描
    // （避免依賴 FileWatch，CI 上可能延遲 > 15s，見 e2e-testing-rules skill 失敗模式 6）
    await window.reload();
    await window.waitForFunction(
      () => {
        const app = document.getElementById("app");
        return app !== null && app.children.length > 0;
      },
      undefined,
      { timeout: 15000 },
    );
  });

  test("點擊「文章資訊」頁籤的編輯按鈕能開啟 Frontmatter 編輯 modal", async ({ window }) => {
    const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: ARTICLE_TITLE });
    await articleRow.waitFor({ state: "visible", timeout: 15000 });
    await articleRow.click();

    // 切換側邊欄到「文章資訊」頁籤
    await window.locator(".tab-btn", { hasText: "文章資訊" }).click();

    await window.getByTestId("frontmatter-edit-button").click();

    const modal = window.getByTestId("frontmatter-editor-modal");
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator("h3", { hasText: "編輯前置資料" })).toBeVisible();

    // 取消不應留下殘留狀態
    await modal.locator("button", { hasText: "取消" }).click();
    await expect(modal).not.toBeVisible();
  });
});
