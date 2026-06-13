---
title: "doc-viewer docs-governance 文件分類落差分析與改進建議"
domain: conventions
type: discussion
status: approved
owner: tech-team
updated: 2026-06-13
source_of_truth: true
---

# T-017 doc-viewer docs-governance 文件分類落差分析與改進建議

**日期**: 2026-06-13
**負責人**: Sam（Tech Lead）
**狀態**: ✅ 完成（待回報 doc-viewer 專案）

## 任務背景

本專案導入 doc-viewer 的 `docs-governance` skill 後，發現其定義的文件分類體系（`doc_type` 13 種、`docs/` 子目錄結構、frontmatter 必填欄位）與本專案既有 `docs/` 目錄（30+ 子目錄、200+ 份既有文件，從 2026-02 開發以來逐步演化而成）之間存在明顯落差。

這份文件以 **docs-governance 的分類體系為基準**，逐一比對本專案實際採用的文件慣例，找出 docs-governance 尚未涵蓋、但在「真實多人/多角色協作專案」中反覆出現的文件模式，整理成可回報給 doc-viewer 專案的改進建議。其他採用 doc-viewer 的專案大概率會遇到相同落差，因此本文件最後也提出一套**擴充機制**，讓任何專案都能在不修改 doc-viewer 核心 schema 的前提下，快速登記自己的文件慣例。

## docs-governance 分類總覽（基準）

| doc_type | 用途 | 放哪裡 |
|---|---|---|
| ULR | 通用語言登錄（術語定義） | `docs/domain/ulr/` |
| BCD | 領域邊界定義 | `docs/domain/bcd/` |
| BRS | 商業需求規格 | `docs/product/brs/` |
| SBE | 實例化需求／BDD | `docs/product/sbe/` |
| ADR | 架構決策記錄 | `docs/engineering/adr/` |
| TDR | 技術選型決策 | `docs/engineering/tdr/` |
| GUIDELINE | 開發規範 | `docs/conventions/` |
| IRR | 事件根因記錄 | `docs/quality/incidents/` |
| RUNBOOK | 維運操作手冊 | `docs/operations/` |
| AIDR | AI 開發討論記錄 | `docs/discussions/` |
| RPD | 角色決議文件 | `docs/discussions/` |
| BACKLOG | 待辦事項匯整索引 | `docs/delivery/` |
| CHANGE | 計畫性功能變更交付記錄 | `docs/delivery/changes/` |
| FIX | 缺陷驅動修正交付記錄 | `docs/delivery/changes/` |

模型假設：**每份文件是獨立單位**，透過 frontmatter（`doc_type` / `doc_id` / `status` / `version` / `superseded_by`）描述自己的型態與生命週期，狀態流程為 `draft → pending-review → verified`（或 `rejected`）。

## 設計決策：落差分析與改進建議

以下六項是本專案實際運作中反覆出現、但 docs-governance 模型未涵蓋的結構性模式。每項皆附本專案實例佐證。

### 落差一：序號 + 中央索引（Registry）模式

**現況範例**：
- `docs/adr/README.md` — ADR-NNNN 列表（編號、標題、狀態、日期）
- `docs/tech-team/TEAM.md` — T-XXX / UX-XXX / RETRO-XXX「討論記錄索引」表
- `docs/roundtable-discussions/README.md` — topic-NNN 列表

**docs-governance 現狀**：`doc_id` 採 `<doc_type>-<YYYY-MM-DD>-<slug>`，每份文件各自獨立，沒有「建立新文件時必須同步更新某個索引檔」的概念，也沒有「依序遞增編號」（T-001, T-002...）的命名慣例。

**落差**：團隊高度依賴這些索引檔作為「導覽入口」與「狀態總覽」，新增文件而不更新索引會造成索引腐化。docs-lint 目前不會檢查索引一致性。

**建議**：
- 新增可選 frontmatter 欄位 `registry: <路徑>`，指向該文件所屬的索引檔
- `docs:lint:schema` 增加一項檢查：若文件宣告 `registry`，但索引檔中找不到對應條目 → 警告（不阻擋）
- `generate-nav.mjs` 可選擇性地將「依序編號」（`T-001`, `T-002`...）的檔案群組在 nav 中排序顯示，而非僅按字母序

### 落差二：Topic 資料夾（多文件生命週期單位）

**現況範例**：`docs/roundtable-discussions/topic-NNN-YYYY-MM-DD-簡短描述/`，內含：
- `discussion.md`（討論過程，全程對話體，即時寫入）
- `decision.md`（決策結果，討論完成後產生）
- `PENDING.md`（可選，待決議事項，尚未排程討論時的暫存狀態）

**docs-governance 現狀**：`doc_type` 是「檔案層級」的分類，AIDR / RPD 都假設一份文件 = 一個 doc_type。沒有「一個資料夾代表一個議題的完整生命週期，內含多個不同階段的文件」這種**複合單位**的概念。

**落差**：`discussion.md` 與 `decision.md` 是同一議題的不同階段產物，彼此高度相關但分屬不同 doc_type（過程記錄 vs 決策結論），用單一 frontmatter 無法表達「這是同一 topic 的第 2 份文件」。`PENDING.md` 更是介於「尚未成案」與「draft」之間的狀態，不屬於現有 status 流程的任一階段。

**建議**：
- 新增 `doc_group` 概念：允許一個目錄透過 `_group.yaml`（或目錄層級 frontmatter）宣告 `doc_group_type: topic`，群組內文件各自標註 `role: discussion | decision | pending`
- 在 `status` 流程中新增 `pending`（早於 `draft`）：表示「議題已識別、尚未排程討論」，對應 `PENDING.md` 的語意
- nav 產生器將同一 `doc_group` 的文件在側邊欄中視覺上分組顯示

### 落差三：累加式（Append-in-place）文件

**現況範例**：`docs/fix-bug/YYYY-MM-DD-簡短描述.md`，後續若有「追加修復」，**不建新檔**，而是在原檔底部新增 `## 追加修復 (YYYY-MM-DD)` 區塊。

**docs-governance 現狀**：版本演進靠 `version` 欄位 + `supersedes` / `superseded_by`，假設「新版本＝新文件」，舊文件整份標記 `deprecated`。

**落差**：累加式文件**不是被取代**，而是同一份文件持續累積新章節，`version` 遞增但 `doc_id` 不變、`status` 也不一定變成 `deprecated`（可能持續是 `verified` 但內容還在長）。docs-governance 沒有「同一文件多次追加修訂」的更新慣例說明。

**建議**：
- 在 GUIDELINE 文件結構中新增「累加式文件」範式說明：何時用 `superseded_by`（整份取代）、何時用「章節追加 + `version` 遞增」（同份文件持續累積）
- frontmatter 增加可選 `last_appended_at` 欄位，供 lint 工具識別「近期有追加」的文件

### 落差四：目錄結構為扁平、專案自訂分類，非 `docs/engineering/adr/` 巢狀結構

**現況範例**：本專案的 ADR 放在 `docs/adr/`（非 `docs/engineering/adr/`），技術評估放在 `docs/tech-team/`（非 `docs/engineering/tdr/`），且 `docs/tech-team/` 內混合了 TDR（如 T-002 自動儲存機制評估）、一般工程設計文件（如 T-010 AI Service 架構）、UX 評估（UX-001）、回顧（RETRO-001）等多種性質。

**docs-governance 現狀**：`doc_type → 目錄` 是固定映射（寫死在 skill 文件中），且每種 doc_type 對應唯一目錄。

**落差**：既有專案的目錄結構是團隊長期演化的產物，遷移成本高（200+ 檔案），且「一個目錄混合多種 doc_type」是常態，不是例外。

**建議**：
- 提供 `docs/.vitepress/doc-types.config.mjs`（或 `.yaml`），允許專案覆寫/擴充 `doc_type → 目錄` 映射，而非寫死在 skill 文件
- `docs-governance` skill 改為「讀取此設定檔」而非內建固定表格；`doc-migration` skill 引導使用者建立此設定檔而非強制搬移檔案

### 落差五：缺少「回顧／評估報告」類型

**現況範例**：`docs/tech-team/RETRO-001-category-feature-branching.md`（流程回顧）、`docs/tech-team/T-016-phase2-token-cost-evaluation.md`（純評估報告，不含「選型決策」）、`docs/roundtable-discussions/topic-XXX-progress-review-*`（進度回顧）。

**docs-governance 現狀**：TDR 是「技術選型決策」，IRR 是「事件根因記錄」，兩者都隱含「需要做出決策/已發生事件」。但「定期回顧」「純評估（尚無決策）」「進度檢視」是團隊常見但**不涉及單一決策點**的文件類型。

**落差**：勉強套用 TDR 或 GUIDELINE 都不準確，會讓 doc_type 分類失去意義。

**建議**：新增兩個 doc_type：
- `RETRO`（流程/Sprint 回顧）→ `docs/quality/retros/`
- `EVAL`（純技術評估，無強制決策）→ `docs/engineering/evals/`，與 TDR 的差異在於 EVAL 可以「沒有結論」或「結論是繼續觀察」

### 落差六：多角色對話體記錄的型態定位

**現況範例**：`docs/roundtable-discussions/*/discussion.md`（PM/Marketing/User/Tech Lead/CTO 五角色對話）、`docs/tech-team/T-XXX.md` 內嵌的「討論記錄」章節（Tech Lead/Services/Frontend/UI-UX 對話）。

**docs-governance 現狀**：AIDR（AI 開發討論記錄）與 RPD（角色決議文件）都歸在 `docs/discussions/`，但兩者定義偏向「結論摘要」，未明確support「逐輪對話體 + 即時 commit」的寫作方式。

**落差**：team 規則要求「每輪結束立即寫入並 commit，不能事後補寫」，這是一種**寫作流程約束**，docs-governance 目前只規範「最終文件格式」，沒有規範「邊討論邊寫」的 frontmatter 或檢查機制（例如：如何驗證一份 AIDR 是否真的逐輪寫成，而非事後一次補完）。

**建議**：
- AIDR 文件結構範本中明確加入「逐輪時間戳記」欄位（例如每輪標註 `<!-- round: 3, committed: 2026-06-13T10:20 -->`），讓 lint 工具可選擇性檢查「是否每輪都有對應 commit」
- 此項優先度較低，列為長期觀察項目

## 實作說明：可擴展性機制建議（給其他採用 doc-viewer 的專案）

其他專案導入 doc-viewer 時，大概率也會遇到「既有文件結構 ≠ docs-governance 預設結構」的問題。建議 doc-viewer 提供以下擴充機制，讓專案能**漸進式**對齊，而不需要一次性大搬移：

### 1. 自訂 doc_type 設定檔（核心機制）

在消費專案根目錄提供 `docs/.vitepress/doc-types.config.mjs`：

```javascript
export default {
  // 擴充內建 doc_type，或新增專案自訂型態
  extend: {
    RETRO: { label: '流程回顧', dir: 'tech-team', required: ['doc_id', 'title', 'status'] },
    TDR:   { label: '技術選型決策', dir: 'tech-team' }, // 覆寫內建路徑（非 engineering/tdr）
    ADR:   { label: '架構決策記錄', dir: 'adr' },         // 覆寫內建路徑
  },
  // 標記允許「混合多種 doc_type」的目錄（落差四）
  mixedDirs: ['tech-team', 'roundtable-discussions'],
  // 註冊索引檔，供 lint 檢查一致性（落差一）
  registries: [
    { dir: 'adr', index: 'README.md' },
    { dir: 'tech-team', index: 'TEAM.md' },
    { dir: 'roundtable-discussions', index: 'README.md' },
  ],
}
```

- `docs-governance` skill 讀取此設定檔合併內建表格後，產出「本專案實際適用」的分類表
- `docs-lint.mjs` / `docs:lint:schema` 讀取 `extend` 與 `registries`，依專案規則驗證，而非套用寫死的內建規則
- 未提供設定檔的專案 = 完全沿用 doc-viewer 預設行為（向後相容）

### 2. 漸進式 migration，而非強制搬移

`doc-migration` skill 現有流程偏向「補齊 frontmatter、最終符合內建分類」。建議新增一條路徑：

1. 跑一次「現況掃描」，列出 `docs/` 下所有子目錄與檔案數量
2. 對每個子目錄，AI 協助判斷「最接近的 doc_type」與「是否為 mixedDir」
3. 產出 `doc-types.config.mjs` 草稿（而不是直接移動檔案）
4. 使用者確認設定檔後，才開始漸進補 frontmatter——**檔案位置可以完全不變**

### 3. Topic / Group 資料夾支援（落差二的延伸）

提供一個輕量標記檔 `_group.yaml`（放在資料夾內，可選）：

```yaml
doc_group_type: topic
members:
  - { file: discussion.md, role: discussion }
  - { file: decision.md, role: decision }
  - { file: PENDING.md, role: pending, optional: true }
```

nav 產生器偵測到 `_group.yaml` 時，將該資料夾在側邊欄中以「群組」樣式呈現（例如可摺疊、顯示 role 標籤），而非把三個檔案當成三份不相關文件平鋪。

### 4. `status` 增加 `pending` 前置狀態

`draft → pending-review → verified`（或 `rejected`）之前，增加 `pending`：表示「議題已被識別記錄，但尚未進入起草階段」。對應本專案 `PENDING.md` 的語意，也適用於其他專案的「backlog 項目尚未排入文件」情境。

## 相關檔案

本分析引用的既有文件結構（供 doc-viewer 團隊參考真實案例）：

- `docs/adr/README.md`、`docs/adr/ADR-0001-*.md`（落差一、四）
- `docs/tech-team/TEAM.md`、`docs/tech-team/T-*.md`、`RETRO-001-*.md`、`UX-001-*.md`（落差一、四、五）
- `docs/roundtable-discussions/README.md`、`topic-*/discussion.md`、`topic-*/decision.md`、`topic-019-*/PENDING.md`（落差二、六）
- `docs/fix-bug/*.md`（落差三）
- `.claude/skills/docs-governance/SKILL.md`（本專案 docs-governance 現行定義）
- `.claude/skills/bugfix-workflow/SKILL.md`、`.claude/skills/tech-team-docs/SKILL.md`、`.claude/skills/roundtable-meeting/SKILL.md`（本專案既有慣例的 skill 化版本，與本文件建議的擴充機制應相互對齊）

## 相關 Commit

- （本文件建立 commit，見 `docs(tech-team): 新增 T-017 doc-viewer docs-governance 落差分析與改進建議`）
