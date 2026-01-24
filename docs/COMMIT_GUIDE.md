# Git Commit 指南

本文檔提供建議的 commit 訊息，用於提交本次開發的所有功能。

---

## 📦 提交順序建議

按照功能依賴順序提交：

### 1️⃣ 基礎 UI 改善

```bash
git add src/components/ArticleList.vue
git commit -m "feat(ui): 改善文章列表選中狀態視覺設計

- 選中文章添加左側粗邊框和淺色背景
- 標題加粗並變色以提升辨識度
- 未選中文章添加細邊框
- hover 時邊框變色提供即時反饋

"
```

```bash
git add src/components/EditorHeader.vue
git commit -m "feat(ui): 重新設計編輯器工具列

- 改用圖標按鈕取代純文字按鈕
- 添加 DaisyUI tooltip 提供操作說明
- 使用分隔線清晰區分功能組
- 響應式設計：小螢幕隱藏按鈕文字
- 圖標尺寸從 16px 提升到 18px

"
```

```bash
git add src/components/SaveStatusIndicator.vue
git commit -m "feat(ui): 增強儲存狀態指示器視覺效果

- 圖標從 14px 加大到 16px
- 添加邊框與陰影提升視覺層次
- 背景色加深提供更好的對比度
- 未儲存狀態的儲存按鈕變為黃色警告樣式
- 字體加粗提升可讀性

"
```

---

### 2️⃣ 核心功能 - Composables

```bash
git add src/composables/useUndoRedo.ts
git commit -m "feat(editor): 實作完整的 Undo/Redo 系統

- 支援 Ctrl+Z 撤銷和 Ctrl+Shift+Z 重做
- 保留最多 100 個歷史記錄
- 自動記錄游標位置以便準確恢復
- 支援防抖機制（500ms）避免過度記錄
- 提供歷史統計資訊

"
```

```bash
git add src/composables/useSearchReplace.ts
git commit -m "feat(editor): 實作搜尋/替換邏輯

- 提供開啟/關閉搜尋面板的介面
- 支援單個和全部替換功能
- 提供跳轉到匹配位置的方法
- 自動轉義正則表達式特殊字元

"
```

---

### 3️⃣ 核心功能 - UI 組件

```bash
git add src/components/SearchReplace.vue
git commit -m "feat(editor): 實作搜尋/替換 UI 組件

- 即時搜尋與匹配計數顯示
- 支援區分大小寫、正則表達式、全字匹配
- 提供上一個/下一個導航按鈕
- 支援單個/全部替換
- 快捷鍵：Enter (下一個)、Shift+Enter (上一個)、Esc (關閉)
- 全部替換前顯示確認提示

"
```

```bash
git add src/components/EditorStatusBar.vue
git commit -m "feat(editor): 實作編輯器狀態列組件

- 即時顯示游標位置（行/列）
- 智慧字數統計（排除 Markdown 語法）
- 顯示段落數和閱讀時間估算
- 選取文字時顯示選取長度
- 提供詳細統計資訊的 tooltip
- 編輯器選項切換：同步滾動、行號、自動換行

"
```

---

### 4️⃣ 快捷鍵系統擴充

```bash
git add src/composables/useEditorShortcuts.ts
git commit -m "refactor(editor): 擴充編輯器快捷鍵系統

新增快捷鍵:
- Ctrl+Z: 撤銷
- Ctrl+Shift+Z: 重做
- Ctrl+F: 開啟搜尋
- Ctrl+H: 開啟替換

改進:
- 統一快捷鍵處理邏輯
- 支援 Shift 組合鍵
- 添加回調函數介面

"
```

---

### 5️⃣ 主編輯器整合

```bash
git add src/components/MainEditor.vue
git commit -m "feat(editor): 整合所有核心編輯功能

整合內容:
- Undo/Redo 系統（useUndoRedo）
- 搜尋/替換功能（useSearchReplace）
- 搜尋高亮與滾動定位
- 歷史記錄防抖（500ms）
- 快捷鍵處理整合

新增功能:
- Ctrl+Z/Ctrl+Shift+Z 撤銷/重做
- Ctrl+F/Ctrl+H 搜尋/替換
- 自動記錄編輯歷史
- 搜尋結果自動定位與滾動

"
```

```bash
git add src/components/EditorPane.vue
git commit -m "feat(editor): 編輯器面板添加狀態列

- 整合 EditorStatusBar 組件
- 追蹤游標位置與選取範圍
- 支援編輯器選項切換事件
- 預設啟用自動換行

"
```

---

### 6️⃣ 文檔更新

```bash
git add docs/INTEGRATION_GUIDE.md docs/CORRECT_PRIORITY_ROADMAP.md
git commit -m "docs: 新增核心功能整合指南與開發路線圖

- INTEGRATION_GUIDE.md: 詳細的功能整合步驟
- CORRECT_PRIORITY_ROADMAP.md: 正確的開發優先級建議
- 包含完整的測試清單與已知限制
- 提供後續優化建議

"
```

```bash
git add docs/COMMIT_GUIDE.md
git commit -m "docs: 新增 Git commit 指南

提供建議的 commit 訊息範本，方便提交所有新功能

"
```

---

## 🚀 一次性提交（不推薦）

如果您想一次提交所有變更：

```bash
git add src/components/ src/composables/ docs/
git commit -m "feat(editor): 實作完整的編輯器核心功能

UI 改善:
- 改善文章列表選中狀態視覺設計
- 重新設計編輯器工具列（圖標化 + tooltip）
- 增強儲存狀態指示器

核心功能:
- 完整的 Undo/Redo 系統（Ctrl+Z / Ctrl+Shift+Z）
- 搜尋/替換功能（Ctrl+F / Ctrl+H）
- 編輯器狀態列（字數、行列、選項切換）
- 擴充快捷鍵系統

技術實作:
- useUndoRedo composable（歷史記錄管理）
- useSearchReplace composable（搜尋邏輯）
- SearchReplace.vue（搜尋 UI）
- EditorStatusBar.vue（狀態列 UI）
- 整合到 MainEditor.vue 和 EditorPane.vue

文檔:
- 整合指南（INTEGRATION_GUIDE.md）
- 開發路線圖（CORRECT_PRIORITY_ROADMAP.md）
- Commit 指南（COMMIT_GUIDE.md）

"
```

---

## 📝 Commit 最佳實踐

### 1. 使用 Conventional Commits 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 類型**:
- `feat`: 新功能
- `fix`: 錯誤修復
- `docs`: 文檔更新
- `style`: 程式碼格式調整
- `refactor`: 重構
- `perf`: 效能優化
- `test`: 測試相關
- `chore`: 建置/工具相關

**Scope 範圍**:
- `editor`: 編輯器相關
- `ui`: UI/UX 改善
- `search`: 搜尋功能
- `docs`: 文檔

### 2. 使用繁體中文撰寫 commit body

根據您的 CLAUDE.md 設定，commit 訊息應使用繁體中文。

### 3. 遵循 Atomic Commits 原則

每個 commit 應該：
- 只做一件事
- 可以獨立運作
- 易於理解與回溯

## ✅ 提交前檢查清單

在提交前，請確認：

- [ ] 所有新檔案都已添加到 git
- [ ] 沒有包含不相關的變更
- [ ] Commit 訊息清楚描述變更內容
- [ ] 使用 Conventional Commits 格式
- [ ] 使用繁體中文撰寫訊息內容

---

## 🔍 驗證提交

提交後，使用以下命令驗證：

```bash
# 查看最近的 commit
git log --oneline -5

# 查看特定 commit 的詳細資訊
git show HEAD

# 查看變更的檔案
git diff HEAD~1
```

---

完成！使用本指南提交所有變更。建議使用「按功能分批提交」的方式，以保持 git 歷史清晰。
