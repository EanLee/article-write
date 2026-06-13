---
title: "WriteFlow 程式品質評估報告"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-02-28
source_of_truth: false
---

# WriteFlow 程式品質評估報告

**評估日期：** 2026-02-28
**評估者：** ✨ Fiona（資深程式品質工程師）
**評估範圍：** 16 個核心檔案（Services、Composables、Components、Utils、Config）

---

## 一、程式碼品質指標評分表

| 維度 | 評分 (0-10) | 說明 |
|------|-------------|------|
| **TypeScript 嚴謹度** | 5.5 | `any` 在 ESLint 層完全放行；`@ts-ignore` 出現 4 處 |
| **錯誤處理** | 6.0 | 模式不一致；debug 日誌留存於生產路徑 |
| **程式碼可讀性** | 7.5 | 命名清晰；但 MainEditor.vue 達 400+ 行過大 |
| **測試覆蓋率** | 5.0 | Services 有覆蓋；Composables 完全無測試 |
| **Vue.js 最佳實踐** | 6.5 | Composables 架構良好；部分直接 singleton inject |
| **DRY 原則** | 5.0 | `generateSlug` 三處重複；圖片副檔名列表兩處重複 |
| **註解品質** | 8.0 | JSDoc 完整；但 generateSlug 有重複 JSDoc block |
| **Linting 設定嚴謹度** | 4.0 | 三大關鍵規則關閉：`no-explicit-any`、`no-console`、`no-v-html` |
| **Magic Numbers/Strings** | 5.5 | `2000`、`24`、`300`、`100` 等未定義常數散落各處 |
| **非同步處理** | 7.5 | async/await 使用正確；`loadInBatches` 設計良好 |
| **事件監聽器清理** | 7.0 | MainEditor `onUnmounted` 完整；FileScannerService 需手動呼叫 |

**整體品質評分：$\frac{5.5+6.0+7.5+5.0+6.5+5.0+8.0+4.0+5.5+7.5+7.0}{11} \approx 61 / 100$**

---

## 二、最嚴重的品質問題清單

### 🔴 P0：型別安全 Bug（執行期靜默出錯）

**問題：** `AutoSaveService.destroy()` 型別錯誤

```typescript
// ❌ lastSavedFrontmatter 型別為 Partial<Frontmatter>，卻賦值為空字串
destroy(): void {
  this.lastSavedFrontmatter = "";  // ← 執行期型別不符
}
```

此 Bug 會導致 `hasContentChanged()` 中 `isEqual(article.frontmatter, "")` 永遠為 `false`，讓每次切換文章都誤觸儲存。

**修復：**
```typescript
this.lastSavedFrontmatter = {}  // ✅ 正確的空 Partial<Frontmatter>
```

---

### 🔴 P0：ESLint 關閉了三個最重要的保護規則

```javascript
// eslint.config.js - 這三行讓整個型別保護形同虛設
'@typescript-eslint/no-explicit-any': 'off',
'no-console': 'off',
'vue/no-v-html': 'off',   // XSS 風險：渲染後的 Markdown HTML 不受保護
```

**修復：**
```javascript
'@typescript-eslint/no-explicit-any': 'warn',
'no-console': ['warn', { allow: ['warn', 'error'] }],
'vue/no-v-html': 'warn',
```

---

### 🟠 P1：`generateSlug` 邏輯三處重複（DRY 嚴重違反）

| 檔案 | 方法名 | 差異 |
|------|--------|------|
| `ArticleService.ts` | `generateSlug()` | 有 `.trim()` |
| `FileScannerService.ts` | `private generateSlug()` | 少了 `.trim()` |
| `MarkdownService.ts` | `generateSlugFromTitle()` | 略有差異 |

三個實作幾乎相同但有細微差異，未來規格改變容易只修其一產生不一致。

---

### 🟠 P1：Debug 日誌大量殘留於生產程式碼路徑

```typescript
// AutoSaveService.ts saveOnArticleSwitch() 中
console.group(`🔍 切換文章檢查: ${previousArticle.title}`);
console.log("hasChanged:", hasChanged);
console.log("currentContent length:", currentContent?.length);
console.log("lastSavedContent length:", this.lastSavedContent?.length);
console.log("content相等?:", currentContent === this.lastSavedContent);
console.log("currentFrontmatter:", currentFrontmatter);
console.log("lastSavedFrontmatter:", this.lastSavedFrontmatter);
console.log("frontmatter相等?:", currentFrontmatter === this.lastSavedFrontmatter);
console.groupEnd();
```

同一個類別中混用了 `logger.debug()` 和直接 `console.log()`，風格完全不統一。

---

### 🟠 P1：`MarkdownService` 四處 `@ts-ignore`

```typescript
// @ts-ignore - Using custom type declarations
import markdownItToc from "markdown-it-table-of-contents";
// @ts-ignore - Using custom type declarations
import markdownItTaskLists from "markdown-it-task-lists";
// @ts-ignore - Using custom type declarations
import markdownItMark from "markdown-it-mark";
// @ts-ignore - Using custom type declarations
import markdownItFootnote from "markdown-it-footnote";
```

應改用 `declare module` 型別聲明或尋找 `@types/*` 套件。

---

### 🟠 P1：`validateAndNormalizeFrontmatter` 大量使用 `any`

```typescript
// ❌ data: any 讓整個函式失去型別保護
private validateAndNormalizeFrontmatter(data: any, errors: string[]): Partial<Frontmatter> {
  .filter((keyword: unknown) => keyword.length > 0);  // ← unknown 上直接存取 .length = 型別錯誤
}
```

---

### 🟡 P2：`MainEditor.vue` 組件職責過重

`MainEditor.vue` 包含超過 400 行的 `<script setup>`，管理了：
- 編輯器模式切換
- 自動儲存排程（300ms 防抖）
- Vault 路徑監聽
- Obsidian 支援初始化
- 圖片檔案掃描（**副檔名列表在同一組件中出現兩次**）

---

### 🟡 P2：`useSearchReplace` 不完整實作

```typescript
function jumpToMatch(match: { start: number; end: number }) {
  setCursorPosition(match.start)

  // 注意：這需要 textarea 元素的 reference
  // 可以在調用此函數後，由父組件處理選取邏輯  ← 功能未完成
}
```

已導出但未完成的公開 API。

---

### 🟡 P2：`ArticleList.vue` 的型別強制轉換

```typescript
// ❌ 應定義正確的 filter 型別而非 as any
articleStore.updateFilter({
  status: statusFilter.value as any,
  category: categoryFilter.value as any
})
```

---

## 三、重構建議（改善前/後對比）

### 建議 1：抽取共用 `SlugUtils` 模組

**改善前（三處重複）：**
```typescript
// FileScannerService.ts - 少了 .trim()
private generateSlug(title: string): string {
  return title.toLowerCase()  // ← 少了 .trim()
    .replace(...).trim();     // ← 位置不同
}
```

**改善後：**
```typescript
// src/utils/slugUtils.ts
export function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}
```

---

### 建議 2：修復 `destroy()` 型別 Bug

**改善前：**
```typescript
destroy(): void {
  this.lastSavedFrontmatter = "";  // ❌ 型別錯誤
}
```

**改善後：**
```typescript
destroy(): void {
  this.stopAutoSave();
  if (this.markAsModifiedDebounceTimer) {
    clearTimeout(this.markAsModifiedDebounceTimer);
    this.markAsModifiedDebounceTimer = null;
  }
  this.saveCallback = null;
  this.getCurrentArticleCallback = null;
  this.lastSavedContent = "";
  this.lastSavedFrontmatter = {};  // ✅ 正確型別
  this.saveState.value = {
    status: SaveStatus.Saved,
    lastSavedAt: null,
    error: null,
  };
}
```

---

### 建議 3：統一日誌系統，清除 debug 殘留

**改善前（混用且含大量 debug）：**
```typescript
console.group(`🔍 切換文章檢查: ${previousArticle.title}`);
console.log("hasChanged:", hasChanged);
// ... 8 行 debug log
console.groupEnd();
```

**改善後：**
```typescript
import { logger } from "@/utils/logger";

logger.debug(`切換文章檢查: ${previousArticle.title}`, {
  hasChanged,
  contentLength: currentContent?.length,
});
```

---

### 建議 4：加強 ESLint 設定

```javascript
// eslint.config.js
'@typescript-eslint/no-explicit-any': 'warn',
'no-console': ['warn', { allow: ['warn', 'error'] }],
'vue/no-v-html': 'warn',
// 新增建議規則
'@typescript-eslint/explicit-function-return-type': ['warn', {
  allowExpressions: true,
  allowHigherOrderFunctions: true
}],
```

---

### 建議 5：抽取圖片副檔名常數

```typescript
// src/constants/fileTypes.ts
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'] as const;

// MainEditor.vue 中使用
import { IMAGE_EXTENSIONS } from '@/constants/fileTypes';
```

---

### 建議 6：`validateAndNormalizeFrontmatter` 加正確型別

**改善前：**
```typescript
private validateAndNormalizeFrontmatter(data: any, errors: string[]): Partial<Frontmatter> {
  .filter((keyword: unknown) => keyword.length > 0)  // ← 型別錯誤
```

**改善後：**
```typescript
type RawFrontmatterData = Record<string, unknown>;

private validateAndNormalizeFrontmatter(
  data: RawFrontmatterData,
  errors: string[]
): Partial<Frontmatter> {
  frontmatter.keywords = (data.keywords as unknown[])
    .filter((k): k is string => typeof k === "string")
    .map(k => k.trim())
    .filter(k => k.length > 0);
```

---

## 四、測試策略建議

### 現況評估

| 測試類型 | 現況 | 建議目標 |
|----------|------|----------|
| Services 單元測試 | ✅ 14 個測試檔 | 維持，補強邊界案例 |
| Composables 測試 | ❌ 完全空白 | 新增 3 個測試檔 |
| Components 測試 | ⚠️ 僅 3 個檔案 | 補充主要組件 |
| E2E 測試 | ⚠️ 有但需驗證 | 補充端對端發布流程 |
| 型別測試 | ❌ 無 | 加入 `tsd` 或型別斷言測試 |

### 建議優先補充：`useUndoRedo` 測試

```typescript
describe('useUndoRedo', () => {
  it('歷史堆疊上限（100筆）後應移除最舊記錄', () => {
    const { pushHistory, stats } = useUndoRedo()
    for (let i = 0; i < 101; i++) pushHistory(`content ${i}`, 0)
    expect(stats.value.total).toBe(100)
  })

  it('在中間 undo 後 push 應清除後續記錄', () => {
    const { pushHistory, undo, canRedo } = useUndoRedo()
    pushHistory('a', 0); pushHistory('b', 0); undo()
    pushHistory('c', 0)
    expect(canRedo.value).toBe(false)
  })
})
```

### 建議補充：`AutoSaveService` 邊界測試

- `destroy()` 後呼叫方法不應 throw
- 快速連續 `markAsModified()` 的防抖行為驗證
- `saveOnArticleSwitch` 的 false positive 防護

---

## 五、技術債清單（按嚴重程度排序）

| 優先 | 項目 | 影響 | 預估工時 |
|------|------|------|---------|
| 🔴 P0 | `AutoSaveService.destroy()` 型別 Bug（`"" vs {}`） | 每次切換文章誤觸儲存 | 0.5h |
| 🔴 P0 | ESLint 三大保護規則關閉 | XSS 風險 + any 蔓延 | 1h |
| 🟠 P1 | `saveOnArticleSwitch` debug 日誌殘留 | 生產環境雜訊 + 效能 | 0.5h |
| 🟠 P1 | `generateSlug` 三處重複（行為不一致） | 未來維護風險 | 1h |
| 🟠 P1 | `MarkdownService` 四處 `@ts-ignore` | 型別安全漏洞 | 2h |
| 🟠 P1 | `validateAndNormalizeFrontmatter(data: any)` | 解析錯誤無型別保護 | 2h |
| 🟠 P1 | Composables 完全無測試 | 重構時無安全網 | 4h |
| 🟡 P2 | `MainEditor.vue` 超過 400 行（職責過重） | 可讀性與可測試性差 | 4h |
| 🟡 P2 | 圖片副檔名常數重複兩處 | 維護一致性 | 0.5h |
| 🟡 P2 | `useSearchReplace.jumpToMatch` 未完成 | 功能缺失 | 1h |
| 🟡 P2 | `as any` 型別強制轉換散落各處 | 型別安全假象 | 2h |
| 🟡 P2 | Magic Numbers（`2000`, `24`, `300`）無命名常數 | 可讀性差 | 1h |
| 🟢 P3 | `generateId()` 策略不統一（兩種 ID 生成方式） | 可預測性問題 | 1h |
| 🟢 P3 | `FileScannerService` 缺少 `destroy()` 方法 | 潛在資源洩漏 | 0.5h |
| 🟢 P3 | `generateSlug` 在 ArticleService 有重複 JSDoc | 文件維護負擔 | 0.25h |

---

## 六、整體程式品質評分

**整體得分：61 / 100**

```
優點 ✅
├── 依賴注入架構設計良好（ArticleService / FileScannerService）
├── JSDoc 中文文件相當完整
├── Services 層有合理的測試覆蓋
├── Composables 分工清晰（useAutocomplete / useEditorShortcuts / ...）
└── loadInBatches 的批次非同步設計值得保留

主要缺陷 ❌
├── ESLint 未有效攔截 any 與 console
├── 型別安全有實際 Bug（destroy 方法）
├── DRY 原則違反多處
└── Composables 完全缺乏單元測試保護
```

建議優先處理 2 個 P0 項目及 5 個 P1 項目，預計需 **10-12 人時**，可將評分提升至 **75+**。
