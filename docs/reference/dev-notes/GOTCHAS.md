# 開發特別注意事項

> 記錄開發過程中遇到的命名限制、語意陷阱、特殊規則等，避免後續開發者重複踩坑。

---

## 001 · Frontmatter 時間欄位定義（圓桌 #007）

**日期**：2026-02-14
**相關檔案**：`src/types/index.ts`、`src/main/services/PublishService.ts`、`src/stores/article.ts`

### 三個時間欄位

| 欄位 | 語意 | 填入時機 |
|------|------|---------|
| `created` | 建立時間 | WriteFlow 首次開啟時自動填入 |
| `pubDate` | 公開/發佈時間 | 同步輸出時自動填入；已有值則沿用 |
| `lastmod` | 最後修改時間 | 保持現狀 |

### 自動移轉邏輯（`migrateArticleFrontmatter`）

開啟文章時執行，順序固定（先處理 `created`，再移轉 `date`）：

1. 無 `created` 且有舊 `date` → 用 `date` 值填入 `created`
2. 無 `created` 且無 `date` → 填入當下時間
3. 有 `date` 且無 `pubDate` → 複製 `date` → `pubDate`，刪除 `date`
4. 有 `date` 且有 `pubDate` → 保留 `pubDate`，刪除 `date`

### 不要這樣做

```ts
// ❌ 不要在解析場合強制補時間（掩蓋語意）
date: get('date') || new Date().toISOString()

// ❌ pubDate 用舊欄位名 date
converted.date = new Date().toISOString()
```

### 部落格端對應

使用者的 Astro blog `content/config.ts` 需對應調整：

```ts
// 舊
date: z.string().optional()

// 新
pubDate: z.string().optional(),
created: z.string().optional(),
```

---
