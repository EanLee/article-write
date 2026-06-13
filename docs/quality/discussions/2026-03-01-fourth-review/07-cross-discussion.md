# 跨角色交互討論 — 第四次全面評估

**主持**: 系統架構師 Agent
**參與**: 資安、效能、SOLID、架構、品質、可維護性 Agent
**日期**: 2026-03-01

---

## 第一議題：A4-01 AppConfig 型別分裂

**資安工程師**: 這個問題的資安影響不明顯，但它導致 `stores/config.ts` 有 TypeScript 錯誤，間接損害了型別系統的可信度。如果開發者習慣忽略 TS 錯誤，未來真正的型別安全問題也會被忽視。

**品質工程師**: 我把這個列為最高優先。12 個 TypeScript 錯誤中，有 3 個直接由 `AppConfig` 型別分裂造成（`config.ts` 錯誤 + 衍生錯誤）。修正策略很清楚：在 `types/index.ts` 中將 `EditorTheme = "light" | "dark"`（字面型別），就能消除不相容。

**SOLID 架構師**: 根源不只是型別，是**單一來源原則（SSoT）違反**。Zod schema 在 `src/main/`，但 renderer 注入的型別在 `src/types/`。理想上 Zod schema 應是唯一來源，`types/index.ts` 的 `AppConfig` 應 `import type` 自 schema 的 infer 結果。但這樣 preload 的 `rootDir` 限制會阻止 renderer 端引入 `src/main/` 的型別。

**架構師**: 對，這是 Electron 特有的挑戰──main process 的型別無法直接共享給 renderer（`tsconfig.preload.json` 的 `rootDir` 限制）。解法是在 `src/types/` 層建立橋接型別，或建立獨立的 `shared/` 目錄讓兩端都能引入。

**共識**: 短期修正：統一 `EditorTheme = "light" | "dark"` 字面型別。長期：評估建立 `src/shared/` 目錄存放跨 process 共享型別。

---

## 第二議題：S4-01 SearchPanel v-html XSS

**資安工程師**: 這是 CRIT-02 修正的一個遺漏邊界。`highlightKeyword()` 的 escape 邏輯很好，但條件分支的 `false` 分支直接 `v-html="result.title"` 沒有 escape——開發者可能以為 title 是安全的純文字，但如果 Markdown frontmatter 的 title 包含 HTML 標籤（`<script>`），就會注入。

**效能工程師**: 修正的性能成本幾乎為零——無論是讓 `highlightKeyword` 接受空 keyword 時直接 escape 返回，或是改用 `:textContent`（Vue 的 v-text），都比 v-html 更快（跳過 HTML 解析）。

**品質工程師**: 我認為最乾淨的修正是讓 `highlightKeyword` 在空 keyword 時也 escape 並返回：
```typescript
function highlightKeyword(text: string, keyword: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
  if (!keyword.trim()) { return escaped } // 空 keyword 直接返回 escaped
  // ... 後續 mark 插入邏輯
}
// Template 統一使用 highlightKeyword（不再有兩條路徑）
v-html="highlightKeyword(result.title, searchStore.query)"
```

**可維護性工程師**: 這樣修正後，template 的 `v-html` 綁定變得更一致，不再有「選中/未選中」兩種不同的值。程式碼更易讀。

**共識**: 修正 `highlightKeyword` 接受空 keyword 時返回 escaped text，template 移除三元運算子，統一使用 `highlightKeyword()`。難度低，安全性提升顯著。

---

## 第三議題：S4-02 exists()/checkWritable() 路徑驗證缺失

**資安工程師**: 風險是路徑枚舉，不是任意讀取。攻擊者透過這兩個方法可以判斷系統路徑是否存在，洩漏目錄結構。修正只需 2 行（各加 `this.validatePath()`）。

**效能工程師**: `validatePath()` 是同步操作（純路徑字串計算，無 I/O），效能影響為零。

**SOLID 架構師**: 這個問題也反映了 `validatePath` 不是在 class 層面統一攔截（AOP 模式），而是在每個方法手動呼叫。強烈建議修正後，加入一個 **private 方法checklist** 的 JSDoc 注釋，說明哪些公開方法必須呼叫 `validatePath`：
```typescript
/**
 * ⚠️ 所有接受 filePath/dirPath 參數的公開方法必須呼叫 this.validatePath()
 * 包含：readFile, writeFile, deleteFile, copyFile, readDirectory,
 *        createDirectory, getFileStats, exists, checkWritable
 */
```

**共識**: 立即修正 `exists()` 與 `checkWritable()`，並加入 JSDoc 提醒未來開發者遵守規範。

---

## 第四議題：FileService.startWatching 清除 Callbacks 的潛在回歸

**SOLID 架構師**: `startWatching` 呼叫 `stopWatching` 清除所有 callbacks 是 A-02 pub-sub 升級後的設計回歸。若未來有第二個呼叫 `addWatchListener` 的功能，`startWatching` 被再次觸發時將靜默清除另一方的訂閱。

**效能工程師**: 目前只有 `main.ts` 的單一調用點，所以沒有觸發。但預防性修正代價低。

**可維護性工程師**: 文件注釋說「若已有不同監聽路徑的監聽器，先停止舊監聽器」，但 `stopWatching` 也清除了 `addWatchListener` 加入的訂閱——文件與行為不一致。建議分離語義：
- `startWatching` 負責 watcher 生命週期
- `stopWatching` 只關 watcher，不清 callbacks
- 讓 callback unsubscribe 函式各自管理自身

**資安工程師**: 這個改動不影響安全性，但有助於系統可靠性。

**共識**: 修改 `stopWatching` 只關閉 watcher（`watcher.close(); watcher = null;`），不清空 `watchCallbacks`。訂閱者透過各自的 unsubscribe 函式管理退訂。

---

## 第五議題：TypeScript 零錯誤目標

**品質工程師**: 12 個 TypeScript 錯誤中：
- **4 個**可立即修正（Frontmatter.date + electron.d.ts 補完）
- **3 個**需要 AppConfig 型別統一（中等難度）
- **5 個**是已知設計決策（ArticleFilterStatus 強制轉型、status 未用）

**資安工程師**: 我關注的是 TS 錯誤的「噪音效應」——當開發者習慣看到紅字時，真正的型別安全違反也會被忽視。

**可維護性工程師**: 建議設立「TypeScript 零錯誤 Sprint」，集中清除這 12 個錯誤。預計工時：2-4 小時。

**架構師**: 同意設立清零目標。建議按以下順序修正：
1. `Frontmatter.date` 型別補充（最低風險，4 個錯誤）
2. `electron.d.ts` 補完（4 個宣告缺失）
3. `EditorTheme` 型別統一（3 個錯誤）
4. `status` 未用變數、`err` 隱式 any（細節清理）

**共識**: 設立 TypeScript 零錯誤為下一個 sprint 的高優先目標。

---

## 整體評分矩陣

| 角色 | 第三次評分 | 第四次評分 | 趨勢 |
|------|-----------|-----------|------|
| 🔒 資安 | 7/10（推估）| **7.5/10** | ⬆️ |
| ⚡ 效能 | 7/10（推估）| **8.5/10** | ⬆️⬆️ |
| 🏗️ SOLID | 7.5/10（推估）| **8/10** | ⬆️ |
| 🗺️ 架構 | 7.5/10（推估）| **7.5/10** | ➡️ |
| 🔍 品質 | 6/10（推估）| **6.5/10** | ⬆️ |
| 🔧 可維護性 | 8/10（推估）| **8/10** | ➡️ |
| **加權平均** | **7.2/10** | **7.7/10** | ⬆️ |

> **加權方式**: 資安×1.3、效能×1.0、SOLID×1.0、架構×1.1、品質×1.1、可維護性×1.0

---

## 共同建議優先序

| 優先 | 問題 | 涉及報告 | 預估工時 |
|------|------|---------|---------|
| P0 | S4-01 SearchPanel v-html XSS | 資安、品質 | 30分鐘 |
| P0 | S4-02 exists()/checkWritable() validatePath | 資安 | 15分鐘 |
| P1 | A4-01/SOLID4-01 AppConfig 型別統一（EditorTheme）| 架構、SOLID、品質 | 1-2小時 |
| P1 | Q4-新 electron.d.ts 宣告補完 | 品質 | 1小時 |
| P1 | Q4-新 Frontmatter.date 型別補充 | 品質 | 15分鐘 |
| P2 | SOLID4-02 FileService.stopWatching 語義修正 | SOLID、可維護 | 30分鐘 |
| P2 | A4-02 electron.d.ts getFileStats.mtime 型別 | 架構、品質 | 15分鐘 |
| P3 | Q4-T01 FileService 路徑驗證測試 | 品質 | 2小時 |
| P3 | Q4-T02 Zod schema 測試 | 品質 | 1小時 |
| Backlog | M-01 中英文注釋統一 | 可維護 | 長期 |
| Backlog | M-07 store 過度耦合 | SOLID、架構 | 長期 |

---

## 全體總結

WriteFlow 在四輪技術評審中展現了**穩定的品質上升軌跡**。從第一次評審的多個 CRITICAL 資安問題，到第四次的主要是型別一致性與測試覆蓋的改善建議，顯示了工程品質的整體成熟。

**本次評審最重要的發現**:
1. **S4-01（SearchPanel XSS）**：3 輪修正後仍有 1 個 XSS 邊界條件被遺漏，需要立即修正
2. **AppConfig 型別分裂**：新引入的 Zod schema 造成型別體系中的 SSoT 違反，需要架構修正
3. **TypeScript 零錯誤**：12 個持續存在的 TS 錯誤應設立清零目標

**最可慶祝的成就**:
- CRIT-01（路徑穿越 CVSS 8.8）：完全修復，設計嚴謹
- IPC 架構：ipc-channels.ts 是業界標準實踐
- filteredArticles O(n) 優化：算法改善顯著
- 四輪評審文件體系：專案具備良好的工程文化

---

*第四次全面評估 — 跨角色交互討論 | 前次: [第三次評估](../2026-03-01-third-review/07-cross-discussion.md)*
