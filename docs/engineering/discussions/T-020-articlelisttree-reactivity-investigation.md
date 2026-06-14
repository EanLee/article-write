---
title: "ArticleListTree Reactivity 根因調查（topic-021）"
domain: engineering
type: spec
status: approved
owner: tech-team
updated: 2026-06-14
source_of_truth: true
---

# 技術會議 T-020 — ArticleListTree 在完整 E2E 套件中無法顯示新偵測文章（topic-021 根因調查）

> **日期**: 2026-06-14
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）、Alex（UI/UX）
> **背景**: topic-020 E2E 驗收時發現，`tests/e2e/writing-baseline.spec.ts` 第 6 個測試（切換文章自動儲存）在完整 7 項 serial 套件中執行時，新偵測到的第二篇文章「切換目標文章」始終不會出現在 `ArticleListTree`（`otherRow.waitFor` 於 15354ms 逾時），但單獨執行該測試可通過。詳見 [topic-021 PENDING](./topic-021-2026-06-13-articlelisttree-reactivity/PENDING.md)。

---

## 任務清單

| # | 任務 | 負責 | 狀態 |
|---|------|------|------|
| 1 | 彙整 codebase 既有事實，更新/修正 PENDING.md 假設 | Sam | ✅ 完成 |
| 2 | 各角色提出根因假設並交互討論收斂 | Sam/Lin/Wei/Alex | ✅ 完成 |
| 3 | 決定修復策略並排定後續行動項目 | Sam | ✅ 完成 |

---

## 已確認的技術事實（會議前彙整，修正 PENDING.md 部分假設）

### 1. E2E 測試環境結構（修正 PENDING 的「多個 window.reload()」假設）

- `tests/e2e/helpers/electron-fixture.ts`：`electronApp`／`testVaultPath` 為 **worker scope**，整個 spec 共用同一個 Electron App 實例與同一個 `window`（Page）；`window` fixture 每個 test 重新 `getAppWindow()`，但因為 App 只開一個主視窗，取得的是**同一個 Page 物件**（同一個 renderer JS context，Pinia store 不會重建）
- **全 spec 只有一次 `window.reload()`**，發生在 `beforeEach` 中由 `configInitialized` 旗標保護，只在第一個測試執行時觸發；後續 6 個測試共用同一個已 reload 過的頁面
- 每個 worker 使用全新的 `userDataPath`（`fs.mkdtempSync`），因此 `localStorage` 在 spec 開始時為空
- **結論**：PENDING.md 待決策項目 1 中「Pinia store 在多個 `window.reload()`/測試間的 effect scope 被提前釋放」**不成立**——全程只有一個 store 實例、一次 reload，effect scope 不會被釋放重建

### 2. 資料流與渲染鏈（完整版，補上 PENDING 未列出的中間層）

```
articleStore.articles (ref, push 後 1→2，已透過 debug log 確認事實)
  └─ useArticleFilter(articles).filteredArticles  [Pinia store 層 computed]
       依 filter.value.{status,category,tags} + debouncedSearchText（300ms debounce）過濾
       └─ ArticleListTree.vue 內部「第二層」 filteredArticles  [元件層 computed]
            依元件本地 searchText（與 store 的 filter.searchText 是「兩個不同的狀態」）再過濾一次
            └─ seriesGroups  [元件層 computed]
                 依 article.frontmatter.series 分組，無 series → "_standalone"（顯示為「📄 獨立文章」）
                 └─ template v-show="!collapsedGroups.has(group.name)" 內 ArticleTreeItem
```

### 3. ArticleListTree.vue 本地狀態（`src/components/ArticleListTree.vue:154-161`）

- `searchText = ref("")`：元件本地搜尋字串，**與 Pinia store 的 `filter.searchText` 是兩條獨立狀態**，互不同步
- `groupBySeries = ref(true)`：**預設為 true**，且會在 `onMounted` 時被 `loadSettings()`（讀 `localStorage["article-list-settings"]`）覆寫
- `collapsedGroups = ref(new Set<string>())`：初始為空集合；spec 開始時 localStorage 為空，所以 `loadSettings()` 不會填入任何值，且全程沒有測試呼叫 `toggleGroup`/`collapseAll`，故 `collapsedGroups` 應全程為空集合
- 兩篇文章（主文章「寫作基線主文章」、新文章「切換目標文章」）皆無 `frontmatter.series`，理論上都會落在同一個 `"_standalone"` 群組

### 4. fixtures 內容

- `writing-baseline-main.md`：`title: 寫作基線主文章`、`date: 2026-06-13`、`draft: true`，無 `series`
- `switch-target.md`：`title: 切換目標文章`、`pubDate: 2026-06-13`，無 `status`/`draft`/`series`

### 5. 測試 1-5 對主文章編輯器的操作（full-suite 下 test 6 執行前已發生）

1. Ctrl+B 包裹選取文字
2. Ctrl+B 插入 `**bold text**`
3. Ctrl+2 切換 `##` 標題（toggle）
4. Ctrl+Shift+F 插入 `[^1]` 腳註引用與文末定義（已修復與 focus mode 衝突，Fix #4）
5. Ctrl+S 手動儲存 + 磁碟內容/frontmatter 驗證

### 6. useArticleFilter.ts（`src/composables/useArticleFilter.ts`，已讀全文）

- `filteredArticles` 為純 `computed`，依賴 `articles.value` 與 `debouncedSearchText.value`
- `debouncedSearchText` 透過 `watch(() => filter.value.searchText, ...)` + `setTimeout(300ms)` 更新；**全程沒有測試呼叫 `updateFilter`**，故 `filter.value.searchText` 應維持初始值 `""`，`debouncedSearchText` 也維持 `""`
- `filter.value.status`/`category`/`tags` 全程維持 `DEFAULT_ARTICLE_FILTER`（`All`/`All`/`[]`），理論上不會過濾掉任何文章

---

## 討論記錄

### 第一輪：各角色獨立提出假設

**Sam**：「我看了一下整條鏈，我認為斷裂點不在 `seriesGroups`/`collapsedGroups` 的結構本身——這兩個 ref 全程沒被任何測試動過，結構性沒問題。比較值得懷疑的是 `ArticleListTree.vue` 本地的 `searchText`／`collapsedGroups`：如果 `onMounted` 的 `loadSettings()` 在 full-suite 下因為某種非同步時序，在文章 push 之後才把 `'_standalone'` 加入 `collapsedGroups`，`v-show=\"!collapsedGroups.has(group.name)\"` 就會把整個『📄 獨立文章』群組藏起來，新文章自然等不到 visible。」

**Lin**：「我把 `reloadArticleFromDisk` 和 `FileWatchService` 完整看過了。`articles.value.push(article)` 在 Pinia 的 `ref([])` 下是有攔截的，會正常觸發 `filteredArticles` 重算，push vs spread 不是根因。但我比較在意 `FileWatchService.handleFileChange` 的 `recentEvents`／`ignoreNextChange`——這個去抖 map 沒把 `event` type 納入 key，如果 serial 套件前面測試對同一路徑的 `ignoreNextChange` 殘留命中，第 6 個測試新增檔案的 change 事件可能在 `handleFileChange` 第一關就被吃掉，根本不會送到 `handleFileChangeEvent`。所以我想先確認：**第 6 個測試在 full-suite 失敗時，`articles.value.length` 真的有變成 2 嗎？**」

**Wei**：「我剛剛在元件裡翻了一下，方向跟 Sam 接近——懷疑 `collapsedGroups` 裡 `'_standalone'` 被意外加入。但我多想到一點：`treeContainerRef` 有 `tabindex=\"0\"` + `@keydown=\"handleKeydown\"`，測試 1-5 操作 CodeMirror 時的鍵盤事件會不會冒泡到這裡，誤觸發收合行為？我還沒看到 `handleKeydown` 完整實作，這是我想先確認的點。」

**Alex**：「先說一個跟根因無關但值得記錄的設計債：元件本地 `searchText` 跟 store 的 `filter.searchText` 是兩條獨立狀態，使用者在側邊欄搜尋、切到文章管理頁面卻發現沒套用搜尋，會覺得體驗斷裂——這次先不卡這個。但如果根因真的是『某個 computed 在 full-suite 下沒重新觸發』，對應到真實使用情境就是『FileWatch 偵測到新檔案，但側邊欄不會自動出現』，這跟我們對『自動偵測』的承諾矛盾，是信任感問題，不只是 UI 小瑕疵。修復時建議順手加：新項目加入時自動展開所在群組＋短暫高亮提示。」

### 第二輪：Sam（主持）裁決與收斂

**Sam**：「我針對 Lin 的疑問核對了一下 topic-021 PENDING.md 的記錄——『`articleStore.articles.value` 在 push 後長度由 1→2』這條事實，**是在 topic-020 E2E 驗收期間、針對這次 full-suite 失敗案例本身**加 debug log 確認的，不是單跑時的結果。所以 Lin 的 `FileWatchService` debounce/`recentEvents` 假設可以先排除——資料確實送到 store 了，問題在更下游。」

「再針對 Wei 的問題，我去重讀了 `ArticleListTree.vue` 的 `handleKeydown` 和 `loadSettings` 完整實作：

```ts
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

function loadSettings() {
  const saved = localStorage.getItem("article-list-settings")
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      groupBySeries.value = settings.groupBySeries ?? true
      ...
```

`handleKeydown` 只處理 Ctrl/Cmd+F 聚焦搜尋框，完全不會動 `collapsedGroups`——Wei 的『鍵盤事件冒泡誤觸發收合』假設不成立。`loadSettings()` 也是**完全同步**（`localStorage.getItem` + `JSON.parse`），不是非同步，而且這個 worker 的 `localStorage` 一開始就是空的（`userDataPath` 全新建立），`saved` 為 `null`，整個 `if (saved)` 區塊不會執行——`collapsedGroups` 在 `onMounted` 之後應該就是空集合，不會被『非同步寫入 _standalone』。我自己提的 `loadSettings` 時序假設，也不成立。」

「所以**第一輪四個假設都被排除了**：不是 FileWatch debounce、不是 effect scope 釋放（會前已排除）、不是 `loadSettings` 時序、不是 `handleKeydown` 誤觸發。剩下能確定的只有：問題出在『`articles.value` 1→2』到『`seriesGroups`/`filteredArticles` 渲染出新的 `ArticleTreeItem`』這條鏈的**某個 computed 層**，但具體哪一層在 full-suite 下沒有正確重算，光靠讀程式碼已經無法再縮小範圍——這完全符合 PENDING.md 原本的判斷：『需要逐層加 log / 隔離測試，屬技術深挖』。我建議不要再猜測，直接做分層 debug log。」

### 第三輪：收斂為具體行動

**Wei**：「我同意。那我來設計分層 log：在 `useArticleFilter.ts` 的 `filteredArticles` computed 開頭印 `articles.value.length`；在 `ArticleListTree.vue` 的元件層 `filteredArticles` computed 印 `articleStore.filteredArticles.length` 與自己回傳的 `.length`；在 `seriesGroups` computed 印 `filteredArticles.value.length` 與每個 group 的 `name`/`articles.length`。三層都印，跑 full-suite，因為 `electron-fixture.ts` 本來就會把 renderer console 寫到 `test-results/renderer-console.log`，不需要額外設定。比對單跑 vs full-suite 的這三層 log，斷裂點會在某一層『上游印出 2 但下游印出 1』的地方現形。」

**Sam**：「同意，這是低成本、高訊息量的下一步。Wei 你來做。完成條件：`test-results/renderer-console.log` 在 full-suite 執行第 6 個測試時，三層 log 都有輸出，且能明確指出哪一層的輸出長度沒有從 1 變成 2（或 group 數量不對）。找到斷裂層後，再開下一次技術會議或直接在同分支修復並解除 `test.fixme`。」

**Lin**：「沒問題，我這邊認領一個小任務：順手檢查 `FileWatchService.recentEvents` 的 key 是否該納入 `event` type——雖然這次不是根因，但『去抖 map 沒區分事件類型』本身是個潛在 bug，值得在同分支一起清掉，不需要另開分支。」

**Alex**：「我這邊先不佔用本次行動項目，等根因確定、進入修復階段時，我會補一版『新文章加入時自動展開群組 + 高亮提示』的互動規格，到時候再跟 Wei 對一下實作可行性。」

---

## 設計決策

1. **排除假設**：本次會議排除了 topic-021 PENDING.md 與會中提出的全部假設——「多個 `window.reload()` 導致 effect scope 釋放」「FileWatch debounce/`recentEvents` 污染」「`loadSettings()` 非同步時序競態」「`handleKeydown` 鍵盤事件誤觸發 `collapsedGroups`」。已確認 `articles.value` 在 full-suite 失敗案例中確實 1→2，問題範圍收斂到 `useArticleFilter.filteredArticles` → `ArticleListTree` 元件層 `filteredArticles` → `seriesGroups` 這條 computed 鏈中的某一層。
2. **修復策略**：本次不直接修復，先以**分層 debug log + `renderer-console.log` 比對**定位斷裂層，再決定修復方式（明確 bug 修復 vs 設計檢視）。
3. **附帶任務**：`FileWatchService.recentEvents` 的去抖 key 未納入 `event` type，視為獨立技術債，於同一分支（後續修復 topic-021 時）一併處理，不另開分支。
4. **UX 補強**（待根因修復後排入同分支或下個 Sprint）：新文章加入既有群組時，若該群組已收合應自動展開，並給予短暫高亮提示，呼應 FileWatch「自動偵測新檔案」的承諾。
5. **本地 `searchText` 與 store `filter.searchText` 不同步**：列為獨立設計債，本次不處理，未來如需處理應排技術會議另議（不在本次 topic-021 範圍）。

## 共識與分歧

- **共識**：四個第一輪假設經程式碼核對後均不成立；下一步是分層 debug log，由 Wei 負責，Sam 訂完成條件；test 6 維持 `test.fixme` 直到根因確認修復；`FileWatchService.recentEvents` key 缺陷與本次根因一併在同分支處理。
- **無分歧**：本次討論收斂順利，未進入正式表決。

## ✅ Action Items

| # | 行動項目 | 負責人 | 優先級 | 完成條件 | 狀態 |
|---|---------|-------|-------|---------|------|
| 1 | 在 `useArticleFilter.ts`/`ArticleListTree.vue` 三層 computed 加分層 debug log，跑 full-suite 並比對 `renderer-console.log` 找出斷裂層 | Wei | P1 | `test-results/renderer-console.log` 顯示三層輸出，且能明確指出哪一層在 full-suite 下未從 1→2（或 group 數量不對） | ⏳ 待開始 |
| 2 | 檢查並修復 `FileWatchService.recentEvents` 去抖 key 未納入 `event` type 的問題 | Lin | P2 | `recentEvents` key 包含 `event` type，相關 unit test 通過 | ⏳ 待開始 |
| 3 | 根據 #1 找到的斷裂層，提出並實作修復、解除 test 6 `test.fixme` | 技術團隊（待 #1 結果指派） | P0 | `writing-baseline.spec.ts` 測試 6 通過，`pnpm run test` 0 failures | ⏳ 待開始 |
| 4 | 新文章加入時自動展開群組＋高亮提示的互動規格 | Alex | P3 | 規格文件交付 Wei，於 #3 修復同分支或下個 Sprint 實作 | ⏳ 待開始 |

## 相關文件

- [topic-021 PENDING](./topic-021-2026-06-13-articlelisttree-reactivity/PENDING.md)
- [topic-020 決議](./topic-020-2026-06-13-save-race-data-overwrite/decision.md)
- `src/composables/useArticleFilter.ts`
- `src/components/ArticleListTree.vue`
- `src/services/FileWatchService.ts`
- `tests/e2e/writing-baseline.spec.ts`

