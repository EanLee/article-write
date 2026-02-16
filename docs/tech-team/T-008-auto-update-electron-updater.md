# T-008 — Auto-Update 機制實作（electron-updater）

**日期**: 2026-02-16
**負責人**: Lin（實作）、Taylor（架構審查）
**狀態**: 🚧 進行中

## 任務背景

圓桌 #012 決議導入 Auto-Update 機制，減少使用者手動更版問題。
- 行為模式：背景靜默下載 + 使用者決定何時套用（不強制重啟）
- v0.2 目標平台：Windows + Linux（macOS 因 Code Signing 暫緩）
- Update Server：GitHub Releases（零成本）

## 設計決策

### 技術選型

| 選項 | 說明 | 決定 |
|------|------|------|
| `electron-updater` | electron-builder 官方配套，與現有工具鏈整合 | ✅ 採用 |
| 自建 update server | 需要額外基礎設施 | ❌ 不採用 |
| Squirrel（Windows 內建） | 無法跨平台統一 | ❌ 不採用 |

### Update Server

GitHub Releases 作為 update server：
- `electron-builder` 設定 `publish: provider: github` 後，build 時自動產生 `latest.yml`（Windows）、`latest-linux.yml`（Linux）
- `GH_TOKEN` 已在 build.yml CI 環境中設定

### 更新流程設計

```
App 啟動
  ↓
autoUpdater.checkForUpdates()
  ↓
有新版？
  ├─ 否 → 正常啟動
  └─ 是 → 背景靜默下載
              ↓
           下載完成
              ↓
           IPC → Renderer 顯示通知 banner
           「新版本已就緒，下次啟動時套用」
           [立刻重啟] [稍後]
              ↓
           使用者選擇「立刻重啟」
              ↓
           autoUpdater.quitAndInstall()
```

### IPC 介面設計

Main Process → Renderer（push events）：
- `update-available`：有新版本（帶版本號）
- `update-downloaded`：下載完成（帶版本號）
- `update-error`：更新失敗（帶錯誤訊息，不影響 App）

Renderer → Main Process（invoke）：
- `install-update`：使用者確認立刻重啟

### Graceful Fallback

- 更新失敗（網路斷線、GitHub 不可達）：catch `error` 事件，寫入本地 log，App 正常啟動
- 更新失敗不 blocking App 啟動（electron-updater 預設行為）
- 開發模式（`isDev === true`）跳過更新檢查

## 實作說明

### 修改的檔案

1. `package.json` — 新增 `electron-updater` 依賴
2. `electron-builder.yml` — 加入 `publish: provider: github`
3. `src/main/main.ts` — 初始化 autoUpdater，處理更新事件
4. `src/main/preload.ts` — 暴露更新相關 IPC 介面給 Renderer
5. `.github/workflows/build.yml` — 確認 `GH_TOKEN` 已設定（已就緒）

### 平台設定

| 平台 | 支援狀態 | 說明 |
|------|---------|------|
| Windows | ✅ | NSIS 安裝檔支援 electron-updater |
| Linux | ✅ | AppImage 支援 electron-updater |
| macOS | ❌ 暫緩 | 需要 Code Signing（Apple Developer 帳號） |

## 相關檔案

- `src/main/main.ts`
- `src/main/preload.ts`
- `electron-builder.yml`
- `package.json`
- `.github/workflows/build.yml`

## 相關 Commit

（實作完成後填入）

## 相關決策

- 圓桌 #012：topic-012-2026-02-16-auto-update/decision.md
- GitHub Issue #20：Changelog 彈窗（P3 Backlog，本任務不包含）
