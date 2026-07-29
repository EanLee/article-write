---
title: 標準 Markdown 連結文字開頭含中括號引言時，語法驗證誤判為「未閉合的 Wiki 連結」
date: 2026-07-30
status: fixed
branch: fix/markdown-wikilink-validation-false-positive
---

## 問題描述

**現象**：編輯器語法驗證面板顯示某行「未閉合的 Wiki 連結」錯誤，但該行內容其實是一個完整、正確的標準 Markdown 連結，並沒有任何 Obsidian wikilink 語法。

**實際重現內容**（使用者提供）：

```
Andrew Wu， [[架構師的修練] #2， SLO - 如何確保服務水準？](https://columns.chicken-house.net/2021/06/04/slo/)
```

**重現步驟（已用單元測試驗證，非讀程式碼推論）**：
1. 呼叫 `markdownService.validateMarkdownSyntax(content)`，`content` 為上述整行
2. 預期：不應出現「未閉合的 Wiki 連結」
3. 實際（修復前）：出現「未閉合的 Wiki 連結」

對應測試（修復前為 RED）：`tests/services/MarkdownService.test.ts` 內 `"標準 Markdown 連結文字開頭含中括號引言（例如書名）不應誤判為未閉合的 Wiki 連結"`。

## 原因分析

這一行文字實際上是**一個完整的標準 Markdown 連結** `[連結文字](網址)`，其中「連結文字」本身以一段用中括號引言的書名開頭（中文寫作常見手法）：

```
[ [架構師的修練] #2， SLO - 如何確保服務水準？ ](https://columns.chicken-house.net/2021/06/04/slo/)
 ↑外層連結開頭  ↑書名引言（自成一對中括號）              ↑外層連結結尾
```

呼叫鏈：

```
MarkdownService.validateMarkdownSyntax(content)
  → openWikiLinks = (line.match(/\[\[/g) || []).length
      → 正規式 /\[\[/g 只找「兩個連續的 [ 字元」，不管它們是不是同一組語法
      → 外層連結的開頭 "[" 恰好緊接著書名引言的開頭 "["，兩個獨立、各自平衡的中括號
        並排出現，形成字面上的 "[[" → openWikiLinks = 1
  → closeWikiLinks = (line.match(/\]\]/g) || []).length
      → 書名引言的 "]" 與外層連結的 "]" 中間隔著一段文字（"#2，SLO - ..."），
        兩者並不相鄰 → 全行沒有任何 "]]" 出現 → closeWikiLinks = 0
  → openWikiLinks (1) !== closeWikiLinks (0) → 判定為「未閉合」
  ← 根本原因：這個檢查把「兩個字元連續出現的 [[／]]」直接當成 Wiki 連結的開頭／結尾在數，
    完全沒有先判斷這兩個中括號是否真的屬於同一組語法。只要標準 Markdown 連結的
    連結文字本身以中括號開頭（常見於引用書名、標題），就會製造出字面上的 "[[" 而没有對應的 "]]"，
    被誤判為未閉合的 Wiki 連結
```

## 修正方式

**修改檔案**：`src/services/MarkdownService.ts`

在計算 `[[`／`]]` 數量之前，先用正規式 `/\[(?:[^[\]]|\[[^[\]]*\])*\]\([^)]*\)/g` 把「完整的標準 Markdown 連結」從該行文字中移除，這個正規式允許連結文字內含**一層巢狀中括號**（涵蓋書名引言這類常見寫法），移除完整連結之後，再對剩餘文字做原本的 `[[`／`]]` 數量比對。

**為何有效**：先把已經確認完整、合法的標準 Markdown 連結整段移除，殘留文字裡才不會再出現「連結開頭的 `[` 恰好緊接著連結文字內引言 `[` 」這種巧合造成的字面 `[[`。真正的 Wiki 連結（`[[文章標題]]`）不含 `](url)` 這種標準連結收尾，不會被這個正規式誤刪，仍然會被正確計數。

**替代方案（未採用）**：曾考慮把整個 `[[`／`]]` 計數邏輯換成完整的括號深度解析器（逐字元掃描、追蹤巢狀深度），能處理任意層數的巢狀中括號，但目前程式碼裡沒有出現超過一層巢狀的實際案例，額外的解析器複雜度換來的效益有限，故先用「移除完整連結後再計數」這個較小改動處理已知的誤判樣式；若未來出現更深層巢狀的誤判案例，再考慮升級為完整解析器。

**影響範圍**：僅 `MarkdownService.validateMarkdownSyntax` 的「未閉合 Wiki 連結」檢查；高亮語法、註釋、圖片語法三項檢查邏輯不變。

**測試**：新增 2 個單元測試於 `tests/services/MarkdownService.test.ts`：
- 誤判案例（修復前 RED、修復後綠燈）：標準連結文字含書名引言不應被誤判
- 真陽性回歸測試：真正未閉合的 Wiki 連結（如 `[[真的沒關閉的連結`）仍必須被正確偵測到，避免修正誤判時連帶漏掉真正的錯誤

`pnpm run test`：50 test files / 683 passed / 1 skipped；`pnpm run lint`：0 errors。

**相關 commit**：`fix(editor): 修正標準 Markdown 連結文字含中括號引言時誤判為未閉合 Wiki 連結`
