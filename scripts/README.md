# WriteFlow MVP Issues 建立工具

## 使用說明

### 1. 前置準備

#### 安裝 GitHub CLI (如果尚未安裝)

```bash
# Windows (使用 winget)
winget install GitHub.cli

# 或從官網下載
# https://cli.github.com/
```

#### 重新啟動終端

安裝後請**重新啟動 PowerShell 或 CMD**,讓 `gh` 命令生效。

#### 登入 GitHub

```bash
gh auth login
```

按照提示選擇:
1. GitHub.com
2. HTTPS
3. Yes (authenticate Git with your GitHub credentials)
4. Login with a web browser

### 2. 執行腳本

```bash
cd C:\Repos\R
.\scripts\create-mvp-issues.bat
```

腳本會自動:
- ✅ 檢查 gh CLI 是否就緒
- ✅ 檢查 GitHub 認證狀態
- ✅ 建立專案 labels
- ✅ 建立 8 個 MVP Issues

### 3. 驗證 Issues

```bash
# 列出所有 Issues
gh issue list

# 查看特定 Issue
gh issue view 1

# 在瀏覽器中開啟 Issues 頁面
gh issue list --web
```

## 建立的 Issues 清單

| Issue | 標題 | 優先級 | 截止日期 | 依賴 |
|-------|------|--------|---------|------|
| #1 | P0-1: 實作基本設定介面 | P0 | 2026-02-09 | - |
| #2 | P0-2: 實作檔案複製與轉換功能 | P0 | 2026-02-12 | #1 |
| #3 | P0-3: 實作 Git 自動化 | P0 | 2026-02-15 | #2 |
| #4 | P0-4: 端到端整合與內部測試 | P0 | 2026-02-16 | #3 |
| #5 | P0-5: Bug 修復與優化 | P0 | 2026-02-19 | #4 |
| #6 | P0-6: 文件完善 | P0 | 2026-02-20 | #4 |
| #7 | P0-7: 最終驗證 | P0 | 2026-02-22 | #5, #6 |
| #8 | P0-8: MVP 發布 (可選) | P1 | 2026-02-24 | #7 |

## Labels 說明

腳本會自動建立以下 labels:

- `priority: p0-critical` 🔴 - 最高優先級,必須完成
- `priority: p1-high` 🟠 - 高優先級
- `type: feature` 🔵 - 新功能
- `type: bug` 🔴 - 錯誤修復
- `scope: mvp` 🟡 - MVP 範圍內
- `team: dev` 🟢 - 開發團隊

## 如果遇到問題

### gh: command not found

**原因**: 終端尚未重新載入環境變數

**解決方法**:
1. 關閉當前終端
2. 重新開啟 PowerShell 或 CMD
3. 再次執行腳本

### gh auth status 失敗

**原因**: 尚未登入 GitHub

**解決方法**:
```bash
gh auth login
```

### Issues 已存在

**原因**: 腳本可能已執行過

**解決方法**:
- 檢查: `gh issue list`
- 如果 Issues 已存在,可以跳過建立
- 或手動刪除後重新執行

## 手動建立 (替代方案)

如果腳本無法執行,也可以手動建立 Issues:

1. 訪問: https://github.com/[YOUR_REPO]/issues/new
2. 複製腳本中的 Issue 內容
3. 手動建立 8 個 Issues
4. 手動設定 labels

## 參考文件

- [圓桌會議討論記錄](../docs/roundtable-discussions/topic-002-progress-review-week2/discussion.md)
- [詳細行動項目清單](../docs/roundtable-discussions/topic-002-progress-review-week2/action-items.md)
- [GitHub CLI 文件](https://cli.github.com/manual/)

---

**建立日期**: 2026-02-06
**維護者**: Alex Chen (PM)
