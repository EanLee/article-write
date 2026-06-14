/**
 * 寫作基線功能 E2E：Markdown 快捷鍵 + 大綱面板（規格：2026-04-08-writing-baseline-design.md）
 * 與儲存來源單一化驗收（topic-020）
 *
 * 設計原則（吸取 reload/beforeunload 競態與 FileWatch 不穩定的教訓）：
 * - 全 spec 共用一篇主文章，只在 worker 初始化時 reload 一次
 * - beforeEach 為冪等的「確保主文章開啟」，不重載頁面
 * - 各測試操作互不重疊的行，避免跨測試干擾
 * - 只有切換測試依賴 FileWatch 偵測新檔（該路徑已驗證穩定）
 */

import { test, expect } from "./helpers/electron-fixture";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARTICLE_FILE = "writing-baseline-main.md";
const ARTICLE_TITLE = "寫作基線主文章";
const FIXTURES_DIR = path.join(__dirname, "fixtures");

/** 從 fixtures 模板複製共用主文章（不在測試碼內生成內容） */
function ensureTestArticle(vaultPath: string): string {
  const dir = path.join(vaultPath, "Drafts", "Software");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, ARTICLE_FILE);
  if (!fs.existsSync(filePath)) {
    fs.copyFileSync(path.join(FIXTURES_DIR, ARTICLE_FILE), filePath);
  }
  return filePath;
}

test.describe("寫作基線：Markdown 快捷鍵與大綱面板", () => {
  test.describe.configure({ mode: "serial" });

  let configInitialized = false;

  test.beforeEach(async ({ window, testVaultPath }) => {
    ensureTestArticle(testVaultPath);

    // worker 第一個測試：設定 vault 路徑並 reload 一次（之後不再重載）
    if (!configInitialized) {
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
      configInitialized = true;
    }

    // 冪等：主文章尚未開啟時才點擊開啟（以第一章首行是否可見判斷）
    const anchorLine = window.locator(".cm-line", { hasText: "第一章的內容段落。" });
    if (!(await anchorLine.isVisible().catch(() => false))) {
      const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: ARTICLE_TITLE });
      await articleRow.waitFor({ state: "visible", timeout: 15000 });
      await articleRow.click();
      await anchorLine.waitFor({ state: "visible", timeout: 10000 });
    }
  });

  test("Ctrl+B：選取文字後按下，內容被 ** 包裹", async ({ window }) => {
    const targetLine = window.locator(".cm-line", { hasText: "背景內容。" });
    await targetLine.click();
    await window.keyboard.press("Home");
    await window.keyboard.press("Shift+End");

    await window.keyboard.press("Control+b");

    await expect(window.locator(".cm-line", { hasText: "**背景內容。**" })).toBeVisible({ timeout: 5000 });
  });

  test("Ctrl+B：無選取時插入佔位文字 bold text", async ({ window }) => {
    const targetLine = window.locator(".cm-line", { hasText: "分析內容。" });
    await targetLine.click();
    await window.keyboard.press("End");

    await window.keyboard.press("Control+b");

    await expect(window.locator(".cm-line", { hasText: "**bold text**" })).toBeVisible({ timeout: 5000 });
  });

  test("Ctrl+2：一般行加上 ## 標題前綴，再按一次移除（toggle）", async ({ window }) => {
    const targetLine = window.locator(".cm-line", { hasText: "填充段落 1，" });
    await targetLine.click();

    await window.keyboard.press("Control+2");
    await expect(window.locator(".cm-line", { hasText: "## 填充段落 1，" })).toBeVisible({ timeout: 5000 });

    // 同層級再按一次 → 移除標題（toggle，內容回到原狀）
    await window.keyboard.press("Control+2");
    await expect(window.locator(".cm-line", { hasText: "## 填充段落 1，" })).toHaveCount(0);
  });

  test("Ctrl+Shift+F：插入 [^1] 腳註引用與文末定義", async ({ window }) => {
    const targetLine = window.locator(".cm-line", { hasText: "填充段落 2，" });
    await targetLine.click();
    await window.keyboard.press("End");

    await window.keyboard.press("Control+Shift+f");

    await expect(window.locator(".cm-line", { hasText: "[^1]" }).first()).toBeVisible({ timeout: 5000 });
  });

  // topic-020 決議驗收：per-file 儲存佇列 + 編輯器內容即時同步 store
  test("快捷鍵格式化後 Ctrl+S，內容實際寫入磁碟", async ({ window, testVaultPath }) => {
    const targetLine = window.locator(".cm-line", { hasText: "第一章的內容段落。" });
    await targetLine.click();
    await window.keyboard.press("Home");
    await window.keyboard.press("Shift+End");
    await window.keyboard.press("Control+b");

    // 先確認編輯器內狀態正確再儲存（區分編輯器錯誤與儲存路徑錯誤）
    await expect(window.locator(".cm-line", { hasText: "**第一章的內容段落。**" })).toBeVisible({ timeout: 5000 });

    await window.keyboard.press("Control+s");

    const saveStatusText = window.getByTestId("save-status-text");
    await expect(saveStatusText).toHaveText("已儲存", { timeout: 10000 });

    const filePath = path.join(testVaultPath, "Drafts", "Software", ARTICLE_FILE);
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

    // frontmatter 欄位完整保留（date 經 topic-007 移轉為 pubDate，draft 不得遺失）
    const savedContent = fs.readFileSync(filePath, "utf-8");
    expect(savedContent).toContain("2026-06-13");
    expect(savedContent).toContain("draft");
  });

  test("切換文章時自動儲存前一篇的編輯器即時內容（topic-020）", async ({ window, testVaultPath }) => {
    // 建立第二篇文章供切換（FileWatch 自動偵測）
    const otherDir = path.join(testVaultPath, "Drafts", "Software");
    const otherPath = path.join(otherDir, "switch-target.md");
    fs.copyFileSync(path.join(FIXTURES_DIR, "switch-target.md"), otherPath);

    // 在主文章輸入新內容（不手動儲存）
    const targetLine = window.locator(".cm-line", { hasText: "填充段落 3，" });
    await targetLine.click();
    await window.keyboard.press("End");
    await window.keyboard.type(" 切換前的未儲存編輯");

    // 等待列表掃描到第二篇後點擊切換
    const otherRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: "切換目標文章" });
    await otherRow.waitFor({ state: "visible", timeout: 15000 });
    await otherRow.click();
    await window.locator(".cm-line", { hasText: "目標文章內容。" }).waitFor({ state: "visible", timeout: 10000 });

    // 前一篇的編輯內容必須由切換觸發儲存寫入磁碟（即時內容，非舊快照）
    const filePath = path.join(testVaultPath, "Drafts", "Software", ARTICLE_FILE);
    await expect
      .poll(
        () => {
          try {
            return fs.readFileSync(filePath, "utf-8");
          } catch {
            return "";
          }
        },
        { timeout: 10000 },
      )
      .toContain("切換前的未儲存編輯");
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
    await expect(window.locator(".cm-line", { hasText: "# 第二章" })).toBeVisible({ timeout: 5000 });
  });
});
