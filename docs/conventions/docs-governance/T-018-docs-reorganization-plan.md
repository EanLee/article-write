---
title: "文件治理：戰略面與工程技術面分類規劃"
domain: conventions
type: plan
status: approved
owner: tech-team
updated: 2026-06-13
source_of_truth: true
related_docs:
  - docs/conventions/docs-governance/T-017-doc-viewer-docs-governance-gap-analysis.md
  - docs/conventions/docs-governance/T-019-docs-governance-migration-report.md
---

# T-018 文件治理：戰略面與工程技術面分類規劃

**日期**: 2026-06-13
**負責人**: Sam（Tech Lead）
**狀態**: 📋 規劃中（本文件本身不搬移任何既有檔案）

## 任務背景

延續 [T-017](./T-017-doc-viewer-docs-governance-gap-analysis.md) 對 `docs-governance` 分類體系與本專案實際目錄落差的分析，本文件聚焦在使用者提出的具體問題：

> 目前的文件有些混亂，而且有些東西本身是屬於工程技術面的東西卻跟戰略面混在一起。

採用 T-017 提出的「漸進式、不強制搬移」策略：**先以 frontmatter `domain` 欄位標記每份文件的實際性質，待 `doc-types.config.mjs` 與 lint 工具到位後，再視需要決定是否物理搬移**。本文件先完成盤點與規劃，不建立設定檔、不修改既有檔案。

## 現況診斷摘要

`docs/` 目前是 14 個扁平的自訂分類（非 `docs-governance` 的 8-domain 模型）。其中三個目錄存在「同一序號體系混合多種性質」的問題，是戰略 ↔ 工程混雜最明顯的地方：

| 目錄 | 混雜情況 |
|---|---|
| `roundtable-discussions/`（topic-NNN） | 產品/市場戰略討論、工程技術決策、進度回顧、bug 驗收，全部混在同一編號序列 |
| `tech-team/`（T-NNN + 其他） | TDR 技術選型、UX 設計、流程回顧（RETRO）、品質評估報告（7 輪 review）、治理 meta（T-017）混合 |
| `planning/` + `analysis/` | 產品範疇規劃（MVP_SCOPE）、市場內容策略（AI_BLOG_WRITING_TOOL_ANALYSIS）與工程重構計畫（REFACTORING_PLAN）混合 |

## 分類盤點表（建議 `domain` 標記）

> 標記值對應 `docs-governance` 的 8-domain：`product`（戰略/需求）、`engineering`（技術實作）、`quality`（品質評估）、`delivery`（交付/進度）、`conventions`（治理規範）、`operations`（維運）。
> 此表為**建議值**，實際補 frontmatter 時由負責人依文件內容微調。

### `docs/roundtable-discussions/`

| Topic | 標題 | 建議 domain | 備註 |
|---|---|---|---|
| topic-000 (2026-02-02) | 初始系統評估 | quality | 多角色基準評估 |
| topic-001 (2026-02-03) | 產品上市策略 | **product** | 戰略 |
| topic-002 (2026-02-06) | 第二週進度回顧 | delivery | |
| topic-003 (2026-02-06) | 緊急進度回顧 | delivery | |
| topic-004 (2026-02-12) | reality-reset | **product** | 戰略方向重置 |
| topic-005 (2026-02-13) | 第三週進度回顧 | delivery | |
| topic-006 (2026-02-14) | 發布機制架構 | **engineering** | 純技術決策 |
| topic-007 (2026-02-14) | frontmatter 日期欄位設計 | **engineering** | 純技術 schema 決策 |
| topic-008 (2026-02-14) | sprint retro | delivery | |
| topic-009 (2026-02-14) | UX review | **product** | |
| topic-010 (2026-02-14) | 編輯器 UX 決策 | **product** | UX 決策（技術落地另有 T-NNN） |
| topic-011 (2026-02-14) | 品質衝刺規劃 | delivery | |
| topic-012 (2026-02-16) | 自動更新機制 | **engineering** | ⚠️ 與下列 topic-012 編號重複 |
| topic-012 (2026-02-28) | 進度回顧 | delivery | ⚠️ 與上列 topic-012 編號重複，需重新編號 |
| topic-013 (2026-02-16) | 下一階段方向 | **product** | 戰略方向 |
| topic-014 (2026-02-16) | AI API 整合架構 | **engineering** | 純技術 |
| topic-015 (2026-02-16) | AI 面板設計 | **engineering** | 含 prompt/架構設計 |
| topic-016 (2026-02-27) | 部落格內容分析 | **product** | 市場/內容戰略 |
| topic-017 (2026-02-27) | 功能方向整合 | **product** | 戰略 |
| topic-018 (2026-03-03) | 市場方向進度檢視 | **product** | 戰略 |
| topic-019 (2026-03-07) | autosave 切換行為（PENDING） | **engineering** | bug 調查 |
| topic-020 (2026-06-13) | save race 資料覆蓋 | **engineering** | bug 調查，已有對應 fix-bug 報告 |
| topic-021 (2026-06-13) | ArticleListTree reactivity（PENDING） | **engineering** | bug 調查 |

### `docs/tech-team/`

| 檔案/資料夾 | 建議 domain | 備註 |
|---|---|---|
| T-001 publish-refactor | engineering | |
| T-002 autosave-mechanism | engineering | TDR |
| T-003 github-actions-cicd | operations | |
| T-004 changelog-automation | engineering | |
| T-005 metadata-cache-design | engineering | TDR |
| T-006 category-type-refactor | engineering | |
| T-007 playwright-electron-e2e-setup | quality | |
| T-008 auto-update-electron-updater | engineering | |
| T-009 full-text-search-design | engineering | TDR |
| T-010 ai-service-architecture | engineering | |
| T-011 settings-panel-ux-review | **product** | UX |
| T-012 ai-panel-phase2-3-prompt-design | engineering | |
| T-013 sprint3-implementation-planning | delivery | |
| T-015 ai-service-design | engineering | |
| T-016 phase2-token-cost-evaluation | engineering | 含成本面但屬實作評估 |
| T-017 doc-viewer-docs-governance-gap-analysis | **conventions** | 治理 meta |
| T-018（本文件） | **conventions** | 治理 meta |
| RETRO-001 category-feature-branching | delivery | 流程回顧 |
| UX-001 form-design-system | **product** | |
| REVIEW_CHECKLIST | quality | |
| second/third/fourth/fifth/sixth/seventh-review/、20260228第一次全面分析/ | quality | 7 輪多角色品質評估報告 |

### `docs/planning/` + `docs/analysis/`

| 檔案 | 建議 domain | 備註 |
|---|---|---|
| MVP_SCOPE | **product** | |
| PRODUCT_SPEC | **product** | |
| AI_BLOG_WRITING_TOOL_ANALYSIS | **product** | 內容行銷市場分析，明顯屬戰略面 |
| CORRECT_PRIORITY_ROADMAP | **product** | 優先序戰略 |
| P0_SCOPE_ADJUSTMENT | **product** | |
| P0_GAP_ANALYSIS / PHASE_0_GAP_ANALYSIS | delivery | |
| PROGRESS_TRACKING | delivery | |
| REFACTORING_PLAN / REFACTOR_CHECKLIST | engineering | |
| 2026-02-07-day-6-plan | delivery | |
| ANALYSIS_REPORT / POTENTIAL_ISSUES | quality | |
| chinese-slug-evaluation | engineering | |

## 與現行分類方式的 Mapping

下表將「現行 `docs/` 子目錄」對應到 `docs-governance` 8-domain，標出關係型態與缺口。`N:1 mixed` 表示該目錄內混合多種 domain（即本文件聚焦的「戰略 ↔ 工程混雜」問題）。

| 現行目錄 | 對應 domain（主） | 關係型態 | 缺口 |
|---|---|---|---|
| `adr/` | engineering | 1:1（路徑非 `engineering/adr`） | 無 frontmatter |
| `analysis/` | product + quality | **N:1 mixed** | 無 domain 標記 |
| `architecture/` | engineering | 1:1（路徑非 `engineering/`） | 多份重疊文件未標記 `supersedes`/`deprecated`（見下方落差九） |
| `conventions/` | conventions | 1:1 ✅ | 已套用新 frontmatter，可作範本 |
| `dev-notes/` | engineering | 1:1 | 無 frontmatter |
| `fix-bug/` | quality（對應 FIX 型態） | 1:1，但目標路徑應為 `delivery/changes/` | 無 frontmatter，惟已採用日期命名 |
| `guides/` | operations + reference | **N:1 mixed** | E2E_TESTING_GUIDE（quality）與 INTEGRATION/COMMIT/ARTICLE_TREE（reference/operations）混放 |
| `planning/` + `analysis/` | product + delivery | **N:1 mixed** | 見前節分類表 |
| `plans/` | delivery | 1:1 | |
| `progress/` | delivery | 1:1 | |
| `roundtable-discussions/` | product + engineering + delivery + quality | **N:1 mixed（最嚴重）** | 見前節分類表；序號重複（topic-012） |
| `settings/` | product，但同主題 4 份重疊（COMPARISON/COMPLETE/QUICK_REFERENCE/REDESIGN） | 1:1，但有 SoT 問題 | 無 `source_of_truth`/`supersedes` 標記，無法判斷哪份是現行版本 |
| `setup/` | operations | 1:1 | |
| `superpowers/` | delivery（對應 `delivery/ai-scripts/`） | 1:1（路徑不同） | |
| `tech-team/` | engineering + quality + product + conventions | **N:1 mixed（最嚴重）** | 見前節分類表 |
| `testing/` | quality | 1:1 | |

## 缺口分析（延伸 T-017 六項落差，新增四項）

T-017 已提出六項落差（序號+索引模式、Topic 資料夾、累加式文件、扁平目錄、缺回顧型態、多角色對話定位）。本文件聚焦「戰略 ↔ 工程混雜」時，發現以下四項是**現有六項落差之外**、且與「文管／IA」直接相關的缺口：

### 落差七：跨目錄的「依 domain 檢視」能力缺失

`mixedDirs` 策略（在目錄內以 frontmatter 標記 domain）解決了「不強制搬移」的成本問題，但**沒有解決「我想看所有 product 戰略文件」這個查詢需求**——目前沒有任何機制可以跨 `roundtable-discussions/`、`tech-team/`、`planning/` 把同一 domain 的文件聚合呈現。

### 落差八：`source_of_truth` 機制完全缺失

`docs-governance` 規定「每個主題僅一份 `source_of_truth: true`」，但現行文件完全沒有此欄位。`docs/settings/` 下 4 份 SETTINGS_*.md、`docs/architecture/` 下 ARCHITECTURE.md / ARCHITECTURE_ANALYSIS.md / ARCHITECTURE_COMPLETE.md（後者雖在內文聲明「已合併」，但前兩份檔案仍原樣保留、無 `status: deprecated` 或 `supersedes` 標記）——**這與目前分支 `fix/save-single-source-of-truth` 在程式碼層級要解決的問題，在文件層級是同構的**：多份檔案宣稱同一件事的「現況」，但沒有機制標示哪份為準。

### 落差九：`status` 詞彙未正規化

現行文件混用多種狀態表示：`✅ 完成`、`PENDING`（檔名）、`draft`（僅新 GUIDELINE）、`> **狀態**: 整合文件`（自由文字）。`docs-governance` 定義 `draft → reviewing → approved → deprecated → archived` 五階段，但既有文件無法直接對應，需要一份「舊詞彙 → 新詞彙」對照表才能漸進補齊。

### 落差十：`archive` domain 從未啟用

`docs-governance` 8-domain 中的 `archive`（歷史文件）在本專案完全未使用——已被取代的文件（如 ARCHITECTURE.md/ARCHITECTURE_ANALYSIS.md、settings/ 內舊版本）仍與現行文件混放在同一目錄、同一層級，增加閱讀與搜尋時的雜訊。

## 文管（Records Management）專家建議

1. **建立 retention / archive 流程**：凡內文已自述「已合併」「已取代」者（ARCHITECTURE.md、ARCHITECTURE_ANALYSIS.md 等），優先補 `status: deprecated` + `supersedes: <新文件路徑>`，**不急著搬移實體位置**，但這是低成本、可立即執行的標記動作（不同於需要設定檔的 domain 標記）。
2. **`status` 詞彙對照表**：制定「`✅ 完成` → `approved`」「`PENDING` 檔名 → `status: pending`（呼應 T-017 落差五）」「自由文字狀態 → 五階段之一」的對照規則，供日後補 frontmatter 時查表，避免每次重新判斷。
3. **Ownership 補登**：`docs-governance` 的 `owner`/`reviewers` 欄位現行文件幾乎全缺。建議以 `docs/tech-team/TEAM.md` 既有的角色清單為來源，批量推斷 `owner`（例如 tech-team 系列預設 `owner: tech-team`，roundtable 系列依當期決策人）。

## IA（資訊架構）專家建議

1. **雙軸模型，而非單一目錄樹**：將「時間軸」（topic-NNN / T-NNN 序號 = 決策發生的歷史紀錄，**保持原位不動**）與「主題軸」（domain/feature = 目前生效的知識）分離。前者靠現有序號與日期天然排序；後者靠 frontmatter `domain` + 一份自動生成的「依 domain 索引頁」（例如 `docs/INDEX-by-domain.md`，可用 `ctx_batch_execute` 掃描 frontmatter 產生）達成，不需搬動檔案。
2. **`source_of_truth` 優先於目錄重組**：在補 domain 標記之前，先針對「同主題多份文件」（settings/、architecture/）標記 `source_of_truth: true/false` + `supersedes`，這是 IA 中「消除重複入口」的第一步，投資回報最高，且直接呼應使用者目前分支的目標。
3. **Tags/keywords 提升可搜尋性**：`context-mode` 的 FTS 索引依賴內文關鍵字，但 frontmatter 缺 `tags`。建議為高頻引用文件（GUIDELINE、ADR、TDR）補 2-5 個 `tags`，可大幅提升 `ctx_search` 命中率。
4. **序號 registry 即文件**：呼應 T-017 落差一，建議 `roundtable-discussions/README.md` 與 `tech-team/TEAM.md` 維護「序號 → 標題 → domain → status」表格，作為輕量 registry，先解決 topic-012 重複編號問題。

## 額外發現的問題（建議後續處理）

1. **`topic-012` 編號重複**：`topic-012-2026-02-16-auto-update`（工程）與 `topic-012-2026-02-28-progress-review`（進度回顧）共用同一編號。建議後者改為 `topic-022`（沿用既有最大編號 +1），並更新所有引用此編號的連結。
2. **`topic-019` 與 `topic-021` 仍為 `PENDING.md`**：建議在 `doc-types.config.mjs` 規劃時，將 T-017 提到的「`status: pending` 前置狀態」一併納入，避免這類檔案被誤判為遺漏。
3. **命名規則不一致**：除 `docs/conventions/dev-standards/GUIDELINE-2026-06-13-*.md` 外，絕大多數既有文件仍是 `SCREAMING_SNAKE_CASE.md`，不符合新訂的 `YYYY-MM-DD-kebab-description.md`。本規劃**不要求**既有檔案重新命名（成本過高），但建議新文件一律遵循新規則。
4. **`docs/README.md`（2026-02-02 版，v2.0）已過期**：未反映 `roundtable-discussions/`、`tech-team/`、`fix-bug/` 等後續新增的目錄，且未提及 `conventions/`。建議下一階段更新此索引，至少補上目錄總覽與「混合目錄」標註。

## 分階段執行計畫（後續工作，本文件不執行）

依「投資回報」與「風險」重新排序，`source_of_truth` 標記（落差八）提前至 Phase 2，因其成本最低（僅補 frontmatter，不需設定檔）且與目前分支目標直接相關：

- **Phase 1（規劃確認）**：本文件 — 盤點、mapping、缺口分析與 domain 標記建議，待負責人確認後再進入下一階段。
- **Phase 2（SoT 標記，低成本優先）**：為「同主題多份文件」補 `status: deprecated` + `supersedes`，例如：
  - `docs/architecture/ARCHITECTURE.md`、`ARCHITECTURE_ANALYSIS.md` → `supersedes` 指向 `ARCHITECTURE_COMPLETE.md`
  - `docs/settings/` 下 4 份 SETTINGS_*.md，需先確認哪份為現行版本後標記
- **Phase 3（設定檔）**：依 T-017 建議建立 `docs/.vitepress/doc-types.config.mjs`，宣告：
  - `mixedDirs: ['roundtable-discussions', 'tech-team', 'planning', 'analysis', 'guides']`
  - `extend` 映射：`RETRO`、`TDR`、`UX`、`PLAN` 等專案自訂 doc_type
  - `registries`：`roundtable-discussions/README.md`、`tech-team/TEAM.md` 等索引檔
  - `status` 詞彙對照表（落差九）
- **Phase 4（domain 標記）**：依本文件分類表，為「目前活躍/常被引用」的文件優先補上 `domain` frontmatter（例如 topic-020/021、T-017、conventions 三份 GUIDELINE），其餘文件於下次編輯時再補（漸進式，符合 `doc-migration` skill 流程）。同步處理 `topic-012` 重複編號。
- **Phase 5（索引更新）**：更新 `docs/README.md` 反映完整目錄結構與「混合目錄」標註；為 `roundtable-discussions/README.md` 與 `tech-team/TEAM.md` 補上「序號 → domain → status」registry 表格；視需要產生 `docs/INDEX-by-domain.md` 跨目錄索引。

## 相關文件

- [T-017 doc-viewer docs-governance 文件分類落差分析與改進建議](./T-017-doc-viewer-docs-governance-gap-analysis.md)
- [Git Flow 與分支管理規範](./GUIDELINE-2026-06-13-git-branching.md)
