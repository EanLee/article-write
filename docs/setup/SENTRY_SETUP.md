# Sentry 錯誤追蹤設定指南

**建立日期**: 2026-02-04
**負責人**: Sam (Ops) + Taylor (CTO)
**目的**: 在 WriteFlow 中整合 Sentry 錯誤追蹤，確保生產環境的問題能被及時發現和修復

---

## 1. 為什麼需要 Sentry？

### 問題背景

在開發階段，我們可以透過 console.log 和 debugger 追蹤問題。但在生產環境中：
- ❌ 使用者遇到錯誤時，開發者無法知道
- ❌ 使用者描述的錯誤往往不夠詳細
- ❌ 無法重現生產環境的特定錯誤
- ❌ 缺乏錯誤發生的上下文資訊

### Sentry 的價值

Sentry 提供：
- ✅ 自動捕獲和回報所有未處理的錯誤
- ✅ 完整的錯誤堆疊追蹤（Stack Trace）
- ✅ 錯誤發生時的上下文資訊（瀏覽器、OS、使用者操作）
- ✅ 錯誤趨勢分析和警報通知
- ✅ 免費版本支援 5,000 events/月，對 MVP 足夠

---

## 2. Sentry 架構設計

### 2.1 Electron 的雙進程架構

WriteFlow 是 Electron 應用，包含兩個進程：

```
┌─────────────────────────────────────────────────┐
│           Electron 應用程式                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  主進程 (Main Process)                    │  │
│  │  - 負責：視窗管理、檔案系統、原生功能        │  │
│  │  - 需要：@sentry/electron/main            │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  渲染進程 (Renderer Process)              │  │
│  │  - 負責：UI 渲染、Vue 應用邏輯             │  │
│  │  - 需要：@sentry/vue                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2.2 Sentry 整合策略

**方案選擇**：使用 `@sentry/electron` 統一包
- 包含主進程和渲染進程的 Sentry 整合
- 自動處理雙進程之間的協調
- 專為 Electron 應用設計

---

## 3. 實作步驟

### Step 1: 註冊 Sentry 帳號

1. 前往 [https://sentry.io/signup/](https://sentry.io/signup/)
2. 選擇 **Free Plan**（5,000 events/月）
3. 建立新的 Organization（例如：WriteFlow Team）
4. 建立新的 Project：
   - **Platform**: Electron
   - **Project Name**: writeflow-desktop
   - **Alert Frequency**: Default

5. 完成後會得到一個 **DSN (Data Source Name)**：
   ```
   https://[your-key]@o[org-id].ingest.sentry.io/[project-id]
   ```
   ⚠️ **重要**：這個 DSN 是敏感資訊，不要提交到 Git

### Step 2: 安裝 Sentry 套件

```bash
pnpm add @sentry/electron @sentry/vue
```

**套件說明**：
- `@sentry/electron`: Electron 主進程和預載腳本的 Sentry 整合
- `@sentry/vue`: Vue 3 應用的 Sentry 整合（渲染進程）

### Step 3: 設定環境變數

建立 `.env.local` 檔案（不提交到 Git）：

```env
# Sentry DSN (從 Sentry 控制台取得)
VITE_SENTRY_DSN=https://[your-key]@o[org-id].ingest.sentry.io/[project-id]

# 環境標記
VITE_SENTRY_ENVIRONMENT=development
```

更新 `.gitignore`：

```gitignore
# Sentry
.env.local
.sentryclirc
sentry.properties
```

建立 `.env.example` 作為範本：

```env
# Sentry Configuration
# 從 https://sentry.io 取得 DSN
VITE_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id

# 環境: development, staging, production
VITE_SENTRY_ENVIRONMENT=development
```

### Step 4: 整合到主進程

編輯 `src/main/main.ts`：

```typescript
import { app, BrowserWindow } from 'electron';
import * as Sentry from '@sentry/electron/main';

// ⚠️ Sentry 必須在最前面初始化
if (process.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.VITE_SENTRY_ENVIRONMENT || 'development',

    // 只在生產環境啟用
    enabled: process.env.NODE_ENV === 'production',

    // 設定採樣率
    tracesSampleRate: 1.0, // 100% (開發階段)

    // 錯誤回報前的過濾器
    beforeSend(event) {
      // 開發環境只記錄到 console
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Sentry - Main]', event);
        return null; // 不發送到 Sentry
      }
      return event;
    },
  });
}

// 其他程式碼...
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // ...
}

// 錯誤處理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  Sentry.captureException(error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  Sentry.captureException(reason);
});

app.whenReady().then(createWindow);
```

### Step 5: 整合到渲染進程（Vue）

編輯 `src/main.ts`：

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import * as Sentry from '@sentry/vue';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();

// Sentry for Vue (渲染進程)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',

    // 只在生產環境啟用
    enabled: import.meta.env.PROD,

    // Vue 整合
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 1.0, // 100% (開發階段)

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10%
    replaysOnErrorSampleRate: 1.0, // 100%

    // 錯誤回報前的過濾器
    beforeSend(event) {
      // 開發環境只記錄到 console
      if (!import.meta.env.PROD) {
        console.error('[Sentry - Renderer]', event);
        return null; // 不發送到 Sentry
      }

      // 過濾敏感資訊
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
      }

      return event;
    },
  });
}

app.use(pinia);
app.mount('#app');
```

### Step 6: 更新 Vite 配置

編輯 `vite.config.ts`：

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],

  // 確保環境變數被正確注入
  define: {
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(process.env.VITE_SENTRY_DSN),
    'import.meta.env.VITE_SENTRY_ENVIRONMENT': JSON.stringify(
      process.env.VITE_SENTRY_ENVIRONMENT || 'development'
    ),
  },

  // ...其他配置
});
```

### Step 7: TypeScript 類型定義

編輯 `src/types/env.d.ts`（如果不存在則建立）：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ENVIRONMENT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## 4. 測試 Sentry 整合

### 4.1 手動測試錯誤捕獲

建立測試元件 `src/components/SentryTest.vue`（僅用於測試）：

```vue
<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Sentry 測試</h2>

    <div class="space-y-2">
      <button @click="testError" class="btn btn-error">
        測試錯誤捕獲
      </button>

      <button @click="testMessage" class="btn btn-info">
        測試訊息發送
      </button>

      <button @click="testBreadcrumb" class="btn btn-warning">
        測試 Breadcrumb
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/vue';

function testError() {
  try {
    throw new Error('這是一個測試錯誤！');
  } catch (error) {
    Sentry.captureException(error);
    console.log('錯誤已發送到 Sentry');
  }
}

function testMessage() {
  Sentry.captureMessage('這是一個測試訊息', 'info');
  console.log('訊息已發送到 Sentry');
}

function testBreadcrumb() {
  Sentry.addBreadcrumb({
    category: 'test',
    message: '使用者點擊了測試按鈕',
    level: 'info',
  });

  // 再拋出錯誤，Breadcrumb 會附加在錯誤報告中
  Sentry.captureMessage('這個訊息包含 Breadcrumb', 'info');
  console.log('Breadcrumb 已記錄');
}
</script>
```

### 4.2 測試步驟

1. **啟動開發模式**：
   ```bash
   pnpm run dev
   ```

2. **檢查 Console**：
   - 開發環境應該看到 `[Sentry - Renderer]` 的 log
   - 錯誤不會實際發送到 Sentry

3. **測試錯誤捕獲**：
   - 點擊「測試錯誤捕獲」按鈕
   - 檢查 Console 是否有錯誤 log

4. **測試生產環境**：
   ```bash
   # 建置生產版本
   pnpm run build

   # 執行生產版本（需要設定 VITE_SENTRY_DSN）
   NODE_ENV=production pnpm run preview
   ```

5. **檢查 Sentry Dashboard**：
   - 前往 https://sentry.io
   - 查看 Issues 頁面
   - 應該能看到剛才發送的錯誤

### 4.3 驗證清單

- [ ] 主進程錯誤能被捕獲
- [ ] 渲染進程錯誤能被捕獲
- [ ] 開發環境不發送到 Sentry（只記錄到 console）
- [ ] 生產環境能正常發送到 Sentry
- [ ] Sentry Dashboard 能看到錯誤報告
- [ ] 錯誤報告包含完整的 Stack Trace
- [ ] 錯誤報告包含環境資訊（OS, Browser, etc.）

---

## 5. 在程式碼中使用 Sentry

### 5.1 基本錯誤捕獲

```typescript
import * as Sentry from '@sentry/vue';

try {
  // 可能出錯的程式碼
  await riskyOperation();
} catch (error) {
  // 記錄到 Sentry
  Sentry.captureException(error);

  // 向使用者顯示友善的錯誤訊息
  notificationService.error('操作失敗，請稍後再試');
}
```

### 5.2 添加上下文資訊

```typescript
Sentry.setContext('article', {
  id: article.id,
  title: article.title,
  category: article.category,
});

Sentry.setUser({
  id: 'user-123', // 不要使用真實的 email
  username: 'anonymous',
});

Sentry.setTag('feature', 'article-publish');
```

### 5.3 記錄使用者行為（Breadcrumbs）

```typescript
Sentry.addBreadcrumb({
  category: 'ui',
  message: '使用者點擊發布按鈕',
  level: 'info',
  data: {
    articleId: article.id,
  },
});
```

### 5.4 記錄自訂訊息

```typescript
// 警告層級
Sentry.captureMessage('嘗試發布空白文章', 'warning');

// 資訊層級
Sentry.captureMessage('成功發布文章', 'info');
```

### 5.5 效能監控

```typescript
const transaction = Sentry.startTransaction({
  name: 'publish-article',
  op: 'function',
});

try {
  await publishArticle(article);
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('unknown_error');
  Sentry.captureException(error);
} finally {
  transaction.finish();
}
```

---

## 6. 最佳實踐

### 6.1 錯誤處理原則

**❌ 不好的做法**：
```typescript
try {
  await operation();
} catch (error) {
  // 直接忽略錯誤
  console.log('Error:', error);
}
```

**✅ 好的做法**：
```typescript
try {
  await operation();
} catch (error) {
  // 1. 記錄到 Sentry
  Sentry.captureException(error);

  // 2. 記錄到本地 log
  console.error('[ArticleService] Failed to publish:', error);

  // 3. 向使用者顯示友善的錯誤訊息
  notificationService.error('發布失敗，請檢查網路連線後重試');

  // 4. 根據情況決定是否重新拋出
  throw error;
}
```

### 6.2 敏感資訊過濾

在 `beforeSend` 中過濾敏感資訊：

```typescript
beforeSend(event) {
  // 移除 Authorization header
  if (event.request?.headers) {
    delete event.request.headers['Authorization'];
    delete event.request.headers['Cookie'];
  }

  // 移除 URL 中的敏感參數
  if (event.request?.url) {
    const url = new URL(event.request.url);
    url.searchParams.delete('token');
    url.searchParams.delete('apiKey');
    event.request.url = url.toString();
  }

  return event;
}
```

### 6.3 採樣率設定

**開發階段**：
- `tracesSampleRate: 1.0` (100%)
- 記錄所有錯誤以便測試

**生產環境（MVP）**：
- `tracesSampleRate: 1.0` (100%)
- 使用者數量少，希望捕獲所有錯誤

**生產環境（穩定後）**：
- `tracesSampleRate: 0.1` (10%)
- 降低成本，同時保持足夠的樣本

### 6.4 錯誤分類

使用 Tags 分類錯誤：

```typescript
// 按功能分類
Sentry.setTag('feature', 'article-publish');
Sentry.setTag('feature', 'image-upload');
Sentry.setTag('feature', 'git-automation');

// 按嚴重程度分類
Sentry.setTag('severity', 'critical'); // 影響核心功能
Sentry.setTag('severity', 'major');    // 影響重要功能
Sentry.setTag('severity', 'minor');    // 不影響使用
```

---

## 7. Sentry Dashboard 使用

### 7.1 Issues 頁面

- **查看所有錯誤**：https://sentry.io/organizations/[org]/issues/
- **錯誤分組**：Sentry 自動將相同的錯誤分組
- **錯誤狀態**：
  - Unresolved: 未解決
  - Resolved: 已解決
  - Ignored: 已忽略

### 7.2 錯誤詳情

每個錯誤報告包含：
- **Stack Trace**: 完整的錯誤堆疊
- **Breadcrumbs**: 錯誤發生前的使用者行為
- **Context**: 環境資訊、使用者資訊
- **Tags**: 自訂標籤
- **Release**: 發生錯誤的版本

### 7.3 設定警報

1. 前往 **Alerts** → **Create Alert**
2. 選擇條件：
   - 新的 Issue 出現
   - Issue 重新出現
   - Issue 頻率超過閾值
3. 選擇通知方式：
   - Email
   - Slack
   - Discord

**建議警報設定（MVP）**：
- ✅ 任何新的 Issue 出現 → Email 通知團隊
- ✅ Critical Tag 的 Issue → 立即通知
- ❌ 暫時不設定頻率警報（使用者數量少）

---

## 8. 維護與優化

### 8.1 定期檢查

**每日檢查**：
- [ ] 查看 Sentry Dashboard 是否有新錯誤
- [ ] 標記已知的錯誤為 Resolved

**每週檢查**：
- [ ] 分析錯誤趨勢
- [ ] 修復高頻錯誤
- [ ] 更新錯誤處理邏輯

### 8.2 版本管理

在發布新版本時，設定 Release：

```typescript
Sentry.init({
  dsn: '...',
  release: 'writeflow@0.1.0',
  environment: 'production',
});
```

### 8.3 清理舊 Issues

- 定期清理已解決的 Issues
- 忽略無法修復或不重要的 Issues
- 使用 Bulk Actions 批次處理

---

## 9. 成本控制

### 9.1 免費版限制

- **Events**: 5,000/月
- **Replays**: 50/月
- **Team Members**: 無限制

### 9.2 估算使用量

**MVP 階段**（預估 10 位使用者）：
- 每位使用者每週 5 個 session
- 每 session 平均 0.5 個錯誤
- 每月錯誤數：10 × 5 × 4 × 0.5 = **100 events/月**

**結論**：免費版本綽綽有餘

### 9.3 超出限制時

如果接近限制：
1. 降低 `tracesSampleRate`
2. 過濾不重要的錯誤
3. 考慮升級到 Team Plan（$26/月）

---

## 10. 故障排除

### 問題 1: Sentry 沒有捕獲錯誤

**檢查**：
- [ ] `VITE_SENTRY_DSN` 是否設定
- [ ] `NODE_ENV` 是否為 `production`
- [ ] `beforeSend` 是否返回 `null`
- [ ] 網路連線是否正常

### 問題 2: 開發環境也發送到 Sentry

**解決**：
- 確認 `enabled` 設定為 `process.env.NODE_ENV === 'production'`
- 或在 `beforeSend` 中過濾開發環境

### 問題 3: 錯誤資訊不完整

**解決**：
- 使用 `Sentry.setContext()` 添加上下文
- 使用 `Sentry.addBreadcrumb()` 記錄使用者行為
- 確保 Source Maps 正確上傳（生產環境）

---

## 11. 下一步

### Week 1 任務清單

- [ ] **Sam**: 註冊 Sentry 帳號並取得 DSN
- [ ] **Taylor**: 安裝 Sentry 套件
- [ ] **Taylor**: 整合到主進程和渲染進程
- [ ] **Taylor**: 建立測試元件
- [ ] **Sam**: 測試錯誤捕獲功能
- [ ] **Sam**: 設定警報通知
- [ ] **Team**: 移除測試元件，準備正式使用

### Week 2-3 任務

- [ ] 在關鍵功能中添加 Sentry 錯誤處理
- [ ] 收集並分析 Alpha 測試期間的錯誤
- [ ] 根據錯誤報告優化程式碼

---

## 附錄

### A. 參考資源

- [Sentry Electron 官方文件](https://docs.sentry.io/platforms/javascript/guides/electron/)
- [Sentry Vue 官方文件](https://docs.sentry.io/platforms/javascript/guides/vue/)
- [Sentry 最佳實踐](https://docs.sentry.io/product/best-practices/)

### B. 常用指令

```bash
# 測試 Sentry CLI（可選）
pnpm add -D @sentry/cli

# 上傳 Source Maps
sentry-cli releases files <release> upload-sourcemaps ./dist
```

---

**文件版本**: 1.0.0
**最後更新**: 2026-02-04
**維護者**: Sam (Ops) + Taylor (CTO)
