---
title: 開發模式啟動後畫面一片白（Vite 實際 port 與 Electron 寫死的 3002 不一致）
date: 2026-07-30
status: fixed
branch: fix/vite-dev-server-blank-screen-port-mismatch
---

## 問題描述

**現象**：`pnpm run dev` 啟動後，Electron 視窗開啟，但畫面完全空白（一片白），沒有任何內容渲染出來。

**重現步驟（已用實際啟動重現驗證，非讀程式碼推論）**：
1. 機器上有其他行程佔用 3002（本機當下有另一個服務在 3001/3002 建立連線）
2. `pnpm run dev` 啟動，`dev:renderer`（Vite）偵測到 3002 被佔用，印出「Port 3002 is in use, trying another one...」，改綁到 3006
3. `dev:main`（Electron）仍照 `main.ts` 寫死的 `http://localhost:3002` 呼叫 `loadURL`
4. Electron 主控台印出：`electron: Failed to load URL: http://localhost:3002/ with error: ERR_CONNECTION_REFUSED`
5. 畫面呈現一片白（Electron 視窗開啟成功，但頁面載入失敗，沒有任何內容可顯示）

## 原因分析

呼叫鏈：

```
vite.config.ts: server.port = 3002（無 strictPort）
  → Vite 偵測 3002 已被佔用 → 自動改綁下一個可用 port（如 3006）→ 靜默漂移，只在終端機印一行提示
main.ts: loadURL("http://localhost:3002")（寫死，CSP 也寫死只允許 3002）
  → 3002 上根本沒有 Vite 在監聽 → ERR_CONNECTION_REFUSED
  ← 根本原因：Vite 的「port 被佔用就自動換一個」預設行為，與 Electron 主程序「寫死載入 3002」的假設互相矛盾，
    兩者之間沒有任何同步機制，一旦 3002 在啟動當下被佔用，兩邊就會各自為政、無聲地失敗
```

**根本原因**：`vite.config.ts` 沒有設定 `strictPort: true`，導致 port 衝突時 Vite 選擇「靜默換一個能用的 port」而非「明確失敗」；`main.ts` 對開發模式 URL 的假設（永遠是 3002）因此在 port 被佔用時失效，且失敗的方式是「Electron 視窗開啟但內容載入失敗」，不是啟動時的明顯錯誤，使用者看到的只有一片白，看不出真正原因在於 port 不一致。

## 修正方式

**修改檔案**：`vite.config.ts`

```diff
  server: {
-   port: 3002
+   port: 3002,
+   strictPort: true
  }
```

**為何有效**：加上 `strictPort: true` 後，Vite 會先確認要求的 `host:port` 組合（`localhost:3002`）本身是否可綁定，而不是看到「3002 這個 port 號碼在任何介面上有任何佔用」就直接放棄換到別的 port。實測驗證：機器上原本佔用 3002 的行程只綁在 wildcard 位址，`localhost:3002` 這個特定組合其實仍然可用，加上 `strictPort: true` 後 Vite 印出「Port 3002 is in use on a wildcard address, but localhost:3002 is available」並成功綁定到 `localhost:3002`，`main.ts` 寫死的 `loadURL` 因此能正確連上，Electron 主控台不再出現 `ERR_CONNECTION_REFUSED`。若未來 `localhost:3002` 這個精確位址真的被佔用，`strictPort: true` 會讓 Vite 直接啟動失敗並印出明確錯誤，不會再靜默漂移成一片白。

**替代方案（已評估、未採用）**：
1. 讓 Electron 動態讀取 Vite 實際綁定的 port（例如啟動流程加一個檔案/IPC 交握）——長遠體驗最好（即使 `localhost:3002` 真的被佔用也能自動接上新 port），但需要調整 `concurrently` 的啟動協調方式，改動面積與風險都明顯更大，非本次最小修復範圍。
2. 找出目前佔用 3002 的行程並處理掉——不需要改程式碼，但治標不治本，任何時候又有其他服務佔用 3002 就會重演同樣的問題。

**影響範圍**：僅 `vite.config.ts`，只影響開發模式（`pnpm run dev`）；封裝後的 production app 是透過 `file://` 載入本地檔案，不經過這個 port，不受影響。

**測試**：屬於開發環境啟動流程問題，非可單元測試覆蓋的程式邏輯；已用 `pnpm exec vite`（單獨啟動）與完整 `pnpm run dev`（Electron + Vite 一起跑）各重現驗證過一次修復前後的行為（修復前：Electron 主控台出現 `ERR_CONNECTION_REFUSED`；修復後：Vite 成功綁定 `localhost:3002`，該錯誤消失）。`pnpm run test`：50 test files / 681 passed / 1 skipped；`pnpm run lint`：0 errors（本次修改不影響任何測試涵蓋的程式邏輯）。

**相關 commit**：`fix(dev): 修正 Vite 與 Electron 開發伺服器 port 不一致導致畫面一片白`
