# T-004 自動化 Changelog 生成

**日期**: 2026-02-15
**負責人**: Sam（Tech Lead）
**狀態**: ✅ 完成（採用方案 B：release-please）

---

## 背景

本專案採用 Conventional Commits 規範，commit message 格式嚴格統一，
天然適合用工具自動解析並產生 CHANGELOG。

目前 Release workflow 已啟用 GitHub 內建的 `generate_release_notes`，
能在 Release 頁面自動生成摘要，但**不會產生 `CHANGELOG.md` 檔案進入 repo**。

本文件評估兩個主流工具方案，供決策參考。

---

## 方案 A vs 方案 B 核心差異

| 面向 | 方案 A：`conventional-changelog-cli` | 方案 B：`release-please` |
|------|--------------------------------------|--------------------------|
| **定位** | 單一工具：只負責產生 CHANGELOG 文字 | 完整流程：管理版本號 + CHANGELOG + Release |
| **版本號管理** | ❌ 不管，開發者手動改 `package.json` | ✅ 自動依 commit type 遞增 |
| **觸發方式** | 在 Release workflow 中手動呼叫 | 監聽 push to main，自動開 Release PR |
| **發佈流程** | 現有流程不變，多一步產生 CHANGELOG | 改變現有流程：需合併 Release PR 才觸發建置 |
| **對現有流程的侵入性** | 低（在現有 workflow 加幾行） | 高（需重構整個 Release workflow） |
| **CHANGELOG 存放** | `CHANGELOG.md` commit 進 repo | `CHANGELOG.md` commit 進 repo（由工具管理） |
| **Release Notes 來源** | 與 CHANGELOG 相同內容 | 與 CHANGELOG 完全同步 |
| **維護者** | `conventional-changelog` 社群 | Google（官方支援） |

---

## 方案 A 詳細說明：`conventional-changelog-cli`

### 運作流程

```
開發者 push to main
        ↓
現有 Release workflow 執行
        ↓
三平台建置（Windows / macOS / Linux）
        ↓
[新增] 呼叫 conventional-changelog-cli 產生 CHANGELOG.md
        ↓
[新增] commit CHANGELOG.md 回 main [skip ci]
        ↓
建立 GitHub Release，附上安裝檔
```

### CHANGELOG 輸出範例

```markdown
## [0.2.0](比較連結) (2026-02-15)

### Features

* **editor**: 實作 Undo/Redo 功能（#12）
* **ui**: 新增深色模式切換

### Bug Fixes

* **editor**: 修復游標在中文輸入後位移的問題

### Performance Improvements

* **service**: 優化文章載入速度
```

### 優點

- ✅ **低風險**：現有 workflow 架構完全不變，只加幾行
- ✅ **立即可用**：安裝一個 package 即可
- ✅ **版本自主**：開發者仍掌控 `package.json` 版本號，不被工具接管
- ✅ **輸出可預期**：依 feat / fix / perf 分組，格式整齊
- ✅ **歷史可補齊**：執行一次 `-r 0` 可從頭產生所有歷史版本的 CHANGELOG

### 缺點

- ⚠️ **版本號不連動**：工具不知道「現在是幾版」，需開發者在 push main 前先更新 `package.json`
- ⚠️ **需要 bot commit 權限**：workflow 需要能 push 回 main（需設定 `contents: write` 或 PAT）
- ⚠️ **分組標題固定為英文**：`Features`、`Bug Fixes` 等，無法輸出中文標題

---

## 方案 B 詳細說明：`release-please`

### 運作流程

```
開發者 push to main（含 feat / fix commits）
        ↓
release-please-action 被觸發
        ↓
自動開或更新一個 Release PR（branch: release-please--main）
PR 內容：
  - 更新 package.json 版本號（自動計算）
  - 更新 CHANGELOG.md（自動產生）
        ↓
開發者 review 並合併 Release PR
        ↓
release-please 建立 GitHub Release + tag
        ↓
（可設定）觸發現有三平台建置 workflow
```

### 版本號自動遞增規則

| Commit type | 版本遞增 | 範例 |
|-------------|---------|------|
| `fix:` | patch（0.1.**1**） | 修 bug |
| `feat:` | minor（0.**2**.0） | 新功能 |
| `feat!:` 或 `BREAKING CHANGE` | major（**1**.0.0） | 破壞性變更 |

### CHANGELOG 輸出範例

與方案 A 格式相同，但版本號和日期完全由工具控制，保證準確。

### 優點

- ✅ **版本號全自動**：開發者不需要手動改 `package.json`，工具根據 commit 自動計算
- ✅ **CHANGELOG 與 Release 100% 同步**：永遠不會有「忘記更新 CHANGELOG」的問題
- ✅ **Google 長期維護**：在大型開源專案中廣泛使用（Firebase、Google Cloud SDK 等）
- ✅ **Release PR 提供一個自然的「發佈確認點」**：合併 PR = 確認發佈

### 缺點

- ❌ **需要重構 Release workflow**：現有「push to main → 直接建置」的流程必須改為「合併 Release PR → 觸發建置」
- ❌ **版本號控制權轉移**：開發者不直接修改 `package.json version`，需要接受這個心智模式轉換
- ❌ **多一個 PR 的流程摩擦**：每次發佈都需要額外合併一個 Release PR
- ❌ **首次設定較複雜**：需要設定 `release-please-config.json`、初始版本等
- ❌ **Conventional Commits 嚴格依賴**：一旦有 commit 不符格式（例如手動 merge commit），工具可能判斷錯誤

---

## 並排比較：決策矩陣

| 評估維度 | 方案 A | 方案 B | 說明 |
|---------|--------|--------|------|
| 導入成本 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | A 只需幾行，B 需重構流程 |
| 版本管理自動化 | ⭐⭐ | ⭐⭐⭐⭐⭐ | B 完全自動，A 需手動 |
| 對現有流程衝擊 | 低 | 高 | B 改變發佈觸發方式 |
| 長期維護品質 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | B 有 Google 支援 |
| CHANGELOG 準確性 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | A 仍需手動更新版本號 |
| 適合現階段（v0.x） | ✅ | ⚠️ | 方案 B 的優勢在版本頻繁遞增時更明顯 |

---

## 技術團隊建議

### 短期（現在）→ 方案 A

專案目前處於 v0.x 快速迭代階段，版本號變動不頻繁，方案 A 的低成本導入更合適：

1. 立即獲得 `CHANGELOG.md` 進入 repo
2. 現有 CI/CD 架構完全不動
3. 開發者維持對版本號的完整掌控

### 長期（v1.0 穩定後）→ 評估遷移至方案 B

當以下條件成立時，值得評估遷移：
- 發佈頻率提高（每週或每次 sprint 發佈）
- 版本號管理成為痛點
- 有多人同時開發，需要明確的發佈確認點

**遷移成本不高**：方案 A 的 CHANGELOG 格式與方案 B 相容，遷移時不需要重寫歷史。

---

## 方案 A 實作計畫

若決策採用方案 A，完整步驟如下：

### Step 1：安裝依賴

```bash
pnpm add -D conventional-changelog-cli
```

### Step 2：新增 npm script

在 `package.json` 加入：

```json
"changelog": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s"
```

### Step 3：產生歷史 CHANGELOG（一次性）

```bash
# -r 0 = 不限制，從第一個 tag 到現在全部產生
pnpm exec conventional-changelog -p conventionalcommits -i CHANGELOG.md -s -r 0
```

### Step 4：更新 Release Workflow

在 `create-release` job 的「下載 artifacts」步驟之後、「建立 Release」步驟之前加入：

```yaml
- name: 設定 git 身份（bot）
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

- name: 產生 CHANGELOG
  run: pnpm run changelog

- name: 提交 CHANGELOG 回 main
  run: |
    git add CHANGELOG.md
    git diff --staged --quiet || \
      git commit -m "docs(changelog): 更新 v${{ steps.version.outputs.version }} CHANGELOG [skip ci]"
    git push
```

### Step 5：在 Release 中附上 CHANGELOG 連結

`softprops/action-gh-release` 的 `body` 參數可直接引用 CHANGELOG：

```yaml
- name: 讀取本版 CHANGELOG
  id: changelog
  run: |
    # 擷取最新版本的 CHANGELOG 區段
    CONTENT=$(awk '/^## \[/{if(found) exit; found=1} found{print}' CHANGELOG.md)
    echo "content<<EOF" >> $GITHUB_OUTPUT
    echo "$CONTENT" >> $GITHUB_OUTPUT
    echo "EOF" >> $GITHUB_OUTPUT

- name: 建立 GitHub Release
  uses: softprops/action-gh-release@v2
  with:
    body: ${{ steps.changelog.outputs.content }}
    # ... 其他設定
```

---

## 決策結果

**採用方案 B（release-please）**，理由：不想手動管理版本號，由工具根據 commit 自動遞增。

### 實作內容

| 檔案 | 說明 |
|------|------|
| `.github/workflows/release-please.yml` | 監聽 push to main，管理 Release PR + CHANGELOG + tag |
| `.github/workflows/build.yml` | 監聽 tag 建立，觸發三平台建置並附上安裝檔 |
| `release-please-config.json` | release-please 設定，含中文 CHANGELOG 分組標題 |
| `.release-please-manifest.json` | 記錄目前版本號（初始 0.1.0） |
| `.github/workflows/release.yml` | 已刪除，由新的兩個 workflow 取代 |

### 相關 Commit

見下方「相關 Commit」區段。
