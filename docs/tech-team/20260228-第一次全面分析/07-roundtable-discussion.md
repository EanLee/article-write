# WriteFlow 技術團隊圓桌討論記錄

**討論日期：** 2026-02-28
**形式：** 六位技術職能專家的跨領域交叉討論
**主持：** 本工作坊紀錄為各評估報告完成後的非正式技術對話

---

## 出席者

| 代號 | 職能 | 專長 | 評分 |
|------|------|------|------|
| 🔐 Alex | 資安架構師（CISSP/OSCP） | 滲透測試、安全架構 | 42/100 |
| ⚡ Betty | 效能工程師（Big-O 分析師） | 演算法、系統效能 | 58/100 |
| 🏗️ Charlie | SOLID 原則倡導者 | 物件導向設計、重構策略 | 60/100 |
| 🏛️ Diana | 系統架構師 | Electron 架構、IPC 設計 | 72/100 |
| 🤖 Evan | AI/LLM 整合架構師 | Token 效率、AI 產品化 | 42/100 |
| ✨ Fiona | 程式品質工程師 | 測試策略、技術債管理 | 61/100 |

---

## 第一回合：「你在我的報告發現了什麼？」

> 各專家對其他領域的發現提出跨領域觀察。

---

**Alex 🔐（看 Betty 的效能報告）：**

> 「Betty，妳的訂閱洩漏分析（BUG-04）讓我想到另一個問題。`fileWatchService.subscribe()` 的回傳值被丟棄，意味著所有 `loadArticles()` 呼叫都會無限累積監聽者。但更危險的是——這些監聽者每一個都在接收來自 Main Process 的 IPC 推播事件。如果我能控制 Vault 目錄中的檔案，我可以創造大量觸發事件，製造 Renderer 側的事件洪水。這不只是記憶體洩漏，這是一個 DoS 放大向量。」

**Betty ⚡（看 Alex 的資安報告）：**

> 「Alex，你指出的 `processWikiLinks()` O(L×A) 複雜度問題，我算了一下：假設文章 200 篇、平均 50 個 WikiLink，預覽每次需要 10,000 次字串搜尋。但你的 XSS 修復方案（加 DOMPurify）可能讓這個複雜度再高 10%。我建議同時修：先建 Map 把 O(L×A) 降到 O(A) 的預處理，再加 DOMPurify——這樣淨效果是效能大幅提升，安全性也到位。兩件事一起做的工時比分別做少 40%。」

**Charlie 🏗️（看 Fiona 的品質報告）：**

> 「Fiona，你說 Composables 完全無測試。在我看這個問題之前，我先分析了 `articleStore` 的七大職責。我發現了一個根本原因：因為 `articleStore` 違反了 SRP，把本該在 Composable 或 Service 裡的邏輯塞進 Store，才導致了測試的困難。Pinia Store 的測試需要 mock 更多東西。如果先把 `setupFileWatching` 抽到 Composable，測試就自然好寫了。你的技術債清單應該加上：測試困難本身是症狀，SRP 違反才是病因。」

**Diana 🏛️（看 Alex 的資安報告）：**

> 「Alex，你標記的最高危漏洞——GitService 的 RCE——我從架構角度看到了一個更深的問題。`GitService` 在 Main Process，它使用了 `child_process.exec` 並允許 shell 插值。但追溯呼叫鏈：UI → IPC → main.ts handler → GitService，整個鏈路沒有任何型別驗證閘道器。這不只是 GitService 的問題，而是 IPC 層設計上缺少了 Request Schema Validation 中間層。修了 GitService，其他 40 個 handler 仍然是同樣的問題。我們需要一個橫切面的輸入驗證層，不是個別修補。」

**Evan 🤖（看 Charlie 的 SOLID 報告）：**

> 「Charlie，你列出了 `ConverterService` 有 5 個職責。從 AI 整合角度，這個問題更嚴重。其中的 Obsidian 語法轉換邏輯（WikiLink 轉 Astro 格式），正是 AI 最需要介入的地方——比如讓 AI 判斷哪些 WikiLink 是外部可見的、哪些是私密筆記。但因為 `ConverterService` 有 5 個職責，我不知道要在裡面哪一層呼叫 AI。SRP 不只是工程美學，它是 AI 可介入性的前提。ConverterService 必須先拆，AI 才能乾淨地 plug in。」

**Fiona ✨（看 Evan 的 AI 報告）：**

> 「Evan，你的 `toAIContext()` 方法建議非常好。但我要指出一個品質問題：在你提案之前，需要先修復 `AutoSaveService.destroy()` 的型別 Bug（`"" vs {}`）。為什麼？因為如果 AI 生成完 description 並更新 frontmatter，`destroy()` 的型別錯誤會讓 `hasContentChanged()` 誤判，觸發不必要的 AI 呼叫。一個底層的型別 Bug 可能讓我們的 AI token 成本暴增 3 倍。技術債不清，AI 整合效率打折。」

---

## 第二回合：「你不同意我的什麼？」

> 各專家提出對其他職能建議的挑戰。

---

**Alex 🔐 vs Diana 🏛️：**

**Alex：** 「Diana，你說架構評分 72，是六人最高。但你沒有把 Linux `--no-sandbox` 算進去。任何 XSS 一旦發生，沒有 sandbox 就是完整的機器控制。這個配置讓整個美觀的架構崩潰。072 分的評分我覺得高估了。」

**Diana：** 「我理解你的擔憂，Alex。但 `--no-sandbox` 是 Linux Electron 的已知限制，很多應用在受控環境下都這樣設定。問題的根本是 XSS 防護，而 XSS 防護屬於安全層的問題。我的架構評分是基於架構設計的合理性，不是安全配置。但我同意修 `no-sandbox` 是 P0。我更應該在報告中標注這個交叉點。」

---

**Charlie 🏗️ vs Fiona ✨（測試優先 vs 重構優先爭論）：**

**Charlie：** 「Fiona，你建議先加測試再重構。但 `articleStore` 現在有 7 個職責，測試耦合嚴重，寫的測試本身就是糞測試。我建議先進行最小化重構（只移動邊界，不改邏輯），讓 SRP 到位後測試才有意義。」

**Fiona：** 「Charlie，你說先重構再測試——那在重構過程中如果出現 regression 呢？沒有測試保護的重構，每一步都是在走鋼索。我同意現有測試耦合嚴重，但我們可以先為『提取出去的那一塊』寫特性測試（characterization test），確認行為，然後移動，測試仍然通過，才算完成。你的方向對，但順序我不同意。」

**Charlie：** 「…好，我接受你的 characterization test 策略。這個是為了舊程式碼設計的，確實適合這個場景。我收回我的強烈反對。」

---

**Evan 🤖 vs Betty ⚡（本地 AI 硬體需求爭論）：**

**Evan：** 「Betty，我建議使用 Ollama 本地模型，llama3.2:3b 只需要 2GB RAM，大部分機器都跑得起來。」

**Betty：** 「Evan，你說的是 2GB 模型大小，但 llama3.2:3b 實際運行時需要 **4-6GB RAM**，加上瀏覽器 2GB + Electron 1GB，這個應用程式可能需要 **8-10GB RAM**。中低階 MacBook Pro 的使用者會跑 OOM。你需要加一個 AICapabilityDetector 系統，先偵測硬體規格，不符合的就降級到雲端 API 模式。」

**Evan：** 「這個批評完全準確。我需要把硬體偵測列為 Ollama 整合的前置必要條件，並提供清晰的降級路徑。謝謝你的數字提醒，效能工程師的角度是我忽略的。」

---

**Betty ⚡ vs Alex 🔐（DOMPurify 效能代價）：**

**Betty：** 「Alex，加 DOMPurify 是對的，但妳知道 DOMPurify 在長文章（5000字）的清理時間嗎？我測過，大約 15-25ms。如果渲染管線已經是 O(L×A) 的瓶頸，再加 25ms 就是慢上加慢。」

**Alex：** 「Betty，沒有 DOMPurify，XSS 一出現就是完整的 RCE。25ms 的效能代價對 Security vs. RCE 的天平來說是值得的。但你說得對，我們應該測量並記錄這個取捨，不能假設沒有影響。建議：DOMPurify 必加，加完後用 Performance API 量測，文件化此取捨。」

---

## 第三回合：共識建立

> 六位專家對最終行動建議達成的共同決議。

---

### 🔴 P0-A：GitService RCE 立即修復（預估 2 小時）

**主張者：** Alex
**支持：** 全員一致
**共識：** 將 `exec` + 字串插值改為 `execFile` + 參數陣列，並加入 Branch/Message 的白名單驗證。此修復為所有其他工作的前提安全基線。

```typescript
// 修復前
exec(`git ${operation} "${userInput}"`)

// 修復後
execFile('git', [operation, userInput], {
  cwd: validatePath(repoPath, allowedBasePaths)
})
```

---

### 🔴 P0-B：重新啟用 ESLint 三大保護規則（預估 1 天）

**主張者：** Fiona，Diana
**支持：** 全員一致
**共識：** `no-explicit-any`、`no-console`、`vue/no-v-html` 降為 `warn` 而非 `off`。同步修復所有觸發 warn 的位置，估計 60-80 個警告。這是技術債最便宜的防護升級。

---

### 🔴 P0-C：搜尋防抖 + Vue `:key` 穩定化（預估 4 小時）

**主張者：** Betty
**支持：** Charlie、Fiona
**共識：** 兩個相關問題一起修：
1. `searchQuery` 過濾加 300ms debounce，避免每次按鍵重算 `filteredArticles`
2. `generateId()` 改為確定性 Hash（`crypto.createHash('md5').update(filePath)...`），穩定 Vue `v-for :key`

---

### 🟠 P0-D：建立 `IFileSystemGateway` 封裝層（預估 3 天）

**主張者：** Charlie，Diana
**支持：** Alex、Betty、Fiona
**共識：** Renderer 進程的 `window.electronAPI` 直接呼叫全部集中到一個 Gateway 層。架構上：

```
window.electronAPI (raw IPC)
    ↓
ElectronFileSystemGateway : IFileSystemGateway
    ↓
所有 Services 和 Stores 只能透過 IFileSystemGateway
```

此改變同時解決：安全層的輸入驗證、效能層的呼叫去重、SOLID 層的 DIP 合規、架構層的分層隔離。

**Evan 備注：** 「這個 Gateway 完成後，AI 服務也可以用相同的 `IAIProvider` 介面注入，保持一致的 DI 模式。」

---

### 🟠 P0-E：定義 AI 整合前置條件（預估 2 天）

**主張者：** Evan
**支持：** Alex（安全前置）、Betty（效能考量）、Charlie（介面設計）
**共識：** 在開始任何 AI 功能前，必須完成：

```typescript
// 1. IAIProvider 介面定義
interface IAIProvider {
  generateTags(context: AIContext): Promise<string[]>
  generateDescription(context: AIContext): Promise<string>
  isAvailable(): Promise<boolean>
}

// 2. MockAIProvider（測試用）
// 3. AICapabilityDetector（硬體偵測）
// 4. MarkdownService.toAIContext() 方法
```

**Betty 條件：** 「硬體偵測必須在 AICapabilityDetector 中完成，否則 Ollama 整合可能讓低階機器 OOM。」

---

## 第四回合：未解決的分歧

> 六位專家對以下問題未能達成共識，留待下次討論。

---

### 分歧 1：ConverterService 重構範圍

**Charlie：** 「ConverterService 的 5 個職責必須全部拆開，這是完整的 SRP 合規。」
**Diana：** 「但 ConverterService 是 publish 流程的核心，大幅重構風險高。建議只分離 `ImageCopyService`，其餘留著。」
**未決：** 重構深度 vs 穩定性優先的取捨。

---

### 分歧 2：AI 整合時間線

**Evan：** 「應該在 P0 修復後立刻開始 AI PoC，2 週可以完成本地 Ollama 標籤生成。」
**Alex：** 「在所有 Critical 安全漏洞修復前不應加入新的 AI 功能表面。AI 整合應等到評分到 70+。」
**未決：** 安全合規 vs 功能演進的時間線優先順序。

---

### 分歧 3：`articleStore` 拆分策略

**Charlie：** 「一次性拆成三個 Store（CRUD / FileWatch / AutoSave）。」
**Diana：** 「建議增量拆分：先把 `setupFileWatching` 移到 Composable，觀察兩週後再決定是否繼續。」
**Fiona：** 「在拆分前先為現有行為寫 characterization tests。所有人都同意了這點，但拆的速度和深度仍有分歧。」
**未決：** 大重構 vs 增量演進。

---

### 分歧 4：Windows/macOS Electron Sandbox 政策

**Alex：** 「Linux 的 `--no-sandbox` 是必須移除的，即使需要重新設計圖形加速兼容。」
**Diana：** 「`--no-sandbox` 在某些無 user namespace 的 Linux 環境（如 Docker）是必要的。移除前需要 CI 測試矩陣確認。」
**未決：** 需要更多 Linux 環境測試資料才能決定。

---

## 各職能的「技術債比喻」

> 每位專家用一個比喻總結他們眼中的 WriteFlow 技術狀態。

| 職能 | 比喻 | 含義 |
|------|------|------|
| 🔐 Alex | **「銀行大廳裝了漂亮的警衛，但保險箱是開著的」** | 外表安全，核心 RCE 暴露 |
| ⚡ Betty | **「電梯有人在一樓手動搖曲柄——功能正常，但摩天樓就不行了」** | 效能可用但不可擴展 |
| 🏗️ Charlie | **「一個員工會十種技能，但每種都是他一人負責」** | `articleStore` 做了所有事 |
| 🏛️ Diana | **「建築結構良好，但主樑有一條看不見的裂縫（IPC 函式傳遞 bug）」** | 大部分架構健全，關鍵 bug 隱藏深 |
| 🤖 Evan | **「鋼琴工藝精湛，但沒有 MIDI 介面——無法和現代設備連接」** | 資料結構友善 AI，但缺乏整合基礎設施 |
| ✨ Fiona | **「用鉛筆寫的精美筆記本，貼滿修正液——可以看，但不能演進」** | 程式品質夠用，但無法持續迭代 |

---

## 圓桌達成共識的前五大行動（最終版）

| 順序 | 行動 | 負責職能 | 預估工時 | 解決問題 |
|------|------|---------|---------|---------|
| #1 | GitService RCE 修復（execFile 替換） | Alex 主責，Diana 協助 IPC 設計 | 2h | VULN-001 |
| #2 | 重啟 ESLint 三大保護規則 + 修警告 | Fiona 主責 | 1d | 型別安全整體 |
| #3 | 搜尋防抖 + generateId Hash 穩定化 | Betty 主責 | 4h | BUG-03, BUG-05 |
| #4 | 建立 IFileSystemGateway 封裝層 | Charlie + Diana 主責 | 3d | DIP 違反、IPC 分散 |
| #5 | 定義 IAIProvider 介面 + MockAIProvider | Evan 主責，Alex 安全審查 | 2d | AI 整合前置 |

---

## 結語

六個技術職能從不同角度看 WriteFlow，得出了一個共同結論：

**系統的核心問題不是功能缺失，而是型別安全被系統性放棄。**

- ESLint 關閉了守護型別安全的規則
- `any` 滲透了 IPC 層、Store 層、Service 層
- 型別不一致（`mtime: number vs string`）在靜默傳播

這個根本問題，導致了 Alex 看到的安全漏洞（`window.electronAPI as any`）、Betty 看到的效能問題（VM 側 `filter(keyword.length > 0)` 型別錯誤）、Charlie 看到的 DIP 違反（`ImageService` 無 IFileSystem）、Diana 看到的 IPC bug（函式型別無法序列化）、Evan 看到的 AI 整合阻力（Slug 截斷中文）、Fiona 看到的 Bug（`destroy()` 中的型別不符）。

**修好型別安全，六個職能的問題都會同步改善。**

---

*本討論記錄由六個技術職能角度的深度評估整合而成，目的是呈現不同工程文化和思考框架如何看待同一個系統，以及跨職能討論如何產生比單一視角更完整的改善策略。*
