# Config Schema 路徑欄位強制驗證 Bug Fix 報告

**日期**: 2026-03-07
**影響範圍**: 設定儲存 / 文章載入
**嚴重程度**: High

## 問題描述

使用者在設定頁面指定文章資料夾（`articlesDir`）後，點擊「儲存設定」，文章列表仍為空、無法查詢到任何文章。

- 問題現象：有設定文章資料夾，但文章無法載入
- 發生條件：首次設定，或 `targetBlog` / `imagesDir` 其中一項為空字串
- 影響範圍：所有未完整設定三個路徑的使用者

## 原因分析

`src/main/schemas/config.schema.ts` 中 Zod schema 將三個路徑欄位都設定為 `z.string().min(1)`（不得為空）：

```ts
paths: z.object({
  articlesDir: z.string().min(1, "articlesDir 不得為空"),
  targetBlog: z.string().min(1, "targetBlog 不得為空"),   // ← 問題所在
  imagesDir: z.string().min(1, "imagesDir 不得為空"),    // ← 問題所在
}),
```

但 UI（`SettingsPanel.vue`）的 `canSave` computed 只要求 `articlesDir`：

```ts
const canSave = computed(() => {
  // 只需要文章資料夾即可儲存，部落格路徑為選填
  return !!localConfig.value.paths.articlesDir
})
```

**前後端契約不一致**：使用者在 `targetBlog` 為空時點擊儲存，IPC handler `SET_CONFIG` 的 Zod 驗證失敗，拋出錯誤。`handleSave()` 的 catch 只做 `logger.error`（不顯示 UI 錯誤提示），使用者沒有收到任何失敗回饋，config 未被儲存，文章也無法載入。

schema 原本的安全說明「防止空白路徑繞過 FileService 白名單」已由 `FileService.setAllowedPaths` 中的 `.filter(Boolean)` 覆蓋，schema 額外強制 `min(1)` 屬於過度限制。

## 修正方式

修改 `src/main/schemas/config.schema.ts`，將 `targetBlog` 與 `imagesDir` 改為 `z.string()`（允許空字串）：

```ts
paths: z.object({
  articlesDir: z.string().min(1, "articlesDir 不得為空"),
  targetBlog: z.string(),   // 選填
  imagesDir: z.string(),    // 選填
}),
```

同步更新 `tests/schemas/config.schema.test.ts`：
- 原先「targetBlog/imagesDir 為空字串應失敗」改為「應被接受（選填欄位）」
- 新增「只設定 articlesDir、其餘路徑為空字串應被接受」測試案例

## 相關 Commit

（待提交後補充）
