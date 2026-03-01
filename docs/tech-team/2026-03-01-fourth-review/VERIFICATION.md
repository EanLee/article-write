# 第四次技術評估 — 問題追蹤 VERIFICATION

**評估日期**: 2026-03-01
**基準 Commit**: `bf007fd` (develop HEAD — 第三次評審文件更新後)
**評估 Commit**: `current` (develop HEAD)

---

## 第三次評估問題驗證（確認全部已修正）

| 問題 ID | 描述 | 修正 Branch | Commit | 驗證狀態 |
|--------|------|------------|--------|---------|
| S-01 | `getFileStats()` 缺少 `validatePath()` | `file-service-path-validation` | `2843666` | ✅ 已確認 |
| S-02 | `writeFile()`/`copyFile()` 缺少 `{ cause: err }` | 前次評估 | `fe4468c` | ✅ 已確認 |
| S-04 | `setConfig` IPC handler 接受 `any` | `ipc-config-zod-validation` | `2ca5c61` | ✅ 已確認 |
| S-05 | `searchService.updateFile().catch(() => {})` 靜默吞咽 | 前次評估 | `fe4468c` | ✅ 已確認 |
| A-01 | IPC handler 使用字面字串 | `ipc-channels-constants` | `6f8cacf` | ✅ 已確認 |
| A-02 | `FileService.watchCallback` 單一訂閱者限制 | `file-service-watch-pubsub` | `3578ee0` | ✅ 已確認 |
| P-01 | `setupFileWatching()` 訂閱洩漏 | `article-store-composable-split` | `8e4b157` | ✅ 已確認 |
| SOLID-02 | `createArticle()` 使用本地 UUID，非 `generateIdFromPath` | `stable-article-id` | `38f54c3` | ✅ 已確認 |
| SOLID-03 | `PUBLISHED_DIR` 硬編碼 "Publish" | `vault-config-constants` | `a732bdb` | ✅ 已確認 |
| Q-01 | IPC 層 `no-explicit-any` 125 個 | `remove-explicit-any` | `a44b914` | ✅ 已確認 |
| Q-02a | `searchBuildIndex` catch 靜默吞咽 | 前次評估 | `9d5a559` | ✅ 已確認 |
| Q-02b | frontmatter warn→error | 前次評估 | `9d5a559` | ✅ 已確認 |
| Q-03 | setTimeout 100ms → nextTick | 前次評估 | `9d5a559` | ✅ 已確認 |
| M-05 | `VaultDirs` 集中目錄結構常數 | `vault-config-constants` | `a732bdb` | ✅ 已確認 |
| SOLID-01/M-02 | `useFileWatching` composable + `parseArticlePath` 工具 | `article-store-composable-split` | `8e4b157` | ✅ 已確認 |
| CRIT-01 | FileService 路徑穿越漏洞（CVSS 8.8）| `file-service-path-validation` | `2843666` | ✅ 已確認 |
| CRIT-02 | PreviewPane `v-html` XSS（CVSS 7.2）| `xss-protection` | `b82ea5d` | ✅ 已確認（有邊界遺漏 → S4-01）|
| dup-autosave | MainEditor 雙重 AutoSave timer | `remove-duplicate-autosave` | `042c255` | ✅ 已確認 |

---

## 第四次評估新發現問題

| 問題 ID | 描述 | 嚴重度 | Commit | 狀態 |
|--------|------|--------|--------|------|
| S4-01 | SearchPanel `v-html` 非選中路徑注入未 escaped text | 🟠 中高 | `6c1f415` | ✅ 已修正 |
| S4-02 | `FileService.exists()` / `checkWritable()` 未呼叫 `validatePath()` | 🟡 中 | `93d050e` | ✅ 已修正 |
| A4-01/SOLID4-01 | `AppConfig` 型別雙來源（Zod 與 types/index.ts 不相容）| 🟠 中高 | `437b4c2` | ✅ 已修正（EditorTheme 改為字面型別）|
| A4-02 | `electron.d.ts getFileStats.mtime: string` vs 實際 `number` | 🟡 中 | `1fcc71f` | ✅ 已修正 |
| Q4-TS-A | `Frontmatter` 缺少 `date` 欄位（4 個 TS 錯誤）| 🟡 中 | `92d7cac` | ✅ 已修正 |
| Q4-TS-B | `electron.d.ts` AI/Search 宣告缺失（4 個 TS 錯誤）| 🟡 中 | `1fcc71f` | ✅ 已修正 |
| Q4-TS-D | `status` 未用變數、`err` 隱式 any | 🟢 低 | `474f125` | ✅ 已修正 |
| SOLID4-02 | `FileService.stopWatching` 清除 callbacks 語義不一致 | 🟡 中 | `49c056c` | ✅ 已修正 |
| Q4-T01 | FileService 路徑驗證缺少單元測試 | 🟡 中 | `cc1aad5` | ✅ 已補充（13 tests）|
| Q4-T02 | `AppConfigSchema` Zod 驗證缺少測試 | 🟡 中 | `cc1aad5` | ✅ 已補充（19 tests）|
| Q4-T03 | SearchPanel `highlightKeyword` XSS 防護缺少測試 | 🟢 低 | `cc1aad5` | ✅ 已補充（19 tests）|

---

## 第四次評估解法說明

### S4-01：SearchPanel v-html 修正方案

**問題**: `highlightKeyword()` 在空 keyword 時路徑未 escape；非選中項目直接 `v-html="result.title"` 無 escape

**解法**: 修改 `highlightKeyword` 函式，讓空 keyword 時也返回 escaped text：

```typescript
function highlightKeyword(text: string, keyword: string): string {
  // 先 escape HTML 特殊字元（防止 XSS）
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

  if (!keyword.trim()) { return escaped }  // 空 keyword → 直接返回 escaped text

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return escaped.replace(
    new RegExp(`(${escapedKeyword})`, "gi"),
    '<mark class="bg-warning text-warning-content rounded px-0.5">$1</mark>'
  )
}
```

Template 移除三元運算子，統一使用 `highlightKeyword()`：
```html
v-html="highlightKeyword(result.title, searchStore.query)"
v-html="highlightKeyword(result.matchSnippet, searchStore.query)"
```

---

### S4-02：exists()/checkWritable() 修正方案

**解法**: 在兩個方法開頭加入 `this.validatePath()` 呼叫：

```typescript
async exists(path: string): Promise<boolean> {
  this.validatePath(path);  // 加入
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async checkWritable(dirPath: string): Promise<...> {
  this.validatePath(dirPath);  // 加入
  // ...
}
```

---

### A4-01/SOLID4-01：AppConfig 型別統一方案

**短期修正（推薦）**: 統一 `EditorTheme` 為字面型別聯集：

```typescript
// types/index.ts
export type EditorTheme = "light" | "dark"  // 改為字面型別（與 Zod enum 相容）
```

**長期方案**: 建立 `src/shared/` 目錄存放跨 process 共享型別，讓 Zod schema 成為 `AppConfig` 的單一來源。

---

### Q4-TS-A：Frontmatter.date 型別修正方案

```typescript
// types/index.ts — Frontmatter interface 補充
export interface Frontmatter {
  title: string;
  slug?: string;
  date?: string;    // 新增：YAML frontmatter 的日期欄位
  lastmod?: string; // 新增（若 MarkdownService/FileScannerService 有用到）
  // ...其他欄位
}
```

---

### SOLID4-02：FileService.stopWatching 語義修正

```typescript
stopWatching(): void {
  if (this.watcher) {
    this.watcher.close();
    this.watcher = null;
    // 移除 this.watchCallbacks.clear()
    // 訂閱者透過各自的 unsubscribe 函式管理退訂
  }
}
```

---

## 本次 Session 分支清單

| Branch | 說明 | 狀態 |
|--------|------|------|
| `file-service-path-validation` | CRIT-01 路徑穿越修正 | ✅ 已合入 develop |
| `xss-protection` | CRIT-02 XSS 防護 | ✅ 已合入 develop |
| `ipc-channels-constants` | IPC 字串常數化 | ✅ 已合入 develop |
| `remove-duplicate-autosave` | 移除雙重 AutoSave timer | ✅ 已合入 develop |
| `stable-article-id` | hash-based 穩定 Article ID | ✅ 已合入 develop |
| `ai-prompts-extraction` | AI prompt 提取 | ✅ 已合入 develop |
| `fix/search-panel-xss` | S4-01 SearchPanel XSS 邊界修正 | ✅ 已合入 develop |
| `fix/fileservice-missing-validatepath` | S4-02 exists/checkWritable 補加 validatePath | ✅ 已合入 develop |
| `fix/electron-d-ts-single-source` | A4-02 + Q4-TS-B electron.d.ts 整合 | ✅ 已合入 develop |
| `fix/frontmatter-date-field` | Q4-TS-A Frontmatter 補充 date/draft 欄位 | ✅ 已合入 develop |
| `refactor/unify-editor-theme-type` | A4-01 EditorTheme enum→字面型別 | ✅ 已合入 develop |
| `refactor/unify-error-messages` | M-01 所有英文錯誤訊息中文化 | ✅ 已合入 develop |
| `refactor/decouple-ai-store` | M-07 aiPanel store 解除 article/seo store 耦合 | ✅ 已合入 develop |

---

*第四次技術評估 VERIFICATION | 前次: [第三次評估 VERIFICATION](../2026-03-01-third-review/VERIFICATION.md)*
