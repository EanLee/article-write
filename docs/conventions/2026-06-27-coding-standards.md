---
title: 程式碼撰寫規範
domain: conventions
type: guide
status: approved
owner: tech-team
updated: 2026-06-27
source_of_truth: true
producer: ai-generated
review_status: pending-human-review
---

# 程式碼撰寫規範

## 規則

### 1. JSDoc 必填

**所有** function（包含 private、helper、內部函式）必須加 JSDoc 說明。
最少包含用途描述，有參數與回傳值時須加 `@param` / `@returns`。

### 2. Lint 通過才算 Done

每個功能完成後，必須執行 `pnpm run lint`（或等效指令）並通過，才視為該任務完成。
Lint 警告視同錯誤處理。

### 3. 圖示使用 Lucide，禁止自訂 SVG

所有 UI 圖示一律使用 `lucide-vue-next`。
禁止在元件中內嵌自訂 SVG 或引入其他圖示庫。

### 4. Service / Business Layer 必須有 Unit Test

- `src/services/` 與 `src/stores/` 下的所有邏輯必須有對應的 unit test 保護
- 每個 `it()` / `test()` 上方需有註解，說明**測試案例名稱**與**情境說明**（為何要測這個）

範例：
```ts
// 案例：Timer 在 dirty flag 為 false 時不觸發存檔
// 情境：使用者打了字又全部刪回原始內容，false positive 不應寫入磁碟
it('should not save when dirty flag is false', () => { ... })
```

### 5. Naming 遵循官方建議

- TypeScript：遵循 [TypeScript 官方命名慣例](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- Vue：遵循 [Vue 3 官方 Style Guide](https://vuejs.org/style-guide/)（Priority A & B 為強制）
- 元件名稱用 PascalCase，composable 用 `use` 前綴 camelCase，常數用 UPPER_SNAKE_CASE
