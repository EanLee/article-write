# WriteFlow

> **讓寫作更流暢** - 專為內容創作者打造的寫作與發布工具

WriteFlow 是一個桌面應用程式，幫助內容創作者從 Obsidian 無縫發布文章到 Astro 部落格。無論你是技術部落客、生活創作者還是專業寫手，WriteFlow 讓發布變得簡單快速。

**核心價值**：從寫作到發布，一氣呵成。

## 技術堆疊

| 類別 | 技術 |
|------|------|
| **前端框架** | Vue 3 (Composition API) |
| **類型系統** | TypeScript 5.9 |
| **桌面框架** | Electron 39 |
| **UI 框架** | Tailwind CSS 4 + DaisyUI 5 |
| **狀態管理** | Pinia 3 |
| **建置工具** | Vite 7 |
| **測試框架** | Vitest 4 |
| **Markdown** | markdown-it + highlight.js |

## 專案結構

```
src/
├── main/                    # Electron 主進程
│   ├── main.ts             # 主進程入口
│   ├── preload.ts          # 預載腳本 (IPC 橋接)
│   └── services/           # 主進程服務
│       ├── FileService.ts      # 檔案 I/O 與監聽
│       ├── ConfigService.ts    # 配置管理
│       └── ProcessService.ts   # 進程管理 (Dev Server)
│
├── components/              # Vue UI 元件
│   ├── MainEditor.vue          # 主編輯器 (分屏預覽)
│   ├── EditorPane.vue          # 編輯面板
│   ├── PreviewPane.vue         # 預覽面板
│   ├── FrontmatterEditor.vue   # 前置資料編輯器
│   ├── ImageManager.vue        # 圖片管理器
│   ├── ArticleList.vue         # 文章列表
│   ├── ConversionPanel.vue     # 格式轉換面板
│   ├── SettingsPanel.vue       # 設定面板
│   └── ServerControlPanel.vue  # 伺服器控制面板
│
├── composables/             # Vue Composables
│   ├── useServices.ts          # 服務單例管理
│   ├── useEditorShortcuts.ts   # 編輯器快捷鍵
│   ├── useAutocomplete.ts      # 自動完成功能
│   └── useEditorValidation.ts  # 語法驗證
│
├── services/                # 業務邏輯服務
│   ├── MarkdownService.ts      # Markdown 解析與渲染
│   ├── ConverterService.ts     # Obsidian → Astro 轉換
│   ├── ImageService.ts         # 圖片管理
│   ├── ObsidianSyntaxService.ts # Obsidian 語法支援
│   ├── PreviewService.ts       # 預覽渲染
│   ├── AutoSaveService.ts      # 自動儲存
│   ├── BackupService.ts        # 備份管理
│   └── NotificationService.ts  # 通知系統
│
├── stores/                  # Pinia 狀態管理
│   ├── article.ts              # 文章狀態
│   ├── config.ts               # 配置狀態
│   └── server.ts               # 伺服器狀態
│
├── types/                   # TypeScript 類型定義
│   ├── index.ts                # 核心資料結構
│   └── electron.d.ts           # Electron API 類型
│
├── App.vue                  # 根元件
├── main.ts                  # Vue 應用程式入口
└── style.css                # 全域樣式
```

## 功能特色

### 編輯功能
- 分屏編輯與即時預覽
- Obsidian 語法支援 (Wiki Links、Task Lists、Callouts)
- 快捷鍵支援 (Ctrl+B 粗體、Ctrl+I 斜體、Ctrl+K 連結等)
- 自動配對括號與引號
- 語法驗證與錯誤提示
- 自動完成 (標籤、連結、圖片)

### 文章管理
- 草稿/已發布狀態管理
- 分類管理 (Software/Growth/Management)
- 標籤篩選與搜尋
- 前置資料 (Frontmatter) 編輯
- Raw 模式編輯

### 自動化功能
- 自動儲存 (可設定間隔)
- 檔案監聽 (偵測外部修改)
- 備份與衝突檢測
- Obsidian → Astro 格式自動轉換

### 圖片管理
- 拖拽上傳
- 使用狀態追蹤
- 批次複製到目標部落格

### 開發伺服器
- 一鍵啟動 Astro Dev Server
- 即時日誌顯示
- 運行狀態監控

## 開發指令

```bash
# 安裝依賴
pnpm install

# 開發模式
pnpm run dev

# 建置應用程式
pnpm run build

# 執行測試
pnpm run test

# 監控測試
pnpm run test:watch

# Lint 檢查
pnpm run lint

# Lint 自動修復
pnpm run lint:fix
```

## 架構設計

### 分層架構

```
┌─────────────────────────────────────────────────────────────┐
│                      UI 層 (Vue Components)                  │
├─────────────────────────────────────────────────────────────┤
│                   Composables (可重用邏輯)                    │
├─────────────────────────────────────────────────────────────┤
│                 狀態管理層 (Pinia Stores)                     │
├─────────────────────────────────────────────────────────────┤
│                  業務邏輯層 (Services)                        │
├─────────────────────────────────────────────────────────────┤
│              IPC 通訊層 (preload.ts)                         │
├─────────────────────────────────────────────────────────────┤
│               Electron 主進程 (main/)                        │
└─────────────────────────────────────────────────────────────┘
```

### IPC 通訊

渲染進程透過 `window.electronAPI` 與主進程通訊：

| 類別 | 通道 |
|------|------|
| 檔案操作 | `read-file`, `write-file`, `delete-file`, `copy-file` |
| 目錄操作 | `read-directory`, `create-directory`, `get-file-stats` |
| 檔案監聽 | `start-file-watching`, `stop-file-watching`, `file-change` |
| 配置操作 | `get-config`, `set-config`, `validate-obsidian-vault` |
| 進程管理 | `start-dev-server`, `stop-dev-server`, `get-server-status` |

## 設定需求

### Obsidian Vault 結構

```
your-vault/
├── Drafts/              # 草稿文章
│   ├── Software/
│   ├── growth/
│   └── management/
├── Publish/             # 已發布文章
│   ├── Software/
│   ├── growth/
│   └── management/
└── images/              # 圖片資源
```

### Astro 部落格結構

```
your-blog/
├── src/
│   └── content/
│       └── blog/        # 文章輸出目錄
├── public/
│   └── images/          # 圖片輸出目錄
└── package.json
```

## 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+S` | 儲存 |
| `Ctrl+B` | 粗體 |
| `Ctrl+I` | 斜體 |
| `Ctrl+K` | 插入連結 |
| `Ctrl+E` | 高亮文字 |
| `Ctrl+/` | 切換預覽 |

## 常見問題

### Electron 安裝問題

如果遇到 `Electron failed to install correctly` 錯誤：

```bash
# 手動執行 Electron 安裝腳本
node node_modules/.pnpm/electron@39.2.7/node_modules/electron/install.js
```

### Port 占用問題

開發模式預設使用 port 3002。如果被占用，Vite 會自動切換到其他 port，請確保 Electron 主進程使用相同的 port。

## 授權

MIT License
