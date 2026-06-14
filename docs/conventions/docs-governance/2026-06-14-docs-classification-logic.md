---
title: \"文件分類定義原則 (Docs Classification Logic)\"
domain: conventions
type: guideline
status: approved
owner: tech-team
updated: 2026-06-14
source_of_truth: true
---

# 文件分類定義原則 (Docs Classification Logic)

本文定義本專案文件的分類邏輯，旨在區分「治理規範 (律法)」、「技術實踐 (經驗)」與「分析紀錄 (結果)」，以避免 `docs/` 目錄出現戰略面與工程技術面混雜的情況。

## 1. 分類矩陣

| 類別 | 定義 (Definition) | 核心特徵 (Characteristics) | 存放路徑 (Target Path) | 建議 `type` |
| :--- | :--- | :--- | :--- | :--- |
| **律法 (Convention)** | 定義**「必須」**怎麼做的強制性規則。 | 包含：標準、規範、流程定義、治理 meta。 | `docs/conventions/` | `guideline`, `convention` |
| **經驗 (Guide/Playbook)** | 定義**「建議」**怎麼做或**「如何」**執行的技術實踐。 | 包含：操作指南、除錯流程、踩坑經驗、實作技巧。 | 依 Domain 存放 (如 `engineering/`, `quality/`) | `guide`, `playbook` |
| **紀錄 (Record/Assessment)** | 針對特定時間點或對象的**「分析結果」**。 | 包含：測試案例 (Test Cases)、審查報告、圓桌決策紀錄。 | 依 Domain 存放 (如 `quality/assessments/`) | `assessment`, `checklist`, `decision` |

## 2. 判定流程

當需要決定文件位置或 `type` 時，請依照下列問題進行判定：

1. **它是定義「標準/規則」嗎？**
   - $\text{Yes} \rightarrow$ 屬於 **律法** $\rightarrow$ 移至 `docs/conventions/` $\rightarrow$ `type: guideline`。
2. **它是記錄「如何操作/除錯/實作」的技巧嗎？**
   - $\text{Yes} \rightarrow$ 屬於 **經驗** $\rightarrow$ 依主題存放 (如 `engineering/`) $\rightarrow$ `type: guide` 或 `playbook`。
3. **它是針對特定對象的「分析/驗收/決策」結果嗎？**
   - $\text{Yes} \rightarrow$ 屬於 **紀錄** $\rightarrow$ 依主題存放 (如 `quality/assessments/`) $\rightarrow$ `type: assessment` 或 `decision`。

## 3. 命名與路徑對齊原則

- **優先權**：`domain` 標記 $\rightarrow$ 物理路徑 $\rightarrow$ 檔名。
- **命名習慣**：
    - 新文件：`YYYY-MM-DD-kebab-description.md`
    - 既有文件：若搬移至 `conventions/` 且屬核心規範，建議同步更新為新命名格式。
- **SoT (Source of Truth)**：每個主題僅允許一份 `source_of_truth: true` 的文件。

## 4. status 與 type 欄位定義

**`status`**（封閉列舉，僅 3 值）：

| status | 說明 |
| :--- | :--- |
| `draft` | 草稿，未審核 |
| `approved` | 已審核通過，現行有效 |
| `archived` | 已過期或被取代，留存供追溯 |

**`type`**：開放詞彙，非封閉列舉。第 1 節表格「建議 `type`」欄僅列出各類別常見值，可視文件實際性質選用語意最接近的既有值（完整參考見 `docs-governance` skill Step 1），不需強行套入固定 3 類。

---
**版本紀錄**:
- v1.0 (2026-06-14): 初始定義，建立律法/經驗/紀錄三分法。
- v1.1 (2026-06-14): 補充 status 三階列舉定義；註明 type 為開放詞彙非封閉列舉。
