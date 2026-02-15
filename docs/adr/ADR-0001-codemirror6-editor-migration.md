# ADR-0001：以 CodeMirror 6 取代原生 textarea 編輯器

| 欄位 | 內容 |
|------|------|
| **狀態** | ✅ Accepted |
| **日期** | 2026-02-14 |
| **決策者** | Taylor Wu（CTO）、Alex Chen（PM）、Jordan Lee（User）、Sam Liu（Ops） |
| **相關文件** | [技術選型評估](../tech-team/2026-02-14-editor-ux-tech-eval.md)、[Spike 報告](../tech-team/2026-02-14-codemirror6-spike-plan.md)、[圓桌 #010](../roundtable-discussions/topic-010-2026-02-14-editor-ux-decision/decision.md) |

---

## 背景

WriteFlow 編輯器目前使用原生 `<textarea>` 實作，搭配手工 Vue computed 行號、ObsidianSyntaxService 自動完成、MarkdownService 語法驗證。

使用者 Jordan 在驗收測試中回報以下痛點（與 Obsidian 的體驗落差）：

| 缺失功能 | 影響 |
|---------|------|
| 括號 / 符號自動補全（`**` → `**\|**`）| 每次需手動移游標，打斷寫作思路 |
| 選取文字後符號包裹 | 需手動前後各輸入，效率低 |
| Tab / Shift+Tab 縮排 | 清單縮排只能靠空格，不直覺 |
| Markdown 行內語法高亮 | 純黑白文字，難以辨識結構 |
| 多游標編輯 | 完全不可行（textarea 架構限制）|

### 曾考慮的中間方案

在討論過程中，曾提出「先強化 textarea（1.5 天）再遷移 CM6（3~4 週）」的兩步走策略。

但進一步分析後確認：**兩步走會產生 1.5 天的廢棄代碼**——textarea 強化的所有 keydown 邏輯在 CM6 遷移時會 100% 丟棄重寫，屬於一次性消耗品代碼，無長期價值。

為此進行了 1 天的 **CodeMirror 6 整合 Spike**，以實測資料取代假設評估。

---

## 候選方案評估

### 方案一：強化原生 textarea（排除）

- 優點：零依賴、零遷移成本
- 缺點：無法實現語法高亮和多游標；未來仍需遷移；1.5 天工時為廢棄代碼
- **結論**：短期緩解，長期無解，排除

### 方案二：Monaco Editor（排除）

- 優點：VS Code 同款，API 直觀
- 缺點：Bundle size 2MB+，不可接受；以程式碼編輯器為主，非 Markdown 優先
- **結論**：排除

### 方案三：Milkdown（不優先）

- 優點：官方 Vue 支援、Bundle size 150KB
- 缺點：WYSIWYG 模式，與 Jordan 的 source mode 習慣不符；ObsidianWikilink 需大量自訂；社群小
- **結論**：未來若要做 WYSIWYG 模式可再評估

### 方案四：CodeMirror 6（採用）✅

- Obsidian 底層也是 CodeMirror 6，語法相容性最高
- `@codemirror/lang-markdown` 官方支援，開箱即用
- `closeBrackets`、`indentWithTab` 等常用 Extension 現成可用
- Spike 驗證 Vue wrapper 僅需 126 行，整合可行
- Bundle size 增量約 270KB gzip，可接受
- ObsidianSyntaxService 的 Autocomplete 邏輯可直接包裝（~30 行）

---

## 決策

**以 CodeMirror 6 完整取代現有 `<textarea>` 編輯器。**

### 遷移策略

採用 **Adapter 模式**：

```
MainEditor.vue
  ├─ EditorPane.vue（現有，將被取代）
  └─ CodeMirrorEditor.vue（新，對外 API 與 EditorPane.vue 相容）
```

`CodeMirrorEditor.vue` 對外暴露與 `EditorPane.vue` 相同的 props / emits：

| 介面 | 說明 |
|------|------|
| `v-model`（`modelValue`）| 編輯器內容雙向綁定 |
| `showPreview` prop | 是否顯示預覽（影響寬度）|
| `@keydown` emit | 鍵盤事件（供 MainEditor 處理快捷鍵）|
| `@scroll` emit | 滾動事件（同步滾動）|
| `@cursor-change` emit | 游標移動（更新自動完成位置）|

`MainEditor.vue` 上層幾乎不需修改，切換成本最低。

### 不遷移的部分

| 模組 | 處理方式 |
|------|---------|
| `MarkdownService`（Preview 渲染）| 保留，與 CM6 無關 |
| `ObsidianSyntaxService`（Autocomplete 資料）| 保留核心 regex 邏輯，包裝成 CM6 `CompletionSource` |
| `AutoSaveService` | 保留，不受影響 |
| `PreviewPane.vue` | 保留，不受影響 |

### 可選後續增強

以下功能在基礎遷移完成後再評估（非 MVP 必要）：

- Wikilink inline 語法高亮（CM6 `ViewPlugin`）
- 多游標支援（CM6 內建，啟用即可）
- 自訂主題（配合 DaisyUI 深色模式）

---

## 後果

### 正面影響

- Jordan 一次獲得：括號補全、選取包裹、Tab 縮排、Markdown 語法高亮
- 未來可直接啟用多游標、自訂 Extension，無需再次遷移
- 與 Obsidian 底層架構一致，語法相容性最高
- 省下兩步走方案的 1.5 天廢棄代碼

### 負面影響與風險

| 風險 | 緩解策略 |
|------|---------|
| CM6 Extension API 學習曲線 | Spike 已驗證基礎可行，ObsidianSyntaxService 包裝模式已確認 |
| 遷移期間功能暫時不可用 | 在分支上開發，develop 保持穩定；Jordan 在驗收通過前繼續用舊版 |
| 樣式調整工時 | 預留 1 天給 DaisyUI / Tailwind 整合調整 |
| 預估工時超出 | 設定 2 週上限，超出則重新評估分拆方式 |

### 工時估算

| 工作項目 | 估算 |
|---------|------|
| CM6 Vue wrapper 完善（EditorPane 功能對齊）| 2~3 天 |
| ObsidianSyntaxService → CompletionSource 移植 | 1 天 |
| 選取後符號包裹（自訂 Extension）| 0.5 天 |
| 語法高亮樣式整合 | 1 天 |
| 測試、驗收、Bug 修復 | 2~3 天 |
| **合計** | **7~9 天（1.5~2 週）** |

---

## 決策歷程

```
圓桌 #009（2026-02-14）
  └─ UX-02 問題確認，指派 Taylor 做技術選型評估

技術選型評估（2026-02-14）
  └─ Taylor 完成四方案評估，建議「分兩步走」

圓桌 #010（2026-02-14）
  └─ 討論中質疑兩步走的重複成本
  └─ 決定先做 Spike 再定案

CodeMirror 6 Spike（2026-02-14，1 天）
  └─ Vue wrapper 126 行，整合可行
  └─ ObsidianSyntaxService 可包裝
  └─ 預估 7~9 天，無阻塞性問題

ADR-0001 建立（2026-02-14）
  └─ 確認採用路徑 A：直接遷移 CodeMirror 6
  └─ 取消 textarea 強化（AI-01~03）
```
