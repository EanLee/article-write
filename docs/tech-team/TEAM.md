# WriteFlow 技術團隊

> **組建日期**: 2026-02-14
> **組建原因**: 圓桌會議 #006 決策後，需要專責技術團隊推進實作
> **負責人**: Sam（Tech Lead）

---

## 團隊成員

| 成員 | 角色 | 專責範圍 |
|------|------|---------|
| Sam | Tech Lead | 架構決策、技術審查、跨模組整合 |
| Wei | Frontend Engineer | Vue 組件、UI 互動、Renderer 層 |
| Lin | Services Engineer | Main Process、Service 層、IPC 通訊 |
| Alex | UI/UX Designer | 使用者體驗、視覺設計規範、元件設計系統 |

---

## 工作原則

1. **以圓桌決策為依據**：技術實作服務於圓桌會議的產品決策，不自行擴大範圍
2. **先討論後動手**：影響架構的改動，先在技術討論中對齊，再開始實作
3. **文件同步**：架構文件與程式碼同步更新，不允許文件落後於程式碼
4. **一次做對**：寧可慢一點把邊界討論清楚，不要快速實作後再回頭重構

---

## 目前任務來源

[圓桌會議 #006 行動項目](../roundtable-discussions/topic-006-2026-02-14-publish-mechanism/decision.md)

---

## 討論記錄索引

| 編號 | 主題 | 日期 | 狀態 |
|------|------|------|------|
| T-001 | 發布機制重構技術規劃 | 2026-02-14 | ✅ 完成 |
| T-002 | 技術評估：自動儲存機制（Hash vs Dirty Flag） | 2026-02-14 | ✅ 完成 |
| T-003 | GitHub Actions CI/CD 建置 | 2026-02-15 | ✅ 完成 |
| T-004 | Changelog 自動化方案評估（release-please） | 2026-02-15 | ✅ 完成 |
| T-005 | Metadata Cache 設計評估（分類/標籤快取） | 2026-02-15 | ✅ 完成 |
| T-006 | Article.category 型別重構（enum → string） | 2026-02-15 | ✅ 完成 |
| T-007 | Playwright + Electron E2E 測試環境建置方案評估 | 2026-02-15 | ✅ 完成 |
| T-008 | Auto-Update 機制實作（electron-updater） | 2026-02-16 | 🚧 進行中 |
| UX-001 | 表單設計規範 | 2026-02-15 | ✅ 完成 |
| RETRO-001 | 流程回顧：一個需求變三個 Branch | 2026-02-15 | ✅ 完成 |
