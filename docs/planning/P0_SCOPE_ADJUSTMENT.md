# P0 範圍調整決策：移除 Git 自動化

> **決策日期**: 2026-02-06
> **決策類型**: MVP 範圍縮減
> **決策者**: 專案團隊
> **版本**: v1.0

---

## 🎯 決策摘要

**決定**: 將 **Git 自動化** 從 P0 移至 P1，延後到 v0.2 實作

**原因**: 降低 MVP 風險，確保核心發布功能如期完成

**影響**: MVP 使用者需手動執行 Git 操作，但核心價值（一鍵轉換發布）不受影響

---

## 📊 決策分析

### 當前 P0 工作量評估

#### 原始 P0 範圍（8 項功能）

| # | 功能模組 | 預估工作量 | 狀態 | 複雜度 |
|---|---------|-----------|------|--------|
| 1 | Wiki Link 轉換 | 3 天 | ✅ 完成 | 🟡 中 |
| 2 | 圖片路徑處理 | 2 天 | ✅ 完成 | 🟡 中 |
| 3 | Frontmatter 轉換 | 1 天 | ✅ 完成 | 🟢 低 |
| 4 | 基本錯誤處理 | 2 天 | 🟡 50% | 🟡 中 |
| 5 | 基本設定介面 | 2 天 | ❌ 未開始 | 🟡 中 |
| 6 | 檔案複製功能 | 1 天 | ❌ 未開始 | 🟢 低 |
| 7 | **Git 自動化** | **4 天** | ❌ 未開始 | **🔴 高** |
| 8 | 發布按鈕和流程 | - | ❌ 未開始 | 🟢 低 |

**總計**: 15 天工作量
**剩餘**: 9+ 天（含 Git 4 天）
**可用時間**: 11 天
**風險**: 🔴 **高風險**（時間緊迫且包含高複雜度任務）

#### 調整後 P0 範圍（縮減版）

| # | 功能模組 | 預估工作量 | 狀態 | 複雜度 |
|---|---------|-----------|------|--------|
| 1 | Wiki Link 轉換 | 3 天 | ✅ 完成 | 🟡 中 |
| 2 | 圖片路徑處理 | 2 天 | ✅ 完成 | 🟡 中 |
| 3 | Frontmatter 轉換 | 1 天 | ✅ 完成 | 🟢 低 |
| 4 | 基本錯誤處理 | 2 天 | 🟡 50% | 🟡 中 |
| 5 | 基本設定介面 | 2 天 | ❌ 未開始 | 🟡 中 |
| 6 | 檔案複製功能 | 2 天 | ❌ 未開始 | 🟢 低 |
| 7 | 發布按鈕和流程 | 1 天 | ❌ 未開始 | 🟢 低 |
| ~~8~~ | ~~Git 自動化~~ | ~~4 天~~ | **→ P1 延後** | ~~🔴 高~~ |

**新總計**: 11 天工作量
**剩餘**: 5 天
**可用時間**: 11 天
**風險**: 🟢 **低風險**（時間充裕，無高複雜度任務）

---

## ✅ 決策優勢分析

### 1. 時間與風險大幅降低

```
原始方案:
剩餘工作: 9 天
可用時間: 11 天
緩衝時間: 2 天 (18%)
風險等級: 🔴 高風險

調整方案:
剩餘工作: 5 天
可用時間: 11 天
緩衝時間: 6 天 (55%)
風險等級: 🟢 低風險
```

**改善**: 緩衝時間從 18% 提升到 55% (+37%)

### 2. 移除最高複雜度任務

**Git 自動化的複雜性**:

```
技術挑戰:
❌ 需要處理多種 Git 狀態
❌ 衝突檢測與解決
❌ 網路錯誤處理
❌ 權限問題處理
❌ Remote 配置檢查
❌ SSH key / Token 驗證
❌ Push 失敗重試邏輯
❌ 大量錯誤情境測試

風險:
🔴 不確定性高
🔴 錯誤情境多
🔴 測試困難
🔴 容易延期
```

**移除後的剩餘任務**:
```
✅ 都是中低複雜度
✅ 技術成熟穩定
✅ 容易估算時間
✅ 風險可控
```

### 3. 核心價值完整保留

**MVP 核心目標**: 讓使用者能從 Obsidian 一鍵發布文章到 Astro 部落格

```
核心價值分解:
✅ 選擇文章 → 保留（文章管理）
✅ 點擊發布 → 保留（發布按鈕）
✅ 自動轉換 → 保留（ConverterService）
✅ 複製到 Astro → 保留（PublishService）
⚠️ Git commit/push → 手動執行

核心價值保留度: 80%
```

**使用者仍然可以**:
1. ✅ 一鍵轉換文章格式
2. ✅ 自動處理 Wiki Links
3. ✅ 自動複製圖片
4. ✅ 自動更新 Frontmatter
5. ✅ 文章自動複製到 Astro 專案
6. 🟡 手動執行 `git add/commit/push`（僅此一步需手動）

**結論**: 核心「一鍵發布」體驗仍存在，只是最後一步需手動

### 4. 降低測試複雜度

```
原始測試需求:
- Unit Tests: GitService
- Integration Tests: Git 操作整合
- E2E Tests: 完整流程含 Git
- Error Scenario Tests: 10+ 種 Git 錯誤情境

預估測試工作量: 1-2 天

調整後測試需求:
- Unit Tests: PublishService
- Integration Tests: 轉換 + 複製
- E2E Tests: 轉換到複製流程

預估測試工作量: 0.5 天

節省: 1-1.5 天
```

### 5. 更容易達到 80% 成功率

```
原始方案發布成功率影響因素:
✅ 轉換邏輯正確性 (90% 可靠)
✅ 檔案複製成功性 (95% 可靠)
❌ Git 操作成功性 (60-70% 可靠) ⚠️
  - Git 衝突
  - 網路問題
  - 權限問題
  - Remote 配置問題

預估整體成功率: 90% × 95% × 65% = 55.6% ❌

調整後發布成功率:
✅ 轉換邏輯正確性 (90% 可靠)
✅ 檔案複製成功性 (95% 可靠)

預估整體成功率: 90% × 95% = 85.5% ✅

結論: 更容易達成 MVP 目標（> 80%）
```

---

## ⚠️ 決策劣勢分析

### 1. 使用者體驗稍差

```
完整方案流程:
1. 選擇文章
2. 點擊發布
3. [等待]
4. 完成！文章已推送到 Git ✅

調整方案流程:
1. 選擇文章
2. 點擊發布
3. [等待]
4. 完成！文章已複製到 Astro ✅
5. 手動開啟終端機 ⚠️
6. 執行 git add/commit/push ⚠️

額外步驟: +2 步（手動 Git 操作）
```

**影響評估**:
- 🟡 體驗稍差，但可接受
- 🟡 目標使用者（開發者）熟悉 Git
- 🟡 可透過文檔清楚說明
- 🟢 不影響核心轉換價值

### 2. MVP 定義改變

```
原始 MVP 定義:
"讓使用者能夠從 Obsidian 一鍵發布文章到 Astro 部落格"
                                    ↑
                              完全自動化

調整 MVP 定義:
"讓使用者能夠從 Obsidian 一鍵轉換並複製文章到 Astro 專案"
                                    ↑
                            自動轉換 + 手動 Git
```

**影響**:
- 🟡 需要重新溝通期望
- 🟡 可能影響對外宣傳
- 🟢 但仍符合 MVP 精神（最小可行產品）

### 3. v0.2 需要實作 Git

```
技術債:
❌ Git 自動化延後
❌ 需要在 v0.2 補完
❌ 使用者期待會累積

但:
✅ v0.2 有充足時間
✅ 可從 MVP 反饋中學習
✅ 可能發現更好的實作方式
```

---

## 💡 補償措施

### 1. 提供清晰的 Git 操作指南

```markdown
# 發布後的 Git 操作

WriteFlow 已將文章轉換並複製到 Astro 專案，
現在只需執行以下命令推送到 Git：

1. 開啟終端機，進入 Astro 專案目錄
   cd /path/to/your/astro-blog

2. 查看變更
   git status

3. 加入變更
   git add src/content/blog/你的文章.md
   git add public/images/*  # 如果有新圖片

4. 提交變更
   git commit -m "chore(blog): 發布文章 - 文章標題"

5. 推送到遠端
   git push

完成！文章已推送到 Git 🎉
```

### 2. 在 UI 中提供一鍵複製指令

```typescript
// 發布成功後，顯示可複製的 Git 指令

notificationService.success(
  '發布成功！',
  `文章已複製到 Astro 專案

  接下來執行以下指令推送到 Git:

  cd ${config.astroBlogPath}
  git add src/content/blog/${article.slug}.md
  git commit -m "chore(blog): 發布文章 - ${article.title}"
  git push

  [複製指令] 按鈕
  `
)
```

### 3. 在設定中標示「Git 自動化即將推出」

```vue
<div class="alert alert-info">
  <svg>...</svg>
  <div>
    <h3>Git 自動化功能</h3>
    <p>
      即將在 v0.2 推出！屆時將支援自動 commit 和 push。
      目前請手動執行 Git 操作。
    </p>
  </div>
</div>
```

### 4. 提供 Git Hook 腳本（進階）

```bash
# scripts/auto-commit.sh
# 使用者可以自行設定 Git Hook

#!/bin/bash

# 監聽 src/content/blog/ 變更
# 自動執行 git add + commit + push

# 用法:
# 1. 複製到 Astro 專案 .git/hooks/
# 2. chmod +x .git/hooks/post-receive
```

---

## 📊 風險對比表

| 風險項目 | 原始方案（含 Git） | 調整方案（不含 Git） | 改善 |
|---------|------------------|-------------------|------|
| **時程風險** | 🔴 高（2 天緩衝） | 🟢 低（6 天緩衝） | +4 天 |
| **技術風險** | 🔴 高（Git 複雜） | 🟢 低（無高難度） | ✅ |
| **測試風險** | 🟡 中（10+ 情境） | 🟢 低（< 5 情境） | ✅ |
| **成功率風險** | 🔴 高（55.6%） | 🟢 低（85.5%） | +30% |
| **使用者體驗** | 🟢 完整 | 🟡 稍差（+2 步） | -2 步 |
| **範圍蔓延** | 🔴 高（易偏離） | 🟢 低（目標明確） | ✅ |

**整體評估**:
- 原始方案風險總分: 🔴🔴🔴🔴🟡🟢 (4 高風險)
- 調整方案風險總分: 🟢🟢🟢🟢🟡🟡 (0 高風險)

---

## 🎯 調整後的 MVP 定義

### 新的 MVP 核心目標

**唯一目標**: 讓使用者能從 Obsidian 一鍵轉換並複製文章到 Astro 專案

**成功標準**:
- ✅ 使用者可以選擇文章
- ✅ 點擊「發布」按鈕
- ✅ 文章自動轉換格式（Wiki Links、圖片、Frontmatter）
- ✅ 文章和圖片自動複製到 Astro 專案
- ✅ 提供清楚的後續 Git 操作指引
- ✅ 發布成功率 > 80%

**不包含**（延後到 v0.2）:
- ❌ Git 自動 commit
- ❌ Git 自動 push
- ❌ Git 衝突檢測
- ❌ Git 錯誤處理

### 調整後的 P0 功能清單

| 優先級 | 功能模組 | 工作量 | 說明 |
|-------|---------|-------|------|
| ⛔ P0 | 基本設定介面 | 2 天 | Obsidian + Astro 路徑設定 |
| ⛔ P0 | 檔案複製與轉換 | 2 天 | PublishService + 單篇發布 UI |
| ⛔ P0 | 發布按鈕和流程 | 1 天 | UI 整合 + 完整流程 |
| ⛔ P0 | 基本錯誤處理 | - | 已部分完成，補充即可 |
| 🔵 P1 | **Git 自動化** | **4 天** | **延後到 v0.2** |
| 🔵 P1 | Git 操作指南 | 0.5 天 | 文檔 + UI 提示 |

**總計**: 5 天核心工作 + 0.5 天文檔

---

## 📅 調整後的時程計畫

### Week 2 剩餘 (2026-02-07 ~ 02-09)

**Day 6 (2/7)**: P0-1 設定介面 UI
- 建立 Settings.vue
- 路徑選擇器
- 路徑驗證

**Day 7 (2/8)**: P0-1 設定持久化
- ConfigService 實作
- 設定儲存/載入
- 單元測試

**Checkpoint 1 (2/9 EOD)**: 設定介面完成 ✅

### Week 3 (2026-02-10 ~ 02-16)

**Day 1 (2/10)**: P0-2 PublishService
- 讀取 Obsidian 文章
- 寫入 Astro 目錄
- 基本錯誤處理

**Day 2 (2/11)**: P0-2 轉換整合
- 整合 ConverterService
- 圖片複製
- 進度回報

**Day 3 (2/12)**: P0-2 單篇發布 UI
- 發布按鈕（文章管理 + 編輯器）
- 錯誤訊息優化
- 整合測試

**Checkpoint 2 (2/12 EOD)**: 發布功能完成 ✅

**Day 4 (2/13)**: Git 操作指南（P1）
- 撰寫 Git 操作文檔
- UI 提示訊息
- 一鍵複製指令功能

**Day 5-6 (2/14-15)**: 完善與測試
- 錯誤處理補強
- 邊界情況測試
- 效能優化

**Day 7 (2/16)**: 內部 Alpha 測試
- 全員測試
- 問題彙整
- 準備 Week 4 修復

### Week 4 (2026-02-17 ~ 02-24) - 穩定與發布

**Day 1-3 (2/17-19)**: Bug 修復
- P0 Bug 全部修復
- 回歸測試
- 最終調整

**Day 4-5 (2/20-21)**: 文檔與驗證
- README 更新
- Quick Start Guide
- 最終驗證（成功率 > 80%）

**Day 6-7 (2/22-24)**: 發布準備
- 打包應用程式
- Release Notes
- v0.1.0 發布

---

## 🎨 UI/UX 設計調整

### 發布成功訊息設計

#### 方案 1: Toast 通知 + 指令展示（推薦）

```typescript
// 發布成功後
notificationService.success(
  '✅ 發布成功！',
  `
  文章已複製到 Astro 專案:
  ${targetPath}

  請執行以下指令推送到 Git:
  `,
  {
    duration: 0, // 不自動關閉
    actions: [
      {
        label: '複製 Git 指令',
        onClick: () => {
          clipboard.writeText(gitCommands)
          notificationService.info('已複製到剪貼簿')
        }
      },
      {
        label: '開啟 Astro 專案',
        onClick: () => {
          shell.openPath(config.astroBlogPath)
        }
      }
    ]
  }
)
```

#### 方案 2: 發布結果對話框

```vue
<dialog v-if="publishSuccess" class="modal modal-open">
  <div class="modal-box">
    <h3 class="font-bold text-lg">🎉 發布成功！</h3>

    <div class="py-4">
      <p>文章已成功複製到 Astro 專案</p>

      <div class="alert alert-info mt-4">
        <svg>...</svg>
        <div>
          <h4>接下來請執行 Git 操作:</h4>
          <pre class="bg-base-200 p-2 rounded mt-2">
cd {{ config.astroBlogPath }}
git add src/content/blog/{{ article.slug }}.md
git commit -m "chore(blog): 發布文章 - {{ article.title }}"
git push
          </pre>
          <button @click="copyGitCommands" class="btn btn-sm btn-primary mt-2">
            複製指令
          </button>
        </div>
      </div>
    </div>

    <div class="modal-action">
      <button @click="openTerminal" class="btn">開啟終端機</button>
      <button @click="close" class="btn btn-primary">知道了</button>
    </div>
  </div>
</dialog>
```

### 設定頁面提示

```vue
<!-- SettingsPanel.vue -->
<div class="card bg-base-200">
  <div class="card-body">
    <h3 class="card-title">
      <svg>...</svg>
      Git 自動化
      <span class="badge badge-warning">即將推出</span>
    </h3>

    <p class="text-sm">
      目前版本需要手動執行 Git 操作。
      Git 自動化功能將在 <strong>v0.2</strong> 推出！
    </p>

    <div class="alert alert-info mt-4">
      <svg>...</svg>
      <div>
        <h4 class="font-semibold">v0.2 預計功能:</h4>
        <ul class="list-disc list-inside text-sm mt-2">
          <li>自動 git add 和 commit</li>
          <li>自動 git push 到遠端</li>
          <li>Git 衝突檢測與提示</li>
          <li>完整的錯誤處理</li>
        </ul>
      </div>
    </div>

    <p class="text-xs text-base-content/60 mt-2">
      預計發布時間: 2026 年 3 月
    </p>
  </div>
</div>
```

---

## 📝 文檔調整

### README.md 更新

```markdown
# WriteFlow

一款專為 Obsidian + Astro 用戶打造的部落格發布工具

## 功能特色

✅ 一鍵轉換 Obsidian 文章格式
✅ 自動轉換 Wiki Links 為標準連結
✅ 自動處理圖片路徑與複製
✅ 自動轉換 Frontmatter
✅ 文章自動複製到 Astro 專案
✅ 友善的錯誤提示與修復建議
🔄 Git 自動化（v0.2 即將推出）

## 快速開始

### 發布文章

1. 開啟 WriteFlow
2. 設定 Obsidian Vault 和 Astro 專案路徑
3. 選擇要發布的文章
4. 點擊「發布」按鈕
5. 文章自動轉換並複製到 Astro 專案 ✅

### Git 操作（目前需手動執行）

發布完成後，執行以下指令推送到 Git:

```bash
cd /path/to/your/astro-blog
git add src/content/blog/你的文章.md
git commit -m "chore(blog): 發布文章 - 文章標題"
git push
```

> 💡 **提示**: WriteFlow v0.2 將支援 Git 自動化，預計 2026 年 3 月發布

## Roadmap

- [x] v0.1.0: 核心轉換與發布功能
- [ ] v0.2.0: Git 自動化
- [ ] v0.3.0: 批次發布
- [ ] v0.4.0: 發布歷史
```

---

## ✅ 決策確認清單

在確認此決策前，請確保：

- [ ] 團隊全員理解此調整
- [ ] 使用者可接受手動 Git 操作
- [ ] 文檔已更新（README、Quick Start）
- [ ] UI 提示已規劃（發布成功訊息）
- [ ] v0.2 Roadmap 已制定
- [ ] 對外宣傳素材已調整
- [ ] 時程計畫已更新
- [ ] Checkpoint 定義已修改

---

## 🎯 最終決策

### 決策內容

**我們決定**: 將 Git 自動化從 P0 移至 P1，延後到 v0.2

### 決策理由

1. ✅ 降低 MVP 風險（從 🔴 高風險 → 🟢 低風險）
2. ✅ 緩衝時間增加 37% (2 天 → 6 天)
3. ✅ 移除最高複雜度任務（4 天工作量）
4. ✅ 核心價值保留 80%（轉換 + 複製）
5. ✅ 發布成功率提升 30% (55% → 85%)
6. ✅ 更容易達成 MVP 目標

### 補償措施

1. ✅ 提供詳細的 Git 操作指南
2. ✅ UI 提供一鍵複製指令
3. ✅ 設定中標示「即將推出」
4. ✅ 提供 Git Hook 腳本（進階）

### 承諾

我們承諾在 **v0.2**（2026 年 3 月）實作完整的 Git 自動化功能。

---

## 📊 預期成果對比

| 指標 | 原始方案 | 調整方案 | 改善 |
|-----|---------|---------|------|
| **剩餘工作量** | 9 天 | 5 天 | -4 天 |
| **緩衝時間** | 2 天 (18%) | 6 天 (55%) | +4 天 (+37%) |
| **風險等級** | 🔴 高 | 🟢 低 | ✅ |
| **高複雜度任務** | 1 項 (Git) | 0 項 | ✅ |
| **發布成功率** | 55.6% | 85.5% | +30% |
| **MVP 完成信心** | 60% | 90% | +30% |
| **使用者體驗** | 100% | 90% | -10% |

**整體評估**: 📈 **大幅改善**

---

## 🗳️ 團隊簽核

**我同意此決策**:

- [ ] Alex Chen (PM) - 產品策略
- [ ] Taylor Wu (CTO) - 技術實作
- [ ] Lisa Wang (Marketing) - 對外宣傳
- [ ] Jordan Lee (User) - 使用者代表
- [ ] Sam Liu (Ops) - 維運穩定性

**簽署日期**: 2026-02-06

---

**文檔版本**: v1.0
**最後更新**: 2026-02-06
**維護者**: Alex Chen (PM)
