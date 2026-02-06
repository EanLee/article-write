@echo off
REM WriteFlow MVP GitHub Issues 建立腳本
REM 執行前請確保: 1) gh CLI 已安裝 2) 已完成 gh auth login

echo ========================================
echo WriteFlow MVP Issues 建立工具
echo ========================================
echo.

REM 檢查 gh CLI
gh --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 gh CLI
    echo 請先安裝: winget install GitHub.cli
    echo 或訪問: https://cli.github.com/
    pause
    exit /b 1
)

REM 檢查認證
gh auth status >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 尚未登入 GitHub
    echo 請執行: gh auth login
    pause
    exit /b 1
)

echo [✓] gh CLI 已就緒
echo.

REM 建立 labels (如果不存在)
echo 建立 labels...
gh label create "priority: p0-critical" --color "b60205" --description "最高優先級 - 必須完成" --force
gh label create "priority: p1-high" --color "d93f0b" --description "高優先級" --force
gh label create "type: feature" --color "0052cc" --description "新功能" --force
gh label create "type: bug" --color "d73a4a" --description "錯誤修復" --force
gh label create "scope: mvp" --color "fbca04" --description "MVP 範圍內" --force
gh label create "team: dev" --color "0e8a16" --description "開發團隊" --force
echo.

REM P0-1: 基本設定介面
echo 建立 Issue #1: P0-1 基本設定介面...
gh issue create ^
  --title "P0-1: 實作基本設定介面" ^
  --label "priority: p0-critical,type: feature,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-09 (Week 2 結束)
**負責人**: Taylor (CTO)
**工作量**: 2 天

## 子任務

### Day 6 (2026-02-07) - 設定 UI
- [ ] 建立設定頁面組件 `Settings.vue`
- [ ] 實作 Obsidian Vault 路徑選擇器
- [ ] 實作 Astro 專案路徑選擇器
- [ ] 路徑驗證邏輯
- [ ] UI 設計

### Day 7 (2026-02-08) - 設定持久化
- [ ] 實作設定儲存邏輯
- [ ] 實作設定載入邏輯
- [ ] 設定驗證
- [ ] 撰寫單元測試

## 驗收標準

- [ ] 使用者可以透過 UI 選擇 Obsidian Vault 路徑
- [ ] 使用者可以透過 UI 選擇 Astro 專案路徑
- [ ] 路徑驗證正確
- [ ] 設定可以儲存並持久化
- [ ] 應用程式重啟後自動載入設定
- [ ] 單元測試通過率 100%%

## Checkpoint 1

**檢查日期**: 2026-02-09 EOD
**檢查人**: Alex + Taylor

如果未通過 → 評估是否切換到方案 B (延後發布)

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-1-實作基本設定介面)
- [討論記錄](../docs/roundtable-discussions/topic-002-progress-review-week2/discussion.md)"

echo.

REM P0-2: 檔案複製與轉換
echo 建立 Issue #2: P0-2 檔案複製與轉換...
gh issue create ^
  --title "P0-2: 實作檔案複製與轉換功能" ^
  --label "priority: p0-critical,type: feature,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-12 (Week 3 Day 3)
**負責人**: Taylor (CTO)
**工作量**: 3 天
**依賴**: #1 必須完成

## 子任務

### Day 1 (2026-02-10) - 檔案複製邏輯
- [ ] 建立 `PublishService.ts`
- [ ] 實作讀取 Obsidian 文章
- [ ] 實作寫入 Astro 目錄
- [ ] 基本錯誤處理

### Day 2 (2026-02-11) - 轉換整合
- [ ] 整合 ConverterService
- [ ] 圖片檔案複製
- [ ] 完整發布流程
- [ ] 進度回報

### Day 3 (2026-02-12) - 錯誤處理與測試
- [ ] 完善錯誤處理
- [ ] 友善的錯誤訊息
- [ ] 撰寫整合測試
- [ ] 手動測試

## 驗收標準

- [ ] 可以讀取 Obsidian 文章並轉換
- [ ] Wiki Links 正確轉換
- [ ] 圖片正確複製和路徑更新
- [ ] Frontmatter 正確轉換
- [ ] 文章檔案寫入到正確位置
- [ ] 所有錯誤都有友善提示
- [ ] 整合測試通過率 100%%

## Checkpoint 2

**檢查日期**: 2026-02-12 EOD
**檢查人**: Alex + Taylor + Jordan

如果未通過:
- 評估落後原因
- 決定是否切換到方案 C (縮減範圍)
- 或切換到方案 B (延後發布)

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-2-實作檔案複製與轉換功能)
- [測試場景](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#測試場景-1)"

echo.

REM P0-3: Git 自動化
echo 建立 Issue #3: P0-3 Git 自動化...
gh issue create ^
  --title "P0-3: 實作 Git 自動化" ^
  --label "priority: p0-critical,type: feature,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-15 (Week 3 Day 6)
**負責人**: Taylor (CTO)
**工作量**: 3 天
**依賴**: #2 必須完成

## 子任務

### Day 4 (2026-02-13) - Git 基礎操作
- [ ] 建立 `GitService.ts`
- [ ] 實作 `git status` 檢查
- [ ] 實作 `git add`
- [ ] 實作 `git commit`
- [ ] 基本錯誤處理

### Day 5 (2026-02-14) - Git Push 與衝突處理
- [ ] 實作 `git push`
- [ ] 衝突檢測
- [ ] 網路錯誤處理
- [ ] 權限錯誤處理

### Day 6 (2026-02-15) - 整合與測試
- [ ] 整合到 PublishService
- [ ] 完善錯誤處理
- [ ] 撰寫整合測試
- [ ] 手動測試

## 驗收標準

- [ ] 發布文章後自動執行 `git add`
- [ ] 自動生成 commit message
- [ ] 自動執行 `git commit` 和 `git push`
- [ ] Git 衝突時停止並提示
- [ ] 操作失敗時有清楚錯誤訊息
- [ ] 可在設定中關閉 Git 自動化
- [ ] 整合測試通過率 100%%

## Checkpoint 3

**檢查日期**: 2026-02-15 EOD
**檢查人**: Alex + Taylor + Sam

如果未通過:
- 評估問題嚴重性
- 如果只是小 Bug,繼續修復
- 如果功能根本不可用,切換到方案 C (移除 Git 自動化)

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-3-實作-git-自動化)
- [測試場景](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#測試場景-2)"

echo.

REM P0-4: 端到端整合
echo 建立 Issue #4: P0-4 端到端整合...
gh issue create ^
  --title "P0-4: 端到端整合與內部測試" ^
  --label "priority: p0-critical,type: feature,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-16 (Week 3 Day 7)
**負責人**: 全體團隊
**工作量**: 1 天
**依賴**: #3 必須完成

## 子任務

### 上午: Taylor 整合所有功能
- [ ] 在 UI 中添加「發布」按鈕
- [ ] 實作發布流程
- [ ] 完善 UI 反饋
- [ ] 最終自我測試

### 下午: 全員 Alpha 測試
- [ ] Alex - 產品測試
- [ ] Jordan - 使用者測試
- [ ] Sam - 技術測試
- [ ] Lisa - 內容測試

### 晚上: 問題彙整
- [ ] Taylor 彙整所有測試問題
- [ ] 分類為 P0/P1/P2
- [ ] 評估修復工作量
- [ ] 規劃 Week 4 修復計畫

## 驗收標準

- [ ] 完整的發布流程可用
- [ ] UI 反饋清楚明確
- [ ] Alpha 測試發布成功率 > 70%%
- [ ] P0 Bug 清單完整記錄
- [ ] P1/P2 問題清單完整記錄

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-4-端到端整合與內部測試)
- [測試清單](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#測試清單)"

echo.

REM P0-5: Bug 修復
echo 建立 Issue #5: P0-5 Bug 修復...
gh issue create ^
  --title "P0-5: Bug 修復與優化" ^
  --label "priority: p0-critical,type: bug,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-19 (Week 4 Day 2)
**負責人**: Taylor (CTO)
**工作量**: 2-3 天
**依賴**: #4 必須完成

## 子任務

### Day 1-2: 修復 P0 Bug
- [ ] 從 Alpha 測試發現的 P0 Bug 清單
- [ ] 逐一修復
- [ ] 寫回歸測試
- [ ] 重新測試

### Day 3: 修復 P1 Bug (選擇性)
- [ ] 評估 P1 Bug 嚴重性
- [ ] 修復關鍵的 P1 Bug
- [ ] 不重要的延後到下一版

## 驗收標準

- [ ] 所有 P0 Bug 修復完成
- [ ] 回歸測試通過
- [ ] 重新測試發布成功率 > 80%%

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-5-bug-修復與優化)"

echo.

REM P0-6: 文件完善
echo 建立 Issue #6: P0-6 文件完善...
gh issue create ^
  --title "P0-6: 文件完善" ^
  --label "priority: p0-critical,type: feature,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-20 (Week 4 Day 3)
**負責人**: Lisa (Marketing) + Alex (PM)
**工作量**: 2-3 天
**依賴**: #4 完成後可開始

## 子任務

### Day 1: README 更新
- [ ] 更新專案描述
- [ ] 更新功能清單
- [ ] 更新安裝說明
- [ ] 添加使用範例
- [ ] 添加截圖/GIF

### Day 2: Quick Start Guide
- [ ] 撰寫首次設定指南
- [ ] 撰寫發布流程指南
- [ ] 撰寫常見問題 FAQ
- [ ] 撰寫疑難排解指南

### Day 3: 已知問題清單
- [ ] 列出所有已知的 P1/P2 問題
- [ ] 提供 workaround
- [ ] 說明預計修復時間

## 驗收標準

- [ ] README 完整且清晰
- [ ] Quick Start Guide 可讓新使用者 10 分鐘內上手
- [ ] FAQ 涵蓋常見問題
- [ ] 已知問題清單透明公開

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-6-文件完善)
- [文件結構範例](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#文件結構)"

echo.

REM P0-7: 最終驗證
echo 建立 Issue #7: P0-7 最終驗證...
gh issue create ^
  --title "P0-7: 最終驗證" ^
  --label "priority: p0-critical,type: feature,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-22 (Week 4 Day 5)
**負責人**: Sam (Ops) + Jordan (User)
**工作量**: 2-3 天
**依賴**: #5 和 #6 必須完成

## 子任務

### Day 4-5: 最終測試
- [ ] Sam 執行完整測試套件
- [ ] Jordan 執行使用者驗收測試
- [ ] 驗證發布成功率 (測試 50 篇文章)

### Day 6: 發布檢查清單
- [ ] 所有 P0 功能完成
- [ ] 所有 P0 Bug 修復
- [ ] 發布成功率 > 80%%
- [ ] 文件完整
- [ ] 測試通過
- [ ] 準備發布包

## 驗收標準

- [ ] 所有測試通過
- [ ] 發布成功率 > 80%%
- [ ] 使用者驗收通過
- [ ] 文件驗證通過
- [ ] 發布檢查清單全部打勾

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-7-最終驗證)"

echo.

REM P0-8: MVP 發布
echo 建立 Issue #8: P0-8 MVP 發布...
gh issue create ^
  --title "P0-8: MVP 發布 (可選)" ^
  --label "priority: p1-high,type: feature,scope: mvp,team: dev" ^
  --body "**截止日期**: 2026-02-24 (Week 4 結束)
**負責人**: Sam (Ops) + Lisa (Marketing)
**優先級**: P1 (可選)
**工作量**: 1 天
**依賴**: #7 必須完成並通過

## 子任務

### Day 7: 打包與發布
- [ ] 打包應用程式 (Windows/macOS)
- [ ] 上傳到 GitHub Releases
- [ ] 撰寫 Release Notes
- [ ] 發布 v0.1.0 (MVP)

### 行銷準備
- [ ] 準備 Product Hunt 發布素材
- [ ] 不要立即發布 (等待內部使用 1-2 週)

## 驗收標準

- [ ] 應用程式可以正常安裝
- [ ] GitHub Release 發布完成
- [ ] Release Notes 清楚說明功能與已知問題

## 參考文件

- [詳細實作指南](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md#p0-8-mvp-發布-可選)"

echo.
echo ========================================
echo [✓] 所有 Issues 建立完成!
echo ========================================
echo.
echo 請在 GitHub 上查看: gh issue list
echo 或訪問: https://github.com/[YOUR_REPO]/issues
echo.
pause
