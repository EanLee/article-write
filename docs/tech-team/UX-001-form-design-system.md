# UX-001 表單設計規範

**日期**: 2026-02-15
**負責人**: Alex（UI/UX Designer）
**狀態**: ✅ 草稿確立，待 Wei 實作套用

---

## 背景

圓桌討論後加入技術團隊。首要任務：定義 WriteFlow 的表單設計規範，解決目前 FrontmatterEditor 等表單畫面「label 與 input 間距混亂、視覺層級不清晰」的問題，並建立可複用的設計語言。

---

## 問題診斷

目前 FrontmatterEditor modal 的主要問題：

1. **DaisyUI `label` 元件預設有 `py-2` padding**，造成 label 與 input 之間出現過大空隙
2. **欄位全部單欄排列**，`max-w-2xl` 的寬度完全浪費，導致大量垂直滾動
3. **`form-control` + `label` + `input` 三層嵌套**，每個欄位視覺重量相同，缺乏層級感
4. **標籤與關鍵字 badge 區塊** 結構相同但用途不同，視覺無法區分

---

## 設計原則

### 1. 標籤樣式

**規則**：使用輕量 label，不使用 DaisyUI `label` 元件（避免多餘 padding）。

```html
<!-- ✅ 採用 -->
<label class="block text-sm font-medium mb-1">欄位名稱</label>
<input class="input input-bordered w-full" />

<!-- ❌ 避免 -->
<div class="form-control">
  <label class="label">
    <span class="label-text">欄位名稱</span>
  </label>
  <input class="input input-bordered" />
</div>
```

**理由**：
- `block text-sm font-medium mb-1` 讓 label 與 input 只有 `4px` 間距，緊密但清楚
- 移除 DaisyUI `label` 的 `py-2`（上下各 `8px`），節省垂直空間
- `font-medium` 提供足夠的視覺權重，不需要額外框線或背景

### 2. 輔助文字（hint text）

```html
<label class="block text-sm font-medium mb-1">網址代稱</label>
<input class="input input-bordered w-full" />
<p class="text-xs text-base-content/50 mt-1">留空將根據標題自動生成</p>
```

- 輔助文字緊接在 input 下方，`mt-1`（`4px`）
- 用 `text-xs text-base-content/50` 弱化顏色，明確與 label 區分

### 3. 欄位間距

| 情境 | Class | 說明 |
|------|-------|------|
| 欄位與欄位之間 | `space-y-3` | 比原本 `space-y-4` 緊湊 |
| grid 欄位間距 | `gap-3` | 與垂直間距一致 |
| section 分隔 | `pt-1 border-t border-base-200` | 邏輯分組的視覺區隔 |

### 4. 表單欄位分組原則

多欄位 modal 應按「資訊性質」分組，避免單純依欄位數量切分：

| 分組 | 欄位 | 說明 |
|------|------|------|
| 主要資訊 | 標題、網址代稱 | 最重要、最常修改 |
| 內容描述 | 描述 | 獨立一行，textarea |
| 分類與日期 | 分類、發布日期 | 管理用資訊 |
| 系列 | 系列名稱、系列順序 | 選填，放同一行 |
| 標籤 / SEO | 標籤、關鍵字 | 並排，視覺區分 badge 顏色 |

### 5. Badge 標籤移除按鈕

```html
<!-- ✅ 採用：簡潔的 × 符號，不使用 btn 元件 -->
<span class="badge badge-primary gap-1">
  Vue
  <button type="button" class="cursor-pointer leading-none hover:opacity-60" @click="removeTag(tag)">×</button>
</span>
```

- 移除 `btn btn-ghost btn-xs`，避免 badge 內出現 button 樣式殘留
- `leading-none` 防止 × 符號撐高 badge 高度

---

## FrontmatterEditor 套用規範

### 目標佈局

```
┌─────────────────────────────────────────────┐
│ 編輯前置資料                                  │
├─────────────────────────────────────────────┤
│ 標題 *                                        │
│ [                                          ] │
├──────────────────────┬──────────────────────┤
│ 網址代稱              │ 分類                  │
│ [                  ] │ [▼               ]   │
│ 留空自動生成           │                      │
├─────────────────────────────────────────────┤
│ 描述                                         │
│ [                                          ] │
│ [                                          ] │
├──────────────┬───────────────┬──────────────┤
│ 發布日期      │ 系列名稱        │ 系列順序      │
│ [          ] │ [           ] │ [          ] │
├──────────────────────┬──────────────────────┤
│ 標籤                  │ SEO 關鍵字            │
│ [Vue] [×] [TS] [×]   │ [Vue3] [×]           │
│ [輸入標籤    ] [新增]  │ [輸入關鍵字  ] [新增] │
├─────────────────────────────────────────────┤
│                          [取消]  [儲存]       │
└─────────────────────────────────────────────┘
```

### Class 對照表（舊 → 新）

| 位置 | 舊 | 新 |
|------|----|----|
| form 間距 | `space-y-4` | `space-y-3` |
| label 容器 | `<label class="label"><span class="label-text">` | `<label class="block text-sm font-medium mb-1">` |
| 輔助文字 | `<label class="label"><span class="label-text-alt">` | `<p class="text-xs text-base-content/50 mt-1">` |
| badge 移除按鈕 | `class="btn btn-ghost btn-xs"` | `class="cursor-pointer leading-none hover:opacity-60"` |

---

## 延伸規範（未來套用）

此規範同樣適用於：
- 設定頁面（Settings）
- 文章搜尋過濾面板
- 任何含多個輸入欄位的 modal

---

## 相關檔案

- `src/components/FrontmatterEditor.vue`

## 參考 Commit

_待 Wei 套用後補充_
