# Fix: QUAL6-03 — autoDownload 改為使用者確認

**日期**: 2026-03-01
**嚴重性**: 🔴 P0
**問題 ID**: QUAL6-03
**影響版本**: 所有版本

---

## 問題描述

`electron-updater` 的 `autoUpdater.autoDownload` 設為 `true`，代表只要偵測到新版本，App 立即在背景靜默下載更新。
攻擊者若能操控 GitHub Releases（供應鏈攻擊），惡意版本會自動下載並提示使用者安裝，使用者無法拒絕下載。

**問題位置**: `src/main/main.ts` → `setupAutoUpdater()` 函式

## 根因

```typescript
// ❌ 之前
autoUpdater.autoDownload = true;  // 靜默背景下載，使用者無法控制
```

## 解決方案

1. **`autoUpdater.autoDownload = false`**：偵測到新版本時只發出通知，不自動下載
2. **新增 `DOWNLOAD_UPDATE` IPC**：使用者點擊通知中的「開始下載」按鈕後，明確觸發 `autoUpdater.downloadUpdate()`
3. **更新 `onUpdateAvailable` 通知**：從「下載中」改為顯示「開始下載」行動按鈕

## 修改檔案

| 檔案 | 變更 |
|------|------|
| `src/main/main.ts` | `autoDownload = false`，新增 `DOWNLOAD_UPDATE` handler |
| `src/main/ipc-channels.ts` | 新增 `DOWNLOAD_UPDATE: "download-update"` 常數 |
| `src/main/preload.ts` | 暴露 `downloadUpdate()` 方法 |
| `src/types/electron.d.ts` | 新增 `downloadUpdate` 型別宣告 |
| `src/App.vue` | `onUpdateAvailable` 改為顯示「開始下載」按鈕 |

## 更新後流程

```
偵測到新版本
    ↓
通知: "新版本 v1.x.x 可下載" + [開始下載] 按鈕
    ↓ 使用者點擊
autoUpdater.downloadUpdate()  ← 明確觸發
    ↓
通知: "新版本已就緒" + [立刻重啟] 按鈕
    ↓ 使用者點擊
autoUpdater.quitAndInstall()
```

## 修正後程式碼

```typescript
// ✅ 之後
autoUpdater.autoDownload = false;  // 等待使用者確認

ipcMain.handle(IPC.DOWNLOAD_UPDATE, async () => {
  await autoUpdater.downloadUpdate();
});
```
