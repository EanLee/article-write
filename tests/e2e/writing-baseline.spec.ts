/**
 * 寫作基線功能 E2E：Markdown 快捷鍵 + 大綱面板
 * 對應規格：docs/superpowers/specs/2026-04-08-writing-baseline-design.md
 *
 * 驗證範圍：
 * - 基本文件編輯（開啟 → 輸入 → 格式化 → 儲存落盤）
 * - Markdown 快捷鍵：Ctrl+B 粗體、Ctrl+1 標題 toggle、Ctrl+Shift+F 腳註
 * - 大綱面板：標題列表顯示、點擊跳轉
 *
 * 選擇器策略：data-testid 優先，其次語意化 class（與 editor-flow.spec.ts 一致）
 */

import { test, expect } from "./helpers/electron-fixture";
import fs from "fs";
import path from "path";

/** 在 testVaultPath 建立含多層標題的測試文章 */
function createTestArticle(vaultPath: string): string {
  const dir = path.join(vaultPath, "Drafts", "Software");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "writing-baseline.md");
  fs.writeFileSync(
    filePath,
    [
      "---",
      "title: 寫作基線 E2E 文章",
      "date: 2026-06-13",
      "draft: true",
      "---",
      "",
      "# 第一章",
      "",
      "第一章的內容段落。",
      "",
      "## 背景說明",
      "",
      "背景內容。",
      "",
      "## 問題分析",
      "",
      "分析內容。",
      "",
      // 填充段落讓文件超過一個視窗高度，使大綱跳轉必須實際滾動
      ...Array.from({ length: 40 }, (_, i) => `填充段落 ${i + 1}，用於撐開文件高度。`),
      "",
      "# 第二章",
      "",
      "結尾段落文字。",
    ].join("\n"),
    "utf-8",
  );
  return filePath;
}

test.describe("寫作基線：Markdown 快捷鍵與大綱面板", () => {
  test.beforeEach(async ({ window, testVaultPath }) => {
    createTestArticle(testVaultPath);

    // 透過 IPC 設定 articlesDir
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

    // 開啟測試文章並等待編輯器就緒
    const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: "寫作基線 E2E 文章" });
    await articleRow.waitFor({ state: "visible", timeout: 15000 });
    await articleRow.click();
    await window.locator(".cm-content").waitFor({ state: "visible", timeout: 10000 });
  });

  test("Ctrl+B：選取文字後按下，內容被 ** 包裹", async ({ window }) => {
    const editorContent = window.locator(".cm-content");
    await editorContent.click();

    // 游標移到「第一章的內容段落。」行，選取整行文字
    const targetLine = window.locator(".cm-line", { hasText: "第一章的內容段落。" });
    await targetLine.click();
    await window.keyboard.press("Home");
    await window.keyboard.press("Shift+End");

    await window.keyboard.press("Control+b");

    // 驗證編輯器內容出現粗體包裹
    await expect(window.locator(".cm-line", { hasText: "**第一章的內容段落。**" })).toBeVisible({ timeout: 5000 });
  });

  test("Ctrl+B：無選取時插入佔位文字 bold text", async ({ window }) => {
    const editorContent = window.locator(".cm-content");
    await editorContent.click();

    // 游標移到「分析內容。」行尾（無選取；該行位於初始可視範圍內）
    const targetLine = window.locator(".cm-line", { hasText: "分析內容。" });
    await targetLine.click();
    await window.keyboard.press("End");

    await window.keyboard.press("Control+b");

    await expect(window.locator(".cm-line", { hasText: "**bold text**" })).toBeVisible({ timeout: 5000 });
  });

  test("Ctrl+2：一般行加上 ## 標題前綴，再按一次移除（toggle）", async ({ window }) => {
    const editorContent = window.locator(".cm-content");
    await editorContent.click();

    const targetLine = window.locator(".cm-line", { hasText: "背景內容。" });
    await targetLine.click();

    // 加上 H2 標題
    await window.keyboard.press("Control+2");
    await expect(window.locator(".cm-line", { hasText: "## 背景內容。" })).toBeVisible({ timeout: 5000 });

    // 同層級再按一次 → 移除標題（toggle）
    await window.keyboard.press("Control+2");
    await expect(window.locator(".cm-line", { hasText: "## 背景內容。" })).toHaveCount(0);
  });

  test("Ctrl+Shift+F：插入 [^1] 腳註引用與文末定義", async ({ window }) => {
    const editorContent = window.locator(".cm-content");
    await editorContent.click();

    const targetLine = window.locator(".cm-line", { hasText: "分析內容。" });
    await targetLine.click();
    await window.keyboard.press("End");

    await window.keyboard.press("Control+Shift+f");

    // 引用標記與文末定義都應存在
    await expect(window.locator(".cm-line", { hasText: "分析內容。[^1]" })).toBeVisible({ timeout: 5000 });
    await expect(window.locator(".cm-line", { hasText: "[^1]:" })).toBeVisible({ timeout: 5000 });
  });

  // ⚠️ 已知問題（待 topic-020 圓桌決議）：手動儲存與自動儲存競態，
  // 自動儲存以 store 舊快照覆寫磁碟，導致 UI 正確但磁碟內容為格式化前版本。
  // UI 斷言可通過、磁碟斷言間歇失敗。修復方向涉及儲存機制設計，須先決議。
  test.fixme("快捷鍵格式化後 Ctrl+S，內容實際寫入磁碟", async ({ window, testVaultPath }) => {
    const editorContent = window.locator(".cm-content");
    await editorContent.click();

    // 改用「第一章的內容段落。」（位於可視範圍內，避免長文件滾動問題）
    const targetLine = window.locator(".cm-line", { hasText: "第一章的內容段落。" });
    await targetLine.click();
    await window.keyboard.press("Home");
    await window.keyboard.press("Shift+End");
    await window.keyboard.press("Control+b");

    // 先確認編輯器內狀態正確，再儲存（定位失敗發生在編輯器或儲存路徑）
    await expect(window.locator(".cm-line", { hasText: "**第一章的內容段落。**" })).toBeVisible({ timeout: 5000 });

    await window.keyboard.press("Control+s");

    const saveStatusText = window.getByTestId("save-status-text");
    await expect(saveStatusText).toHaveText("已儲存", { timeout: 10000 });

    const filePath = path.join(testVaultPath, "Drafts", "Software", "writing-baseline.md");
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
      .toContain("**第一章的內容段落。**");
  });

  test("大綱面板：顯示 H1/H2 標題列表，點擊跳轉至對應行", async ({ window }) => {
    // 切換到「大綱」分頁
    const outlineTab = window.locator(".tab-btn", { hasText: "大綱" });
    await expect(outlineTab).toBeEnabled({ timeout: 5000 });
    await outlineTab.click();

    // 大綱列出 4 個標題（第一章、背景說明、問題分析、第二章）
    const outlineItems = window.locator(".outline-item");
    await expect(outlineItems).toHaveCount(4, { timeout: 5000 });
    await expect(outlineItems.nth(0)).toContainText("第一章");
    await expect(outlineItems.nth(1)).toContainText("背景說明");
    await expect(outlineItems.nth(3)).toContainText("第二章");

    // 點擊「第二章」→ 編輯器滾動至對應行（scrollToLine 只滾動、不移動游標，符合規格）
    const scrollBefore = await window.evaluate(() => document.querySelector(".cm-scroller")?.scrollTop ?? 0);
    await outlineItems.nth(3).click();
    await expect
      .poll(
        () => window.evaluate(() => document.querySelector(".cm-scroller")?.scrollTop ?? 0),
        { timeout: 5000 },
      )
      .toBeGreaterThan(scrollBefore);
    // 目標行應進入可視範圍
    await expect(window.locator(".cm-line", { hasText: "# 第二章" })).toBeVisible({ timeout: 5000 });
  });
});
