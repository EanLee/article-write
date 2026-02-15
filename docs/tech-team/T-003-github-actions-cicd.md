# T-003 GitHub Actions CI/CD 建置

**日期**: 2026-02-15
**負責人**: Sam（Tech Lead）
**狀態**: ✅ 完成並驗證（v0.1.0 三平台建置成功）

---

## 任務背景

技術團隊接獲需求：建立 GitHub Actions CI/CD 流程，並在程式碼進入 `main` 分支時，自動建置三平台安裝檔供使用者下載。同時整合 release-please 自動管理版本號與 CHANGELOG（詳見 T-004）。

---

## 最終架構

### 三個 Workflow

| Workflow | 檔案 | 觸發條件 | 目的 |
|----------|------|----------|------|
| CI | `.github/workflows/ci.yml` | push to develop / PR to develop, main | 品質把關：Lint + 單元測試 |
| Release Please | `.github/workflows/release-please.yml` | push to main | 自動建立 Release PR，管理版本號與 CHANGELOG |
| Build | `.github/workflows/build.yml` | `release: created` / `workflow_dispatch` | 三平台建置並上傳安裝檔至 GitHub Release |

### 完整發佈流程

```
feature branch → PR to develop → CI 通過
        ↓
develop → PR to main → CI 通過 → 合併
        ↓
release-please 觸發，自動建立 Release PR
（PR 內含：package.json 版本號 + CHANGELOG.md）
        ↓
合併 Release PR
        ↓
release-please 建立 GitHub Release + tag（vX.X.X）
        ↓
build.yml 觸發（release: created）
        ↓
三平台並行建置（Windows / macOS / Linux）
        ↓
安裝檔自動上傳至 GitHub Release
```

---

## CI Workflow 說明

**檔案**：`.github/workflows/ci.yml`

**觸發時機**：
- push 到 `develop`
- PR 目標為 `develop` 或 `main`

**執行順序**：
1. Checkout
2. 安裝 pnpm（從 `package.json` 的 `packageManager` 欄位自動讀取版本）
3. 設定 Node.js 20
4. 取得 pnpm store 路徑 → 用 `actions/cache@v4` 快取
5. `pnpm install --frozen-lockfile`
6. `pnpm run lint`（ESLint）
7. `pnpm run test`（Vitest）

---

## Release Please Workflow 說明

**檔案**：`.github/workflows/release-please.yml`

**觸發時機**：push 到 `main`

**執行內容**：
- 解析 `main` 上符合 Conventional Commits 格式的新 commit
- 自動開或更新 Release PR，包含：
  - `package.json` 版本號（依 commit type 自動遞增）
  - `CHANGELOG.md`（依 changelog-sections 設定分組）
- 合併 Release PR 後，自動建立 GitHub Release 與 tag

**設定檔**：
- `release-please-config.json`：設定 CHANGELOG 分組（中文標題）、`bootstrap-sha`
- `.release-please-manifest.json`：記錄目前版本號

---

## Build Workflow 說明

**檔案**：`.github/workflows/build.yml`

**觸發時機**：
- `release: types: [created]`（release-please 建立 Release 時自動觸發）
- `workflow_dispatch`（手動觸發，用於補跑特定版本）

**建置矩陣**（三平台並行）：

| 平台 | Runner | 輸出格式 |
|------|--------|----------|
| Windows | `windows-latest` | `.exe`（NSIS 安裝程式） |
| macOS | `macos-latest` | `.dmg`（x64 + arm64）+ `.zip` |
| Linux | `ubuntu-latest` | `.AppImage` |

**執行順序**（每平台）：
1. Checkout
2. 安裝 pnpm
3. 設定 Node.js 20
4. 取得 pnpm store 路徑 → `actions/cache@v4` 快取
5. `pnpm install --frozen-lockfile`
6. `pnpm run test`（確保品質）
7. `pnpm run dist:<platform>`
8. `softprops/action-gh-release@v2` 上傳安裝檔至對應 Release

---

## 排查紀錄

本次上線共遭遇五個問題，依序排查如下：

### 問題 1：pnpm 版本衝突（ERR_PNPM_BAD_PM_VERSION）

**現象**：所有 workflow 在「安裝 pnpm」步驟立即失敗。

**錯誤**：
```
Error: Multiple versions of pnpm specified:
  - version 10 in the GitHub Action config with the key "version"
  - version pnpm@10.26.0+sha512.3b3f... in the package.json "packageManager"
```

**根本原因**：workflow 中明確指定 `version: 10`，與 `package.json` 的 `packageManager` 欄位衝突。`pnpm/action-setup@v4` 會自動讀取 `packageManager`，兩者並存導致衝突。

**修復**：移除 workflow 中的 `with: version: 10`。

**分支**：`fix/ci-pnpm-version-conflict`

---

### 問題 2：setup-node cache pnpm 找不到 lock file

**現象**：修復問題 1 後，CI 仍失敗於「設定 Node.js」步驟。

**錯誤**：
```
##[error]Dependencies lock file is not found in /home/runner/work/article-write/article-write.
Supported file patterns: pnpm-lock.yaml
```

**根本原因**：`actions/setup-node@v4` 的 `cache: 'pnpm'` 功能在設定 Node.js 時同步呼叫 `pnpm store path` 驗證 lock file，但輸出路徑不符預期，導致找不到 `pnpm-lock.yaml`。

**修復**：移除 `cache: 'pnpm'`，改為：
1. 執行 `pnpm store path` 取得實際路徑
2. 用 `actions/cache@v4` 明確快取

**分支**：`fix/ci-nodejs-cache-pnpm`

---

### 問題 3：pnpm-lock.yaml 未納入版本控制

**現象**：修復問題 2 後，CI 在「安裝依賴」步驟失敗。

**錯誤**：
```
ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
```

**根本原因**：`.gitignore` 第 3 行有 `pnpm-lock.yaml`，導致 lock file 從未被 commit 進 repo，CI 環境下找不到。

**修復**：從 `.gitignore` 移除 `pnpm-lock.yaml` 並 commit 進 repo。

**分支**：`fix/ci-lockfile-missing`

---

### 問題 4：Build workflow 未被觸發（release-please tag 不走 git push）

**現象**：PR #11 合併後 `v1.0.0` tag 成功建立，但 `build.yml` 完全未被觸發。

**根本原因**：`build.yml` 原本使用 `on: push: tags: 'v*'` 觸發。release-please 透過 **GitHub API 呼叫 `POST /repos/{owner}/{repo}/git/refs`** 建立 tag，這不是 `git push tag` 指令，GitHub Actions 的 `push` 事件不會被觸發。

**修復**：觸發條件改為 `on: release: types: [created]`，同時新增 `workflow_dispatch` 支援手動補跑。

release-please 建立 tag 的同時也會建立 GitHub Release，`release: created` 事件可以正確捕捉到。

**分支**：`fix/build-trigger-on-release`、`fix/build-add-manual-trigger`

---

### 問題 5：版本號被 release-please 跳升至 v1.0.0（應從 v0.1.0 開始）

**現象**：release-please 第一次執行即建立 `chore(main): release 1.0.0` 的 PR。

**根本原因**：release-please 掃描**全部歷史 commit**，找到多個含 `BREAKING CHANGE` 標記的 commit（框架升級、Tailwind v4 遷移等），依 semver 規則自動跳升至 `1.0.0`。

**排查過程**：
1. 嘗試設定 `release-as: 0.1.0` + `bootstrap-sha` → 無效，工具仍從歷史 commit 計算
2. 重設 `package.json` 與 manifest 回 `0.1.0` → 無效，CHANGELOG.md 中有 `## 1.0.0` 記錄，工具從 `1.0.0` 遞增到 `2.0.0`
3. 清空 CHANGELOG.md → 無效，工具仍計算出 `2.0.0`
4. **最終解法**：直接透過 GitHub API 手動建立 `v0.1.0` tag 與 Release，給 release-please 一個明確的「已發佈版本」錨點，工具從此點之後才計算下一版

**修復步驟**：
```bash
# 刪除錯誤的 v1.0.0 Release 與 tag
gh release delete v1.0.0 --yes
gh api --method DELETE repos/EanLee/article-write/git/refs/tags/v1.0.0

# 手動建立正確的 v0.1.0 錨點
gh api --method POST repos/EanLee/article-write/git/refs \
  -f ref="refs/tags/v0.1.0" -f sha="<main HEAD SHA>"
gh release create v0.1.0 --title "WriteFlow v0.1.0" --notes "初始發佈版本"
```

**建置觸發**：`v0.1.0` Release 建立後，`build.yml` 被 `release: created` 自動觸發，三平台建置成功。

**分支**：多個 hotfix 分支（`hotfix/reset-package-version`、`hotfix/clean-changelog-for-reset`）

---

## 驗證結果

**v0.1.0 三平台建置成功**，安裝檔已上傳至 GitHub Release：

| 平台 | 檔案 |
|------|------|
| macOS Intel | `WriteFlow-0.1.0.dmg`、`WriteFlow-0.1.0-mac.zip` |
| macOS Apple Silicon | `WriteFlow-0.1.0-arm64.dmg`、`WriteFlow-0.1.0-arm64-mac.zip` |
| Windows | `WriteFlow.Setup.0.1.0.exe` |
| Linux | `WriteFlow-0.1.0.AppImage` |

---

## 未來擴充項目

| 項目 | 說明 | 優先級 |
|------|------|--------|
| macOS 公證（Notarization） | 需設定 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD` 等 Secrets | 中 |
| Windows 程式碼簽章 | 需 `.pfx` 憑證 | 中 |
| E2E 測試納入 CI | Playwright 需要 display server，設定較複雜 | 低 |

---

## 相關檔案

- `.github/workflows/ci.yml`
- `.github/workflows/release-please.yml`
- `.github/workflows/build.yml`
- `release-please-config.json`
- `.release-please-manifest.json`
- `electron-builder.yml`
- `docs/fix-bug/2026-02-15-ci-pnpm-version-conflict.md`

## 相關 Commit

**初始建置**
- `1cdc99c`: ci: 新增 GitHub Actions CI workflow
- `c649424`: ci: 新增 GitHub Actions Release workflow
- `03f940f`: ci: 改用 release-please 管理版本號與 CHANGELOG
- `0bf3928`: ci(release-please): 新增 release-please 設定檔

**CI 排查修復**
- `6367c88`: fix(ci): 移除 workflow 中重複的 pnpm version 設定
- `18e752e`: fix(ci): 改用 actions/cache 手動快取 pnpm store
- `6b709e3`: fix(ci): 將 pnpm-lock.yaml 納入版本控制
- `dd49f16`: fix(ci): 修正 build workflow 觸發條件為 release created
- `3036196`: ci(build): 新增 workflow_dispatch 支援手動觸發建置

**版本號重設**
- `d210b08`: fix(release): 強制重設版本號為 0.1.0
- `19b6e7f`: fix(release): 清空 CHANGELOG 並更新 bootstrap-sha 重設版本起點
