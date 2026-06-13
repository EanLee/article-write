# WriteFlow 技術圓桌討論：第二次評估交互報告

> **時間**：2026-03-01
> **參與者**：資安工程師、效能工程師、SOLID 工程師、架構師、AI Token 工程師、程式品質工程師
> **主持**：架構師

---

## 一、開場：article.ts — 全場公敵

**架構師**：我直接切入今天最顯眼的交叉關切點——`article.ts`。我的報告裡它是 450+ 行 God Store（W-05），SOLID 工程師說它有 12+ 種職責（D:4/10），程式品質工程師也在裡面找到 `findIndex` O(n) 的效能問題。三份報告都指向同一個檔案，這已經是代碼庫最高風險的單一節點了。

**SOLID 工程師**：不只職責多的問題。我在裡面找到兩個會讓應用程式當場崩潰的 bug：`computed allTags.value` 被直接賦值——在 Vue 3 裡 computed 是唯讀的，這行一執行就是 runtime error；還有 `MainEditor.vue` 呼叫 `articleStore.updateArticle()`，但那個方法根本不存在，正確名稱是 `updateArticleInMemory`。我很想知道這個 store 是不是根本沒有跑過完整的 E2E 流程？

**程式品質工程師**：這解釋了很多事。我在確認覆蓋率的時候發現 `MetadataCacheService` 和 `FileScannerService` 完全零測試。如果連 store 裡的方法名稱都能對不起來，代表沒有任何整合測試在守護這條呼叫鏈。那兩個 bug 應該早就該被測試抓到。

**效能工程師**：我補充一個讓 `article.ts` 更雪上加霜的問題——`generateId()` 每次呼叫都回傳不同值，導致 `v-for` 的 `key` 每次渲染都作廢，Vue 被迫全量重建 DOM。這個問題單獨看也許只是效能，但放在一個 450 行 God Store 的背景下，你根本找不到副作用的邊界在哪裡。

---

## 二、安全與效能的碰撞：IPC 無路徑限制 × 線性掃描

**資安工程師**：我想接架構師的脈絡說一件事。W-03 提到 `article.ts reloadArticle` 直接呼叫 `window.electronAPI.readFile`，跳過 `ArticleService`。從架構角度這是分層違反，但從我的角度這是 **CRIT-01** 的具體利用路徑：`FileService` 對任意路徑無限制，任何能影響這個呼叫參數的向量，都可以把 Main Process 當作任意檔案讀取器。CVSS 8.8 不是誇張，是真實的攻擊面。

**架構師**：而且 `ipc-channels.ts` 裡的常數從來沒被 `main.ts` 引用過（W-01），雙方各自硬編碼字串——這意味著型別系統對 IPC channel 名稱沒有任何保護。攻擊者或臭蟲都可以在不被 TypeScript 察覺的情況下傳送任意 channel。

**資安工程師**：加上 `sandbox:false`（HIGH-02）和 `html:true` + `v-html` 無 sanitize（CRIT-02），這是一條完整的攻擊鏈：不可信的 Markdown → XSS → 跳過 contextIsolation → 存取 Node.js API。我承認 `contextIsolation:true` 是好的，但 sandbox 關掉以後 contextIsolation 的防線大幅削弱。

**效能工程師**：從效能看，P0-B 已經提到 `FileScannerService` 是循序 I/O，1000 個檔案要 500ms-2 秒——假設攻擊者或使用者誤觸發了掃描一個巨大目錄，這不只是安全問題，還會完全凍結 Main Process，因為架構師說 `ConfigService` 用的是同步 I/O（W-04）。

**程式品質工程師**：我在 `FileService` 的 `catch` 裡看到 C-01：吞掉原始錯誤，`ENOENT`/`EACCES` 全部消失，只回傳一個通用字串。這讓資安工程師標記的路徑穿越攻擊**更難偵測**，因為錯誤日誌根本不會顯示正確的失敗原因。

---

## 三、AutoSave 雙計時器：架構、SOLID、品質三方會診

**SOLID 工程師**：這是我今天最想讓大家注意的隱性 bug。`MainEditor.vue` 有自己的 2 秒 AutoSave timer，`AutoSaveService` 另外有 30 秒 timer，兩者完全獨立運作，沒有任何協調機制。使用者以為在 30 秒存一次，實際上是 2 秒存一次——效能問題是次要的，更嚴重的是這兩個 timer 可能在同一個時間點對同一篇文章觸發不同版本的儲存操作。

**程式品質工程師**：這跟 C-02 的 `setTimeout(100)` timing hack 是同一種氣味——靠時間差來「協調」非同步操作，而不是用正確的狀態鎖或 event-driven 機制。程式碼裡一有多個計時器，競態條件就幾乎是註定的。諷刺的是，`AutoSaveService` 的測試是全場寫得最好的——但那個測試測的是 30 秒的那個 timer，完全沒意識到 2 秒的那個同時存在。

**效能工程師**：從效能看，P1-A 已經提到 `ArticleListTree.vue` 每秒無條件寫入 `localStorage`。現在加上 2 秒的 AutoSave，等於使用者每秒不只是更新 UI state，還觸發磁碟 I/O。在文章很多的情況下，這些 I/O 加上 `SearchService` 的 O(n×m) 掃描，會造成明顯的卡頓感。

**架構師**：根本原因還是在 article.ts God Store。當一個 store 有 12 種職責，下游的每個元件都覺得自己要「幫忙做一點協調」，結果就是到處都冒出自己的計時器、自己的快取、自己的 I/O 呼叫。

---

## 四、AI 模組：被低估的生產風險

**AI Token 工程師**：我想提一個大家報告裡都沒碰到的風險面——AI 模組。三個 Provider 的 Prompt 完全重複不是美學問題，是維護地雷：有人改了 Gemini 的 Prompt，忘記同步 Claude 和 OpenAI，使用者就會得到不一致的輸出。更嚴重的是 Gemini 沒有設 `maxOutputTokens`，如果使用者輸入很長的文章，Gemini 可能把整篇文章連同評論一起輸出，token 費用失控。

**資安工程師**：你提到的 Prompt Injection 風險我想接一下——使用者輸入直接進 Prompt，等於任何使用者都可以在文章裡寫 `Ignore all previous instructions...` 來操控 AI 行為。在 Electron 應用裡這雖然主要是個人裝置，但如果哪天加了多人協作或雲端同步，這就是一個高嚴重度漏洞。

**AI Token 工程師**：還有 `claude-haiku-4-5-20251001` 這個 model 名稱，我高度懷疑是不存在的，正確應該是 `claude-3-5-haiku-20241022`。如果 API key 是有效的但 model 名稱錯誤，Claude 的 SDK 會在執行時拋出 404，然後因為沒有 retry 邏輯，功能直接失效。無 Streaming 的問題讓這個現象更明顯——使用者等了 3-5 秒，看到的是 spinner 突然消失然後出現一個 API error。

**程式品質工程師**：C-04 的 `migrateArticleFrontmatter` fire-and-forget 讓我想到一個相似的模式——把不可靠的操作丟出去不等回應。AI 呼叫沒有 retry，migration 沒有等待確認，`MetadataCacheService` 靜默 catch。這個代碼庫有一種傾向：把困難的錯誤處理變成一個靜默的 `catch` 或一個被忽略的 Promise。

---

## 五、優先順序共識與分歧

**主持（架構師）**：我們來對齊最緊急的三項。我先說我的立場：IPC 路徑限制（CRIT-01）、article.ts 拆解（W-05）、ipc-channels.ts 常數統一（W-01）。

**資安工程師**：CRIT-01 和 CRIT-02（markdown-it XSS）是我的 P0，因為這是可以從使用者內容觸發的攻擊鏈，不需要特殊權限。sandbox 要盡快開啟，即使會有相容性成本。

**效能工程師**：我把 P0-C（generateId 全量重建 DOM）排最高，因為它影響的是所有使用者的每一次操作，且修正成本極低——只要讓 `generateId` 回傳穩定值就解決。P0-A 的搜尋索引是次優先，要引入倒排索引需要設計時間。

**SOLID 工程師**：我有分歧。`computed allTags.value` 賦值和 `updateArticle` 方法名稱這兩個 bug 比 God Store 本身更緊急——因為 God Store 是長期技術債，但這兩個是**今天就會讓 app 崩潰**的問題，而且各只需要改一行。

**程式品質工程師**：我同意 SOLID 工程師的緊急排序。補充：`FileService` 的錯誤吞掉（C-01）應該跟 CRIT-01 一起修，因為它們在同一個檔案，且修錯誤處理可以讓資安工程師的路徑穿越測試更容易被偵測。

**AI Token 工程師**：我的分歧點在：Claude model 名稱錯誤是一個**今天就失效**的問題，應該列為 P0，雖然嚴重性看起來只是 config 筆誤。Prompt 重構和 Streaming 是 P1，可以在後續 sprint 處理。

---

## 六、各專家「最關鍵的單一變更」

| 專家 | 最關鍵的單一變更 | 預估工時 |
|------|----------------|---------|
| **資安工程師** | FileService 加入路徑白名單驗證（擊破 CRIT-01，所有後續 IPC 呼叫繼承保護） | 半天 |
| **效能工程師** | `generateId()` 改為回傳路徑 Hash 穩定值（最低成本、最高 ROI，消除全量 DOM 重建） | 1 小時 |
| **SOLID 工程師** | 修正 `computed allTags` 賦值 + `updateArticle` 方法名稱（兩行，消除兩個 runtime crash） | 30 分鐘 |
| **架構師** | `ipc-channels.ts` 常數引入 `main.ts` 和 `preload.ts`（強制型別安全覆蓋所有 IPC channel） | 2 小時 |
| **AI Token 工程師** | 修正 Claude model 名稱為 `claude-3-5-haiku-20241022`（讓 AI 功能從「必定失敗」回到「可以測試」） | 10 分鐘 |
| **程式品質工程師** | FileService catch 保留原始 Error 物件（`ENOENT`/`EACCES` 可見，為資安偵測和除錯提供關鍵資訊） | 1 小時 |

---

## 七、交叉問題矩陣

同一個根本問題被多位專家從不同角度發現的交叉關聯：

| 問題根源 | 資安 | 效能 | SOLID | 架構 | AI | 品質 |
|---------|------|------|-------|------|-----|-----|
| `article.ts` God Store | — | O(n) findIndex | 12+ 職責 | 450 行，分層違反 | — | fire-and-forget |
| `MainEditor.vue` 雙 AutoSave | — | 多餘 I/O | SRP 違反 | 競態條件 | — | timing hack |
| `FileService` 無防護 | CRIT-01 Path Traversal | — | DIP 違反 | W-03 跳過服務層 | — | C-01 錯誤吞掉 |
| IPC 硬編碼字串 | 型別安全消失 | — | — | W-01 常數虛設 | — | 無靜態檢查 |
| 無充分測試 | 漏洞難偵測 | — | Bug 未被攔截 | — | — | 0% coverage |
| 錯誤處理粗糙 | 攻擊難偵測 | — | — | 無統一協議 | 無 retry/fallback | C-01~C-04 |

---

## 八、結語：技術債的結構性根因

**架構師**：今天討論讓我得出一個結論——這個代碼庫的大多數問題都有同一個結構性根因：`article.ts` 承載了太多職責，導致下游每個模組都在「自救」，產生了雙計時器、直接 IPC 呼叫、自行快取等反模式。其他的點狀問題（錯誤吞掉、model 名稱錯誤、generateId 不穩定）則反映了缺乏足夠的測試文化和 code review 機制。

**程式品質工程師**：`AutoSaveService` 的測試是今天唯一被全場認可的正面範例。我建議以它為樣板，在接下來兩週為 `MetadataCacheService`、`FileScannerService`、`FileService` 補測試，這些測試加上資安工程師提出的路徑限制，會形成一道可量測的防護基線。

**SOLID 工程師**：第一步就是那兩行 bug fix。今天就做，今天就提 PR。其他的技術債需要設計，但 crash 不能等設計。

---

## 九、共識行動項（依緊急度排序）

| 優先級 | 負責專業 | 行動 | 預估工時 |
|--------|---------|------|---------|
| 🔴 **P0 - 今日** | SOLID | 修正 `computed allTags` 賦值 + `updateArticle` 方法名稱 | 30m |
| 🔴 **P0 - 今日** | AI Token | 修正 Claude model 名稱為 `claude-3-5-haiku-20241022` | 10m |
| 🔴 **P0 - 本週** | 資安 + 品質 | FileService 路徑白名單 + 保留原始 Error | 4h |
| 🔴 **P0 - 本週** | 效能 | `generateId()` 穩定化（路徑 Hash） | 1h |
| 🟠 **P1 - 本週** | 架構 | `ipc-channels.ts` 常數統一引用 | 2h |
| 🟠 **P1 - 本週** | 資安 | `markdown-it` 改 `html: false` + 安裝 DOMPurify | 2h |
| 🟡 **P2 - 次週** | 品質 | 補 `MetadataCacheService`/`FileScannerService` 測試 | 4h |
| 🟡 **P2 - 次週** | SOLID + AI | 消除 MainEditor 雙 AutoSave + Prompt 抽出共用常數 | 4h |
| 🔵 **P3 - 下 Sprint** | 架構 + SOLID | `article.ts` 拆解設計與重構 | 2週 |
| 🔵 **P3 - 下 Sprint** | 資安 | `sandbox: true` 評估與啟用 | 1週 |
