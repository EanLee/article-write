/**
 * Inspector 面板 E2E 測試
 *
 * 背景（IA Phase 3 子專案 1：三欄式工作區骨架）：原本分散的三個掛載點——
 * AI 面板（AIPanelView，右側獨立 dock）、Frontmatter 編輯（FrontmatterEditor，
 * 由側邊欄「文章資訊」頁籤的編輯按鈕開啟 Modal）、底部開發伺服器控制台
 * （ServerControlPanel，橫跨 App.vue 底部）——合併為右側 InspectorView 的
 * 三個內部頁籤（屬性／AI 助手／發布）。
 *
 * 本檔案取代並整併以下三支舊 spec（邏輯沿用，選擇器改用新 UI）：
 *   - tests/e2e/ai-panel.spec.ts          → (c) AI 助手頁籤：SEO 生成功能可見
 *   - tests/e2e/frontmatter-sidebar-edit.spec.ts → (d) 屬性頁籤：欄位編輯寫回 articleStore
 *   - tests/e2e/server-control-panel.spec.ts     → (e) 發布頁籤：伺服器控制列與日誌
 * 另外新增 (a)(b)(f) 涵蓋 Inspector 外殼本身（預設可見、折疊/展開、模式切換）。
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

test.describe("Inspector 面板", () => {
  test.beforeEach(async ({ window, testVaultPath }) => {
    ensureTestArticle(testVaultPath);

    // worker 共用的 App 實例會殘留前一個測試的記憶體狀態（Inspector 開合、目前頁籤、
    // 文章草稿變更等），每個測試前 reload 讓 App 從乾淨的初始狀態重新掛載，
    // 不依賴 FileWatch（CI 上可能延遲 > 15s，見 e2e-testing-rules skill 失敗模式 6），
    // 也讓每個測試彼此獨立、不必手動還原狀態。
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

  test("編輯模式下 Inspector 預設可見，預設頁籤為屬性", async ({ window }) => {
    const view = window.getByTestId("inspector-view");
    await expect(view).toBeVisible({ timeout: 5000 });

    await expect(window.getByTestId("inspector-tab-properties")).toHaveClass(/tab-active/);
  });

  test("點擊 ActivityBar 按鈕可折疊/展開 Inspector", async ({ window }) => {
    const toggleButton = window.getByTestId("inspector-toggle-button");
    const view = window.getByTestId("inspector-view");

    await expect(view).toBeVisible({ timeout: 5000 });

    await toggleButton.click();
    await expect(view).not.toBeVisible();

    // 再點一次應重新展開
    await toggleButton.click();
    await expect(view).toBeVisible({ timeout: 5000 });
  });

  test("切換到「AI 助手」頁籤能看到 SEO 生成功能", async ({ window }) => {
    const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: ARTICLE_TITLE });
    await articleRow.waitFor({ state: "visible", timeout: 15000 });
    await articleRow.click();

    const view = window.getByTestId("inspector-view");
    await view.getByTestId("inspector-tab-ai").click();

    await expect(view.getByText("SEO 生成")).toBeVisible({ timeout: 5000 });
  });

  test("屬性頁籤修改欄位後 articleStore 實際更新", async ({ window }) => {
    const articleRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: ARTICLE_TITLE });
    await articleRow.waitFor({ state: "visible", timeout: 15000 });
    await articleRow.click();

    const view = window.getByTestId("inspector-view");
    await view.getByTestId("inspector-tab-properties").click();

    const titleInput = window.locator("#properties-title-input");
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await expect(titleInput).toHaveValue(ARTICLE_TITLE);

    const updatedTitle = `${ARTICLE_TITLE}－已修改`;
    await titleInput.fill(updatedTitle);
    await titleInput.blur();

    // PropertiesTab 的 commitTitle() 呼叫 articleStore.updateArticleInMemory()，
    // 該方法同時更新 articles 陣列與 currentArticle；側邊欄文章列表項目的標題
    // 是直接綁定 article.title 渲染，能反映出 articleStore 確實已更新（而非只是
    // 表單自己的本地草稿沒有寫回）。
    const updatedRow = window.locator('[data-testid="article-tree-item"]').filter({ hasText: updatedTitle });
    await expect(updatedRow).toBeVisible({ timeout: 5000 });
  });

  test("切換到「發布」頁籤能看到伺服器控制列與展開日誌", async ({ window }) => {
    const view = window.getByTestId("inspector-view");
    await view.getByTestId("inspector-tab-publish").click();

    await expect(view.getByText("開發伺服器")).toBeVisible({ timeout: 5000 });
    // 日誌面板不再有獨立收合開關，切到發布頁籤即恆常渲染
    await expect(window.getByTestId("server-panel-log")).toBeVisible({ timeout: 5000 });
  });

  test("切換到管理模式後 Inspector 消失", async ({ window }) => {
    const view = window.getByTestId("inspector-view");
    await expect(view).toBeVisible({ timeout: 5000 });

    await window.locator('button[title^="管理模式"]').click();
    await expect(view).not.toBeVisible();

    // 還原模式，避免影響共用 worker 內的其他測試
    await window.locator('button[title^="編輯模式"]').click();
  });
});
