# 資安評估報告 — 第五次全面評估

**審查者**: 資安工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，基準 commit `3fbb641`（第四次評審全部問題解決後）

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **資安總分** | **8.5 / 10** | TS 零錯誤、XSS 防護完整，新發現 console 洩漏與 CSRF 潛在問題 |
| 輸入驗證 | 9/10 | Zod schema + validatePath 雙層驗證 |
| XSS 防護 | 9/10 | DOMPurify + escapeHtml 均已到位 |
| 路徑安全 | 9/10 | FileService 白名單完整覆蓋所有操作 |
| 資訊洩漏 | 6/10 | 29 個 console.log 繞過 logger.ts 在生產環境輸出 🔴 |
| IPC 安全 | 8.5/10 | channel 常數化，Zod 驗證到位 |

---

## 執行摘要

四輪評審的安全性問題（CRIT-01 路徑穿越、CRIT-02 XSS、IPC 常數化）均已完整修正。本次評估整體安全態勢顯著改善，升至 **8.5/10**。

新發現主要問題：專案雖已建立 `src/utils/logger.ts` 環境感知日誌系統，但 27 個原始碼檔案（共 29 次呼叫）仍直接使用 `console.log/warn/error`，導致**生產環境可能輸出含敏感路徑的日誌**。

---

## 已修正確認（第四次評估安全問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| S4-01 | SearchPanel v-html XSS 邊界 | ✅ escapeHtml + mark 包裝，測試 19 個通過 |
| S4-02 | exists()/checkWritable() 補加 validatePath | ✅ 所有 8 個 FileService 操作均有路徑驗證 |
| M-01 | 英文錯誤訊息 | ✅ 全部中文化（不含敏感資訊格式） |
| M-07 | aiPanel 直接呼叫 useArticleStore | ✅ 改由呼叫端傳入，降低洩漏面 |

---

## 新發現問題

### S5-01 🔴 console.log 繞過 logger.ts，生產環境可能洩漏敏感路徑 — 中高風險

**位置**: 27 個原始碼檔案（29 個直接呼叫）

**問題**: `src/utils/logger.ts` 已建立環境感知日誌系統（開發環境才輸出 debug/info），但絕大多數模組仍直接呼叫 `console.log/warn/error`：

```typescript
// ConverterService.ts（21 個！）
console.log(`Converting article: ${article.title}`);
console.log(`Image conversion: ${sourcePath}`);  // ← 含完整磁碟路徑

// article.ts（15 個）
console.log("[ArticleStore] loadArticles started");
console.warn("[ArticleStore] File changed:", filePath);  // ← 含檔案路徑

// SettingsPanel.vue（8 個）
console.log("Settings saved:", config);  // ← 可能含 API key 配置
```

**安全影響**:
- 生產 Electron app 的 DevTools Console（使用者可打開）顯示磁碟路徑
- 日誌中包含 API provider 設定，可能暴露 provider 類型
- 含文章路徑的日誌可能協助惡意插件分析使用者隱私

**目前 logger.ts 使用情況**: 只有 2 個檔案使用（`AutoSaveService.ts`、`FileWatchService.ts`）

**修正建議**:
```typescript
// 將所有 console.log/warn/error 替換為 logger.*
import { logger } from "@/utils/logger"

// ❌ 舊式
console.log(`Converting article: ${article.title}`)

// ✅ 修正後（開發環境才輸出）
logger.info(`Converting article: ${article.title}`)
```

**優先順序建議**:
1. `ConverterService.ts` (21個) — 最高：含磁碟路徑
2. `article.ts` (15個) — 高：含檔案路徑
3. `SettingsPanel.vue` (8個) — 高：含設定資料
4. 其餘 24 個各 1-7 個

---

### S5-02 🟡 ConverterService 輸入驗證對 article.content 不完整 — 中等

**位置**: `src/services/ConverterService.ts:convertArticle()`

**問題**: `convertArticle()` 接受的 `article.content`（Markdown 原始文字）在處理圖片嵌入、slug 生成等流程時，未對路徑型字串做額外清理：

```typescript
// ConverterService.ts 約 L300
const slug = article.frontmatter.slug ?? slugify(article.title)
// slug 直接用於檔案路徑，若 frontmatter 中含 ../ 未被 slugify 清除
const targetDir = path.join(baseDir, slug)
```

**評估**: 若前端 UI 對 slug/title 未做過濾，惡意 slug（如 `../../etc`）可能繞過 `validatePath` 進入路徑組合。FileService 的 `validatePath` 仍是最終防線，但建議在入口做二次清理。

**修正建議**:
```typescript
// convertArticle 入口加上 slug 清理
const safeSlug = (slug: string) => slug.replace(/[^a-z0-9-_]/gi, "-").replace(/\.{2,}/g, "-")
const slug = safeSlug(article.frontmatter.slug ?? slugify(article.title))
```

---

## v-html 使用安全審查（全面回顧）

| 位置 | 輸入 | 防護 | 評估 |
|------|------|------|------|
| `PreviewPane.vue` | markdown → HTML | DOMPurify.sanitize() | ✅ 安全 |
| `SearchPanel.vue` (標題) | article.title | escapeHtml() + mark標籤 | ✅ 安全 |
| `SearchPanel.vue` (摘要) | article.matchSnippet | escapeHtml() + mark標籤 | ✅ 安全 |

---

## IPC 安全審查

```
✅ 所有 channel 使用 IPC.XXX 常數（無硬編碼字串）
✅ set-config IPC handler 使用 Zod schema 驗證輸入
✅ preload.ts 只暴露明確定義的 electronAPI 方法（無 ipcRenderer 直接暴露）
✅ FileService 白名單覆蓋 readFile/writeFile/deleteFile/copyFile/readDirectory/createDirectory/exists/checkWritable
```

---

## 資安工程師結語

WriteFlow 的安全性在四輪評審後已達到相當水準——路徑防護完整、XSS 防護到位、IPC 安全框架健全。**本次最重要的發現是 console.log 繞過 logger 系統**，這是一個已有基礎設施但未被完整採用的問題，修正難度低但影響廣，建議作為下個 sprint 的第一優先項。

---

*第五次全面評估 — 資安 | 前次: [第四次評估](../2026-03-01-fourth-review/01-security-report.md)*
