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

**⚠️ 重要：一個 feature branch 只處理一個問題或功能**

#### 單一職責原則 (Single Responsibility per Branch)

每個分支應該：
- ✅ 只解決一個 bug
- ✅ 只實作一個功能
- ✅ 只進行一項重構
- ❌ 不要在同一個分支混合多個不相關的變更

**範例**：
```bash
# ✅ 好的做法
feature/add-search-function
fix/editor-line-numbers
refactor/article-service

# ❌ 不好的做法
feature/add-search-and-fix-bugs
fix/multiple-issues
feature/improve-everything
```

**原因**：
- 便於 Code Review
- 容易追蹤變更歷史
- 方便回溯問題
- 降低合併衝突風險
- 符合 Git Flow 原則

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

## TypeScript 型別規範

### Enum 使用準則

**優先使用 Enum 而非字串字面值類型**

為了提升程式碼的可維護性和型別安全，本專案採用 **TypeScript Enum** 來定義固定的選項集合。

#### 何時使用 Enum

✅ **應該使用 Enum**：
- 固定的狀態選項（如：draft, published）
- 固定的分類選項（如：Software, growth, management）
- 固定的主題選項（如：light, dark）
- 任何有明確、有限選項集合的情況

❌ **不應該使用 Enum**：
- 動態產生的值
- 可能隨時間變化的選項
- 來自外部 API 的動態資料

#### Enum 命名規範

1. **Enum 名稱**：使用 PascalCase，清楚描述用途
   ```typescript
   export enum ArticleStatus { ... }
   export enum ArticleCategory { ... }
   export enum SaveStatus { ... }
   ```

2. **Enum 成員**：使用 PascalCase
   ```typescript
   export enum ArticleStatus {
     Draft = 'draft',
     Published = 'published'
   }
   ```

3. **字串值**：使用小寫或 camelCase（視情況而定）
   ```typescript
   export enum ArticleCategory {
     Software = 'Software',  // 保持原有命名慣例
     Growth = 'growth',
     Management = 'management'
   }
   ```

#### 使用範例

```typescript
// ✅ 好的做法：使用 enum
import { ArticleStatus, ArticleCategory } from '@/types'

const article: Article = {
  id: '1',
  status: ArticleStatus.Draft,
  category: ArticleCategory.Software,
  // ...
}

// 比較狀態
if (article.status === ArticleStatus.Published) {
  // ...
}

// ❌ 避免的做法：使用字串字面值
const article = {
  id: '1',
  status: 'draft',  // 容易拼錯，沒有 IDE 提示
  category: 'software',  // 可能與實際值不符
  // ...
}
```

#### Enum 組織結構

所有 Enum 定義統一放在 `src/types/index.ts` 檔案開頭：

```typescript
// Enums - 集中定義所有列舉類型

/**
 * 文章狀態
 */
export enum ArticleStatus {
  Draft = 'draft',
  Published = 'published'
}

// ... 其他 enum 定義

// Core data structures
export interface Article {
  status: ArticleStatus  // 使用 enum 而非 'draft' | 'published'
  // ...
}
```

#### 優點

1. **型別安全**：編譯時期就能發現錯誤
2. **IDE 支援**：自動完成、重構、查找引用
3. **可維護性**：統一管理，修改時只需要改一處
4. **可讀性**：清楚表達意圖，避免魔術字串
5. **重構友善**：修改 enum 值時，TypeScript 會提示所有需要更新的地方

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

#### Feature 開發流程

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

# 步驟 6: 合併（可自行合併）
git checkout develop
git merge feature/search-replace --no-ff
```

#### Bug Fix 流程（⚠️ 必須等待驗證）

```bash
# 步驟 1: 檢查並建立分支
git checkout develop
git checkout -b fix/問題描述

# 步驟 2: 重現問題
# 確保能看到問題實際發生

# 步驟 3: 撰寫測試（重現問題）
# 測試應該會失敗

# 步驟 4: 修復問題
# ... 編輯檔案 ...

# 步驟 5: 驗證修復
# 執行測試，確認通過
# 手動測試，確認問題解決

# 步驟 6: 提交修復
git add [修改的檔案]
git commit -m "fix(...): 修復 [具體問題]

- 問題描述
- 修復方式
- 影響範圍"

# 步驟 7: 撰寫 Bug Fix 報告
# 建立或更新 docs/fix-bug/YYYY-MM-DD-問題.md
git add docs/fix-bug/
git commit -m "docs(fix-bug): 新增/更新 [問題] 修復報告"

# 步驟 8: 推送分支
git push origin fix/問題描述

# ⚠️ 步驟 9: 通知使用者並等待驗證
# AI 助手說明：
# "我已完成修復並推送到 fix/問題描述 分支
#  請您驗證以下項目：
#  1. [具體的驗證步驟]
#  2. [需要檢查的功能]
#  
#  驗證通過後我會合併到 develop 分支"

# 步驟 10: 使用者驗證後才能合併
# ✅ 驗證通過
git checkout develop
git merge fix/問題描述 --no-ff
git branch -d fix/問題描述

# ❌ 驗證失敗
git checkout fix/問題描述
# 追加修復...
# 更新 Bug Fix 報告（補充章節）
# 再次請使用者驗證
```

#### Hotfix 流程（從 main 分支）

```bash
# 步驟 1: 從 main 建立 hotfix
git checkout main
git checkout -b hotfix/緊急問題

# 步驟 2-8: 同 Bug Fix 流程

# 步驟 9: 通知使用者驗證（必須）

# 步驟 10: 驗證通過後合併到 main 和 develop
git checkout main
git merge hotfix/緊急問題 --no-ff

git checkout develop
git merge hotfix/緊急問題 --no-ff

git branch -d hotfix/緊急問題
```

## Bug Fix 報告規範

**⚠️ 重要：所有問題修正必須產生 Bug Fix 報告**

### 1. 報告位置

所有 Bug Fix 報告必須放在 `docs/fix-bug/` 資料夾，使用以下命名規則：

```
docs/fix-bug/YYYY-MM-DD-簡短描述.md
```

範例：
- `docs/fix-bug/2026-01-26-editor-line-numbers.md`
- `docs/fix-bug/2026-01-26-article-category-mapping.md`

### 2. 報告格式

每個報告必須包含以下三個部分：

```markdown
# [標題] Bug Fix 報告

**日期**: YYYY-MM-DD  
**影響範圍**: [編輯器/文章管理/服務層/UI/...]  
**嚴重程度**: [Critical/High/Medium/Low]

## 問題描述

詳細描述遇到的問題，包括：
- 問題現象
- 發生條件
- 影響範圍
- 重現步驟（如適用）

## 原因分析

技術性分析問題的根本原因：
- 程式碼層面的問題
- 邏輯錯誤
- 設計缺陷
- 相關技術細節

## 修正方式

說明如何修正問題：
- 修改的檔案
- 修改的邏輯
- 為什麼這個方案能解決問題
- 是否有其他替代方案及選擇理由

## 相關 Commit

- commit_hash: commit 訊息
```

### 3. 報告撰寫時機與更新

#### 初次撰寫
- 修復完成後立即撰寫
- **在使用者驗證之前**完成
- 作為驗證和 Code Review 的參考文件

#### 補充現有報告
如果 `docs/fix-bug/` 中已有相關問題的報告（同一問題的不同修復或追加修復），**不要建立新檔案**，而是補充在原報告底部：

```markdown
---

## 追加修復 (YYYY-MM-DD)

### 發現的新問題

[描述在使用者驗證時發現的問題]

### 原因分析

[分析為什麼之前的修復不完整]

### 追加修正方式

[說明追加的修正]

### 相關 Commit

- commit_hash: commit 訊息
```

**判斷是否為相同問題**：
- 相同的功能模組
- 相同的根本原因
- 原修復的延伸或遺漏

**何時建立新報告**：
- 完全不同的問題
- 不同的根本原因
- 獨立的功能模組

### 4. 範例

參考 `docs/fix-bug/` 資料夾中的現有報告作為範例。

### 5. 驗證要求

**⚠️ 重要：Bug Fix 必須經過使用者驗證才能合併**

所有 `fix/*` 和 `hotfix/*` 分支必須遵循以下流程：

#### 驗證流程

```bash
# 1. 開發者修復並提交
git checkout -b fix/問題描述
# ... 修復程式碼 ...
git commit -m "fix(...): ..."

# 2. 撰寫 Bug Fix 報告
# 建立或更新 docs/fix-bug/YYYY-MM-DD-問題.md

# 3. 推送並通知使用者驗證
git push origin fix/問題描述

# ⚠️ 此時不要合併！等待使用者驗證
```

#### AI 助手檢查清單

在宣稱「修復完成」之前，必須確認：

- [ ] **實際執行測試**：不只是撰寫測試，要確實執行並看到通過
- [ ] **重現問題**：能夠重現原始問題
- [ ] **驗證修復**：確認修復後問題不再發生
- [ ] **檢查副作用**：確認修復沒有造成其他問題
- [ ] **撰寫報告**：完成 Bug Fix 報告
- [ ] **等待驗證**：明確告知使用者需要驗證，不主動合併

#### 使用者驗證清單

使用者需要檢查：

- [ ] 問題確實被修復（重現步驟不再產生問題）
- [ ] 沒有產生新的問題或副作用
- [ ] 相關功能正常運作
- [ ] Bug Fix 報告準確描述問題和修正

#### 驗證結果處理

**✅ 驗證通過**：
```bash
# 使用者確認後，開發者才能合併
git checkout develop
git merge fix/問題描述 --no-ff
git branch -d fix/問題描述
```

**❌ 驗證失敗**：
```bash
# 在同一個分支繼續修復
git checkout fix/問題描述
# ... 追加修復 ...
git commit -m "fix(...): 追加修正 - [具體問題]"

# 更新 Bug Fix 報告（補充在原報告底部）
# 再次請使用者驗證
```

**📝 驗證時發現相關但不同的問題**：
- 在原 Bug Fix 報告中記錄
- 視情況決定是否在同一分支修復或建立新分支

### 6. 防止「假修復」的機制

#### 常見的「假修復」情況

1. **只修改了測試，沒修改程式碼**
   - 測試通過但問題依然存在
   
2. **修改了無關的程式碼**
   - Commit 記錄和問題描述不符
   
3. **只修復了表面問題**
   - 根本原因未解決，問題會再次發生
   
4. **沒有實際測試**
   - 假設修復有效，但沒有驗證

#### AI 助手自我檢查

在每次修復後，必須回答：

1. **我有重現問題嗎？** 
   - 能描述具體的重現步驟
   - 能展示問題發生前的狀態

2. **我有驗證修復嗎？**
   - 執行重現步驟，問題不再發生
   - 相關功能正常運作

3. **我理解根本原因嗎？**
   - 能清楚解釋為什麼會發生
   - 能說明為什麼修改可以解決

4. **我有檢查副作用嗎？**
   - 測試相關功能
   - 檢查是否影響其他模組

#### 強制等待驗證

**禁止的行為**：
- ❌ 修復後立即合併
- ❌ 沒有實際測試就宣稱完成
- ❌ 跳過使用者驗證流程
- ❌ 在驗證失敗後繼續強行合併

**正確的行為**：
- ✅ 修復後通知使用者驗證
- ✅ 實際執行並展示測試結果
- ✅ 等待使用者確認後才合併
- ✅ 驗證失敗時誠實追加修復

## 測試規範

**⚠️ 重要：所有功能開發與修正必須通過測試才算完成**

### 1. Service Layer 測試

**規則**：所有 Service 層的變更必須有對應的 Unit Test

適用範圍：
- `src/services/` 下的所有檔案
- 新增或修改的 Service 方法
- 商業邏輯層面的修改

測試工具：
- Vitest (單元測試框架)

測試要求：
```bash
# 執行測試
pnpm run test

# 測試必須全部通過
✓ All tests passed
```

測試檔案位置：
```
src/services/ArticleService.ts       → tests/services/ArticleService.test.ts
src/services/MarkdownService.ts      → tests/services/MarkdownService.test.ts
```

測試覆蓋率：
- 新增功能：必須 100% 覆蓋新增的程式碼
- 修改功能：必須覆蓋修改的邏輯路徑
- Bug Fix：必須有重現問題的測試案例

### 2. UI 層測試

**規則**：所有 `.vue` 檔案的變更必須有對應的 Playwright E2E Test

適用範圍：
- `src/components/` 下的 Vue 組件
- 使用者互動流程
- UI 行為驗證

測試工具：
- Playwright (E2E 測試框架)

測試要求：
```bash
# 執行 E2E 測試
pnpm run test:e2e

# 測試必須全部通過
✓ All tests passed
```

測試檔案位置：
```
src/components/ArticleManagement.vue  → tests/e2e/article-management.spec.ts
src/components/MainEditor.vue         → tests/e2e/main-editor.spec.ts
```

測試範圍：
- 關鍵使用者流程（如：建立文章、編輯、儲存）
- UI 互動行為（如：點擊、輸入、選擇）
- 錯誤狀態處理
- 邊界條件

### 3. 測試撰寫時機

**開發流程**：
1. 撰寫測試（TDD 優先，或至少同步撰寫）
2. 實作功能
3. 執行測試確認通過
4. 提交 Commit

**修復流程**：
1. 撰寫重現問題的測試（應該會失敗）
2. 修復問題
3. 執行測試確認通過
4. 提交 Commit + 撰寫 Bug Fix 報告

### 4. 完成定義 (Definition of Done)

功能或修復只有在以下條件**全部**滿足時才算完成：

#### Feature 開發的完成定義

✅ **程式碼完成**
- [ ] 程式碼已撰寫並符合規範
- [ ] ESLint 檢查通過
- [ ] TypeScript 型別檢查通過

✅ **測試完成**
- [ ] Service 層：Unit Test 撰寫並通過
- [ ] UI 層：Playwright Test 撰寫並通過
- [ ] 所有測試執行 `pnpm run test` 全部通過

✅ **文件完成**
- [ ] 新功能：更新相關文件（如適用）
- [ ] Commit Message 符合規範

✅ **Code Review**（可選）
- [ ] PR 建立並附上測試結果
- [ ] Code Review 通過（如需要）
- [ ] 解決所有 Review Comments

#### Bug Fix 的完成定義

**⚠️ Bug Fix 需要額外的驗證步驟**

✅ **問題重現**
- [ ] 能夠重現原始問題
- [ ] 理解問題的根本原因
- [ ] 記錄重現步驟

✅ **程式碼修復**
- [ ] 程式碼已修改並符合規範
- [ ] ESLint 檢查通過
- [ ] TypeScript 型別檢查通過

✅ **測試完成**
- [ ] 撰寫重現問題的測試（修復前應失敗）
- [ ] 修復後測試通過
- [ ] 相關功能的回歸測試通過
- [ ] Service 層：Unit Test 更新
- [ ] UI 層：Playwright Test 更新

✅ **自我驗證**
- [ ] 實際執行應用程式並重現問題
- [ ] 確認修復後問題不再發生
- [ ] 檢查相關功能無副作用
- [ ] 測試邊界情況

✅ **文件完成**
- [ ] 撰寫或更新 Bug Fix 報告 (`docs/fix-bug/`)
  - 問題描述完整
  - 原因分析清楚
  - 修正方式詳細
- [ ] Commit Message 符合規範

✅ **使用者驗證**（必須）
- [ ] 推送分支並通知使用者
- [ ] 提供明確的驗證步驟
- [ ] **等待使用者確認問題已解決**
- [ ] 處理使用者回饋（如有）

✅ **合併前確認**
- [ ] 使用者明確表示驗證通過
- [ ] 沒有產生新的問題
- [ ] Bug Fix 報告準確無誤

**⚠️ 禁止在使用者驗證前合併 fix/* 或 hotfix/* 分支**

### 5. CI/CD 整合

**未來規劃**：
- 所有測試將在 CI Pipeline 中自動執行
- 測試不通過將無法合併 PR
- 建議本地先確保測試通過再推送

## 工具偏好

- **優先使用**：Context7 和 Serena MCP 工具
- **Commit 工具**：使用 `/commit` skill（如果可用）
- **測試工具**：Vitest (Unit Test)、Playwright (E2E Test)

## 參考文件

- [Commit 詳細指南](../docs/COMMIT_GUIDE.md)
- [整合指南](../docs/INTEGRATION_GUIDE.md)
- [潛在問題清單](../docs/POTENTIAL_ISSUES.md)
- [Bug Fix 報告範例](../docs/fix-bug/)

---

**最後更新**: 2026-01-26
**版本**: 1.3.0
