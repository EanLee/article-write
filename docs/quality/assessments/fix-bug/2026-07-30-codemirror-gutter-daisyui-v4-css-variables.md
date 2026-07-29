---
title: CodeMirror 編輯器 gutter/行號/當前行樣式因引用已不存在的 DaisyUI v4 CSS 變數而完全失效
date: 2026-07-30
status: fixed
branch: fix/codemirror-daisyui-v5-css-variables
---

## 問題描述

**現象**：`CodeMirrorEditor.vue` 的 `EditorView.theme()` 內，gutter 背景色、gutter 右邊框、行號顏色、當前行/當前行 gutter 反白，全部應該要跟著 DaisyUI 主題色顯示，但實際上看起來像是完全沒套用主題（gutter 透明、行號與邊框是瀏覽器/CodeMirror 的預設灰色）。

**重現步驟（已用 Playwright 實際啟動 Electron App + `getComputedStyle` 量測，非讀程式碼推論）**：
1. 開啟任一文章，讓 `CodeMirrorEditor` 掛載
2. 於真實 Electron 視窗中執行 `getComputedStyle(document.querySelector(".cm-gutters"))` 與 `getComputedStyle(document.querySelector(".cm-lineNumbers .cm-gutterElement"))`
3. **修復前實測結果**：
   ```json
   {
     "gutterBackground": "rgba(0, 0, 0, 0)",
     "gutterBorderRight": "rgb(108, 108, 108)",
     "lineNumberColor": "rgb(108, 108, 108)"
   }
   ```
   `gutterBackground` 完全透明（樣式宣告被瀏覽器判定為無效值而整條 declaration 被忽略，退回初始值）；`gutterBorderRight` 與 `lineNumberColor` 皆為同一個固定灰階 `rgb(108, 108, 108)`，是 CodeMirror 自身的預設樣式，不是任何 DaisyUI 主題色（代表兩處自訂樣式宣告也同樣失效）。

## 原因分析

**根本原因（完整呼叫鏈）**：

```
CodeMirrorEditor.vue 的 extensions() → EditorView.theme({ ".cm-gutters": { background: "oklch(var(--b2))" }, ... })
  → CSS 宣告值引用 CSS 自訂屬性 --b2 / --bc / --p
  → 這三個變數名稱屬於 DaisyUI v4 的命名慣例（v4 用 --b1/--b2/--bc/--p 等儲存「未包裝的 OKLCH 分量」，需要外層再包一層 oklch()）
  ← 但本專案 package.json 安裝的是 daisyui@5.6.3；v5 已將變數改名為 --color-base-200 / --color-base-content / --color-primary，且變數值本身就是完整的 oklch(...) 顏色字串，不再需要外層 oklch() 包裝
  ← --b2 / --bc / --p 在 v5 下根本不存在 → var(--b2) 解析為空值 → oklch(var(--b2)) 整體是無效的 CSS 值 → 瀏覽器直接忽略該條 declaration ← 根本原因
```

已用 DaisyUI 官方文件（Context7 `saadeghi/daisyui` v5 遷移頁）核對變數命名變更，並用上述實測結果（`gutterBackground` 為透明、另兩處退回 CodeMirror 自身預設灰色）直接驗證：這不是「顏色選得不好看」，而是變數名稱從一開始就對應不到任何值，樣式從未生效過。

**候選方案盤點**：
1. 保留 `oklch(var(--bc))` 寫法，另外在 `src/style.css` 補回 DaisyUI v4 的 `--bc`/`--b2`/`--p` 變數定義
2. 直接把 `CodeMirrorEditor.vue` 內的變數名稱與包裝方式改成 DaisyUI v5 的寫法

**排除方案 1**：這等於在 v5 專案裡另外維護一份 v4 相容變數命名，且日後其他元件若複製這段程式碼，仍會延續錯誤慣例（`src/components/PreviewPane.vue` 先前的樣式問題也是同源的「未接上主題系統」，見同日 `2026-07-30`「Preview 文章渲染樣式改用 DaisyUI 語意色彩」的修復）。採用方案 2。

## 修正方式

**修改檔案**：`src/components/CodeMirrorEditor.vue`（`extensions()` 內的 `EditorView.theme({...})`）

- `.cm-gutters`：`background: oklch(var(--b2))` → `background: var(--color-base-200)`；`borderRight: oklch(var(--bc) / 0.1)` → `borderRight: 1px solid color-mix(in srgb, var(--color-base-content) 10%, transparent)`
- `.cm-lineNumbers .cm-gutterElement`：`color: oklch(var(--bc) / 0.4)` → `color: color-mix(in srgb, var(--color-base-content) 40%, transparent)`
- `.cm-activeLine`：`backgroundColor: oklch(var(--p) / 0.05)` → `color-mix(in srgb, var(--color-primary) 5%, transparent)`
- `.cm-activeLineGutter`：`backgroundColor: oklch(var(--p) / 0.1)` → `color-mix(in srgb, var(--color-primary) 10%, transparent)`；`color: oklch(var(--p))` → `var(--color-primary)`

DaisyUI v5 的顏色變數本身已是完整 `oklch(...)` 顏色值，不含透明度分量拆分，因此原本用 `oklch(var(--x) / 0.1)` 疊加透明度的寫法在 v5 下無法沿用；改用 `color-mix(in srgb, var(--color-x) N%, transparent)` 產生等效的淡色效果。

**為何有效（實測驗證，非推論）**：修復後重新 build 並用同一支 Playwright 腳本重新量測：

```json
{
  "gutterBackground": "oklch(0.98 0 0)",
  "gutterBorderRight": "color(srgb 0.0937781 0.0938005 0.105842 / 0.1)",
  "lineNumberColor": "color(srgb 0.0937781 0.0938005 0.105842 / 0.4)"
}
```

`gutterBackground` 變成有效的 `oklch(...)` 顏色（對應 `--color-base-200` 實際值），另兩處也變成帶正確 alpha 的有效顏色，不再是 CodeMirror 的預設灰色，證實樣式確實生效。

**替代方案（已評估、未採用）**：用 Tailwind `@apply` 搭配 daisyui 產生的 utility class。因為 `EditorView.theme()` 是在 JS 內組出 CSSObject 交給 CodeMirror 動態插入 `<style>`，並非 Vue SFC 的 `<style>` 區塊，Tailwind 的 build-time `@apply` 轉譯不會處理這裡，故直接使用執行期就能解析的 CSS 變數與 `color-mix()` 較合適。

**影響範圍**：僅 `CodeMirrorEditor.vue` 的編輯器 gutter/行號/當前行樣式；不影響編輯器功能邏輯、不影響 Preview 面板（Preview 已於同日另一分支獨立修復）。

**測試**：`pnpm run test` 683 個既有測試全數通過（此變更純為 CSS 值，既有測試未針對 computed style 斷言，故無新增/變動的既有測試案例）；根因重現與修復驗證皆以 Playwright 啟動真實 Electron App、量測 `getComputedStyle` 完成（見上方兩段實測 JSON），未使用 jsdom 單元測試（jsdom 的 CSSOM 對 `oklch()`/`color-mix()`/自訂屬性無效值的處理不保證與真實 Chromium 一致，故此類「CSS 變數是否解析成功」的驗證改用真實瀏覽器環境更可靠）。
