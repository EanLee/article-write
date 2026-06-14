---
name: doc-organizer
description: 用於整理 docs/ 目錄下既有文件——當檔名、frontmatter（domain/type/title）與正文 H1 標題不一致、同主題出現多份 source_of_truth 衝突、或文件所屬 domain 與實際內容不符需要搬移時使用。
---

# Doc Organizer Skill

## 適用情境

- 檔名 ↔ frontmatter `title` ↔ `type` ↔ 正文 `H1` 四者不一致
- 同主題出現多份 `source_of_truth: true` 衝突
- 文件所屬 `domain` 與實際內容/路徑不符，需要搬移

**與其他 doc 系列 skill 的分工：**

| 情境 | 用哪個 skill |
| :--- | :--- |
| 起草全新文件（PRD/RFC/設計文件） | `doc-coauthoring` |
| 建立/分類單一新文件、填 frontmatter | `docs-governance` |
| 既有文件批量補齊缺漏 frontmatter 欄位 | `doc-migration` |
| 既有文件批量重組/改名/四維對齊 | **doc-organizer**（本技能） |

## 核心基準

在執行任何動作前，必須優先讀取以下兩份律法文件：
1. `docs/conventions/docs-governance/2026-06-14-docs-classification-logic.md`（判定文件性質）
2. `docs/conventions/docs-governance/2026-06-14-doc-maintenance-workflow.md`（執行同步更新 SOP）

## 執行流程

本技能執行上述兩份 GUIDELINE 定義的「全量同步更新」四階段循環（診斷 → 提案 → 執行 → 沉澱）。**流程細節以 GUIDELINE 為準，不在此重複**；GUIDELINE 更新後本技能自動適用最新版本，無需同步修改。

本技能補充 GUIDELINE 未涵蓋的 agent 操作細節：

- **診斷階段**：用 `list_dir` / `read_file`（serena）或 `ctx_batch_execute`（context-mode）盤點目錄
- **提案階段**：以對比表格呈現（原路徑/名稱 → 目標路徑/名稱 → 建議 type → 理由），**等待使用者確認後才執行**
- **執行階段**：`mv` 搬移 + `Edit`/`replace_content` 同步 frontmatter 與 H1，逐項驗證四維對齊

## 迭代與回饋原則 (Self-Improvement Loop)

本技能並非靜態腳本，而是在實作中演進的原型：

1. **即時質詢**：判定模糊、邏輯矛盾或性質不符 → 立即停止，請求使用者決定
2. **決定後驗證**：重新評估該決定是否揭示現有邏輯不足
3. **動態更新**：流程或判定標準需改善 → 任務完成後主動提出更新本檔建議，使用者同意後修改

## 注意事項
- **絕對禁止** 僅修改檔名而不修改內文
- **絕對禁止** 在未達成共識前直接大批量搬移文件
- 優先處理 `source_of_truth` 衝突最嚴重的區域
