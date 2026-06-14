---
title: "AI 輔助開發 Token 優化方案"
domain: conventions
type: guideline
status: approved
owner: tech-team
updated: 2026-06-14
source_of_truth: true
---

# AI 輔助開發 Token 優化方案

> 適用於所有需要 AI 助手執行多輪工具呼叫的開發任務，非僅限 E2E 測試。

## 消耗源（按影響排序）

1. **Session 過長（最大宗）**：每次工具呼叫都重送完整對話歷史，歷史越長每輪固定成本越高，與任務內容無關
2. **試錯疊代次數**：每輪「跑→猜→改」都背著完整歷史；7 輪盲猜 vs 2 輪看 log，成本差數倍
3. **累積的工具結果**：session 前段的檔案讀取、grep、agent 輸出全部留在上下文，後段每輪都為它們付費

## 優化方案

| 方案 | 效果 | 做法 |
|------|------|------|
| **任務邊界開新 session** | 最大 | 獨立任務開新對話；狀態都在 git/文件/任務板，新 session 以 `ctx_search` 召回，不帶舊歷史 |
| **`/compact` 主動壓縮** | 大 | 長任務的階段邊界（討論結束、開始實作前）手動壓縮 |
| **試錯型工作交給 subagent** | 中 | 需多輪疊代的除錯包成 Agent 任務隔離執行，主對話只收結論 |
| **rtk pre-command** | 中 | 所有指令輸出經 rtk 截斷（Bash hook 自動套用） |
| **sandbox 解析（ctx_execute）** | 中 | 測試報告、log 在 sandbox 內解析，只回傳結論 |
| **fixtures 模板複製** | 小 | 測試資料不在測試碼或對話中反覆生成 |
