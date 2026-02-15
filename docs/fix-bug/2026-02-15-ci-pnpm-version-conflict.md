# CI pnpm 版本衝突 Bug Fix 報告

**日期**: 2026-02-15
**影響範圍**: CI/CD（GitHub Actions）
**嚴重程度**: High（所有 CI 執行立即失敗）

## 問題描述

所有 GitHub Actions workflow 在「安裝 pnpm」步驟立即失敗，錯誤訊息：

```
Error: Multiple versions of pnpm specified:
  - version 10 in the GitHub Action config with the key "version"
  - version pnpm@10.26.0+sha512.3b3f... in the package.json with the key "packageManager"
Remove one of these versions to avoid version mismatch errors like ERR_PNPM_BAD_PM_VERSION
```

影響的 workflow：`ci.yml`、`build.yml`

## 原因分析

`package.json` 透過 `packageManager` 欄位（Node.js Corepack 標準）指定了完整版本：

```json
"packageManager": "pnpm@10.26.0+sha512.3b3f..."
```

`pnpm/action-setup@v4` 會自動讀取此欄位。但 workflow 同時又顯式指定：

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10
```

兩者並存，`pnpm/action-setup` 拒絕執行以避免版本不一致。

## 修正方式

移除 `ci.yml` 與 `build.yml` 中的 `with: version: 10`，讓 `pnpm/action-setup@v4` 單獨從 `packageManager` 欄位讀取版本：

```yaml
# 修正前
- uses: pnpm/action-setup@v4
  with:
    version: 10

# 修正後
- uses: pnpm/action-setup@v4
```

## 相關 Commit

- `6367c88`: fix(ci): 移除 workflow 中重複的 pnpm version 設定

---

## 追加修復 (2026-02-15)

### 發現的新問題

修復版本衝突後，CI 仍然失敗，錯誤訊息變為：

```
##[error]Dependencies lock file is not found in /home/runner/work/article-write/article-write.
Supported file patterns: pnpm-lock.yaml
```

### 原因分析

`setup-node@v4` 的 `cache: 'pnpm'` 功能在設定 Node.js 的同時呼叫 `pnpm store path` 驗證 lock file。pnpm store 路徑輸出帶有非預期內容，導致 setup-node 無法正確定位 `pnpm-lock.yaml`。

### 追加修正方式

移除 `setup-node` 的 `cache: 'pnpm'`，改為手動快取：
1. 執行 `pnpm store path` 取得實際路徑輸出到 `GITHUB_OUTPUT`
2. 用 `actions/cache@v4` 明確快取該路徑，以 `pnpm-lock.yaml` hash 為 key

此方式完全繞開 `setup-node` 的 cache 整合，直接管理 pnpm store cache。

### 相關 Commit

- `18e752e`: fix(ci): 改用 actions/cache 手動快取 pnpm store

---

## 追加修復 (2026-02-15) — Build Workflow 未觸發

### 發現的新問題

合併 Release PR #11 後，`v1.0.0` tag 成功建立，但 `build.yml` 完全未被觸發。

### 原因分析

`build.yml` 使用 `on: push: tags: 'v*'` 觸發。
release-please 透過 **GitHub API 呼叫 `POST /repos/{owner}/{repo}/git/refs`** 建立 tag，
這不是 `git push tag` 指令，GitHub Actions 的 `push` 事件不會被觸發。

### 追加修正方式

將觸發條件改為 `on: release: types: [created]`。
release-please 在建立 tag 的同時也會建立 GitHub Release，
`release: created` 事件可以正確捕捉到。

### 相關 Commit

- `dd49f16`: fix(ci): 修正 build workflow 觸發條件為 release created
