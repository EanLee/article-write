---
title: "專案文件導航"
domain: reference
type: reference
status: approved
owner: tech-team
updated: 2026-06-13
source_of_truth: false
---

# 專案文件導航

> **最後更新**: 2026-06-13
> **版本**: 3.0
> **狀態**: 依 docs-governance 補上 `domain` frontmatter 標記後的文件結構

---

## 📚 文件結構

```
docs/
├── README.md (本文件)
├── product/            # 產品策略、業務規則、產品向討論記錄
│   ├── business/       # 產品規格、設定面板、市場分析
│   └── discussions/     # 圓桌會議討論記錄（product domain 的 topic-NNN）
├── engineering/        # 系統架構、技術規格、工程向討論記錄
│   ├── adr/             # 架構決策記錄（ADR）
│   └── discussions/     # 圓桌會議與技術會議討論記錄（engineering domain）
├── delivery/           # 開發規劃、Sprint 進度、交付向討論記錄
│   ├── plans/           # 路線圖、優先級規劃、流程回顧
│   └── discussions/     # 圓桌會議討論記錄（delivery domain）
├── quality/            # 品質評估、測試、Bug 修復
│   ├── assessments/     # 技術評估、測試指南、Bug Fix 報告
│   └── discussions/     # 圓桌會議與技術評審討論記錄（quality domain）
├── operations/         # 部署、維運、CI/CD
├── conventions/        # 開發規範與治理（Git Flow、Commit、程式碼風格、圓桌規則）
│   ├── dev-standards/   # GUIDELINE-* 程式碼與流程規範
│   ├── docs-governance/ # 文件治理任務記錄（T-017~T-019 等）
│   └── governance/      # 圓桌會議運作規則、角色卡、技術團隊索引（TEAM.md）
└── reference/          # 使用指南、Commit 指南、開發筆記、規格參考
```

> **依 domain 分類的目錄結構**：每份文件實體位置即代表其 `domain` frontmatter（product/engineering/
> delivery/quality/operations/conventions/reference），doc-viewer 的 sidebar 依此結構自動產生
> （見 [generate-nav.mjs](../.doc-viewer/scripts/generate-nav.mjs)）。各 domain 下的 `discussions/`
> 子目錄存放圓桌會議 `topic-NNN-*` 資料夾，依該議題的 domain 分類存放。
>
> **已封存文件**：被取代的舊文件（`status: archived`）**留在原本的 domain 目錄**，不獨立成
> `archive` 分類——`domain` 代表主題歸屬、`status` 代表生命週期，是不同維度。doc-viewer
> sidebar 會將各 domain 下 `status: archived` 的文件自動收進該分類的「已封存文件」子分組。

---

## 🎯 快速導航

### 新人入門

1. [產品規格與定位](./product/business/PRODUCT_SPEC.md) - 了解產品願景與核心功能
2. [系統架構](./engineering/ARCHITECTURE_COMPLETE.md) - 理解技術架構設計
3. [整合指南](./engineering/INTEGRATION_GUIDE.md) - 核心功能整合說明

### 開發相關

- [Commit 規範](./reference/COMMIT_GUIDE.md) - Git commit 訊息格式與提交順序
- [測試指南](./quality/assessments/testing/TESTING_GUIDE.md) - 功能測試步驟與預期結果
- [重構計劃](./engineering/REFACTORING_PLAN.md) - 架構重構的階段性計劃

### Bug 修復

- [Bug Fix 規範](./quality/assessments/fix-bug/README.md) - Bug 修復報告撰寫規範
- [已知問題清單](./quality/assessments/POTENTIAL_ISSUES.md) - 目前已知的問題與優先級
- [Bug 修復報告](./quality/assessments/fix-bug/) - 所有 Bug 修復的詳細記錄

### 團隊討論記錄

- [圓桌會議討論記錄](./conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md) - 跨角色戰略/產品/工程決策（topic-NNN）
- [技術團隊討論記錄](./conventions/governance/TEAM.md) - 技術選型、TDR、UX 評估、品質回顧（T-NNN）
- [開發規範](./conventions/) - Git Flow、Commit 規範、程式碼風格（GUIDELINE-*）

---

## 📂 目錄詳細說明

### 1. product/ - 產品策略與業務規則

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [business/PRODUCT_SPEC.md](./product/business/PRODUCT_SPEC.md) | 產品願景、核心問題、功能定位 | 所有人 |
| [business/AI_BLOG_WRITING_TOOL_ANALYSIS.md](./product/business/AI_BLOG_WRITING_TOOL_ANALYSIS.md) | AI 輔助寫作的定位分析、競品對比 | PM, 行銷 |
| [business/MVP_SCOPE.md](./product/business/MVP_SCOPE.md) | MVP 範圍定義 | PM |
| [business/SETTINGS_COMPLETE.md](./product/business/SETTINGS_COMPLETE.md) | **完整設定面板文件**（設計目標 + 改版對比 + 實作細節，SoT） | 設計師, 開發者 |
| [business/SETTINGS_COMPARISON.md](./product/business/SETTINGS_COMPARISON.md) | 設定面板改版對比（已封存，已被 SETTINGS_COMPLETE.md 取代） | - |
| [business/SETTINGS_REDESIGN.md](./product/business/SETTINGS_REDESIGN.md) | 設定面板 UI/UX 重新設計（已封存，已被 SETTINGS_COMPLETE.md 取代） | - |
| [business/SETTINGS_QUICK_REFERENCE.md](./product/business/SETTINGS_QUICK_REFERENCE.md) | 設定面板結構快速導覽 | 所有人 |
| [business/UI_COMPARISON.md](./product/business/UI_COMPARISON.md) | UI 設計對比分析 | 設計師 |
| [discussions/](./product/discussions/) | 圓桌會議討論記錄（product domain 的 `topic-NNN-*`） | 所有人 |

### 2. engineering/ - 系統架構與技術規格

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [ARCHITECTURE_COMPLETE.md](./engineering/ARCHITECTURE_COMPLETE.md) | **完整架構文件**（理想設計 + 現狀問題 + 重構路線圖，SoT） | 技術主管, 架構師 |
| [ARCHITECTURE.md](./engineering/ARCHITECTURE.md) | 架構設計文件（已封存，已被 ARCHITECTURE_COMPLETE.md 取代） | - |
| [ARCHITECTURE_ANALYSIS.md](./engineering/ARCHITECTURE_ANALYSIS.md) | 檔案服務架構分析（已封存，已被 ARCHITECTURE_COMPLETE.md 取代） | - |
| [ARCHITECTURE_REFACTOR.md](./engineering/ARCHITECTURE_REFACTOR.md) | 重構方案設計 | 開發者 |
| [SOLID_ANALYSIS.md](./engineering/SOLID_ANALYSIS.md) | SOLID 原則分析 | 開發者 |
| [INTEGRATION_GUIDE.md](./engineering/INTEGRATION_GUIDE.md) | 核心功能整合說明 | 開發者 |
| [REFACTORING_PLAN.md](./engineering/REFACTORING_PLAN.md) | 服務層重構計劃、進度追蹤 | 技術主管 |
| [REFACTOR_CHECKLIST.md](./engineering/REFACTOR_CHECKLIST.md) | 重構任務清單 | 開發者 |
| [adr/](./engineering/adr/) | 架構決策記錄（ADR），見 [README.md](./engineering/adr/README.md) | 架構師 |
| [discussions/](./engineering/discussions/) | 圓桌會議與技術會議討論記錄（engineering domain 的 `topic-NNN-*`、`T-NNN-*`） | 開發者 |

### 3. delivery/ - 開發規劃與進度

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [plans/CORRECT_PRIORITY_ROADMAP.md](./delivery/plans/CORRECT_PRIORITY_ROADMAP.md) | 優先級路線圖 | PM, 技術主管 |
| [plans/PROGRESS_TRACKING.md](./delivery/plans/PROGRESS_TRACKING.md) | 進度追蹤機制 | PM |
| [plans/RETRO-001-category-feature-branching.md](./delivery/plans/RETRO-001-category-feature-branching.md) | 流程回顧：分支策略 | 開發者 |
| [discussions/](./delivery/discussions/) | 圓桌會議討論記錄（delivery domain 的 `topic-NNN-*`） | 所有人 |

### 4. quality/ - 品質評估與測試

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [assessments/ANALYSIS_REPORT.md](./quality/assessments/ANALYSIS_REPORT.md) | UI/UX 與知識管理深度分析 | 設計師, 開發者 |
| [assessments/POTENTIAL_ISSUES.md](./quality/assessments/POTENTIAL_ISSUES.md) | 已知問題清單、優先級分類 | 開發者, QA |
| [assessments/PHASE_0_GAP_ANALYSIS.md](./quality/assessments/PHASE_0_GAP_ANALYSIS.md) | Phase 0 差異分析 | PM |
| [assessments/testing/TESTING_GUIDE.md](./quality/assessments/testing/TESTING_GUIDE.md) | 功能測試步驟、預期結果 | QA, 開發者 |
| [assessments/testing/AUTOMATED_TESTING_GUIDE.md](./quality/assessments/testing/AUTOMATED_TESTING_GUIDE.md) | 自動化測試指南 | 開發者 |
| [assessments/testing/MANUAL_TESTING_GUIDE.md](./quality/assessments/testing/MANUAL_TESTING_GUIDE.md) | 手動測試流程 | QA |
| [assessments/testing/PERFORMANCE_CODE_REVIEW.md](./quality/assessments/testing/PERFORMANCE_CODE_REVIEW.md) | 性能與程式碼品質審查 | 開發者 |
| [assessments/fix-bug/](./quality/assessments/fix-bug/) | Bug 修復報告（`YYYY-MM-DD-問題描述.md`），見 [README.md](./quality/assessments/fix-bug/README.md) | 開發者, QA |
| [discussions/](./quality/discussions/) | 圓桌會議與技術評審討論記錄（quality domain 的 `topic-NNN-*`、評審報告） | QA, 開發者 |

### 5. operations/ - 部署與維運

CI/CD、部署相關的技術討論記錄（如 GitHub Actions CI/CD 建置）。

### 6. conventions/ - 開發規範與治理

| 文件 | 說明 |
|------|------|
| [dev-standards/GUIDELINE-2026-06-13-git-branching.md](./conventions/dev-standards/GUIDELINE-2026-06-13-git-branching.md) | Git Flow 與分支管理規範 |
| [dev-standards/GUIDELINE-2026-06-13-commit-conventions.md](./conventions/dev-standards/GUIDELINE-2026-06-13-commit-conventions.md) | Commit 規範與 Git Hooks |
| [dev-standards/GUIDELINE-2026-06-13-code-style.md](./conventions/dev-standards/GUIDELINE-2026-06-13-code-style.md) | 程式碼風格與型別規範 |
| [governance/ROUNDTABLE_RULES.md](./conventions/governance/ROUNDTABLE_RULES.md) | 圓桌會議運作規則 |
| [governance/TEAM.md](./conventions/governance/TEAM.md) | 技術團隊成員與 T-NNN 討論記錄索引 |
| [governance/character-cards/](./conventions/governance/character-cards/) | 圓桌會議角色卡 |
| [governance/REVIEW_CHECKLIST.md](./conventions/governance/REVIEW_CHECKLIST.md) | 技術審查檢查清單 |
| [ROUNDTABLE-DISCUSSIONS-INDEX.md](./conventions/ROUNDTABLE-DISCUSSIONS-INDEX.md) | 圓桌會議討論索引（topic-NNN，含 domain 標記） |
| [INDEX-by-domain.md](./conventions/INDEX-by-domain.md) | 跨 domain 主題索引（手動快照） |
| [docs-governance/](./conventions/docs-governance/) | 文件治理任務記錄（T-017～T-019 等） |

### 7. reference/ - 使用指南與參考資料

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [COMMIT_GUIDE.md](./reference/COMMIT_GUIDE.md) | Commit 訊息建議與提交順序 | 開發者 |
| [ARTICLE_TREE_USAGE.md](./reference/ARTICLE_TREE_USAGE.md) | IDE 風格文章列表使用指南 | 使用者 |
| [dev-notes/](./reference/dev-notes/) | 開發筆記、技術評估、Gotchas | 開發者 |
| [specs/](./reference/specs/) | 規格參考文件 | 開發者 |

---

## 🔍 依場景查找文件

### 場景 1: 我想了解這個專案是什麼

1. 閱讀 [PRODUCT_SPEC.md](./product/business/PRODUCT_SPEC.md)
2. 閱讀 [AI_BLOG_WRITING_TOOL_ANALYSIS.md](./product/business/AI_BLOG_WRITING_TOOL_ANALYSIS.md)

### 場景 2: 我要開始開發新功能

1. 理解架構：[ARCHITECTURE_COMPLETE.md](./engineering/ARCHITECTURE_COMPLETE.md)
2. 了解整合方式：[INTEGRATION_GUIDE.md](./engineering/INTEGRATION_GUIDE.md)
3. 學習 Commit 規範：[COMMIT_GUIDE.md](./reference/COMMIT_GUIDE.md)

### 場景 3: 我遇到了 Bug

1. 查看 [POTENTIAL_ISSUES.md](./quality/assessments/POTENTIAL_ISSUES.md) 是否已知
2. 查看 [fix-bug/](./quality/assessments/fix-bug/) 是否有相似問題的修復記錄
3. 參考 [fix-bug/README.md](./quality/assessments/fix-bug/README.md) 撰寫 Bug Fix 報告

### 場景 4: 我要進行架構重構

1. 閱讀 [ARCHITECTURE_COMPLETE.md](./engineering/ARCHITECTURE_COMPLETE.md)  的「現狀問題分析」和「重構路線圖」
2. 參考 [REFACTORING_PLAN.md](./engineering/REFACTORING_PLAN.md)
3. 檢視 [SOLID_ANALYSIS.md](./engineering/SOLID_ANALYSIS.md)

### 場景 5: 我要設計或修改 UI

1. 了解產品定位：[PRODUCT_SPEC.md](./product/business/PRODUCT_SPEC.md)
2. 參考設定面板設計：[SETTINGS_COMPLETE.md](./product/business/SETTINGS_COMPLETE.md)
3. 查看 UI 對比分析：[UI_COMPARISON.md](./product/business/UI_COMPARISON.md)

### 場景 6: 我想找「所有戰略/工程/品質面文件」（跨 domain）

1. 直接瀏覽 doc-viewer 的 sidebar（依 `product`/`engineering`/`delivery`/`quality`/`operations`/`conventions`/`reference`/`archive` 8 個 domain 分組，與 `docs/` 實體目錄結構一致）
2. 或查看 [INDEX-by-domain.md](./conventions/INDEX-by-domain.md) 的手動快照索引

---

## 📝 文件維護

### 文件版本

- **v1.0** (2026-01-26): 初始文件結構
- **v2.0** (2026-02-02): 重新整理，合併重複文件，新增多角色評估
- **v3.0** (2026-06-13): 依 docs-governance 為 ~80 份文件補上 `domain`/`status`/`source_of_truth`
  等 frontmatter（詳見 [T-018](./conventions/docs-governance/T-018-docs-reorganization-plan.md)），新增
  [INDEX-by-domain.md](./conventions/INDEX-by-domain.md) 跨目錄索引；移除已不存在的 `multi-role-analysis/` 章節，
  補上 `roundtable-discussions/`、`tech-team/`、`conventions/`、`adr/` 章節
- **v4.0** (2026-06-13): T-020 Phase 6 — 依 domain 將實體檔案搬移至
  `product/engineering/delivery/quality/operations/conventions/reference` 7 大目錄，
  doc-viewer sidebar 依此結構自動產生；移除已不存在的混合目錄說明，本文件依新結構重寫。
  已取代文件（`status: archived`）留在原本的 domain 目錄下，由 sidebar 收進「已封存文件」子分組

### 已標記 `source_of_truth` 的重複文件

以下文件群組同主題存在多份檔案，已透過 frontmatter `source_of_truth` / `status: archived` /
`supersedes` / `superseded_by` 標示哪份為現行版本（已取代版本留在原 domain 目錄）：

| 主題 | 現行版本（SoT） | 已取代版本 |
|--------|--------|------|
| 系統架構 | [ARCHITECTURE_COMPLETE.md](./engineering/ARCHITECTURE_COMPLETE.md) | [ARCHITECTURE.md](./engineering/ARCHITECTURE.md)、[ARCHITECTURE_ANALYSIS.md](./engineering/ARCHITECTURE_ANALYSIS.md) |
| 設定面板 | [SETTINGS_COMPLETE.md](./product/business/SETTINGS_COMPLETE.md) | [SETTINGS_COMPARISON.md](./product/business/SETTINGS_COMPARISON.md)、[SETTINGS_REDESIGN.md](./product/business/SETTINGS_REDESIGN.md) |

### 文件撰寫規範

1. 所有文件使用 Markdown 格式
2. 標題使用繁體中文
3. 程式碼範例使用英文註解
4. 每個文件開頭包含：版本號、更新日期、狀態
5. Bug Fix 報告使用 `YYYY-MM-DD-問題描述.md` 命名格式

---

## 🤝 貢獻指南

### 新增文件

1. 確定文件歸屬的目錄
2. 使用清楚的檔名
3. 在文件開頭標註版本和日期
4. 更新本 README.md 的相關章節

### 更新文件

1. 更新文件內的「最後更新」日期
2. 如果是重大變更，更新版本號
3. 如有必要，更新本 README.md

### 回報問題

如發現文件有誤或需要補充，請：
1. 建立 Issue 說明問題
2. 或直接提交 PR 修正

---

**維護者**: Claude AI
**專案**: R (Markdown Blog Writing Tool)
**文件庫位置**: `docs/`
