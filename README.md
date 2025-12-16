# 部落格撰寫應用程式

一個整合 Obsidian markdown 編輯與 Astro 部落格發布的桌面應用程式。

## 技術堆疊

- **前端框架**: Vue 3 (Composition API)
- **類型系統**: TypeScript
- **桌面框架**: Electron
- **UI 框架**: Element Plus
- **狀態管理**: Pinia
- **建置工具**: Vite
- **測試框架**: Vitest

## 專案結構

```
src/
├── main/                 # Electron 主程序
│   ├── main.ts          # 主程序入口
│   ├── preload.ts       # 預載腳本
│   └── services/        # 主程序服務
├── components/          # Vue 元件
├── stores/             # Pinia 狀態管理
├── services/           # 渲染程序服務
├── types/              # TypeScript 類型定義
└── main.ts             # Vue 應用程式入口
```

## 開發指令

```bash
# 安裝依賴
pnpm install

# 首次安裝或遇到 Electron 問題時，需手動執行
node node_modules\.pnpm\electron@39.2.7\node_modules\electron\install.js

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

## 常見問題

### Electron 安裝問題

如果遇到 `Electron failed to install correctly` 錯誤：

```bash
# 手動執行 Electron 安裝腳本
node node_modules\.pnpm\electron@39.2.7\node_modules\electron\install.js
```

或建立 `.npmrc` 檔案啟用建置腳本：

```
enable-pre-post-scripts=true
```

### Port 占用問題

如果開發時 port 3002 被占用，Vite 會自動切換到其他 port（如 3003）。請確保 Electron 主程序也使用相同的 port。

## 功能特色

- 📝 Obsidian 格式 Markdown 編輯
- 🔄 自動轉換為 Astro 部落格格式
- 📁 文章分類管理 (Software/Growth/Management)
- 🏷️ 標籤和前置資料編輯
- 👀 即時預覽功能
- 💾 自動儲存
- 🖼️ 圖片管理
- 🚀 本地開發伺服器管理

## 設定需求

1. **Obsidian Vault**: 包含 Publish/Drafts/Images 資料夾結構
2. **Astro 部落格**: 包含 src/content/blog 結構的 Node.js 專案