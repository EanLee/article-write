# 架構重構進度報告

## 📋 重構目標

解決以下嚴重的架構問題：
1. ❌ Vue 組件包含商業邏輯
2. ❌ 檔案操作分散在多處
3. ❌ Store 被 Vue 組件直接修改
4. ❌ 缺少統一的檔案操作入口
5. ❌ 商業邏輯難以測試

## ✅ 已完成的重構

### 1. 創建 ArticleService（已完成）

**檔案**：`src/services/ArticleService.ts`

**職責**：
- 所有文章相關的商業邏輯
- 統一的檔案讀取/寫入介面
- Frontmatter 解析與組合
- 備份與衝突檢測

**關鍵方法**：
```typescript
// 讀取文章
async readArticle(filePath: string)

// 儲存文章（唯一的檔案寫入點）
async saveArticle(article: Article, options?)

// 更新文章資料（僅記憶體）
updateArticleData(article: Article, updates)

// 解析 Raw 內容
parseRawContent(rawContent: string)

// 組合成 Raw 內容
combineToRawContent(frontmatter, content)
```

**設計原則**：
- ✅ 所有檔案操作必須經過此 service
- ✅ 清楚區分記憶體更新與磁碟寫入
- ✅ 提供完整的錯誤處理

### 2. 重構 MainEditor.vue（已完成）

**變更**：
- ✅ 移除所有直接修改 `articleStore.currentArticle` 的代碼
- ✅ 使用 `ArticleService` 處理所有商業邏輯
- ✅ `handleContentChange()` 只處理 UI 邏輯
- ✅ `saveArticle()` 透過 service 儲存
- ✅ `toggleEditorMode()` 使用 service 解析/組合
- ✅ `handleRawContentChange()` 使用 service 解析

**前後對比**：

❌ **重構前**：
```javascript
// 直接修改 store
articleStore.currentArticle.content = content.value;
articleStore.currentArticle.frontmatter = parsed.frontmatter;

// 直接調用 store 方法
await articleStore.updateArticle(articleStore.currentArticle);

// 商業邏輯在組件中
const parsed = markdownService.parseFrontmatter(rawContent.value);
```

✅ **重構後**：
```javascript
// 使用 service 更新資料
const updatedArticle = articleService.updateArticleData(
    articleStore.currentArticle,
    { content: content.value }
);

// 透過 service 儲存
const result = await articleService.saveArticle(updatedArticle);

// 使用 service 解析
const parsed = articleService.parseRawContent(rawContent.value);
```

## ⚠️ 進行中的重構

### 3. 重構 articleStore（進行中）

**目標**：
- 🔄 Store 只負責狀態管理
- 🔄 不應該直接操作檔案
- 🔄 `updateArticle()` 應該只更新狀態，不寫入檔案

**當前狀態**：
- `src/stores/article.ts` 的 `updateArticle()` 仍然包含檔案操作
- 需要重構為只更新狀態，檔案操作透過 service

**待處理**：
```typescript
// ❌ 當前實作（包含檔案操作）
async function updateArticle(updatedArticle: Article) {
  // ... 備份、衝突檢測
  await window.electronAPI.writeFile(...)  // 直接寫檔
  // ... 更新 store
}

// ✅ 應該改為（只更新狀態）
function updateArticle(updatedArticle: Article) {
  const index = articles.value.findIndex(a => a.id === updatedArticle.id);
  if (index !== -1) {
    articles.value[index] = { ...updatedArticle };
  }
}
```

## 📝 待完成的工作

### 4. 為 ArticleService 添加測試（待處理）

**需要測試的功能**：
- [ ] `saveArticle()` 正常儲存
- [ ] `saveArticle()` 衝突檢測
- [ ] `saveArticle()` 備份機制
- [ ] `parseRawContent()` 正確解析
- [ ] `combineToRawContent()` 正確組合
- [ ] 錯誤處理和邊界條件

### 5. E2E 測試（待處理）

- [ ] Playwright 測試編輯器模式切換
- [ ] 測試檔案儲存流程
- [ ] 測試衝突處理

## 📊 架構改善對比

### 重構前

```
Vue 組件 (MainEditor.vue)
    ↓ 直接修改
Store (articleStore)
    ↓ 直接寫入
檔案系統
```

**問題**：
- ❌ 商業邏輯在 Vue 組件
- ❌ 無法有效測試
- ❌ 繞過驗證和備份
- ❌ 架構混亂

### 重構後

```
Vue 組件 (MainEditor.vue)
    ↓ 調用
Service (ArticleService)  ← 唯一的商業邏輯層
    ↓ 寫入              ↓ 更新
檔案系統              Store (articleStore)
```

**優點**：
- ✅ 清晰的架構分層
- ✅ 商業邏輯可測試
- ✅ 所有檔案操作集中管理
- ✅ 統一的錯誤處理和驗證

## 🎯 下一步行動

1. **立即**：完成 articleStore 的重構
2. **短期**：為 ArticleService 添加完整測試
3. **中期**：添加 E2E 測試
4. **長期**：考慮為其他功能也創建對應的 service

## 📌 重要原則

### 檔案操作的黃金規則

⚠️ **所有檔案寫入操作必須經過 ArticleService.saveArticle()**

- ✅ 正確：`await articleService.saveArticle(article)`
- ❌ 錯誤：`await window.electronAPI.writeFile(...)`
- ❌ 錯誤：`await articleStore.updateArticle(...)`（如果包含檔案操作）

### 資料更新的黃金規則

⚠️ **Vue 組件不應該直接修改 store 資料**

- ✅ 正確：`await articleStore.updateArticle(updatedArticle)`
- ❌ 錯誤：`articleStore.currentArticle.content = newContent`

### 商業邏輯的黃金規則

⚠️ **商業邏輯應該在 Service 層，不在 Vue 組件**

- ✅ 正確：Service 方法處理邏輯，組件調用
- ❌ 錯誤：組件中包含複雜的資料處理和驗證

---

**最後更新**：2026-01-25
**狀態**：階段性完成（MainEditor.vue 已重構，Store 重構進行中）
