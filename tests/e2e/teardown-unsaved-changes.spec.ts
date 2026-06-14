/**
 * E2E 基礎設施迴歸測試：worker 結束時若編輯器有未儲存變更，
 * electronApp teardown 不應逾時（修復前會觸發 beforeunload → 視窗無法關閉）
 *
 * 重現步驟：
 * 1. 開啟主文章
 * 2. 編輯內容但不儲存（autoSaveService.hasUnsavedChanges() === true）
 * 3. worker 結束時 electronApp fixture 需正常關閉，不應觸發 60s/90s teardown timeout
 */

import { test, expect } from "./helpers/electron-fixture";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARTICLE_FILE = "writing-baseline-main.md";
const ARTICLE_TITLE = "寫作基線主文章";
const FIXTURES_DIR = path.join(__dirname, "fixtures");

function ensureTestArticle(vaultPath: string): string {
  const dir = path.join(vaultPath, "Drafts", "Software");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, ARTICLE_FILE);
  if (!fs.existsSync(filePath)) {
    fs.copyFileSync(path.join(FIXTURES_DIR, ARTICLE_FILE), filePath);
  }
  return filePath;
}

test("worker 結束時編輯器有未儲存變更，App 仍能正常關閉（不逾時）", async ({ window, testVaultPath }) => {
  ensureTestArticle(testVaultPath);

  await window.evaluate(async (vaultPath) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = await (window as any).electronAPI.getConfig();
    config.paths.articlesDir = vaultPath;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (window as any).electronAPI.setConfig(config);
  }, testVaultPath);

  await window.reload();
  await window.waitForFunction(
    () => {
      const app = document.getElementById("app");
      return app !== null && app.children.length > 0;
    },
    undefined,
    { timeout: 15000 },
  );

  const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: ARTICLE_TITLE });
  await articleRow.waitFor({ state: "visible", timeout: 15000 });
  await articleRow.click();

  const targetLine = window.locator(".cm-line", { hasText: "背景內容。" });
  await targetLine.waitFor({ state: "visible", timeout: 10000 });
  await targetLine.click();
  await window.keyboard.press("End");
  await window.keyboard.type("（未儲存的編輯）");

  // 不執行 Ctrl+S：刻意保留未儲存變更，模擬 worker 結束時 hasUnsavedChanges() === true
  await expect(window.locator(".cm-line", { hasText: "（未儲存的編輯）" })).toBeVisible({ timeout: 5000 });
});
