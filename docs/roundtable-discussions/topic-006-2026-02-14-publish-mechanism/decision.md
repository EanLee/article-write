# 決策記錄：發布機制落差確認

> **話題編號**: topic-006
> **決策日期**: 2026-02-14
> **決策類型**: 全體一致

---

## 決策結果

**最終決定**：確立 WriteFlow 發布哲學與機制設計，補齊從未文件化的核心設計決策

---

## 確認的設計決策

| 議題 | 決策 |
|------|------|
| WriteFlow 定位 | 主工具；Obsidian vault 為資料來源，降低轉換成本 |
| status 缺失時 | 預設視為 draft，不輸出 |
| status 管理 | WriteFlow 提供 UI 切換，寫回 frontmatter |
| 發布觸發方式 | 手動按「同步到 Blog」，非自動/儲存時觸發 |
| 發布範圍 | 全量同步（所有 status: published 的文章） |
| 輸出結構 | Leaf 模式：`{slug}/index.md` + `{slug}/images/` |
| target 設定值 | 直接指向 content 資料夾，非 Blog 專案根目錄 |

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| PM (Alex) | ✅ | 設計哲學要在程式碼動之前說清楚 |
| Marketing (Lisa) | ✅ | 使用者不需要知道技術細節，全量同步更簡單 |
| User (Jordan) | ✅ | 手動觸發讓使用者有控制感 |
| Ops (Sam) | ✅ | Leaf 結構讓圖片管理更清楚 |
| CTO (Taylor) | ✅ | 全量同步邏輯簡單，不容易出錯 |

**結果**：全體一致

---

## 行動項目

| 項目 | 負責人 | 優先級 |
|------|-------|-------|
| 新建 `docs/architecture/PUBLISH_DESIGN.md` | Sam | P0 |
| 修正 PublishService 圖片路徑 bug，改為 Leaf 結構 | Lin | P0 |
| 更新 E2E_PUBLISH_FLOW.md 反映新設計 | Sam | P0 |
| 移除 EditorHeader 單篇發布按鈕 | Wei | P0 |
| 移除 ArticleManagement 列表單篇發布按鈕 | Wei | P0 |
| 新增全域「同步到 Blog」按鈕 | Wei | P0 |
| 實作 status 切換 UI（草稿 ↔ 已發布） | Wei | P0 |

---

## 追蹤

**驗證方式**：端到端同步流程完整跑通，所有行動項目完成
**回顧日期**：2026-02-18
