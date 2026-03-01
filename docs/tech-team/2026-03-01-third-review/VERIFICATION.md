# 修正驗證指南（VERIFICATION）

**建立原因**: 第三次評估後發現多個「曾在之前評估中出現、修正過但未完整」或「評估報告撰寫時已修正但報告未更新」的問題，導致反覆出現的假象。

---

## 為什麼問題會反覆出現？

### 原因 A：修正本身不完整（最常見）

Fix-05 新增 `{ cause: err }` 時，只改了 `readFile`/`deleteFile`/`readDirectory`/`createDirectory`，**`writeFile` 和 `copyFile` 被漏掉**。  
同樣，`refactor/ipc-channels-constants` 轉換了大部份 IPC 字串，但 `"start-file-watching"` 等三個頻道被漏掉。

**根本原因**: 修正時沒有做「全域搜尋確認所有出現點都已修正」。

### 原因 B：評估報告基於舊版程式碼

評估報告是在某個時間點「讀程式碼」後撰寫。如果報告撰寫期間（或之前）有程式碼已被修改，報告就會列出「已修正」的問題，讓人以為問題又回來了。

### 原因 C：沒有自動化驗證

如果沒有測試或 lint 規則來確保特定行為，修正可能在未來的重構中不知不覺地被覆蓋。

---

## 解決方案：三層防護

### 第一層：每次修正前 — 全域搜尋確認所有出現點

在套用修正前，先 grep 整個專案，確認發現了**所有**需要修改的位置：

```powershell
# 修正 { cause: err } 前：確認所有可能的違反點
grep -rn "throw new Error" src/main/services/ | grep -v "cause: err"

# 修正 IPC 字面字串前：確認所有硬編碼的頻道名
grep -rn 'handle("' src/main/main.ts
grep -rn 'invoke("' src/main/preload.ts

# 修正靜默 catch 前：確認所有空 catch
grep -rn "catch(() => {})" src/
```

只有在確認找到**所有**相關位置後，才開始修改。

---

### 第二層：每次修正後 — 驗證指令清單

每個問題的修正必須附帶一個**驗證指令**，可以在任何時間重新執行來確認修正仍然有效。

#### 目前已修正問題的驗證指令

| 問題 | 驗證指令（輸出為空 = 已修正） |
|------|------------------------------|
| Fix-05 + S-02: 所有 FileService 方法都有 `{ cause: err }` | `grep -n "throw new Error" src/main/services/FileService.ts \| grep -v "cause: err"` |
| S-01: getFileStats 有 validatePath | `grep -A2 "async getFileStats" src/main/services/FileService.ts \| grep "validatePath"` |
| S-05: 搜尋索引更新不靜默 | `grep -n "catch(() => {})" src/main/main.ts` |
| A-01: IPC handler 無字面字串 | `grep -n 'handle("' src/main/main.ts` |
| XSS: v-html 使用 sanitizedContent | `grep -n "v-html" src/components/PreviewPane.vue` |
| 路徑驗證: validatePath 在所有寫入方法 | `grep -B2 "await fs.writeFile\|await fs.copyFile" src/main/services/FileService.ts \| grep "validatePath"` |

#### 執行全套驗證
```powershell
# 一次執行所有驗證（輸出應為空）
Write-Host "=== 驗證修正完整性 ==="

Write-Host "`n[1] FileService: 所有 throw 都有 cause:"
Select-String -Path "src/main/services/FileService.ts" -Pattern "throw new Error" | Where-Object { $_ -notmatch "cause: err" }

Write-Host "`n[2] main.ts: 無 IPC 字面字串 handle:"
Select-String -Path "src/main/main.ts" -Pattern 'handle\("'

Write-Host "`n[3] 無靜默 catch:"
Select-String -Path "src/" -Pattern "catch\(\(\) => \{\}\)" -Recurse

Write-Host "`n[4] getFileStats 有 validatePath:"
(Get-Content "src/main/services/FileService.ts" -Raw) -match "getFileStats[\s\S]{0,50}validatePath"
```

---

### 第三層：ESLint 自動化（自動阻止迴歸）

對於可以靜態分析的問題，加入 ESLint 規則讓工具幫你守門：

#### 已可加入的規則

```javascript
// eslint.config.js
{
  // 禁止空 catch block（防止靜默吞咽錯誤）
  "no-empty": ["error", { "allowEmptyCatch": false }],
  
  // 禁止空函式（防止 .catch(() => {})）
  // 注意：需要搭配 promise 相關 plugin 才能精確到 catch 回呼
  "no-empty-function": ["warn", { "allow": ["arrowFunctions"] }],
}
```

---

## 評估報告工作流程（防止原因 B）

**在撰寫任何評估報告前**，執行以下步驟：

1. **確認當前 commit 位置**
   ```powershell
   git log --oneline -5
   ```

2. **確認每個待評估的問題在當前程式碼中確實存在**  
   針對每個問題，先 grep 確認，只有 grep 找到才列入報告

3. **報告中的每個問題都附帶「驗證指令」欄位**  
   讓下一次評估時可以機械性確認

---

## 問題追蹤狀態（截至 2026-03-01）

| 問題 ID | 首次發現 | 修正 commit | 驗證方式 | 狀態 |
|--------|---------|------------|---------|------|
| Fix-01: 路徑驗證 | 第一次評估 | `git log --grep="CRIT-01"` | 見上方驗證清單 | ✅ |
| Fix-05: `{ cause: err }` | 第一次評估 | 部份完成 | `[1]` 驗證指令 | ✅（S-02 補完於 `fe4468c`）|
| S-01: getFileStats | 第三次評估 | `fe4468c` | `[4]` 驗證指令 | ✅ |
| S-02: writeFile cause | 第三次評估 | `fe4468c` | `[1]` 驗證指令 | ✅ |
| S-05: updateFile catch | 第三次評估 | `fe4468c` | `[3]` 驗證指令 | ✅ |
| A-01: IPC file-watch | 第三次評估 | `fe4468c` | `[2]` 驗證指令 | ✅ |
| P-01: 訂閱洩漏 | 第三次評估 | 待修 | - | ❌ |
| Q-02a: searchBuildIndex 靜默 | 第三次評估 | 待修 | `[3]` 驗證指令 | ❌ |
| SOLID-02: ID 生成重複 | 第三次評估 | 待修 | - | ❌ |

---

*此文件應在每次評估後更新，並在每次修正時新增對應的驗證指令。*
