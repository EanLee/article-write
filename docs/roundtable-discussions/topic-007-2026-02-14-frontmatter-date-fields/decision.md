# 決策記錄：Frontmatter 時間欄位命名與語意釐清

> **話題編號**: topic-007
> **決策日期**: 2026-02-14
> **決策類型**: 全體一致

---

## 決策結果

**最終決定**：將 `date` 欄位改為 `pubDate`，新增 `created` 欄位，`lastmod` 保持不變

---

## 欄位定義

| 欄位 | 語意 | 填入時機 |
|------|------|---------|
| `created` | 建立時間 | WriteFlow 首次開啟時自動填入（優先沿用舊 `date` 值） |
| `pubDate` | 公開/發佈時間 | 同步輸出時自動填入；已有值則沿用 |
| `lastmod` | 最後修改時間 | 保持現狀 |

## 自動移轉規則（開啟文章時執行）

| 偵測條件 | 自動處理 |
|---------|---------|
| 無 `created`，`date` 有值 | 用 `date` 值填入 `created` |
| 無 `created`，`date` 無值 | 填入當下時間 |
| 有 `date`，無 `pubDate` | 複製 `date` → `pubDate`，移除 `date` |
| 有 `date`，有 `pubDate` | 保留 `pubDate`，移除 `date` |

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| PM (Alex) | ⚠️ 條件支持 | 現在改成本最低，需提供移轉說明 |
| Marketing (Lisa) | ✅ | 清楚的欄位語意有助使用者理解與推廣 |
| User (Jordan) | ✅ | `date` 命名讓人困惑，三欄位語意清楚 |
| Ops (Sam) | ✅ | 語意不清已造成實際開發事故 |
| CTO (Taylor) | ✅ | `pubDate` 符合 Astro 慣例，ROI 高 |

**結果**：全體一致

---

## 行動項目

| 項目 | 負責人 | 優先級 | 狀態 |
|------|-------|-------|------|
| Frontmatter interface：`date` → `pubDate`，新增 `created` | Lin | P0 | ✅ |
| PublishService.convertFrontmatter() 改處理 `pubDate` | Lin | P0 | ✅ |
| migrateArticleFrontmatter()：自動補 `created` + 移轉 `date` | Lin | P0 | ✅ |
| 初始化必要欄位（title, description, slug, keywords） | Lin | P0 | ✅ |
| 更新 GOTCHAS.md | Sam | P1 | ✅ |

---

## 追蹤

**驗證方式**：開啟舊文章時自動移轉正確，同步輸出 pubDate 正確
**回顧日期**：下次端到端手動測試時確認
