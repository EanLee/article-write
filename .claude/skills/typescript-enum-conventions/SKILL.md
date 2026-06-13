---
name: typescript-enum-conventions
description: TypeScript Enum 使用規範與命名慣例。新增或修改固定選項集合的型別（狀態、分類、主題等）時必用。
---

# TypeScript Enum 規範

優先使用 **Enum** 而非字串字面值類型，提升型別安全與可維護性。

## 何時使用 Enum

✅ **應該使用**：
- 固定的狀態選項（如：draft, published）
- 固定的分類選項（如：Software, growth, management）
- 固定的主題選項（如：light, dark）
- 任何有明確、有限選項集合的情況

❌ **不應該使用**：
- 動態產生的值
- 可能隨時間變化的選項
- 來自外部 API 的動態資料

## 命名規範

- **Enum 名稱**：PascalCase，清楚描述用途（`ArticleStatus`、`ArticleCategory`、`SaveStatus`）
- **Enum 成員**：PascalCase（`Draft`、`Published`）
- **字串值**：依現有慣例（小寫或 camelCase，例如 `ArticleCategory.Software = 'Software'`）

## 範例

```typescript
export enum ArticleStatus {
  Draft = 'draft',
  Published = 'published'
}

// ✅ 好的做法
import { ArticleStatus } from '@/types'
if (article.status === ArticleStatus.Published) { /* ... */ }

// ❌ 避免：字串字面值容易拼錯，沒有 IDE 提示
if (article.status === 'published') { /* ... */ }
```

## 組織結構

所有 Enum 定義統一放在 `src/types/index.ts` 檔案開頭，interface 欄位型別引用 enum 而非字串字面值：

```typescript
// Enums - 集中定義所有列舉類型
export enum ArticleStatus {
  Draft = 'draft',
  Published = 'published'
}

// Core data structures
export interface Article {
  status: ArticleStatus  // 使用 enum 而非 'draft' | 'published'
}
```

## 優點

型別安全、IDE 自動完成與重構支援、集中管理、避免魔術字串。
