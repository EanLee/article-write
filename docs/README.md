# 專案文件導航

> **最後更新**: 2026-02-02
> **版本**: 2.0
> **狀態**: 重新整理後的文件結構

---

## 📚 文件結構

```
docs/
├── README.md (本文件)
├── analysis/           # 產品分析與規劃
├── architecture/       # 系統架構設計
├── guides/             # 使用與開發指南
├── testing/            # 測試相關文件
├── planning/           # 開發規劃與路線圖
├── settings/           # 設定面板設計
├── fix-bug/            # Bug 修復報告
└── multi-role-analysis/  # 多角色系統評估
```

---

## 🎯 快速導航

### 新人入門

1. [產品規格與定位](./analysis/PRODUCT_SPEC.md) - 了解產品願景與核心功能
2. [系統架構](./architecture/ARCHITECTURE_COMPLETE.md) - 理解技術架構設計
3. [整合指南](./guides/INTEGRATION_GUIDE.md) - 核心功能整合說明

### 開發相關

- [Commit 規範](./guides/COMMIT_GUIDE.md) - Git commit 訊息格式與提交順序
- [測試指南](./testing/TESTING_GUIDE.md) - 功能測試步驟與預期結果
- [重構計劃](./planning/REFACTORING_PLAN.md) - 架構重構的階段性計劃

### Bug 修復

- [Bug Fix 規範](./fix-bug/README.md) - Bug 修復報告撰寫規範
- [已知問題清單](./analysis/POTENTIAL_ISSUES.md) - 目前已知的問題與優先級
- [Bug 修復報告](./fix-bug/) - 所有 Bug 修復的詳細記錄

### 系統評估

- [多角色分析總覽](./multi-role-analysis/README.md) - 從不同角色評估系統
- [綜合分析報告](./multi-role-analysis/COMPREHENSIVE_ANALYSIS.md) - 整合評估結果

---

## 📂 目錄詳細說明

### 1. analysis/ - 產品分析與規劃

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [PRODUCT_SPEC.md](./analysis/PRODUCT_SPEC.md) | 產品願景、核心問題、功能定位 | 所有人 |
| [AI_BLOG_WRITING_TOOL_ANALYSIS.md](./analysis/AI_BLOG_WRITING_TOOL_ANALYSIS.md) | AI 輔助寫作的定位分析、競品對比 | PM, 行銷 |
| [ANALYSIS_REPORT.md](./analysis/ANALYSIS_REPORT.md) | UI/UX 與知識管理深度分析 | 設計師, 開發者 |
| [POTENTIAL_ISSUES.md](./analysis/POTENTIAL_ISSUES.md) | 已知問題清單、優先級分類 | 開發者, QA |

### 2. architecture/ - 系統架構設計

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [ARCHITECTURE_COMPLETE.md](./architecture/ARCHITECTURE_COMPLETE.md) | **完整架構文件**（理想設計 + 現狀問題 + 重構路線圖） | 技術主管, 架構師 |
| [ARCHITECTURE_REFACTOR.md](./architecture/ARCHITECTURE_REFACTOR.md) | 重構方案設計 | 開發者 |
| [SOLID_ANALYSIS.md](./architecture/SOLID_ANALYSIS.md) | SOLID 原則分析 | 開發者 |

> **注意**: ARCHITECTURE.md 和 ARCHITECTURE_ANALYSIS.md 已合併至 ARCHITECTURE_COMPLETE.md

### 3. guides/ - 使用與開發指南

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [INTEGRATION_GUIDE.md](./guides/INTEGRATION_GUIDE.md) | 核心功能整合說明 | 開發者 |
| [COMMIT_GUIDE.md](./guides/COMMIT_GUIDE.md) | Commit 訊息建議與提交順序 | 開發者 |
| [ARTICLE_TREE_USAGE.md](./guides/ARTICLE_TREE_USAGE.md) | IDE 風格文章列表使用指南 | 使用者 |

### 4. testing/ - 測試相關文件

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [TESTING_GUIDE.md](./testing/TESTING_GUIDE.md) | 功能測試步驟、預期結果 | QA, 開發者 |
| [AUTOMATED_TESTING_GUIDE.md](./testing/AUTOMATED_TESTING_GUIDE.md) | 自動化測試指南 | 開發者 |
| [MANUAL_TESTING_GUIDE.md](./testing/MANUAL_TESTING_GUIDE.md) | 手動測試流程 | QA |
| [PERFORMANCE_CODE_REVIEW.md](./testing/PERFORMANCE_CODE_REVIEW.md) | 性能與程式碼品質審查 | 開發者 |

### 5. planning/ - 開發規劃與路線圖

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [REFACTORING_PLAN.md](./planning/REFACTORING_PLAN.md) | 服務層重構計劃、進度追蹤 | 技術主管 |
| [REFACTOR_CHECKLIST.md](./planning/REFACTOR_CHECKLIST.md) | 重構任務清單 | 開發者 |
| [CORRECT_PRIORITY_ROADMAP.md](./planning/CORRECT_PRIORITY_ROADMAP.md) | 優先級路線圖 | PM, 技術主管 |
| [PHASE_0_GAP_ANALYSIS.md](./planning/PHASE_0_GAP_ANALYSIS.md) | Phase 0 差異分析 | PM |

### 6. settings/ - 設定面板設計

| 文件 | 說明 | 適合對象 |
|------|------|---------|
| [SETTINGS_COMPLETE.md](./settings/SETTINGS_COMPLETE.md) | **完整設定面板文件**（設計目標 + 改版對比 + 實作細節） | 設計師, 開發者 |
| [SETTINGS_QUICK_REFERENCE.md](./settings/SETTINGS_QUICK_REFERENCE.md) | 設定面板結構快速導覽 | 所有人 |
| [UI_COMPARISON.md](./settings/UI_COMPARISON.md) | UI 設計對比分析 | 設計師 |

> **注意**: SETTINGS_COMPARISON.md 和 SETTINGS_REDESIGN.md 已合併至 SETTINGS_COMPLETE.md

### 7. fix-bug/ - Bug 修復報告

所有 Bug 修復都記錄在此目錄，使用日期命名：`YYYY-MM-DD-問題描述.md`

- [README.md](./fix-bug/README.md) - Bug Fix 報告撰寫規範
- [Bug 修復報告列表](./fix-bug/) - 依日期排序的修復記錄

### 8. multi-role-analysis/ - 多角色系統評估

從不同角色的視角全面評估系統：

| 文件 | 角色 | 評估重點 |
|------|------|---------|
| [product-manager.md](./multi-role-analysis/product-manager.md) | 產品經理 | 產品定位、用戶需求、功能規劃 |
| [marketing.md](./multi-role-analysis/marketing.md) | 行銷專員 | 市場定位、目標受眾、推廣策略 |
| [end-user.md](./multi-role-analysis/end-user.md) | 一般使用者 | 使用體驗、學習曲線、實際應用 |
| [operations.md](./multi-role-analysis/operations.md) | 維運人員 | 部署、監控、維護、穩定性 |
| [cto.md](./multi-role-analysis/cto.md) | 技術長 | 技術架構、技術債、長期發展 |
| [COMPREHENSIVE_ANALYSIS.md](./multi-role-analysis/COMPREHENSIVE_ANALYSIS.md) | 綜合報告 | 整合所有角色的評估結果 |

---

## 🔍 依場景查找文件

### 場景 1: 我想了解這個專案是什麼

1. 閱讀 [PRODUCT_SPEC.md](./analysis/PRODUCT_SPEC.md)
2. 閱讀 [AI_BLOG_WRITING_TOOL_ANALYSIS.md](./analysis/AI_BLOG_WRITING_TOOL_ANALYSIS.md)

### 場景 2: 我要開始開發新功能

1. 理解架構：[ARCHITECTURE_COMPLETE.md](./architecture/ARCHITECTURE_COMPLETE.md)
2. 了解整合方式：[INTEGRATION_GUIDE.md](./guides/INTEGRATION_GUIDE.md)
3. 學習 Commit 規範：[COMMIT_GUIDE.md](./guides/COMMIT_GUIDE.md)

### 場景 3: 我遇到了 Bug

1. 查看 [POTENTIAL_ISSUES.md](./analysis/POTENTIAL_ISSUES.md) 是否已知
2. 查看 [fix-bug/](./fix-bug/) 是否有相似問題的修復記錄
3. 參考 [fix-bug/README.md](./fix-bug/README.md) 撰寫 Bug Fix 報告

### 場景 4: 我要進行架構重構

1. 閱讀 [ARCHITECTURE_COMPLETE.md](./architecture/ARCHITECTURE_COMPLETE.md)  的「現狀問題分析」和「重構路線圖」
2. 參考 [REFACTORING_PLAN.md](./planning/REFACTORING_PLAN.md)
3. 檢視 [SOLID_ANALYSIS.md](./architecture/SOLID_ANALYSIS.md)

### 場景 5: 我要設計或修改 UI

1. 了解產品定位：[PRODUCT_SPEC.md](./analysis/PRODUCT_SPEC.md)
2. 參考設定面板設計：[SETTINGS_COMPLETE.md](./settings/SETTINGS_COMPLETE.md)
3. 查看 UI 對比分析：[UI_COMPARISON.md](./settings/UI_COMPARISON.md)

---

## 📝 文件維護

### 文件版本

- **v1.0** (2026-01-26): 初始文件結構
- **v2.0** (2026-02-02): 重新整理，合併重複文件，新增多角色評估

### 已合併的文件

為了提高可維護性，以下文件已被合併：

| 原文件 | 合併至 | 原因 |
|--------|--------|------|
| ARCHITECTURE.md | ARCHITECTURE_COMPLETE.md | 內容高度相關，分散不利閱讀 |
| ARCHITECTURE_ANALYSIS.md | ARCHITECTURE_COMPLETE.md | 內容高度相關，分散不利閱讀 |
| SETTINGS_COMPARISON.md | SETTINGS_COMPLETE.md | 內容高度相關，分散不利閱讀 |
| SETTINGS_REDESIGN.md | SETTINGS_COMPLETE.md | 內容高度相關，分散不利閱讀 |

### 文件撰寫規範

1. 所有文件使用 Markdown 格式
2. 標題使用繁體中文
3. 程式碼範例使用英文註解
4. 每個文件開頭包含：版本號、更新日期、狀態
5. Bug Fix 報告使用 `YYYY-MM-DD-問題描述.md` 命名格式

---

## 🤝 貢獻指南

### 新增文件

1. 確定文件歸屬的目錄
2. 使用清楚的檔名
3. 在文件開頭標註版本和日期
4. 更新本 README.md 的相關章節

### 更新文件

1. 更新文件內的「最後更新」日期
2. 如果是重大變更，更新版本號
3. 如有必要，更新本 README.md

### 回報問題

如發現文件有誤或需要補充，請：
1. 建立 Issue 說明問題
2. 或直接提交 PR 修正

---

**維護者**: Claude AI
**專案**: R (Markdown Blog Writing Tool)
**文件庫位置**: `docs/`
