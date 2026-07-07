---
title: "決策：Tauri 底層遷移評估"
topic: "024"
date: 2026-07-08
domain: engineering
status: decided
decision_type: 全體一致
---

# 決策記錄 #024 — Tauri 底層遷移評估

## 決策結果

**最終決定：現階段維持 Electron 架構，暫不遷移 Tauri；設定明確觸發條件供未來重啟評估。**

**決策理由**：
- 三項遷移動機（bug 太多、檔案太大、auto-update）均有在 Electron 框架內解決的替代方案
- Tauri 遷移需 3~4 個月空窗期，現有使用者規模下代價高於收益
- 集中資源穩定現有產品比平台遷移更具即時價值

---

## 投票結果

| 角色 | 立場 | 理由 |
|------|------|------|
| 🎯 Alex（PM） | ✅ 不遷移 | 遷移空窗期使用者流失風險不可接受；三項訴求均有替代解法 |
| 📢 Lisa（Marketing） | ✅ 不遷移（有條件） | 支持長期遷移目標，但時機需等 v1.0 穩定後；Tauri 是行銷賣點，但現在說「正在重寫」更傷品牌 |
| 👤 Jordan（User） | ✅ 不遷移 | 先要一個今天可用的 app；三個月空窗期會導致流失至競品 |
| 🔧 Sam（Ops） | ✅ 不遷移 | WebView 跨平台維護複雜度高；需有 Rust 工程師才值得遷移 |
| 💻 Taylor（CTO） | ✅ 不遷移（技術上支持長期目標） | Tauri 優勢真實，但現在遷移代價高於收益；以觸發條件代替任意時間點的評估 |

**決策類型**：全體一致

---

## Tauri 技術評估結論（供未來參考）

| 面向 | Electron（現況） | Tauri 2.0 |
|------|----------------|----------|
| Bundle size | ~130MB（含 Chromium） | ~5~10MB（OS WebView） |
| 記憶體佔用 | 200~400MB | 50~100MB |
| IPC 安全性 | contextBridge（JS，需手動型別） | Rust commands（type-safe，serde_json） |
| 跨平台一致性 | 高（Chromium 同版） | 中（WKWebView / WebView2 / WebKitGTK 行為差異） |
| Auto-update | 需整合 electron-updater（1~2 週） | 內建 tauri-plugin-updater |
| 遷移成本 | — | Main process 完整 Rust 重寫，3~4 個月 |
| 學習曲線 | 低（JS/TS 熟悉） | 高（Rust 所有權系統） |

---

## Tauri 重啟評估觸發條件

以下**任一條件**成立時，重啟 Tauri 遷移評估：

1. **使用者規模**：MAU 達到 500 以上，遷移投資有足夠使用者基礎支撐
2. **Rust 工程師**：團隊有具備 Rust 經驗的工程師加入
3. **Electron 障礙**：出現 Electron 本身無法 workaround 的重大問題（平台封鎖、嚴重安全漏洞等）
4. **產品里程碑**：v1.0 穩定版已發布，且 auto-update 需求明確優先化

---

## ✅ Action Items

| # | 行動項目 | 負責人 | 優先級 | 狀態 | 完成條件 |
|---|---------|--------|--------|------|---------|
| A1 | 研究 Electron bundle 優化方案（asar 壓縮、差分安裝），產出技術評估報告 | Taylor | P2 | ⏳ 待開始 | 報告含目標大小（目標 < 80MB）與實作步驟 |
| A2 | 將 auto-update 排入 roadmap 並估時（electron-updater + GitHub Releases） | Alex | P2 | ⏳ 待開始 | Roadmap 更新，auto-update 有明確排期 |
| A3 | 將「Tauri 重啟評估觸發條件」加入技術 backlog 追蹤 | Taylor | P3 | ✅ 完成（記錄於本文件） | decision.md 完成並更新索引 |

---

## 追蹤

- **驗證方式**：A1 評估報告完成後，在技術會議確認 bundle 優化方向；A2 auto-update 排期完成後，正式在 roadmap 標示
- **回顧日期**：6 個月後（2027-01）或觸發條件成立時重啟評估
- **關聯議題**：topic-012（auto-update 延後）、topic-023（quit with unsaved changes）
