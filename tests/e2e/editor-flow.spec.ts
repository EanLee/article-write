/**
 * Q-02 E2E：編輯器核心流程
 * Happy Path：「設定 Vault → 開啟文章 → 編輯內容 → Ctrl+S → 已儲存」
 *
 * 選擇器策略：data-testid 優先（E2E 穩定性最高）
 */

import { test, expect } from "./helpers/electron-fixture";
import fs from "fs";
import path from "path";

/** 在 testVaultPath 建立一篇測試文章（符合 Drafts/category/file.md 結構） */
function createTestArticle(vaultPath: string): string {
  const dir = path.join(vaultPath, "Drafts", "Software");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "test-article.md");
  fs.writeFileSync(filePath, ["---", "title: E2E 測試文章", "date: 2026-02-15", "draft: true", "---", "", "這是測試文章的初始內容。"].join("\n"), "utf-8");
  return filePath;
}

test.describe("編輯器核心流程", () => {
  test.beforeEach(async ({ window, testVaultPath }) => {
    // 建立測試文章
    createTestArticle(testVaultPath);

    // 透過 IPC 設定 articlesDir
    await window.evaluate(async (vaultPath) => {
      const config = await (window as any).electronAPI.getConfig();
      config.paths.articlesDir = vaultPath;
      await (window as any).electronAPI.setConfig(config);
    }, testVaultPath);

    // 重新載入頁面，讓 App 重新初始化並掃描文章
    await window.reload();

    // 等待 Vue App 重新掛載完成
    await window.waitForFunction(
      () => {
        const app = document.getElementById("app");
        return app !== null && app.children.length > 0;
      },
      undefined,
      { timeout: 15000 },
    );

    // 等待文章列表掃描完成（取代固定 waitForTimeout，避免非必要等待）
    await window.locator('[data-testid="article-tree-item"]').first().waitFor({
      state: "visible",
      timeout: 15000,
    });
  });

  test("開啟文章 → 編輯內容 → Ctrl+S → 顯示已儲存", async ({ window }) => {
    // Step 1: 確認文章列表有出現測試文章
    const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: "E2E 測試文章" });
    await expect(articleRow).toBeVisible({ timeout: 10000 });

    // Step 2: 點擊文章開啟編輯器
    await articleRow.click();

    // Step 3: 確認 CodeMirror 編輯器已載入
    const editor = window.locator(".cm-editor");
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Step 4: 點擊編輯區並輸入內容
    const editorContent = window.locator(".cm-content");
    await editorContent.click();
    await window.keyboard.type(" 新增的測試內容");

    // Step 5: 按 Ctrl+S 手動儲存
    await window.keyboard.press("Control+s");

    // Step 6: 確認 SaveStatusIndicator 顯示「已儲存」
    // 使用 data-testid="save-status-text"（僅非 icon-only 實例才有此屬性）
    const saveStatusText = window.getByTestId("save-status-text");
    await expect(saveStatusText).toHaveText("已儲存", { timeout: 10000 });
  });

  test("編輯後 Ctrl+S，檔案內容應實際寫入磁碟", async ({ window, testVaultPath }) => {
    // Step 1: 開啟文章
    const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: "E2E 測試文章" });
    await expect(articleRow).toBeVisible({ timeout: 10000 });
    await articleRow.click();

    // Step 2: 等待編輯器載入並輸入
    const editorContent = window.locator(".cm-content");
    await expect(editorContent).toBeVisible({ timeout: 10000 });
    await editorContent.click();
    await window.keyboard.type(" 磁碟寫入驗證");

    // Step 3: Ctrl+S 儲存
    await window.keyboard.press("Control+s");

    // Step 4: 等待 UI 反映儲存完成
    const saveStatusText = window.getByTestId("save-status-text");
    await expect(saveStatusText).toHaveText("已儲存", { timeout: 10000 });

    // Step 5: 輪詢驗證檔案內容確實更新（取代固定等待，避免 IPC writeFile 尚未完成的競態）
    const filePath = path.join(testVaultPath, "Drafts", "Software", "test-article.md");
    await expect
      .poll(
        () => {
          try {
            return fs.readFileSync(filePath, "utf-8");
          } catch {
            return "";
          }
        },
        { timeout: 5000 },
      )
      .toContain("磁碟寫入驗證");
  });
});
