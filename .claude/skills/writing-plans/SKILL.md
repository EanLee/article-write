# Writing Plans（本專案覆蓋版）

> 覆蓋 `superpowers:writing-plans`。核心差異：**Plan 禁止輸出程式碼**。

## 原則

Plan 是給人讀的決策與步驟文件，不是可執行腳本。
程式碼寫進 plan 立刻與實作產生版控分歧——「怎麼做」是程式碼本身的責任。

## Plan 格式

儲存於 `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`。

### Header（必填）

```markdown
# [Feature] 實作計畫

**Goal:** 一句話說明目標
**Architecture:** 2–3 句說明方法
**Tech Stack:** 關鍵技術/套件清單
**Spec:** 連結到對應的 SPEC 文件
```

### Task 格式

```markdown
### Task N：[元件名稱]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts`
- Test: `tests/exact/path/test.ts`

- [ ] Step 1：[動詞句說明要做什麼]（對象：`FTSStore`）
- [ ] Step 2：執行測試確認失敗 — `npx vitest run tests/…`，Expected: FAIL
- [ ] Step 3：實作（描述行為與責任，不含 function body）
- [ ] Step 4：執行測試確認通過 — Expected: PASS（N tests）
- [ ] Step 5：Commit — `git commit -m "feat(…): …"`
```

## 允許 vs 禁止

| 允許 | 禁止 |
|---|---|
| shell 指令（`npm install`、`git commit`） | function / class 完整實作 |
| 預期輸出（`Expected: PASS`） | HTML / CSS template |
| 介面 signature 一行（`interface Embedder { embed(text): Promise<number[]> }`） | SQL schema block（> 3 行） |
| 檔案路徑與責任說明 | 任何超過 3 行的程式碼區塊 |
| 指向 Spec 或 AIDR 的 cross-reference | TBD / TODO / placeholder |

## Self-Review

完成後掃描：
1. Spec 每個需求是否對應到 task？
2. 有無 code block 超過 3 行？（違規，移除）
3. 有無 TBD/TODO？（違規，補全描述或刪除）
