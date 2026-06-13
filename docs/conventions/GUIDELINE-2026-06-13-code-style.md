---
doc_type: GUIDELINE
doc_id: GUIDELINE-2026-06-13-code-style
title: "程式碼風格與型別規範"
domain: conventions
status: draft
bounded_context: engineering-conventions
version: 1
created_at: 2026-06-13
last_reviewed: ~
source: 整併自 DEVELOPMENT.md「程式碼規範」（2025-01-24）與 typescript-enum-conventions skill（2026-06-13）
ai_generated: true
---

# 程式碼風格與型別規範

## 目的

統一 TypeScript / Vue 寫法、命名與型別慣例，降低跨檔案閱讀與維護成本，並提升型別安全。

## 範圍

適用於本專案 `src/` 下所有 TypeScript（`.ts`）與 Vue（`.vue`）原始碼。

## 規範內容

### TypeScript

- 啟用嚴格模式
- 避免使用 `any`
- 為公開 API 提供型別定義
- 使用介面（`interface`）而非型別別名（`type`）定義物件

### Vue

- 使用 Composition API
- 使用 `<script setup>` 語法
- Props 和 Emits 必須定義型別
- 使用 `defineProps` 和 `defineEmits`

### 命名規範

- **檔案名稱**：PascalCase（`.vue`）或 camelCase（`.ts`）
- **組件名稱**：PascalCase
- **變數/函數**：camelCase
- **常數**：UPPER_SNAKE_CASE
- **型別/介面**：PascalCase

### 註解

- 複雜邏輯必須加註解
- 使用 JSDoc 為公開 API 加註解
- 避免無意義的註解

### Enum 規範

固定選項集合（狀態、分類、主題等）優先使用 **Enum** 而非字串字面值類型，提升型別安全與可維護性。

#### 何時使用 Enum

✅ **應該使用**：
- 固定的狀態選項（如：draft, published）
- 固定的分類選項（如：Software, growth, management）
- 固定的主題選項（如：light, dark）
- 任何有明確、有限選項集合的情況

❌ **不應該使用**：
- 動態產生的值
- 可能隨時間變化的選項
- 來自外部 API 的動態資料

#### 命名規範

- **Enum 名稱**：PascalCase，清楚描述用途（`ArticleStatus`、`ArticleCategory`、`SaveStatus`）
- **Enum 成員**：PascalCase（`Draft`、`Published`）
- **字串值**：依現有慣例（小寫或 camelCase，例如 `ArticleCategory.Software = 'Software'`）

#### 範例

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

#### 組織結構

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

#### 優點

型別安全、IDE 自動完成與重構支援、集中管理、避免魔術字串。

## 例外情況

無。若有特殊情境需偏離本規範（例如第三方 API 回傳的動態欄位），於該檔案以註解說明原因。

## 相關文件

- `.claude/skills/typescript-enum-conventions/SKILL.md`
- `.claude/CLAUDE.md`
