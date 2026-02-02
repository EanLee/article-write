/**
 * 文章列表 E2E 測試
 * 測試文章列表的滾動位置保持、不產生重複文章等功能
 *
 * Bug 參考: docs/fix-bug/2026-01-26-article-list-issues-root-cause.md
 */

import { test, expect } from "@playwright/test";

test.describe.skip("文章列表 - 滾動位置保持 (需要 Playwright 環境)", () => {
  test.beforeEach(async ({ page }) => {
    // 前往應用程式
    await page.goto("/");

    // 等待應用程式載入完成
    await page.waitForLoadState("networkidle");

    // 確保有足夠的文章以產生滾動
    // 這裡假設測試環境已經有至少 20 篇文章
    // 或者可以透過 API/資料庫 setup 建立測試資料
  });

  test("點擊文章後應保持滾動位置", async ({ page }) => {
    // 等待文章列表載入
    await page.waitForSelector(".article-management");

    // 取得表格容器
    const tableContainer = page.locator(".table-container");

    // 滾動到中間位置
    await tableContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });

    // 等待滾動完成
    await page.waitForTimeout(500);

    // 記錄滾動位置
    const scrollTopBefore = await tableContainer.evaluate((el) => el.scrollTop);

    // 點擊一篇文章
    const firstArticle = page.locator("tbody tr").first();
    await firstArticle.click();

    // 等待編輯視圖切換
    await page.waitForTimeout(1000);

    // 切換回文章列表視圖
    // 這裡需要根據實際的 UI 來點擊適當的按鈕
    // 假設有一個「返回列表」按鈕
    const backButton = page.locator('[data-testid="back-to-list"]');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    // 等待切換完成
    await page.waitForTimeout(500);

    // 檢查滾動位置
    const scrollTopAfter = await tableContainer.evaluate((el) => el.scrollTop);

    // 滾動位置應該保持（允許小幅度誤差）
    expect(Math.abs(scrollTopAfter - scrollTopBefore)).toBeLessThan(50);
  });

  test("過幾秒後滾動位置不應跳動", async ({ page }) => {
    await page.waitForSelector(".article-management");

    const tableContainer = page.locator(".table-container");

    // 滾動到特定位置
    await tableContainer.evaluate((el) => {
      el.scrollTop = 300;
    });

    await page.waitForTimeout(500);

    const initialScrollTop = await tableContainer.evaluate((el) => el.scrollTop);

    // 點擊文章
    await page.locator("tbody tr").nth(5).click();

    // 等待可能的自動儲存和檔案監聽觸發（最多 6 秒）
    await page.waitForTimeout(6000);

    // 如果還在列表視圖，檢查滾動位置
    const isListVisible = await page.locator(".article-management").isVisible();
    if (isListVisible) {
      const finalScrollTop = await tableContainer.evaluate((el) => el.scrollTop);
      expect(Math.abs(finalScrollTop - initialScrollTop)).toBeLessThan(50);
    }
  });

  test("快速連續點擊多篇文章不應導致滾動跳動", async ({ page }) => {
    await page.waitForSelector(".article-management");

    const tableContainer = page.locator(".table-container");

    // 滾動到中間
    await tableContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });

    const initialScrollTop = await tableContainer.evaluate((el) => el.scrollTop);

    // 快速點擊多篇文章（如果 UI 允許）
    for (let i = 0; i < 3; i++) {
      await page.locator("tbody tr").nth(i).click();
      await page.waitForTimeout(500);
    }

    // 檢查滾動位置
    const finalScrollTop = await tableContainer.evaluate((el) => el.scrollTop);
    expect(Math.abs(finalScrollTop - initialScrollTop)).toBeLessThan(100);
  });
});

test.describe("文章列表 - 防止重複文章", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("編輯並儲存文章後不應產生重複項", async ({ page }) => {
    await page.waitForSelector(".article-management");

    // 記錄初始文章數量
    const initialCount = await page.locator("tbody tr").count();

    // 點擊第一篇文章進入編輯
    await page.locator("tbody tr").first().click();

    // 等待編輯器載入
    await page.waitForSelector('[data-testid="editor"]', { timeout: 5000 });

    // 修改內容
    const editor = page.locator('[data-testid="editor"]');
    await editor.click();
    await editor.type(" - 測試修改");

    // 手動觸發儲存（Ctrl+S）
    await page.keyboard.press("Control+S");

    // 等待儲存完成
    await page.waitForTimeout(2000);

    // 等待可能的檔案監聽觸發
    await page.waitForTimeout(6000);

    // 返回列表視圖
    const backButton = page.locator('[data-testid="back-to-list"]');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await page.waitForTimeout(1000);

    // 檢查文章數量
    const finalCount = await page.locator("tbody tr").count();
    expect(finalCount).toBe(initialCount); // 不應該增加

    // 檢查沒有重複的文章標題
    const articleTitles = await page.locator("tbody tr td:nth-child(2)").allTextContents();
    const uniqueTitles = new Set(articleTitles.map((t) => t.trim()));
    expect(uniqueTitles.size).toBe(articleTitles.length); // 所有標題應該是唯一的
  });

  test("新增文章不應產生多個重複項", async ({ page }) => {
    await page.waitForSelector(".article-management");

    const initialCount = await page.locator("tbody tr").count();

    // 點擊「新增文章」按鈕
    await page.locator('button:has-text("新增文章")').click();

    // 等待新文章建立
    await page.waitForTimeout(3000);

    // 等待可能的檔案監聽觸發
    await page.waitForTimeout(6000);

    // 返回列表
    const backButton = page.locator('[data-testid="back-to-list"]');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await page.waitForTimeout(1000);

    // 檢查只增加了一篇文章
    const finalCount = await page.locator("tbody tr").count();
    expect(finalCount).toBe(initialCount + 1);

    // 檢查沒有「未命名文章」的重複項
    const untitledArticles = await page.locator('tbody tr:has-text("未命名文章")').count();
    expect(untitledArticles).toBeLessThanOrEqual(1);
  });
});

test.describe("文章列表 - 排序穩定性", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("點擊文章後列表順序不應改變", async ({ page }) => {
    await page.waitForSelector(".article-management");

    // 記錄初始順序
    const initialTitles = await page.locator("tbody tr td:nth-child(2)").allTextContents();

    // 點擊中間的文章
    await page
      .locator("tbody tr")
      .nth(Math.floor(initialTitles.length / 2))
      .click();

    // 等待
    await page.waitForTimeout(6000);

    // 返回列表
    const backButton = page.locator('[data-testid="back-to-list"]');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await page.waitForTimeout(1000);

    // 檢查順序
    const finalTitles = await page.locator("tbody tr td:nth-child(2)").allTextContents();

    expect(finalTitles).toEqual(initialTitles);
  });

  test("自動儲存觸發後列表順序不應改變", async ({ page }) => {
    await page.waitForSelector(".article-management");

    const initialTitles = await page.locator("tbody tr td:nth-child(2)").allTextContents();

    // 點擊文章進入編輯
    await page.locator("tbody tr").first().click();

    await page.waitForSelector('[data-testid="editor"]', { timeout: 5000 });

    // 修改內容但不手動儲存，等待自動儲存
    const editor = page.locator('[data-testid="editor"]');
    await editor.click();
    await editor.type(" - 自動儲存測試");

    // 等待自動儲存（假設間隔 30 秒，但我們等 35 秒確保觸發）
    await page.waitForTimeout(35000);

    // 返回列表
    const backButton = page.locator('[data-testid="back-to-list"]');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await page.waitForTimeout(1000);

    // 檢查順序
    const finalTitles = await page.locator("tbody tr td:nth-child(2)").allTextContents();
    expect(finalTitles).toEqual(initialTitles);
  });
});

test.describe("文章列表 - 分頁功能", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("切換文章不應重置 currentPage", async ({ page }) => {
    await page.waitForSelector(".article-management");

    // 檢查是否有分頁
    const paginationExists = await page.locator(".pagination-bar").isVisible();

    if (paginationExists) {
      // 切換到第 2 頁
      await page.locator('button:has-text("»")').click();
      await page.waitForTimeout(500);

      // 記錄當前頁碼
      const currentPageText = await page.locator(".pagination-bar .join-item.btn:nth-child(2)").textContent();

      // 點擊文章
      await page.locator("tbody tr").first().click();
      await page.waitForTimeout(2000);

      // 返回列表
      const backButton = page.locator('[data-testid="back-to-list"]');
      if (await backButton.isVisible()) {
        await backButton.click();
      }

      await page.waitForTimeout(500);

      // 檢查頁碼
      const finalPageText = await page.locator(".pagination-bar .join-item.btn:nth-child(2)").textContent();
      expect(finalPageText).toBe(currentPageText);
    }
  });
});
