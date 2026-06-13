# 專案文件導航

> **最後更新**: 2026-06-13
> **版本**: 3.0
> **狀態**: 依 docs-governance 補上 `domain` frontmatter 標記後的文件結構

---

## 📚 文件結構

```
docs/
├── README.md (本文件)
├── INDEX-by-domain.md  # 跨目錄文件索引（依 domain：product/engineering/quality/delivery/conventions/operations）
├── conventions/        # 開發規範（Git Flow、Commit、程式碼風格）
├── adr/                 # 架構決策記錄（ADR）
├── analysis/           # 產品分析與規劃
├── architecture/       # 系統架構設計
├── guides/             # 使用與開發指南
├── testing/            # 測試相關文件
├── planning/           # 開發規劃與路線圖
├── settings/           # 設定面板設計
├── fix-bug/            # Bug 修復報告
├── roundtable-discussions/  # 圓桌會議討論記錄（topic-NNN）
└── tech-team/          # 技術團隊討論記錄（T-NNN）與多輪品質評估
```

> **混合目錄說明**：`roundtable-discussions/`、`tech-team/`、`planning/`、`analysis/`、`guides/`
> 內混合了多種性質（戰略/工程/品質/交付）的文件，各文件已於 frontmatter 補上 `domain` 欄位標示
> 實際性質，目錄位置維持不動（詳見 [doc-types.config.mjs](./.vitepress/doc-types.config.mjs) 的
> `mixedDirs` 宣告）。**跨目錄依 domain 檢視，請參考** [INDEX-by-domain.md](./INDEX-by-domain.md)。

---

## 🎯 快速導航

### 新人入門

1. [產品規格與定位](./analysis/PRODUCT_SPEC.md) - 了解產品願景與核心功能
2. [系統架構](./architecture/ARCHITECTURE_COMPLETE.md) - 理解技術架構設計
3. [整合指南](./guides/INTEGRATION_GUIDE.md) - 核心功能整合說明

### 開發相關

- [Commit 規範](./guides/COMMIT_GUIDE.md) - Git commit 訊息格式與提交順序
- [測試指南](./testing/TESTING_GUIDE.md) - 功能測試步驟與預期結果
- [重構計劃](./planning/REFACTORING_PLAN.md) - 架構重構的階段性計劃

### Bug 修復

- [Bug Fix 規範](./fix-bug/README.md) - Bug 修復報告撰寫規範
- [已知問題清單](./analysis/POTENTIAL_ISSUES.md) - 目前已知的問題與優先級
- [Bug 修復報告](./fix-bug/) - 所有 Bug 修復的詳細記錄

### 團隊討論記錄

- [圓桌會議討論記錄](./roundtable-discussions/README.md) - 跨角色戰略/產品/工程決策（topic-NNN）
- [技術團隊討論記錄](./tech-team/TEAM.md) - 技術選型、TDR、UX 評估、品質回顧（T-NNN）
- [開發規範](./conventions/) - Git Flow、Commit 規範、程式碼風格（GUIDELINE-*）

---

## 📂 目錄詳細說明

### 1. analysis/ - 產品分析與規劃

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [PRODUCT_SPEC.md](./analysis/PRODUCT_SPEC.md) | 產品願景、核心問題、功能定位 | 所有人 |
| [AI_BLOG_WRITING_TOOL_ANALYSIS.md](./analysis/AI_BLOG_WRITING_TOOL_ANALYSIS.md) | AI 輔助寫作的定位分析、競品對比 | PM, 行銷 |
| [ANALYSIS_REPORT.md](./analysis/ANALYSIS_REPORT.md) | UI/UX 與知識管理深度分析 | 設計師, 開發者 |
| [POTENTIAL_ISSUES.md](./analysis/POTENTIAL_ISSUES.md) | 已知問題清單、優先級分類 | 開發者, QA |

### 2. architecture/ - 系統架構設計

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [ARCHITECTURE_COMPLETE.md](./architecture/ARCHITECTURE_COMPLETE.md) | **完整架構文件**（理想設計 + 現狀問題 + 重構路線圖） | 技術主管, 架構師 |
| [ARCHITECTURE_REFACTOR.md](./architecture/ARCHITECTURE_REFACTOR.md) | 重構方案設計 | 開發者 |
| [SOLID_ANALYSIS.md](./architecture/SOLID_ANALYSIS.md) | SOLID 原則分析 | 開發者 |

> **注意**: ARCHITECTURE.md 和 ARCHITECTURE_ANALYSIS.md 已合併至 ARCHITECTURE_COMPLETE.md

### 3. guides/ - 使用與開發指南

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [INTEGRATION_GUIDE.md](./guides/INTEGRATION_GUIDE.md) | 核心功能整合說明 | 開發者 |
| [COMMIT_GUIDE.md](./guides/COMMIT_GUIDE.md) | Commit 訊息建議與提交順序 | 開發者 |
| [ARTICLE_TREE_USAGE.md](./guides/ARTICLE_TREE_USAGE.md) | IDE 風格文章列表使用指南 | 使用者 |

### 4. testing/ - 測試相關文件

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [TESTING_GUIDE.md](./testing/TESTING_GUIDE.md) | 功能測試步驟、預期結果 | QA, 開發者 |
| [AUTOMATED_TESTING_GUIDE.md](./testing/AUTOMATED_TESTING_GUIDE.md) | 自動化測試指南 | 開發者 |
| [MANUAL_TESTING_GUIDE.md](./testing/MANUAL_TESTING_GUIDE.md) | 手動測試流程 | QA |
| [PERFORMANCE_CODE_REVIEW.md](./testing/PERFORMANCE_CODE_REVIEW.md) | 性能與程式碼品質審查 | 開發者 |

### 5. planning/ - 開發規劃與路線圖

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [REFACTORING_PLAN.md](./planning/REFACTORING_PLAN.md) | 服務層重構計劃、進度追蹤 | 技術主管 |
| [REFACTOR_CHECKLIST.md](./planning/REFACTOR_CHECKLIST.md) | 重構任務清單 | 開發者 |
| [CORRECT_PRIORITY_ROADMAP.md](./planning/CORRECT_PRIORITY_ROADMAP.md) | 優先級路線圖 | PM, 技術主管 |
| [PHASE_0_GAP_ANALYSIS.md](./planning/PHASE_0_GAP_ANALYSIS.md) | Phase 0 差異分析 | PM |

### 6. settings/ - 設定面板設計

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [SETTINGS_COMPLETE.md](./settings/SETTINGS_COMPLETE.md) | **完整設定面板文件**（設計目標 + 改版對比 + 實作細節） | 設計師, 開發者 |
| [SETTINGS_QUICK_REFERENCE.md](./settings/SETTINGS_QUICK_REFERENCE.md) | 設定面板結構快速導覽 | 所有人 |
| [UI_COMPARISON.md](./settings/UI_COMPARISON.md) | UI 設計對比分析 | 設計師 |

> **注意**: SETTINGS_COMPARISON.md 和 SETTINGS_REDESIGN.md 已合併至 SETTINGS_COMPLETE.md

### 7. fix-bug/ - Bug 修復報告

所有 Bug 修復都記錄在此目錄，使用日期命名：`YYYY-MM-DD-問題描述.md`

- [README.md](./fix-bug/README.md) - Bug Fix 報告撰寫規範
- [Bug 修復報告列表](./fix-bug/) - 依日期排序的修復記錄

### 8. roundtable-discussions/ - 圓桌會議討論記錄

跨角色（PM / Marketing / CTO / Ops / User）討論與決策記錄，依 `topic-NNN-YYYY-MM-DD-主題` 資料夾編號：

- [README.md](./roundtable-discussions/README.md) - 討論索引（含 domain 標記）
- [ROUNDTABLE_RULES.md](./roundtable-discussions/ROUNDTABLE_RULES.md) - 運作規則
- 每個 `topic-*/decision.md` 已標記 `domain`（product/engineering/quality/delivery）

### 9. tech-team/ - 技術團隊討論記錄

技術選型決策（TDR）、UX 評估、流程回顧（RETRO）、多輪品質評估，依 `T-NNN` 編號：

- [TEAM.md](./tech-team/TEAM.md) - 討論記錄索引（含 domain 標記）
- 每個 `T-*.md` 已標記 `domain`（engineering/quality/product/delivery/operations/conventions）

### 10. conventions/ - 開發規範

依 docs-governance 規範整併的治理文件：

| 文件 | 說明 |
|------|------|
| [GUIDELINE-2026-06-13-git-branching.md](./conventions/GUIDELINE-2026-06-13-git-branching.md) | Git Flow 與分支管理規範 |
| [GUIDELINE-2026-06-13-commit-conventions.md](./conventions/GUIDELINE-2026-06-13-commit-conventions.md) | Commit 規範與 Git Hooks |
| [GUIDELINE-2026-06-13-code-style.md](./conventions/GUIDELINE-2026-06-13-code-style.md) | 程式碼風格與型別規範 |

### 11. adr/ - 架構決策記錄（ADR）

- [README.md](./adr/README.md) - ADR 索引
- [ADR-0001-codemirror6-editor-migration.md](./adr/ADR-0001-codemirror6-editor-migration.md)

---

## 🔍 依場景查找文件

### 場景 1: 我想了解這個專案是什麼

1. 閱讀 [PRODUCT_SPEC.md](./analysis/PRODUCT_SPEC.md)
2. 閱讀 [AI_BLOG_WRITING_TOOL_ANALYSIS.md](./analysis/AI_BLOG_WRITING_TOOL_ANALYSIS.md)

### 場景 2: 我要開始開發新功能

1. 理解架構：[ARCHITECTURE_COMPLETE.md](./architecture/ARCHITECTURE_COMPLETE.md)
2. 了解整合方式：[INTEGRATION_GUIDE.md](./guides/INTEGRATION_GUIDE.md)
3. 學習 Commit 規範：[COMMIT_GUIDE.md](./guides/COMMIT_GUIDE.md)

### 場景 3: 我遇到了 Bug

1. 查看 [POTENTIAL_ISSUES.md](./analysis/POTENTIAL_ISSUES.md) 是否已知
2. 查看 [fix-bug/](./fix-bug/) 是否有相似問題的修復記錄
3. 參考 [fix-bug/README.md](./fix-bug/README.md) 撰寫 Bug Fix 報告

### 場景 4: 我要進行架構重構

1. 閱讀 [ARCHITECTURE_COMPLETE.md](./architecture/ARCHITECTURE_COMPLETE.md)  的「現狀問題分析」和「重構路線圖」
2. 參考 [REFACTORING_PLAN.md](./planning/REFACTORING_PLAN.md)
3. 檢視 [SOLID_ANALYSIS.md](./architecture/SOLID_ANALYSIS.md)

### 場景 5: 我要設計或修改 UI

1. 了解產品定位：[PRODUCT_SPEC.md](./analysis/PRODUCT_SPEC.md)
2. 參考設定面板設計：[SETTINGS_COMPLETE.md](./settings/SETTINGS_COMPLETE.md)
3. 查看 UI 對比分析：[UI_COMPARISON.md](./settings/UI_COMPARISON.md)

### 場景 6: 我想找「所有戰略/工程/品質面文件」（跨目錄）

1. 查看 [INDEX-by-domain.md](./INDEX-by-domain.md)，依 `domain`（product/engineering/quality/delivery/conventions/operations）分組瀏覽
2. `roundtable-discussions/`、`tech-team/`、`planning/`、`analysis/`、`guides/` 為混合目錄，實際性質以各文件 frontmatter 的 `domain` 為準，目錄位置不變

---

## 📝 文件維護

### 文件版本

- **v1.0** (2026-01-26): 初始文件結構
- **v2.0** (2026-02-02): 重新整理，合併重複文件，新增多角色評估
- **v3.0** (2026-06-13): 依 docs-governance 為 ~80 份文件補上 `domain`/`status`/`source_of_truth`
  等 frontmatter（詳見 [T-018](./tech-team/T-018-docs-reorganization-plan.md)），新增
  [INDEX-by-domain.md](./INDEX-by-domain.md) 跨目錄索引；移除已不存在的 `multi-role-analysis/` 章節，
  補上 `roundtable-discussions/`、`tech-team/`、`conventions/`、`adr/` 章節

### 已標記 `source_of_truth` 的重複文件

以下文件群組同主題存在多份檔案，已透過 frontmatter `source_of_truth` / `status: deprecated` /
`supersedes` / `superseded_by` 標示哪份為現行版本（舊版仍保留原位，不搬移）：

| 主題 | 現行版本（SoT） | 已取代版本 |
|--------|--------|------|
| 系統架構 | [ARCHITECTURE_COMPLETE.md](./architecture/ARCHITECTURE_COMPLETE.md) | ARCHITECTURE.md、ARCHITECTURE_ANALYSIS.md |
| 設定面板 | [SETTINGS_COMPLETE.md](./settings/SETTINGS_COMPLETE.md) | SETTINGS_COMPARISON.md、SETTINGS_REDESIGN.md |

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
