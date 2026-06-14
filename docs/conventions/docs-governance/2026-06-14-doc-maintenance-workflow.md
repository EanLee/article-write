---
title: "文件維護與調整工作流 (Doc Maintenance Workflow)"
domain: conventions
type: guideline
status: approved
owner: tech-team
updated: 2026-06-14
source_of_truth: true
---

# 文件維護與調整工作流 (Doc Maintenance Workflow)

本文定義本專案文件在進行整理、搬移與修正時的標準作業程序 (SOP)，確保所有變更均具有一致性且可追溯。

## 1. 核心哲學：全量同步更新 (Full Sync Update)

**絕對禁止單一維度的修改。** 當一份文件的「性質」或「定位」改變時，必須同步更新以下四個維度，否則視為執行錯誤：

$$\text{檔名 (Filename)} \longleftrightarrow \text{Frontmatter Title} \longleftrightarrow \text{Frontmatter Type} \longleftrightarrow \text{正文 H1 Header}$$

**錯誤示例**：僅將 `TESTING_GUIDE.md` 改名為 `feature-test-checklist.md`，但內容仍寫 `# 功能測試指南` 且 `type: guide`。
**正確示例**：
- 檔名 $\rightarrow$ `feature-test-checklist.md`
- Title $\rightarrow$ `"功能測試核對清單"`
- Type $\rightarrow$ `checklist`
- H1 $\rightarrow$ `# 功能測試核對清單`

## 2. 調整流程 (The Adjustment Cycle)

任何文件整理任務必須遵循以下循環，不可跳步：

### 階段 A：診斷與盤點 (Diagnose)
- 掃描目標目錄的所有文件。
- 閱讀內容，判定其屬於 `docs-classification-logic.md` 中的哪一類（律法 / 經驗 / 紀錄）。
- 識別 SoT (Source of Truth) 衝突（同主題多份文件）。

### 階段 B：提案與共識 (Propose & Align)
- 提出變更清單，包含：`原路徑` $\rightarrow$ `目標路徑` $\rightarrow$ `建議新名稱` $\rightarrow$ `建議新 Type`。
- 解釋搬移理由（例如：「此文件定義了強制性 Commit 規範，應從 engineering 移至 conventions」）。
- **等待使用者確認**。

### 階段 C：同步執行 (Execute Full Sync)
- 執行物理搬移 (`mv`)。
- 執行 Frontmatter 與正文內容的同步更新（使用 `Edit` 或 `replace_content`）。
- 驗證四維度是否完全對齊。

### 階段 D：原則沉澱 (Settle Principle)
- 若本次調整發現了新的分類特徵，立即更新至 `docs-classification-logic.md`。

## 3. 命名與路徑基準

- **核心律法**：使用 `YYYY-MM-DD-kebab-description.md`。
- **技術指南/經驗**：使用 `kebab-case-description.md`。
- **分析紀錄**：保留日期前綴，如 `2026-01-29-performance-report.md`。
- **路徑優先權**：`conventions/` (律法) $>$ `engineering/` (實作) $>$ `quality/` (品質) $\rightarrow$ `product/` (戰略)。

---
**版本紀錄**:
- v1.0 (2026-06-14): 初始定義，建立「全量同步更新」概念與四階段循環。
