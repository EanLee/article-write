# WriteFlow 寫作基線功能設計文件

**日期**: 2026-04-08  
**狀態**: ✅ 設計確認  
**範疇**: 提升 WriteFlow 作為主要文章撰寫工具的基線體驗

---

## 背景

WriteFlow 定位為 Obsidian → Astro 發布管線，但使用者希望能**直接在 WriteFlow 撰寫文章**，不需回到 Obsidian。目前的主要寫作摩擦點集中在三個面向：

- **B — 文章結構導覽**：缺乏大綱面板，長文難以跳轉
- **C — 交叉連結與引用**：Wiki link 插入體驗不足，footnote 無快速插入
- **D — 編輯器操作體驗**：缺乏標準 Markdown 快捷鍵

使用者文章類型：**混合型**（目前以技術教學為主，正在增加思維/成長型文章）。

---

## 不在本次範圍

- Callout block（`> [!TIP]`）
- Mermaid 圖表
- LaTeX 數學式
- 視覺化表格編輯
- Obsidian 圖片大小語法（`![[img|300]]`）

---

## 功能一：Markdown 快捷鍵

### 影響模組
- `src/components/CodeMirrorEditor.vue`

### 快捷鍵對照表

| 快捷鍵 | 格式 | 備註 |
|--------|------|------|
| Cmd+B | `**text**` | 粗體 |
| Cmd+I | `*text*` | 斜體 |
| Cmd+K | `[text](url)` | 連結 |
| Cmd+1 ~ Cmd+6 | `# ` ~ `###### ` | H1–H6 標題 |
| Cmd+Shift+C | ` ``` ``` ` | Code block |
| Cmd+Shift+X | `~~text~~` | Strikethrough |
| Tab | 清單縮排 | 游標在清單項目時生效 |
| Shift+Tab | 清單反縮排 | 游標在清單項目時生效 |
| Cmd+Shift+F | footnote 插入 | 見功能四 |

### 行為規則

1. **有選取文字**：包裹選取範圍（`**{selection}**`）
2. **無選取文字**：插入格式符號並選中佔位文字（e.g. `**bold text**`，`bold text` 被選中）
3. **Toggle**：再次按下同一快捷鍵，若游標在已格式化的文字內，移除格式符號
4. **標題快捷鍵（Cmd+1-6）**：替換行首的 `#` 符號，若已是同級別則移除（toggle）

---

## 功能二：側欄大綱面板

### 影響模組
- `src/components/SideBarView.vue` — 新增「大綱」分頁切換
- 新建 `src/components/OutlinePanel.vue`

> **設計決策（2026-06-13，IA 審視後修訂）**：大綱入口採用 SideBarView 內部分頁（與「文章列表」「文章資訊」並列），**不**新增 ActivityBar 圖示。理由：
> 1. ActivityBar 為模式切換層級（編輯/管理模式），大綱屬於「當前文章的衍生內容」，與文章資訊同級，放分頁符合語意層級
> 2. 原規格「位置：ArticleList 與 AI 面板之間」前提有誤——ActivityBar 上並無 ArticleList 圖示（文章列表本身就是側欄分頁）
> 3. VSCode 先例：Outline 為 Explorer 側欄內區塊，非 Activity Bar 圖示
> 4. 若日後回饋切換頻繁，優先以快捷鍵（如 Ctrl+Shift+O）解決，而非增加圖示

### 行為規格

- SideBarView 頂部新增「大綱」分頁（與文章列表、文章資訊並列；無開啟文章時停用）
- 點擊分頁切換 sidebar 顯示 `OutlinePanel`
- 大綱面板即時解析當前編輯文章的 H1–H4 標題
- 點擊大綱項目 → 編輯器滾動至對應行
- 標題層級以縮排表示（H2 縮進 12px，H3 縮進 24px，H4 縮進 36px）
- 當前游標所在標題區段高亮顯示

### OutlinePanel 資料流

```
CodeMirrorEditor（內容變更）
  → 解析 heading（正則 /^(#{1,4})\s+(.+)/gm）
  → emit('outline-change', headings)
  → OutlinePanel 接收並渲染清單
```

---

## 功能三：Wiki Link 增強

### 影響模組
- `src/components/CodeMirrorEditor.vue` — popup 鍵盤導覽
- `src/services/ObsidianSyntaxService.ts` — title 來源確認
- `src/services/ArticleService.ts` — 確保 title 來自 frontmatter

### UI 規格（選項 A：精簡清單 + 狀態標籤）

- 觸發：輸入 `[[` 後出現下拉清單
- 清單項目顯示：`{frontmatter.title}` + 狀態徽章（Draft/Published）
- 鍵盤操作：↑↓ 選擇，Enter 插入，Esc 關閉
- 插入文字格式：`[[{frontmatter.title}]]`（**必須使用 frontmatter `title`，非檔名或 slug**）

### 關鍵約束：title 來源

`ObsidianSyntaxService.getWikiLinkSuggestions()` 目前使用 `article.title`。  
必須確認 `ArticleService.loadArticle()` 的 `title` 欄位優先來自 frontmatter `title`，**不允許 fallback 至檔名**。

若 frontmatter 無 `title`，則該文章不出現在 wiki link 建議清單中（而非用檔名替代）。

### 現有已支援（不需更改）
- 圖片引用自動完成 `![[`
- 標籤自動完成 `#`

---

## 功能四：Footnote 快速插入

### 影響模組
- `src/components/CodeMirrorEditor.vue`

### 行為規格

- 快捷鍵：`Cmd+Shift+F`
- 偵測文章內已有的 footnote 數量（掃描 `[^N]` 模式），取最大 N + 1 作為新編號
- 操作流程：
  1. 在游標位置插入 `[^N]`
  2. 在文章末尾（最後一個非空行之後）新增空行 + `[^N]: `
  3. 游標移動至 `[^N]: ` 之後（等待使用者輸入定義）
- **Edge case**：若游標已在 `[^` 符號附近（前後 3 個字元），視為已有 footnote，不新增，游標跳至對應定義行

---

## 模組影響彙整

| 模組 | 異動類型 | 功能 |
|------|----------|------|
| `CodeMirrorEditor.vue` | 修改 | 快捷鍵、wiki popup 鍵盤導覽、footnote 插入 |
| `SideBarView.vue` | 修改 | 大綱分頁切換邏輯（含入口，見功能二設計決策） |
| `OutlinePanel.vue` | 新建 | 大綱面板元件 |
| `ObsidianSyntaxService.ts` | 確認/微調 | title 來源確保為 frontmatter |
| `ArticleService.ts` | 確認/微調 | loadArticle title 欄位來源 |

---

## 成功標準

- [x] 所有快捷鍵在有/無選取文字時行為正確，toggle 正常運作（unit 23 項 + E2E `writing-baseline.spec.ts`，2026-06-13）
- [x] 大綱面板即時更新，點擊標題能精確跳轉（E2E 驗證；初次載入為空的 bug 已修復，見 `docs/quality/assessments/fix-bug/2026-06-13-outline-empty-on-load.md`）
- [x] Wiki link 插入後文字為 frontmatter title（unit：`ObsidianSyntaxService.test.ts` 涵蓋 title 來源約束）
- [x] Footnote 快速插入編號正確遞增，游標跳轉至定義行（unit + E2E）
- [x] 所有現有測試通過（pnpm run test，616 passed，2026-06-13）

> ⚠️ 已知問題：快捷鍵格式化後儲存，磁碟內容可能為舊快照（自動/手動儲存競態）。
> 屬儲存機制設計問題，非本功能缺陷，待 topic-020 圓桌決議。
