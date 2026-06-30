---
name: doc-viewer-dev
description: doc-viewer 工具鏈本身的開發與維護技能。修改 scripts/（init.mjs、docs-lint.mjs、generate-nav.mjs）、docs/.vitepress/site.generated.mjs、新增或更新 .claude/skills/ 下的 skill、更新 .claude/CLAUDE.md，或討論架構決策與工具鏈設計時使用。
---

# Doc-Viewer Dev

doc-viewer 工具鏈開發與維護技能。在 doc-viewer repo 本身工作時使用。

## 觸發條件

- 修改 `scripts/` 下的任何腳本（init.mjs、docs-lint.mjs、generate-nav.mjs）
- 修改 `docs/.vitepress/site.generated.mjs`（Vite plugin、frontmatter guard）
- 新增或更新 `.claude/skills/` 下的 skill
- 更新 `.claude/CLAUDE.md`（agent 觸發條件）
- 討論架構決策或工具鏈設計

---

## 架構概覽

```
doc-viewer/
├── scripts/
│   ├── init.mjs              # doc-viewer-init CLI：在目標專案建立完整工具鏈
│   ├── generate-nav.mjs      # 掃描 docs/ 自動產生 nav.generated.mjs
│   └── docs-lint.mjs         # frontmatter YAML 語法與 schema 前置檢查
├── docs/.vitepress/
│   ├── config.mjs            # 使用者自訂（title/description）← 一律覆寫
│   └── site.generated.mjs    # 框架骨架：容錯渲染、nav、search ← 一律覆寫
└── .claude/
    ├── CLAUDE.md             # agent 觸發條件與 skill 清單
    └── skills/               # 三個 skill（本檔所在位置）
```

**關鍵原則：init.mjs 部署的所有檔案一律覆寫，不做 SKIP-if-exists。**
理由：SKIP 會讓模板修正永遠傳不到已初始化的消費專案。

---

## 自我封裝架構（.doc-viewer/）

消費專案的 VitePress 工具鏈封裝在 `.doc-viewer/` 子目錄：
```
<consumer-project>/
├── docs/                     # 文件內容（不是 Node 專案）
│   └── .vitepress/
│       ├── config.mjs        # ← 由 init.mjs 產生
│       ├── site.generated.mjs
│       └── nav.generated.mjs # ← 由 generate-nav.mjs 產生
└── .doc-viewer/              # VitePress 工具鏈，自帶 package.json + node_modules
    ├── package.json          # ← 由 init.mjs 產生
    └── scripts/
        ├── generate-nav.mjs  # ← 由 init.mjs 複製
        └── docs-lint.mjs     # ← 由 init.mjs 複製
```

在 doc-viewer repo 本身，指令從**專案根目錄**執行（不是從 `.doc-viewer/`）：
```bash
pnpm run docs:lint          # 前置 frontmatter 檢查
pnpm run docs:lint:schema   # 加檢查 doc-viewer schema 必填欄位
pnpm run docs:dev           # lint → nav → VitePress dev server
pnpm run docs:build         # lint → nav → 建置靜態站台
```

---

## Frontmatter 防護三層

| 層 | 機制 | 時機 | 行為 |
|---|---|---|---|
| 1 | `docs-lint.mjs` | docs:dev 啟動前 | 列清單並**阻斷**（建議先修） |
| 2a | `wrapMarkdownRender`（site.generated.mjs） | VitePress 渲染時 | YAMLException → **降級顯示錯誤頁** |
| 2b | `frontmatterGuard`（Vite plugin） | Vite transform / hot reload | 提前替換壞 frontmatter |

---

## 新增或更新 Skill

1. 在 `.claude/skills/<skill-name>/SKILL.md` 建立或修改內容
2. 更新 `.claude/CLAUDE.md`：加入觸發條件說明
3. init.mjs 會自動把 `.claude/` 整個複製到目標專案——無需額外改動

**Skill 設計原則：**
- 每個 skill 聚焦單一職責（本 skill 管「開發 doc-viewer」，docs-governance 管「寫文件」）
- 觸發條件要具體（關鍵詞、情境），避免過於寬泛導致不必要觸發
- Skill 應隨專案演進更新，不是一次性建立就不動

---

## 模板傳播流程

當修改任何 init.mjs 部署的檔案後：

1. 修改 doc-viewer 自身的對應檔案（例如 `docs/.vitepress/site.generated.mjs`）
2. 同步更新 `scripts/init.mjs` 裡的對應模板字串
3. 驗證：`node --check scripts/init.mjs`
4. 端對端測試：`node scripts/init.mjs --target <test-path>` 確認輸出正確
5. Commit（兩個檔案通常一起 commit，因為它們是同一個決策的兩個面）

---

## Commit 規範

- 格式：Conventional Commits，語言：zh-TW，不署名
- 判斷類型看**整體目標**，不只看技術細節：
  - 新功能（即使過程有 bug fix）→ `feat:`
  - 修正已存在功能的問題 → `fix:`
  - 文件 → `docs:`
  - 重構（不改行為）→ `refactor:`
- 必須 atomic + SRP：一個 commit 一個完整的改動單元

---

## 關鍵決策參考

| 決策 | 記錄位置 |
|---|---|
| 系統定位為 SDLC 知識圖譜 | ADR-001 |
| ULR 是語義地基，最先建立 | ADR-002 |
| Markdown + Git + YAML frontmatter | ADR-003 |
| AI 為生產者，人工為審核者 | ADR-004 |
| 自我封裝工具鏈（.doc-viewer/） | AIDR-003 |
| VitePress 選型 | TDR-2026-001 |
