---
title: "跨目錄文件索引（依 Domain）"
domain: conventions
type: reference
status: approved
owner: tech-team
updated: 2026-06-13
source_of_truth: true
related_docs:
  - docs/conventions/T-018-docs-reorganization-plan.md
  - docs/.vitepress/doc-types.config.mjs
---

# 跨目錄文件索引（依 Domain）

> 依 T-018 IA 專家建議「雙軸模型」產出：`docs/` 既有的序號/日期目錄（`roundtable-discussions/`、
> `tech-team/`、`planning/`、`analysis/`、`guides/` 等）保持原位不動，本頁依各文件
> frontmatter 的 `domain` 欄位重新聚合，提供「我想看所有 product 戰略文件」這類跨目錄查詢視圖
> （回應 T-018 落差七）。
>
> 本頁為手動產出的快照，文件異動後需手動更新；後續可由 `ctx_batch_execute` 掃描 frontmatter
> 自動產生。`status: deprecated` 的文件僅供歷史參照，不可作為決策依據。

## conventions

| 文件 | 標題 | 狀態 |
|---|---|---|
| [guides/COMMIT_GUIDE.md](../reference/COMMIT_GUIDE.md) | Git Commit 指南 | approved |
| [tech-team/T-017-doc-viewer-docs-governance-gap-analysis.md](./T-017-doc-viewer-docs-governance-gap-analysis.md) | doc-viewer docs-governance 文件分類落差分析與改進建議 | approved |
| [tech-team/T-018-docs-reorganization-plan.md](./T-018-docs-reorganization-plan.md) | 文件治理：戰略面與工程技術面分類規劃 | approved |
| [tech-team/T-019-docs-governance-migration-report.md](./T-019-docs-governance-migration-report.md) | 文件治理遷移報告：T-018 Phase 2-5 執行結果 | approved |
| [conventions/GUIDELINE-2026-06-13-git-branching.md](./GUIDELINE-2026-06-13-git-branching.md) | Git Flow 與分支管理規範 | draft |
| [conventions/GUIDELINE-2026-06-13-commit-conventions.md](./GUIDELINE-2026-06-13-commit-conventions.md) | Commit 規範與 Git Hooks | draft |
| [conventions/GUIDELINE-2026-06-13-code-style.md](./GUIDELINE-2026-06-13-code-style.md) | 程式碼風格與型別規範 | draft |

## product

| 文件 | 標題 | 狀態 |
|---|---|---|
| [analysis/PRODUCT_SPEC.md](../product/business/PRODUCT_SPEC.md) | 產品規劃文件 | approved |
| [analysis/AI_BLOG_WRITING_TOOL_ANALYSIS.md](../product/business/AI_BLOG_WRITING_TOOL_ANALYSIS.md) | AI 輔助部落格寫作工具 - 專業分析報告 | approved |
| [planning/MVP_SCOPE.md](../product/business/MVP_SCOPE.md) | WriteFlow MVP 範圍定義 | approved |
| [guides/ARTICLE_TREE_USAGE.md](../reference/ARTICLE_TREE_USAGE.md) | IDE 風格文章樹使用指南 | approved |
| [settings/SETTINGS_COMPLETE.md](../product/business/SETTINGS_COMPLETE.md) | 設定面板完整文件（SoT） | approved |
| [settings/SETTINGS_QUICK_REFERENCE.md](../product/business/SETTINGS_QUICK_REFERENCE.md) | 設定面板快速參考 | approved |
| [settings/UI_COMPARISON.md](../product/business/UI_COMPARISON.md) | 文章列表 UI 改版對比 | approved |
| [settings/SETTINGS_COMPARISON.md](../archive/SETTINGS_COMPARISON.md) | 設定面板改版對比（已取代） | deprecated |
| [settings/SETTINGS_REDESIGN.md](../archive/SETTINGS_REDESIGN.md) | 設定面板 UI/UX 重新設計（已取代） | deprecated |
| [tech-team/T-011-settings-panel-ux-review.md](../product/discussions/T-011-settings-panel-ux-review.md) | 設定面板 UX 評估 | approved |
| [tech-team/UX-001-form-design-system.md](../product/discussions/UX-001-form-design-system.md) | 表單設計系統 | approved |
| [roundtable-discussions/topic-001-2026-02-03-product-launch-strategy/decision.md](../product/discussions/topic-001-2026-02-03-product-launch-strategy/decision.md) | 產品上市策略 | approved |
| [roundtable-discussions/topic-004-2026-02-12-reality-reset/decision.md](../product/discussions/topic-004-2026-02-12-reality-reset/decision.md) | Reality Reset（戰略方向重置） | approved |
| [roundtable-discussions/topic-009-2026-02-14-ux-review/decision.md](../product/discussions/topic-009-2026-02-14-ux-review/decision.md) | UX Review | approved |
| [roundtable-discussions/topic-010-2026-02-14-editor-ux-decision/decision.md](../product/discussions/topic-010-2026-02-14-editor-ux-decision/decision.md) | 編輯器 UX 決策 | approved |
| [roundtable-discussions/topic-013-2026-02-16-next-sprint-direction/decision.md](../product/discussions/topic-013-2026-02-16-next-sprint-direction/decision.md) | 下一階段 Sprint 方向 | approved |
| [roundtable-discussions/topic-016-2026-02-27-blog-content-analysis/decision.md](../product/discussions/topic-016-2026-02-27-blog-content-analysis/decision.md) | 部落格文章內容品質分析（SEO/行銷/學習者） | approved |
| [roundtable-discussions/topic-017-2026-02-27-feature-direction-integration/decision.md](../product/discussions/topic-017-2026-02-27-feature-direction-integration/decision.md) | 整合 AI 規格與後續 Sprint 功能走向 | approved |
| [roundtable-discussions/topic-018-2026-03-03-market-direction-progress-check/decision.md](../product/discussions/topic-018-2026-03-03-market-direction-progress-check/decision.md) | 市場方向進度檢視 | approved |

## engineering

| 文件 | 標題 | 狀態 |
|---|---|---|
| [architecture/ARCHITECTURE_COMPLETE.md](../engineering/ARCHITECTURE_COMPLETE.md) | 系統架構完整文件（SoT） | approved |
| [architecture/ARCHITECTURE.md](../archive/ARCHITECTURE.md) | 架構設計文件（已取代） | deprecated |
| [architecture/ARCHITECTURE_ANALYSIS.md](../archive/ARCHITECTURE_ANALYSIS.md) | 檔案服務架構分析 - 過度設計問題（已取代） | deprecated |
| [guides/INTEGRATION_GUIDE.md](../engineering/INTEGRATION_GUIDE.md) | 核心功能整合指南 | approved |
| [planning/REFACTORING_PLAN.md](../engineering/REFACTORING_PLAN.md) | 服務層重構計劃 | approved |
| [planning/REFACTOR_CHECKLIST.md](../engineering/REFACTOR_CHECKLIST.md) | 重構檢查清單 | approved |
| [analysis/chinese-slug-evaluation.md](../engineering/chinese-slug-evaluation.md) | 中文 Slug 處理評估報告 | reviewing |
| [tech-team/T-001-publish-refactor.md](../engineering/discussions/T-001-publish-refactor.md) | 發布流程重構 | approved |
| [tech-team/T-002-autosave-mechanism.md](../engineering/discussions/T-002-autosave-mechanism.md) | 自動儲存機制（TDR） | approved |
| [tech-team/T-004-changelog-automation.md](../engineering/discussions/T-004-changelog-automation.md) | Changelog 自動化 | approved |
| [tech-team/T-005-metadata-cache-design.md](../engineering/discussions/T-005-metadata-cache-design.md) | Metadata 快取設計（TDR） | approved |
| [tech-team/T-006-category-type-refactor.md](../engineering/discussions/T-006-category-type-refactor.md) | 分類型別重構 | approved |
| [tech-team/T-008-auto-update-electron-updater.md](../engineering/discussions/T-008-auto-update-electron-updater.md) | Electron 自動更新（electron-updater） | approved |
| [tech-team/T-009-full-text-search-design.md](../engineering/discussions/T-009-full-text-search-design.md) | 全文搜尋設計（TDR） | approved |
| [tech-team/T-010-ai-service-architecture.md](../engineering/discussions/T-010-ai-service-architecture.md) | AI Service 架構 | approved |
| [tech-team/T-012-ai-panel-phase2-3-prompt-design.md](../engineering/discussions/T-012-ai-panel-phase2-3-prompt-design.md) | AI 面板 Phase 2-3 Prompt 設計 | approved |
| [tech-team/T-015-ai-service-design.md](../engineering/discussions/T-015-ai-service-design.md) | AI Service 設計 | approved |
| [tech-team/T-016-phase2-token-cost-evaluation.md](../engineering/discussions/T-016-phase2-token-cost-evaluation.md) | Phase 2 Token 成本評估 | approved |
| [roundtable-discussions/topic-006-2026-02-14-publish-mechanism/decision.md](../engineering/discussions/topic-006-2026-02-14-publish-mechanism/decision.md) | 發布機制架構決策 | approved |
| [roundtable-discussions/topic-007-2026-02-14-frontmatter-date-fields/decision.md](../engineering/discussions/topic-007-2026-02-14-frontmatter-date-fields/decision.md) | Frontmatter 日期欄位設計 | approved |
| [roundtable-discussions/topic-012-2026-02-16-auto-update/decision.md](../engineering/discussions/topic-012-2026-02-16-auto-update/decision.md) | 自動更新機制 | approved |
| [roundtable-discussions/topic-014-2026-02-16-ai-api-integration/decision.md](../engineering/discussions/topic-014-2026-02-16-ai-api-integration/decision.md) | AI API 整合架構 | approved |
| [roundtable-discussions/topic-015-2026-02-16-ai-panel-design/decision.md](../engineering/discussions/topic-015-2026-02-16-ai-panel-design/decision.md) | AI 面板設計 | approved |
| [roundtable-discussions/topic-020-2026-06-13-save-race-data-overwrite/decision.md](../engineering/discussions/topic-020-2026-06-13-save-race-data-overwrite/decision.md) | 儲存機制整體設計（合併解決 topic-019） | approved |
| [roundtable-discussions/topic-019-2026-03-07-autosave-on-switch-behavior/PENDING.md](../engineering/discussions/topic-019-2026-03-07-autosave-on-switch-behavior/PENDING.md) | Autosave 切換行為（待排程） | pending |
| [roundtable-discussions/topic-021-2026-06-13-articlelisttree-reactivity/PENDING.md](../engineering/discussions/topic-021-2026-06-13-articlelisttree-reactivity/PENDING.md) | ArticleListTree 在完整 E2E 套件中無法顯示新偵測文章（待排程） | pending |

## delivery

| 文件 | 標題 | 狀態 |
|---|---|---|
| [planning/CORRECT_PRIORITY_ROADMAP.md](../delivery/plans/CORRECT_PRIORITY_ROADMAP.md) | 正確的開發優先級路線圖 | approved |
| [planning/PROGRESS_TRACKING.md](../delivery/plans/PROGRESS_TRACKING.md) | WriteFlow 進度追蹤機制 | approved |
| [planning/P0_SCOPE_ADJUSTMENT.md](../delivery/plans/P0_SCOPE_ADJUSTMENT.md) | P0 範圍調整決策：移除 Git 自動化 | approved |
| [planning/2026-02-07-day-6-plan.md](../delivery/plans/2026-02-07-day-6-plan.md) | Week 2 Day 6 - P0-1 設定介面開發計畫 | approved |
| [tech-team/T-013-sprint3-implementation-planning.md](../delivery/plans/T-013-sprint3-implementation-planning.md) | Sprint 3 實作規劃 | approved |
| [tech-team/RETRO-001-category-feature-branching.md](../delivery/plans/RETRO-001-category-feature-branching.md) | 分類功能分支開發回顧 | approved |
| [roundtable-discussions/topic-002-2026-02-06-progress-review-week2/discussion.md](../delivery/discussions/topic-002-2026-02-06-progress-review-week2/discussion.md) | 第二週進度回顧 | approved |
| [roundtable-discussions/topic-003-2026-02-06-emergency-progress-review/decision.md](../delivery/discussions/topic-003-2026-02-06-emergency-progress-review/decision.md) | 緊急進度回顧 | approved |
| [roundtable-discussions/topic-005-2026-02-13-week3-progress-review/decision.md](../delivery/discussions/topic-005-2026-02-13-week3-progress-review/decision.md) | 第三週進度回顧 | approved |
| [roundtable-discussions/topic-008-2026-02-14-sprint-retro/decision.md](../delivery/discussions/topic-008-2026-02-14-sprint-retro/decision.md) | Sprint Retro | approved |
| [roundtable-discussions/topic-011-2026-02-14-quality-sprint-planning/decision.md](../delivery/discussions/topic-011-2026-02-14-quality-sprint-planning/decision.md) | 品質衝刺規劃 | approved |
| [roundtable-discussions/topic-022-2026-02-28-progress-review/decision.md](../delivery/discussions/topic-022-2026-02-28-progress-review/decision.md) | 進度回顧（原編號 topic-012，已重新編號） | approved |

## quality

| 文件 | 標題 | 狀態 |
|---|---|---|
| [analysis/ANALYSIS_REPORT.md](../quality/assessments/ANALYSIS_REPORT.md) | 部落格撰寫應用程式 - UI/UX 與知識管理專家分析報告 | approved |
| [analysis/POTENTIAL_ISSUES.md](../quality/assessments/POTENTIAL_ISSUES.md) | 潛在問題清單 | approved |
| [planning/PHASE_0_GAP_ANALYSIS.md](../quality/assessments/PHASE_0_GAP_ANALYSIS.md) | Phase 0 功能缺口分析 | approved |
| [planning/P0_GAP_ANALYSIS.md](../quality/assessments/P0_GAP_ANALYSIS.md) | P0 功能缺口分析報告 | approved |
| [guides/E2E_TESTING_GUIDE.md](../quality/assessments/E2E_TESTING_GUIDE.md) | E2E 測試指南（Electron + Playwright） | approved |
| [tech-team/REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md) | 技術審查檢查清單 | approved |
| [tech-team/T-007-playwright-electron-e2e-setup.md](../quality/discussions/T-007-playwright-electron-e2e-setup.md) | Playwright Electron E2E 環境建置 | approved |
| [tech-team/20260228-第一次全面分析/07-roundtable-discussion.md](../quality/discussions/20260228-第一次全面分析/07-roundtable-discussion.md) | 第一次全面分析 — 圓桌討論 | approved |
| [tech-team/2026-03-01-second-review/00-index.md](../quality/discussions/2026-03-01-second-review/00-index.md) | WriteFlow 第二次技術評估：索引 | approved |
| [tech-team/2026-03-01-third-review/00-index.md](../quality/discussions/2026-03-01-third-review/00-index.md) | 第三次全面技術評估 — 索引 | approved |
| [tech-team/2026-03-01-fourth-review/00-index.md](../quality/discussions/2026-03-01-fourth-review/00-index.md) | 第四次技術評估 — 索引 | approved |
| [tech-team/2026-03-01-fifth-review/00-index.md](../quality/discussions/2026-03-01-fifth-review/00-index.md) | 第五次全面技術評審 — 索引 | approved |
| [tech-team/2026-03-01-sixth-review/00-index.md](../quality/discussions/2026-03-01-sixth-review/00-index.md) | 第六次全面技術評審 — 索引 | approved |
| [tech-team/2026-03-02-seventh-review/00-index.md](../quality/discussions/2026-03-02-seventh-review/00-index.md) | 第七次全面技術評估 — 索引 | approved |
| [roundtable-discussions/topic-000-2026-02-02-initial-system-evaluation/decision.md](../quality/discussions/topic-000-2026-02-02-initial-system-evaluation/decision.md) | 初始系統評估（多角色基準評估） | approved |

## operations

| 文件 | 標題 | 狀態 |
|---|---|---|
| [tech-team/T-003-github-actions-cicd.md](../operations/T-003-github-actions-cicd.md) | GitHub Actions CI/CD | approved |

---

**統計**：conventions 7、product 19、engineering 26、delivery 12、quality 15、operations 1（共 80 份已標記 `domain` 的文件，不含本索引自身）
