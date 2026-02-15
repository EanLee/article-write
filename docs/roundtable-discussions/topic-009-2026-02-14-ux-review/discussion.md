# WriteFlow 圓桌會議 #009 — 編輯器 UX 體驗問題

> **會議日期**: 2026-02-14
> **會議類型**: 問題診斷會議
> **會議編號**: #009
> **參與者**: Jordan (User)、Taylor (CTO)、Alex (PM)、Lisa (Marketing)、Sam (Ops)
> **主持人**: Alex Chen（PM）
> **觸發原因**: Jordan 完成端對端驗收後，回報三項明確的體感不佳問題

---

## 📋 會議議程

1. **Jordan 問題陳述** — 說明三個實際遇到的問題
2. **Taylor 技術診斷** — 分析根本原因
3. **各角色討論** — 優先級與改善方向
4. **收斂決策**

---

## 🎯 Part 1：問題陳述（Jordan, User）

**Jordan**：謝謝大家讓我先說。我剛裝完跑了一遍，核心功能都到位——文章能發出去，這我很滿意。但有三個地方讓我用起來很不舒服，說實話，如果這三個問題不修，我日常工作還是會繼續用 Obsidian 直接開，不會切換到 WriteFlow 來寫。

**第一個問題：Preview 有問題。**
我在左邊打字，右邊的預覽不是我預期的樣子。有些語法沒渲染，或者排版跑掉。我不知道我寫出去的文章長什麼樣，等於盲飛。

**第二個問題：文字輸入的 UX 遠不如 Obsidian。**
Obsidian 輸入時很滑順——括號自動補全、Tab 鍵縮排、Markdown 語法有即時視覺提示。WriteFlow 現在感覺就是一個普通的 `<textarea>`，少了那些小細節，手感差很多。

**第三個問題：看不到圖片。**
我文章裡面有 `![[screenshot.png]]` 的語法，預覽區應該要顯示圖片，現在完全空白。我不知道圖片有沒有正確引用，只能靠信仰。

這三個加在一起，體感非常差。

---

## 🔍 Part 2：技術診斷（Taylor, CTO）

**Taylor**：Jordan 說得很具體，我逐一技術分析。

**Preview 問題：**
我們的預覽引擎用的是 `markdown-it` 加上一系列 plugin。問題可能出在幾個地方：一、部分 Obsidian 專屬語法（如 `[[wikilink]]`、callout block）沒有對應的 plugin 處理；二、CSS 樣式沒有正確套用到預覽區，造成排版異常；三、預覽是否有 debounce 問題導致不同步。需要實際列出哪些語法壞掉才能精確診斷。

**編輯器 UX 問題：**
這個我要直說——我們現在的 `EditorPane.vue` 就是一個原生的 `<textarea>` 包了一層 CSS。括號自動補全、Tab 縮排、語法高亮這些都沒有做。Obsidian 底層用的是 CodeMirror 6，那是一個完整的程式碼編輯器框架，功能豐富。我們要達到同等體驗，選項有三個：一、繼續用 `<textarea>` 手工補這些功能，工作量大且容易出 bug；二、引入 CodeMirror 6，學習曲線高但長期可維護；三、引入更輕量的方案如 `prosemirror` 或直接用現成的 Markdown 編輯器元件。這是個技術選型決策，不是小改。

**圖片預覽問題：**
`![[screenshot.png]]` 是 Obsidian 語法，我們的 `ObsidianSyntaxService` 會在**發布時**轉換這個語法，但**預覽時**並沒有走這條路徑。預覽區直接吐給 `markdown-it` 渲染，而 `markdown-it` 不認識 `![[...]]`，所以圖片空白。根本原因是：預覽 pipeline 和發布 pipeline 是兩條獨立的路，預覽沒有套用 Obsidian 語法轉換。這個相對明確，可以修。

---

## 💬 Part 3：各角色討論

**Alex**：我來整理一下。這三個問題的技術難度和影響範圍不一樣。Taylor，你覺得哪個最快能修？

**Taylor**：圖片預覽最明確，把 `ObsidianSyntaxService` 的圖片路徑轉換邏輯接進預覽 pipeline，工作量估計半天到一天。Preview 的 CSS 和語法問題是中等，需要列清楚哪些語法壞掉再逐一修。編輯器 UX 是大工程，不是一個 Sprint 能做完的事。

**Lisa**：我補充一點。WriteFlow 的定位是「讓 Obsidian 用戶無痛發布到 Astro」。如果連圖片都看不到，和 Obsidian 的寫作體驗差距太大，這不只是 UX 問題，是**產品定位兌現不了**的問題。這三個問題裡，我最在意圖片預覽和 Preview 正確性——這兩個直接影響「能不能信任這個工具輸出的內容」。

**Jordan**：對，Lisa 說到重點。我現在不確定我在 WriteFlow 裡看到的預覽，和發布出去的文章長得一不一樣。這個不確定感很難受。

**Sam**：從穩定性角度，圖片預覽只是視覺層的問題，不影響發布功能的正確性。但 UX 的體感差會讓用戶不信任工具，間接影響核心功能的使用頻率。我支持先修圖片預覽和 Preview bug，這兩個風險可控。

**Alex**：我們來決定優先級。

---

## 🗳️ 投票

**議題：三個問題的優先順序**

| 角色 | 立場 | 理由 |
|------|------|------|
| PM (Alex) | 圖片預覽 P0、Preview bug P0、編輯器 UX P1 | 前兩個直接影響信任感，後者是大工程放 v0.2 |
| Marketing (Lisa) | 圖片預覽 P0、Preview P0 | 產品定位兌現問題，不修無法對外展示 |
| User (Jordan) | 三個都想要，但圖片和 Preview 最影響日常使用 | 編輯器 UX 可以忍，但預覽不準確無法接受 |
| Ops (Sam) | 圖片預覽 P0、Preview bug P0 | 風險可控，有明確修復路徑 |
| CTO (Taylor) | 圖片預覽 P0（1天內可修）、Preview P0（需列清單）、編輯器 UX 需技術選型再決定 | 不要貿然引入 CodeMirror，先評估選項 |

**結果：全體一致**

---

## 🔁 Part 4：補充討論 — 排版問題深挖（觸發：Jordan 追加回報）

**Jordan**：我補充一個問題。Preview 的問題不只是個別語法沒渲染——整體排版看起來就像純文字檔在看。標題沒有大小層次，段落沒有間距，清單沒有縮排樣式。我貼一段有標題、有清單、有程式碼的文章，右邊的預覽跟左邊的 raw text 幾乎一模一樣。

**Taylor**：好，這讓我往更底層看。`PreviewPane.vue` 用了 `prose prose-sm` 這個 class，這是 `@tailwindcss/typography` plugin 提供的排版系統——它會把 `h1`、`h2`、`p`、`ul`、`code` 這些 HTML 元素全部套上正確的字型大小、行距、間距。**但我去看了 `package.json` 和 `src/style.css`，`@tailwindcss/typography` 根本沒有安裝，也沒有引入。** `prose` class 在整個 Tailwind 輸出裡是空的，等於零效果。

**Alex**：所以不是渲染壞掉，是從來就沒有排版？

**Taylor**：對。`markdown-it` 有正確把 Markdown 轉成 HTML——`#` 變成 `<h1>`，`-` 變成 `<ul><li>`，這個部分沒問題。問題是這些 HTML 元素沒有任何 CSS 樣式套用，瀏覽器預設樣式極其陽春，看起來就是文字檔。只要裝上 `@tailwindcss/typography` 並在 `style.css` 引入，`prose` class 就會生效，排版問題立刻解決。

**Sam**：這個風險很低吧？就是裝一個 CSS plugin，不動邏輯層。

**Taylor**：是的。`@tailwindcss/typography` 是純 CSS，不影響任何功能程式碼。安裝加設定，半小時內可以完成，效果是立竿見影的。

**Jordan**：這個比我想的好修多了。那圖片問題是不同的事？

**Taylor**：不同的。排版是 CSS plugin 沒裝；圖片是預覽 pipeline 沒有處理 `![[...]]` 語法。兩個獨立問題，都可以修，但性質不同。

**Alex**：好，我們更新決策。

---

## ✅ 收斂決策

→ 詳見 `decision.md`
