# WriteFlow 進度追蹤機制

**建立日期**: 2026-02-04
**負責人**: Alex (Product Manager)
**目的**: 建立透明、高效的團隊協作與進度追蹤機制

---

## 1. 追蹤工具選擇

### 選用工具：GitHub Projects

**選擇理由**：
- ✅ 與程式碼倉庫完全整合
- ✅ 自動連結 Issues、PRs、Commits
- ✅ 免費且團隊已熟悉 GitHub
- ✅ 支援看板視圖和表格視圖
- ✅ 可自動化工作流程（Issues 狀態更新）

**相較於 Trello 的優勢**：
| 特性 | GitHub Projects | Trello |
|------|-----------------|--------|
| 與程式碼整合 | 原生整合 | 需要第三方整合 |
| 成本 | 免費 | 免費版有限制 |
| 自動化 | 基於 Git 事件自動化 | 需付費版 |
| 開發者友善度 | 極高 | 中等 |

---

## 2. 看板結構設計

### 2.1 專案看板：WriteFlow MVP

**GitHub Projects URL**: https://github.com/{org}/{repo}/projects/1

#### 欄位（Columns）

1. **📋 Backlog**
   - 尚未開始的任務
   - 已評估但排程未定

2. **📅 Planned (本週)**
   - 本週計畫執行的任務
   - 每週一早上更新

3. **🚧 In Progress**
   - 正在進行中的任務
   - 每人同時最多 2 個任務

4. **👀 Review**
   - 等待 Code Review
   - 等待測試驗證

5. **✅ Done (本週)**
   - 本週已完成的任務
   - 週五檢查點時整理

6. **🎉 Completed**
   - 所有已完成任務的歸檔

#### 自定義欄位（Custom Fields）

| 欄位名稱 | 類型 | 選項 | 用途 |
|---------|------|------|------|
| Priority | Single Select | P0 (Critical), P1 (High), P2 (Medium), P3 (Low) | 任務優先級 |
| Size | Single Select | XS (0.5天), S (1天), M (2-3天), L (5天+) | 工作量估計 |
| Team Member | Single Select | Alex, Lisa, Taylor, Sam, Jordan | 負責人 |
| Type | Single Select | Feature, Bug, Docs, Refactor, Test | 任務類型 |
| Sprint | Text | Week 1, Week 2, ... | 所屬衝刺週 |
| Blocked | Checkbox | - | 是否被阻塞 |
| Blocker Reason | Text | - | 阻塞原因 |

### 2.2 Issue 標籤（Labels）

```
# 優先級標籤
priority: p0-critical   (紅色)
priority: p1-high       (橙色)
priority: p2-medium     (黃色)
priority: p3-low        (綠色)

# 類型標籤
type: feature          (藍色)
type: bug              (紅色)
type: docs             (灰色)
type: refactor         (紫色)
type: test             (綠色)

# 狀態標籤
status: blocked        (黑色)
status: needs-review   (橙色)
status: needs-testing  (黃色)

# 團隊標籤
team: pm              (淺藍)
team: marketing       (粉紅)
team: dev             (深藍)
team: ops             (綠色)
team: user            (紫色)

# 範圍標籤
scope: mvp            (金色)
scope: post-mvp       (銀色)
```

---

## 3. 每日 Standup 規範

### 3.1 時間與形式

- **時間**: 每日早上 10:00
- **時長**: 15 分鐘（嚴格控制）
- **形式**: 站立會議（線上或實體）
- **工具**: Google Meet / Zoom

### 3.2 Standup 格式

每位成員輪流回答三個問題：

```markdown
**[成員名稱] - [日期]**

1. ✅ **昨天完成了什麼？**
   - [具體任務 1] (#Issue編號)
   - [具體任務 2] (#Issue編號)

2. 🚧 **今天計畫做什麼？**
   - [具體任務 1] (#Issue編號)
   - [具體任務 2] (#Issue編號)

3. 🚫 **有什麼阻礙？**
   - [阻礙描述] 或 "無"
   - [需要的協助]
```

### 3.3 Standup 記錄

**位置**: GitHub Discussions

每日建立新的 Discussion Post：

```
標題: Daily Standup - YYYY-MM-DD
分類: Standup
標籤: standup, week-X

內容: [按照格式記錄所有成員的 Standup]
```

### 3.4 Standup 原則

- ⏰ **準時開始，準時結束**：不等遲到者，不延長時間
- 🎯 **聚焦三個問題**：不討論細節，細節會後處理
- 📝 **具體明確**：必須提及 Issue 編號
- 🚫 **識別阻礙**：有阻礙立即提出，會後解決
- 👂 **主動聆聽**：了解其他人的進度與阻礙

---

## 4. 每週檢查點流程

### 4.1 時間與形式

- **時間**: 每週五下午 4:00
- **時長**: 60 分鐘
- **參與者**: 全體團隊成員
- **主持人**: Alex (PM)

### 4.2 檢查點議程

#### Part 1: 本週回顧 (20分鐘)

```markdown
## 本週回顧 (Week X)

### ✅ 已完成任務 (Done)
- [任務清單，含負責人和 Issue 編號]
- [完成率] X/Y (XX%)

### 🚧 進行中任務 (In Progress)
- [任務清單，含負責人、進度百分比]
- [原因分析：為什麼未完成]

### 🚫 本週阻礙
- [阻礙清單]
- [解決方案]

### 📊 本週數據
- Velocity: [本週完成 Story Points]
- Burndown: [剩餘 Story Points]
- Bug Count: [新增 / 已修復]
```

#### Part 2: 下週規劃 (20分鐘)

```markdown
## 下週規劃 (Week X+1)

### 🎯 下週目標
- [主要目標 1]
- [主要目標 2]
- [主要目標 3]

### 📅 任務分配
| 成員 | 任務 | 預計完成日 | 優先級 |
|------|------|-----------|--------|
| Taylor | #123 Wiki Link 轉換 | Week X+1 Wed | P0 |
| ... | ... | ... | ... |

### ⚠️ 風險識別
- [潛在風險 1]
- [緩解措施]
```

#### Part 3: 問題討論與改進 (20分鐘)

- 流程改進建議
- 工具使用問題
- 團隊協作優化
- 開放討論

### 4.3 檢查點輸出

**GitHub Discussions Post**:

```
標題: Weekly Checkpoint - Week X (YYYY-MM-DD)
分類: Checkpoint
標籤: checkpoint, week-X

[按照議程格式記錄檢查點內容]
```

---

## 5. 任務管理規範

### 5.1 Issue 建立規範

#### Issue 標題格式

```
[Type] 簡短描述 (控制在 50 字元內)

範例:
[Feature] 實作 Wiki Link 轉換功能
[Bug] 編輯器行號顯示錯誤
[Docs] 更新 MVP 範圍文件
```

#### Issue 描述模板

```markdown
## 📋 任務描述
[清楚描述要做什麼]

## 🎯 驗收標準 (Acceptance Criteria)
- [ ] [標準 1]
- [ ] [標準 2]
- [ ] [標準 3]

## 📦 工作範圍
- [ ] [子任務 1]
- [ ] [子任務 2]

## 🔗 相關連結
- 相關 Issue: #XXX
- 設計稿: [連結]
- 參考文件: [連結]

## ⚠️ 注意事項
[需要特別注意的地方]

## 📊 估計工作量
- Size: [XS/S/M/L]
- 預計天數: [X] 天

## 🏷️ 標籤
- Priority: [P0/P1/P2/P3]
- Type: [Feature/Bug/Docs/...]
- Team: [pm/marketing/dev/ops/user]
```

### 5.2 Issue 工作流程

```
[Backlog]
    ↓ (每週一規劃會議)
[Planned (本週)]
    ↓ (開始工作)
[In Progress]
    ↓ (完成開發，建立 PR)
[Review]
    ↓ (Code Review 通過，測試通過)
[Done (本週)]
    ↓ (週五檢查點整理)
[Completed]
```

### 5.3 任務領取規則

1. **自我領取（Self-Assign）**
   - 從 Planned (本週) 欄位領取任務
   - 移動到 In Progress
   - 在 Issue 中 @自己

2. **工作負載限制**
   - 每人同時最多 **2 個 In Progress 任務**
   - 優先完成現有任務再領取新任務
   - P0 任務優先處理

3. **被阻塞時**
   - 勾選 "Blocked" 欄位
   - 填寫 "Blocker Reason"
   - 在 Issue 中評論說明阻塞原因
   - 在 Standup 中提出

### 5.4 Pull Request 規範

#### PR 標題格式

```
[Type](scope): 簡短描述

範例:
feat(editor): 實作 Wiki Link 轉換功能
fix(article): 修復分類對應錯誤
docs(planning): 更新 MVP 範圍文件
```

#### PR 描述模板

```markdown
## 🎯 目的
[這個 PR 要解決什麼問題]

## 🔗 相關 Issue
Closes #XXX
Related to #YYY

## 📝 變更內容
- [變更 1]
- [變更 2]
- [變更 3]

## 🧪 測試方式
- [ ] [測試步驟 1]
- [ ] [測試步驟 2]
- [ ] 所有單元測試通過 (`pnpm run test`)
- [ ] ESLint 檢查通過 (`pnpm run lint`)

## 📸 截圖 / 錄影 (如適用)
[放置截圖或錄影連結]

## ✅ 檢查清單
- [ ] 遵循 Conventional Commits 規範
- [ ] 撰寫或更新測試
- [ ] 更新相關文件
- [ ] Code Review 自查完成
- [ ] 無 console.log 等除錯程式碼

## ⚠️ 注意事項
[需要 Reviewer 特別注意的地方]
```

#### Code Review 標準

**Reviewer 檢查清單**：
- [ ] 程式碼符合專案規範（`.claude/CLAUDE.md`）
- [ ] 邏輯正確且易於理解
- [ ] 測試覆蓋充分
- [ ] 沒有明顯的效能問題
- [ ] 錯誤處理適當
- [ ] 註解清楚（必要時）
- [ ] 符合 TypeScript 型別規範（優先使用 Enum）

**Review 時效**：
- P0 Issue: 4 小時內回應
- P1 Issue: 1 天內回應
- P2/P3 Issue: 2 天內回應

---

## 6. 狀態定義

### 6.1 Issue 狀態

| 狀態 | 定義 | 負責人行動 |
|------|------|----------|
| **Backlog** | 已識別但未排程 | PM 評估優先級 |
| **Planned (本週)** | 本週計畫執行 | 團隊成員領取 |
| **In Progress** | 正在開發中 | 開發者推進 |
| **Review** | 等待 Code Review | Reviewer 審查 |
| **Done (本週)** | 本週已完成 | PM 驗證 |
| **Completed** | 已歸檔 | 無需行動 |
| **Blocked** | 被阻塞 | 相關人員解決阻塞 |

### 6.2 PR 狀態

| 狀態 | Label | 定義 |
|------|-------|------|
| **Draft** | - | 開發中，尚未完成 |
| **Ready for Review** | `status: needs-review` | 開發完成，等待審查 |
| **Changes Requested** | - | 需要修改後再審查 |
| **Approved** | - | 審查通過，可以合併 |
| **Merged** | - | 已合併到目標分支 |
| **Closed** | - | 不合併（已放棄或重複） |

---

## 7. 報告格式

### 7.1 每日進度更新（Standup 記錄）

**自動化**: 透過 GitHub Discussions 記錄

### 7.2 每週進度報告

**產出時間**: 每週五檢查點會議後

**報告位置**: `docs/progress/YYYY-MM-DD-week-X.md`

**報告格式**:

```markdown
# Week X 進度報告

**日期範圍**: YYYY-MM-DD ~ YYYY-MM-DD
**報告人**: Alex (PM)

---

## 📊 整體進度

### MVP 完成度
- **總任務數**: X
- **已完成**: Y (XX%)
- **進行中**: Z
- **Burndown Chart**: [圖片連結]

### 本週目標達成率
- **目標**: [本週主要目標]
- **達成率**: XX%
- **狀態**: ✅ On Track / ⚠️ At Risk / 🚫 Behind Schedule

---

## ✅ 本週完成

### Taylor (CTO)
- [#123] Wiki Link 轉換功能
- [#124] 圖片路徑處理邏輯

### Lisa (Marketing)
- [#130] WriteFlow Logo 設計

### Sam (Ops)
- [#135] Sentry 錯誤追蹤設定

### Jordan (User)
- [#140] 測試環境準備

### Alex (PM)
- [#145] MVP 範圍定義
- [#146] 進度追蹤機制建立

---

## 🚧 進行中任務

| Issue | 負責人 | 進度 | 預計完成 | 狀態 |
|-------|--------|------|----------|------|
| #150 | Taylor | 60% | Week X+1 | On Track |
| #151 | Lisa | 30% | Week X+1 | At Risk |

---

## 🚫 本週阻礙與解決

### 阻礙 1: [描述]
- **影響**: [影響範圍]
- **解決方案**: [採取的措施]
- **狀態**: 已解決 / 進行中

---

## 📈 關鍵指標

| 指標 | 本週 | 上週 | 趨勢 |
|------|------|------|------|
| Velocity | 15 pts | 12 pts | ↑ |
| 完成任務數 | 8 | 6 | ↑ |
| Bug 數量 | 3 | 5 | ↓ |
| Code Review 時間 | 4h | 6h | ↓ |

---

## 🎯 下週計畫

### 主要目標
1. [目標 1]
2. [目標 2]
3. [目標 3]

### 任務分配
[詳見 GitHub Projects]

### 風險提示
- [風險 1]
- [緩解措施]

---

## 💡 改進建議

- [本週發現的流程改進點]
- [工具優化建議]

---

**報告日期**: YYYY-MM-DD
**下次檢查點**: YYYY-MM-DD 16:00
```

---

## 8. 工具與自動化

### 8.1 GitHub Actions 自動化

#### 自動標籤 PR

```yaml
# .github/workflows/auto-label-pr.yml
name: Auto Label PR

on:
  pull_request:
    types: [opened, edited]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Label based on branch
        uses: actions/labeler@v4
```

#### 自動更新 Issue 狀態

```yaml
# .github/workflows/auto-move-issue.yml
name: Auto Move Issue

on:
  pull_request:
    types: [opened, closed]

jobs:
  move-issue:
    runs-on: ubuntu-latest
    steps:
      - name: Move to Review when PR opened
        # 自動移動 Issue 到 Review 欄位
      - name: Move to Done when PR merged
        # 自動移動 Issue 到 Done 欄位
```

### 8.2 Slack 整合（可選）

如果團隊使用 Slack，可設定通知：

- **每日 Standup 提醒**: 早上 9:50 提醒
- **PR Ready for Review**: 自動通知 Reviewer
- **Issue 被阻塞**: 通知相關人員
- **每週檢查點提醒**: 週五下午 3:50 提醒

### 8.3 看板自動化規則

在 GitHub Projects 中設定自動化：

1. **PR 開啟時** → Issue 移到 Review
2. **PR 合併時** → Issue 移到 Done (本週)
3. **Issue 被標記 Blocked** → 自動加上 `status: blocked` 標籤
4. **週五** → 自動將 Done (本週) 移到 Completed

---

## 9. 團隊協作原則

### 9.1 溝通原則

- ✅ **非同步優先**: 使用 GitHub Issues/Comments，方便追蹤
- ✅ **即時輔助**: 緊急問題用 Slack/Teams 即時溝通
- ✅ **會議精簡**: Standup 15分鐘，週檢查點 60分鐘
- ✅ **透明公開**: 所有討論在 GitHub 上可追溯

### 9.2 協作守則

1. **準時參與**: Standup 和週檢查點務必準時
2. **主動更新**: 每天更新 Issue 進度
3. **及時求助**: 遇到阻礙立即提出
4. **互相支援**: 看到 `status: needs-review` 盡快幫忙
5. **持續改進**: 每週檢查點提出改進建議

### 9.3 決策流程

- **技術決策**: CTO (Taylor) 最終決定
- **產品決策**: PM (Alex) 最終決定
- **行銷決策**: Marketing (Lisa) 最終決定
- **重大決策**: 圓桌會議討論決定

---

## 10. 實施計畫

### Week 1 Day 4-5 (本次任務)

- [x] 撰寫進度追蹤機制文件
- [ ] 建立 GitHub Project "WriteFlow MVP"
- [ ] 設定看板欄位和自定義欄位
- [ ] 建立 Issue Labels
- [ ] 從 action-items.md 建立對應的 Issues
- [ ] 建立 GitHub Discussions 分類（Standup, Checkpoint）
- [ ] 設定第一次 Daily Standup（Week 1 Day 5）
- [ ] 設定第一次 Weekly Checkpoint（Week 1 Friday）

### 後續優化

- Week 2: 評估工具使用情況，調整流程
- Week 3: 建立自動化 GitHub Actions
- Week 4: 整合 Slack 通知（可選）

---

## 附錄

### A. 快速參考

#### 每日必做
- [ ] 10:00 參加 Daily Standup
- [ ] 更新 Issue 進度（移動看板卡片）
- [ ] 遇到阻礙立即在 Issue 中標記

#### 每週必做
- [ ] 週一早上：查看本週 Planned 任務
- [ ] 週五下午：4:00 參加 Weekly Checkpoint
- [ ] 週五下午：整理本週完成任務

#### 開始新任務時
1. 從 Planned (本週) 領取 Issue
2. 移動到 In Progress
3. 建立 feature 分支
4. 在 Standup 中宣布開始

#### 完成任務時
1. 提交所有 Commits（遵循 Conventional Commits）
2. 建立 Pull Request
3. 移動 Issue 到 Review
4. 請求 Code Review

### B. 相關資源

- [GitHub Projects 官方文件](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [Conventional Commits 規範](../COMMIT_GUIDE.md)
- [MVP 範圍定義](./MVP_SCOPE.md)
- [Action Items 清單](../../docs/roundtable-discussions/topic-001-product-launch-strategy/action-items.md)

---

**文件版本**: 1.0.0
**最後更新**: 2026-02-04
**維護者**: Alex (PM)
