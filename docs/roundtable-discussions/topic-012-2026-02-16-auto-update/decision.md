# 決策記錄：線上自動更新機制評估

> **話題編號**: topic-012
> **決策日期**: 2026-02-16
> **決策類型**: 全體一致

---

## 決策結果

**最終決定**:
導入 `electron-updater` 實作 Auto-Update 機制。v0.2 Alpha 優先完成 Windows + Linux，macOS 因 Code Signing 問題暫緩至 v0.3 Beta。

**決策理由**:
手動更新轉換率低（業界約 30%），Alpha 推廣前若無 Auto-Update 將造成版本碎片化與口碑風險。技術上成本低（`electron-builder` 已安裝，GitHub Releases 已就緒），行為模式採「背景下載 + 使用者決定重啟時機」，不打斷使用者工作流程。

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| PM（Alex） | ✅ | Alpha 推廣前必要，留存率直接相關 |
| Marketing（Lisa） | ✅ | 行銷賣點 + 品牌保護 |
| User（Jordan） | ✅ | 不要手動下載，不要強制重啟 |
| Ops（Sam） | ✅（條件） | 需要 fallback 機制 |
| CTO（Taylor） | ✅ | 技術可行，建議漸進策略 |

---

## 關鍵決策細節

| 項目 | 決定 |
|------|------|
| Update Server | GitHub Releases（零成本） |
| 下載行為 | 背景靜默下載，不通知直到完成 |
| 套用行為 | 啟動時詢問使用者（立刻重啟 / 下次啟動） |
| 強制更新 | 不實作，Alpha 階段全部軟提示 |
| v0.2 平台支援 | Windows ✅ / Linux ✅ / macOS ❌（暫緩） |
| macOS 解鎖條件 | 購買 Apple Developer 帳號（$99/年）後評估 |
| Changelog 彈窗 | P3 Backlog，不在本次範圍 |

---

## 行動項目

| 項目 | 負責人 | 優先級 | 狀態 |
|------|-------|-------|------|
| 建立 T-008：`electron-updater` 技術方案評估與實作計畫 | 技術團隊（Taylor 主導） | P1 | ⏳ 待開始 |
| 評估 Apple Developer 帳號費用與效益（v0.3 決策依據） | Alex（PM） | P2 | ⏳ 待開始 |
| Changelog 彈窗加入 Backlog | Alex（PM） | P3 | ⏳ 待開始 |

---

## 追蹤

**驗證方式**: v0.2 Alpha 測試者能在 Windows/Linux 上收到更新通知並完成更新，無需手動下載
**回顧日期**: v0.2 發布後（約 2026-03-01）
