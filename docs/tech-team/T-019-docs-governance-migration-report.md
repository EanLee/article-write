---
title: "文件治理遷移報告：T-018 Phase 2-5 執行結果"
domain: conventions
type: assessment
status: approved
owner: tech-team
updated: 2026-06-13
source_of_truth: true
related_docs:
  - docs/tech-team/T-018-docs-reorganization-plan.md
  - docs/tech-team/T-017-doc-viewer-docs-governance-gap-analysis.md
  - docs/INDEX-by-domain.md
  - docs/.vitepress/doc-types.config.mjs
tags:
  - docs-governance
  - migration
---

# T-019 文件治理遷移報告：T-018 Phase 2-5 執行結果

## 任務背景

[T-018](./T-018-docs-reorganization-plan.md) 盤點出 `docs/` 內戰略面（product/delivery）與工程技術面
（engineering/quality/operations）文件混雜的問題，並提出「雙軸模型」（時間軸目錄不動 + 主題軸 domain
frontmatter）作為解法，排定 Phase 2-5 執行計畫。本報告記錄 Phase 2-5 的實際執行結果、IA 專家複審結論，
以及尚未處理、刻意延後的殘餘事項。

## 執行範圍

於 `docs/governance-ia-reorg` 分支（自 `fix/save-single-source-of-truth` 分出，依 SRP 原則獨立處理本次
文件治理工作）完成，共 7 個 commit：

| Commit | 內容 | 對應 Phase |
|--------|------|-----------|
| `90f99e3` | 標記 `architecture/`、`settings/` 重疊文件的 `source_of_truth`/`supersedes`/`superseded_by` | Phase 2 |
| `6988332` | 新增 `docs/.vitepress/doc-types.config.mjs`（`mixedDirs`、`registries`、`statusMap`、`extend`） | Phase 3 |
| `4b4a9f7` | `roundtable-discussions/` topic-000~022 補 `domain` frontmatter，並將重複編號 `topic-012-2026-02-28-progress-review` 改名為 `topic-022` | Phase 4a |
| `e63d7dd` | `tech-team/` T-001~T-017、RETRO-001、UX-001、REVIEW_CHECKLIST 及 7 份評審索引補 `domain` frontmatter | Phase 4b |
| `17b16b8` | `planning/`、`analysis/`、`guides/` 共 18 份文件補 `domain` frontmatter | Phase 4c |
| `250e13e` | 新增 `docs/INDEX-by-domain.md` 跨目錄索引；`README.md`/`TEAM.md`/`roundtable-discussions/README.md` 加入 domain registry；`docs/README.md` 改版為 v3.0；conventions 三份 GUIDELINE 與 T-018 補 `domain` | Phase 5 |
| `a9517ed` | 修正 `INDEX-by-domain.md` 統計數字誤差（product 18→19，總計 78→79） | Phase 5 補充 |

## 執行結果統計

- 已補 `domain` frontmatter 的文件：**79 份**（不含 `INDEX-by-domain.md` 自身）
  - conventions 6、product 19、engineering 26、delivery 12、quality 15、operations 1
- 已標記 `source_of_truth`/`supersedes`/`superseded_by` 的重複主題：2 組
  - 系統架構：`ARCHITECTURE_COMPLETE.md`（SoT） ← `ARCHITECTURE.md`、`ARCHITECTURE_ANALYSIS.md`
  - 設定面板：`SETTINGS_COMPLETE.md`（SoT） ← `SETTINGS_COMPARISON.md`、`SETTINGS_REDESIGN.md`
- 新增設定檔：`docs/.vitepress/doc-types.config.mjs`（`mixedDirs`、`registries`、`domains`、`statusMap`、`prependStatus`）
- 新增跨目錄索引：`docs/INDEX-by-domain.md`
- 修正編號重複：`topic-012-2026-02-28-progress-review/` → `topic-022-2026-02-28-progress-review/`
- `docs/README.md` 改版為 v3.0：反映現行目錄結構、移除已不存在的 `multi-role-analysis/` 章節、新增「依 domain 查找」場景

## IA 專家複審結論

複審項目與結果如下，**未發現阻斷性問題**：

| 檢查項目 | 結果 |
|---------|------|
| `doc-types.config.mjs` 的 `mixedDirs`/`registries` 宣告是否與實際標記一致 | ✅ 一致：5 個 mixedDirs 目錄均已標記 decision.md / T-*.md 層級的 domain；`registries` 列出的 3 份索引檔均已補 registry 表格 |
| `topic-012` 編號重複問題是否已解決，是否有殘留引用 | ✅ 已重新編號為 `topic-022`，全文搜尋 `topic-012-2026-02-28` 僅剩 T-018 落差記錄本身（描述問題的歷史記錄，非待修正引用） |
| `INDEX-by-domain.md` 是否完整覆蓋已標記文件 | ✅ 79 份已標記文件均可於索引表格中找到（已修正統計數字誤差） |
| `source_of_truth`/`supersedes`/`superseded_by` 是否成對且方向一致 | ✅ 2 組重複主題的 `supersedes`/`superseded_by` 互相對應 |
| `status` 值是否落在五階段 + `pending` 前置狀態內 | ✅ 實際使用值為 `approved`(69)、`draft`(4)、`deprecated`(4)、`reviewing`(1)、`pending`(2)，均在 `doc-types.config.mjs` 定義範圍內 |

## 刻意延後的殘餘事項（依 T-018 Phase 4 範圍定義）

T-018 Phase 4 明確定義為「優先補上『目前活躍/常被引用』的文件，其餘文件於下次編輯時再補（漸進式）」。
以下檔案**尚未補 `domain` frontmatter**，屬於刻意延後、非本次遺漏：

- `roundtable-discussions/topic-*/` 內的子文件（`discussion.md`、`role-*.md`、`action-items*.md` 等）：
  domain 已記錄於同目錄 `decision.md` 與 `README.md` registry，子文件視為該 topic 的工作產出，隨 topic 一併分類
- `tech-team/2026-03-01-*-review/`、`2026-03-02-seventh-review/`、`20260228-第一次全面分析/` 內各份
  `0N-*-report.md`/`assessment.md`：domain 已記錄於各自 `00-index.md`/`07-roundtable-discussion.md`
- `roundtable-discussions/README.md`、`tech-team/README.md`、`ROUNDTABLE_RULES.md`、`CHARACTER_CARDS.md`、
  `.template/*.md` 等索引/模板檔案：本身為 registry 或模板，非單一主題文件，不適用 `domain` 分類
- `topic-019`、`topic-021` 的 `PENDING.md`：已使用 `doc-types.config.mjs` 定義的前置狀態 `status: pending`，
  待進入 draft 編寫流程後再依正常規則補 `domain`

## 其他未處理事項（沿用 T-018 原始結論，非本次範圍）

- **既有檔名未改為 `YYYY-MM-DD-kebab-description.md`**：T-018 已明確「不要求既有檔案重新命名」，僅要求新文件遵循新規則
- **`owner`/`reviewers` 補登**：本次已將 tech-team 系列預設 `owner: tech-team`；roundtable 系列尚未逐一補上對應決策人，可於下次編輯時補上
- **`tags`**：尚未為高頻引用文件（GUIDELINE、ADR、TDR）補 `tags`，可提升 `ctx_search` 命中率，列為後續優化項目

## 結論

T-018 Phase 2-5 已全數執行完畢，IA 專家複審未發現需立即修正的問題。文件治理現況：

1. 重複主題（architecture/settings）已標記 SoT，消除多份「現行版本」的歧義
2. mixedDirs 內 79 份文件已依 domain 分類，可透過 `INDEX-by-domain.md` 跨目錄檢視
3. 編號重複問題（topic-012）已解決
4. `docs/README.md` 已更新至 v3.0，反映現行目錄結構

殘餘事項均為 T-018 規劃中明確列為「漸進式、下次編輯時補」的範圍，不影響本次治理目標的達成。
