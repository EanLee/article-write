---
title: "大綱面板初次載入為空 Bug Fix 報告"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-06-13
source_of_truth: false
---

---
title: "大綱面板初次載入為空 Bug Fix 報告"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-01-26
source_of_truth: false
---

# 大綱面板初次載入為空 Bug Fix 報告

**日期**: 2026-06-13
**影響範圍**: 編輯器（大綱面板）
**嚴重程度**: Medium

## 問題描述

開啟任何文章後切換到側欄「大綱」分頁，面板顯示「尚無標題」，即使文章內含多個標題。使用者必須在編輯器內輸入任意字元（觸發內容變更）後，大綱才會出現。

**重現步驟**：
1. 開啟一篇含 `#`/`##` 標題的文章
2. 點擊側欄「大綱」分頁
3. 預期：列出所有標題；實際：顯示「尚無標題」

由 E2E 檢驗（`tests/e2e/writing-baseline.spec.ts` 大綱面板測試）首次發現，`.outline-item` 數量為 0。

## 原因分析

**呼叫鏈**：
```
MainEditor 掛載 CodeMirrorEditor（v-model=content）
  → CodeMirrorEditor.onMounted 建立 EditorView（doc = props.modelValue）
    → 大綱解析邏輯位於 EditorView.updateListener 內
      → updateListener 只在 update.docChanged 時觸發  ← 根本原因
        → 初始建立 EditorState 不屬於 docChanged
          → outline-change 從未 emit → MainEditor.outlineHeadings 保持 []
```

**根本原因**：標題解析程式碼只存在於 `EditorView.updateListener.of()` 的 `docChanged` 分支內。CM6 的初始文件載入（`EditorState.create({ doc })`）不會產生 update 事件，因此初次掛載永遠不會解析大綱。規格（2026-04-08-writing-baseline-design.md）要求「大綱面板即時解析**當前編輯文章**的標題」，初始狀態即應有資料。

## 修正方式

**修改檔案**：`src/components/CodeMirrorEditor.vue`

1. 將標題解析邏輯從 updateListener 內抽出為獨立函式 `emitOutline(doc)`
2. `onMounted` 建立 EditorView 後立即呼叫 `emitOutline(state.doc)`
3. updateListener 的 `docChanged` 分支改呼叫同一函式（消除重複）

**為什麼有效**：初次掛載與後續變更共用同一解析路徑，掛載瞬間即 emit 完整標題列表；文章切換時 v-model 外部更新會 dispatch 變更（觸發 docChanged），同樣涵蓋。

**替代方案**：在 OutlinePanel 內自行解析 props 內容——否決，會造成解析邏輯重複且與編輯器即時狀態脫鉤。

## 驗證

- E2E：`tests/e2e/writing-baseline.spec.ts`「大綱面板」測試由紅轉綠（4 個標題正確列出、點擊滾動生效）
- Unit：616 全數通過
- E2E 全套（smoke + editor-flow + writing-baseline）：通過

## 相關 Commit

- （待 commit 後補充）

---

## 附帶發現：儲存競態導致磁碟內容為舊快照（Critical，另立 PENDING）

E2E 檢驗過程中間歇性重現：快捷鍵格式化後 Ctrl+S，UI 顯示「已儲存」且編輯器內容正確，但磁碟檔案為**格式化前的舊內容**（且 frontmatter 的 `date`、`draft` 欄位遺失）。

初步分析：AutoSaveService 的儲存來源為 store 的 `currentArticle`（僅在儲存成功後才透過 `updateArticleInMemory` 更新），與手動儲存（取編輯器即時 `content.value`）來源不同；兩者寫入競態時，自動儲存可能以舊快照覆寫磁碟。此屬「資料可能被錯誤寫入」的產品行為決策問題，與 topic-019 同源。

→ 詳見 `docs/engineering/discussions/topic-020-2026-06-13-save-race-data-overwrite/PENDING.md`
→ 對應 E2E 測試以 `test.fixme` 標記留存重現步驟（`writing-baseline.spec.ts`）
