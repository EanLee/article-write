# 文章列表三項嚴重問題 Bug 報告

**日期**: 2026-03-07
**影響範圍**: 文章列表 UI（ArticleListTree）、AutoSave 服務、文章資料安全
**嚴重程度**: 🔴 Critical（Bug 3 涉及使用者資料損毀風險）
**狀態**: 🔧 技術面已修復（`fix/article-id-collision-and-autosave`），Bug 3 行為決策待圓桌 topic-019

---

## 問題總覽

| # | 問題描述 | 嚴重程度 | 根因 commit |
|---|----------|----------|-------------|
| Bug 1 | 選一篇文章，列表全部變成藍色字 | 🟡 High | 待確認 |
| Bug 2 | 出現不明 Checkbox | 🟢 Low | `c92bbf0` |
| Bug 3 | 只是切換文檔，卻觸發 save | 🔴 Critical | `d025d64` |

---

## Bug 1：選一個檔案，文章列表全部變成藍色字

### 問題現象

在側邊欄 `ArticleListTree` 中，點選任何一篇文章後，列表中所有文章標題都變成藍色字（`text-primary`），不只是選中的那一篇。

### 相關程式碼

- `src/components/ArticleTreeItem.vue:4` — 以下 class 應只套用於當前選中的項目：
  ```html
  'bg-primary/10 text-primary font-medium': isCurrent,
  ```
- `src/components/ArticleListTree.vue:96,111` — `isCurrent` 判斷：
  ```html
  :is-current="article.id === articleStore.currentArticle?.id"
  ```

### 可能原因（待驗證）

1. ID 演算法從 `Buffer.from()` 改為 `btoa(encodeURIComponent())`（commit `eef00bc`）後，某些路徑條件下 ID 值碰撞或全部相同
2. `setCurrentArticle` 修改了 articles 陣列中物件的 reference，導致所有 article 物件的 `id` 與 `currentArticle.id` 相同
3. Vue reactive 響應問題：`currentArticle` 物件被直接 mutate 而非替換

### 尚待調查

- [ ] 實際觸發條件（哪種文章路徑結構會觸發？）
- [ ] ID 值是否真的碰撞（加 console.log 驗證）
- [ ] 是否在 `setCurrentArticle` 修改了 articles.value 陣列

---

## Bug 2：側邊欄出現 Checkbox（視圖設定）

### 問題現象

文章列表右上角的設定下拉選單中出現兩個 Checkbox：
- 「依系列分組」
- 「顯示狀態圖示」

### 來源 Commit

```
c92bbf0  feat(ui): 實作 IDE 風格樹狀文章列表  (2026-01-24)
```

`src/components/ArticleListTree.vue:26-43` 中加入的視圖選項 UI。

### 決策文件

- 無相關圓桌決議文件（該 commit 未留下需求討論記錄）
- 此功能本身無害，但需確認是否符合目前產品方向

---

## Bug 3：切換文件觸發 Save（🔴 致命）

### 問題現象

使用者「僅切換文章」（點選側邊欄不同文章）時，系統觸發 Save 動作並顯示儲存狀態。這是**非預期**的行為，且具有資料損毀風險。

### 根因分析

**呼叫鏈：**

```
ArticleListTree.vue: selectArticle(article)
  → articleStore.setCurrentArticle(article)          ← stores/article.ts:414
    → autoSaveService.saveOnArticleSwitch(previousArticle)  ← AutoSaveService.ts:147
      → hasContentChanged(previousArticle) → true 時
        → saveCallback(previousArticle)              ← 實際寫入磁碟！
```

**`saveOnArticleSwitch` 的邏輯（AutoSaveService.ts:147-183）：**
```ts
async saveOnArticleSwitch(previousArticle: Article | null): Promise<void> {
  const hasChanged = this.hasContentChanged(previousArticle);
  if (hasChanged) {
    await this.saveCallback(previousArticle);  // ← 寫入磁碟
  }
}
```

### 潛在資料損毀場景

1. **Race Condition**：使用者快速切換文章 A → B → C 時，autosave timer 尚未完成文章 A 的 snapshot 更新，`hasContentChanged()` 的比較基準已過時，可能誤判「有變更」並儲存**舊版本**覆蓋磁碟上的正確版本

2. **內容混淆**：若 `previousArticle` 是 store 中的 reactive reference（非 deep clone），當 `setCurrentArticle` 完成後，`previousArticle` 的 `content` 可能已被新文章的 reactive 更新覆蓋

3. **靜默失敗**：`saveOnArticleSwitch` 的 error 只 log 到 console，不向使用者顯示，使用者無法知道儲存失敗或儲存了錯誤內容

### 來源 Commit

```
d025d64  refactor(autosave): remove Vue ref coupling from AutoSaveService
```

`setCurrentArticle` 呼叫 `autoSaveService.saveOnArticleSwitch` 是在此次重構中加入的。

### 是否源自會議決策？

- **SOLID6-11**（AutoSaveService 移除 Vue ref 依賴）要求重構 AutoSaveService
- **A6-01** fix 修改了 `setCurrentArticle` 邏輯（`e1417ff`）
- 但「切換文章時自動儲存前一篇」此行為的決策依據，**無法在現有文件中找到明確的圓桌決議**
- 推測是開發者自行加入的保護機制，但**沒有通過戰略層次的使用者行為決策討論**

---

## 為何這是致命問題

寫作工具最核心的保證是：**使用者的文件不能被工具搞壞**。

若 Bug 3 在 Race Condition 或 Reactive 內容混淆的情況下將錯誤內容寫入磁碟：
- 使用者的文章內容會永久損毀（即使有備份機制，使用者也可能不知道）
- 此問題發生在「只是切換文章」這個極常見的操作中
- 問題是靜默的（save 成功了，但儲存的是錯誤內容）

---

## 建議（供圓桌討論）

以下為技術選項，**不作為決策，待圓桌確認：**

1. **立即緩解 Bug 3**：臨時移除 `setCurrentArticle` 中的 `saveOnArticleSwitch` 呼叫，恢復「切換文章不自動儲存」的安全行為，等待圓桌決策正確的自動儲存時機
2. **Bug 3 根本解法方向**：若確定要在切換時儲存，需確保 `previousArticle` 是 deep clone 而非 reactive reference
3. **Bug 1**：需要 UI 層面的實際測試確認觸發條件後再修復

---

## 根本原因完整分析

### Bug 1 根本原因（已修復）

`generateIdFromPath` 使用 `btoa(encodeURIComponent(path)).substring(0, 16)`。

`encodeURIComponent` 將中文字元（3 bytes）展開為 9 個 ASCII 百分比編碼字元，
使同目錄下所有路徑的前 16 字元完全相同（共享目錄路徑前綴）→ **所有文章 ID 相同**。

因 `isCurrent` 判斷 `article.id === articleStore.currentArticle?.id`，
ID 碰撞 → 所有文章的 `isCurrent` 都為 `true` → 全部顯示藍色。

### Bug 3 根本原因（技術面已修復，行為決策待圓桌）

**完整呼叫鏈與資料損毀場景：**

```
setCurrentArticle(newArticle)
  ├─ previousArticle = currentArticle.value    ← Vue reactive reference（非 snapshot！）
  ├─ autoSaveService.saveOnArticleSwitch(previousArticle)
  │    └─ hasContentChanged() → true（ID 碰撞 → 所有文章共用同一個 lastSavedContent 比較基準）
  │         → saveCallback(previousArticle)    ← 寫入磁碟
  └─ migrateArticleFrontmatter(newArticle)
       └─ dirty=true → saveArticle(migrated)  ← 非同步
            └─ updateArticleInMemory(migrated)
                 └─ currentArticle.value?.id === migrated.id  ← ID 碰撞 → 永遠 true
                      → currentArticle.value = migrated      ← 覆蓋 currentArticle！
                           此時 previousArticle（reactive ref）的 content 已被改變
                           → saveOnArticleSwitch 可能將錯誤內容存入磁碟
```

**已實施的技術修復：**

1. `generateIdFromPath` 改為 FNV-1a 雙向 hash → ID 唯一，`updateArticleInMemory` 不再錯誤覆蓋
2. `setCurrentArticle` 對 `previousArticle` 製作 shallow snapshot → 防止 reactive reference 被改變
3. 改用 `filePath` 比較（而非 object identity）→ Vue proxy 環境下更可靠

## 關聯記錄

- `docs/fix-bug/INVESTIGATION-autosave-trigger.md`（既有調查記錄）
- `docs/roundtable-discussions/topic-019-2026-03-07-autosave-on-switch-behavior/PENDING.md`（待決策）
- A6-01 修復：commit `e1417ff`
- AutoSave 重構：commit `d025d64`
- IDE 樹狀列表實作：commit `c92bbf0`
- Buffer 修復（可能影響 Bug 1）：commit `eef00bc`
