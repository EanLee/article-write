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
