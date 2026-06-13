---
title: "WriteFlow MVP 緊急衝刺行動項目清單"
domain: delivery
type: rpd
status: approved
owner: roundtable-discussions
updated: 2026-02-06
source_of_truth: false
---

# WriteFlow MVP 緊急衝刺行動項目清單

> **建立日期**: 2026-02-06 (Week 2 Day 5)
> **決議方案**: 方案 A - 緊急衝刺模式
> **目標日期**: 2026-02-24 (3 週後)
> **負責人**: Taylor (CTO) + 全體團隊

---

## 🎯 總體目標

**在 18 天內完成 MVP 發布功能,達成以下標準**:

- ✅ 使用者可以一鍵發布文章到 Astro 部落格
- ✅ 發布成功率 > 80%
- ✅ P0 Bug = 0
- ✅ 基本文件完整

---

## 📋 Week 2 剩餘 (2026-02-07 ~ 2026-02-09)

### 🔥 P0-1: 實作基本設定介面

**負責人**: Taylor (CTO)
**截止日期**: 2026-02-09 (Week 2 結束)
**優先級**: ⛔ P0
**工作量**: 2 天

#### 子任務

- [ ] **Day 6 (2026-02-07) - 設定 UI**
  - [ ] 建立設定頁面組件 `Settings.vue`
  - [ ] 實作 Obsidian Vault 路徑選擇器
    - 使用 Electron dialog API
    - 路徑驗證 (檢查是否為有效目錄)
    - 顯示當前選擇的路徑
  - [ ] 實作 Astro 專案路徑選擇器
    - 同樣使用 dialog API
    - 驗證是否為 Astro 專案 (檢查 `astro.config.mjs`)
    - 顯示專案資訊
  - [ ] 路徑驗證邏輯
    - Obsidian: 檢查 `.obsidian` 資料夾
    - Astro: 檢查 `astro.config.mjs` 和 `src/content/blog/`
  - [ ] UI 設計
    - 清楚的表單欄位
    - 即時驗證提示
    - 儲存按鈕

- [ ] **Day 7 (2026-02-08) - 設定持久化**
  - [ ] 實作設定儲存邏輯
    - 使用 Electron store 或本地 JSON
    - 儲存到 `~/.writeflow/config.json`
  - [ ] 實作設定載入邏輯
    - 應用程式啟動時自動載入
    - 錯誤處理 (設定檔損壞時)
  - [ ] 設定驗證
    - 每次使用前驗證路徑仍有效
    - 路徑不存在時提示重新設定
  - [ ] 撰寫單元測試
    - 測試設定儲存
    - 測試設定載入
    - 測試路徑驗證

#### 驗收標準

- [ ] 使用者可以透過 UI 選擇 Obsidian Vault 路徑
- [ ] 使用者可以透過 UI 選擇 Astro 專案路徑
- [ ] 路徑驗證正確 (有效路徑顯示綠色勾選,無效路徑顯示錯誤)
- [ ] 設定可以儲存並持久化
- [ ] 應用程式重啟後自動載入上次的設定
- [ ] 單元測試通過率 100%

#### 測試場景

```typescript
測試 1: 首次使用
  1. 啟動應用程式
  2. 應顯示設定引導
  3. 選擇 Obsidian Vault 路徑
  4. 選擇 Astro 專案路徑
  5. 點擊儲存
  6. 設定成功儲存

測試 2: 路徑驗證
  1. 輸入無效的 Obsidian 路徑
  2. 應顯示錯誤: "此目錄不是有效的 Obsidian Vault"
  3. 輸入無效的 Astro 路徑
  4. 應顯示錯誤: "此目錄不是有效的 Astro 專案"

測試 3: 設定持久化
  1. 設定路徑並儲存
  2. 關閉應用程式
  3. 重新開啟應用程式
  4. 設定應自動載入,不需要重新設定
```

#### 技術實作參考

```typescript
// src/services/ConfigService.ts

export interface AppConfig {
  obsidianVaultPath: string
  astroBlogPath: string
}

export class ConfigService {
  private configPath = path.join(app.getPath('userData'), 'config.json')

  // 載入設定
  async loadConfig(): Promise<AppConfig | null> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  // 儲存設定
  async saveConfig(config: AppConfig): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
  }

  // 驗證 Obsidian Vault
  async validateObsidianVault(vaultPath: string): Promise<boolean> {
    const obsidianDir = path.join(vaultPath, '.obsidian')
    return await fs.pathExists(obsidianDir)
  }

  // 驗證 Astro 專案
  async validateAstroProject(projectPath: string): Promise<boolean> {
    const astroConfig = path.join(projectPath, 'astro.config.mjs')
    const blogDir = path.join(projectPath, 'src/content/blog')
    return (await fs.pathExists(astroConfig)) && (await fs.pathExists(blogDir))
  }
}
```

#### Checkpoint 1 檢查 (2026-02-09 EOD)

**檢查項目**:
- [ ] 設定介面完成
- [ ] 設定持久化完成
- [ ] 單元測試通過
- [ ] Taylor 完成自我檢查清單
- [ ] Alex 驗證功能可用

**如果未通過**: 立即評估是否切換到方案 B (延後發布)

---

## 📋 Week 3 Day 1-3 (2026-02-10 ~ 2026-02-12)

### 🔥 P0-2: 實作檔案複製與轉換功能

**負責人**: Taylor (CTO)
**截止日期**: 2026-02-12 (Week 3 Day 3)
**優先級**: ⛔ P0
**工作量**: 3 天

#### 子任務

- [ ] **Day 1 (2026-02-10) - 檔案複製邏輯**
  - [ ] 建立 `PublishService.ts`
  - [ ] 實作讀取 Obsidian 文章
    - 根據 Article ID 找到檔案路徑
    - 讀取文章內容
    - 解析 Frontmatter
  - [ ] 實作寫入 Astro 目錄
    - 根據 slug 生成目標檔案名
    - 寫入到 `{astroBlogPath}/src/content/blog/{slug}.md`
    - 確保目錄存在
  - [ ] 基本錯誤處理
    - 檔案不存在
    - 無寫入權限
    - 磁碟空間不足

- [ ] **Day 2 (2026-02-11) - 轉換整合**
  - [ ] 整合 ConverterService
    - Wiki Link 轉換 (已有)
    - 圖片路徑處理 (已有)
    - Frontmatter 轉換 (已有)
  - [ ] 圖片檔案複製
    - 找出文章中所有圖片引用
    - 複製圖片到 Astro public/images/
    - 更新圖片路徑為絕對路徑
  - [ ] 完整發布流程
    - 讀取 → 轉換 → 複製圖片 → 寫入
  - [ ] 進度回報
    - 顯示當前處理步驟
    - 顯示處理進度

- [ ] **Day 3 (2026-02-12) - 錯誤處理與測試**
  - [ ] 完善錯誤處理
    - 轉換錯誤
    - 圖片複製錯誤
    - 檔案寫入錯誤
  - [ ] 友善的錯誤訊息
    - 使用已有的 errorFormatter
    - Toast 通知錯誤
    - 提供修復建議
  - [ ] 撰寫整合測試
    - 測試完整發布流程
    - 測試各種錯誤情況
    - 測試圖片複製
  - [ ] 手動測試
    - 測試各種文章類型
    - 測試各種錯誤場景

#### 驗收標準

- [ ] 可以讀取 Obsidian 文章並轉換
- [ ] Wiki Links 正確轉換為標準連結
- [ ] 圖片正確複製到 Astro 專案
- [ ] 圖片路徑正確更新
- [ ] Frontmatter 正確轉換
- [ ] 文章檔案寫入到正確位置
- [ ] 所有錯誤都有友善提示
- [ ] 整合測試通過率 100%

#### 測試場景

```typescript
測試 1: 基本發布流程
  輸入: 一篇簡單的文章 (純文字 + Frontmatter)
  操作: 點擊發布
  預期:
    - 文章複製到 Astro blog/
    - Frontmatter 正確轉換
    - 檔名正確 (根據 slug)

測試 2: 帶 Wiki Links 的文章
  輸入: 文章包含 [[連結]] 和 [[連結|顯示文字]]
  操作: 點擊發布
  預期:
    - Wiki Links 轉換為 [連結](/blog/link)
    - 顯示文字正確保留

測試 3: 帶圖片的文章
  輸入: 文章包含 ![alt](images/pic.png)
  操作: 點擊發布
  預期:
    - 圖片複製到 Astro public/images/
    - 路徑更新為 ![alt](/images/pic.png)

測試 4: 錯誤處理 - 目標路徑無效
  輸入: Astro 專案路徑不存在
  操作: 點擊發布
  預期:
    - 顯示錯誤: "目標路徑不存在"
    - 提供建議: "請檢查 Astro 專案路徑設定"

測試 5: 錯誤處理 - 圖片不存在
  輸入: 文章引用不存在的圖片
  操作: 點擊發布
  預期:
    - 顯示警告: "找不到圖片: xxx.png"
    - 文章仍可發布,但圖片連結失效
```

#### 技術實作參考

```typescript
// src/services/PublishService.ts

export class PublishService {
  constructor(
    private converter: ConverterService,
    private config: ConfigService
  ) {}

  async publishArticle(article: Article): Promise<PublishResult> {
    try {
      // 1. 驗證設定
      const config = await this.config.loadConfig()
      if (!config) throw new Error('請先設定路徑')

      // 2. 讀取文章
      const content = await this.readArticle(article)

      // 3. 轉換
      const converted = await this.converter.convert(content, article)

      // 4. 複製圖片
      const images = this.extractImages(content)
      await this.copyImages(images, config)

      // 5. 寫入 Astro
      const targetPath = path.join(
        config.astroBlogPath,
        'src/content/blog',
        `${article.slug}.md`
      )
      await fs.writeFile(targetPath, converted)

      return { success: true, path: targetPath }
    } catch (error) {
      return { success: false, error: formatErrorMessage(error) }
    }
  }

  private async copyImages(images: string[], config: AppConfig): Promise<void> {
    for (const image of images) {
      const sourcePath = path.join(config.obsidianVaultPath, image)
      const targetPath = path.join(config.astroBlogPath, 'public/images', path.basename(image))

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath)
      } else {
        console.warn(`Image not found: ${image}`)
      }
    }
  }
}
```

#### Checkpoint 2 檢查 (2026-02-12 EOD)

**檢查項目**:
- [ ] 檔案複製功能完成
- [ ] 轉換整合完成
- [ ] 圖片複製功能完成
- [ ] 錯誤處理完善
- [ ] 整合測試通過
- [ ] 手動測試通過 (至少 10 篇文章)
- [ ] Taylor 完成自我檢查清單
- [ ] Alex + Jordan 驗證功能可用

**如果未通過**:
1. 評估落後原因
2. 決定是否切換到方案 C (縮減範圍,移除 Git 自動化)
3. 或切換到方案 B (延後發布 2 週)

---

## 📋 Week 3 Day 4-6 (2026-02-13 ~ 2026-02-15)

### 🔥 P0-3: 實作 Git 自動化

**負責人**: Taylor (CTO)
**截止日期**: 2026-02-15 (Week 3 Day 6)
**優先級**: ⛔ P0
**工作量**: 3 天

#### 子任務

- [ ] **Day 4 (2026-02-13) - Git 基礎操作**
  - [ ] 建立 `GitService.ts`
  - [ ] 實作 `git status` 檢查
    - 檢查是否在 Git repo 中
    - 檢查是否有未提交的變更
  - [ ] 實作 `git add`
    - 只 add 發布的文章檔案
    - 不要 add 所有檔案
  - [ ] 實作 `git commit`
    - Commit message 格式: `chore(blog): 發布文章 - {title}`
    - 包含 Co-Authored-By
  - [ ] 基本錯誤處理
    - 不在 Git repo 中
    - Git 命令執行失敗

- [ ] **Day 5 (2026-02-14) - Git Push 與衝突處理**
  - [ ] 實作 `git push`
    - 推送到 remote
    - 處理無 remote 的情況
  - [ ] 衝突檢測
    - Push 前檢查是否有衝突
    - 如果有衝突,停止並提示使用者
  - [ ] 網路錯誤處理
    - Push 失敗時的錯誤訊息
    - 提供重試選項
  - [ ] 權限錯誤處理
    - 無 Git 權限時的提示
    - 引導使用者設定 SSH key 或 token

- [ ] **Day 6 (2026-02-15) - 整合與測試**
  - [ ] 整合到 PublishService
    - 發布成功後自動 Git 操作
    - 可選開關 (設定中)
  - [ ] 完善錯誤處理
    - Git 操作失敗不影響發布
    - 清楚說明 Git 狀態
  - [ ] 撰寫整合測試
    - 測試 Git 自動化流程
    - 測試各種錯誤情況
    - 測試衝突情境
  - [ ] 手動測試
    - 測試完整發布 + Git 流程
    - 測試各種 Git 狀態

#### 驗收標準

- [ ] 發布文章後自動執行 `git add`
- [ ] 自動生成 commit message
- [ ] 自動執行 `git commit`
- [ ] 自動執行 `git push` (如果有 remote)
- [ ] Git 衝突時停止並提示使用者
- [ ] Git 操作失敗時有清楚的錯誤訊息
- [ ] 使用者可以在設定中關閉 Git 自動化
- [ ] 整合測試通過率 100%

#### 測試場景

```typescript
測試 1: 正常 Git 流程
  前提: Astro 專案是 Git repo,無衝突
  操作: 發布文章
  預期:
    - 文章複製成功
    - 自動 git add
    - 自動 git commit (message 正確)
    - 自動 git push
    - 顯示成功訊息

測試 2: 不在 Git repo
  前提: Astro 專案不是 Git repo
  操作: 發布文章
  預期:
    - 文章複製成功
    - 顯示警告: "Astro 專案不是 Git repo,跳過 Git 操作"
    - 不執行 Git 命令

測試 3: Git 衝突
  前提: Remote 有新的 commits
  操作: 發布文章
  預期:
    - 文章複製成功
    - git add + commit 成功
    - git push 失敗
    - 顯示錯誤: "Git push 失敗,請先 pull 遠端變更"
    - 提供建議操作

測試 4: 無 Remote
  前提: Git repo 沒有設定 remote
  操作: 發布文章
  預期:
    - 文章複製成功
    - git add + commit 成功
    - 跳過 git push
    - 顯示提示: "本地 commit 成功,但未推送到遠端 (無 remote)"

測試 5: 網路錯誤
  前提: 網路連線失敗
  操作: 發布文章
  預期:
    - 文章複製成功
    - git add + commit 成功
    - git push 失敗
    - 顯示錯誤: "網路連線失敗,無法推送到遠端"
    - 提供重試按鈕
```

#### 技術實作參考

```typescript
// src/services/GitService.ts

import { execPromise } from '@/utils/execPromise'

export class GitService {
  constructor(private projectPath: string) {}

  async checkGitRepo(): Promise<boolean> {
    try {
      await execPromise('git rev-parse --git-dir', { cwd: this.projectPath })
      return true
    } catch {
      return false
    }
  }

  async addFile(filePath: string): Promise<void> {
    await execPromise(`git add ${filePath}`, { cwd: this.projectPath })
  }

  async commit(message: string): Promise<void> {
    const fullMessage = `${message}\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
    await execPromise(`git commit -m "${fullMessage}"`, { cwd: this.projectPath })
  }

  async push(): Promise<void> {
    // 檢查是否有 remote
    const remotes = await execPromise('git remote', { cwd: this.projectPath })
    if (!remotes.stdout.trim()) {
      throw new Error('NO_REMOTE')
    }

    // 嘗試 push
    await execPromise('git push', { cwd: this.projectPath })
  }

  async autoCommitAndPush(filePath: string, title: string): Promise<GitResult> {
    try {
      // 檢查是否為 Git repo
      if (!await this.checkGitRepo()) {
        return { success: false, reason: 'NOT_GIT_REPO' }
      }

      // Add + Commit
      await this.addFile(filePath)
      await this.commit(`chore(blog): 發布文章 - ${title}`)

      // Push (可能失敗)
      try {
        await this.push()
        return { success: true }
      } catch (error) {
        if (error.message === 'NO_REMOTE') {
          return { success: true, warning: 'NO_REMOTE' }
        }
        return { success: false, reason: 'PUSH_FAILED', error }
      }
    } catch (error) {
      return { success: false, reason: 'GIT_ERROR', error }
    }
  }
}
```

#### Checkpoint 3 檢查 (2026-02-15 EOD)

**檢查項目**:
- [ ] Git add + commit 功能完成
- [ ] Git push 功能完成
- [ ] 衝突檢測完成
- [ ] 錯誤處理完善
- [ ] 整合測試通過
- [ ] 手動測試通過 (至少 10 次發布 + Git)
- [ ] Taylor 完成自我檢查清單
- [ ] Alex + Sam 驗證功能可用

**如果未通過**:
1. 評估問題嚴重性
2. 如果只是小 Bug,繼續修復
3. 如果功能根本不可用,切換到方案 C (移除 Git 自動化)

---

## 📋 Week 3 Day 7 (2026-02-16)

### 🔥 P0-4: 端到端整合與內部測試

**負責人**: 全體團隊
**截止日期**: 2026-02-16 (Week 3 結束)
**優先級**: ⛔ P0
**工作量**: 1 天

#### 子任務

- [ ] **上午: Taylor 整合所有功能**
  - [ ] 在 UI 中添加「發布」按鈕
    - 文章管理頁面
    - 編輯器頁面
  - [ ] 實作發布流程
    - 點擊發布 → 執行完整流程
    - 顯示進度 (設定驗證 → 轉換 → 複製 → Git)
    - 顯示結果 (成功/失敗)
  - [ ] 完善 UI 反饋
    - Loading 狀態
    - 進度條 (使用已有的 ETA 顯示)
    - 成功慶祝動畫 (已有)
    - 錯誤訊息 (已有)
  - [ ] 最終自我測試
    - 完整流程測試 5 次
    - 確認所有功能可用

- [ ] **下午: 全員 Alpha 測試**
  - [ ] **Alex (PM)** - 產品測試
    - 測試完整使用者流程
    - 測試各種文章類型
    - 記錄所有問題 (P0/P1/P2)

  - [ ] **Jordan (User)** - 使用者測試
    - 從頭開始使用 (首次體驗)
    - 測試直覺性和易用性
    - 記錄困惑點和建議

  - [ ] **Sam (Ops)** - 技術測試
    - 測試錯誤情況
    - 測試邊界條件
    - 檢查日誌和錯誤追蹤

  - [ ] **Lisa (Marketing)** - 內容測試
    - 測試各種內容格式
    - 測試圖片處理
    - 驗證 Frontmatter 轉換

- [ ] **晚上: 問題彙整與分類**
  - [ ] Taylor 彙整所有測試問題
  - [ ] 分類為 P0/P1/P2
  - [ ] 評估修復工作量
  - [ ] 規劃 Week 4 修復計畫

#### 驗收標準

- [ ] 完整的發布流程可用 (設定 → 轉換 → 複製 → Git)
- [ ] UI 反饋清楚明確
- [ ] Alpha 測試發布成功率 > 70%
- [ ] P0 Bug 清單完整記錄
- [ ] P1/P2 問題清單完整記錄

#### 測試清單

**Alex 的測試清單**:
```
1. 首次使用流程
   - [ ] 開啟應用程式
   - [ ] 設定 Obsidian Vault 路徑
   - [ ] 設定 Astro 專案路徑
   - [ ] 選擇一篇文章
   - [ ] 點擊發布
   - [ ] 驗證文章發布成功

2. 各種文章類型
   - [ ] 純文字文章
   - [ ] 帶 Wiki Links 的文章
   - [ ] 帶圖片的文章
   - [ ] 帶程式碼區塊的文章
   - [ ] 帶表格的文章
   - [ ] 複雜格式混合的文章

3. 錯誤情況
   - [ ] 設定無效路徑
   - [ ] 發布時 Astro 專案不存在
   - [ ] 發布時圖片不存在
   - [ ] Git 衝突情況
   - [ ] 網路連線失敗
```

**Jordan 的測試清單**:
```
1. 首次體驗
   - [ ] 不看任何文件,嘗試使用
   - [ ] 記錄每個困惑點
   - [ ] 評估直覺性 (1-5 分)

2. 日常使用流程
   - [ ] 寫一篇新文章
   - [ ] 發布文章
   - [ ] 修改文章
   - [ ] 重新發布
   - [ ] 驗證 Astro blog 上的顯示

3. 使用者體驗評分
   - [ ] 易用性: __/5
   - [ ] 速度: __/5
   - [ ] 反饋清晰度: __/5
   - [ ] 整體滿意度: __/5
```

**Sam 的測試清單**:
```
1. 邊界情況
   - [ ] 空文章
   - [ ] 超大文章 (> 10MB)
   - [ ] 特殊字元文章
   - [ ] 圖片路徑有空格
   - [ ] 文章檔名有特殊字元

2. 錯誤情況
   - [ ] 磁碟空間不足
   - [ ] 無寫入權限
   - [ ] 網路中斷
   - [ ] Git 衝突
   - [ ] Astro 專案損壞

3. 技術檢查
   - [ ] 檢查錯誤日誌
   - [ ] 驗證 Git commit history
   - [ ] 檢查檔案權限
   - [ ] 驗證圖片複製正確
```

**Lisa 的測試清單**:
```
1. 內容格式
   - [ ] 標題層級 (H1-H6)
   - [ ] 列表 (有序/無序)
   - [ ] 引用區塊
   - [ ] 程式碼區塊 (語法高亮)
   - [ ] 連結
   - [ ] 圖片

2. Frontmatter 測試
   - [ ] 標題轉換
   - [ ] 日期格式
   - [ ] 標籤陣列
   - [ ] Category 對應
   - [ ] Slug 生成

3. 圖片處理
   - [ ] 相對路徑圖片
   - [ ] 絕對路徑圖片
   - [ ] Obsidian ![[]] 語法
   - [ ] 圖片檔名有中文
   - [ ] 圖片在子目錄
```

---

## 📋 Week 4 (2026-02-17 ~ 2026-02-24) - 緩衝週

### 🔧 P0-5: Bug 修復與優化

**負責人**: Taylor (CTO)
**截止日期**: 2026-02-19 (Week 4 Day 2)
**優先級**: ⛔ P0
**工作量**: 2-3 天

#### 子任務

- [ ] **Day 1-2: 修復 P0 Bug**
  - [ ] 從 Alpha 測試發現的 P0 Bug 清單
  - [ ] 逐一修復
  - [ ] 寫回歸測試
  - [ ] 重新測試

- [ ] **Day 3: 修復 P1 Bug (選擇性)**
  - [ ] 評估 P1 Bug 嚴重性
  - [ ] 修復關鍵的 P1 Bug
  - [ ] 不重要的 P1 Bug 延後到下一版

#### 驗收標準

- [ ] 所有 P0 Bug 修復完成
- [ ] 回歸測試通過
- [ ] 重新測試發布成功率 > 80%

---

### 📝 P0-6: 文件完善

**負責人**: Lisa (Marketing) + Alex (PM)
**截止日期**: 2026-02-20 (Week 4 Day 3)
**優先級**: ⛔ P0
**工作量**: 2-3 天

#### 子任務

- [ ] **Day 1: README 更新**
  - [ ] 更新專案描述
  - [ ] 更新功能清單 (發布功能)
  - [ ] 更新安裝說明
  - [ ] 添加使用範例
  - [ ] 添加截圖/GIF

- [ ] **Day 2: Quick Start Guide**
  - [ ] 撰寫首次設定指南
  - [ ] 撰寫發布流程指南
  - [ ] 撰寫常見問題 FAQ
  - [ ] 撰寫疑難排解指南

- [ ] **Day 3: 已知問題清單**
  - [ ] 列出所有已知的 P1/P2 問題
  - [ ] 提供 workaround (如果有)
  - [ ] 說明預計修復時間

#### 驗收標準

- [ ] README 完整且清晰
- [ ] Quick Start Guide 可以讓新使用者 10 分鐘內上手
- [ ] FAQ 涵蓋 Alpha 測試中的常見問題
- [ ] 已知問題清單透明公開

#### 文件結構

```markdown
# WriteFlow

一款專為 Obsidian + Astro 用戶打造的部落格發布工具

## 功能特色

✅ 一鍵發布 Obsidian 文章到 Astro 部落格
✅ 自動轉換 Wiki Links 為標準連結
✅ 自動處理圖片路徑與複製
✅ 自動轉換 Frontmatter
✅ Git 自動化 (commit + push)
✅ 友善的錯誤提示與修復建議

## 快速開始

### 1. 下載與安裝

[下載連結]

### 2. 首次設定

1. 開啟 WriteFlow
2. 設定 Obsidian Vault 路徑
3. 設定 Astro 專案路徑
4. 完成！

### 3. 發布文章

1. 在 WriteFlow 中選擇文章
2. 點擊「發布」按鈕
3. 等待轉換完成
4. 文章自動推送到 Git

## 常見問題

### Q: 發布失敗怎麼辦?
A: 請檢查...

### Q: Git push 失敗?
A: 請先確認...

### Q: 圖片沒有正確顯示?
A: 請檢查...

## 已知問題

- [ ] P1: 某某功能的問題 (預計 v0.2 修復)
- [ ] P2: 某某體驗改善 (預計 v0.3 實作)

## 授權

MIT License
```

---

### 🧪 P0-7: 最終驗證

**負責人**: Sam (Ops) + Jordan (User)
**截止日期**: 2026-02-22 (Week 4 Day 5)
**優先級**: ⛔ P0
**工作量**: 2-3 天

#### 子任務

- [ ] **Day 4-5: 最終測試**
  - [ ] Sam 執行完整測試套件
    - 單元測試
    - 整合測試
    - 端到端測試
  - [ ] Jordan 執行使用者驗收測試
    - 完整使用者流程
    - 各種使用場景
    - 文件驗證 (跟著文件走)
  - [ ] 驗證發布成功率
    - 測試 50 篇文章發布
    - 統計成功率
    - 目標 > 80%

- [ ] **Day 6: 發布檢查清單**
  - [ ] 所有 P0 功能完成 ✅
  - [ ] 所有 P0 Bug 修復 ✅
  - [ ] 發布成功率 > 80% ✅
  - [ ] 文件完整 ✅
  - [ ] 測試通過 ✅
  - [ ] 準備發布包

#### 驗收標準

- [ ] 所有測試通過
- [ ] 發布成功率 > 80%
- [ ] 使用者驗收通過
- [ ] 文件驗證通過 (跟著文件可以完成所有操作)
- [ ] 發布檢查清單全部打勾

---

### 🚀 P0-8: MVP 發布 (可選)

**負責人**: Sam (Ops) + Lisa (Marketing)
**截止日期**: 2026-02-24 (Week 4 結束)
**優先級**: 🟡 P1 (可選)
**工作量**: 1 天

#### 子任務

- [ ] **Day 7: 打包與發布**
  - [ ] 打包應用程式
    - Windows 版本
    - macOS 版本
  - [ ] 上傳到 GitHub Releases
  - [ ] 撰寫 Release Notes
  - [ ] 發布 v0.1.0 (MVP)

- [ ] **行銷準備 (如果時間允許)**
  - [ ] 準備 Product Hunt 發布素材
  - [ ] 但不要立即發布
  - [ ] 等待內部使用 1-2 週後再公開發布

#### 驗收標準

- [ ] 應用程式可以正常安裝
- [ ] GitHub Release 發布完成
- [ ] Release Notes 清楚說明功能與已知問題

---

## 🚨 每日 Standup 規範

### 時間與形式

- **時間**: 每天早上 10:00
- **時長**: 15 分鐘 (嚴格控制)
- **參與者**: 全體團隊
- **記錄**: GitHub Discussions

### Standup 格式

```markdown
## Daily Standup - 2026-02-XX

### Taylor (CTO)
✅ 昨天完成:
- [具體任務]

🚧 今天計畫:
- [具體任務]

🚫 阻礙:
- [阻礙描述] 或 "無"

### Alex (PM)
...
```

### Standup 檢查重點

**Alex 必須檢查**:
1. Taylor 是否專注在 P0 任務?
2. 有沒有做非 P0 工作?
3. 進度是否符合預期?
4. 有沒有需要協助的阻礙?

**如果發現偏離**:
- 立即提醒
- 重新對齊優先級
- 必要時調整計畫

---

## 📊 Checkpoint 檢查機制

### Checkpoint 1 (2026-02-09 EOD)

**檢查人**: Alex + Taylor
**檢查項目**:
- [ ] 設定介面完成
- [ ] 設定持久化完成
- [ ] 單元測試通過
- [ ] 功能可用

**如果未通過**:
- [ ] 評估原因
- [ ] 決定是否切換到方案 B (延後 2 週)

---

### Checkpoint 2 (2026-02-12 EOD)

**檢查人**: Alex + Taylor + Jordan
**檢查項目**:
- [ ] 檔案複製功能完成
- [ ] 轉換整合完成
- [ ] 圖片複製完成
- [ ] 錯誤處理完善
- [ ] 手動測試通過 (10+ 文章)

**如果未通過**:
- [ ] 評估落後天數
- [ ] 如果落後 > 1 天,考慮方案 C (移除 Git 自動化)
- [ ] 如果落後 > 2 天,切換到方案 B (延後發布)

---

### Checkpoint 3 (2026-02-15 EOD)

**檢查人**: Alex + Taylor + Sam
**檢查項目**:
- [ ] Git 自動化完成
- [ ] 整合測試通過
- [ ] 手動測試通過 (10+ 發布)
- [ ] 功能穩定

**如果未通過**:
- [ ] 評估 Git 功能必要性
- [ ] 如果不穩定,考慮先移除 Git 自動化
- [ ] 確保核心發布功能可用

---

## 🔒 範圍鎖定機制

### Week 2 Day 6 ~ Week 3 Day 7 (2026-02-07 ~ 2026-02-16)

**絕對禁止的工作**:
- ❌ 任何 UI/UX 優化 (除非是 P0 Bug)
- ❌ 任何測試覆蓋率提升 (除非是 P0 功能測試)
- ❌ 任何文檔撰寫 (除非是技術文檔)
- ❌ 任何重構工作
- ❌ 任何「順便做」的想法

**唯一允許的工作**:
- ✅ P0 核心功能開發
- ✅ P0 功能相關測試
- ✅ P0 Bug 修復
- ✅ 必要的技術文檔 (API 設計等)

**違反規則的後果**:
- Alex 立即中止該工作
- 重新對齊優先級
- 可能影響個人績效評估

---

## 📈 成功指標追蹤

### MVP 成功的定義

**必須全部達成** (AND 條件):

1. **功能完整度**: 100%
   - [ ] 設定介面可用
   - [ ] 檔案複製可用
   - [ ] Wiki Links 轉換正確
   - [ ] 圖片處理正確
   - [ ] Frontmatter 轉換正確
   - [ ] Git 自動化可用 (或明確標示為可選)

2. **品質標準**:
   - [ ] 發布成功率 > 80%
   - [ ] P0 Bug = 0
   - [ ] Alpha 測試滿意度 > 3.5/5

3. **測試覆蓋**:
   - [ ] 核心功能 Unit Test 覆蓋率 > 60%
   - [ ] 端到端測試通過

4. **文件完整**:
   - [ ] README 完整
   - [ ] Quick Start Guide 可用
   - [ ] 已知問題清單透明

### 每日追蹤指標

| 日期 | P0 完成度 | 測試通過率 | 阻礙 | 風險等級 |
|------|----------|-----------|------|---------|
| 2/7  | __% | __% | __ | 🟢/🟡/🔴 |
| 2/8  | __% | __% | __ | 🟢/🟡/🔴 |
| 2/9  | __% | __% | __ | 🟢/🟡/🔴 |
| ...  | ... | ... | ... | ... |

---

## 🔄 應變方案

### 方案 B: 延後發布 2 週

**觸發條件**:
- Checkpoint 1 或 2 嚴重未達標
- 核心功能根本無法實現
- 團隊一致認為需要更多時間

**調整**:
- 新目標日期: 2026-03-15
- 時程寬鬆,品質優先
- Product Hunt 延後

### 方案 C: 縮減 MVP 範圍

**觸發條件**:
- Checkpoint 2 達標,但 Checkpoint 3 嚴重落後
- Git 自動化太複雜
- 時間不足但核心功能可用

**調整**:
- ❌ 移除 Git 自動化
- ✅ 保留核心: 轉換 + 檔案複製
- 📝 文件說明使用者需手動 Git 操作
- 🔮 Git 自動化延後到 v0.2

---

## 📝 最終檢查清單

### Week 4 結束前 (2026-02-24)

- [ ] **功能檢查**
  - [ ] 設定介面可用
  - [ ] 檔案複製可用
  - [ ] 轉換功能正確
  - [ ] Git 自動化可用 (或明確為可選)

- [ ] **品質檢查**
  - [ ] 發布成功率 > 80%
  - [ ] P0 Bug = 0
  - [ ] 測試覆蓋率 > 60%

- [ ] **文件檢查**
  - [ ] README 完整
  - [ ] Quick Start Guide 可用
  - [ ] 已知問題清單完整

- [ ] **團隊簽核**
  - [ ] Taylor: 技術實現完整 ✅
  - [ ] Alex: 產品目標達成 ✅
  - [ ] Jordan: 使用者體驗可接受 ✅
  - [ ] Sam: 穩定性可接受 ✅
  - [ ] Lisa: 可以開始準備推廣 ✅

**全部打勾後,MVP 正式完成! 🎉**

---

## 📞 緊急聯絡與升級機制

### 遇到阻礙時

**立即聯絡**: Alex (PM)

**升級流程**:
1. Taylor 發現阻礙
2. 在 Standup 中提出
3. Alex 評估影響
4. 團隊討論解決方案
5. 必要時調整計畫

### 嚴重問題升級

**觸發條件**:
- 核心功能無法實現
- Checkpoint 嚴重未達標
- 預計延遲 > 2 天

**升級流程**:
1. Taylor 立即通知 Alex
2. 召開緊急會議 (30 分鐘內)
3. 評估方案 B/C 切換
4. 全員投票決定
5. 立即執行新方案

---

## 🎯 總結

### 關鍵原則

1. **100% 專注 P0**: 沒有例外
2. **每日檢查**: 不要等到 Checkpoint 才發現問題
3. **透明溝通**: 遇到問題立即說
4. **果斷決策**: Checkpoint 未達標立即切換方案
5. **保持彈性**: 目標是「可用的 MVP」,不是「完美的產品」

### 成功的定義

**MVP 成功 = 使用者可以一鍵發布文章 + 成功率 > 80%**

其他所有功能都是加分項,不影響 MVP 成功。

---

**建立日期**: 2026-02-06
**維護者**: Alex Chen (PM)
**下次更新**: 每日 Standup 後更新進度
