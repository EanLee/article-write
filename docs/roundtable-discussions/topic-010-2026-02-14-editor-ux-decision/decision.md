# 圓桌 #010 決策記錄：Editor UX 改善

> **日期**: 2026-02-14
> **決策者**: Alex（PM）、Taylor（CTO）、Jordan（User）、Sam（Ops）、Lisa（Marketing）
> **狀態**: ✅ 決策完成，進入執行

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

## 後續追蹤

- AI-01~03 完成後，Jordan 進行驗收
- 驗收通過後更新 MVP_STATUS.md，UX-02 標記完成
- AI-05 在 v0.2 後半前完成，作為 CodeMirror 6 遷移的入場券
