---
title: "IA Phase 3 子專案 1：三欄式工作區骨架與 Inspector"
domain: engineering
type: spec
status: draft
owner: tech-team
updated: 2026-08-04
source_of_truth: false
tags:
  - ia-phase3
  - inspector
  - workspace-layout
related_docs:
  - docs/engineering/discussions/2026-08-04-ia-phase2-server-control-panel-integration.md
---

# IA Phase 3 子專案 1：三欄式工作區骨架與 Inspector

## 背景

agy UIUX/IA 稽核報告的三階段路線圖中，Phase 3（IA 重新設計）原文：

> 仿 VS Code/Obsidian 的三欄式工作區（左 Navigator／中 Editor／右 Inspector：屬性+AI+發布），撤掉獨立全頁的「管理模式」，改成 Navigator 裡的一個篩選視圖；文章生命週期改成清楚的 草稿→準備發布→已同步→已部署 四階段指示

範圍明顯大於 Phase 1/2，經 brainstorming 拆解為 3 個彼此有依賴的子專案：

1. **三欄式工作區骨架與 Inspector**（本文件範圍）
2. 管理模式功能併入 Navigator 篩選視圖（依賴子專案 1 完成，Navigator/Inspector 容器需先存在）
3. 文章生命週期狀態模型重新設計（資料層可平行準備，UI 呈現依賴子專案 1/2 的容器）

討論過程中發現：原本被擱置的 **Phase 2 第二項**（Frontmatter 從 Modal 改側邊欄內聯編輯）與 Inspector 的「屬性」區塊高度重疊，經確認**併入本子專案**，不再單獨處理。同時確認 Phase 2 剛完成的 `ServerControlPanel` 底部控制台，其「發布」語意正是 Inspector 三區塊之一，**一併搬入 Inspector**，不再是 App.vue 底部橫條。

管理模式（`ArticleManagement.vue`、`ViewMode.Management`）本次**完全不動**，留給子專案 2。

## 現況調查

- **Navigator（`SideBarView.vue`，220 行）**：3 頁籤——文章列表（`ArticleListTree`）、文章資訊/Frontmatter（`FrontmatterView`，唯讀顯示，「編輯」按鈕開啟 Modal）、大綱（`OutlinePanel`）。可調寬、可折疊。
- **AI 面板（`AIPanelView.vue`，208 行）**：右側 dock，`data-testid="ai-panel"`，由 `aiPanelStore` 控制開關，預設**關閉**，透過 `ActivityBar` 的「AI 助手」按鈕（`data-testid="ai-panel-toggle-button"`）切換。內容為 SEO 生成等 AI 功能區塊（accordion 式可展開）。
- **Frontmatter 編輯（`FrontmatterEditor.vue`，345 行）**：Modal 彈窗，`v-model` 控制顯示，欄位含標題/slug/日期/分類/標籤/關鍵字，`handleSave()` 寫回 `articleStore`。目前掛載於 `MainEditor.vue`，由 `SideBarView` 的「編輯」按鈕透過 `App.vue` 轉發事件開啟。
- **發布控制台（`ServerControlPanel.vue`）**：Phase 2 剛掛載於 `App.vue` 底部，橫跨 Navigator+Editor 全寬，只在編輯模式顯示，預設收合。
- **`ActivityBar.vue`（126 行）**：48px 圖示列，`ViewMode` 切換（編輯/管理）+ AI 面板開關 + 設定。

## 範圍決定（brainstorming 逐項確認）

| 決策點 | 結果 |
|---|---|
| Phase 2-2（Frontmatter 內聯編輯）與 Inspector 的關係 | 併入本子專案，不單獨做 |
| 大綱頁籤去向 | 留在 Navigator，變成第 2 個頁籤（文章列表／大綱） |
| Inspector 預設狀態 | 常駐可見、可折疊（非現行 AI 面板的預設關閉） |
| 「發布」區塊內容 | 就是 `ServerControlPanel`，一併搬進 Inspector 第 3 個頁籤 |
| Inspector 內部三塊的呈現方式 | 內部分頁籤（屬性／AI 助手／發布），而非堆疊手風琴 |
| `FrontmatterEditor.vue` 舊 Modal | 移除（比照 Phase 1 清理孤立元件的做法） |
| `ActivityBar` 的 AI 按鈕語意 | 改為「折疊/展開整個 Inspector」，不再是「開關 AI 頁籤」 |
| `aiPanelStore` 命名 | 重新命名為 `inspectorStore`，語意對齊實際管的是整個 Inspector 折疊狀態 |
| 元件架構 | 新建 `InspectorView.vue` 當外殼（寬度/resize-handle/折疊/頁籤切換），三個頁籤內容各自獨立子元件，被否決的替代方案：(a) 三個既有元件整包塞進頁籤各自保留外框（外殼包外殼，resize-handle 疊 resize-handle）(b) 全部邏輯寫在一個 `InspectorView.vue` 裡不拆子元件（違反本專案架構稽核報告點名的「檔案過大職責過重」問題） |

## 設計

### 元件架構

```
App.vue（Editor Mode 三欄）
├─ SideBarView.vue（Navigator，2 頁籤：文章列表／大綱，移除 Frontmatter 頁籤）
├─ MainEditor.vue（不變，移除 FrontmatterEditor 掛載）
└─ InspectorView.vue（新建，外殼）
   ├─ PropertiesTab.vue（新建）：Frontmatter 內聯表單，取代 FrontmatterEditor.vue 的欄位邏輯
   ├─ AIPanelContent.vue（從 AIPanelView.vue 拆出，移除外框，保留 SEO 生成等功能）
   └─ PublishTab.vue（新建）：承接 ServerControlPanel.vue 的內容（狀態列＋日誌＋啟停按鈕）
```

`ServerControlPanel.vue`、`AIPanelView.vue` 的既有邏輯（dev server 生命週期、SEO 生成流程）原封不動搬移，只拆掉各自的外框 CSS（`border`/`width`/`resize-handle`），外框責任統一交給 `InspectorView.vue`。

### 版面與互動

- `App.vue` Editor Mode 從兩欄（Navigator + Editor）變三欄（Navigator + Editor + Inspector）
- `InspectorView` 預設可見、可折疊、可調寬，沿用 `AIPanelView` 現有的 resize 邏輯（左側 resize-handle）
- `ActivityBar` 的 AI 按鈕改為折疊/展開整個 `InspectorView`（點擊時不指定頁籤，維持使用者上次選到的頁籤）
- 管理模式（`ViewMode.Management`）版面完全不變

### Store 調整

`stores/aiPanel.ts` → 重新命名為 `stores/inspector.ts`（`useAIPanelStore` → `useInspectorStore`），所有引用點同步更新（`App.vue`、`ActivityBar.vue` 的 prop 傳遞）。Store 內部語意不變，只是從「AI 面板專屬」擴大為「整個 Inspector 的折疊狀態」。

### 資料流與錯誤處理

不新增 store 或 IPC；`PropertiesTab.vue`、`PublishTab.vue`、`AIPanelContent.vue` 各自沿用原元件已有的資料來源（`articleStore.currentArticle`、`configStore`、`window.electronAPI`）與錯誤處理（無文章時顯示空狀態、`logger` 錯誤記錄），不新增邏輯。

### 測試影響（既有測試需要重寫，非單純新增）

以下既有 E2E 測試的選擇器與流程會因本次改動失效，需要對應重寫：

- `tests/e2e/ai-panel.spec.ts`：AI 面板不再是獨立 dock，變成 Inspector 的一個頁籤
- `tests/e2e/frontmatter-sidebar-edit.spec.ts`：Frontmatter 編輯不再開 Modal，改為 Inspector「屬性」頁籤內聯編輯
- `tests/e2e/server-control-panel.spec.ts`：`ServerControlPanel` 不再是 `App.vue` 底部橫條，改為 Inspector「發布」頁籤

新增測試涵蓋：Inspector 折疊/展開、三個內部頁籤切換、`inspectorStore` 重新命名後的行為。

## 範圍外（明確排除）

- 管理模式功能併入 Navigator 篩選視圖（子專案 2）
- 文章生命週期四階段狀態模型（子專案 3）
- Inspector 內部三個頁籤的細部視覺打磨（間距/字級等，本次先求功能位置正確）
