---
title: "程式品質評估報告 — 第三次全面評估"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-03-01
source_of_truth: false
---

# 程式品質評估報告 — 第三次全面評估

**審查者**: 程式品質工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦型別安全、錯誤處理、靜默失敗、測試覆蓋率

---

## 執行摘要

ESLint quotes 規則已於本 session 加入，引號一致性達 100%。TypeScript 編譯通過無錯誤。主要品質問題集中在：**125 個 `no-explicit-any` 警告**（非阻塞但長期侵蝕型別安全）、**多處靜默吞咽錯誤**、以及 **`setTimeout(100ms)` 脆弱的生命週期管理**。

---

## 品質指標總覽

| 指標 | 數值 | 趨勢 |
|------|------|------|
| ESLint 錯誤 | 0 | ✅ |
| ESLint 警告 (`no-explicit-any`) | 125 | ⬆️ 需追蹤 |
| 測試通過數 | 373 | ✅ |
| 測試失敗數 | 0 | ✅ |
| 測試跳過數 | 3 | ➡️ |
| TypeScript 編譯錯誤 | 0 | ✅ |
| 引號一致性 | 100% 雙引號 | ✅ 本 session 修正 |

---

## Q-01 🟡 125 個 `no-explicit-any` — 型別安全侵蝕

**分布估計（基於程式碼讀取）**:

| 位置 | 數量估計 | 說明 |
|------|---------|------|
| `preload.ts` | ~10 | contextBridge 固有限制 |
| `main.ts` IPC handlers | ~15 | `config: any`, `article: any` |
| IPC 反序列化點 | ~20 | 跨進程傳遞無型別保護 |
| 測試檔案 mock | ~30 | 測試 mock 物件 |
| 其他業務邏輯 | ~50 | 各處未型別的物件 |

**正當性分析**:
- `preload.ts` 中的 `any` — contextBridge 無法傳遞 TypeScript 型別，無法避免
- `main.ts` IPC handler 的 `config: any` — 有改善空間（Zod 驗證）
- 測試 mock 的 `any` — 有改善空間（使用 `Partial<T>` 或 `vi.mocked()`）
- 業務邏輯中的 `any` — 應全部消滅

**行動方案**: 分三階段移除：
1. 業務邏輯中的 `any` → 立即
2. IPC handler 的 `any` → 配合 Zod 驗證
3. 測試 mock 的 `any` → 使用 `Partial<T>` 替換

---

## Q-02 🟠 靜默吞咽錯誤 — 多處出現

### 案例 1: `searchBuildIndex` 完全靜默

**位置**: `src/stores/article.ts`

```typescript
window.electronAPI.searchBuildIndex?.()?.catch(() => {}); // 沒有 log！
```

搜尋索引建立失敗，使用者和開發者都完全無感知。搜尋功能將靜默失效。

**修正**:
```typescript
window.electronAPI.searchBuildIndex?.()?.catch((err) => {
  logger.error("[article store] 搜尋索引建立失敗:", err);
});
```

### 案例 2: `migrateArticleFrontmatter` 靜默失敗

**位置**: `src/stores/article.ts`

```typescript
migrateArticleFrontmatter(article).catch((err) => {
  console.warn("Migration failed:", err); // warn 等級，生產環境可能不顯示
});
```

前言遷移失敗時只用 `console.warn`，Sentry 不會捕捉（Sentry 預設只捕捉 `console.error`），可能靜默累積遷移失敗。

**修正**:
```typescript
migrateArticleFrontmatter(article).catch((err) => {
  logger.error("[article store] 前言遷移失敗:", err); // 使用統一 logger
});
```

### 案例 3: `searchService.updateFile().catch(() => {})`

**位置**: `src/main/main.ts:185`

```typescript
searchService.updateFile(filePath).catch(() => {}); // 完全靜默
```

已在 S-05（資安報告）中記錄，此處再次確認：搜尋索引漸漸失準而無任何通知。

---

## Q-03 🟠 `setTimeout(100ms)` — 脆弱的生命週期管理

**位置**: `src/stores/article.ts:initializeAutoSave()`

```typescript
// loadArticles() 中
setTimeout(() => {
  initializeAutoSave(); // 100ms 後初始化
}, 100);
```

**問題**:
1. `100ms` 是任意數字，沒有根據什麼準則選取
2. 在低效能機器或 E2E 測試環境中，100ms 可能不夠（文章尚未完全載入）
3. 在高效能機器上，100ms 是浪費（文章早就載入完成）
4. 測試中需要 fake timers 或等待才能覆蓋此路徑

**正確做法**:
```typescript
// 在文章載入完成後的 Promise 鏈中初始化
async function loadArticles() {
  await articleService.loadAllArticles(vaultPath);
  // ... 處理載入結果
  initializeAutoSave(); // 直接在 async 流程中初始化，無需 setTimeout
}
```

或使用 Vue lifecycle hook 而非 store 內部的 setTimeout：
```typescript
// 在使用 store 的元件中
onMounted(() => {
  articleStore.initializeAutoSave();
});
```

---

## Q-04 🟡 非確定性 ID 生成

**位置**: `src/stores/article.ts:createArticle()`

```typescript
const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
```

兩個問題：
1. **`substr` 已棄用** — 應使用 `substring(2)`（現代 JavaScript 呼叫方式）
2. **非確定性** — 相同路徑的文章可能得到不同 ID（與 Refactor-06 的設計原則相悖）
3. **理論碰撞** — `Math.random()` 在低熵環境下有微小碰撞風險

---

## Q-05 🟢 MainEditor.vue 組合式設計良好

**位置**: `src/components/MainEditor.vue`

```typescript
// 清晰的 composable 分解
const { suggestions, showSuggestions, ... } = useAutocomplete(...);
const { undo, redo, ... } = useUndoRedo(...);
const { isSearchVisible, ... } = useSearchReplace(...);
const { focusMode, toggleFocusMode } = useFocusMode();
const { syncEnabled, ... } = useSyncScroll(...);
```

7 個 composable 各司其職，`MainEditor.vue` 保持為協調層而非邏輯容器。這是 Vue 3 Composition API 的最佳實踐。

---

## Q-06 ✅ AutoSaveService 錯誤處理正確

```typescript
} catch (error) {
  logger.error("自動儲存失敗:", error);
  this.updateSaveState(SaveStatus.Error, error instanceof Error ? error.message : "儲存失敗");
  // 不重新拋出錯誤，讓自動儲存繼續運行
}
```

清楚說明不拋出的原因（保持自動儲存存活），使用 `logger.error` 而非 `console.warn`，正確做法。

---

## Q-07 ✅ ESLint 設定完整

```javascript
// eslint.config.js（本 session 新增）
"quotes": ["error", "double", { "avoidEscape": true }],
```

零錯誤，125 警告全為 `no-explicit-any`（非阻塞）。引號一致性 100%。

---

## 品質優先修正清單

| 優先 | 問題 | 預估工時 |
|------|------|---------|
| 🔴 立即 | Q-02 搜尋索引靜默失效 → 加 `logger.error` | 15 分鐘 |
| 🔴 立即 | Q-04 `substr` → `substring` | 5 分鐘 |
| 🟠 本 Sprint | Q-03 移除 `setTimeout(100ms)` | 2 小時 |
| 🟠 本 Sprint | Q-01 業務邏輯中的 `any` 消除 | 4 小時 |
| 🟡 下 Sprint | Q-01 IPC handler `any` + Zod 驗證 | 8 小時 |
| 🟢 Backlog | Q-01 測試 mock 的 `any` → `Partial<T>` | 4 小時 |

---

*程式品質評估結束 ｜ 下一份: [可維護性/易讀性報告](./06-maintainability-report.md)*
