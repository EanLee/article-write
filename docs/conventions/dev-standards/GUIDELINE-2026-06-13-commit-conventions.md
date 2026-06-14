---
title: "Commit 規範與 Git Hooks"
domain: conventions
type: guideline
status: draft
owner: tech-team
updated: 2026-06-13
source_of_truth: true
---

# Commit 規範與 Git Hooks

## 目的

統一 commit message 格式與品質檢查機制，使版本歷史可讀、可追溯，並讓自動化工具（commitlint、CHANGELOG 產生器等）能正確解析。

## 範圍

適用於本 repo 所有 commit，不分人類或 AI agent。

## 規範內容

### Conventional Commits 格式

```
<type>(<scope>): <subject>

<body>
```

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範。

### Type 類型

| Type | 說明 | 範例 |
|------|------|------|
| `feat` | 新功能 | `feat(editor): 實作搜尋功能` |
| `fix` | 錯誤修復 | `fix(store): 修正狀態更新問題` |
| `docs` | 文檔更新 | `docs: 更新開發指南` |
| `style` | 格式調整 | `style(editor): 調整縮排` |
| `refactor` | 重構 | `refactor(service): 簡化初始化邏輯` |
| `perf` | 效能優化 | `perf(search): 優化搜尋演算法` |
| `test` | 測試 | `test(editor): 新增單元測試` |
| `chore` | 建置/工具 | `chore: 更新依賴套件` |

### Scope 範圍

常用的 scope：

- `editor`：編輯器相關
- `ui`：UI/UX
- `service`：服務層
- `store`：狀態管理
- `types`：型別定義
- `config`：配置
- `search`：搜尋功能
- `save`：儲存功能

### 撰寫原則

1. **使用繁體中文（zh-TW）**
2. **Atomic Commits**：每個 commit 只做一件事
3. **SRP（Single Responsibility Principle）**：單一職責
4. **清楚描述**：讓人一眼看懂做了什麼，易於理解與回溯
5. **不署名**：不加 co-author 等署名資訊

### 範例

#### ✅ 好的 Commit

```bash
git commit -m "feat(editor): 實作 Undo/Redo 功能

- 支援 Ctrl+Z 撤銷和 Ctrl+Shift+Z 重做
- 保留最多 100 個歷史記錄
- 自動記錄游標位置以便準確恢復
- 支援防抖機制避免過度記錄"
```

```bash
git commit -m "fix(types): 將 Frontmatter 的 tags 和 categories 改為可選

修正類型定義與實際數據不一致的問題"
```

#### ❌ 不好的 Commit

```bash
# 太籠統
git commit -m "update files"

# 違反原子性（做了多件事）
git commit -m "fix bugs and add features"

# 缺少中文描述
git commit -m "feat: add search"

# 沒有 body 說明（複雜變更需要說明）
git commit -m "refactor(editor): 重構編輯器"
```

### Commit 檢查清單

提交前確認：

- 使用 Conventional Commits 格式
- Type 和 Scope 正確
- 使用繁體中文描述
- 沒有包含不相關的變更
- Subject 清楚簡潔（50 字以內）
- Body 詳細說明變更內容（如需要）
- 遵循原子性原則

## Git Hooks 與自動檢查

本專案使用 **Husky + lint-staged** 確保程式碼品質。

### 自動執行的檢查

每次執行 `git commit` 時，會自動執行兩個檢查：

#### 1. Pre-commit：ESLint 程式碼檢查

- **檢查範圍**：暫存的 `.js`、`.ts`、`.vue` 檔案
- **自動修復**：可自動修復的問題會自動修正
- **阻止提交**：如果有無法修復的 ESLint 錯誤，commit 會被中止

#### 2. Commit-msg：Commit 訊息格式驗證

- **驗證格式**：檢查是否符合 Conventional Commits 規範
- **檢查項目**：
  - Type 必須是有效的類型（feat, fix, docs 等）
  - Subject 不能為空
  - Header 長度不超過 100 字元
- **阻止提交**：格式不符合規範時 commit 會被中止

### 工具說明

- **Husky**：Git hooks 管理工具
- **lint-staged**：只檢查暫存檔案，提升效能
- **commitlint**：Commit 訊息格式驗證工具

### 配置檔案

- `.husky/pre-commit`：Pre-commit hook 腳本（執行 lint-staged）
- `.husky/commit-msg`：Commit-msg hook 腳本（執行 commitlint）
- `.lintstagedrc.json`：lint-staged 配置
- `commitlint.config.js`：commitlint 配置

### 手動執行檢查

```bash
# ESLint：檢查所有檔案
pnpm run lint

# ESLint：檢查並自動修復
pnpm run lint:fix

# Commitlint：驗證 commit message（需要 COMMIT_EDITMSG 檔案）
pnpm exec commitlint --from HEAD~1 --to HEAD --verbose
```

## 例外情況

- **禁止使用 `git commit --no-verify` 繞過 hook**。Commit 失敗時應依「Git Hooks（commit 失敗時依此排查」排查並修正，而非跳過檢查

## 相關文件

- [Git Flow 與分支管理規範](./GUIDELINE-2026-06-13-git-branching.md)
- `.claude/CLAUDE.md`
