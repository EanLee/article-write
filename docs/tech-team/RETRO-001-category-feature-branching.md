# Retro-001 — 分類功能一個需求變三個 Branch

> **日期**: 2026-02-15
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）、Alex（UI/UX）
> **類型**: 流程回顧

---

## 事件時間軸

| 步驟 | Branch | 動作 |
|------|--------|------|
| 1 | `feature/uiux-alex-role-and-design-system` | Alex 加入、UX-001、FrontmatterEditor 佈局重構 |
| 2 | `feature/metadata-cache` | T-005 實作：MetadataCacheService + combobox |
| 3 | 發現 bug | combobox 無法儲存自訂分類（`Article.category` 是 enum） |
| 4 | `feature/category-string-type` | T-006：enum → string 型別重構 |

---

## 討論記錄

### Sam：問題陳述

**Sam**：一個「分類欄位可自行輸入 + 選取既有分類」的需求，最終產生三個 branch、兩份技術文件（T-005、T-006）、一份設計規範（UX-001）。這是正確的做法嗎？

---

### Wei：Branch 拆分的問題

**Wei**：從我的角度看，branch 3（`feature/category-string-type`）完全是 branch 2 遺漏的問題。

`feature/metadata-cache` 實作 combobox 時，我把分類值存入 `localArticle.category`，但當時沒有驗證這個值能不能存任意字串。實際上它的型別是 `ArticleCategory` enum，只接受三個固定值。

**這應該在 `feature/metadata-cache` 階段就一起修好**，不應該拆出去再開一個 branch。

---

### Lin：根本原因

**Lin**：問題出在 T-005 的設計評估階段。我們討論了 cache 怎麼存、何時掃描、combobox 怎麼互動，但**沒有人追問「`Article.category` 的型別能不能存自訂字串？」**

這是一個應該在設計討論時就發現的問題。當時 Sam 列出了決策表，但沒有包含「型別相容性驗證」這個步驟。

如果 T-005 設計時先 spike 一下現有型別，就會立刻發現 `ArticleCategory` enum 的限制，可以在同一個 branch 裡一起修。

---

### Alex：UX 觀點

**Alex**：branch 1 和 branch 2 的拆分是合理的——設計規範（UX-001）和功能實作（metadata cache）確實是不同關注點，可以分開。

但 branch 3 是不應該存在的。**一個功能實作 branch 應該在「功能真正可用」之前不算完成**，包含打通整條路徑所需的所有修改。

combobox 能顯示、能輸入，但存不進去——這不叫完成，應該在 `feature/metadata-cache` 裡繼續修。

---

### Sam：結論與改善方向

**Sam**：我同意大家的診斷。兩個問題：

**問題 1：設計評估遺漏型別相容性驗證**
T-005 評估完整度不夠，沒有 spike 現有資料結構。

**問題 2：「功能完成」的定義不明確**
`feature/metadata-cache` 合併時，分類 combobox 實際上無法儲存自訂值，但因為 UI 看起來有在動，就當作完成了。

---

## 改善行動

| # | 問題 | 改善方式 | 負責 |
|---|------|---------|------|
| 1 | 設計評估遺漏型別相容性 | T-XXX 設計討論加入「相關資料結構型別驗證」步驟 | Sam |
| 2 | 功能完成定義不清 | CLAUDE.md 加入：feature branch 合併前必須 end-to-end 驗證功能真正可用 | Sam |
| 3 | Bug 修復不應開新 branch | 若是同一需求延伸發現的問題，在原 branch 修復，不另開 branch | 全員 |

---

## 修改 CLAUDE.md

以下規則待補入 CLAUDE.md：

> **Feature Branch 完成定義**：合併前必須確認功能 end-to-end 可用，不只是 UI 有顯示。若實作過程發現需要修改其他層（型別、服務層等），應在同一 branch 內完成，不另開 branch。
