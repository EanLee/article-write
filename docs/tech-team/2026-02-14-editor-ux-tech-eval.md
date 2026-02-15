# 技術評估：編輯器 UX 升級選型

> **作者**: Taylor Wu（CTO）
> **日期**: 2026-02-14
> **觸發**: 圓桌 #009 Action Item #3 — UX-02 技術選型評估
> **目的**: 評估取代現有 `<textarea>` 的方案，提交圓桌決策

---

## 現況分析

### 現有實作

`EditorPane.vue` 使用原生 `<textarea>`，手工實作了：
- 行號顯示（Vue computed + CSS 同步滾動）
- 自動補全下拉選單（ObsidianSyntaxService）
- 語法錯誤面板（MarkdownService.validateMarkdownSyntax）
- Tab/Enter 等基本 keydown 攔截

### 缺少的功能（Jordan 痛點）

| 功能 | 現況 | Obsidian 有 |
|------|------|------------|
| 括號/符號自動補全 | ❌ | ✅ |
| Tab 鍵縮排 / Shift+Tab 反縮排 | ❌ | ✅ |
| Markdown 語法即時視覺提示（粗體變粗）| ❌ | ✅ |
| 選取文字後 `**` 包裹 | ❌ | ✅ |
| 多游標編輯 | ❌ | ✅ |
| 行內語法高亮（`#heading` 變色）| ❌ | ✅ |
| Undo/Redo 精細控制 | 瀏覽器預設 | ✅ 細粒度 |

---

## 候選方案

### 方案 A：CodeMirror 6

**定位**：模組化低階編輯器框架，Obsidian 底層也是用它

| 項目 | 評估 |
|------|------|
| **Bundle size** | ~270KB（基礎）+ language packages |
| **Markdown 支援** | `@codemirror/lang-markdown` 官方 plugin |
| **Obsidian 相容性** | 高（Obsidian 本身就是 CodeMirror 6）|
| **Vue 整合** | 需手工封裝（無官方 Vue 版），約 100~200 行 wrapper |
| **學習曲線** | 高（Extension API 概念複雜）|
| **現有程式碼遷移成本** | 高（ObsidianSyntaxService、自動補全需重寫為 Extension）|
| **長期維護性** | 高（活躍維護、API 穩定）|
| **授權** | MIT |

**優點**：
- 功能最完整，可精細控制每一個行為
- 與 Obsidian 底層相同，語法相容性最高
- 社群龐大，現成的 Markdown Extension 豐富

**缺點**：
- 封裝成本高，預估 2~3 週才能穩定整合
- Extension API 學習曲線陡，容易寫出難以維護的擴充
- 現有 ObsidianSyntaxService 的自動補全邏輯需完整重寫

---

### 方案 B：Monaco Editor（VS Code 同款）

**定位**：VS Code 的編輯器核心

| 項目 | 評估 |
|------|------|
| **Bundle size** | ~2MB+（巨大）|
| **Markdown 支援** | 有，但以程式碼編輯器為主，非 Markdown 優先 |
| **Obsidian 相容性** | 中（需自訂 language token）|
| **Vue 整合** | `@guolao/vue-monaco-editor` 等社群套件 |
| **學習曲線** | 中（API 相對直觀）|
| **現有程式碼遷移成本** | 高 |
| **長期維護性** | 高（Microsoft 維護）|
| **授權** | MIT |

**優點**：
- 功能極豐富，VS Code 所有編輯功能皆可用
- API 相對直觀

**缺點**：
- **Bundle size 過大**，對桌面 App 啟動速度有影響
- 設計偏向程式碼編輯，Markdown 寫作體驗不如 CodeMirror 6
- 不適合 WriteFlow 的 Obsidian 風格 Markdown 編輯場景

**結論**：排除。Bundle size 問題無法接受。

---

### 方案 C：Milkdown

**定位**：Plugin-driven WYSIWYG Markdown 編輯器，基於 ProseMirror

| 項目 | 評估 |
|------|------|
| **Bundle size** | ~150KB（核心）|
| **Markdown 支援** | 第一優先，WYSIWYG 模式 |
| **Obsidian 相容性** | 中（需自訂 Wikilink plugin）|
| **Vue 整合** | 官方支援 `@milkdown/vue` |
| **學習曲線** | 中 |
| **現有程式碼遷移成本** | 高（WYSIWYG 模式與現有 raw Markdown 思維不同）|
| **長期維護性** | 中（社群較小，版本更新頻繁）|
| **授權** | MIT |

**優點**：
- 官方 Vue 支援
- WYSIWYG 體驗最接近 Notion/Craft

**缺點**：
- **WYSIWYG 模式與 Obsidian 的 source mode 思維不同**，Jordan 習慣看到 raw Markdown
- Obsidian 特殊語法（`![[...]]`、`[[...]]`）需大量自訂
- 社群相對小，遇到問題難找解答

**結論**：不優先，但若未來要做 WYSIWYG 模式可列為候選。

---

### 方案 D：強化現有 `<textarea>`（漸進式改良）

**定位**：在現有架構上手工添加缺少的功能

| 功能 | 工作量 |
|------|--------|
| 括號自動補全 | 0.5 天 |
| Tab 鍵縮排 / Shift+Tab | 0.5 天 |
| 選取文字後符號包裹 | 0.5 天 |
| Markdown 語法高亮（需疊加 overlay div）| 3~5 天（技術複雜）|
| 多游標 | ❌ 不可行（textarea 限制）|

**優點**：
- 零遷移成本，現有程式碼完整保留
- 前三項功能 1~2 天內可完成，立即改善 Jordan 最痛的問題
- 不引入新依賴

**缺點**：
- 語法高亮無法真正在 textarea 上實現（需雙層 DOM hack，效能差且不穩）
- 未來要做多游標或複雜功能時，仍需遷移到編輯器框架
- 是「還債」而非「解決問題」

---

## 評估總表

| | CodeMirror 6 | Monaco | Milkdown | 強化 textarea |
|---|---|---|---|---|
| **Obsidian 相容性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Vue 整合難度** | 需手工封裝 | 社群套件 | 官方支援 | 無需整合 |
| **Bundle size** | 270KB | 2MB+ | 150KB | 0 |
| **遷移成本** | 高（2~3週）| 高 | 高 | 低（1~2天）|
| **長期可維護性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **短期效益** | 低（投入大）| 低 | 低 | 高（快速見效）|

---

## Taylor 的建議

### 分兩步走

**第一步（v0.2 前半）：強化 textarea — 2 天**

先解決 Jordan 最具體的三個痛點，這些都可以在現有 `<textarea>` 架構上完成：

1. 括號 / 符號自動補全（`(` → `()`、`[` → `[]`、`**` → `**|**`）
2. Tab 鍵縮排 / Shift+Tab 反縮排
3. 選取文字後輸入 `**` / `_` / `` ` `` 直接包裹選取內容

這三個功能只需擴充現有的 `handleKeydown`，**不引入任何新依賴，不破壞現有架構**。

**第二步（v0.2 後半）：遷移至 CodeMirror 6 — 3~4 週**

當 v0.2 排期確認後，以 CodeMirror 6 為目標做完整遷移：
- 實現語法高亮（`@codemirror/lang-markdown`）
- 實現多游標
- 保留現有 ObsidianSyntaxService 邏輯（以 CodeMirror Extension 形式重寫）

### 不建議的路徑

- **Monaco**：Bundle size 問題不可接受
- **Milkdown**：WYSIWYG 思維與現有 source mode 不符，且社群較小

---

## 待圓桌決策

1. 是否同意「分兩步走」策略？
2. 第一步是否立即排入 v0.2 Sprint？
3. CodeMirror 6 遷移是 v0.2 後半還是 v0.3？

---

**文件狀態**: 🔄 提交圓桌討論
