---
title: "T-020 執行期間的文件分類與 doc-viewer 優化回饋"
domain: conventions
type: feedback
status: draft
owner: Ean
updated: 2026-06-13
source_of_truth: true
---

# T-020 執行期間的文件分類與 doc-viewer 優化回饋

**提出者**: Ean  
**提出日期**: 2026-06-13  
**相關任務**: T-020（文件治理 Phase 6 實體搬移）

---

## 主要回饋點

### 1. 文件層級限制不存在
當前 `docs/` 結構允許**多層目錄**，不限制為單層。
- 建議：doc-viewer 導覽生成邏輯已支持深層目錄，未來可利用此特性進行更細緻的分類
- 影響：在規劃子資料夾結構時無需過度扁平化

### 2. `docs/conventions/TEAM.md` 分類有待調整
**當前問題**：TEAM.md 混合三個不同職責
- 第一部分：團隊成員資訊（人物卡）→ 更適合 `operations/` 或 `reference/`
- 第二部分：會議討論方式規則 → 適合 `conventions/`（流程規範）
- 第三部分：T-NNN 討論記錄索引 → 可拆分為 `docs/INDEX-by-topic.md` 或各 domain 下的 `discussions/INDEX.md`

**建議分組方向**：
| 內容 | 應放位置 | 理由 |
|------|--------|------|
| 團隊成員表、職責分工 | `operations/TEAM.md` | 團隊組成與運作屬於 operations domain |
| 會議規則、討論方式 | `conventions/ROUNDTABLE_RULES.md` | 流程規範屬於 conventions（已有） |
| T-NNN 索引表 | 跨 domain 統計（可保留在 `conventions/TEAM.md` 或移至主 README） | 狀態追蹤需保持單一真相來源 |

### 3. 後續 doc-viewer 優化方向
- IA 與文管專家需要給出回饋與分類建議
- 應收集類似「TEAM.md 混用」的案例，作為文件分類指南的改進依據
- 考慮建立 `docs/feedback/` 資料夾作為記錄優化意見的位置（此檔案示例）

---

## IA 專家視角：TEAM.md 分類問題的根本分析

### 核心原則：分類依據「文件回答什麼問題」，而非「文件因何而生」

TEAM.md 之所以難以歸類，是因為它是一份**複合文件（compound document）**，內部其實夾雜了
三種完全不同的「讀者意圖」與「查閱頻率」：

| 區塊 | 讀者想問的問題 | 變動頻率 | IA 性質 |
|------|--------------|---------|---------|
| 團隊成員表、工作原則 | 「這個團隊有誰、各自負責什麼、合作原則是什麼？」 | 低（人員異動才變） | **固定可查詢資訊** |
| 會議討論方式 | 「會議怎麼進行？」 | 極低，且已有 SoT | **規範（已重複）** |
| T-NNN 討論記錄索引 | 「某個議題的討論記錄在哪？」 | 高（每次圓桌都新增一列） | **導覽型索引** |

複合文件最大的問題是：**三種讀者意圖混在一起，會讓「查閱頻率高」的內容（索引表）每次更新時，
都讓「幾乎不變」的內容（團隊名單）一起被 diff/review，反之亦然**——這正是文件治理上常見的
「維護耦合」問題。

### 逐項建議

> **【修正】(1) 原建議「移至 `docs/reference/TEAM.md`」已被使用者澄清推翻，保留討論過程供後續參考：**
>
> 最初分析將「團隊成員表」視為被動的「組織名錄」（reference = 固定可查詢資訊），
> 但使用者指出：**這份成員表記錄的是「對產品走向有決策權、且來自公司各專業領域的跨職能參與者」**，
> 不是單純的部門名冊。
>
> 重新評估後：「誰有資格參與決策、各自代表什麼專業視角」與「決策怎麼進行」
> （ROUNDTABLE_RULES.md）是**同一份治理規範的兩個面向**——回答的都是
> 「產品方向如何被決定」這個流程性問題，性質上屬於 **conventions**（流程規範），
> 不是 reference（被動查詢資訊）。
>
> **修正後結論**：`conventions/TEAM.md` 這個路徑本身**沒有錯**；應調整的是內容邊界——
> 與 ROUNDTABLE_RULES.md 整併（或互相清楚交叉引用）為「產品決策治理規範」的兩個區塊
> （參與者 + 討論方式），而非搬到 reference。

**(1) 團隊成員表 + 工作原則 → 留在 `conventions/`，與 ROUNDTABLE_RULES.md 整併或建立清楚的雙向引用**

成員表描述「誰參與產品方向決策、代表什麼專業視角」，工作原則描述「決策的基本準則」，
兩者與 ROUNDTABLE_RULES.md 的「討論怎麼進行」共同構成完整的治理規範，應視為一組文件、
放在同一 domain（conventions），避免讀者需要在 reference 與 conventions 之間跳轉才能理解
「誰、如何、依據什麼」決定產品方向。

**(2) 會議討論方式 → 整段移除，僅保留指向 ROUNDTABLE_RULES.md 的單行連結**

目前 TEAM.md 內已經有「詳細規則見 ROUNDTABLE_RULES.md」，但前面還複述了一段規則摘要——
這是 **DRY（Don't Repeat Yourself）在文件治理上的違反**：同一份規則有兩個地方維護，
未來只改一邊會造成不一致。建議整段刪除，只留連結。

**(3) T-NNN 討論記錄索引 → 不應留在 `conventions/TEAM.md`，但「索引表本身」是合理的 IA 模式**

這張表本身帶有 Domain 欄位，性質上跟 `INDEX-by-domain.md` 是**同一份資料的兩種檢視角度**
（一個按時間/編號排序、一個按 domain 分組）——這在 IA 上是常見且合理的「雙索引」模式
（類似書籍同時有「目錄」與「索引」）。

問題不在於「該不該有這張表」，而在於**它現在被放在一份名為「TEAM.md」、domain 為
conventions 的文件裡**：
- conventions domain 的讀者預期看到「規則」，不是「進度/狀態追蹤表」
- 這張表的維護頻率（每次圓桌新增一列）跟 conventions 文件的維護頻率（規則變動才改）完全不同調

**建議**：將此表抽出，與 `INDEX-by-domain.md` 整併或並列存放，例如：
- 移至 `docs/conventions/INDEX-by-domain.md` 作為「依編號排序」的第二個表格區塊，或
- 獨立為 `docs/conventions/INDEX-by-topic.md`（與 INDEX-by-domain.md 同層、互為補充視圖）

### 總結建議（IA 視角的最終分類，已依使用者澄清修正）

| 內容 | 建議位置 | domain |
|------|---------|--------|
| 團隊成員表（決策參與者）、工作原則 | `docs/conventions/TEAM.md`（留在原位，與 ROUNDTABLE_RULES.md 整併/交叉引用） | conventions |
| 會議討論方式 | 刪除，僅保留連結至 `conventions/ROUNDTABLE_RULES.md` | — |
| T-NNN 索引表 | 併入或並列於 `docs/conventions/INDEX-by-domain.md` | conventions |

此分類不只解決「TEAM.md 放哪裡」的單一問題，也建立了一個**可重複使用的判斷準則**：
遇到複合文件時，先問「這個區塊的讀者意圖與變動頻率，跟其他區塊一樣嗎？」不一樣就該拆；
但同時要注意——**「誰參與決策」與「如何決策」往往是同一份治理規範的兩面，
不要被表面的「名單 vs 規則」形式差異誤導而拆到不同 domain。**

---

## 立即行動項

- [ ] 確認是否在 T-020 範圍內處理 TEAM.md 重組（拆分為 reference/TEAM.md + 併入 INDEX-by-domain.md），或列為 T-021 後續優化項
- [ ] 更新 docs-governance skill 中的分類指南，補充「複合文件拆分」判斷準則：依讀者意圖與變動頻率拆分區塊
- [ ] 盤點是否還有其他類似的複合文件（混合靜態參考資訊 + 規範 + 動態索引）

---

## 相關文件
- `docs/conventions/TEAM.md` — 待調整的混用檔案
- `docs/conventions/ROUNDTABLE_RULES.md` — 會議規則（已正確分類）
- `docs/conventions/INDEX-by-domain.md` — 跨 domain 索引（參考結構）
