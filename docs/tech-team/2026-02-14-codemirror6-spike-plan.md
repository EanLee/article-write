# CodeMirror 6 整合 Spike 計畫

> **作者**: Taylor Wu（CTO）
> **日期**: 2026-02-14
> **觸發**: 圓桌 #010 討論後，決策者質疑「兩步走」的重複成本
> **目的**: 用 1 天時間探針，決定是否直接遷移 CodeMirror 6，或先強化 textarea
> **分支**: `spike/codemirror6-integration`

---

## 為什麼需要 Spike

圓桌 #010 的「分兩步走」策略存在一個邏輯問題：

- 第一步（強化 textarea）的所有 keydown 邏輯，在遷移 CodeMirror 6 時會**完全丟棄**並重寫
- 1.5 天的開發成本換來 Jordan 提早 3~4 週體驗，但屬於「一次性消耗品」代碼

這讓決策者提出合理質疑：**如果能更準確估算 CM6 整合難度，也許直接遷移更划算。**

Spike 的目標是：**用 1 天取得足夠的實測資料，做出有根據的決定。**

---

## Spike 目標（1 天）

### 必須驗證的問題

| # | 問題 | 驗證方式 |
|---|------|---------|
| S-01 | CodeMirror 6 能整合進 Vue 3 嗎？Vue wrapper 需要多少行？ | 實作基本 `CodeMirrorEditor.vue` |
| S-02 | `@codemirror/lang-markdown` 能開箱即用嗎？語法高亮正常嗎？ | 在 wrapper 中載入並測試 |
| S-03 | `v-model` 雙向綁定能否正常運作？（content 進出）| 實作並測試 |
| S-04 | ObsidianSyntaxService 的 inline rule 能否移植為 CM6 Extension？ | 嘗試移植一個最複雜的 rule（wikilink）|
| S-05 | 整合後 bundle size 增加多少？ | `pnpm run build:renderer` 後比較 |

### 可選驗證（時間允許）

| # | 問題 |
|---|------|
| S-06 | 括號自動補全（`closeBrackets`）是否有現成 Extension？ |
| S-07 | Tab 縮排是否有現成 Extension？ |

---

## 決策框架

Spike 結束後，根據實測結果選擇路徑：

### 路徑 A：直接遷移 CM6（跳過 textarea 強化）

**觸發條件**（全部滿足）：
- [ ] Vue wrapper 基礎實作 < 150 行
- [ ] `v-model` 綁定正常，無明顯 reactive 問題
- [ ] 至少一個 ObsidianSyntaxService rule 可以順利移植
- [ ] 估算總工時 ≤ 3 週（含 ObsidianSyntaxService 全部移植）

**結果**：取消 textarea 強化，直接開始 CM6 遷移 Sprint

---

### 路徑 B：先強化 textarea，CM6 排後期

**觸發條件**（任一滿足）：
- [ ] Vue wrapper 整合遇到阻塞性問題（Vue 3 + CM6 相容性）
- [ ] `v-model` 或 reactive 有奇怪行為，需要 workaround
- [ ] ObsidianSyntaxService 移植複雜度遠超預期（> 2 週光移植）
- [ ] 估算總工時 > 4 週

**結果**：先做 1.5 天 textarea 強化讓 Jordan 有東西用，CM6 排 v0.3

---

### 路徑 C：部分遷移（混合方案）

**觸發條件**：
- CM6 基礎整合可行，但 ObsidianSyntaxService 移植難度高
- 可以先上 CM6 的語法高亮和內建 Extension，ObsidianSyntaxService 另外用 overlay 方式

**結果**：需另開圓桌討論，評估 ObsidianSyntaxService 的遷移策略

---

## Spike 執行計畫

### 上午（4 小時）：S-01 ~ S-03

1. 安裝 CodeMirror 6 核心套件
2. 建立 `CodeMirrorEditor.vue`（最小可用 wrapper）
3. 整合 `@codemirror/lang-markdown`
4. 實作 `v-model:content` 雙向綁定
5. 在 `MainEditor.vue` 中以 feature flag 切換 `EditorPane` 和 `CodeMirrorEditor`
6. 確認基本 typing、滾動、游標行為正常

### 下午（4 小時）：S-04 ~ S-05

1. 閱讀 ObsidianSyntaxService 最複雜的 wikilink inline rule
2. 嘗試以 CM6 ViewPlugin 或 MarkdownExtension 實作等價行為
3. 記錄卡住的地方和估算
4. `pnpm run build:renderer` 量測 bundle size 增量
5. 整理 Spike 報告，得出決策建議

---

## 預期產出

1. **`CodeMirrorEditor.vue`**（原型，不上 production）
2. **ObsidianSyntaxService wikilink Extension 原型**（或失敗記錄）
3. **本文件的「Spike 結果」章節**（Spike 結束後補充）
4. **明確的路徑選擇**（A / B / C）

---

## Spike 結果

### 實測數據

| 指標 | 結果 | 評估 |
|------|------|------|
| **S-01: Vue wrapper 行數** | 126 行（含樣式）| ✅ 低於 150 行門檻 |
| **S-02: Markdown 語法高亮** | `@codemirror/lang-markdown` 開箱即用 | ✅ 無需自訂 |
| **S-03: v-model 雙向綁定** | `EditorView.updateListener` + `view.dispatch` 正常運作，無 reactive 循環問題 | ✅ |
| **S-04: ObsidianSyntaxService 移植** | 見下方詳細分析 | ⚠️ 部分重寫 |
| **S-05: Bundle size 增量** | CM6 核心套件磁碟大小：~2.3 MB（源碼）；Vite tree-shaking 後 gzip 預估增加 **~200~270 KB** | ✅ 可接受（遠低於 Monaco 2MB+）|
| **S-06: 括號自動補全** | `closeBrackets()` Extension 開箱可用 | ✅ 現成 |
| **S-07: Tab 縮排** | `indentWithTab` keymap 開箱可用 | ✅ 現成 |

#### CM6 套件磁碟大小明細

| 套件 | 大小 |
|------|------|
| `@codemirror/view` | 1,144 KB |
| `@codemirror/state` | 400 KB |
| `@codemirror/language` | 292 KB |
| `@codemirror/autocomplete` | 256 KB |
| `@codemirror/commands` | 248 KB |
| `@codemirror/lang-markdown` | 104 KB |
| `@lezer/markdown` | 496 KB |
| `@lezer/common` | 228 KB |
| `@lezer/lr` | 184 KB |
| `@lezer/highlight` | 104 KB |
| **合計** | **~3.5 MB（源碼，Vite tree-shaking 後大幅縮小）** |

---

### S-04 詳細分析：ObsidianSyntaxService 移植

ObsidianSyntaxService 有三類邏輯，移植難度不同：

#### ✅ 容易移植：Autocomplete（`getAutocompleteSuggestions`）

現有邏輯：用 regex 偵測 `[[`、`![[`、`#` 前綴，返回建議陣列。

CM6 移植方式：包裝成 `CompletionSource`，regex 邏輯幾乎原封不動搬過去，只改 API 介面：

```ts
// 現在（textarea）
const suggestions = obsidianSyntax.getAutocompleteSuggestions({ text, cursorPosition })

// CM6（約 30 行包裝代碼）
const obsidianCompletionSource: CompletionSource = (ctx) => {
  const suggestions = obsidianSyntax.getAutocompleteSuggestions({
    text: ctx.state.doc.toString(),
    cursorPosition: ctx.pos,
    lineNumber: ctx.state.doc.lineAt(ctx.pos).number,
    columnNumber: ctx.pos - ctx.state.doc.lineAt(ctx.pos).from,
  })
  return suggestions.length ? { from: ctx.pos, options: suggestions.map(toCompletion) } : null
}
```

**移植工時估算**：4~6 小時

#### ⚠️ 中等難度：語法驗證 inline 標記（wikilink 顯示）

現有邏輯：在 `MarkdownService` 中以 `markdown-it` plugin 注入 HTML class（如 `.obsidian-wikilink`），在 Preview 顯示。

**重要發現**：ObsidianSyntaxService 本身並不直接負責 Preview 的 HTML 渲染——那是 `MarkdownService` 的工作（用 `markdown-it`）。ObsidianSyntaxService 只負責編輯器的自動完成建議。

因此：
- **Preview 的 wikilink 高亮**：`MarkdownService` + `markdown-it` 不需要動，繼續用
- **編輯器內的 wikilink 語法高亮**（即「在打字時看到 `[[...]]` 變色」）：這需要 CM6 `ViewPlugin` 實作，但屬於**可選增強功能**，不是基礎遷移的必要條件

**移植工時估算（可選）**：1~2 天

#### ✅ 不需要移植：DOM 操作方法

- `calculateDropdownPosition`：CM6 的 autocomplete UI 自己處理位置，不需要
- `applySuggestionToText`：CM6 `Transaction` 取代，不需要

---

### 決策結果

**選擇路徑：A — 直接遷移 CodeMirror 6**

#### 觸發條件檢核

| 條件 | 結果 |
|------|------|
| Vue wrapper < 150 行 | ✅ 126 行 |
| v-model 綁定正常，無 reactive 問題 | ✅ |
| ObsidianSyntaxService 可移植 | ✅（Autocomplete 部分直接移植，wikilink 高亮為可選）|
| 預估總工時 ≤ 3 週 | ✅ 見下方 |

#### 工時重新估算

| 工作項目 | 估算 |
|---------|------|
| CM6 Vue wrapper 完善（EditorPane 替換）| 2~3 天 |
| ObsidianSyntaxService → CompletionSource 移植 | 1 天 |
| `closeBrackets` + `indentWithTab` 整合（現成 Extension）| 0.5 天 |
| 選取後符號包裹（需自訂 Extension）| 0.5 天 |
| 語法高亮樣式調整（配合 DaisyUI/Tailwind）| 1 天 |
| 測試、驗收、Bug 修復 | 2~3 天 |
| **合計** | **約 7~9 天（1.5~2 週）** |

**比兩步走省下約 1.5 天，且不產生廢棄代碼。**

#### 理由

1. **Vue wrapper 整合比預期簡單**：126 行即可完成，沒有阻塞性問題
2. **ObsidianSyntaxService 核心邏輯可複用**：regex 邏輯不需要重寫，只需包裝 API
3. **現成 Extension 覆蓋大部分需求**：`closeBrackets`、`indentWithTab` 開箱即用，無需自行實作
4. **Bundle size 可接受**：~270 KB gzip，遠低於 Monaco 的 2MB+
5. **省略 textarea 強化的重複成本**：1.5 天的廢棄代碼不需要寫

---

**文件狀態**: ✅ Spike 完成，路徑 A 確認
**決策日期**: 2026-02-14
