# Fix: QUAL6-02 + QUAL6-09 — ProcessService 競態條件與停止等待

**日期**: 2026-03-01  
**嚴重性**: 🔴 QUAL6-02 P1 / 🟡 QUAL6-09 P1  
**Branch**: `fix/process-service-race`  

---

## 問題一：QUAL6-02 — startDevServer() 假就緒計時器

### 問題描述

`startDevServer()` 使用 `setTimeout(resolve, 2000)` 無條件等待 2 秒後視為「伺服器已就緒」。  
這是假就緒偵測，可能產生兩個問題：
1. **過早就緒**：伺服器在 2 秒內還不能接受連線，但 Promise 已 resolve
2. **雙重 settle**：若伺服器啟動後立即出錯，`reject()` 和 `setTimeout resolve` 都會被呼叫，造成未定義行為

### 解決方案

採用 **settle 旗標模式**（確保 resolve/reject 只呼叫一次）+ **真實就緒偵測**：

```
偵測 stdout 輸出中包含 "Local: http://..." → 真正就緒 → resolve
超過 30 秒未見 URL → 仍 resolve（保持相容），但記錄警告
process error → reject
process exit (code != 0) → reject
```

### 修改說明

| 舊做法 | 新做法 |
|------|------|
| `setTimeout(resolve, 2000)` 盲目等待 | URL 偵測到才 resolve |
| resolve/reject 可能被呼叫多次 | `settled` flag 確保只 settle 一次 |
| 超時 = 無 | 30 秒 timeout fallback |

---

## 問題二：QUAL6-09 — stopDevServer() 不等待 process 退出

### 問題描述

`stopDevServer()` 呼叫 `proc.kill()` 後立即將 `devServerProcess = null` 並返回。  
在 Windows 上，`SIGTERM` 是非同步的，process 可能在 `kill()` 返回後幾百毫秒才真正退出。  
若此時立即呼叫 `startDevServer()`，可能的情況：新 process 啟動時舊 process 尚未完全退出，port 被佔用。

### 解決方案

`stopDevServer()` 改為 async，等待 `exit` 事件後才返回：

```typescript
await new Promise<void>((resolve) => {
  proc.once("exit", () => resolve())
  proc.kill()
  // 保障：5 秒內強制 SIGKILL
  setTimeout(() => { proc.kill("SIGKILL"); resolve() }, 5000)
})
```

## 修改檔案

| 檔案 | 變更 |
|------|------|
| `src/main/services/ProcessService.ts` | `startDevServer`/`stopDevServer` 完整重寫 |
