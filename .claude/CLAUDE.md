# Claude AI 專案開發規則

本文件定義此專案的 AI 輔助開發規則，所有 AI 助手必須遵循。
詳細流程已拆分為 project skills（`.claude/skills/`），下方僅保留**隨時必須生效**的核心規則。

## ⚠️ 底層工具規則（最高優先，不可跳過）

**除了純文件記錄（撰寫/編輯 markdown 文件）之外，所有作業必須同時使用以下三項工具：**

1. **rtk pre-command**：所有 Bash 指令經 rtk 截斷輸出（PreToolUse hook 自動套用）
2. **MCP plugin:serena**：程式碼讀取、符號搜尋、編輯（語意層工具優先於原始檔案讀取）
3. **MCP context-mode**：批次蒐集（`ctx_batch_execute`）、大輸出解析（`ctx_execute`）、知識召回（`ctx_search`）

**只要其中任何一項未啟動或無法連線：立即停止作業，向使用者回報，不得以無工具方式繼續執行。**

> 緣由：2026-06-13 topic-020 驗收期間，未善用上述工具導致大量 token 浪費。
> 省 token 細則見 `docs/guides/E2E_TESTING_GUIDE.md` 第五章。

## 版本控制規範

完整規範（分支說明表、各類分支操作流程、Commit type/scope 對照表、Git Hooks 設定） → [Git Flow 與分支管理](../docs/conventions/GUIDELINE-2026-06-13-git-branching.md)、[Commit 規範與 Git Hooks](../docs/conventions/GUIDELINE-2026-06-13-commit-conventions.md)

**隨時必須生效的核心鐵則：**

- **⚠️ 絕對不要直接修改 `develop` 或 `main`**
- **⚠️ 一個分支只處理一件事（SRP）**：一個 bug、一個功能、或一項重構，不混合不相關變更
- **任務前必檢查分支**：`git branch --show-current`；若在 `develop`/`main` → 立即警告使用者、建議建立新分支、不要直接修改程式碼（需使用者同意才建立）
- **Feature Branch 完成定義（RETRO-001）**：合併前必須端到端可用（資料能正確儲存/讀取/顯示），不只是 UI 有顯示。實作中若發現需修改其他層（型別、服務層等），在**同一分支**內完成，不另開分支
- **Commit**：Conventional Commits（`<type>(<scope>): <subject>`）、必須**繁體中文**、Atomic + SRP、**不署名**
- **禁止 `git commit --no-verify`**：commit 失敗時排查 Pre-commit（ESLint）/ Commit-msg（commitlint）問題並修正
- **合併**：Feature 建 PR 到 develop；Fix/Hotfix 使用者驗證通過後 `git merge --no-ff`（見 `bugfix-workflow` skill）；hotfix 需同時合併進 `main` 與 `develop`

## 程式碼風格與型別規範

TypeScript / Vue / 命名 / Enum 規範 → [程式碼風格與型別規範](../docs/conventions/GUIDELINE-2026-06-13-code-style.md)（Enum 規範詳見 `typescript-enum-conventions` skill）

## Bug Fix

修復任何 bug → 必用 `bugfix-workflow` skill

## 測試規範

**核心鐵則**：所有修改完成前必執行 `pnpm run test`，**0 failures** 才算完成；不可跳過、不可以「應該不影響」代替實際驗證。
詳細規則與 Definition of Done → `testing-standards` skill

## 技術文件與會議

- CI/CD、架構決策、技術選型、基礎設施變更 → `tech-team-docs` skill
- 圓桌會議 / 技術會議 → `roundtable-meeting` skill
- 文件分類、frontmatter、命名規則 → `docs-governance` skill
- 起草 PRD / 設計文件 / RFC（無清晰結構）→ `doc-coauthoring` skill
- 既有文件補 frontmatter、套用 doc-viewer → `doc-migration` skill
- doc-viewer 工具鏈本身開發（scripts、site.generated.mjs、skills） → `doc-viewer-dev` skill

## 工具偏好

- **Commit 工具**：使用 `/commit` skill（如果可用）

## 參考文件

- [Git Flow 與分支管理](../docs/conventions/GUIDELINE-2026-06-13-git-branching.md)
- [Commit 規範與 Git Hooks](../docs/conventions/GUIDELINE-2026-06-13-commit-conventions.md)
- [程式碼風格與型別規範](../docs/conventions/GUIDELINE-2026-06-13-code-style.md)
- [Bug Fix 報告範例](../docs/fix-bug/)

---

**最後更新**: 2026-06-13
**版本**: 2.1.0
