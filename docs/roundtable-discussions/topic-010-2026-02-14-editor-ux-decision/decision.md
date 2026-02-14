# 圓桌 #010 決策記錄：Editor UX 改善

> **日期**: 2026-02-14
> **決策者**: Alex（PM）、Taylor（CTO）、Jordan（User）、Sam（Ops）、Lisa（Marketing）
> **狀態**: ✅ 決策修訂完成（Spike 確認路徑 A：直接遷移 CodeMirror 6）

---

## 核心決策

### D-01：採用「分兩步走」策略

**決策**：UX-02 分兩個階段執行：

- **第一步（v0.2 前半，本週）**：強化現有 `<textarea>`，實作 Jordan 最痛的三個功能
- **第二步（v0.2 後半）**：遷移至 CodeMirror 6，實現語法高亮、多游標等完整功能

**理由**：
- 第一步 1.5 天完成，立即改善 Jordan 使用體驗
- CodeMirror 6 整合需要 3~4 週，提前交付價值比等待更重要
- 兩步走不互斥，第一步的功能在 CodeMirror 6 中也會保留

**票數**：全票通過（5/5）

---

### D-02：第一步功能範圍確認

**三個功能**（均在 `EditorPane.vue` 的 `handleKeydown` 中實作）：

| 功能 | 行為 | 驗收標準 |
|------|------|----------|
| **符號自動補全** | 輸入 `**`、`*`、`_`、`` ` ``、`(`、`[` 時自動補全配對字元，游標置於中間 | Jordan 打 `**` 後游標自動在中間 |
| **選取後符號包裹** | 選取文字後輸入 `*`、`**`、`_`、`` ` `` 直接包裹選取內容 | Jordan 選取文字按 `*` 後變成 `*selected*` |
| **Tab / Shift+Tab 縮排** | Tab 縮進一級（插入 2 或 4 空格），Shift+Tab 反縮排 | 在 markdown 清單中 Tab 可縮排，Shift+Tab 可退縮 |

---

### D-03：CodeMirror 6 遷移策略確認

**時程**：v0.2 後半啟動

**遷移架構**（Taylor 提案）：
- Adapter 模式：CodeMirror 6 封裝成 Vue 組件，對外 API 與現有 `EditorPane.vue` 完全相同
- Feature flag：遷移期間兩個實作並存，確認穩定後移除舊版本
- `MainEditor.vue` 上層幾乎不需修改

**風險控制**：出問題可立即切回 textarea 版本

---

### D-04：排除方案確認

| 方案 | 排除原因 |
|------|---------|
| **Monaco Editor** | Bundle size 2MB+ 不可接受 |
| **Milkdown** | WYSIWYG 模式與 Jordan 的 source mode 習慣不符，社群較小 |

---

## Action Items

| # | 項目 | 負責人 | 完成條件 | 優先級 | 狀態 |
|---|------|--------|----------|--------|------|
| **AI-01** | 實作符號自動補全（`**`、`*`、`_`、`` ` ``、`(`、`[`） | Taylor | Jordan 驗收通過 | P0 | 🔴 待執行 |
| **AI-02** | 實作選取後符號包裹功能 | Taylor | Jordan 驗收通過 | P0 | 🔴 待執行 |
| **AI-03** | 實作 Tab / Shift+Tab 縮排功能 | Taylor | Jordan 驗收通過 | P0 | 🔴 待執行 |
| **AI-04** | 合併 feature/fix-preview-ux 到 develop | Alex | Merge 完成 | P0 | ✅ 完成 |
| **AI-05** | 規劃 CodeMirror 6 遷移方案文件（Adapter + feature flag） | Taylor | 文件完成 | P1 | 🟡 v0.2 後半啟動前 |

---

## 決策修訂（2026-02-14 後）

### 質疑：兩步走的重複成本

討論中，決策者提出合理質疑：

> 「強化後再改底層框架為 CodeMirror 6，這樣異動的成本會不會太大？」

**技術分析確認**：第一步（textarea 強化）的所有 keydown 邏輯，在遷移 CodeMirror 6 時會 100% 丟棄重寫。1.5 天的開發成本屬於一次性消耗品代碼。

**修訂決定**：在正式開始 AI-01~03 之前，先做 **1 天的 CodeMirror 6 整合 Spike**，以實測資料決定路徑。

### Spike 決策框架

| 路徑 | 觸發條件 | 結果 |
|------|---------|------|
| **A：直接遷移 CM6** | Vue wrapper < 150 行、v-model 正常、ObsidianSyntaxService 可移植、預估 ≤ 3 週 | 取消 textarea 強化，直接開始 CM6 Sprint |
| **B：先強化 textarea** | 任一：整合阻塞、reactive 問題、移植複雜度 > 2 週、預估 > 4 週 | 先做 1.5 天 textarea 強化，CM6 排 v0.3 |
| **C：部分遷移（混合）** | CM6 可行但 ObsidianSyntaxService 移植難度過高 | 另開圓桌討論 |

### Spike 參考文件

`docs/tech-team/2026-02-14-codemirror6-spike-plan.md`

### Spike 完成：確認路徑 A

**選擇路徑 A：直接遷移 CodeMirror 6，取消 textarea 強化**

| Spike 驗證項目 | 結果 |
|--------------|------|
| Vue wrapper 行數（126 行） | ✅ < 150 行 |
| v-model 雙向綁定 | ✅ 正常，無 reactive 循環 |
| ObsidianSyntaxService 移植 | ✅ Autocomplete 可直接包裝，wikilink 高亮為可選 |
| `closeBrackets` + `indentWithTab` | ✅ 現成 Extension，開箱即用 |
| Bundle size 增量 | ✅ ~270 KB gzip（遠低於 Monaco 2MB+）|
| 預估總工時 | ✅ 7~9 天（≤ 2 週）|

詳細數據見：`docs/tech-team/2026-02-14-codemirror6-spike-plan.md`

## 後續追蹤（修訂後）

- **取消** AI-01~03（textarea 強化，避免產生廢棄代碼）
- **直接開始** CodeMirror 6 遷移 Sprint（目標 1.5~2 週）
- AI-05 提前執行（已由 Spike 取代，視需要補充 Adapter 設計文件）
- 遷移完成後 Jordan 驗收，UX-02 標記完成
