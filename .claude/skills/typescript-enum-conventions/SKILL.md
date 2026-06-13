---
name: typescript-enum-conventions
description: TypeScript Enum 使用規範與命名慣例。新增或修改固定選項集合的型別（狀態、分類、主題等）時必用。
---

# TypeScript Enum 規範

完整規範（命名規則、範例、組織結構、優點）→ [程式碼風格與型別規範](../../../docs/conventions/GUIDELINE-2026-06-13-code-style.md)（本 skill 為該 GUIDELINE 衍生的 agent 操作判斷準則）

## 判斷準則（修改/新增 src/types/index.ts 時套用）

✅ **應該使用 Enum**：
- 固定的狀態選項（如：draft, published）
- 固定的分類選項（如：Software, growth, management）
- 固定的主題選項（如：light, dark）
- 任何有明確、有限選項集合的情況

❌ **不應該使用 Enum**：
- 動態產生的值
- 可能隨時間變化的選項
- 來自外部 API 的動態資料

## 速查範例

```typescript
// Enums - 集中定義於 src/types/index.ts 開頭，PascalCase 命名
export enum ArticleStatus {
  Draft = 'draft',
  Published = 'published'
}

export interface Article {
  status: ArticleStatus  // ✅ 引用 enum，而非 'draft' | 'published'
}

if (article.status === ArticleStatus.Published) { /* ✅ */ }
if (article.status === 'published') { /* ❌ 避免字串字面值 */ }
```
