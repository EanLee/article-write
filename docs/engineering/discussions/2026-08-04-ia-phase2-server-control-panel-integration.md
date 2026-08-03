---
title: "IA Phase 2 第一項：ServerControlPanel 掛載進編輯模式底部控制台"
domain: engineering
type: spec
status: draft
owner: tech-team
updated: 2026-08-04
source_of_truth: false
tags:
  - ia-phase2
  - server-control-panel
related_docs: []
---

# IA Phase 2 第一項：ServerControlPanel 掛載進編輯模式底部控制台

## 背景

透過 `agy`（Antigravity CLI + Gemini 3.1 Pro）對 WriteFlow 編輯/撰寫畫面做的獨立 UIUX/IA 稽核，產出三階段改善路線圖（稽核報告本身未落檔，僅存在於 2026-08-02 的對話紀錄中）。Phase 1（5 項小修復）已完成並合併（`feat/ia-phase1-quick-wins`）。

Phase 2 原定兩項「中度重構」：
1. 整合發布/開發伺服器控制面板到編輯模式（本文件範圍）
2. Frontmatter 編輯從遮罩 Modal 改成側邊欄內聯表單（另案處理，不在本文件範圍）

兩項在 2026-08-02 的 brainstorming 中被中斷（未做出分開/合併的決定），本文件是 2026-08-04 接續討論後的結果，範圍已確認為**只做第一項**，且該項本身也在討論中被進一步縮小（見下）。

## 現況調查

- `ServerControlPanel.vue`（339 行）在 `src/` 中完全沒有任何 import／掛載，是徹底孤立元件。
- 元件本身已是自足設計：控制列（狀態燈號、badge、伺服器 URL、清除日誌、展開/收合、啟動/停止）常駐顯示；日誌面板隨 `expanded` 收合；日誌高度已有 `resize-handle` 可拖曳調整（`logPanelHeight`）；未設定目標部落格時啟動按鈕會 disable，展開時顯示警告列。
- **既有 bug**：`startServer()`/`stopServer()`/`updateStatus()` 呼叫 `logger.error(...)` 共 3 處，但檔案從未 `import { logger } from "@/utils/logger"`，掛載後首次觸發錯誤路徑會直接 runtime crash。其他元件（`ArticleTreeItem.vue`、`ConversionPanel.vue` 等）皆採 `import { logger } from "@/utils/logger"` 這個寫法。
- 「一鍵同步本篇至 Blog」目前不存在：`PublishService` 只有 `syncAllPublished()`（全量同步，`ArticleManagement.vue` 管理模式在用），沒有單篇同步的 IPC channel。

## 範圍決定

經 brainstorming 澄清，本次範圍**縮小為只掛載現成元件**，理由與過程記錄如下：

1. **版面位置**：底部控制台橫跨側邊欄＋編輯區全寬（而非只在編輯區下方）。理由：Dev Server 狀態是全域概念（不屬於單篇文章），橫跨全寬符合「工作區層級工具」的心智模型。
2. **預設狀態**：進入編輯模式預設**收合**，只露出常駐控制列；需要看 log 才手動展開。
3. **「同步本篇至 Blog」按鈕：不在本次範圍**，留待後續另案討論（涉及新 IPC channel、按鈕該掛在哪個元件等額外設計決策，与單純掛載既有元件性質不同）。
4. **元件邊界**：既然不新增按鈕，不需要額外的包裝元件——直接在 `App.vue` 掛載 `ServerControlPanel`，不修改其對外介面。

被否決的替代方案：
- 新建 `EditorWorkspace.vue` 包裝 `SideBarView` + `MainEditor` + `ServerControlPanel`：在只掛載一個既有元件的前提下，多一層抽象不符合 YAGNI，等未來真的有第二個需要共用此容器的情境再抽。
- 讓 `ServerControlPanel` 比照 `AIPanelView` 不分模式常駐：稽核報告與使用者決定都明確限定在「編輯模式」，管理模式沒有預覽/開發伺服器需求；`AIPanelView` 的「不分模式」是修正按鈕點擊無反應的 bug，非刻意設計原則，不適合套用在這裡。

## 設計

### 元件掛載

`src/App.vue` 在 Editor Mode 區塊（`SideBarView` + `<main>` 的 flex row）之後，同一個 `Main Content Area` flex-col 內加入：

```html
<ServerControlPanel v-if="currentMode === ViewMode.Editor" />
```

不傳任何 props，`ServerControlPanel` 維持自足元件、自行管理 dev server 生命週期與日誌狀態。

### 行為調整

`src/components/ServerControlPanel.vue` 只改兩處既有預設值/import：

- `import { logger } from "@/utils/logger"`（新增，修掉 3 處 `logger.error` runtime 錯誤）
- `const expanded = ref(true)` → `const expanded = ref(false)`（掛載後預設收合）

### 資料流

沿用既有的 `configStore`（`hasTargetBlog` 判斷）與 `window.electronAPI.startDevServer/stopDevServer`，不新增 store 或 IPC channel。

`ServerControlPanel` 掛載在 `App.vue` 層級（非 `MainEditor` 內部），切換文章不會重新掛載，伺服器運行狀態在切換文章間自然保留。**但切到管理模式時 `v-if` 會整個卸載元件**——代表切回管理模式再切回編輯模式時，日誌歷史會被清空、`isRunning` 需要重新查詢（`onMounted` 已有 `updateStatus()` 呼叫，可正確反映 main process 端的真實伺服器狀態，不會顯示錯誤的「已停止」）。此為已知且接受的行為，不在本次範圍內處理跨模式狀態保留（若日後需要，需挪去 Pinia store，屬於獨立的範圍擴張）。

### 錯誤處理

沿用元件既有邏輯，本次不新增錯誤處理路徑：
- 未設定目標部落格：啟動按鈕 disable，展開時顯示警告列
- 啟動/停止失敗：既有 try/catch 寫入 log（本次修復後才會真正被 `logger.error` 記錄而不崩潰）

### 測試

**Unit Test（新建 `tests/components/ServerControlPanel.test.ts`）**

沿用 `tests/components/ArticleManagement.list.test.ts` 的 mock 慣例（`Object.defineProperty(window, "electronAPI", {...})` + `vi.fn()`），涵蓋：
1. 掛載後 `expanded` 預設為 `false`（收合）
2. mock `startDevServer` reject → 驗證 `logger.error` 被呼叫且錯誤訊息寫入 `logs`，不拋出未捕捉例外
3. mock `stopDevServer` reject → 同上

**E2E（`tests/e2e/`，併入既有 spec 或新建）**

1. 編輯模式下底部控制台預設收合可見
2. 點展開能看到日誌區
3. 切到管理模式後控制台消失

不在 E2E 中真的啟動 dev server（避免依賴真實 process 造成 flaky），啟停邏輯本身的正確性已由 unit test 覆蓋。

## 範圍外（明確排除）

- 「一鍵同步本篇至 Blog」按鈕與對應單篇同步 IPC channel
- Phase 2 第二項：Frontmatter 側邊欄內聯編輯
- 跨模式（管理模式 ↔ 編輯模式）保留伺服器狀態/日誌歷史
