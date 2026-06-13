---
name: roundtable-meeting
description: 圓桌會議與技術會議規則。發起戰略/技術決策討論、角色 sub-agent 派發、觀點驅動討論記錄時必用。
---

# 圓桌與技術會議規則

## 會議定位

| 面向 | 圓桌會議 | 技術會議 |
|------|---------|---------|
| 層次 | 戰略（What / Why） | 戰術（How / 實作細節） |
| 參與者 | 全體五角色 | 技術團隊成員 |
| 討論內容 | 產品方向、優先級、使用者價值、風險評估 | 實作方式、架構、程式細節 |
| 程式碼 | ❌ 不出現（除非需上層決策） | ✅ 正常出現 |
| 文件位置 | `docs/<domain>/discussions/topic-NNN-.../`（索引：`docs/conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md`） | `docs/<domain>/discussions/T-XXX-*.md`（索引：`docs/conventions/governance/TEAM.md`） |

**升級機制**：技術實作中發現「風險影響產品方向／需要多人決策／實作結果與戰略假設有落差」→ **主動發起圓桌**，不需等待指示。發起前必先備妥討論材料（議題說明、背景、選項、影響評估），禁止空手發起。

## 圓桌會議

### 發起前必做（不可跳過）

1. 讀 `docs/conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md` 確認最新議題編號
2. 讀最近 2~3 個 `decision.md` 掌握已決策事項與待辦 Action Items
3. 讀 `docs/conventions/governance/TEAM.md` 確認技術現況
4. 確認 codebase 實際狀態（`src/` 有什麼、`git log` 最近做了什麼）
5. **未備妥材料禁止開會**

### 常設成員（五個角色缺一不可）

| 角色 | 代表 | 關注重點 |
|------|------|---------|
| 🎯 PM | Alex Chen（主持人） | 產品策略、使用者價值、優先級 |
| 📢 Marketing | Lisa Wang | 品牌定位、市場推廣、使用者獲取 |
| 👤 User | Jordan Lee | 實際使用體驗、學習曲線、痛點 |
| 🔧 Ops | Sam Liu | 穩定性、維運成本、部署 |
| 💻 CTO | Taylor Wu | 技術架構、技術債、長期發展 |

每個角色派發**獨立 sub-agent**（並行 Task tool），收到：專案現況 + 角色特質（`docs/conventions/governance/character-cards/`）+ 今天議題。

### 文件結構與命名

```
docs/<domain>/discussions/topic-NNN-YYYY-MM-DD-簡短描述/
├── discussion.md   ← 完整討論過程
└── decision.md     ← 決策結果摘要
```

- `NNN`：三位數序號，從 001 起，全域唯一，讀 `docs/conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md` 取最新值加一；`<domain>` 依議題性質判斷
- 討論**開始時**立即建立資料夾與 `discussion.md`；決策完成後建立 `decision.md`；同步更新 `docs/conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md` 索引

### 討論進行方式（核心規則，v3.0）

**觀點驅動交互式討論，不是輪次驅動的獨立陳述，已廢除固定輪次。**

1. **主持人（Alex）開場**：點出議題、背景、待解決問題
2. **任何角色提出觀點**後，其他角色針對**該觀點**回應：✅ 附議（可補充理由）/ 💡 建議（修正或補強）/ ❌ 反對（須附理由）/ 🤐 不回應（不強制人人表態）
3. **討論沿觀點串延伸**：A 提出 → B 反對 → A 回應 → C 補充……直到該觀點**取得共識或確認為分歧**
4. **不限定輪數**：共識自然收斂就結束，三句話或十幾次來回皆可
5. **主持人職責**：辨識共識並當場宣告記入共識點；辨識「原地打轉」標記為分歧議題；控制討論不偏離議題

**全程對話體**即時寫入 `discussion.md`（`角色：「……」`），含被說服而改變立場的轉折，**每個觀點串收斂後立即同步寫入**，不累積到最後。

### 共識與決策的關係

```
觀點提出 → 交互討論 → 自然收斂？
  ├─ 是 → 記入「共識點」（不需表決）
  └─ 否 → 標記「分歧議題」→ 進入正式決策程序
```

- 能收斂的共識**不需表決**——表決是收斂失敗的後備機制
- **只有無法收斂的分歧**才走決策機制：

| 類型 | 條件 | 處理方式 |
|------|------|---------|
| 全體一致 | 五角色全部同意 | 直接執行 |
| 多數共識 | 三角色以上支持 | 記錄少數意見後執行 |
| 分歧但可行 | 正反接近 | 主持人裁決，或追加討論／小規模驗證 |
| 延後決策 | 資訊不足或風險過高 | 列出待釐清項目，排期再議 |

### 記錄格式

模板：`docs/conventions/governance/.template/discussion.md`、`docs/conventions/governance/.template/decision.md`

- `discussion.md`：議題描述（背景/目標/範圍）→ 對話串討論記錄（依觀點串，標註主持人宣告共識/分歧）→ 觀點總結表（五角色）→ 共識與分歧（共識點/主要分歧/待釐清問題）
- `decision.md`：決策結果（最終決定+理由）→ 投票結果表（五角色立場+理由）→ 行動項目表 → 追蹤（驗證方式/回顧日期）

### Action Items 規範

每個 Action Item 必須同時具備三要素：**行動項目**（具體事項）、**負責人**（有且只有一人，不可為「大家/TBD」）、**完成條件**（可驗證的結果，不可為「做完/研究一下」）。

- 填寫位置：`discussion.md` 結尾「✅ Action Items 摘要」（會議結束前當場確認）＋ `decision.md`「✅ Action Items」（正式追蹤，含狀態欄）
- 狀態：`⏳ 待開始` / `🔄 進行中` / `✅ 完成` / `❌ 封存`（須說明原因）
- 優先級：`P0`（決策前提）/ `P1`（本 Sprint）/ `P2`（下個 Sprint）/ `P3`（Backlog）

### 禁止事項

- ❌ 討論記錄出現程式碼（除非議題本身需上層決策的技術選項）
- ❌ 任何角色缺席
- ❌ **各角色獨立陳述後直接總結**——沒有觀點交互回應，不算討論
- ❌ **未經討論收斂就直接表決**
- ❌ 空手發起（未準備討論材料）
- ❌ 在圓桌討論戰術細節（應移至技術會議）
- ❌ 決策後不更新 `decision.md`
- ❌ 結束時沒有 Action Items
- ❌ Action Item 沒有負責人或完成條件

## 技術會議

### 角色 Sub-agent 模式（必須）

技術會議角色：Sam（Tech Lead，主持）、Lin（Services）、Wei（Frontend）、Alex（UI/UX），每個角色派發**獨立 sub-agent**（並行 Task tool）。

### 討論方式（2026-06-13 起與圓桌 v3.0 一致）

採**觀點驅動交互式討論**，不採固定輪次：

- 任何成員提出觀點後，其他成員附議／建議／反對（附理由）／不回應
- 討論沿觀點串延伸至自然收斂，能收斂記入共識，**不需表決**
- 無法收斂的分歧 → Sam（Tech Lead）裁決，或升級圓桌（涉及產品方向時）
- 全程對話體即時記錄至對應 `T-XXX` 文件「討論記錄」章節，含立場轉折過程，**每個觀點串收斂後立即同步寫入並 commit**
- 討論完成後補充「設計決策」章節，更新 `TEAM.md` 索引

完整規則見 `docs/conventions/governance/ROUNDTABLE_RULES.md`。
