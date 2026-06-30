---
name: e2e-testing-rules
description: E2E 測試撰寫與除錯規則。新增或修改 E2E 測試前必讀，涵蓋 Electron/Playwright serial mode 的已知陷阱與防呆清單。
---

# E2E 測試規則

本規則從 `chore/update-dependencies` 修復過程中提煉，記錄 Electron 42 + Playwright serial mode 下的真實失敗模式。

## 防呆清單（新增測試時逐項確認）

- [ ] **全域 keydown handler**：新快捷鍵若與編輯器重疊（`b`/`f`/`z` 等），加 `.closest(".cm-editor")` 判斷
- [ ] **需要 app 啟動就能看到的檔案**：放 `beforeEach` fixture helper（`ensureTestArticle` 模式），不在 test body 複製後等 FileWatch
- [ ] **FileWatch 相依的斷言**：改用 `expect.poll(() => fs.readFileSync(...))` 輪詢磁碟，不用 `waitFor({ state:"visible" })` 等 UI 呈現
- [ ] **Electron 主程序 ESM**：主程序有 `"type":"module"` 時，禁止 top-level `await` 任何 Electron 非同步 API
- [ ] **Serial block 的 module-level 狀態**：`configInitialized` 等跨 retry 持久化的變數，考慮 `test.info().retry` 或 fixture 取代

---

## 已知失敗模式（7 個）

### 1. Electron 42 ESM top-level await 死鎖

**症狀**: CI 全部測試卡住，無輸出，超時被 kill。  
**原因**: `await app.whenReady()` 放在 ESM 模組最上層 → 模組評估暫停 → ready event 等模組完成 → 死鎖。  
**修法**: 改用 `app.whenReady().then(async () => { ... })`；生命週期事件移至 `.then()` 前登錄。  
**預防**: ESM 主程序禁止 top-level await 任何 Electron 非同步 API。

---

### 2. Serial mode：第一個 fail 使後續全 skip

**症狀**: CI log 顯示大量 skipped；只有第一個 failure 可見。  
**原因**: `test.describe.configure({ mode: "serial" })` — 任一測試 fail → 後續標記 skipped；retry 從第一個重新開始。  
**預防**:
- 看 CI log 時，找**第一個** FAILED，skipped 是被拖下水的受害者，不是原因。
- 各 test 操作不重疊的行（不同 line 或不同目標），避免 test N+1 依賴 test N 副作用。

---

### 3. fixture 內容與斷言不同步

**症狀**: `expect(locator, { hasText: "**bold text**" })` 找不到元素。  
**原因**: 程式 placeholder 改為繁體中文，fixture/斷言仍用舊英文。  
**預防**: 改 placeholder 後 grep 全部引用（fixture、測試、文件），同步更新。

---

### 4. 全域 keydown handler 與編輯器快捷鍵衝突導致 sidebar 狀態漂移

**症狀**: Serial 測試中，切換文章的測試等 article-tree-item 可見逾時 15s。  
**原因**: `App.vue` 全域 `Ctrl+B` → `toggleSidebar()`；CM editor 攔截 Ctrl+B 後事件仍冒泡到 window。每次測試按 Ctrl+B（粗體）都同時 toggle sidebar；奇數次後 sidebar 變 hidden，article-tree-item 不可見。  
**修法**:
```ts
if (!(e.target as HTMLElement).closest?.(".cm-editor")) {
  e.preventDefault();
  toggleSidebar();
}
```
**預防**: 全域 handler 有快捷鍵與編輯器重疊 → 必加來源判斷；測試設計上要追蹤每個 Ctrl+X 對全域 handler 的副作用。

---

### 5. Linux CI Shift+F 給 lowercase `f`

**症狀**: `Ctrl+Shift+F` 在 Linux CI 觸發全域搜尋面板而非腳註快捷鍵。  
**原因**: Linux Chromium 部分設定下 `Shift+F` 的 `event.key` = `"f"`（小寫），不是 `"F"`；全域 handler 也未排除 shiftKey。  
**修法**:
- editor: `event.key.toLowerCase() === "f"` 比對
- App.vue 全域 handler: 加 `!e.shiftKey` guard

---

### 6. FileWatch 在 Electron 42 Linux CI 延遲 > 15s

**症狀**: 測試在 test body 複製檔案後等 article-tree-item 出現逾時。  
**原因**: Linux inotify 在 Electron 42 + CI 環境可能延遲 > 15s 才觸發 FileWatch。  
**修法**: 在 `beforeEach` 的 `ensureTestArticle` 中預先複製，app reload 時初始掃描直接掃到。  
**預防**:
```ts
// ✅ 正確：beforeEach 預置，app reload 時掃到
function ensureTestArticle(vaultPath: string) {
  if (!fs.existsSync(switchTargetPath)) {
    fs.copyFileSync(src, switchTargetPath);  // 冪等
  }
}

// ❌ 錯誤：test body 複製後等 FileWatch
fs.copyFileSync(src, dst);
await otherRow.waitFor({ state: "visible", timeout: 15000 });  // FileWatch 可能 > 15s
```

---

### 7. module-level 變數跨 serial retry 持久化

**症狀**: `configInitialized = true` 在 retry #1 仍為 true，retry 不 reload，app 讀錯 vault path。  
**原因**: Playwright serial retry 在同一 worker process 執行，module-level 變數不重置。  
**預防**: Serial describe block 的 module-level 狀態若影響 `beforeEach` setup，考慮改用 `test.info().retry === 0` 判斷或 fixture-scoped 變數。

---

## `waitFor({ state: "visible" })` 使用注意

以下情境會讓 `state: "visible"` 永遠不滿足：

| 情境 | 原因 | 解法 |
|------|------|------|
| 父容器 `v-show="false"` | 子元素繼承 `display:none` | 確認父容器（sidebar、modal）一定可見 |
| `overflow-y:auto` 且元素在 fold 外 | bounding box 被 clip 為 0 | 改用 `state: "attached"` 或先 scroll |
| FileWatch 尚未更新 article store | Vue 還沒 re-render | 改用 `expect.poll` 輪詢 fs，不等 UI |
