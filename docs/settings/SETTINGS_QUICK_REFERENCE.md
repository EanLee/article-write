# 設定面板快速參考

> **版本**: 2.0
> **適用對象**: 開發者、設計師、產品經理

## 快速導覽

```
設定面板
├── 基本設定 (Basic)
│   ├── 文章資料夾 [必填]
│   ├── 部落格專案路徑 [必填]
│   ├── 圖片資料夾 [選填]
│   └── 快速設定提示
├── 部落格框架 (Framework)
│   ├── Astro (已支援)
│   ├── Hugo (規劃中)
│   ├── Hexo (規劃中)
│   └── Jekyll (規劃中)
├── 編輯器 (Editor)
│   ├── 自動儲存
│   ├── 儲存間隔
│   └── 主題
└── Git 發布 (Git) [即將推出]
    ├── 自動 Commit (未來)
    ├── 自動 Push (未來)
    └── Commit 模板 (未來)
```

## 組件屬性

### Props

```typescript
interface Props {
  modelValue: boolean  // Modal 開關狀態
}
```

### Emits

```typescript
interface Emits {
  (e: 'update:modelValue', value: boolean): void
}
```

### 使用範例

```vue
<template>
  <SettingsPanel v-model="showSettings" />
</template>

<script setup>
const showSettings = ref(false)
</script>
```

## 設定項目詳細

### 基本設定 Tab

| 項目 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| 文章資料夾 | string | ✅ | '' | 存放 Markdown 文章的資料夾 |
| 部落格專案路徑 | string | ✅ | '' | 靜態網站專案的根目錄 |
| 圖片資料夾 | string | ❌ | '{articlesDir}/images' | 統一管理圖片的資料夾 |

### 編輯器 Tab

| 項目 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| 自動儲存 | boolean | ❌ | true | 是否啟用自動儲存 |
| 儲存間隔 | number | ❌ | 30000 (ms) | 自動儲存間隔（毫秒） |
| 主題 | 'light' \| 'dark' | ❌ | 'light' | 編輯器主題 |

## DaisyUI 組件使用

### 顏色系統

```css
/* 主要顏色 */
primary    - 主要操作（儲存按鈕、選中狀態）
secondary  - 次要元素（部落格路徑圖示）
accent     - 強調元素（圖片路徑圖示）

/* 語義顏色 */
success    - 驗證成功（綠色圓點）
warning    - 驗證警告（黃色圓點）
error      - 必填標籤（紅色 Badge）
info       - 提示訊息（藍色 Alert）

/* 中性色 */
base-100   - 背景
base-200   - 次要背景
base-300   - 邊框
base-content - 文字
```

### 組件清單

| 組件 | 用途 | 位置 |
|------|------|------|
| Modal | 整體容器 | 最外層 |
| Card | 設定項目卡片 | 基本設定 Tab |
| Badge | 必填/選填標籤 | 設定項目標題 |
| Toggle | 開關 | 自動儲存 |
| Radio | 單選 | 主題選擇、框架選擇 |
| Range | 滑桿 | 儲存間隔 |
| Alert | 提示訊息 | 各 Tab |
| Join | 輸入框組合 | 路徑輸入 |
| Tabs (Boxed) | Tab 切換 | 頂部導覽 |
| Divider | 分隔線 | 框架 Tab |

## 圖示參考

### SVG 圖示

```html
<!-- 文件圖示 (文章資料夾) -->
<svg>
  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>

<!-- 地球圖示 (部落格路徑) -->
<svg>
  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
</svg>

<!-- 圖片圖示 (圖片資料夾) -->
<svg>
  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
</svg>

<!-- 太陽圖示 (淺色模式) -->
<svg>
  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
</svg>

<!-- 月亮圖示 (深色模式) -->
<svg>
  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
</svg>

<!-- 資料夾圖示 (瀏覽按鈕) -->
<svg>
  <path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
</svg>

<!-- 關閉圖示 (關閉按鈕) -->
<svg>
  <path d="M6 18L18 6M6 6l12 12" />
</svg>

<!-- 重設圖示 (重設按鈕) -->
<svg>
  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
</svg>

<!-- 勾選圖示 (儲存按鈕) -->
<svg>
  <path d="M5 13l4 4L19 7" />
</svg>
```

## 狀態管理

### Local State

```typescript
const activeTab = ref('basic')  // 當前顯示的 Tab
const localConfig = ref<AppConfig>({
  paths: {
    articlesDir: '',
    targetBlog: '',
    imagesDir: ''
  },
  editorConfig: {
    autoSave: true,
    autoSaveInterval: 30000,
    theme: 'light'
  }
})

const articlesValidation = ref({
  valid: false,
  message: '請選擇路徑'
})

const blogValidation = ref({
  valid: false,
  message: '請選擇路徑'
})
```

### Computed

```typescript
// 儲存間隔（秒 ↔ 毫秒轉換）
const autoSaveSeconds = computed({
  get: () => Math.floor(localConfig.value.editorConfig.autoSaveInterval / 1000),
  set: (value: number) => {
    localConfig.value.editorConfig.autoSaveInterval = value * 1000
  }
})

// 是否可以儲存（必填項檢查）
const canSave = computed(() => {
  return localConfig.value.paths.articlesDir &&
         localConfig.value.paths.targetBlog
})
```

### Watchers

```typescript
// 路徑變更時觸發驗證
watch(
  () => [localConfig.value.paths.articlesDir, localConfig.value.paths.targetBlog],
  async () => {
    await validatePaths()
  }
)

// Modal 開啟時載入設定
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      localConfig.value = JSON.parse(JSON.stringify(configStore.config))
      await validatePaths()
    }
  }
)
```

## 方法參考

### 路徑選擇

```typescript
async function selectArticlesPath() {
  const selectedPath = await window.electronAPI.selectDirectory({
    title: '選擇文章資料夾',
    defaultPath: localConfig.value.paths.articlesDir
  })

  if (selectedPath) {
    localConfig.value.paths.articlesDir = selectedPath
    // 自動設定圖片路徑
    if (!localConfig.value.paths.imagesDir) {
      localConfig.value.paths.imagesDir = selectedPath + '/images'
    }
  }
}
```

### 路徑驗證

```typescript
async function validatePaths() {
  // 驗證文章資料夾
  if (localConfig.value.paths.articlesDir) {
    const result = await configStore.validateArticlesDir(
      localConfig.value.paths.articlesDir
    )
    articlesValidation.value = result
  }

  // 驗證部落格路徑
  if (localConfig.value.paths.targetBlog) {
    const result = await configStore.validateAstroBlog(
      localConfig.value.paths.targetBlog
    )
    blogValidation.value = result
  }
}
```

### 儲存設定

```typescript
async function handleSave() {
  await configStore.saveConfig(localConfig.value)

  // 重新載入文章
  if (localConfig.value.paths.articlesDir) {
    await articleStore.loadArticles()
  }

  // 關閉 Modal
  emit('update:modelValue', false)
}
```

## 樣式類別速查

### 布局

```css
/* Modal */
.modal-open           - Modal 開啟狀態
.modal-box           - Modal 容器
w-11/12              - 寬度 91.67%
max-w-5xl            - 最大寬度 64rem
max-h-[90vh]         - 最大高度 90vh

/* 內容區域 */
.overflow-y-auto     - 垂直滾動
max-h-[calc(90vh-240px)] - 計算後的最大高度

/* 間距 */
.space-y-4           - 垂直間距 1rem
.gap-3               - Grid/Flex 間距 0.75rem
.p-6                 - Padding 1.5rem
```

### Tabs

```css
.tabs                - Tab 容器
.tabs-boxed          - 盒裝樣式
.tab                 - 單個 Tab
.tab-active          - 選中狀態
```

### 卡片

```css
.card                - 卡片容器
.card-body           - 卡片內容
.border              - 邊框
.border-base-300     - 邊框顏色
```

### Badge

```css
.badge               - Badge 容器
.badge-error         - 錯誤色（必填）
.badge-ghost         - 灰色（選填）
.badge-primary       - 主色（目前支援）
.badge-warning       - 警告色（即將推出）
.badge-sm            - 小尺寸
```

## 響應式斷點

```css
/* Tailwind 預設斷點 */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px

/* 本組件使用 */
- 所有斷點都適用（固定寬度比例）
- Modal 寬度: w-11/12 (所有裝置)
- 最大寬度: max-w-5xl (1280px)
```

## 可訪問性檢查清單

- [x] 語義化 HTML (role, aria-label)
- [x] 鍵盤導航 (Tab 鍵)
- [x] 焦點管理 (Modal trap)
- [x] 顏色對比度 (WCAG AA)
- [x] 螢幕閱讀器支援
- [x] 錯誤訊息可讀
- [x] 互動元素可點擊區域 ≥ 44px

## 效能優化

### 渲染優化

```vue
<!-- 使用 v-show 而非 v-if -->
<div v-show="activeTab === 'basic'">...</div>

<!-- 避免不必要的 computed -->
const canSave = computed(() => ...)  // 僅依賴兩個屬性
```

### 驗證優化

```typescript
// 使用 debounce 避免頻繁驗證（未來可考慮）
watch(
  () => localConfig.value.paths.articlesDir,
  debounce(async () => {
    await validatePaths()
  }, 500)
)
```

## 測試要點

### 單元測試

```typescript
describe('SettingsPanel', () => {
  it('預設顯示基本設定 Tab', () => {
    expect(activeTab.value).toBe('basic')
  })

  it('必填項未填時禁用儲存按鈕', () => {
    expect(canSave.value).toBe(false)
  })

  it('選擇文章路徑後自動設定圖片路徑', async () => {
    await selectArticlesPath()
    expect(localConfig.value.paths.imagesDir).toContain('images')
  })
})
```

### E2E 測試

```typescript
test('完整設定流程', async () => {
  // 1. 開啟設定
  await page.click('[data-testid="settings-button"]')

  // 2. 選擇文章路徑
  await page.click('[data-testid="select-articles-dir"]')
  // ... 選擇資料夾

  // 3. 選擇部落格路徑
  await page.click('[data-testid="select-blog-dir"]')
  // ... 選擇資料夾

  // 4. 儲存
  await page.click('[data-testid="save-button"]')

  // 5. 驗證
  expect(await configStore.config.paths.articlesDir).toBeTruthy()
})
```

## 常見問題

### Q: 為什麼使用 v-show 而非 v-if？

**A**: Tab 切換頻繁，v-show 避免重複渲染 DOM，效能更好。

### Q: 為什麼圖片路徑會自動填入？

**A**: 降低設定門檻，大多數用戶使用預設路徑即可。

### Q: 為什麼預留「Git 發布」Tab？

**A**: 根據產品規劃，Git 自動化是核心功能，提前預告降低未來的認知負擔。

### Q: 如何新增新的部落格框架？

**A**: 在「部落格框架」Tab 中：
1. 移除 `disabled` 屬性
2. 添加對應的 value
3. 實作後端適配器
4. 更新 Badge 為「目前支援」

## 更新日誌

### v2.0.0 (2026-01-24)

- ✅ 重新設計整體 UI
- ✅ 改用 4 Tab 結構
- ✅ 添加卡片式布局
- ✅ 標示必填/選填
- ✅ 預留框架選擇和 Git 設定空間
- ✅ 優化文案和說明

### v1.0.0

- 初始版本（2 Tab）

---

**維護者**: UI/UX Export Specialist
**最後更新**: 2026-01-24
