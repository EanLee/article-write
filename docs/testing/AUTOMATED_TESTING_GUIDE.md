# 自動化測試指南

本文件說明如何執行專案的自動化測試，確保修正後的問題不再發生。

## 測試架構

本專案包含兩種自動化測試：

1. **Unit Tests** (Vitest) - 測試單一功能和邏輯
2. **E2E Tests** (Playwright) - 測試完整的使用者流程

---

## Unit Tests

### 執行所有單元測試

```bash
pnpm run test
```

### 執行特定測試檔案

```bash
# 測試路徑工具函數
pnpm run test tests/utils/path.test.ts

# 測試 Article Store 路徑處理
pnpm run test tests/stores/article.path-handling.test.ts

# 測試 AutoSave Service
pnpm run test tests/services/AutoSaveService.test.ts
```

### Watch 模式（自動重新執行）

```bash
pnpm run test -- --watch
```

### 查看測試覆蓋率

```bash
pnpm run test -- --coverage
```

---

## E2E Tests (Playwright)

### 首次設定

安裝 Playwright 瀏覽器：

```bash
pnpm exec playwright install
```

### 執行所有 E2E 測試

```bash
pnpm exec playwright test
```

### 執行特定測試檔案

```bash
pnpm exec playwright test tests/e2e/article-list.spec.ts
```

### 使用 UI 模式（互動式測試）

```bash
pnpm exec playwright test --ui
```

### Debug 模式

```bash
pnpm exec playwright test --debug
```

### 只執行特定測試案例

```bash
# 使用 grep 過濾測試名稱
pnpm exec playwright test --grep "滾動位置保持"
```

### 查看測試報告

```bash
pnpm exec playwright show-report
```

---

## 針對特定問題的測試

### 問題 1：文章列表跳到第一個

**相關測試檔案**：
- `tests/e2e/article-list.spec.ts` - 「文章列表 - 滾動位置保持」區塊

**測試項目**：
- ✅ 點擊文章後應保持滾動位置
- ✅ 過幾秒後滾動位置不應跳動
- ✅ 快速連續點擊多篇文章不應導致滾動跳動

**執行方式**：
```bash
pnpm exec playwright test --grep "滾動位置"
```

**驗證標準**：
- 滾動位置變化 < 50px（允許小幅度誤差）
- 等待 6 秒後（檔案監聽延遲）仍保持位置

---

### 問題 2：產生重複文章

**相關測試檔案**：
- `tests/utils/path.test.ts` - 路徑工具函數測試
- `tests/stores/article.path-handling.test.ts` - 路徑處理整合測試
- `tests/e2e/article-list.spec.ts` - 「防止重複文章」區塊

**Unit Test 項目**：
- ✅ 反斜線與正斜線路徑應視為相同
- ✅ reloadArticleByPath 使用不同格式路徑時應正確更新現有文章
- ✅ 連續多次 reload 不應產生重複

**E2E Test 項目**：
- ✅ 編輯並儲存文章後不應產生重複項
- ✅ 新增文章不應產生多個重複項

**執行方式**：
```bash
# Unit Tests
pnpm run test tests/utils/path.test.ts
pnpm run test tests/stores/article.path-handling.test.ts

# E2E Tests
pnpm exec playwright test --grep "重複文章"
```

**驗證標準**：
- 儲存後文章數量不變
- 所有文章標題唯一（無重複）
- 文章 ID 保持穩定（不會重新生成）

---

## 持續整合 (CI)

### GitHub Actions 設定

在 `.github/workflows/test.yml` 中配置自動測試：

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm run test

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm exec playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 測試最佳實踐

### 1. 在修改程式碼前執行測試

確保所有測試通過：

```bash
pnpm run test && pnpm exec playwright test
```

### 2. 修改程式碼時使用 Watch 模式

```bash
# Terminal 1: Unit tests
pnpm run test -- --watch

# Terminal 2: 開發伺服器
pnpm run dev
```

### 3. Commit 前執行完整測試

```bash
# Pre-commit hook 會自動執行，但手動執行更保險
pnpm run test
```

### 4. 新增功能時同步撰寫測試

遵循 TDD (Test-Driven Development)：
1. 撰寫測試（應該會失敗）
2. 實作功能
3. 執行測試（應該會通過）
4. 重構（測試仍應通過）

---

## 問題排查

### 測試失敗時的檢查清單

1. **確認測試環境**
   - [ ] Node.js 版本正確（v20+）
   - [ ] 相依套件已安裝（`pnpm install`）
   - [ ] Playwright 瀏覽器已安裝

2. **檢查測試資料**
   - [ ] 測試 Vault 路徑正確
   - [ ] 測試文章存在
   - [ ] 沒有權限問題

3. **查看詳細錯誤**
   ```bash
   # Vitest: 顯示完整錯誤堆疊
   pnpm run test -- --reporter=verbose

   # Playwright: 使用 UI 模式查看
   pnpm exec playwright test --ui
   ```

4. **產生測試報告**
   ```bash
   # Playwright 自動產生 HTML 報告
   pnpm exec playwright test
   pnpm exec playwright show-report
   ```

### 常見問題

#### Q: E2E 測試超時

**A**: 增加 timeout 設定

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 增加到 60 秒
})
```

#### Q: 路徑測試在 Windows 上失敗

**A**: 確認使用 `normalizePath()` 進行路徑比對

```typescript
import { normalizePath } from '@/utils/path'

// ✅ 正確
expect(normalizePath(actualPath)).toBe(normalizePath(expectedPath))

// ❌ 錯誤（會因斜線差異失敗）
expect(actualPath).toBe(expectedPath)
```

#### Q: 測試在本地通過但 CI 失敗

**A**: 可能的原因：
- 環境變數不同
- 檔案路徑差異
- 時區問題
- 並行執行衝突

解決方式：
```bash
# 使用 CI 模式在本地執行
CI=true pnpm run test
CI=true pnpm exec playwright test
```

---

## 測試覆蓋率目標

### 查看覆蓋率

```bash
pnpm run test -- --coverage
```

### 目標

- **Services**: > 80%
- **Stores**: > 70%
- **Utils**: > 90%
- **關鍵路徑**: 100%（路徑處理、自動儲存等）

---

## 參考資源

- [Vitest 文檔](https://vitest.dev/)
- [Playwright 文檔](https://playwright.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**最後更新**: 2026-01-26
