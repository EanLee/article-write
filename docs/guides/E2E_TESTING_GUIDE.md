# E2E 測試指南（Electron + Playwright）

> **建立日期**: 2026-06-13
> **緣由**: topic-020 儲存機制驗收期間，E2E 除錯因方法錯誤耗費大量時間與 token。
> 本指南記錄踩過的坑與正確做法，**撰寫或除錯 E2E 前必讀**。

---

## 一、除錯工作流程（省 token 鐵則）

### ❌ 錯誤做法（曾犯過的錯）

- 盲跑全套 E2E（每輪 build + Electron 啟動約 3~7 分鐘）→ 從 Playwright 表層錯誤訊息**猜**原因 → 改 → 再跑全套
- 只看「locator 等不到」這種表層訊息，不看 app 端發生了什麼
- 在測試碼內反覆生成測試資料內容字串

### ✅ 正確做法

1. **只跑失敗的單一測試**：`npx playwright test <spec> -g "測試名稱片段"`（30 秒~2 分鐘級）
2. **先讀 app log 再下判斷**：fixture 已自動捕捉 renderer console 到
   `test-results/renderer-console.log`——失敗時先看這裡（例：`File conflict detected`
   一行就直接定位了猜測四輪都沒找到的根因）
3. **解析測試報告用 sandbox**（ctx_execute），不把原始 JSON 拉進對話
4. **測試資料用 fixtures 模板複製**：固定內容放 `tests/e2e/fixtures/*.md`，
   測試以 `fs.copyFileSync` 複用，不在測試碼內生成
5. 修好後才跑該 spec 全部 → 最後跑 `pnpm run test` 全套 unit

---

## 二、Electron E2E 已知陷阱與對策

### 陷阱 1：每測試 reload 會與 beforeunload 對話框競態卡死

**現象**：`page.reload: Timeout 30000ms exceeded`，間歇性、且總是發生在「前一個測試留有未儲存編輯」之後。

**原因**：[App.vue](../../src/App.vue) 的 `beforeunload` 在 `hasUnsavedChanges()` 時觸發確認對話框；
Playwright Electron 的 dialog 自動接受與 reload 導航存在競態，會讓 reload 永遠等不到 `load`。

**對策**：
- **不要每測試 reload**。設定 vault 路徑＋reload 只在 worker 初始化做一次（用 flag 控制）
- beforeEach 寫成**冪等**的「確保目標文章開啟」：以內容錨點行是否可見判斷，未開啟才點擊文章列
- fixture 的 dialog handler 必須 `dialog.accept().catch(() => {})`——accept 可能因對話框已自行關閉而 reject，未捕捉的 rejection 會讓同 worker 的下一個測試直接失敗

### 陷阱 2：依賴 FileWatch 偵測新檔案不穩定

**現象**：測試中寫入新 `.md` 檔，等待 `article-tree-item` 出現逾時（有時成功有時失敗）。

**對策**：主要測試流程共用**一篇**在初始掃描就存在的文章；
真的需要動態新增檔案的測試（如切換文章測試）保持單一、不要多個測試都依賴此機制。

### 陷阱 3：共用文章時測試互相干擾

**對策**：
- `test.describe.configure({ mode: "serial" })` 明確宣告順序
- **各測試操作互不重疊的行**（用填充段落行分配給不同測試）
- 會改變標題結構的測試必須 toggle 回原狀（大綱測試依賴標題數量）

### 陷阱 4：CodeMirror 6 虛擬化——畫面外的行不在 DOM

**現象**：`.cm-line` locator 對長文件底部的行 resolve 到 0 個元素。

**對策**：測試操作的目標行必須位於初始可視範圍內；
需要驗證滾動的測試（大綱跳轉）改驗證 `.cm-scroller` 的 `scrollTop` 變化＋目標行進入可視。

### 陷阱 5：UI 顯示成功不等於磁碟正確

**教訓**：「UI 顯示已儲存」與「磁碟內容正確」是兩件事（topic-020 的核心 bug 正是 UI 對、磁碟錯）。

**對策**：落盤類測試必須 `expect.poll(() => fs.readFileSync(...))` 驗證實際檔案內容；
驗證前先斷言編輯器內狀態正確，以區分「編輯器錯誤」與「儲存路徑錯誤」。

---

## 三、儲存機制相關背景（topic-020 決議後的架構）

E2E 涉及儲存行為時，必須知道以下事實：

1. **單一儲存路徑**：Ctrl+S 只由 MainEditor 的 `useEditorShortcuts` 處理。
   `SaveStatusIndicator` 曾有重複的全域 window keydown（每按一次觸發兩筆並行儲存＝資料毀損根因之一），已移除，**不得復活**。
2. **per-file 儲存佇列**：`ArticleService.saveArticle` 對同一檔案序列化寫入（根治 TOCTOU）。
3. **own-write 豁免**：衝突偵測對「磁碟內容＝自己上次寫入」不視為衝突
   （否則佇列中前一筆自己的寫入會讓後一筆誤判衝突）。
4. **編輯器內容即時同步 store**：`updateCurrentArticleContent`——所有儲存路徑取得的都是編輯器當前內容。
5. **frontmatter 全欄位保留**：`generateFrontmatter` 序列化所有已定義欄位（曾為白名單，會丟棄
   `pubDate`/`created`/`draft` 與自訂欄位＝資料毀損根因之二），**新增欄位不需要改序列化邏輯**。
6. **開檔移轉回寫**：含舊欄位（`date:`）的文章開啟時會非同步移轉並回寫磁碟（topic-007）——
   測試資料若含 `date:` 欄位，存檔後會變成 `pubDate`/`created`，斷言須以移轉後格式為準。

---

## 四、fixture 基礎設施

| 檔案 | 用途 |
|------|------|
| `tests/e2e/helpers/electron-fixture.ts` | App 啟動/關閉、dialog 自動接受、**renderer console 捕捉**（`test-results/renderer-console.log`） |
| `tests/e2e/fixtures/*.md` | 測試文章模板（`fs.copyFileSync` 複用） |

新增 E2E spec 時沿用以上基礎設施，不要自建平行機制。

---

## 五、檢查清單（撰寫新 E2E 前）

- [ ] 測試資料來自 `fixtures/` 模板複製，不在測試碼生成
- [ ] 不使用每測試 reload；beforeEach 為冪等開啟
- [ ] 目標行在初始可視範圍內（或先滾動）
- [ ] 各測試操作的行互不重疊
- [ ] 落盤驗證用 `expect.poll` 讀實際檔案
- [ ] 除錯時：單測 `-g` → 讀 `renderer-console.log` → 修 → 單測 → 全 spec → 全 unit
