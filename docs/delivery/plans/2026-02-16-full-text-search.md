---
title: "Full-Text Search Implementation Plan"
domain: delivery
type: plan
status: approved
owner: tech-team
updated: 2026-02-16
source_of_truth: false
---

# Full-Text Search Implementation Plan

**Goal:** 讓使用者能用 `Cmd/Ctrl+F` 開啟浮動搜尋面板，以關鍵字搜尋所有文章內容，並跳至對應文章。

**Architecture:**
- `SearchService`（Main process）：啟動時全量掃描 markdown 建立記憶體索引，chokidar 增量更新。
- IPC `search:query`：Renderer 送關鍵字，Main 搜尋後回傳 `SearchResult[]`，預設時間倒序排序。
- `SearchPanel.vue`：浮動 overlay，`Cmd/Ctrl+F` 觸發，鍵盤 ↑↓ + Enter 導航，wikilink 解析預留擴充。

**Tech Stack:** Electron IPC、Pinia、Vue 3 Composition API、DaisyUI、chokidar、Vitest

---

**實作狀態**：已完成，詳見 `src/main/services/SearchService.ts`、`src/stores/search.ts`、`src/components/SearchPanel.vue` 與對應測試。
