# WriteFlow 發布哲學與設計決策

> **建立日期**: 2026-02-14
> **版本**: v1.0
> **來源**: 圓桌會議 #006

---

## 核心哲學：WriteFlow 是主工具，Obsidian Vault 是資料來源

WriteFlow 是使用者的主要發布工具。

**Obsidian Vault 是資料來源，不是主人。**

許多使用者在 WriteFlow 存在之前已經使用 Obsidian 累積大量文章。WriteFlow 直接讀取 `.md` 檔案，目的是**降低這些使用者的轉換成本**——他們不需要搬移資料，只需要設定資料夾路徑，WriteFlow 就能接管發布流程。

```
Obsidian Vault (.md files)
  ← 使用者過去的文章庫（資料來源）
  ← WriteFlow 讀取並寫入 status 欄位

WriteFlow（主工具）
  → 管理文章狀態（設定 status 欄位）
  → 手動觸發時，全量輸出到 target
  → 使用者在 WriteFlow 內完成所有發布決策
```

使用者也可以繼續在 Obsidian 直接編輯 frontmatter，WriteFlow 會尊重 `.md` 的內容——但這是相容性設計，不是架構依賴。

---

## Status 欄位規則

```yaml
# 文章 frontmatter 範例
---
title: 我的文章
status: published   # 或 draft
slug: my-article
date: 2026-02-14
---
```

| 情況 | 行為 |
|------|------|
| frontmatter 有 `status: published` | 同步時輸出 |
| frontmatter 有 `status: draft` | 同步時略過 |
| frontmatter **沒有** status 欄位 | 預設視為 `draft`，不輸出 |
| WriteFlow 設定狀態 | 寫入 status 欄位到 .md 檔案 |

WriteFlow 和 Obsidian 都可以修改 status，`.md` 檔案是唯一的真相來源。

---

## 發布流程

### 觸發方式

**手動**。使用者按「同步到 Blog」按鈕。

```
不是：
  ❌ 單篇發布（編輯器內的「發布這篇」）
  ❌ 自動/背景同步
  ❌ 儲存時自動輸出

是：
  ✅ 使用者主動觸發的全量同步操作
```

### 同步邏輯

```
1. 掃描 articlesDir 下所有 .md 檔案
2. 讀取 frontmatter status
3. 過濾出 status === 'published' 的文章
4. 全量輸出到 target（覆蓋舊版本）
5. 顯示同步結果（幾篇成功、幾篇失敗）
```

---

## 輸出結構（Leaf 模式）

每篇文章輸出為獨立資料夾，文章與圖片放在一起：

```
{target}/                     ← 使用者設定的 content 資料夾
  my-article/
    index.md                  ← 轉換後的文章（Obsidian 語法 → 標準 Markdown）
    images/
      screenshot.png          ← 該文章引用的圖片
  another-article/
    index.md
    images/
      photo.jpg
```

### 路徑對應

| 項目 | 路徑 |
|------|------|
| target 設定值 | 直接指向 content 資料夾（例：`C:\blog\src\content\blog`） |
| 文章輸出 | `{target}/{slug}/index.md` |
| 圖片輸出 | `{target}/{slug}/images/{filename}` |

### 為什麼用 Leaf 模式？

- 每篇文章自包含（文章 + 圖片在同一資料夾）
- 刪除文章只需刪除資料夾，不影響其他文章的圖片
- 圖片引用路徑清楚：`./images/photo.png`
- 與 Astro、Hugo、Nuxt Content 等靜態網站框架的 slug-based 路由相容

---

## 設定項目

```typescript
interface AppConfig {
  paths: {
    articlesDir: string   // Obsidian vault 中文章的根目錄
    targetBlog: string    // 輸出的 content 資料夾（直接指向，非專案根目錄）
  }
}
```

**範例**：

```
articlesDir = C:\Users\Ean\Obsidian\Blog
targetBlog  = C:\Users\Ean\Projects\my-blog\src\content\blog
```

---

## UI 設計原則

「同步到 Blog」是**全域操作**，不屬於單篇文章的編輯流程：

```
✅ 正確位置：文章管理頁的全域操作區、側邊欄底部
❌ 錯誤位置：編輯器標頭（暗示「發布這篇」）、文章列表的每列操作按鈕
```

在編輯器或文章列表內，只允許修改 **status 欄位**（草稿 ↔ 已發布），不直接觸發同步。

---

## 相關文件

- [圓桌 #006 — 發布機制落差確認](../roundtable-discussions/2026-02-14-publish-mechanism-clarification.md)
- [端到端發布流程](./E2E_PUBLISH_FLOW.md)（需更新以反映本文件決策）
