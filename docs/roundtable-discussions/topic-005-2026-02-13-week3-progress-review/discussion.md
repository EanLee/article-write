# WriteFlow 圓桌會議 - Week 3 進度回報與方向修正

> **會議日期**: 2026-02-13
> **會議類型**: 週期進度回報 + 方向修正
> **會議編號**: #005
> **參與者**: Alex (PM)、Sam (Tech Lead)、Jordan (QA)、Morgan (UX)
> **主持人**: Alex (PM)
> **觸發原因**: Week 3 結束前檢視實際完成狀況與計畫落差

---

## 📋 會議背景

上次圓桌（#004，2026-02-12）決定採用方案 B，延後發布至 2026-03-15。
本次會議在 2026-02-13 召開，距離上次會議僅 1 天，因為當天有大量實際開發推進，需要更新狀態評估。

---

## 🎯 Part 1：各角色進度回報

---

### 🟦 Alex（PM）—— 計畫 vs 實際評估

**我要說的是：計畫已被大幅超越，但方向需要確認。**

上次開完現實重組會議（#004），原本預估 Week 3 目標只是：
- 推進 P0-2 PublishService
- 進度從 50% 提升到 60-65%

**實際發生的事**：

```
2026-02-12（昨天）：
  ✅ 架構重構：移除 Drafts/Publish 資料夾依賴
  ✅ 改用 frontmatter status 欄位管理文章狀態
  ✅ ArticleService、ConverterService、MarkdownService 全部更新
  ✅ article store moveToPublished 完全重寫
  ✅ 測試全數通過（311 tests pass）

2026-02-13（今天）：
  ✅ P0-3 GitService 完整實作（6 個 git 操作）
  ✅ GitService 15 個單元測試全通過
  ✅ IPC handlers + preload 橋接層
  ✅ 背景 git 備份整合到 moveToPublished
```

**計畫 vs 實際**：

| 項目 | 計畫 | 實際 | 差異 |
|------|------|------|------|
| Week 3 目標完成度 | 60-65% | 估計 75-80% | 🟢 超前 15-20% |
| P0-2 完成度 | 50% | 85%+ | 🟢 大幅超前 |
| P0-3 完成度 | Week 4 才開始 | 已完成後端 | 🟢 提前 1 週 |
| 時程 | 2026-03-15 | 可能提前 | 🟢 樂觀 |

**但是，有個問題我想提給大家討論**：

> Git 自動化的 UI 部分——Sam 說使用者不需要看到 git 操作，已整合為背景機制。
> 這個決策影響我們對 P0-4（發布按鈕 UI）的設計。
> 我認為需要確認：**發布按鈕現在應該做什麼？**

---

### 🟥 Sam（Tech Lead）—— 技術狀態回報

**技術端比預期進展得更快，但有幾個遺留問題要說清楚。**

#### 已完成的技術工作

**架構層面：**
- 文章狀態管理從「資料夾結構」改為「frontmatter status 欄位」
- `ArticleService.loadArticle` 簽名簡化，自動從 frontmatter 讀取 status
- `ConverterService` 完整移除 `publish/` 中間層依賴
- `MarkdownService.generateFrontmatter` 新增 status 欄位序列化

**GitService：**
- `getStatus`、`add`、`commit`、`push`、`addCommitPush`、`getLog` 全部實作
- `nothing to commit` 正確處理為成功
- `util.promisify` mock 問題已解決（需要額外 mock util 模組）
- 背景整合至 `moveToPublished`：發布後靜默 git commit

**測試狀態：**
```
總計：311 tests pass，9 skipped，0 fail
GitService：15/15 pass
ArticleService：14/14 pass
```

#### 仍未完成的技術工作

**P0-2 核心 gap：**

```
PublishService（檔案複製到 Astro blog）：
  現況：有基礎架構，但「一鍵發布」的完整流程未驗證
  缺少：
    ① 從 Obsidian vault 讀取已發布文章
    ② 轉換後寫入 Astro blog 的 src/content/
    ③ 圖片複製到 public/images/
    ④ 完整端到端測試
```

**P0-4：**
```
發布按鈕 UI：
  現況：0% 完成
  需要決策：按鈕按下去要觸發什麼？
```

**我的技術評估**：

> 目前最大的風險不是功能數量，而是「端到端發布流程」還沒有完整驗過。
> 每個零件都有了，但組裝起來跑一次完整流程，才算真正完成 P0。

---

### 🟩 Jordan（QA）—— 測試覆蓋評估

**測試數字漂亮，但有一個盲點：缺乏整合測試。**

#### 好消息

```
Unit Tests：311 pass，覆蓋率不錯
GitService：15 tests，邏輯路徑全覆蓋
ArticleService：14 tests，包含 frontmatter status 讀取
```

#### 擔憂

**整合層面的測試幾乎不存在**：

```
現有：
  ✅ 各 Service 的 Unit Test（mock 隔離）
  ✅ Store 的 Unit Test（mock electronAPI）
  ❌ 沒有端到端的發布流程測試
  ❌ 沒有「Obsidian → Astro」完整路徑的整合測試
  ❌ Git 備份在真實環境的行為未驗證
```

**已知的 skip 測試問題**：

```
tests/stores/article.path-handling.test.ts：7 tests skipped
  → 這是刻意跳過還是有問題？需要確認
```

**我的建議**：

> 在進入 P0-4（發布按鈕 UI）之前，
> 建議手動跑一次完整的發布流程（真實的 Obsidian + Astro 環境）。
> 如果沒有真實環境，至少補一個端到端的 integration test。

---

### 🟨 Morgan（UX）—— 使用者體驗評估

**git 背景化的決策是對的，但發布流程的 UX 還需要設計。**

#### 對 git 背景化的支持

> 使用者不需要知道 git，這個決策完全正確。
> 一般使用者（Obsidian 用戶）不懂 git，不應該暴露底層操作。
> 靜默備份是最好的設計模式。

#### 但是，發布按鈕 UX 的缺口

現在「發布」按鈕背後的流程是：
1. 更新 frontmatter status → `published`
2. 儲存文章（寫入 Obsidian vault）
3. 背景 git commit（備份 vault）

**但使用者真正想要的「發布」是**：
1. 把文章複製到 Astro blog
2. 觸發 Astro build（或推送到 GitHub 讓 CI 部署）
3. 文章出現在部落格

**這兩件事是不同的！**

```
現在做的：vault 內的狀態管理 + git 備份
還沒做的：把文章推送到 Astro blog 的完整發布流程
```

**我擔心的問題**：
> 使用者按「發布」，文章狀態變了，
> 但部落格上沒有出現文章——這會造成嚴重困惑。

---

## 🔍 Part 2：計畫 vs 現實落差分析

### 進度總覽（截至 2026-02-13）

| P0 功能 | 計畫完成度（Week 3 末） | 實際完成度 | 狀態 |
|---------|----------------------|-----------|------|
| P0-1 設定介面 | 100% | 100% | ✅ |
| P0-2 文章管理架構 | 75% | 90% | 🟢 超前 |
| P0-3 Git 自動化（後端） | 0%（Week 4 任務） | 100% | 🟢 大幅超前 |
| P0-3 Git UI | 0% | 0%（已決定不做） | ✅ 決策：背景化 |
| P0-4 發布按鈕 UI | 0% | 0% | 🔴 未開始 |
| **端到端發布流程** | 50% | **30%？** | 🔴 **核心缺口** |

### 最重要的發現

**「零件完成度」和「可用完成度」不同：**

```
零件完成度（各 Service）：~85%
可用完成度（端到端可跑）：~30%

差距原因：
  - PublishService 的「複製到 Astro blog」流程未驗證
  - 發布按鈕還沒連接真實的發布邏輯
  - git 備份的是 Obsidian vault，不是 Astro blog push
```

---

## 💡 Part 3：關鍵議題討論

### 議題 A：「發布」的定義

**Alex（PM）提問**：
> 使用者點「發布」，最後的結果是什麼？
> 我們需要對齊這個定義，才知道 P0-4 要做什麼。

**討論**：

```
方案 1：完整自動發布（原始 MVP 目標）
  用戶點「發布」→ 轉換文章 → 複製到 Astro → git push → CI 部署
  優點：一鍵完成，體驗最好
  缺點：需要完整的 Astro blog 路徑設定 + CI 整合

方案 2：發布到本地 Astro（不推送）
  用戶點「發布」→ 轉換文章 → 複製到 Astro 本地目錄 → git commit
  用戶再手動 push 或 Astro dev server 預覽
  優點：不依賴 CI，更容易實作
  缺點：仍需手動 push

方案 3：分兩步（現有架構 + 額外步驟）
  步驟 1：在 vault 內標記已發布（已完成）
  步驟 2：手動或自動執行「同步到 Astro」（還沒做）
```

**Sam（Tech Lead）補充**：
> `targetBlog` 路徑在 config 裡已有設定，
> PublishService 已有基礎架構可以複製檔案到 Astro。
> 技術上，方案 2 最快可以實現。

**Jordan（QA）提醒**：
> 不管選哪個方案，在 P0-4 之前，
> 我們需要先確認「複製到 Astro」這個流程可以跑通。

**Morgan（UX）結論建議**：
> 推薦方案 2 作為 MVP：
> - 使用者點「發布到 Blog」
> - 自動轉換 + 複製到 Astro 本地目錄 + git commit
> - 顯示成功訊息 + 提示「已準備好，可執行 git push 推送」
> - 進階版（v0.2）再加自動 push

---

### 議題 B：下一步的優先順序

**Sam 的技術建議**：

```
建議執行順序：
  1. 驗證 PublishService 端到端流程（最高優先）
     → 跑一次真實的「Obsidian md → Astro content/」完整路徑
     → 修復任何轉換問題

  2. 實作「發布到 Blog」按鈕
     → 觸發：loadArticle → convert → copyToAstro → gitCommit
     → 顯示進度和結果

  3. 基本錯誤處理 UI
     → 路徑錯誤、檔案衝突、git 失敗的提示
```

**Alex 的 PM 視角**：
> 同意 Sam 的優先順序。
> 但我想加一點：要先讓真正的使用者（也就是你自己）用一次，
> 找出最痛的點再修。

---

## ✅ Part 4：決策與行動計畫

### 決策 1：git 背景化確認

**✅ 確認**：git 維持為背景備份機制，不做 UI。

### 決策 2：MVP「發布」定義

**✅ 採用方案 2**：
> 發布 = 轉換文章 + 複製到 Astro 本地目錄 + git commit（背景）
> 不包含自動 git push 到遠端（v0.2 功能）

### 決策 3：下週工作優先順序

```
優先順序（Week 3 剩餘 + Week 4）：

P1 — 端到端發布流程驗證（最高優先）
  □ 確認 PublishService.publishArticle 完整流程
  □ 跑通：選文章 → 轉換 → 複製到 targetBlog
  □ 補 integration test 或手動驗證

P2 — 發布按鈕 UI（P0-4）
  □ ConversionPanel 或 ArticleManagement 加入「發布到 Blog」按鈕
  □ 串接發布流程
  □ 顯示成功/失敗狀態

P3 — 錯誤提示 UI
  □ 路徑未設定時的提示
  □ 發布失敗時的錯誤訊息

P4 — 測試補強
  □ 確認 article.path-handling.test.ts 的 7 個 skip 是否需要處理
  □ 必要時補整合測試
```

### 更新後的時程預估

```
Week 3 剩餘（2/13-2/16）：P1 端到端驗證
Week 4（2/17-2/23）：P2 發布按鈕 UI + P3 錯誤提示
Week 5（2/24-3/2）：整合測試 + 手動測試 + Bug 修復
Week 6（3/3-3/9）：Alpha 測試 + 回饋修正
Week 7（3/10-3/15）：正式發布準備

新預估發布時程：2026-03-15（維持不變）
實際信心度：⬆️ 85% → 92%（因超前進度）
```

---

## 📊 Part 5：風險評估更新

| 風險 | 上次評估 | 本次評估 | 說明 |
|------|---------|---------|------|
| 時程不足 | 🔴 高 | 🟡 中 | 進度超前，但端到端未驗證 |
| 技術障礙 | 🟡 中 | 🟢 低 | 架構清晰，主要功能已有 |
| 功能範圍膨脹 | 🟡 中 | 🟢 低 | git UI 已決定不做 |
| 端到端整合問題 | 未評估 | 🔴 高 | **最大風險：零件沒組過** |
| 工作插隊 | 🔴 高 | 🟡 中 | 彈性機制已建立 |

**最大風險：端到端整合**

> Sam 建造了每一個零件，但還沒有把它們組起來跑過一次完整流程。
> 這是目前最重要的未知數。

---

## 🎯 Part 6：會議結論

### 三個關鍵確認

1. **✅ 進度比預期好**：P0-3 提前完成，整體超前 1-2 週
2. **✅ git 背景化是正確決策**：不需要 UI，靜默備份即可
3. **🔴 核心缺口已識別**：端到端發布流程（複製到 Astro）還沒完整跑通

### 下一步（立即行動）

```
[Sam] 本週剩餘時間：
  → 執行一次完整發布流程測試
  → 確認 PublishService → ConverterService → FileService 串接正確
  → 記錄發現的問題

[Jordan] 本週剩餘時間：
  → 確認 article.path-handling.test.ts skip 狀況
  → 評估是否需要補 integration test

[Morgan] 下週開始：
  → 設計「發布到 Blog」按鈕的 UX 稿
  → 確認成功/失敗狀態的顯示方式

[Alex] 持續追蹤：
  → 下次週檢查點：2026-02-18（周日 20:00）
  → 如端到端驗證發現重大問題，提前召開緊急會議
```

---

## 💬 圓桌快語

**Sam**：「零件都造好了，現在要組裝測試。這才是最難的部分。」

**Jordan**：「311 tests pass 很漂亮，但那是 mock 的環境。真實環境跑一次才算數。」

**Morgan**：「使用者只需要看到一個按鈕、一個成功訊息。我們別把它搞複雜。」

**Alex**：「超前進度是好事，但別失去焦點。下週結束前，我要看到一次完整的發布流程跑通。」

---

**會議結束時間**: 2026-02-13
**下次週檢查點**: 2026-02-18（週日 20:00）
**下次圓桌會議**: 2026-03-04（里程碑 1，視情況提前）
**文檔維護**: Alex Chen (PM)
**版本**: v1.0

---

**相關文檔**：
- [上次圓桌會議 #004](./2026-02-12-reality-reset-meeting.md)
- [MVP 範圍定義](../planning/MVP_SCOPE.md)
- [進度追蹤](../planning/PROGRESS_TRACKING.md)
