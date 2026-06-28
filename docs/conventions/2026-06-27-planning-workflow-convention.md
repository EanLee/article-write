---
title: 計畫文件與任務追蹤工作流規範
domain: conventions
type: guide
status: draft
owner: tech-team
updated: 2026-06-27
source_of_truth: true
---

# 計畫文件與任務追蹤工作流規範

## 背景

本規範定義專案中「計畫文件」與「執行期任務追蹤」的分層標準，
確保長期決策可追溯、短期執行不產生文件垃圾。

## 計畫文件（Plan）

計畫文件記錄**決策與範圍**，供人類工程師 review 與 agent 引用。

### 必須包含

- 為什麼做這件事（動機與背景）
- 做什麼（功能邊界、納入範圍）
- 不做什麼（明確排除項）
- 驗收條件（Done 的定義）

### 禁止

- 程式碼片段（code block）
- 具體實作步驟（how to implement）
- Task checkbox（任務清單）

### 存放位置

`docs/delivery/plans/YYYY-MM-DD-PLAN-NNN-kebab.md`，`doc_type: plan`

## AI 執行腳本（ai-plan）

給 agent 直接執行的詳細步驟文件，可含 shell 指令，禁止含原始程式碼實作（以 file path + 說明取代）。

存放位置：`docs/delivery/ai-scripts/YYYY-MM-DD-kebab.md`，`doc_type: ai-plan`

## 任務追蹤（Task）

任務是執行期短命追蹤單元，完成後不需長期保存。

| 情境 | 工具 |
|------|------|
| 同 session 內執行 | Claude Code TaskCreate / TaskUpdate |
| 跨 session 接續進度 | context-mode 自動補捉 |

**任務不進 docs/，不進 lorex 追蹤。**
