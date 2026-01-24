# Claude AI 專案開發規則

本文件定義此專案的 AI 輔助開發規則，所有 AI 助手必須遵循。

## 版本控制規範

### Git Flow 工作流程

本專案使用 **Git Flow** 工作流程：

- `main`: 生產環境分支（穩定版本）
- `develop`: 開發分支（整合分支）
- `feature/*`: 功能開發分支
- `hotfix/*`: 緊急修復分支
- `release/*`: 發布準備分支

### 分支管理規則

**⚠️ 重要：絕對不要直接修改 `develop` 或 `main` 分支**

1. **開發新功能時：**
   ```bash
   # 從 develop 建立新的 feature 分支
   git checkout develop
   git pull origin develop
   git checkout -b feature/功能名稱
   ```

2. **完成功能後：**
   ```bash
   # 提交所有變更
   git add .
   git commit -m "..."
   
   # 推送到遠端
   git push origin feature/功能名稱
   
   # 建立 PR 合併到 develop
   # （不要直接 merge）
   ```

3. **緊急修復：**
   ```bash
   # 從 main 建立 hotfix 分支
   git checkout main
   git checkout -b hotfix/問題描述
   ```

### Commit 規範

#### 格式

遵循 **Conventional Commits** 規範：

```
<type>(<scope>): <subject>

<body>
```

#### Type 類型

- `feat`: 新功能
- `fix`: 錯誤修復
- `docs`: 文檔更新
- `style`: 程式碼格式調整（不影響功能）
- `refactor`: 重構（不新增功能也不修復錯誤）
- `perf`: 效能優化
- `test`: 測試相關
- `chore`: 建置/工具/依賴相關

#### Scope 範圍

- `editor`: 編輯器相關
- `ui`: UI/UX 改善
- `service`: 服務層
- `store`: 狀態管理
- `types`: 型別定義
- `config`: 配置相關

#### 原則

1. **語言**：必須使用**繁體中文（zh-TW）**
2. **原子性（Atomic）**：每個 commit 只做一件事
3. **SRP（Single Responsibility Principle）**：單一職責，易於理解與回溯

#### 範例

```bash
# 好的 commit ✅
git commit -m "feat(editor): 實作 Undo/Redo 功能

- 支援 Ctrl+Z 撤銷和 Ctrl+Shift+Z 重做
- 保留最多 100 個歷史記錄
- 自動記錄游標位置"

# 不好的 commit ❌
git commit -m "update editor"  # 太籠統
git commit -m "fix bugs and add features"  # 違反原子性
git commit -m "feat: add undo/redo"  # 缺少中文描述
```

## 開發工作流程

### 1. 接到新任務

```bash
# 確保在 develop 分支且是最新的
git checkout develop
git pull origin develop

# 建立新的 feature 分支
git checkout -b feature/任務名稱
```

### 2. 開發過程

- 頻繁 commit，保持每個 commit 的原子性
- commit message 必須清楚描述變更內容
- 使用繁體中文撰寫

### 3. 完成開發

```bash
# 確保所有測試通過
pnpm run test

# （可選）手動檢查程式碼風格
# 注意：commit 時會自動執行 lint
pnpm run lint

# 推送到遠端
git push origin feature/任務名稱

# 建立 Pull Request 到 develop
```

**重要 Git Hooks**:

1. **Pre-commit**: 自動執行 ESLint 檢查並修復可修復的問題
2. **Commit-msg**: 自動驗證 commit message 是否符合 Conventional Commits 規範

如果檢查失敗，commit 會被中止，需修復後重新提交。

### 4. Code Review

- PR 必須經過審查才能合併
- 回應審查意見並進行必要的修改

## AI 助手專屬規則

### 執行任務前

1. **檢查當前分支**：
   ```bash
   git branch --show-current
   ```
   
2. **如果在 `develop` 或 `main`**：
   - ⚠️ **立即警告使用者**
   - 建議建立新的 feature 分支
   - **不要直接進行任何程式碼修改**

3. **建立新分支**（需使用者同意）：
   ```bash
   git checkout -b feature/任務描述
   ```

### Commit 時

1. **必須**使用 Conventional Commits 格式
2. **必須**使用繁體中文
3. **必須**遵循 Atomic & SRP 原則
4. **建議**分批提交，不要一次提交所有變更
5. **自動檢查**: 
   - Pre-commit hook 會自動執行 ESLint
   - Commit-msg hook 會自動驗證 commit message 格式
   - 不符合規範的 commit 會被自動拒絕

### 範例工作流程

```bash
# 步驟 1: 檢查並建立分支
git checkout develop
git checkout -b feature/search-replace

# 步驟 2: 實作功能
# ... 編輯檔案 ...

# 步驟 3: 原子性提交
git add src/composables/useSearchReplace.ts
git commit -m "feat(editor): 實作搜尋/替換邏輯

- 提供開啟/關閉搜尋面板的介面
- 支援單個和全部替換功能
- 自動轉義正則表達式特殊字元"

# 步驟 4: 繼續下一個原子性提交
git add src/components/SearchReplace.vue
git commit -m "feat(editor): 實作搜尋/替換 UI 組件

- 即時搜尋與匹配計數顯示
- 支援區分大小寫、正則表達式
- 提供上一個/下一個導航按鈕"

# 步驟 5: 推送並建立 PR
git push origin feature/search-replace
```

## 工具偏好

- **優先使用**：Context7 和 Serena MCP 工具
- **Commit 工具**：使用 `/commit` skill（如果可用）

## 參考文件

- [Commit 詳細指南](../docs/COMMIT_GUIDE.md)
- [整合指南](../docs/INTEGRATION_GUIDE.md)
- [潛在問題清單](../docs/POTENTIAL_ISSUES.md)

---

**最後更新**: 2025-01-24
**版本**: 1.0.0
