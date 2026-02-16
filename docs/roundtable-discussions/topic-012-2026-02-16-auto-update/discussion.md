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

#### 🎯 PM（Alex Chen）的觀點

**立場**: ✅ 支持

**理由**:
1. 留存率直接相關：使用者不更版，就永遠用著有 bug 的舊版。Retention 數據失真。
2. 業界統計，手動更新轉換率通常低於 30%，70% 使用者長期停留舊版。
3. Alpha 推廣前若沒有 Auto-Update，Alpha 使用者每次都要手動裝，口碑差。

**具體建議**:
- 背景下載 + 使用者決定何時套用（不強制重啟）
- 告知使用者「有新版本已就緒，下次啟動時自動套用」

**優先級評估**: P1（Alpha 推廣前必須完成）

---

#### 📢 Marketing（Lisa Wang）的觀點

**立場**: ✅ 強烈支持

**理由**:
1. 推廣賣點：「App 自動更新，永遠保持最新版」是行銷差異化亮點。Notion、Obsidian、VS Code 都有 Auto-Update。
2. 口碑保護：Alpha 使用者若因舊版 bug 留下負評，傷害遠比沒有 Auto-Update 大。
3. 降低 Support 成本：消除「請先確認你是最新版」這類 support 問題。

**潛在風險**:
- 風險：若 Auto-Update 本身出 bug（更新失敗），傷害比沒有功能更大

---

#### 👤 User（Jordan Lee）的觀點

**立場**: ✅ 非常需要

**核心痛點**: 每次看到「要手動下載新版」，第一反應是「等等再說」，然後就忘了。目前 Obsidian 也是這樣，有時 3 個版本前的東西才更新。

**期望行為**:
- 背景下載，不打斷工作
- 有小通知告訴我「新版已就緒」
- 讓我選「現在重啟」或「下次啟動時更新」

**底線**: **不要強制重啟**，不希望寫到一半突然被要求重開 App。

---

#### 🔧 Ops（Sam Liu）的觀點

**立場**: ⚠️ 條件支持

**支持理由**:
1. 版本碎片化是維護噩夢：沒有 Auto-Update，一年後可能有三個版本同時在外面跑，Bug fix 要回頭相容多個版本。
2. `electron-updater` 支援 release channel（stable/beta），出問題可快速切換避開壞版本。

**條件**:
1. 需要有 graceful fallback：更新失敗不能讓 App 掛掉
2. 更新狀態需有 log（成功/失敗都要記錄）
3. macOS Code Signing 問題需要在技術上確認

---

#### 💻 CTO（Taylor Wu）的觀點

**立場**: ✅ 支持，但要注意技術邊界

**技術可行性確認**:
- `electron-builder` 已安裝，`electron-updater` 是配套套件，整合簡單
- GitHub Releases 作為 update server，零額外成本
- `latest.yml` / `latest-mac.yml` / `latest-linux.yml` 由 `electron-builder` 自動產生

**需要上層決策的三個問題**:
1. **macOS Code Signing**：沒有 Apple Developer 帳號（$99/年），macOS Auto-Update 無法正常工作（Gatekeeper 攔截）——這是商業決策，不只是技術問題
2. **更新頻率**：啟動時檢查 vs 定時背景輪詢
3. **強制更新策略**：是否需要某些版本強制所有人更新

**建議**:
- Windows 和 Linux 先做（無 code signing 困難）
- macOS 標記為「有限支援」直到簽名問題解決
- 從啟動時檢查開始，不要過度設計

---

### 第二輪討論（跨角色回應）

**Sam 回應 Taylor（macOS）**:
macOS Code Signing 問題是 macOS 支援的根本門檻，不只限於 Auto-Update。沒有簽名，`.dmg` 安裝後首次啟動就可能被 Gatekeeper 完全封鎖。

**Alex 回應 Sam（macOS）**:
v0.2 Alpha 優先做 Windows Auto-Update，macOS 暫時手動更新（Alpha 測試者通常懂怎麼繞過 Gatekeeper）。v0.3 Beta 再評估 Apple Developer 帳號。

**Jordan 回應 Alex（強制重啟問題）**:
背景下載 + 使用者決定方向贊同。擔心：如果選「下次啟動」，App 會不會在完全沒預期的時機跳出更新畫面？

**Taylor 回應 Jordan（更新時機）**:
標準做法是更新只在「App 啟動時」套用，不在運行中途強制重啟。啟動時「正在安裝更新...」再進入主畫面，這個 UX 可接受。

**Lisa 補充（Changelog 彈窗）**:
更新後能不能顯示「新版本亮點」？

**Taylor 回應 Lisa**:
技術上可行，但不在 Auto-Update 核心範圍。建議作為獨立功能放入 Backlog。

**Alex（PM）決定**:
Changelog 彈窗 P3，先做核心 Update 機制。

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
| macOS 支援 | 需要 code signing；Alpha 階段暫緩 | 漸進策略：Alpha 先跳過 macOS |
| 強制更新機制 | 是否需要？ | Alpha 階段全部軟提示，未來視需要再評估 |

---

## ✅ Action Items 摘要

| 項目 | 負責人 | 優先級 | 完成條件 |
|------|-------|-------|---------|
| 建立 T-008 技術討論文件，評估 `electron-updater` 實作方案 | Taylor（技術團隊） | P1 | T-008 文件完成，包含技術選型與實作計畫 |
| 評估 Apple Developer 帳號費用與效益 | Alex（PM） | P2 | 給出購買/不購買決策，記錄至 T-008 |
| Changelog 彈窗功能加入 Backlog | Alex（PM） | P3 | 加入 Backlog，排期再議 |
