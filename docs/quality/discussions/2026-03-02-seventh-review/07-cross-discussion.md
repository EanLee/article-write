# 跨職能交互討論記錄 — 第七次全面評估

**日期**: 2026-03-02  
**參與者**: Sec（資安）、Perf（效能）、Sol（SOLID）、Arch（架構）、AI（Token 分析）、QA（品質）

---

## 議題一：GitService 路徑驗證缺失（S7-01 / A7-01）

**Sec：** 我在看 `registerIpcHandlers.ts` 的 Git 區塊時發現一件事——`repoPath` 直接從 Renderer 傳進來，沒有任何白名單驗證。`git status /etc` 這樣的路徑在技術上是合法的。這跟我們花了兩個 Sprint 修 FileService 路徑穿越的精神完全矛盾。

**Arch：** Sec 說的問題我在架構圖上也看到了，它破壞了「Config → 白名單 → 服務」這條授權鏈。FileService 有了 `validatePath()`，但 GitService 完全不知道白名單是什麼。技術上我有兩個方案：一是在 IPC handler 層驗證 `repoPath` 必須等於 `config.paths.targetBlog`，二是把 `configService` 注入 GitService，讓 GitService 內部取得合法路徑。

**Sol：** 我支持方案二，因為方案一把業務邏輯（"Git 只能操作 targetBlog"）藏在路由層。路由層應該只做路由，不應該知道業務約束。如果有天需要支援操作第二個 repo，方案一就要改路由層，方案二只改 GitService。

**Sec：** Sol 的方向對，但我想加一個實用考量——方案二的 `configService.getConfig()` 是 async 的，而 GitService 的方法也是 async，所以結構上可以 `const config = await this.configService.getConfig(); validatePath(repoPath, config.paths.targetBlog)` 這樣。修復的程式碼量其實不多，重點是要在下一個 Sprint 做，這是目前缺口中唯一有真實路徑的漏洞。

**QA：** 等等，配合 Sol 說的方案二，GitService 注入 configService 後，我們現有的 GitService 測試怎麼辦？現在測試直接 `new GitService()`，改完要 `new GitService(mockConfigService)` 才能繼續用。這不是反對意見，只是說修時要同步更新測試，工時估算別忘了。

**Arch：** QA 說的對，測試要一起動。我們把 S7-01 的修復方案確定為：GitService 構造子注入 `ConfigService`，內部 `getStatus/add/commit` 等方法先 `await this.configService.getConfig()` 取得合法 `targetBlog`，驗證 `repoPath` 是否為該路徑或其子路徑，否則拋出 `Error("拒絕存取：非法 repo 路徑")`。工時估約 2.5h（含測試更新）。

---

## 議題二：AI Provider 設定靈活性（TOKEN6-03 / TOKEN7-01 / TOKEN7-02）

**AI：** 我有三個 AI 相關的觀察想打包討論，因為它們都指向同一個問題：Provider 實作的彈性不足。第一，`max_tokens=400` 太保守，SEO JSON 輸出估算要 130–195 tokens，但若 Claude 加了換行縮排就逼近邊界；第二，模型名稱 `"claude-3-5-haiku-20241022"` 硬編碼在三個 Provider 裡，Anthropic 每幾個月就會棄用舊版本；第三，title 沒有長度截斷，雖然是自用工具風險低，但多一個 `slice(0, 200)` 也不花力氣。

**QA：** 第三點我完全同意，一行字的事直接做掉。第一點，把 400 改成 600 的方向對，但我想確認一件事：`max_tokens` 的最壞影響是 JSON 被截斷、Parse 失敗、拋出 `AIErrorCode.ApiError`，使用者看到錯誤通知。不是靜默損毀，所以現在的問題嚴重性是「偶發功能失效」不是「資料損毀」。

**AI：** QA 說得準確。所以 TOKEN6-03 的優先序是 P2——偶發失效，不是每次失效，而且有明確錯誤回報。模型名稱硬編碼（TOKEN7-02）是 P3，因為它影響的是維護，現在還沒棄用。

**Sol：** 我想從 OCP 角度說模型名稱這件事。目前三個 Provider 各自有硬編碼，如果要把它們集中成 `AI_MODELS` 常數，這是一個「改動一個地方，其他地方自動跟上」的改變。代碼行數的改動很小，但語意上說明「這是配置，不是邏輯」這件事很重要。我會把它列為「低成本高語意價值」的 P3。

**Arch：** Sol 的框架我同意。但我想提醒一個 overdesign 的邊界——把模型名稱做成可設定的 UI 選項，讓使用者在 Settings 裡填寫 Claude model name，這就是 overdesign。三個常數放在一個 `ai-config.ts` 是合適的，超過這個就是多餘的。

**AI：** 完全同意 Arch 的邊界說明。AI_MODELS 常數在 `ai-config.ts`，而不是 UI 設定。

---

## 議題三：ConfigService 同步 I/O 的不一致（QUAL7-04 / SOLID7-01）

**QA：** 我發現 ConfigService 裡有個很奇怪的不一致：`getConfig/setConfig` 用 async `fs.readFile`，但 `getApiKey/setApiKey` 用同步 `readFileSync`。這讓 mock 路徑分裂——測試裡 mock `fs.promises` 和 mock `fs.readFileSync` 是不同的設定，容易漏掉。

**Sol：** 這也是 SOLID7-01 的根源：`ConfigService` 在建構子直接呼叫 `app.getPath("userData")`，測試時要 mock Electron 的 `app` 模組。如果把 `configDir` 改為可注入的建構子參數，同時把 `setApiKey/getApiKey` 改為 async，兩個問題一起解決，而且這兩個改動是強相關的。

**Sec：** 我想從安全角度補充——目前 `getApiKey` 的 `readFileSync` 在同步執行時，如果文件讀取失敗（例如文件被鎖定），它直接 `catch {}` 靜默返回 `null`。改為 async 路徑後，行為不變，但 async 錯誤在 logger 裡更容易追蹤。

**QA：** 所以修改計畫是：  
1. ConfigService 建構子加 `configDir?: string` 參數，預設 `app.getPath("userData")`  
2. `setApiKey/getApiKey` 改為 async  
3. 調整 `registerIpcHandlers.ts` 中的 `AI_SET_API_KEY` / `AI_GET_HAS_API_KEY` handler（它們本來就是 async 的，await 即可）  
4. 更新 ConfigService 測試  

工時估算 3-4h，可以安排在修 S7-01 的同一個 Sprint（都是 ConfigService / main process 的改動，相近的程式碼區域）。

**Arch：** 支持打包修復，`configService` 相關的改動在同一個分支效率最高。

---

## 議題四：P2 排程——MetadataCacheService（P6-03）

**Perf：** P6-03（MetadataCacheService 串行 I/O）掛了兩個 Sprint 了。我理解它是 P2 不是 P0，但 100 篇文章串行讀取 200ms 啟動延遲是可量測的。現在是討論是否把它排進下一個 Sprint 的好時機。

**QA：** 這個修復的方式是 `Promise.all()` 加並行控制嗎？

**Perf：** 對，最小改動是把：
```typescript
for (const file of files) { await processFile(file); }
```
改為：
```typescript
// p-limit 或 手動 chunking，限制同時 fd 數量
await Promise.all(files.map(f => processFile(f)));
```
估計 1.5-2h，包含調整並行數（建議 limit 10-20 fd）。

**Arch：** P6-03 跟 P7-01（ProcessService timer）和 S7-01（GitService）不在同一塊程式碼。如果下一個 Sprint 是「main process 安全補強」，可以把 P6-03 放進去；如果是「clean up P2」，就一起修。我的意見是 Sprint 主題決定後，再看 P6-03 能否附帶修復，不應為了 P6-03 單獨開分支。

**Sol：** 同意 Arch 的調度建議。P6-03 技術風險低，加入任何 Sprint 的附帶改動都可以，不需要單獨的 Sprint。

---

## 議題五：P3 項目的整體觀察——哪些應該「接受現況」

**Sol：** 我們的 P3 清單越來越長（SOLID6-04/07/09/12、A6-04/05/06、QUAL6-05/06/08/10），我想點一個問題：有哪些 P3 其實已經是「接受現況」而不是「待修」？

**Arch：** 好問題。我認為 A6-04（Preload 暴露低階 FS 原語）可以改為「接受現況」。原因是 FileService 已有白名單保護，Preload 的 `readFile` 對業務邏輯的繞過風險在當前 Electron 架構下無法根本消除，改動成本高且收益邊際，記錄技術債即可。

**Sec：** 同意 Arch 關於 A6-04。不適合接受現況的是 SOLID6-09（Frontmatter 混合廢棄欄位），因為廢棄欄位累積會讓 FrontmatterEditor 的 UI 測試越來越難維護——這是真實的維護成本，不只是程式碼美觀問題。但它不危急，P3 維持合理。

**QA：** QUAL6-05（article.ts 測試維護高成本）我覺得可以部分關閉，因為 SOLID6-01 已經把過濾邏輯提取到 `useArticleFilter`，並有自己的 composable 測試。剩下的 article.ts 核心 store（loadArticles、saveArticle、createArticle）行數更少、職責更單一，測試維護成本已降低。

**Sol：** QA 說的對。`article.ts` 從 611 行拆分後，核心 Store 本體已降到約 350 行，主要測試負擔在 ArticleService 層，而 ArticleService 已有獨立測試。QUAL6-05 可以標記為「部分完成，持續觀察」而非「仍待修」。

**Perf：** 最後我補充一個「不要修」的建議：P7-03（SearchService 短查詢線性掃描 < 3 字元）。在 100 篇文章的規模，線性掃描 < 1ms，引入 2-gram 索引是 overdesign。這個應該加入「接受現況」清單，並標注「當文章數超過 1000 篇時重新評估」。

**Arch（收尾）：** 很好的整理。讓我總結這個議題的決策：
- **接受現況**：A6-04（Preload FS 原語）、P7-03（短查詢線性掃描）
- **部分完成，觀察**：QUAL6-05（article.ts 測試維護）
- **P3 維持，非急迫**：SOLID6-09、QUAL6-08、A6-06 等

---

## 本次討論結論彙整

| 結論 | 決策 | 優先序 |
|------|------|--------|
| S7-01：GitService 注入 ConfigService，內部驗證 repoPath | 執行 | P1（下一 Sprint） |
| QUAL7-04 + SOLID7-01：ConfigService 改注入 + async Key I/O | 打包修復 | P2（同 Sprint with S7-01） |
| TOKEN6-03：max_tokens 400 → 600 | 執行 | P2 |
| TOKEN7-01：title 加 `.slice(0, 200)` | 執行，一行改動 | P2（搭 TOKEN6-03） |
| TOKEN7-02：AI_MODELS 常數提取到 ai-config.ts | 執行 | P3 |
| P6-03：MetadataCacheService Promise.all | 搭配下 Sprint 附帶修復 | P2 |
| A6-04：接受現況 | 關閉 | — |
| P7-03：接受現況（文章 > 1000 篇時重評） | 關閉 | — |
| QUAL6-05：部分完成，持續觀察 | 降級 | P3 觀察 |
| QUAL7-01（ProcessService timer）：clearTimeout 一行修復 | 執行 | P3 |
| QUAL7-02（AutoSaveService 單例測試汙染）：測試 afterEach destroy | 加測試配置 | P2 |
