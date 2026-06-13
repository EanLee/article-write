---
name: roundtable-meeting
description: 圓桌會議與技術會議規則。發起戰略/技術決策討論、角色 sub-agent 派發、即時記錄格式時必用。
---

# 圓桌與技術會議規則

## 圓桌會議

### 發起前必做（不可跳過）

1. 讀 `docs/roundtable-discussions/README.md` 確認最新議題編號
2. 讀最近 2~3 個 `decision.md` 掌握已決策事項與待辦 Action Items
3. 讀 `docs/tech-team/TEAM.md` 確認技術現況
4. 確認 codebase 實際狀態（`src/` 有什麼、`git log` 最近做了什麼）
5. **未備妥材料禁止開會**（`docs/roundtable-discussions/ROUNDTABLE_RULES.md` 明確規定）

### 主持人

**Alex（PM）永遠是主持人**，由 Alex 開場點出議題。

### 角色 Sub-agent 模式（必須，五個角色缺一不可）

每個角色派發**獨立 sub-agent**（並行 Task tool）：

| 角色 | 代表 |
|------|------|
| Alex | PM，主持人 |
| Lisa | Marketing |
| Jordan | User |
| Sam | Ops/Tech Lead |
| Taylor | CTO |

每個 agent 收到：專案現況 + 角色特質（參考 `CHARACTER_CARDS.md`）+ 今天議題。

### 討論格式（必須）

- 全程對話體：`Alex：「...」`，不用報告格式
- 每輪 agents 回應後，**立即同步寫入** `discussion.md`，不累積到最後才寫
- 每輪寫完立即 commit

### 升級機制：實作中主動發起圓桌

**任何負責人員**在技術實作過程中，若發現以下情況，**必須主動發起圓桌會議**，不需等待上級指示：

- 實作結果與原本的戰略假設有落差
- 發現風險影響到產品方向或使用者體驗
- 需要多人共同決策，而非技術團隊自行決定
- 發現原決策的前提條件已不成立

**發起流程**：
1. 停止實作，不自行決定方向
2. 備妥討論材料（議題說明、現況、選項、影響評估）
3. 發起圓桌，遵循標準流程

> ⚠️ 禁止「邊做邊等」——發現需要圓桌決議時，應立即暫停相關實作，避免產生需要回滾的廢棄代碼。

### 文件建立時機

- 討論**開始時**立即建立 `topic-NNN` 資料夾與 `discussion.md`
- 決策完成後建立 `decision.md`
- 同步更新 `docs/roundtable-discussions/README.md` 索引

## 技術會議

### 角色 Sub-agent 模式（必須）

技術會議角色：Sam（Tech Lead，主持）、Lin（Services）、Wei（Frontend）、Alex（UI/UX）

每個角色派發**獨立 sub-agent**（並行 Task tool）。

### 討論記錄（必須即時）

- 技術會議開始時立即建立 `T-XXX` 文件，「討論記錄」章節即時寫入對話
- 不能只記結論，必須包含各角色完整對話過程
- 每輪結束後立即 commit，不累積到最後才寫
- 討論完成後補充「設計決策」章節，更新 `TEAM.md` 索引
