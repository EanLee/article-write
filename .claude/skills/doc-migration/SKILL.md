---
name: doc-migration
description: 首次對已有大量既有文件的專案套用 doc-viewer 時的移轉流程。處理 docs:lint:schema 報出大量缺 frontmatter 欄位的既有文件、決定移轉優先順序、補齊 frontmatter 時必用。
---

# Doc Migration

首次對已有大量既有文件的專案套用 doc-viewer 時的移轉流程。

## 適用情境

專案已有 Markdown 文件（無 doc-viewer frontmatter、或 frontmatter 不完整），
剛執行完 `doc-viewer-init`，需要讓既有文件逐步符合 doc-viewer 規範。

---

## Step 1 — 評估現況

在 `.doc-viewer/` 目錄下執行：

```bash
npm run docs:lint           # 列出 YAML 語法錯誤（會阻擋 docs:dev，必須先修）
npm run docs:lint:schema    # 列出缺必填欄位的文件（不阻擋，可漸進補齊）
```

**解讀結果：**

| 狀況 | 影響 | 優先順序 |
|---|---|---|
| YAML 語法錯誤 | `docs:dev` / `docs:build` 被阻擋 | **立即修** |
| 缺必填欄位 | 站台可啟動，但 MCP 查詢與搜尋品質下降 | 漸進補齊 |
| 無 frontmatter | 同上，`generate-nav.mjs` 改用檔名當標題 | 漸進補齊 |

---

## Step 2 — 修 YAML 語法錯誤（阻擋型，必須先處理）

最常見的 YAML 語法錯誤是**值含裸冒號**：

```yaml
# ❌ 錯誤——解析器將 "某問題" 後的冒號誤判為巢狀 key
title: Bug: 某問題描述

# ✅ 加雙引號
title: "Bug: 某問題描述"
```

`docs-lint.mjs` 會直接指出哪一行、建議修正方式，逐一照做即可。

---

## Step 3 — 決定移轉範圍與優先順序

**不需要一次全部補齊。** 建議依以下順序漸進：

1. **正在被參照的文件**：其他文件 link 到它、或使用者常開的頁面
2. **近期新增或修改的文件**：趁此機會補上正確分類
3. **關鍵決策類**：ADR、TDR、IRR——這類文件被 AI agent 查詢的頻率高，frontmatter 品質直接影響搜尋結果

**暫緩移轉的文件**（留在 backlog）：
- 純歷史紀錄、短期內不會再碰的文件
- 不確定分類的文件（先留 `doc_type: UNKNOWN`，避免強行分錯）

---

## Step 4 — 補寫 Frontmatter

每份文件補上 doc-viewer 必填欄位（見 `docs-governance` skill Step 2）：

```yaml
---
doc_type: <依 docs-governance 表格判斷>
doc_id: <doc_type>-<YYYY-MM-DD>-<kebab-slug>
title: <文件標題，值含冒號加雙引號>
status: draft
bounded_context: <所屬領域脈絡>
version: 1
created_at: <文件原始建立日期，若不確定填套用 doc-viewer 的日期>
last_reviewed: ~
source: 既有文件（移轉自 <原始來源>）
ai_generated: false
---
```

**判斷 `doc_type` 的捷徑：**
- 決策 / 為什麼做某件事 → ADR 或 TDR
- 事件 / 出了什麼問題 → IRR
- 怎麼做某件事 → RUNBOOK 或 GUIDELINE
- 需求 / 功能說明 → BRS 或 SBE
- 術語定義 → ULR
- 不確定 → 先填 `doc_type: NOTE`，之後再重新分類

---

## Step 5 — 批次作業建議

文件數量多時，可請 AI agent 執行批次掃描：

```
請列出 docs/ 下所有缺少 doc_type 欄位的 .md 檔案，
並依目錄結構推測每份文件最可能的 doc_type，以表格呈現（不要直接修改）。
```

確認 AI 的判斷後，再逐批授權修改，避免批次錯誤難以復原。

---

## Step 6 — 驗收

每一批移轉完成後：

```bash
cd .doc-viewer
npm run docs:lint:schema    # 確認這批文件已通過 schema 檢查
npm run docs:dev            # 目視確認 nav/sidebar 標題正確、連結不 404
```

---

## 注意事項

- **`generate-nav.mjs` 不依賴 frontmatter**：沒有 frontmatter 的文件仍會出現在 nav，標題改用檔名；移轉後重跑 `docs:dev` 標題才會更新。
- **不要為了「補完整」而亂猜 `doc_type`**：填 `NOTE` 或 `UNKNOWN` 比填錯分類好——錯誤分類比沒分類更難事後修正。
- **`status` 一律從 `draft` 開始**：既有文件即使已「完成」，套上 doc-viewer 框架後應重新審核才能標為 `verified`。
