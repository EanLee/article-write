# 線上自動更新機制評估

> **話題編號**: topic-012
> **發起日期**: 2026-02-16
> **主持**: Alex Chen（PM）
> **狀態**: ✅ 已決策
> **相關話題**: T-008（技術實作）

---

## 📋 議題描述

**背景**:
- WriteFlow 目前版本 v0.1.0，即將進入 Alpha 推廣階段
- 現行更版流程：使用者手動發現新版 → 手動下載安裝檔 → 重新安裝覆蓋
- `electron-builder` 已安裝，GitHub Releases 已有安裝檔（.exe / .dmg / .AppImage）
- `electron-updater` 尚未安裝，無任何 Auto-Update 機制

**目標**:
- 評估是否導入 Auto-Update，以及導入的範圍與策略

**範圍**:
- ✅ 包含：Auto-Update 機制的策略決策（要不要做、做到哪個程度）
- ✅ 包含：平台支援範圍（Windows / macOS / Linux）
- ✅ 包含：macOS Code Signing 的商業決策方向
- ❌ 不包含：具體技術實作細節（交 T-008 技術討論處理）
- ❌ 不包含：Changelog 彈窗設計（另列 Backlog）

---

## 💬 討論記錄

### 第一輪討論 (2026-02-16)

**Alex**：「好，我先說明今天的議題。目前 WriteFlow 要更版，使用者得自己去發現新版、手動下載安裝檔、重新安裝覆蓋。我覺得這個體驗對一個生產力工具來說完全不可接受。業界統計手動更新轉換率大概只有 30%，意思是 70% 的使用者會一直卡在舊版——我們修了 bug，他們根本感受不到。Alpha 推廣前這個問題要解決。」

**Jordan**：「你說到我心坎裡了。每次看到『有新版，請去下載』我的第一反應就是『等等再說』，然後就忘了。我現在 Obsidian 也是這樣，已經落後三個版本還沒更。WriteFlow 如果能像 VS Code 那樣自動幫我搞定，我對它的信任感會高很多。但我有一個底線：**不要強制重啟**。我不希望寫到一半 App 突然跳出來要我重開。」

**Lisa**：「這個功能的行銷價值非常高。Notion、Obsidian、VS Code 都有 Auto-Update，沒有這個功能在市場上根本說不過去。而且這是品牌保護——Alpha 使用者如果因為舊版 bug 留下負評，傷害遠比沒有 Auto-Update 大。Support 那邊也會感謝我們，『請先確認你是最新版』這句話能少說多少次。」

**Sam**：「我支持做，但有幾個問題要先講清楚。第一，更新失敗怎麼辦？網路斷線、GitHub 下載失敗，App 要有 graceful fallback，不能因為更新掛了就讓整個 App 無法使用。第二，更新的成功和失敗狀態要有 log，我需要能查。第三——Taylor，macOS Code Signing 的問題你說一下。」

**Taylor**：「Sam 點到了關鍵。macOS 沒有 Code Signing，不只是 Auto-Update 無法正常工作，Gatekeeper 根本可能在第一次安裝時就把 App 封鎖。這是個商業決策——Apple Developer 帳號一年 99 美元，要不要買是 Alex 決定的，不是技術問題。技術上，Windows 和 Linux 用 `electron-updater` 搭配 GitHub Releases 完全沒問題，零成本，我們的 `electron-builder` 已經裝好了，整合起來不複雜。」

**Alex**：「macOS 的問題我理解。Alpha 階段先聚焦 Windows 和 Linux，macOS 暫緩——Alpha 測試者通常有能力繞過 Gatekeeper。Apple Developer 帳號的評估我來負責，v0.3 Beta 前給出決策。」

**Jordan**：「Taylor，我有個問題。如果我選了『下次啟動再更新』，App 會不會在我完全沒預期的時機突然跳出更新畫面？」

**Taylor**：「不會。標準做法是更新只在 App **啟動時**套用，不在運行中途強制重啟。你會看到的是：啟動 App 時短暫出現『正在安裝更新...』，然後進入主畫面。整個過程你是有預期的，不會突然被打斷。」

**Jordan**：「這樣可以接受。」

---

### 第二輪討論

**Lisa**：「有一個想法——更新完成後，能不能有個小彈窗顯示『這版的新功能』？像 Figma 那樣。對推廣很有幫助。」

**Taylor**：「技術上可行，但這不在 Auto-Update 的核心範圍。建議放到 Backlog，不要把它綁在這次的實作裡，不然範圍會失控。」

**Alex**：「同意 Taylor。Changelog 彈窗 P3，先把核心更新機制做穩。」

**Sam**：「最後確認一件事：更新的行為模式——背景靜默下載，下載完成後通知使用者，讓使用者選擇『現在重啟』或『下次啟動』，對嗎？」

**Alex**：「對，這是我們的共識。不打斷使用者工作，但讓他們知道有新版可用。」

**Taylor**：「那技術方向就清楚了。我來開 T-008，把 `electron-updater` 的實作方案整理出來。」

---

## 📊 觀點總結

| 角色 | 立場 | 核心論點 |
|------|------|---------|
| PM（Alex） | ✅ P1 | 留存率相關，Alpha 推廣前必要 |
| Marketing（Lisa） | ✅ 強烈支持 | 行銷賣點 + 品牌保護 + 降低 Support 成本 |
| User（Jordan） | ✅ 非常需要 | 不要手動下載，不要強制重啟 |
| Ops（Sam） | ⚠️ 條件支持 | 需要 fallback 機制，關注 macOS 簽名 |
| CTO（Taylor） | ✅ 支持 | 技術可行，macOS 需商業決策，建議漸進 |

---

## 🤝 共識與分歧

### 共識點

1. 要做 Auto-Update，全體同意
2. 行為模式：背景下載 + 使用者決定何時套用（不強制重啟）
3. Update Server：GitHub Releases（零成本，已在用）
4. macOS Code Signing 是獨立問題，不阻塞 Windows/Linux 實作
5. Changelog 彈窗不在本次範圍，P3 Backlog

### 主要分歧

| 議題 | 分歧內容 | 處理方式 |
|------|---------|---------|
| macOS 支援 | 需要 Code Signing；Alpha 階段暫緩 | 漸進策略：Alpha 先跳過 macOS |
| 強制更新機制 | 是否需要？ | Alpha 階段全部軟提示，未來視需要再評估 |

---

## ✅ Action Items 摘要

| 項目 | 負責人 | 優先級 | 完成條件 |
|------|-------|-------|---------|
| 建立 T-008：`electron-updater` 技術方案評估與實作計畫 | Taylor（技術團隊） | P1 | T-008 文件完成，包含技術選型與實作計畫 |
| 評估 Apple Developer 帳號費用與效益 | Alex（PM） | P2 | 給出購買/不購買決策，記錄至 T-008 |
| Changelog 彈窗功能加入 Backlog | Alex（PM） | P3 | 加入 Backlog，排期再議 |
