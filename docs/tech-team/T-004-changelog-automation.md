# T-004 自動化 Changelog 生成

**日期**: 2026-02-15
**負責人**: Sam（Tech Lead）
**狀態**: 📋 規劃中（等待決策）

---

## 背景

本專案採用 Conventional Commits 規範，commit message 格式嚴格統一，
天然適合用工具自動解析並產生 CHANGELOG。

---

## 方案評估

### 方案 A：`conventional-changelog-cli`（推薦）

**工具**：[conventional-changelog-cli](https://github.com/conventional-changelog/conventional-changelog)

**運作方式**：
- 解析 git log 中符合 Conventional Commits 格式的 commit
- 依 `feat`、`fix`、`perf` 等 type 分組
- 輸出 `CHANGELOG.md`，自動按版本號分段

**整合方式**（Release workflow 中加入一個步驟）：

```yaml
- name: 產生 CHANGELOG
  run: |
    pnpm add -g conventional-changelog-cli
    conventional-changelog -p conventionalcommits -i CHANGELOG.md -s -r 0
```

**優點**：
- ✅ 本專案 commit 規範完整，輸出品質高
- ✅ 可直接嵌入 Release workflow，無需額外 CI job
- ✅ `CHANGELOG.md` 可 commit 進 repo，永久保存

**缺點**：
- ⚠️ 需要在 Release workflow 中多一步 commit CHANGELOG 回 main
- ⚠️ 中文 commit message 能正確輸出，但分組標題仍為英文

---

### 方案 B：`release-please`（Google 維護）

**工具**：[release-please-action](https://github.com/google-github-actions/release-please-action)

**運作方式**：
- 監聽 push to main
- 自動開 PR「chore: release X.X.X」
- PR 中包含更新後的 `CHANGELOG.md` 與 `package.json` 版本號
- 合併 PR 時自動建立 GitHub Release

**優點**：
- ✅ 全自動版本號管理（依 feat/fix 自動遞增 major/minor/patch）
- ✅ CHANGELOG 與 Release Notes 完全同步
- ✅ GitHub 原生整合

**缺點**：
- ⚠️ 需要調整現有 Release workflow 架構
- ⚠️ 版本號改由工具控制，開發者不直接修改 `package.json`
- ⚠️ 對現有流程侵入性較高

---

### 方案 C：GitHub Release 內建的 `generate_release_notes`（已啟用）

目前 Release workflow 已設定 `generate_release_notes: true`，
GitHub 會自動根據兩次 tag 之間的 commit 生成 Release Notes。

**優點**：
- ✅ 零成本，已在運行
- ✅ 自動 PR 摘要

**缺點**：
- ❌ 只存在於 GitHub Release 頁面，不會產生 `CHANGELOG.md` 檔案
- ❌ 格式固定，無法依 type（feat/fix）分組

---

## 建議決策

| 需求 | 建議方案 |
|------|---------|
| 快速落地、低風險 | **方案 A**（conventional-changelog-cli） |
| 全自動版本管理（長期） | **方案 B**（release-please） |
| 暫時不處理 | 維持現狀（方案 C 已提供基本功能） |

**技術團隊傾向**：先以 **方案 A** 作為短期解，讓 `CHANGELOG.md` 進入 repo；
待專案穩定後評估遷移至方案 B。

---

## 實作計畫（方案 A）

若決策採用方案 A，實作步驟如下：

1. 安裝 dev dependency：
   ```bash
   pnpm add -D conventional-changelog-cli
   ```

2. 在 `package.json` 新增 script：
   ```json
   "changelog": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s"
   ```

3. 在 Release workflow 的 `create-release` job 加入：
   ```yaml
   - name: 產生並提交 CHANGELOG
     run: |
       pnpm run changelog
       git config user.name "github-actions[bot]"
       git config user.email "github-actions[bot]@users.noreply.github.com"
       git add CHANGELOG.md
       git diff --staged --quiet || git commit -m "docs(changelog): 更新 CHANGELOG [skip ci]"
       git push
   ```

4. 建立初始 `CHANGELOG.md`（空白或補齊歷史）

---

## 等待決策

- [ ] 確認採用哪個方案
- [ ] 決定是否補齊歷史 CHANGELOG
