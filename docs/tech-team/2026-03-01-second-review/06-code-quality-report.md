# WriteFlow 程式品質評估報告（第二次）

**評估日期**: 2026-03-01
**評估角色**: Senior Code Quality Engineer
**技術堆疊**: Electron v39 + Vue 3 + TypeScript 5 + Pinia + Vitest + Playwright

---

## 一、品質評分儀表板

| 評估面向 | 評分 | 說明 |
|---|---|---|
| TypeScript 型別安全 | **7.5 / 10** | strict 模式開啟，但有 `as any` 洩漏 |
| 錯誤處理品質 | **6.5 / 10** | 部分 catch 區塊吞掉原始錯誤 |
| 程式碼可讀性 | **7.0 / 10** | 命名清晰，但有 God Store 問題 |
| 測試品質 | **6.0 / 10** | 覆蓋率工具未設定閾值，部分缺失 |
| Vue 3 最佳實踐 | **7.5 / 10** | Composition API 使用正確，有單例耦合問題 |
| 非同步程式碼品質 | **7.0 / 10** | 有 timing hack，部分 fire-and-forget |
| ESLint 設定品質 | **6.5 / 10** | 缺少關鍵型別安全規則 |
| 程式碼氣味 | **6.0 / 10** | DRY 違反、God Store、魔術字串 |
| **綜合評估** | **6.9 / 10** | 整體結構良好，有具體改善空間 |

---

## 二、Critical Issues（立即影響穩定性的問題）

### C-01：`FileService.ts` 原始錯誤上下文被吞掉

**位置**: `src/main/services/FileService.ts`

```typescript
// ❌ 現狀：原始錯誤被丟棄，OS 錯誤碼（ENOENT、EACCES）消失
async readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    throw new Error(`Failed to read file: ${filePath}`);  // cause 遺失
  }
}

// ✅ 建議：保留 cause
} catch (err) {
  throw new Error(`Failed to read file: ${filePath}`, { cause: err });
}
```

---

### C-02：`article.ts` Store 使用 `setTimeout(100)` Timing Hack

**位置**: `src/stores/article.ts`

```typescript
// ❌ 現狀：100ms 魔術延遲確保 configStore 已載入（競態條件隱患）
setTimeout(() => { initializeAutoSave(); }, 100);

// ✅ 建議：watch configStore 初始化完成
watch(() => configStore.isConfigured, (configured) => {
  if (configured) initializeAutoSave();
}, { immediate: true });
```

---

### C-03：`MetadataCacheService.ts` 靜默吞掉檔案讀取錯誤

```typescript
// ❌ 現狀：JSON 格式損壞或權限問題均完全靜默
} catch {
  return null  // 無任何診斷資訊
}

// ✅ 建議：區分「找不到檔案」與「解析失敗」
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
    logger.warn('MetadataCacheService: cache 讀取失敗', err)
  }
  return null
}
```

---

### C-04：`migrateArticleFrontmatter` Fire-and-Forget 導致資料遺失風險

```typescript
// ❌ 現狀：移轉結果的非同步寫入可能永遠不成功
saveArticle(migrated).catch((err) =>
  console.warn('frontmatter 移轉寫回失敗:', err)  // 只警告，不重試
)
```

使用者可能在每次開啟文章時都重複執行移轉而不自知。

---

## 三、Major Issues（影響可維護性的問題）

### M-01：`article.ts` Store 是 God Store（400+ 行）

Store 直接包含：檔案監聽邏輯、frontmatter 移轉邏輯、路徑解析邏輯、通知邏輯。應將 `setupFileWatching`、`handleFileChangeEvent`、`parseArticlePath` 提取到獨立的 composable。

---

### M-02：`generateSlug` 方法重複實作

`ArticleService.ts` 和 `FileScannerService.ts` 各自實作了 `generateSlug`，實作略有差異（`ArticleService` 有 `trim()` 前處理，`FileScannerService` 沒有），違反 DRY 原則。

```typescript
// ✅ 建議：提取到 src/utils/slug.ts
export function generateSlug(title: string): string {
  return title.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

---

### M-03：`SaveStatusIndicator.vue` 直接依賴全域單例

```typescript
// ❌ 直接 import 單例，無法在隔離環境測試
import { autoSaveService } from '@/services/AutoSaveService'
```

建議透過 `inject` 或 props 傳入 `saveState`。

---

### M-04：`article.ts` Store 直接呼叫 `window.electronAPI`（繞過 ArticleService）

Store 中多處直接調用 `window.electronAPI.createDirectory`、`window.electronAPI.readFile`，使得 Store 單元測試必須模擬整個 `window.electronAPI`。

---

### M-05：`parseArticlePath` 使用魔術字串

```typescript
// ❌ "Publish" 字串決定文章狀態，若資料夾名稱變更會靜默失敗
const status = statusFolder === "Publish" ? ArticleStatus.Published : ArticleStatus.Draft;
```

---

### M-06：`vitest.config.ts` 缺少覆蓋率設定

```typescript
// ✅ 建議加入
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    include: ['src/**/*.{ts,vue}'],
    thresholds: { lines: 70, functions: 70, branches: 60 }
  }
}
```

---

## 四、Minor Issues（風格與最佳實踐問題）

### m-01：ESLint `@typescript-eslint/no-explicit-any` 應升為 `"error"`

**目前設為 `"warn"`**，無法在 CI 中強制拒絕。同時缺少重要規則：

```javascript
"@typescript-eslint/no-floating-promises": "error",       // 未 await 的 Promise
"@typescript-eslint/prefer-nullish-coalescing": "warn",   // ?? 優先於 ||
"@typescript-eslint/no-unnecessary-type-assertion": "warn",
```

---

### m-02：`article.ts` Store 多處 `console.log` 未使用 `logger`

`AutoSaveService.ts` 已正確使用 `logger` 工具，但 `article.ts` 中仍有大量 `console.log()`。

---

### m-03：`MetadataCacheService.ts` 的 `collectFromDir` 缺乏並行處理

逐一串行讀取，應改用 `Promise.all` 並行讀取目錄（參見效能評估報告）。

---

### m-04：`FileScannerService.ts` 的 `generateIdFromPath` 碰撞風險

截斷 base64 到 16 字元後，不同路徑可能產生相同 ID。`ArticleService` 的 `generateId()` 使用時間戳記 + 隨機數，兩個服務的 ID 生成策略不一致。

---

## 五、正面發現（值得保持的好習慣）

| ✅ | 發現 |
|----|------|
| ✅ | **出色的依賴注入設計** — `ArticleService` 使用 `IFileSystem` 介面，完全可測試 |
| ✅ | **`AutoSaveService` False Positive 防護** — 三層防護設計有深度 |
| ✅ | **`tsconfig.json` 嚴格設定** — `"strict": true`、`"noUnusedLocals": true` 等 |
| ✅ | **`filteredArticles` O(n) 單次遍歷** — 附有詳細注釋說明優化原因 |
| ✅ | **E2E 測試使用 `data-testid` 和 `expect.poll()`** — Playwright 測試穩定性最佳實踐 |
| ✅ | **`loadInBatches(tasks, 10)` 批次控制** — 避免同時開啟上百個檔案 |
| ✅ | **`shallowRef` 包裝 EditorView** — 避免 Vue 深度響應追蹤造成效能問題 |
| ✅ | **`FileService.checkWritable` 返回結構化結果** — 不拋出異常，適合前置驗證 |

---

## 六、測試品質報告

| 模組 | 估計覆蓋率 | 說明 |
|---|---|---|
| `AutoSaveService.ts` | ~85% | 測試充分，含錯誤路徑和 edge case |
| `ArticleService.ts` | ~65% | `loadAllArticles` 複雜路徑測試不足 |
| `article.ts` Store | ~40% | 僅 4 個基礎測試，Action 覆蓋嚴重不足 |
| `MetadataCacheService.ts` | **0%** | 找不到對應測試檔案 |
| `FileScannerService.ts` | **0%** | 找不到對應測試檔案 |
| `ConfigStore` | ~50% | 有 `config.test.ts`，但分支覆蓋不足 |

### 測試優點

- **`AutoSaveService.test.ts` 是全場最佳測試**：使用 `vi.useFakeTimers()` 正確控制非同步時間，有 False Positive 防護的專屬測試案例
- **E2E 測試品質高**：使用 Electron fixture、`testVaultPath` 隔離、`expect.poll()` 取代固定等待、磁碟寫入驗證完整

### 測試缺陷

- **`article.test.ts` 嚴重不足**：`toggleStatus`、`deleteArticle`、`migrateArticleFrontmatter`、檔案衝突處理等關鍵路徑均未測試
- **`MetadataCacheService` 和 `FileScannerService` 完全沒有測試**：這兩個 Service 邏輯複雜，是高風險缺口
- **`global.window = {...} as any`**：強制轉型掩蓋了型別不匹配

---

## 七、重構路線圖（按優先順序）

### 🔴 P0：立即執行（一週內）

| # | 任務 | 預估工時 |
|---|---|---|
| 1 | 修復 `FileService.ts` 所有 catch 區塊，保留 `cause` 原始錯誤 | 1h |
| 2 | 修復 `MetadataCacheService` 靜默 catch，加入 `logger.warn` | 30m |
| 3 | 修復 `migrateArticleFrontmatter` 改為 async 並在呼叫處 await | 2h |
| 4 | 移除 `setTimeout(..., 100)` timing hack，改用 `watch + immediate` | 1h |

### 🟠 P1：短期重構（兩週內）

| # | 任務 | 預估工時 |
|---|---|---|
| 5 | 建立 `src/utils/slug.ts`，統一兩處 `generateSlug` | 30m |
| 6 | 在 `vitest.config.ts` 加入 coverage 設定和閾值 | 1h |
| 7 | 為 `MetadataCacheService` 和 `FileScannerService` 補齊單元測試 | 4h |
| 8 | 將 `article.ts` Store 中的 `window.electronAPI` 直接調用改為透過 Service | 2h |
| 9 | 修復 `generateIdFromPath` 截斷碰撞問題，統一 ID 生成策略 | 1h |
| 10 | 將 `"Publish"` 魔術字串提取為常數 | 30m |

### 🟡 P2：中期改善（一個月內）

| # | 任務 | 預估工時 |
|---|---|---|
| 11 | 將 `article.ts` Store 中的檔案監聽邏輯提取為 composable | 4h |
| 12 | 重構 `SaveStatusIndicator.vue`，改用 `inject` | 2h |
| 13 | ESLint `no-explicit-any` 升為 `"error"`，修復所有 `as any` | 3h |
| 14 | 新增 `@typescript-eslint/no-floating-promises` 規則 | 30m |
| 15 | `article.test.ts` 補充完整 Action 測試 | 4h |

### 🟢 P3：長期品質提升

| # | 任務 | 預估工時 |
|---|---|---|
| 16 | 引入 Zod 驗證 `loadConfig` 的返回值 | 3h |
| 17 | `ArticleService.saveArticle` 返回值模式一致化（Result 型別 vs throw） | 4h |
| 18 | 刪除 `ArticleService.ts` 的重複 JSDoc | 30m |

---

## 摘要

WriteFlow 整體架構設計清晰，依賴注入模式和 TypeScript strict 設定顯示開發團隊有紮實的工程素養。**最需要立即處理的是錯誤上下文遺失問題**（C-01）和 **fire-and-forget 的資料完整性風險**（C-04）。`AutoSaveService` 的測試可作為全隊的標準範例，但 `MetadataCacheService` 和 `FileScannerService` 的測試空白是高風險缺口，建議優先補齊。
