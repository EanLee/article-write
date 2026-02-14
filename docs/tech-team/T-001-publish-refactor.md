# 技術討論 T-001 — 發布機制重構

> **日期**: 2026-02-14
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）
> **依據**: 圓桌 #006 決策

---

## 任務清單（來自圓桌 #006）

| # | 任務 | 負責人 | 狀態 |
|---|------|--------|------|
| 1 | `PublishService.ts` — 修正圖片路徑 bug，輸出改為 Leaf 結構 | Lin | ✅ 完成 |
| 2 | `EditorHeader.vue` — 移除「發布到部落格」按鈕，改為狀態切換 | Wei | ✅ 完成 |
| 3 | `ArticleManagement.vue` — 移除列表內單篇發布按鈕與相關邏輯 | Wei | ✅ 完成 |
| 4 | `MainEditor.vue` + `article store` — 移除單篇發布邏輯，`moveToPublished` 重構為 `toggleStatus` | Wei | ✅ 完成 |
| 5 | 新增全域「同步到 Blog」按鈕（位置：`ArticleManagement.vue` 頂部） | Wei | ✅ 完成 |
| 6 | `PublishService` — 新增 `syncAllPublished()` 全量同步方法 | Lin | ✅ 完成 |
| 7 | IPC / preload — 新增 `syncAllPublished` 通道 | Lin | ✅ 完成 |
| 8 | `E2E_PUBLISH_FLOW.md` — 更新文件 | Sam | ✅ 完成 |

---

## 討論記錄

---

### Sam：開場與任務分配

**Sam**：我們的目標很清楚，全部來自圓桌 #006 的決策，不需要再發明新東西。
我把任務分三個區塊：

- **Services 層**（Lin 負責）：PublishService 的結構改動、新增全量同步方法、IPC 通道
- **UI 層**（Wei 負責）：移除錯誤位置的按鈕、新增全域同步按鈕
- **文件**（Sam 負責）：實作完成後更新 E2E_PUBLISH_FLOW.md

我們先把邊界說清楚，再動手。

---

### Lin：Services 層分析

**Lin**：我看了 `PublishService.ts`，有幾件事要確認。

**第一件事：Leaf 結構的路徑改動**

現在 `writeToAstro` 輸出的是 `{target}/{slug}.md`。
改成 Leaf 之後要變成 `{target}/{slug}/index.md`。

`processImages` 現在的圖片目標是 `{target}/public/images/`，這是舊設計的殘留，而且是個 bug。
改成 Leaf 之後圖片要輸出到 `{target}/{slug}/images/{filename}`。

圖片 content 內的引用路徑本來就是 `./images/filename`，Leaf 結構下這個相對路徑剛好對——不需要額外改 content 內容。

**第二件事：圖片來源**

現在圖片來源是 `config.imagesDir || join(config.articlesDir, 'images')`。
這個邏輯可以保留，圖片來源跟輸出結構是兩件獨立的事。

**第三件事：全量同步 `syncAllPublished()`**

需要新增一個方法：接收 `articlesDir` 和 `targetBlogDir`，掃描所有 published 文章，對每篇呼叫 `publishArticle()`。

**Sam 確認**：`syncAllPublished()` 的回傳值呢？

**Lin**：建議回傳：
```
{
  total: number        // 找到幾篇 published 文章
  succeeded: number    // 幾篇成功
  failed: number       // 幾篇失敗
  errors: string[]     // 每篇失敗的原因
}
```

這樣 UI 才能顯示有意義的結果給使用者。

**Sam**：同意，這個介面清楚。

**Wei 追問**：`syncAllPublished()` 需要傳入文章清單嗎？還是自己掃目錄？

**Lin**：自己掃目錄比較乾淨——Services 層不依賴前端的 store 狀態。傳入 `articlesDir`，自己讀目錄、讀 frontmatter、過濾 published。這樣也符合未來 CLI 呼叫的可能性。

**Sam**：好，就這樣。Lin 先做 T-1（Leaf 路徑修正），確認沒問題再做 T-6（全量同步方法）。

---

### Wei：UI 層分析

**Wei**：我看了 `EditorHeader.vue` 和 `ArticleManagement.vue`，說一下我的規劃。

**EditorHeader 的改動**

現在有兩個按鈕需要處理：
1. `移至已發布資料夾`（`move-to-published` event）— 這個**語意也需要修正**
2. `發布到部落格`（`publish-to-blog` event）— 這個**直接移除**

第一個按鈕「移至已發布資料夾」這個名稱是舊架構的殘留（以前真的有 Publish 資料夾）。
圓桌 #006 決定：單篇文章的操作是「標記 status」。
所以這個按鈕要改名為「標記為已發布」，行為從 `move-to-published` 改為 `toggle-status`，切換 draft ↔ published。

**Sam**：這個觀察對。「移至資料夾」的語意已經不正確了。那 `move-to-published` 的 store action 呢？

**Wei**：`articleStore.moveToPublished()` 我建議改名為 `articleStore.toggleStatus()`，語意更清楚，也符合新設計——只改 frontmatter status，不做任何檔案移動。

**Lin**：store action 改名要確認一下 `MainEditor.vue` 裡有沒有直接呼叫，不然會漏改。

**Wei**：我會查，連帶一起改。

**ArticleManagement 的改動**

`handlePublishArticle` 這整個 function 和相關的 state（`publishingArticleId`、`publishProgress`）都可以直接移除。
列表裡的「發布到部落格」按鈕也一起拿掉。

全域「同步到 Blog」按鈕放在 ArticleManagement 頂部的 stats 區域旁，等 Lin 完成 T-6 的 IPC 通道後再串接。

**Sam**：同意這個規劃。注意一件事：`ArticleManagement` 裡的 `publishingArticleId` 狀態移除之後，要確認沒有其他地方在讀這個值。

**Wei**：明白，我會 grep 一下。

---

### Sam：執行順序確認

```
執行順序：

Phase 1（可平行）：
  ✅ Lin  — T-1：PublishService Leaf 路徑修正
  ✅ Wei  — T-2、T-3、T-4：移除錯誤按鈕與邏輯

Phase 2（等 Phase 1 完成）：
  ✅ Lin  — T-6：新增 syncAllPublished()
  ✅ Lin  — T-7：IPC / preload 通道

Phase 3（等 T-7 完成）：
  ✅ Wei  — T-5：全域「同步到 Blog」按鈕串接

Phase 4（等全部完成）：
  ✅ Sam  — T-8：更新 E2E_PUBLISH_FLOW.md
```

**注意事項**：
- 所有改動在同一個 feature branch 上進行（`feature/p0-1-settings-ui`）
- 每個 Phase 完成後跑一次 `pnpm run test` 確認測試沒有破壞
- UI 改動 Wei 要自行在本地確認畫面正確

---

## 實作筆記（Lin — Services 層）

### T-1：PublishService Leaf 路徑修正

改動範圍：`src/main/services/PublishService.ts`

- `writeToAstro()`：輸出路徑從 `{target}/{slug}.md` 改為 `{target}/{slug}/index.md`
- `processImages()`：圖片目標從 `{target}/public/images/` 改為 `{target}/{slug}/images/`
- `processImages()` 需要接收 `article.slug`（現在 `_article` 參數是未使用的，改為使用）

---

## 實作筆記（Wei — UI 層）

### T-2：EditorHeader.vue

- 移除「發布到部落格」按鈕（`publish-to-blog` emit）
- 「移至已發布資料夾」改為「標記狀態」切換按鈕（`toggle-status` emit）
- 按鈕文字：draft 時顯示「標記為已發布」，published 時顯示「改為草稿」
- 移除 `Send` icon import、`publish-to-blog` emit 宣告
- 移除 `move-to-published` emit，新增 `toggle-status` emit

### T-3：ArticleManagement.vue

- 移除列表內「發布到部落格」按鈕（第 129 行）
- 移除 `handlePublishArticle` function
- 移除 `publishingArticleId`、`publishProgress` ref
- 移除 `canPublish` computed
- 移除相關 import（`PublishConfig`、`PublishResult`）

### T-4：MainEditor.vue

- 移除 `handlePublishToBlog` function
- 移除 `moveToPublished` function（或確認是否需要保留並改名）
- 更新 `EditorHeader` 的 event binding：`move-to-published` → `toggle-status`
