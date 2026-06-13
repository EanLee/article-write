---
title: "WriteFlow MVP 範圍定義"
domain: product
type: spec
status: approved
owner: tech-team
updated: 2026-02-13
source_of_truth: true
---

# WriteFlow MVP 範圍定義

> **版本**: v0.1.0
> **原定時程**: 3 週 (Week 1-3) - 2026-02-03
> **調整時程**: 5 週 (2026-02-12 ~ 2026-03-15) - 2026-02-12
> **決策日期**: 2026-02-03（原定）/ 2026-02-12（調整）
> **負責人**: Alex (PM)
>
> ---
>
> **⚠️ 時程調整說明**（2026-02-12）
>
> 由於公司工作優先（不可控因素），導致 2/6-2/12 期間開發停滯。
> 經圓桌會議決議，採用**方案 B：延後發布，保持完整範圍**。
>
> - **新發布日**：2026-03-15（延後 19 天）
> - **保持範圍**：所有 P0 功能維持不變
> - **彈性機制**：根據工作量調整每週投入（5-20 小時）
> - **詳細調整**：參見 [現實重組會議記錄](../roundtable-discussions/2026-02-12-reality-reset-meeting.md)

---

## 🎯 MVP 核心目標

**唯一目標**: 讓使用者能夠從 Obsidian 一鍵發布文章到 Astro 部落格

**成功標準**:
- ✅ 使用者可以選擇文章
- ✅ 點擊「發布」按鈕
- ✅ 文章自動轉換格式並複製到 Astro
- ✅ 自動 Git commit 和 push
- ✅ 發布成功率 > 80%

---

## ✅ 包含在 MVP 範圍內

### 1. 核心發布功能 ⛔ P0

#### 1.1 Wiki Link 轉換
- **輸入**: `[[文章名稱]]` 或 `[[文章名稱|顯示文字]]`
- **輸出**: `[文章名稱](/blog/文章-slug)` 或 `[顯示文字](/blog/文章-slug)`
- **處理**:
  - 解析 Wiki Link 語法
  - 查找目標文章的 slug
  - 轉換為 Markdown 連結格式
  - 處理不存在的連結（保留或警告）

**技術實作**:
```typescript
// src/services/ConverterService.ts
convertWikiLinks(content: string): string {
  // 正則匹配 [[link]] 或 [[link|text]]
  // 查找對應文章 slug
  // 轉換為標準連結
}
```

**測試案例**:
- [x] 基本 Wiki Link: `[[文章A]]` → `[文章A](/blog/article-a)`
- [x] 帶顯示文字: `[[文章A|點擊這裡]]` → `[點擊這裡](/blog/article-a)`
- [x] 不存在的連結: `[[不存在]]` → 保留或警告
- [x] 巢狀連結: 段落中有多個 Wiki Links

---

#### 1.2 圖片路徑處理
- **輸入**: `![alt](images/pic.png)` 或 `![[pic.png]]`
- **輸出**: `![alt](/images/pic.png)`
- **處理**:
  - 轉換 Obsidian 圖片語法
  - 複製圖片到 Astro public/images/
  - 更新路徑為絕對路徑

**技術實作**:
```typescript
// src/services/ConverterService.ts
convertImagePaths(content: string, articlePath: string): string {
  // 解析圖片路徑
  // 複製圖片到目標目錄
  // 更新為絕對路徑
}
```

**測試案例**:
- [x] 標準 Markdown 圖片: `![alt](images/pic.png)`
- [x] Obsidian 圖片: `![[pic.png]]`
- [x] 相對路徑: `../images/pic.png`
- [x] 圖片不存在: 錯誤處理

---

#### 1.3 Frontmatter 轉換
- **輸入**: Obsidian frontmatter 格式
- **輸出**: Astro 相容的 frontmatter
- **處理**:
  - 確保必要欄位存在（title, date, category）
  - 轉換日期格式
  - 處理 tags 陣列
  - 生成 slug

**技術實作**:
```typescript
// src/services/ConverterService.ts
convertFrontmatter(frontmatter: any): any {
  return {
    title: frontmatter.title,
    date: formatDate(frontmatter.date),
    category: frontmatter.category,
    tags: frontmatter.tags || [],
    slug: generateSlug(frontmatter.title)
  }
}
```

**測試案例**:
- [x] 完整 frontmatter
- [x] 缺少必要欄位
- [x] 日期格式轉換
- [x] 中文 title 轉 slug

---

#### 1.4 檔案複製
- **功能**: 複製轉換後的文章到 Astro 目錄
- **來源**: `Obsidian Vault/Publish/{category}/article.md`
- **目標**: `Astro Blog/src/content/blog/article.md`
- **處理**:
  - 驗證目標路徑存在
  - 處理同名檔案（覆蓋或警告）
  - 確保寫入權限

**技術實作**:
```typescript
// src/services/PublishService.ts
async publishArticle(article: Article): Promise<void> {
  const converted = await converter.convert(article)
  await fileService.writeFile(targetPath, converted)
}
```

**錯誤處理**:
- [x] 目標路徑不存在 → 創建目錄
- [x] 無寫入權限 → 明確錯誤訊息
- [x] 磁碟空間不足 → 警告使用者

---

#### 1.5 Git 自動化
- **功能**: 自動 commit 和 push 已發布的文章
- **步驟**:
  1. 檢查 Git 狀態（是否有未 commit 的變更）
  2. 執行 `git add src/content/blog/{article}.md`
  3. 執行 `git commit -m "chore(blog): 發布文章 - {title}"`
  4. 執行 `git push` (如果沒有衝突)

**技術實作**:
```typescript
// src/services/GitService.ts
async publishToGit(articlePath: string, title: string): Promise<void> {
  await checkGitStatus()
  await gitAdd(articlePath)
  await gitCommit(`chore(blog): 發布文章 - ${title}`)
  await gitPush()
}
```

**安全檢查**:
- [x] 檢查是否在 Git repo 中
- [x] 檢查是否有 Git 衝突
- [x] 檢查是否有 remote
- [x] 失敗時不要破壞檔案

---

### 2. 基本錯誤處理 ⛔ P0

#### 2.1 檔案操作錯誤
- **讀取失敗**: 檔案不存在、權限問題
- **寫入失敗**: 無權限、磁碟空間不足
- **提示**: 明確的錯誤訊息（不只是 "發生錯誤"）

#### 2.2 Git 操作錯誤
- **Git 衝突**: 停止發布，提示使用者手動處理
- **Push 失敗**: 網路問題、權限問題
- **提示**: 清楚說明問題和解決方式

#### 2.3 轉換錯誤
- **格式錯誤**: Frontmatter 格式不正確
- **連結錯誤**: Wiki Link 找不到目標
- **提示**: 指出具體哪裡有問題

**錯誤處理原則**:
1. **不能 Crash** - 任何錯誤都要 catch
2. **明確提示** - 告訴使用者發生什麼、為什麼、怎麼解決
3. **保護資料** - 錯誤不能導致資料遺失

---

### 3. 基本設定介面 ⛔ P0

#### 3.1 路徑設定
- **Obsidian Vault 路徑**: 選擇 Obsidian Vault 根目錄
- **Astro 專案路徑**: 選擇 Astro 專案根目錄
- **驗證**: 檢查路徑是否有效

**UI 要求**:
- 資料夾選擇器（系統原生對話框）
- 路徑預覽
- 驗證結果提示

#### 3.2 設定持久化
- **儲存**: 儲存在本地配置檔案
- **載入**: 應用程式啟動時自動載入
- **驗證**: 每次使用前驗證路徑仍有效

---

### 4. 發布按鈕和流程 ⛔ P0

#### 4.1 發布按鈕
- **位置**: 文章編輯器或文章管理介面
- **狀態**:
  - 啟用：文章符合發布條件
  - 禁用：缺少必要資訊或尚未設定路徑
  - 載入中：發布進行中

#### 4.2 發布流程
1. 使用者點擊「發布」
2. 驗證必要設定（路徑、frontmatter）
3. 執行轉換（Wiki Links, 圖片, Frontmatter）
4. 複製檔案到 Astro
5. 執行 Git 操作
6. 顯示成功或失敗訊息

#### 4.3 成功/失敗提示
- **成功**: Toast 提示 "發布成功！文章已推送到 Git"
- **失敗**: 對話框顯示詳細錯誤訊息和建議

---

## ❌ 不包含在 MVP 範圍內

### 延後到 v0.2 或更晚

#### 1. AI 功能 ❌
- ❌ AI 自動摘要
- ❌ SEO 建議
- ❌ 標題建議
- ❌ 標籤自動建議
- **理由**: 非核心功能，可後續增加

#### 2. 多平台發布 ❌
- ❌ Medium 發布
- ❌ Dev.to 發布
- ❌ 方格子發布
- **理由**: 擴展功能，先驗證 Astro 發布需求

#### 3. 首次使用引導 ❌
- ❌ 新手教學
- ❌ 互動式教學
- ❌ 範例專案
- **理由**: 可以用簡單文件替代

#### 4. 完整 UI/UX 優化 ❌
- ❌ 精美動畫
- ❌ 主題切換
- ❌ 自訂版面配置
- **理由**: 功能優先，美化後續

#### 5. 進階功能 ❌
- ❌ 批次發布
- ❌ 排程發布
- ❌ 版本控制
- ❌ 文章預覽（Astro 樣式）
- ❌ 發布歷史
- ❌ 復原發布
- **理由**: 進階需求，MVP 不需要

#### 6. 測試覆蓋率 100% ❌
- ✅ 核心功能測試（60-70%）
- ❌ 完整測試覆蓋率（100%）
- **理由**: 時間限制，關鍵路徑先行

#### 7. 完整跨平台測試 ❌
- ✅ macOS + Windows 基本測試
- ❌ Linux 完整測試
- ❌ 不同版本相容性測試
- **理由**: 主要平台優先

---

## 🔒 範圍控制原則

### 範圍鎖定機制

**所有新需求必須通過以下檢查**：

1. **是否影響核心發布功能？**
   - 是 → 可能考慮（但仍需評估）
   - 否 → 延後到 v0.2

2. **是否阻礙 MVP 目標？**
   - 是 → 必須處理
   - 否 → 延後

3. **是否在 3 週內可完成？**
   - 否 → 延後

4. **是否會增加範圍？**
   - 是 → 嚴格評估必要性

### 處理新需求的流程

```
新需求提出
    ↓
是否阻礙發布功能？
    ↓ 否
記錄到 v0.2 清單
    ↓
結束（延後處理）

    ↓ 是
評估工作量
    ↓
> 2 天？
    ↓ 是
尋找替代方案
    ↓
否則記錄到 v0.2

    ↓ 否
加入 MVP 範圍
```

---

## 📊 工作量估算

| 功能模組 | 優先級 | 預估工作量 | 負責人 |
|---------|--------|-----------|-------|
| Wiki Link 轉換 | P0 | 3 天 | Taylor |
| 圖片路徑處理 | P0 | 2 天 | Taylor |
| Frontmatter 轉換 | P0 | 1 天 | Taylor |
| 檔案複製 | P0 | 1 天 | Taylor |
| Git 自動化 | P0 | 4 天 | Taylor |
| 錯誤處理 | P0 | 2 天 | Taylor |
| 基本設定介面 | P0 | 2 天 | Taylor |
| **總計** | - | **15 天** | **3 週可行** |

**緩衝時間**: 6 天（Week 3 測試和修復）

---

## ✅ 驗收標準

### 功能驗收

**必須全部通過**：

1. ✅ **基本發布流程**
   - [ ] 使用者可以選擇文章
   - [ ] 點擊發布按鈕
   - [ ] Wiki Links 正確轉換
   - [ ] 圖片正確複製和路徑更新
   - [ ] Frontmatter 正確轉換
   - [ ] 檔案複製到正確位置
   - [ ] Git commit 和 push 成功

2. ✅ **錯誤處理**
   - [ ] 所有錯誤都有明確提示
   - [ ] 應用程式不會 Crash
   - [ ] 錯誤不會導致資料遺失

3. ✅ **設定管理**
   - [ ] 可以設定 Obsidian Vault 路徑
   - [ ] 可以設定 Astro 專案路徑
   - [ ] 設定會持久化
   - [ ] 啟動時自動載入設定

### 品質驗收

1. ✅ **成功率**
   - [ ] 發布成功率 > 80%（內部測試）
   - [ ] 發布成功率 > 90%（Alpha 測試）

2. ✅ **測試覆蓋**
   - [ ] 核心功能 Unit Test 覆蓋率 60%+
   - [ ] 所有關鍵路徑有測試

3. ✅ **穩定性**
   - [ ] Week 3 測試通過
   - [ ] 跨平台測試通過（macOS + Windows）
   - [ ] 無 P0 Bug

---

## 🚫 範圍蔓延防護

### 常見範圍蔓延案例

**案例 1**: "可以加個 AI 摘要嗎？很簡單的！"
- ❌ **拒絕理由**: 非核心功能，AI 整合需要 2-3 週
- ✅ **替代方案**: 記錄到 v0.2，專注發布功能

**案例 2**: "發布前能預覽嗎？"
- ❌ **拒絕理由**: 需要整合 Astro 樣式，工作量大
- ✅ **替代方案**: 使用現有的 Markdown 預覽

**案例 3**: "可以批次發布嗎？"
- ❌ **拒絕理由**: 非 MVP 核心，增加複雜度
- ✅ **替代方案**: 使用者可以一篇篇發布（先驗證單篇）

**案例 4**: "能不能排程發布？"
- ❌ **拒絕理由**: 進階功能，需要背景任務
- ✅ **替代方案**: 記錄到未來版本

### Alex 的範圍守護職責

**每日檢查**:
- 檢查是否有新需求提出
- 評估是否影響 MVP 範圍
- 堅決拒絕非核心功能

**每週檢查**:
- 評估進度是否符合預期
- 檢查是否有範圍蔓延
- 必要時調整計畫（縮減範圍，不擴大）

---

## 📝 MVP 檢查清單

### Week 1 檢查點
- [x] 品牌名稱確定（WriteFlow）
- [x] MVP 範圍定義完成
- [ ] 進度追蹤機制建立
- [ ] 開發啟動

### Week 2 檢查點
- [ ] 核心轉換功能完成
- [ ] 基本錯誤處理完成
- [ ] 設定介面完成
- [ ] 可以成功發布一篇簡單文章

### Week 3 檢查點
- [ ] 所有 P0 功能完成
- [ ] 測試通過率 80%+
- [ ] 跨平台測試完成
- [ ] 準備進入 Week 4 內部測試

---

## 🎯 成功定義

**MVP 成功 = 達成唯一目標**

使用者可以：
1. 打開 WriteFlow
2. 設定 Obsidian 和 Astro 路徑
3. 選擇一篇文章
4. 點擊「發布」
5. 文章自動轉換並推送到 Git
6. 成功率 > 80%

**如果達成以上目標，MVP 成功！** ✅

**其他所有功能都是加分項，不影響 MVP 成功。**

---

## 📅 範圍審查會議

### 每日 Standup (10:00)
- 快速檢查是否有範圍變更
- 確認當日工作在範圍內

### 每週檢查點 (週五 4:00)
- 正式審查 MVP 範圍
- 評估是否需要調整
- 記錄任何延後的需求

---

**建立日期**: 2026-02-03
**負責人**: Alex (PM)
**審查頻率**: 每週
**下次審查**: Week 1 end (2026-02-10)
