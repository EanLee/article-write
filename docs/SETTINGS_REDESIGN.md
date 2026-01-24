# 設定面板 UI/UX 重新設計

> **版本**: 2.0
> **日期**: 2026-01-24
> **狀態**: 已實作

## 設計目標

基於產品定位「Markdown 部落格寫作與發布工具」，重新設計設定面板以：

1. **清楚表達產品定位**：強調這是「部落格工具」而非通用編輯器
2. **降低設定門檻**：首次使用能在 3 步內完成基本設定
3. **為未來擴展預留空間**：框架選擇、Git 自動化等功能
4. **提升視覺層級**：必填項突出，選填項次要

## 主要改進

### 1. 重組設定結構

**舊版** (2 個 Tab):
- 路徑設定
- 編輯器設定

**新版** (4 個 Tab):
- **基本設定**: 文章路徑、部落格路徑、圖片路徑
- **部落格框架**: 當前支援 Astro，未來擴展 Hugo/Hexo/Jekyll
- **編輯器**: 自動儲存、主題
- **Git 發布**: 預留給未來的 Git 自動化功能

### 2. 視覺優化

#### 卡片式布局
- 每個設定項目使用獨立卡片
- 添加圖示增強識別度
- 清楚標示必填/選填

#### 狀態指示
- 必填項使用紅色 Badge
- 選填項使用灰色 Badge
- 即時路徑驗證（綠色/黃色圓點）

#### 互動優化
- 按鈕添加圖示
- Hover 狀態優化
- 範圍滑桿取代純數字輸入

### 3. 內容改進

#### 標題與說明
- 主標題：「部落格設定」（而非「應用程式設定」）
- 副標題：「配置您的部落格寫作與發布環境」
- 每個設定項都有清楚的說明文字

#### 範例與提示
- 輸入框提供 placeholder 範例
- 添加快速設定提示
- 預設行為清楚說明

### 4. 未來擴展性

#### 部落格框架 Tab
- 當前僅支援 Astro（標示「目前支援」）
- 預留 Hugo/Hexo/Jekyll（標示「規劃中」）
- 使用 radio 選項，未來可直接啟用

#### Git 發布 Tab
- 整個 Tab 標示「即將推出」
- 預覽未來功能（灰階顯示）：
  - 自動 Git Commit
  - 自動 Git Push
  - Commit Message 模板

## 設計細節

### 基本設定 Tab

```
文章資料夾 [必填]
├─ 圖示：文件圖示 (藍色)
├─ 說明：存放您的 Markdown 文章的資料夾（支援 Wiki Link 語法）
├─ 輸入框 + 「選擇資料夾」按鈕
└─ 即時驗證狀態

部落格專案路徑 [必填]
├─ 圖示：地球圖示 (紫色)
├─ 說明：您的靜態網站專案資料夾（將發布文章到此處）
├─ 輸入框 + 「選擇資料夾」按鈕
└─ 即時驗證狀態

圖片資料夾 [選填]
├─ 圖示：圖片圖示 (橙色)
├─ 說明：統一管理您的文章圖片（留空則自動使用 文章資料夾/images）
├─ 輸入框 + 「選擇資料夾」按鈕
└─ 預設路徑提示（當留空時）

快速設定提示
└─ Info 提示框，引導 3 步完成設定
```

### 部落格框架 Tab

```
選擇部落格框架
├─ Astro [目前支援] ✓
│  └─ 支援 Content Collections 結構
├─ Hugo [規劃中] (灰階)
├─ Hexo [規劃中] (灰階)
└─ Jekyll [規劃中] (灰階)

Info 提示：更多框架支援正在開發中
```

### 編輯器 Tab

```
自動儲存
├─ Toggle 開關
└─ 說明：定期自動儲存文章變更，避免意外丟失內容

儲存間隔 (僅當自動儲存啟用時顯示)
├─ 範圍滑桿 (10-300 秒)
└─ 即時顯示當前值

編輯器主題
├─ 淺色模式 (太陽圖示)
│  └─ 說明：適合白天使用
└─ 深色模式 (月亮圖示)
   └─ 說明：適合夜間使用
```

### Git 發布 Tab

```
[整個 Tab 標示為「即將推出」]

未來功能預覽 (灰階顯示):
├─ 自動 Git Commit
├─ 自動 Git Push
└─ Commit Message 模板

Info 提示：功能開發中，將在下個版本推出
```

## UX 流程優化

### 首次使用流程

1. **開啟設定** → 預設顯示「基本設定」Tab
2. **選擇文章資料夾** → 點擊「選擇資料夾」按鈕
   - 自動設定圖片資料夾為 `文章資料夾/images`
   - 即時顯示驗證狀態
3. **選擇部落格專案** → 點擊「選擇資料夾」按鈕
   - 即時顯示驗證狀態
4. **儲存設定** → 「儲存設定」按鈕
   - 只有填寫必填項後才能點擊

### 後續調整流程

1. 點擊齒輪圖示開啟設定
2. 選擇要調整的 Tab
3. 修改設定
4. 點擊「儲存設定」

### 錯誤處理

- 路徑驗證失敗 → 黃色圓點 + 錯誤訊息
- 必填項未填 → 儲存按鈕禁用
- 瀏覽器模式 → 顯示警告訊息

## 技術實作

### 組件結構

```vue
<template>
  <div class="modal modal-open">
    <div class="modal-box">
      <!-- Header -->
      <div>標題 + 副標題 + 關閉按鈕</div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed">
        基本設定 | 部落格框架 | 編輯器 | Git 發布
      </div>

      <!-- Tab Content (v-show 切換) -->
      <div class="overflow-y-auto">
        <!-- 各 Tab 內容 -->
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-between">
        <button>重設為預設值</button>
        <div>
          <button>取消</button>
          <button :disabled="!canSave">儲存設定</button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 狀態管理

```typescript
const activeTab = ref('basic')  // 當前 Tab
const localConfig = ref<AppConfig>({ ... })  // 本地設定副本
const articlesValidation = ref({ valid: false, message: '' })
const blogValidation = ref({ valid: false, message: '' })

const canSave = computed(() =>
  localConfig.value.paths.articlesDir &&
  localConfig.value.paths.targetBlog
)
```

### 響應式設計

- Modal 寬度：`w-11/12 max-w-5xl`
- 最大高度：`max-h-[90vh]`
- 內容區域可滾動：`overflow-y-auto max-h-[calc(90vh-240px)]`

## 設計原則遵循

### 產品規劃對齊

- ✅ 設定步驟 ≤ 3 步（選擇文章路徑、部落格路徑、儲存）
- ✅ 清楚表達「部落格工具」定位
- ✅ 保持簡潔，避免過度設計
- ✅ 為未來功能預留空間

### DaisyUI 組件使用

- Modal
- Card
- Badge
- Toggle
- Radio
- Range (滑桿)
- Alert
- Tabs (Boxed 樣式)
- Join (輸入框 + 按鈕組合)

### 可訪問性

- 語義化 HTML (role, aria-label)
- 鍵盤導航支援
- 清楚的視覺層級
- 足夠的對比度

## 未來優化方向

### Phase 1 (當前版本)
- ✅ 重新設計 UI 結構
- ✅ 添加部落格框架預留空間
- ✅ 添加 Git 設定預留空間
- ✅ 優化視覺設計

### Phase 2 (未來)
- [ ] 實作部落格框架切換功能
- [ ] 實作 Git 自動化設定
- [ ] 添加設定匯入/匯出功能
- [ ] 添加設定驗證進度條

### Phase 3 (可選)
- [ ] 設定向導模式（首次使用引導）
- [ ] 設定預設模板（快速設定）
- [ ] 多專案管理（切換不同部落格）

## 成功指標

### 用戶體驗指標
- 首次設定完成時間 < 2 分鐘
- 設定錯誤率 < 5%
- 用戶能一眼看出必填項

### 技術指標
- 組件渲染時間 < 100ms
- 路徑驗證回應時間 < 500ms
- 無控制台錯誤

## 參考資料

- [產品規劃文件](./PRODUCT_SPEC.md)
- [DaisyUI 組件文檔](https://daisyui.com/components/)
- [原始設定面板](../src/components/SettingsPanel.vue)

---

**最後更新**: 2026-01-24
**設計者**: UI/UX Export Specialist
