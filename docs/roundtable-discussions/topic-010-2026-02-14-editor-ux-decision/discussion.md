# 圓桌會議 #010：Editor UX 改善決策

> **日期**: 2026-02-14
> **主題**: UX-02 編輯器 UX 升級技術選型決策
> **觸發**: #009 Action Item #3 技術選型評估完成，進入決策階段
> **參考文件**: `docs/tech-team/2026-02-14-editor-ux-tech-eval.md`
> **出席**: Alex（PM）、Jordan（User）、Taylor（CTO）、Sam（Ops）、Lisa（Marketing）

---

## 背景與前情提要

圓桌 #009 確認了 Jordan 在使用 WriteFlow 編輯器時的痛點，並列出 UX-02（編輯器 UX 改善）Action Item。Taylor 隨後完成技術選型評估，評估四個方案：

- **CodeMirror 6**：功能完整、與 Obsidian 同源，但整合成本 2~3 週
- **Monaco Editor**：排除（Bundle 2MB+ 不可接受）
- **Milkdown**：不優先（WYSIWYG 模式與 source mode 場景不符）
- **強化現有 `<textarea>`**：1~2 天快速改善 Jordan 最痛的三個功能

Taylor 提議「分兩步走」：先強化 textarea，再遷移 CodeMirror 6。

---

## 討論記錄

### Part 1：確認 Jordan 的具體痛點

**Alex（PM）**：Jordan，我們先確認一下，目前編輯器最讓你不舒服的是哪幾個？評估文件列了七項缺失，但你實際寫作時最常碰到的是哪些？

**Jordan（User）**：最煩的三個，按照頻率排：
1. 打了 `**` 之後沒有自動補全，我還要手動移游標到中間才能開始打字，很打斷思路
2. 選了一段文字想加粗，要先打 `**`、再移動游標、再打 `**`——Obsidian 裡我選取後直接按 `*` 就包裹了
3. Tab 鍵沒辦法縮排清單，只能用空格手動對齊，然後 Shift+Tab 退縮也不行

行內語法高亮和多游標這種我知道比較難，我退一步，先把這三個做好就差很多了。

**Alex**：好，這三個正好是 Taylor 評估說可以在現有 textarea 上做的功能，而且他估算 1~2 天可以完成。Taylor，確認一下工作量？

**Taylor（CTO）**：是的，我再細看了一下：
- 括號與符號自動補全（`**` → `**|**`）：約 4 小時
- Tab 縮排 / Shift+Tab 反縮排：約 4 小時
- 選取後輸入符號直接包裹：約 4 小時

三項合計約 1.5 天。這些全部在 `EditorPane.vue` 的 `handleKeydown` 中擴充，不動架構，不引入依賴。

---

### Part 2：分兩步走策略辯論

**Lisa（Marketing）**：我有個問題——我們現在做的是修修補補，而不是真正解決問題。如果 CodeMirror 6 才是長期方向，為什麼不直接做？這樣我們可以對外宣傳「完整的 Obsidian 相容編輯器」，而不是「比上一個版本好一點的 textarea」。

**Taylor**：Lisa，我理解你的想法，但先說一個現實：CodeMirror 6 的整合不是 3 週就能保證穩定的。它有一套 Extension API，你要把我們現有的 ObsidianSyntaxService 整個重寫成 CodeMirror Extension，中間有很多踩坑的空間。如果搞砸了，Jordan 的問題反而更嚴重——整個編輯器可能有各種奇怪 bug。

**Sam（Ops）**：Taylor 說得有道理。從維運和穩定性的角度，我比較傾向「可預期的改動」。Taylor 說的三項 keydown 改動，影響範圍就是鍵盤輸入的處理，出了問題很容易 rollback。CodeMirror 6 的遷移是一次大手術，風險要管理好。

**Jordan**：我同意 Taylor 的兩步走。我現在最需要的是這三個東西可以用，不是等 3 週才看到效果。如果 CodeMirror 6 做好了更好，但我不想因為在等它而繼續用現在這個難用的編輯器。

**Alex**：好，我整理一下共識：第一步的商業理由是**立即降低 Jordan 的使用摩擦**，第二步的技術理由是**長期給語法高亮和多游標提供基礎**。兩步走策略沒有爭議，問題是時間表。

---

### Part 3：時間表決策

**Alex**：我的問題是：第一步（強化 textarea）排在什麼時候？

**Taylor**：可以現在就開始，今天就能排進 Sprint。第二步（CodeMirror 6）我建議放在 v0.2 後半，等 v0.2 前半的核心功能穩定後再開始，估計需要 3~4 週。

**Alex**：v0.2 前半的目標是什麼？我要確認 UX 強化不會擠掉更重要的事。

**Taylor**：v0.2 前半我的建議是：
1. Editor UX 強化（textarea 三項）—— 1.5 天
2. feature/fix-preview-ux 的 CSS-01 inline code 問題（已修復，待確認合併）
3. AutoSave BUG-01（已修復）
4. 之前 Jordan 回報的 Preview 圖片問題（UX-03/04，已修復）

這四個都已完成或幾乎完成，v0.2 前半重點就是讓 Jordan 有個順暢的「寫作 → 預覽」體驗。

**Lisa**：我可以接受，但 CodeMirror 6 的時間點要確認好。v0.3 嗎？

**Taylor**：如果 v0.2 前半如期完成，CodeMirror 6 排在 v0.2 後半是合理的。v0.3 再看情況。

**Jordan**：CodeMirror 6 何時做對我倒不是最急——我只要先把三個功能做出來，再說。

**Sam**：我比較關心的是 CodeMirror 6 遷移時的策略。Taylor，你有想過怎麼做到無痛遷移嗎？

**Taylor**：有。我的計畫是 Adapter 模式——先讓 CodeMirror 6 包裝成一個 Vue 組件，對外 API 與現在的 `EditorPane.vue` 完全相同（`v-model:content`、`@keydown` 等），這樣上層的 `MainEditor.vue` 幾乎不用動。遷移期間可以加一個 feature flag 讓兩個實作並存，確認穩定後再移除舊 textarea 版本。

**Sam**：這個方案我支持。feature flag + Adapter 模式，出問題可以立即切回去。

---

### Part 4：功能優先級確認

**Alex**：我們來確認一下 UX-02 的功能範圍。第一步做哪三個？

**Jordan（User）**：確認：
1. 符號自動補全——`**` 打出去自動變 `**|**`，游標在中間；`(` 自動補 `)`；`[` 自動補 `]`；`` ` `` 自動補 `` ` ``
2. 選取後符號包裹——選取文字後輸入 `*`、`**`、`_`、`` ` `` 直接包裹
3. Tab / Shift+Tab 縮排——在清單中按 Tab 縮進一級，Shift+Tab 退一級

**Taylor**：這三個我都能做。有一個細節要確認：符號自動補全的範圍，要包含 `**` 嗎？因為 `**` 是兩個字元，需要特別處理。

**Jordan**：要，`**` 是我最常用的，一定要有。

**Taylor**：了解，這個可以做。我的實作是：偵測到輸入 `*` 時，如果後面緊接著又輸入 `*`，就把兩個 `*` 替換成 `****`，游標放到中間。

**Alex**：好。三個功能確認，第一步的驗收條件？

**Jordan**：
- 打 `**` 游標自動在中間，不需要手動移動
- 選取文字按 `*` 直接包成 `*selected*`
- 在 markdown 清單裡 Tab 可以縮排

---

### Part 5：Lisa 的行銷視角

**Lisa**：既然這樣，我有個建議。這三個功能其實是「Obsidian-like 編輯體驗」的一部分。等 CodeMirror 6 也完成之後，我們可以做一個「WriteFlow Editor vs textarea 時代」的前後對比，作為 Product Hunt 的一個賣點。

**Alex**：這個想法不錯，但不急。我們先把功能做好，行銷的事等 v0.2 發布後再規劃。

**Lisa**：好，我先列入待辦。

---

## 結論與 Action Items

### 決策

| # | 決策 | 結果 |
|---|------|------|
| D-01 | 兩步走策略（先強化 textarea，再 CodeMirror 6）| ✅ 全票通過 |
| D-02 | 第一步三個功能（自動補全、符號包裹、Tab 縮排）立即排入 Sprint | ✅ 通過 |
| D-03 | CodeMirror 6 排入 v0.2 後半，明確 Adapter 模式遷移策略 | ✅ 通過 |
| D-04 | Monaco、Milkdown 正式排除 | ✅ 確認 |

### Action Items

| # | 項目 | 負責人 | 完成條件 | 期限 |
|---|------|--------|----------|------|
| AI-01 | 實作 Editor 符號自動補全（`**`、`*`、`_`、`` ` ``、`(`、`[`） | Taylor | Jordan 驗收通過 | 本週 |
| AI-02 | 實作選取後符號包裹功能 | Taylor | Jordan 驗收通過 | 本週 |
| AI-03 | 實作 Tab / Shift+Tab 縮排功能 | Taylor | Jordan 驗收通過 | 本週 |
| AI-04 | 合併 feature/fix-preview-ux 到 develop（已完成，待確認） | Alex | Merge 完成 | 今日 |
| AI-05 | 規劃 CodeMirror 6 遷移方案（Adapter 模式 + feature flag 設計） | Taylor | 文件完成 | v0.2 後半啟動前 |

---

**圓桌狀態**: ✅ 結論明確，進入執行階段
