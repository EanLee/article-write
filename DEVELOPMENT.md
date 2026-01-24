# 開發指南

本文件說明專案的開發流程、規範與最佳實踐。

## 📋 目錄

- [版本控制](#版本控制)
- [分支管理](#分支管理)
- [Commit 規範](#commit-規範)
- [開發流程](#開發流程)
- [程式碼規範](#程式碼規範)

---

## 版本控制

### Git Flow 工作流程

本專案採用 **Git Flow** 工作流程管理版本：

```
main (生產環境)
  ↑
  └─ release/* (發布準備)
       ↑
       └─ develop (開發整合)
            ↑
            ├─ feature/* (新功能)
            └─ bugfix/* (錯誤修復)

hotfix/* → main (緊急修復)
```

### 分支說明

| 分支類型 | 說明 | 基於 | 合併至 | 命名範例 |
|---------|------|------|--------|---------|
| `main` | 生產環境，穩定版本 | - | - | `main` |
| `develop` | 開發整合分支 | `main` | - | `develop` |
| `feature/*` | 新功能開發 | `develop` | `develop` | `feature/search-replace` |
| `bugfix/*` | 錯誤修復 | `develop` | `develop` | `bugfix/editor-crash` |
| `release/*` | 發布準備 | `develop` | `main`, `develop` | `release/1.2.0` |
| `hotfix/*` | 緊急修復 | `main` | `main`, `develop` | `hotfix/critical-bug` |

---

## 分支管理

### ⚠️ 重要原則

**絕對不要直接在 `develop` 或 `main` 分支上開發！**

- 所有新功能必須在 `feature/*` 分支上開發
- 所有修復必須在 `bugfix/*` 或 `hotfix/*` 分支上進行
- 使用 Pull Request 合併變更

### 開發新功能

```bash
# 1. 確保 develop 分支是最新的
git checkout develop
git pull origin develop

# 2. 建立新的 feature 分支
git checkout -b feature/功能名稱

# 3. 開發與 commit
# ... 進行開發 ...
git add .
git commit -m "..."

# 4. 推送到遠端
git push origin feature/功能名稱

# 5. 在 GitHub/GitLab 建立 Pull Request
# 目標分支: develop
```

### 修復錯誤

```bash
# 從 develop 建立 bugfix 分支
git checkout develop
git pull origin develop
git checkout -b bugfix/問題描述

# 開發、commit、推送、建立 PR
```

### 緊急修復（Hotfix）

```bash
# 從 main 建立 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/緊急問題描述

# 修復、測試、commit、推送
git push origin hotfix/緊急問題描述

# 建立兩個 PR:
# 1. hotfix/xxx → main
# 2. hotfix/xxx → develop
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

---

## Commit 規範

### Conventional Commits

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

```
<type>(<scope>): <subject>

<body>
```

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

- `editor`: 編輯器相關
- `ui`: UI/UX
- `service`: 服務層
- `store`: 狀態管理
- `types`: 型別定義
- `config`: 配置
- `search`: 搜尋功能
- `save`: 儲存功能

### 撰寫原則

1. **使用繁體中文（zh-TW）**
2. **Atomic Commits**：每個 commit 只做一件事
3. **SRP（Single Responsibility Principle）**：單一職責
4. **清楚描述**：讓人一眼看懂做了什麼

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

- [ ] 使用 Conventional Commits 格式
- [ ] Type 和 Scope 正確
- [ ] 使用繁體中文描述
- [ ] Subject 清楚簡潔（50 字以內）
- [ ] Body 詳細說明變更內容（如需要）
- [ ] 遵循原子性原則

---

## 開發流程

### 1. 接到新任務

- [ ] 在 issue tracker 建立任務
- [ ] 從 `develop` 建立新分支
- [ ] 分支名稱清楚描述任務

### 2. 開發

- [ ] 頻繁 commit，保持原子性
- [ ] Commit message 清楚描述變更
- [ ] 定期與 `develop` 同步

```bash
# 同步 develop 最新變更
git checkout develop
git pull origin develop
git checkout feature/your-feature
git merge develop
```

### 3. 測試

- [ ] 執行所有測試
- [ ] 手動測試相關功能
- [ ] 確保沒有破壞現有功能

```bash
npm run test
npm run lint
```

### 4. Code Review

- [ ] 推送到遠端
- [ ] 建立 Pull Request
- [ ] 描述清楚變更內容
- [ ] 回應審查意見

### 5. 合併

- [ ] PR 獲得批准
- [ ] 所有 CI 檢查通過
- [ ] 使用 "Squash and merge" 或 "Merge commit"
- [ ] 刪除 feature 分支

---

## 程式碼規範

### TypeScript

- 啟用嚴格模式
- 避免使用 `any`
- 為公開 API 提供型別定義
- 使用介面（interface）而非型別別名（type）定義物件

### Vue

- 使用 Composition API
- 使用 `<script setup>` 語法
- Props 和 Emits 必須定義型別
- 使用 `defineProps` 和 `defineEmits`

### 命名規範

- **檔案名稱**：PascalCase (`.vue`) 或 camelCase (`.ts`)
- **組件名稱**：PascalCase
- **變數/函數**：camelCase
- **常數**：UPPER_SNAKE_CASE
- **型別/介面**：PascalCase

### 註解

- 複雜邏輯必須加註解
- 使用 JSDoc 為公開 API 加註解
- 避免無意義的註解

---

## 相關文件

- [Commit 詳細指南](docs/COMMIT_GUIDE.md)
- [整合指南](docs/INTEGRATION_GUIDE.md)
- [測試指南](docs/TESTING_GUIDE.md)
- [潛在問題清單](docs/POTENTIAL_ISSUES.md)

---

**最後更新**: 2025-01-24
**維護者**: 專案團隊
