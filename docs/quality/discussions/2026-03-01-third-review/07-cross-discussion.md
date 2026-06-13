---
title: "交互討論記錄 — 第三次全面評估"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-03-01
source_of_truth: false
---

# 交互討論記錄 — 第三次全面評估

**日期**: 2026-03-01
**參與者**: 資安、效能、SOLID、架構、程式品質、可維護性 六位 Agent

---

## 討論摘要

六份報告完成後，各 Agent 就彼此的發現進行交叉討論，下文記錄主要交互意見。

---

## 議題一：`article.ts` — 共同的核心問題

### 資安 Agent → SOLID Agent

> 「你在 SOLID-02 指出 `createArticle()` 的 ID 生成是 DRY 違反。從資安角度，我更擔心 `Math.random()` 的可預測性。雖然文章 ID 不是安全憑證，但若 ID 被用在公開 URL 或分享連結，非確定性的 ID 至少要是有足夠熵的。sha256(filePath) 的方式比 `Date.now() + Math.random()` 在多個維度都更優：確定性、可重現、足夠唯一。**這個修正是高優先的**，而非僅是 DRY 問題。」

### SOLID Agent → 效能 Agent

> 「你發現 `setupFileWatching()` 的訂閱洩漏（P-01/P-06），我在 SOLID-01 將它列為 SRP 違反。這兩個診斷其實是同一個問題的兩個面向：因為檔案監聽邏輯被塞進 store，它的生命週期無法被正確管理。**如果將 `setupFileWatching` 拆出到 `useFileWatching` composable**，訂閱管理可以透過 `onScopeDispose` 自動清理，兩個問題一起解決。」

### 效能 Agent → 架構 Agent

> 「你的 A-01 指出 IPC 頻道字面字串的一致性問題。我要補充：`start-file-watching` 使用字面字串意味著框架無法對這些 IPC 呼叫的回應成本進行統計或追蹤。統一使用 IPC 常數後，工具鏈可以更容易地 trace 所有 IPC 呼叫路徑，這對效能剖析（profiling）很重要。」

### 架構 Agent → 資安 Agent

> 「你在 S-03 提到白名單初始化前的視窗期。我注意到 `main.ts` 的 IPC handler 路由是在 `app.whenReady()` 之後立即建立。在非常快速的啟動序列中，理論上 `fileService.setAllowedPaths()` 的非同步 `await configService.getConfig()` 可能晚於第一個 IPC 呼叫到達。建議的緩解措施（在初始化完成前拒絕危險操作）是正確方向，可以用一個 `isInitialized` flag 搭配 pending IPC 佇列來實現。」

---

## 議題二：靜默失敗 — 行為跨報告討論

### 程式品質 Agent → 資安 Agent

> 「我在 Q-02 列出三處靜默吞咽錯誤。你在 S-05 也發現了 `searchService.updateFile().catch(() => {})`。有趣的是，這個模式在程式庫中反覆出現——感覺是一個開發習慣而非個別疏忽。建議在 CONTRIBUTING.md 或 DEVELOPMENT.md 中加入『禁止 `.catch(() => {})` 空處理器』的明文規定，讓 ESLint 也許可以用 `no-empty-function` 規則配合 `promise` 選項來靜態偵測。」

### 資安 Agent → 程式品質 Agent

> 「同意。特別是 `searchBuildIndex?.()?.catch(() => {})` 這行——使用了可選鏈（`?.`）來防範 API 不存在的情況，這本身是謹慎的防禦做法，但同時的 `.catch(() => {})` 卻將所有下行錯誤都吞掉。這個模式背後的意圖是『非同步的非關鍵操作，不想阻塞主流程』，但解決方案不是吞咽，而是 fire-and-log：`.catch(err => logger.warn(...))`。」

### 可維護性 Agent → 程式品質 Agent

> 「在可維護性角度，靜默失敗最大的成本是**除錯時間**。一個失效的功能（如搜尋），可能需要數小時才能追蹤到是索引建立時靜默失敗。如果有 log，5 分鐘就能定位。這是技術債的隱性成本，比修復靜默失敗本身更貴。」

---

## 議題三：`FileService.getFileStats()` 未驗證路徑

### 架構 Agent → 資安 Agent

> 「你的 S-01 很重要。但我想補充架構角度的觀察：`getFileStats()` 在 `loadAllArticles()` 中被大量呼叫（每個目錄條目一次）。如果加入 `validatePath()` 驗證，而 `validatePath()` 是比較複雜的路徑正規化操作，這會放大 P-02 中已描述的 IPC 串聯效能問題。**解決方案建議**：在已知安全上下文（`ArticleService.loadAllArticles` 內）的 `getFileStats` 呼叫可使用 `skipValidation` 選項，但透過 IPC 暴露的公開路徑必須驗證。這需要兩種不同的 `getFileStats` 呼叫模式。」

### 資安 Agent → 架構 Agent

> 「你的分析正確，但我持謹慎態度。`skipValidation` 選項是一個可以被濫用的 escape hatch。更好的方式也許是在 `FileService` 層面加入一個 `trustedContext` 概念：在 main.ts 初始化時的直接呼叫使用信任路徑，透過 IPC 來的呼叫一律驗證。這樣驗證要求不依賴呼叫者的自律。」

### 效能 Agent → 資安 Agent + 架構 Agent

> 「兩位的討論觸及真正的設計張力。我的提議：最根本的修正是讓 `readDirectory()` 返回帶有 `isDirectory` 的項目（見 P-02），這樣可以減少 80% 的 `getFileStats()` 呼叫。減少呼叫次數後，對剩餘呼叫加驗證的效能成本就可接受了。這個改動同時解決了效能問題和資安問題。」

---

## 議題四：`setTimeout(100ms)` 的設計哲學

### 程式品質 Agent → 架構 Agent

> 「Q-03 中的 `setTimeout(100ms)` 問題，從架構角度你怎麼看？我認為這暗示了 store 的初始化時序與 Vue 的生命週期 hook 沒有對齊。」

### 架構 Agent → 程式品質 Agent

> 「正確。Pinia store 的設定函式（`setup` store）在元件掛載前就執行了，因此 `loadArticles()` 可能在目標元件的 `onMounted` 之前已完成，`initializeAutoSave()` 的 100ms 延遲是為了等待 Vue 的響應式系統準備好。更乾淨的架構是：store 完成載入後 emit 一個事件（或 return 一個 Promise），讓使用 store 的元件在 `onMounted` 中訂閱並初始化自動儲存。這樣生命週期是顯式的，不依賴任意的時間數字。」

### 可維護性 Agent

> 「同意。任何包含任意數字（比如 100ms）的程式碼，在 6 個月後都無法理解『為什麼是 100 而不是 50 或 200』。即使有注解，下一個維護者會懷疑那個數字是否仍然正確。顯式的 Promise/event 模式是自我文件化的。」

---

## 議題五：整體進步評估

### 可維護性 Agent（主持人總結）

> 「比較三次評估的趨勢：
>
> **第一次 → 第二次**：大幅進步，Fix-01 到 Fix-11 系統性修復，Refactor-01 到 Refactor-08 架構重組。
>
> **第二次 → 第三次**：本次發現的問題數量和嚴重度都明顯下降。重大問題（Critical/High）從第二次的多個減少到本次的 1-2 個（`setupFileWatching` 訂閱洩漏、`getFileStats` 未驗證）。主要剩餘問題是：
> 1. `article.ts` store 職責持續過重（每次都發現）
> 2. 靜默吞咽錯誤模式尚未從文化上完全消除
>
> 這是健康的系統，還在改善中。」

### 資安 Agent

> 「我要強調：`getFileStats()` 未驗證路徑是本次唯一我認為應該立即修正（當天修復）的問題。其他問題雖然重要，但不影響當前使用者的安全。」

### 效能 Agent

> 「訂閱洩漏（P-01/P-06）是我認為最高優先的執行期穩定性問題。長時間使用後會出現明顯行為異常（事件重複觸發），使用者可察覺，應在本 Sprint 修復。」

### SOLID Agent + 程式品質 Agent（聯合聲明）

> 「`createArticle()` 的 ID 生成不一致（使用 `Math.random()` 而非 `ArticleService.generateId()`）是技術債的典型案例：問題本身不緊急，但隨著文章 ID 格式不一致的累積，未來的資料遷移和功能開發成本會越來越高。建議在下個 Sprint 處理，避免資料格式分歧持續擴大。」

---

## 共同建議的行動清單

依優先順序：

### 🔴 立即（當天）
1. **[S-01]** `FileService.getFileStats()` 加入 `validatePath()` 呼叫
2. **[Q-02]** 三處靜默 `.catch(() => {})` 改為 `.catch(err => logger.error(...))`

### 🟠 本 Sprint
3. **[P-01/P-06]** 修正 `setupFileWatching()` 訂閱洩漏（返回值保存並在重新呼叫前清理）
4. **[S-02]** `writeFile()`/`copyFile()` 補充 `{ cause: err }`
5. **[SOLID-02/Q-04]** `createArticle()` 改用 `ArticleService.generateId()`，`substr` → `substring`

### 🟡 下 Sprint
6. **[A-01]** IPC 字面字串移至常數（`start-file-watching` 等）
7. **[SOLID-03]** `parseArticlePath()` 硬編碼 "Publish" → `ArticleStatus.Published`
8. **[Q-03]** `setTimeout(100ms)` 重構為顯式 Promise 流程
9. **[S-04]** `setConfig` IPC handler 加入 Zod schema 驗證

### 🟢 Backlog
10. **[SOLID-01/M-02]** 評估 `article.ts` 拆分：`useFileWatching` composable
11. **[A-02]** `FileService.watchCallback` 升級為發布-訂閱模式
12. **[M-05]** 建立 `VaultConfig` 集中管理目錄結構假設
13. **[Q-01]** 系統性消除業務邏輯層的 `no-explicit-any`

---

*交互討論結束 ｜ 回至: [索引](./00-index.md)*
