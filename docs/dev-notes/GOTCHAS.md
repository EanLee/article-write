# 開發特別注意事項

> 記錄開發過程中遇到的命名限制、語意陷阱、特殊規則等，避免後續開發者重複踩坑。

---

## 001 · `Frontmatter.date` 的語意與限制

**日期**：2026-02-14
**相關檔案**：`src/types/index.ts`、`src/main/services/PublishService.ts`

### 問題

`date` 欄位名稱直覺上像「建立時間」，但實際語意是**公開/發佈時間**。

### 原因

現有部落格框架（Astro 等）使用 `date` 作為發佈日期欄位，**欄位名稱不能更改**，否則 blog 框架無法識別。

### 規則

| 情況 | 行為 |
|------|------|
| frontmatter 已有 `date` 值 | 直接沿用，不覆蓋 |
| frontmatter 無 `date` 值 | `PublishService.convertFrontmatter()` 同步時自動填入當日日期 |

- 文章**發佈前** `date` 可以是空值（`date?: string` 為可選欄位）
- WriteFlow **不單獨儲存建立時間**

### 不要這樣做

```ts
// ❌ 不要把 date 當建立時間使用
frontmatter.date = article.createdAt

// ❌ 不要強制補上 date（在 parseArticleFromFile 等解析場合）
date: get('date') || new Date().toISOString()  // 會掩蓋「尚未設定發佈時間」的語意
```

### 正確做法

```ts
// ✅ 只在同步輸出時（convertFrontmatter）才補日期
if (!converted.date) {
  converted.date = new Date().toISOString().split('T')[0]
}
```

---
