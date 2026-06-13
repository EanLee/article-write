# 資安評估報告 — 第四次全面評估

**審查者**: 資安工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，聚焦 CRIT-01/CRIT-02 修正驗證、新增安全性缺口偵測

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **資安總分** | **7.5 / 10** | 兩大 CRIT 問題已修正，但仍有 2 個中等新缺口 |
| 路徑驗證覆蓋 | 8/10 | FileService 大部分方法已覆蓋，exists()/checkWritable() 例外 |
| XSS 防護深度 | 7/10 | DOMPurify 到位，但 SearchPanel 非高亮路徑仍有漏洞 |
| IPC 型別安全 | 7.5/10 | Zod 驗證 + IPC constants，preload 尚有 unknown 型別 |
| 錯誤資訊洩漏 | 8/10 | Error cause 鏈完整，路徑名稱暴露於錯誤訊息中（可接受） |

---

## 執行摘要

相較第三次評估，本次確認兩大 CRITICAL 問題已完全修復：**CRIT-01 路徑穿越（CVSS 8.8）** 與 **CRIT-02 XSS（CVSS 7.2）** 均已透過獨立 branch 修正並合入 develop。所有第三次評估的 7 個資安問題（S-01 ~ S-07）均已修正。

然而本次評估新發現 **2 個中等風險問題** 與 **2 個低風險問題**。

---

## 已修正確認（第三次評估問題）

| 問題 ID | 描述 | 修正 Branch | 驗證 |
|--------|------|------------|------|
| S-01 | `getFileStats()` 缺少 `validatePath()` | `file-service-path-validation` | ✅ 已加入 |
| S-02 | `writeFile()`/`copyFile()` 缺少 error cause | 前次評估 | ✅ 已修正 |
| S-04 | `setConfig` 接受 `any` | `ipc-config-zod-validation` | ✅ Zod schema 驗證 |
| S-05 | `searchService.updateFile().catch(() => {})` | 前次評估 | ✅ 改為記錄錯誤 |
| CRIT-01 | FileService 無路徑白名單（路徑穿越）| `file-service-path-validation` | ✅ setAllowedPaths + validatePath |
| CRIT-02 | PreviewPane v-html XSS | `xss-protection` | ✅ DOMPurify 消毒 |

---

## 新發現問題

### S4-01 🟠 SearchPanel `v-html` 非高亮路徑無消毒 — 中高風險

**位置**: `src/components/SearchPanel.vue:141,149`

```html
<!-- 非選中項目（index !== selectedIndex）直接注入 result.title 與 result.matchSnippet -->
v-html="index === searchStore.selectedIndex
  ? highlightKeyword(result.title, searchStore.query)
  : result.title"

v-html="index === searchStore.selectedIndex
  ? highlightKeyword(result.matchSnippet, searchStore.query)
  : result.matchSnippet"
```

**風險分析**:
- `highlightKeyword()` 有做 HTML escape，因此**選中項目**是安全的
- **非選中項目**直接將 `result.title` / `result.matchSnippet` 注入 `v-html`，若搜尋結果來自惡意 Markdown 檔案（包含 `<script>` 或 `<img onerror=...>`），即可觸發 XSS
- 攻擊向量：攻擊者若控制 vault 目錄（或透過 CRIT-01 路徑穿越），可植入惡意 `.md` 檔案，搜尋時觸發 XSS

**嚴重度**: CVSS 5.5（本地向量 + 需要 vault 存取）

**修正方案**:
```html
<!-- 方案 A：非選中時也用 highlightKeyword（keyword 為空字串時會直接返回 escaped text） -->
v-html="highlightKeyword(result.title, searchStore.query)"

<!-- 方案 B：非選中時改用 :textContent 綁定，避免 v-html -->
<span>{{ result.title }}</span>
```

---

### S4-02 🟡 `exists()` / `checkWritable()` 未呼叫 `validatePath()` — 中等風險

**位置**: `src/main/services/FileService.ts`

```typescript
// exists() — 無路徑驗證
async exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// checkWritable() — 無路徑驗證
async checkWritable(dirPath: string): Promise<{ exists: boolean; writable: boolean }> {
  // ...
}
```

**風險**: 攻擊者可透過 IPC 呼叫這兩個方法探測任意路徑是否存在（路徑枚舉），洩漏敏感系統目錄結構（與 S-01 性質相同）。

**嚴重度**: CVSS 4.0（路徑枚舉，無讀取內容）

**修正方案**:
```typescript
async exists(path: string): Promise<boolean> {
  this.validatePath(path); // 加入驗證
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
```

---

### S4-03 🟢 `markdown-it html: true` 維持開啟 — 低風險（設計決策）

**位置**: `src/services/MarkdownService.ts:34`

```typescript
this.md = new MarkdownIt({
  html: true, // 允許 HTML（ObsidianSyntaxService 需要注入 <mark>/<a>/<img>）
  // XSS 防護由 DOMPurify 在 PreviewPane.vue 的 sanitizedContent 計算屬性實施
  ...
});
```

**評估**: 設計決策合理，有明確文件說明。DOMPurify 在渲染層提供有效防護。但這是「單層防護」（defense-in-depth 僅一層），若 DOMPurify bypass 被發現，將無備援。

**建議**: 可考慮在 `MarkdownService.render()` 中也加一層防護（服務層 DOMPurify，而非只在 Vue 元件層），實現真正的縱深防禦。

---

### S4-04 🟢 `preload.ts` publishArticle/syncAllPublished 接受 `unknown` — 低風險

**位置**: `src/main/preload.ts:25,26`

```typescript
publishArticle: (article: unknown, config: unknown) => ipcRenderer.invoke(IPC.PUBLISH_ARTICLE, article, config),
syncAllPublished: (config: unknown) => ipcRenderer.invoke(IPC.SYNC_ALL_PUBLISHED, config),
```

**現況**: main.ts 側對這兩個 handler 的參數有 TypeScript 型別 `Article` / `PublishConfig`，但無 runtime schema 驗證（不像 setConfig 有 Zod）。

**建議**: 為 `publishArticle` 加入 Zod schema 驗證，與 `setConfig` 保持一致。

---

## 安全性改善里程碑

```
第一次 → 第二次 → 第三次 → 第四次 (本次)
CVSS 8.8 路徑穿越 [修正 ✅]
CVSS 7.2 XSS [修正 ✅，但 S4-01 新缺口]
IPC 無型別 [部份修正，preload unknown 殘留]
setConfig any [修正 ✅ Zod]
```

---

## 資安工程師結語

第四次評估確認了路徑防護（CRIT-01）的修正品質很好：`validatePath()` 方法正確處理路徑正規化與 sep 邊界，同步在 config 變更時也更新白名單，設計嚴謹。然而 **S4-01（SearchPanel v-html）是測試未覆蓋的邊界條件**，屬於容易被開發者忽略的 UI 層 XSS。建議納入下個 sprint 修正。**S4-02（exists/checkWritable）**修正僅需 2 行，建議立即修正。

---

*第四次全面評估 — 資安 | 前次: [第三次評估](../2026-03-01-third-review/01-security-report.md)*
