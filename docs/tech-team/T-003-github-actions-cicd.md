# T-003 GitHub Actions CI/CD 建置

**日期**: 2026-02-15
**負責人**: Sam（Tech Lead）
**狀態**: ✅ 完成（待使用者驗證後合併）
**分支**: `feature/github-actions-cicd`

---

## 任務背景

技術團隊接獲需求：建立 GitHub Actions CI/CD 流程，並在程式碼進入 `main` 分支時，自動建置三平台安裝檔供使用者下載。

---

## 設計決策

### 拆分為兩個獨立 Workflow

| Workflow | 檔案 | 觸發條件 | 目的 |
|----------|------|----------|------|
| CI | `.github/workflows/ci.yml` | push to develop / PR to develop, main | 品質把關：Lint + 單元測試 |
| Release | `.github/workflows/release.yml` | push to main | 建置三平台安裝檔 + 發佈 Release |

拆分原因：職責分離，CI 快速回饋（不需要跑耗時建置），Release 只在確定合入 main 後才觸發。

---

## CI Workflow 說明

**檔案**：`.github/workflows/ci.yml`

**執行順序**：
1. Checkout 原始碼
2. 安裝 pnpm 10
3. 設定 Node.js 20（含 pnpm cache）
4. `pnpm install --frozen-lockfile`（確保鎖定版本）
5. `pnpm run lint`（ESLint 靜態分析）
6. `pnpm run test`（Vitest 單元測試）

**觸發時機**：
- 任何 push 到 `develop`
- 任何 PR 目標為 `develop` 或 `main`

---

## Release Workflow 說明

**檔案**：`.github/workflows/release.yml`

**建置矩陣**（三平台並行）：

| 平台 | Runner | 輸出格式 | Artifact 名稱 |
|------|--------|----------|---------------|
| Windows | `windows-latest` | `.exe`（NSIS 安裝程式） | WriteFlow-Windows |
| macOS | `macos-latest` | `.dmg` + `.zip`（x64 + arm64） | WriteFlow-macOS |
| Linux | `ubuntu-latest` | `.AppImage` | WriteFlow-Linux |

**執行順序**：
1. 三平台各自：Checkout → 安裝依賴 → 單元測試 → `pnpm run dist:<platform>`
2. 所有平台完成後：`create-release` job 彙整所有 artifact
3. 從 `package.json` 讀取版本號，建立 `vX.X.X` tag
4. 建立 GitHub Release，自動附上三平台安裝檔

**版本號規則**：自動從 `package.json` 的 `version` 欄位讀取，Release tag 格式為 `vX.X.X`。

**Artifact 保留**：GitHub Actions Artifacts 頁面保留 **90 天**。

---

## Changelog 整合規劃

見 [T-004 自動化 Changelog 生成](./T-004-changelog-automation.md)。

---

## 未來擴充項目

以下項目刻意留待後續再處理，避免過度設計：

| 項目 | 說明 | 優先級 |
|------|------|--------|
| macOS 公證（Notarization） | 需要設定 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD` 等 Secrets | 中 |
| Windows 程式碼簽章 | 需要 `.pfx` 憑證 | 中 |
| E2E 測試納入 CI | 目前 CI 只跑單元測試，Playwright 因需要 display server 較複雜 | 低 |
| 版本自動遞增 | 目前需手動更新 `package.json` version | 低 |

---

## 相關檔案

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `electron-builder.yml`
- `package.json`（版本號來源）

## 相關 Commit

- `1cdc99c`: ci: 新增 GitHub Actions CI workflow
- `c649424`: ci: 新增 GitHub Actions Release workflow
