/**
 * Smoke tests - 基本煙霧測試
 * 驗證 Electron 應用程式基本功能是否正常運作
 */

import { test, expect } from "./helpers/electron-fixture";

test.describe("應用程式基本功能", () => {
  test("應用程式應該能正常載入", async ({ window }) => {
    // 驗證 Electron 視窗標題
    const title = await window.title();
    expect(title).toMatch(/WriteFlow|文章/);
  });

  test("應用程式主要容器應該存在", async ({ window }) => {
    // 確認 Vue 已掛載（#app 有子元素）
    // 用 .first() 避免 strict mode 違規：預覽 iframe 也包含 #app
    const appContainer = window.locator("#app").first();
    await expect(appContainer).not.toBeEmpty({ timeout: 10000 });
  });
});
