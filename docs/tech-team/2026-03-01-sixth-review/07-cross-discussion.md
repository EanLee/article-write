# 跨角色技術討論 — 第六次全面評估

**形式**: 圓桌討論  
**日期**: 2026-03-01  
**出席角色**: 資安、效能、SOLID、架構、AI Token、品質

---

## 議題一：autoDownload vs safeStorage 金鑰洩漏——誰先修？

**資安工程師**: 我先釐清立場。本次資安評估的最高優先是 **S6-02**（safeStorage base64 明文），不是 ProcessService 的 shell:true（S6-01）。API 金鑰是使用者的真錢，base64 儲存是確定性洩漏。但我也注意到品質工程師把 **QUAL6-03（autoDownload）** 列為 P0。我同意——autoDownload 的供應鏈攻擊面是所有問題裡 CVSS 最高的，應該和 safeStorage 並列 P0。

**品質工程師**: 同意並列 P0 判斷。補充維度：**autoDownload 的修復成本極低**（`= false` + 一個 IPC event listener，2 小時以內），但若拖延遭遇一次供應鏈事件，品牌信任歸零。反而 S6-02 的修復需要考慮遷移路徑（已用 base64 儲存的使用者升級後如何無縫遷移？），需要設計，建議預留 3 小時設計加遷移測試。

**架構師**: 從修復複雜度角度，兩個問題的工作分量差異才是排序的真正依據。QUAL6-03 是孤立的兩行改動。S6-02 涉及：(1) safeStorage 可用性偵測策略 (2) 使用者通知 IPC 事件 (3) 現有 base64 KEY 的遷移流程 (4) 回滾計劃。建議本 sprint 先修 QUAL6-03（立刻），S6-02 開 tech task 排入下個 sprint 設計週期。

**效能工程師**: 兩位說安全，我說 **P6-05（ImageService 500 IPC 炸彈）** 才是使用者今天就能感受到的問題。金鑰洩漏需要特定攻擊者，但 `getImageValidationWarnings` 在 500 行文章的 2.5 秒阻塞是每個使用者每次開文章都在體驗的痛苦。P0 的定義應該包含「使用者直接感知的功能阻斷」。

**資安工程師**: 理解效能工程師的立場，但 CVSS 7+ 的資料安全問題不能用「使用者可感知」標準降低優先序。不過 P6-05 的修復和安全問題是**獨立工作，可以並行處理**，不存在零和競爭。

**AI Token 工程師**: S6-02 和 TOKEN6-01（Prompt 注入）有共同根源——**外部資料未經隔離直接進入敏感操作**。金鑰進入儲存，使用者內容進入 LLM prompt。兩者的修復心法相同：在邊界加隔離層。若一起設計，可以共用「邊界強制化」的設計週期。

**共識決議**:
> QUAL6-03（autoDownload）立刻修，S6-02 和 TOKEN6-01 在下個 sprint 以「安全邊界強制化」為主題統一處理。P6-05 的批次正則掃描 hotfix 可並行進行。

---

## 議題二：article.ts 上帝 Store——立刻拆分還是容忍繼續？

**SOLID 工程師**: 611 行、9 個職責領域，但我想用具體損害說明「為什麼現在必須動」：`reloadArticle()` 繞過 ArticleService 自行解析 Markdown，跳過了分類解析和 ID 生成。這不只是 SOLID6-01（SRP 違反），這是 **A6-01 確認的資料一致性 Bug**——`reloadArticle` 後的文章物件和 `loadAllArticles` 回傳的格式不一致，這個 bug 可能一直存在，靜默破壞使用者資料。

**架構師**: 強力支持。A6-01（reloadArticle 統一委派 ArticleService）是本次架構首要發現。修復預估 2 小時，且可以立刻提升測試覆蓋率。我支持「**先修 reloadArticle，後拆 Store**」的分階段策略——資料一致性 Bug 優先於架構整潔。

**效能工程師**: 我同意修 reloadArticle，但對「拆 Store」有疑問。PERF6-06 指出，把 Store 拆成多個小 Store 時，computed 的依賴圖可能更複雜，反而製造更多 reactive 重算。拆分方案需要先有 reactive 依賴分析，否則可能得不償失。

**SOLID 工程師**: 效能工程師的疑慮方向相反。正確的拆分目標是把**非響應式邏輯**（`parseArticlePath`、遷移邏輯、檔案監聽初始化）抽成 composable 或純函式，讓 Store 只保留狀態（`articles`、`currentArticle`）。這樣反而**減少** computed 的觸發範圍，不會增加 reactive 重算。

**品質工程師**: 我的數據：article.ts 有 7 個 `window.electronAPI` 直呼叫，每次 Store 邏輯改動都需要更新 mock，**維護成本是正常 DI Store 的 2-3 倍**。SOLID6-10（DIP 改造）若完成，Store 的 7 個 IPC 呼叫改由 ArticleService 代理，mock 從 30+ 個方法壓縮到 1 個介面，測試品質立刻提升。

**資安工程師**: 補充安全視角：Store 的 7 個 `window.electronAPI` 直呼叫，每個都是潛在的路徑穿越入口（S6-03 延伸問題）。若改為透過 ArticleService，路徑驗證集中在 Service 層，安全檢驗點從 7 個壓縮到 1 個。「拆 Store」對安全的效益比對 SOLID 更立竿見影。

**共識決議**:
> 本 sprint：修 reloadArticle（2h，A6-01）。下個 sprint：DIP 改造（SOLID6-10），ArticleService 代理 7 個 IPC 呼叫。長期：抽離 useArticleFilter composable（SOLID6-01）。不強求一次完成。

---

## 議題三：ImageService 效能危機——O(n²) IPC 炸彈如何解除？

**效能工程師**: P6-05 是本次評審最低分（ImageService 3/10）。數字說話：`getImageValidationWarnings()` 對一篇 500 行文章發出 **500 次 IPC 呼叫**，每次 IPC 有 0.5-5ms 序列化開銷，最壞情況 **2500ms 純等待**。根本原因是 `loadImages()` 內的 `isImageUsed()` 在迴圈內又掃描所有文章的所有行。

**架構師**: 這個問題的架構根因是 A6-04（Preload 暴露低階 FS 原語）的延伸效應。因為沒有「批次讀取圖片使用狀況」的業務域 IPC，ImageService 被迫用多次單次查詢拼湊。修復方向：Main 進程新增 `IMAGE_GET_USAGE_BATCH` handler——一次 IPC 返回所有圖片狀態，工時估 4h。

**SOLID 工程師**: ImageService 648 行，`isImageUsed()` 和 `loadImages()` 的耦合是 SRP 問題的直接後果。若將兩個職責分開（`ImageUsageAnalyzer` 和 `ImageLoader`），就不會出現「Loader 內呼叫 Analyzer」的循環依賴，PERF 問題在設計時就會被阻止。

**品質工程師**: 理論上拆分正確，但 ImageService 現有測試（`tasks/services/ImageService.test.ts`）已存在，拆分需要大幅重寫。建議**兩步走**：(1) 立即：保持類別不變，`getImageValidationWarnings` 改用批次正則掃描（0.5h）；(2) 中期：拆分職責和型別定義（QUAL6-06）。這樣既不破壞現有測試，又能立即解除 UX 阻塞。

**AI Token 工程師**: 這個討論讓我聯想到 TOKEN6-02（contentPreview 無截斷）。兩個問題的共同模式：**在邊界沒有限制輸入規模**。ImageService 沒限制「單次查詢處理多少張圖片」，contentPreview 沒限制字元數上限。加入輸入規模限制是同一個修復哲學，可以在下個 sprint 以「輸入邊界強制化」專項一起處理。

**效能工程師（更新行動方案）**:
1. 立即（0.5h）：`getImageValidationWarnings` 改用批次正則掃描（一次提取所有圖片路徑，一次呼叫 `fileExistsBatch`）
2. 短期（4h）：主進程新增 `IMAGE_GET_USAGE_BATCH` IPC handler
3. 中期：分離 `ImageUsageAnalyzer`，引入 bitmap 快取

**共識決議**:
> 批次正則掃描 hotfix 立刻做（0.5h），批次 IPC handler 排入 P2。ImageService 職責拆分在非破壞性前提下分階段進行。

---

## 議題四：AI Token 成本——每次 SEO 生成費用可接受嗎？

**AI Token 工程師**: 先給基準數字：正常情況每次呼叫約 $0.000238（Claude Haiku）。每天寫 100 篇只要 $0.024。**成本本身不是問題。** 真正的問題是：若 TOKEN6-02 沒修，input token 可能暴增至 1800，費用 5 倍——雖然絕對值仍低，但這是不可預測的成本爆炸點。

**資安工程師**: TOKEN6-01（Prompt 注入）在我的評估中比成本問題嚴重。攻擊情境：攻擊者在文章首行寫入 `---IGNORE PREVIOUS INSTRUCTIONS---`，LLM 服從後，使用者的部落格 SEO 元資料被靜默替換。AI Token 工程師說「當前情境攻擊面有限」，但**架構一旦建立，加入協作功能時，安全修復成本遠高於現在一起修**。

**AI Token 工程師（部分讓步）**: 架構師的跨版本考量有說服力。修正立場：TOKEN6-01 應**並行**而非延後。修復成本極低（加 XML 邊界標記），本 sprint 和 TOKEN6-02 截斷一起完成，不超過 1 小時。我維持的異見：在多使用者功能上線前這不是 P0（阻斷性），但可以是本 sprint 完成的 P1。

**架構師**: TOKEN6-05（AIService dead code）是我關注的架構問題。AIService 引入 `Anthropic` SDK 但只為了一個永遠不會執行的 catch 分支，違反了 `IAIProvider` 介面設計的封裝原則。這暴露出「跨層異常翻譯」的設計約定沒有文件化——**各 Provider 有責任完整轉換 SDK 異常為 AIError，AIService 層不應再處理原始 SDK 異常**。

**品質工程師**: TOKEN6-07（無 Streaming）是唯一讓我覺得 2/10 嚴重度有點高的地方。對結構化 JSON 輸出，streaming 的 UX 收益確實微乎其微——沒辦法「部分顯示」不完整的 JSON 物件。但我擔心的是：2-5 秒阻塞期間 UI 狀態管理的測試幾乎是空白。建議先補「loading state」的組件測試，再討論 streaming。

**共識決議**:
> TOKEN6-01/02/05 本 sprint 完成（合計 1.5h）。TOKEN6-04 排入 P1。TOKEN6-07 Streaming 議題延後，先補 loading state 測試。AI Token 成本可接受，需加 usage tracking（TOKEN6-08）作為長期監控基準。

---

## 議題五：8 個 Service 零測試——補測試的智慧優先序

**品質工程師**: 8 個 Service 不能同時補，提出智慧排序：
1. **ConfigService**（最高優先）：是所有服務的設定根源，S6-02 修復的前提，一石二鳥
2. **ProcessService**（高優先）：有 QUAL6-01/02/09 三個已知 Bug，沒有測試就無法驗證修復
3. **SearchService**：P6-02 重構（trigram index）需要測試保護，TDD 模式進行
4. GitService、PublishService、AIService、AutoSaveService：後期依工時排入

**資安工程師**: ConfigService 的測試是 S6-02 修復的前提條件。需要覆蓋三個路徑：(1) safeStorage 可用時正確加密；(2) 不可用時正確拒絕並警告；(3) 遷移路徑（已有 base64 key 的使用者不會資料丟失）。沒有這三個測試，S6-02 的修復是盲目的。

**架構師**: 測試策略的根本問題不只是「哪個 Service 先補」，而是**測試架構缺失**：主進程 Service 需要 Node.js 環境，但目前 Vitest 設定是 happy-dom，跨進程 IPC 需要 mock ipcMain。建議先建立 `tests/main/` 目錄 + Vitest Node environment 設定（約 2h），所有主進程 Service 測試集中在此。這個基礎設施完成後，補 ConfigService 和 ProcessService 就順暢許多。

**效能工程師**: SearchService 的 P6-02 修復（linear scan → trigram index）是涉及資料結構的重大重構。沒有覆蓋率就重構，很可能引入 edge case（中文分詞邊界、全形半形混用）。強烈建議：**SearchService 測試補充和 trigram 重構捆綁在同一個 PR，TDD 模式進行**。

**SOLID 工程師**: SOLID6-11 揭示更深層的測試問題：`AutoSaveService` import Vue `ref`，導致這個 Service 無法在純 Node.js 環境測試。補測試前必須先解除 Service 對 Vue 的直接依賴。**Service 層的 DIP 改造是補測試的必要前提，不是選項。**

**AI Token 工程師（提醒容量）**: 盤點所有建議：S6-02 修復（3h）+ ConfigService 測試（4h）+ ProcessService 測試（4h）+ ARCH 拆分（6h）+ P6-05 批次 IPC（4h）+ TOKEN 修復（2h）+ SOLID6-11 DIP 改造（4h）……已超出單一 Sprint 容量。建議劃分為三個相對獨立的「主題 Sprint」：
- **安全 Sprint**：S6-02/QUAL6-03/TOKEN6-01/S6-03/S6-04
- **效能 Sprint**：P6-05/P6-02/P6-01
- **架構 Sprint**：A6-01/SOLID6-01/SOLID6-11/A6-02

**共識決議**:
> 先建立 `tests/main/` 基礎設施（2h）。第一優先補 ConfigService（捆綁 S6-02）和 ProcessService（捆綁 QUAL6-01/02/09）。AutoSaveService 等解除 Vue 耦合後再補。三個主題 Sprint 按業務節奏排入 Roadmap。

---

*第六次全面評估 — 跨角色討論 | 索引: [00-index.md](./00-index.md)*
