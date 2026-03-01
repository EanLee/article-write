/**
 * Q-03 E2E：同步發布流程
 * Happy Path：「切換 published → 點擊同步 → 目標資料夾出現正確檔案」
 */

import { test, expect } from "./helpers/electron-fixture"
import fs from "fs"
import path from "path"
import os from "os"

/** 建立一篇已發布的測試文章 */
function createPublishedArticle(vaultPath: string): { filePath: string; slug: string } {
  const slug = "e2e-publish-test"
  const dir = path.join(vaultPath, "Publish", "Software")
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${slug}.md`)
  fs.writeFileSync(filePath, [
    "---",
    "title: E2E 發布測試文章",
    `slug: ${slug}`,
    "date: 2026-02-15",
    "status: published",
    "---",
    "",
    "這是已發布的測試文章內容。",
  ].join("\n"), "utf-8")
  return { filePath, slug }
}

test.describe("同步發布流程", () => {
  let targetBlogPath: string

  test.beforeEach(async ({ window, testVaultPath }) => {
    // 建立目標 Blog 目錄（獨立於 testVaultPath）
    targetBlogPath = fs.mkdtempSync(path.join(os.tmpdir(), "writeflow-blog-"))

    // 建立已發布文章
    createPublishedArticle(testVaultPath)

    // 設定 articlesDir 與 targetBlog
    await window.evaluate(async ({ vault, blog }) => {
      const config = await (window as any).electronAPI.getConfig()
      config.paths.articlesDir = vault
      config.paths.targetBlog = blog
      await (window as any).electronAPI.setConfig(config)
    }, { vault: testVaultPath, blog: targetBlogPath })

    // 重新載入讓文章清單更新
    await window.reload()
    await window.waitForFunction(() => {
      const app = document.getElementById("app")
      return app !== null && app.children.length > 0
    }, undefined, { timeout: 15000 })
    await window.waitForTimeout(2000)
  })

  test.afterEach(() => {
    if (targetBlogPath && fs.existsSync(targetBlogPath)) {
      fs.rmSync(targetBlogPath, { recursive: true, force: true })
    }
  })

  test("切換到管理模式 → 同步 → 目標目錄出現 index.md", async ({ window }) => {
    // Step 1: 切換到管理模式（點擊 ActivityBar 管理模式按鈕）
    await window.locator('.activity-item[title="管理模式 (Ctrl+Shift+M)"]').click()
    await expect(window.locator(".article-management")).toBeVisible({ timeout: 10000 })

    // Step 2: 確認已發布文章存在
    const publishedRow = window.locator(".article-management tr").filter({ hasText: "E2E 發布測試文章" })
    await expect(publishedRow).toBeVisible({ timeout: 10000 })

    // Step 3: 點擊「同步到 Blog」按鈕
    const syncButton = window.locator("button").filter({ hasText: "同步到 Blog" })
    await expect(syncButton).toBeVisible({ timeout: 5000 })
    await syncButton.click()

    // Step 4: 等待同步完成（按鈕恢復非 loading 狀態）
    await expect(syncButton).not.toHaveClass(/loading/, { timeout: 30000 })

    // Step 5: 驗證目標目錄出現 {slug}/index.md
    const expectedFile = path.join(targetBlogPath, "e2e-publish-test", "index.md")
    await window.waitForTimeout(1000)
    expect(fs.existsSync(expectedFile)).toBe(true)

    // Step 6: 驗證輸出內容包含文章內文
    const content = fs.readFileSync(expectedFile, "utf-8")
    expect(content).toContain("E2E 發布測試文章")
  })
})
