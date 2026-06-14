---
title: "topic-020 儲存來源單一化 — E2E 驗收期間發現的修復"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-06-13
source_of_truth: false
---

# topic-020 儲存來源單一化 — E2E 驗收期間發現的修復

> 分支：`fix/save-single-source-of-truth`
> 對應規範：`tests/e2e/writing-baseline.spec.ts`（寫作基線 + topic-020 驗收）

本報告記錄在為 topic-020（儲存來源單一化）補齊 `writing-baseline.spec.ts` 全套 E2E 時，
額外發現並修復的 5 個獨立問題。每個問題均附完整呼叫鏈與驗證方式。

---

## Fix #1：全域 Ctrl+F 開啟搜尋面板，誤吃編輯器 Ctrl+Shift+F 快捷鍵

### 問題描述

- **現象**：在編輯器中按下 `Ctrl+Shift+F`（插入腳註）時，搜尋面板（SearchPanel）也會被開啟，造成 UI 狀態混亂。
- **重現步驟**：聚焦編輯器 → 按 `Ctrl+Shift+F` → 預期僅插入 `[^1]` 腳註，實際搜尋面板同時彈出。

### 原因分析（呼叫鏈）

```
使用者按下 Ctrl+Shift+F
  → window keydown 事件冒泡到 App.vue 的 handleGlobalKeydown
    → 舊判斷：(e.metaKey || e.ctrlKey) && e.key === "f"
      → 沒有排除 Shift，"F"（大寫）與 "f" 在判斷時被忽略大小寫差異
        → searchStore.open() 被誤觸發
```

根本原因：`App.vue` 的全域 `Ctrl+F` 開啟搜尋快捷鍵，判斷條件未排除 `Shift` 鍵與大小寫，與編輯器的 `Mod-Shift-f`（插入腳註）快捷鍵的按鍵組合產生重疊。

### 修正方式

[App.vue:123-126](../../../../src/App.vue#L123)：

```diff
- if ((e.metaKey || e.ctrlKey) && e.key === "f") {
+ if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "f") {
```

加入 `!e.shiftKey`，明確排除 `Ctrl+Shift+F` 組合，並以 `.toLowerCase()` 統一大小寫比對，避免依賴瀏覽器 `Shift` 是否影響 `e.key` 大小寫的隱性行為。

**為何有效**：`Ctrl+F`（搜尋）與 `Ctrl+Shift+F`（插入腳註）現在是兩個互斥的按鍵組合，互不觸發對方的 handler。

---

## Fix #2：Ctrl+S 手動儲存後，UI 持續顯示「未儲存」直到下次自動儲存輪詢

### 問題描述

- **現象**：使用 `Ctrl+S` 手動儲存成功並寫入磁碟後，`SaveStatusIndicator` 仍顯示「未儲存」，直到 `AutoSaveService` 的下一輪 30 秒輪詢才更新為「已儲存」。
- **重現步驟**：編輯內容 → `Ctrl+S` → 磁碟確認已寫入最新內容 → 但 UI 狀態文字 (`save-status-text`) 短時間內仍為舊狀態。

### 原因分析（呼叫鏈）

```
Ctrl+S
  → MainEditor 的 useEditorShortcuts → articleStore.saveArticle()
    → articleService.saveArticle() 成功寫入磁碟
    → （原本到此結束，未通知 AutoSaveService）
  → AutoSaveService 的 lastSavedContent / saveState 仍是舊值
    → SaveStatusIndicator 讀取 autoSaveService 的狀態 → 顯示「未儲存」
    → 直到下一輪 30 秒自動儲存輪詢時才被動同步
```

根本原因：系統存在兩條獨立的「儲存後狀態更新」路徑——`AutoSaveService.saveCurrentArticle()`（自動儲存自身會更新狀態）與 `articleStore.saveArticle()`（手動 `Ctrl+S` 路徑，未更新 `AutoSaveService` 狀態），兩者未同步。

另外，`SaveStatusIndicator.vue` 過去自行註冊了一個全域 `window` 的 `Ctrl+S` keydown 監聽器，與 `MainEditor` 的 `useEditorShortcuts` 中的 `Ctrl+S` 處理重複註冊，造成同一次按鍵觸發兩筆並行的 `handleSave()` / 儲存呼叫。

### 修正方式

1. [AutoSaveService.ts:223-233](../../../../src/services/AutoSaveService.ts#L223) 新增 `notifySaved(article)`：

```ts
/**
 * 通知已透過統一儲存路徑（articleStore.saveArticle）成功寫入磁碟（topic-020）
 * 同步 lastSavedContent/lastSavedFrontmatter 並將狀態設為已儲存
 */
notifySaved(article: Article): void {
  this.updateLastSavedContent(article);
  this.updateSaveState(SaveStatus.Saved);
}
```

2. [article.ts:250-253](../../../../src/stores/article.ts#L250) 在 `saveArticle()` 成功後呼叫：

```ts
autoSaveService.notifySaved(articleToSave);
```

3. [SaveStatusIndicator.vue:37,168-183](../../../../src/components/SaveStatusIndicator.vue#L37) 移除重複的全域 `Ctrl+S` keydown 監聽器（`handleKeyDown` / `onMounted` / `onUnmounted`），改由 `MainEditor` 的 `useEditorShortcuts` 統一處理 `Ctrl+S`。

**為何有效**：手動儲存後立即同步 `AutoSaveService` 的內部快取與狀態，UI 狀態與磁碟狀態一致；移除重複的全域監聽器後，同一次 `Ctrl+S` 不再觸發兩筆並行儲存。

---

## Fix #3：Frontmatter 欄位（pubDate/created/draft/自訂欄位）儲存後遺失 + 自身寫入被誤判為衝突

### 問題描述

- **現象 A**：文章 frontmatter 中的 `pubDate`、`created`、`draft`、以及使用者自訂欄位，在透過 `MarkdownService.generateFrontmatter()` 序列化寫回磁碟後消失。
- **現象 B**：per-file 儲存佇列（topic-020 既有修復）中，連續兩次寫入同一檔案時，第二次寫入可能因「磁碟內容已改變」被誤判為外部衝突，即使該內容正是自己第一次寫入的結果。

### 原因分析（呼叫鏈）

**現象 A**：

```
MarkdownService.generateFrontmatter(data)
  → 舊實作：cleanData 為白名單欄位（title/description/date/lastmod/status/tags/categories/slug/keywords/series/seriesOrder）
    → topic-007 將 date 移轉為 created/pubDate、新增 draft 欄位後，
      generateFrontmatter 的白名單未同步更新
        → pubDate/created/draft/自訂欄位在 cleanData 組裝時被直接丟棄
          → yaml.dump(cleanData) 輸出不含這些欄位 ← 根本原因
```

**現象 B**：

```
articleStore.saveArticle() (第二次)
  → articleService.saveArticle()
    → detectConflict() 比較磁碟 mtime/內容 與記憶體中 currentArticle 的快照
      → 第一次寫入後磁碟 mtime 已變動，但記憶體快照尚未更新
        → hasConflict = true（誤判，因為磁碟內容 === 自己剛寫入的內容）← 根本原因
```

### 修正方式

1. [MarkdownService.ts:277-310](../../../../src/services/MarkdownService.ts#L277) `parseFrontmatter()` 新增 `created`/`pubDate`/`draft`/`status` 的驗證與寫入（呼應圓桌 #007 決議的欄位命名）。

2. [MarkdownService.ts:321-340](../../../../src/services/MarkdownService.ts#L321) `generateFrontmatter()` 由白名單逐欄位列舉改為**遍歷所有已定義欄位**：

```ts
const cleanData: Record<string, unknown> = {};
for (const [key, value] of Object.entries(data)) {
  if (value === undefined || value === null) continue;
  if (typeof value === "string" && value === "") continue;
  if (Array.isArray(value) && value.length === 0) continue;
  cleanData[key] = value;
}
```

3. [ArticleService.ts:34-39,113-119,135](../../../../src/services/ArticleService.ts#L34) 新增 `lastWrittenContent: Map<string, string>`，記錄每個檔案自己最後寫入的內容；衝突偵測時若「磁碟內容 === 自己上次寫入的內容」，視為 own-write，不視為外部衝突：

```ts
const isOwnWrite =
  conflictResult.currentFileContent !== undefined &&
  conflictResult.currentFileContent === this.lastWrittenContent.get(article.filePath);
if (conflictResult.hasConflict && !isOwnWrite) {
  return { success: false, conflict: true, ... };
}
```

**為何有效**：
- 現象 A：`generateFrontmatter` 不再依賴固定白名單，任何已定義且非空的欄位（包含 topic-007 新欄位與使用者自訂欄位）都會被保留，實現 round-trip 不丟資料。
- 現象 B：衝突偵測改為「排除自己已知的寫入結果」後，per-file 佇列中連續寫入同一檔案不會被誤判為外部衝突，僅在磁碟內容**確實**與自己最後寫入不同（真外部修改）時才回報衝突。

### 替代方案考量

- 現象 A 也可改為「新增白名單項目」，但歷史已證明每次新增欄位都需同步修改此白名單（topic-007 即是因此踩雷），改為遍歷可一次性解決所有現有與未來欄位的保留問題。
- 現象 B 也可改為在寫入成功後立即更新記憶體中 `currentArticle` 的快照以同步 mtime，但 per-file 佇列場景下快照更新時機與下一筆寫入的時序仍可能競爭；記錄「自己最後寫入的內容」是更直接、無時序依賴的判斷依據。

### 測試

- [MarkdownService.test.ts](../../../../tests/services/MarkdownService.test.ts) 新增 `generateFrontmatter 欄位保留（topic-020 Action 3）` describe 區塊，涵蓋 pubDate/created/draft 保留、自訂欄位保留、undefined/null 不輸出。
- [ArticleService.test.ts](../../../../tests/services/ArticleService.test.ts) 新增 own-write 豁免、真外部修改仍判定衝突的測試案例。
- E2E：`writing-baseline.spec.ts` 第 5 個測試（「快捷鍵格式化後 Ctrl+S，內容實際寫入磁碟」）驗證儲存後磁碟內容包含 `2026-06-13`（pubDate）與 `draft` 欄位。

---

## Fix #4：Ctrl+Shift+F 插入腳註時，誤觸發全域專注模式（Focus Mode）切換

### 問題描述

- **現象**：在編輯器中按下 `Ctrl+Shift+F`（插入腳註）後，整個側邊欄（含分頁列與內容）消失，後續無法切換到「文章資訊」「大綱」分頁或選取其他文章。
- **重現步驟**：聚焦編輯器 → 按 `Ctrl+Shift+F` → `[^1]` 正確插入 → 但側邊欄整體被隱藏。

### 原因分析（呼叫鏈）

```
使用者按下 Ctrl+Shift+F
  → CodeMirror keymap（CodeMirrorEditor.vue 的 Mod-Shift-f → insertFootnoteSpec）
    → handler 回傳 true
      → InputState.runHandlers 對該 keydown event 呼叫 event.preventDefault()
        （node_modules/@codemirror/view/dist/index.js ~line 4475）
        → 事件仍從 cm-content 冒泡到 window
          → useFocusMode.ts 的全域 window keydown 監聽器（handleKeydown）
            → 舊判斷：e.ctrlKey && e.shiftKey && e.key === "F"
              → 也比對成功，toggleFocusMode() 被呼叫
                → focusMode.value = true（localStorage 持久化，singleton 跨元件共享）
                  → SideBarView.vue 的 v-if="!isCollapsed && !focusMode"
                    → 整個側邊欄（分頁列 + 內容）被 v-if 卸載 ← 根本原因
```

根本原因：`useFocusMode.ts` 的全域 `Ctrl+Shift+F` 快捷鍵與編輯器的 `Mod-Shift-f`（插入腳註）快捷鍵組合完全相同；CodeMirror 已 `preventDefault()` 處理該事件，但 `useFocusMode` 的監聽器未檢查 `event.defaultPrevented`，因此對同一次按鍵又執行了一次自己的切換邏輯。

### 修正方式

[useFocusMode.ts:28-33](../../../../src/composables/useFocusMode.ts#L28)：

```ts
function handleKeydown(e: KeyboardEvent) {
  // 編輯器內的 Ctrl+Shift+F（插入腳註）已透過 preventDefault 處理，
  // 此時不應再觸發專注模式切換（避免兩個 handler 搶同一組快捷鍵）
  if (e.defaultPrevented) {
    return
  }

  if (e.ctrlKey && e.shiftKey && e.key === "F") {
    e.preventDefault()
    toggleFocusMode()
  }
}
```

**為何有效**：`useFocusMode` 是 module-level singleton，所有呼叫 `useFocusMode()` 的元件（App.vue、MainEditor.vue、SideBarView.vue、EditorHeader.vue）共享同一個 `handleKeydown` 函式本體，此處的修正自動套用到所有註冊的監聽器，無需逐一修改各元件。

### 驗證

以隔離 debug 測試（已於驗證後刪除）確認：在編輯器中按下 `Ctrl+Shift+F` 插入 `[^1]` 後：
- `localStorage.getItem("editor-focus-mode")` 維持 `null`（未被切換）
- `.tab-btn "文章資訊"` 全程可見（側邊欄未被卸載）

---

## Fix #5：Ctrl+B 編輯器粗體誤觸發側邊欄收合

### 問題描述

- **現象**：在 full-suite 執行 `writing-baseline.spec.ts` 時，測試 7（大綱面板）找不到 `.tab-btn "大綱"`，因為整個側邊欄（含分頁列）被收合隱藏。單獨執行測試 7 則通過。

### 原因分析（呼叫鏈）

```
使用者按下 Ctrl+B（粗體格式化）
  → CodeMirror keymap（Mod-b → makeFormatCommand）
    → handler 回傳 true → InputState.runHandlers 對該 keydown event 呼叫 event.preventDefault()
      → 事件仍冒泡到 window
        → App.vue 的 handleGlobalKeydown
          → 舊判斷：e.ctrlKey && e.key === "b"（未檢查 e.defaultPrevented）
            → toggleSidebar() 被呼叫，sidebarCollapsed 狀態被切換 ← 根本原因
```

測試 1、2、5 各按一次 `Ctrl+B`（共 3 次，奇數次切換），導致 `sidebarCollapsed` 從初始 `false` 變為 `true`，使測試 7 執行時整個側邊欄（`.tab-btn` 分頁列 + 內容）被 `v-if` 卸載。

此問題與 Fix #4（`useFocusMode` 的 `Ctrl+Shift+F`）為**同一根因模式**：CodeMirror 的格式化快捷鍵已 `preventDefault()`，但 `App.vue` 的全域 `Ctrl+B` 側邊欄收合監聽器未檢查 `e.defaultPrevented`，對同一按鍵又執行自己的邏輯。

### 修正方式

[App.vue:121-134](../../../../src/App.vue#L121)：

```ts
function handleGlobalKeydown(e: KeyboardEvent) {
  // 編輯器內的 Ctrl+B（粗體）已透過 preventDefault 處理，
  // 此時不應再觸發側邊欄收合（避免兩個 handler 搶同一組快捷鍵）
  if (e.defaultPrevented) {
    return;
  }

  if (e.ctrlKey && e.key === "b") {
    e.preventDefault();
    toggleSidebar();
  }
  ...
}
```

**為何有效**：與 Fix #4 相同模式，跳過已被編輯器處理的按鍵事件，使全域側邊欄收合快捷鍵與編輯器的格式化快捷鍵互不干擾。

### 驗證

完整 7 項 serial 套件重新執行：測試 1、2、3、4、5、7 全部 `passed`，測試 6 維持 `test.fixme`（skipped）；整體 exit code 0。

---

## 整體測試結果

- 單元測試：`pnpm run test` 全數通過（45 個測試檔，626 passed | 3 skipped，0 failures）
- E2E（`writing-baseline.spec.ts`，serial mode，7 項）：
  - 測試 1-5、7：全部通過
  - 測試 6（切換文章自動儲存）：仍逾時失敗，**已確認與 Fix #4/#5 無關的獨立問題**，標記 `test.fixme` 並建立 [topic-021 PENDING](../../../engineering/discussions/topic-021-2026-06-13-articlelisttree-reactivity/PENDING.md) 待技術會議排查根因

## 相關 Commit

見本分支 `fix/save-single-source-of-truth` 後續 commit（依 Fix #1-5 與測試/文件分別提交，採 Conventional Commits + SRP）。
