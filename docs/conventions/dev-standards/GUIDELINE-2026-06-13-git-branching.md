---
title: "Git Flow 與分支管理規範"
domain: conventions
type: guideline
status: draft
owner: tech-team
updated: 2026-06-13
source_of_truth: true
---

# Git Flow 與分支管理規範

## 目的

定義本專案的分支策略、命名規則與合併流程，確保版本歷史清晰、生產分支穩定，且人類開發者與 AI agent 遵循同一套規則。

## 範圍

適用於所有對本 repo 的 commit、分支建立與合併操作，不分人類或 AI agent。

## 規範內容

### Git Flow 工作流程

```
main (生產環境)
  ↑
  └─ release/* (發布準備)
       ↑
       └─ develop (開發整合)
            ↑
            ├─ feature/* (新功能)
            └─ fix/*      (錯誤修復)

hotfix/* → main (緊急修復)
```

### 分支說明

| 分支類型 | 說明 | 基於 | 合併至 | 命名範例 |
|---------|------|------|--------|---------|
| `main` | 生產環境，穩定版本 | - | - | `main` |
| `develop` | 開發整合分支 | `main` | - | `develop` |
| `feature/*` | 新功能開發 | `develop` | `develop`（透過 PR） | `feature/search-replace` |
| `fix/*` | 錯誤修復 | `develop` | `develop`（使用者驗證通過後 `--no-ff`） | `fix/editor-crash` |
| `release/*` | 發布準備 | `develop` | `main`, `develop` | `release/1.2.0` |
| `hotfix/*` | 緊急修復 | `main` | `main`, `develop` | `hotfix/critical-bug` |

> ⚠️ Bug 修復分支統一使用 **`fix/*`**（不使用 `bugfix/*`），與 `bugfix-workflow` skill 一致。

### 分支規則（重要原則）

- **絕對不要直接在 `develop` 或 `main` 分支上開發**
- **一個分支只處理一件事（SRP）**：一個 bug、一個功能、或一項重構，不混合不相關變更
- **任務前必檢查分支**：`git branch --show-current`；若在 `develop`/`main` → 立即警告使用者、建議建立新分支、需使用者同意才建立
- 所有新功能必須在 `feature/*` 分支上開發；所有修復必須在 `fix/*` 或 `hotfix/*` 分支上進行

### Feature Branch 完成定義（RETRO-001）

合併前必須**端到端可用**（資料能正確儲存/讀取/顯示），不只是 UI 有顯示。實作中若發現需修改其他層（型別、服務層等），在**同一分支**內完成，不另開分支。

### 開發新功能

```bash
# 1. 確保 develop 分支是最新的
git checkout develop
git pull origin develop

# 2. 建立新的 feature 分支
git checkout -b feature/功能名稱

# 3. 開發與 commit
git add .
git commit -m "..."

# 4. 推送到遠端
git push origin feature/功能名稱

# 5. 在 GitHub/GitLab 建立 Pull Request（目標分支：develop）
```

### 修復錯誤

```bash
# 從 develop 建立 fix 分支
git checkout develop
git pull origin develop
git checkout -b fix/問題描述

# 重現問題 → 寫測試 → 修復 → 測試通過 → commit
# 詳細流程見 bugfix-workflow skill
```

### 緊急修復（Hotfix）

```bash
# 從 main 建立 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/緊急問題描述

# 修復、測試、commit、推送
git push origin hotfix/緊急問題描述
```

### 發布版本

```bash
# 從 develop 建立 release 分支
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# 更新版本號、CHANGELOG、最後測試
# 完成後合併到 main 和 develop
```

### 合併規則

- **Feature**：建立 PR 合併到 `develop`，不要直接 `git merge`
- **Fix / Hotfix**：使用者驗證通過後直接 `git merge --no-ff`（見 `bugfix-workflow` skill）；hotfix 需同時合併進 `main` 與 `develop`
- 合併前確認：PR 獲得批准、所有 CI 檢查通過

### 開發流程 Checklist

1. **接到新任務**：建立任務記錄 → 從 `develop` 建立新分支 → 分支名稱清楚描述任務
2. **開發**：頻繁 commit、保持原子性；Commit message 清楚描述變更；定期與 `develop` 同步（`git merge develop`）
3. **測試**：`pnpm run test`、`pnpm run lint` 全數通過；手動測試相關功能
4. **Code Review**（feature）：推送、建立 PR、描述清楚變更內容、回應審查意見
5. **合併**：依上方「合併規則」執行；合併後刪除已合併的 feature 分支

## 例外情況

- Fix/Hotfix 在使用者驗證通過**之前**禁止合併（見 `bugfix-workflow` skill，RETRO-001）
- 驗證失敗時回到原分支追加修復，禁止另開新分支

## 相關文件

- [Commit 規範與 Git Hooks](./GUIDELINE-2026-06-13-commit-conventions.md)
- `.claude/skills/bugfix-workflow/SKILL.md`
- `.claude/CLAUDE.md`
