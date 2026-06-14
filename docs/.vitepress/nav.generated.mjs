// 本檔案由 `node scripts/generate-nav.mjs` 自動產生，請勿手動編輯。
// 新增、搬移或刪除 docs/ 下的文件後，重新執行該腳本即可同步 nav/sidebar。

export const nav = [
  {
    "text": "首頁",
    "link": "/"
  },
  {
    "text": "治理與規範",
    "link": "/conventions/dev-standards/2026-06-14-ai-assisted-development-token-optimization"
  },
  {
    "text": "交付計畫",
    "link": "/delivery/discussions/topic-002-2026-02-06-progress-review-week2/action-items-adjusted"
  },
  {
    "text": "工程決策",
    "link": "/engineering/adr/ADR-0001-codemirror6-editor-migration"
  },
  {
    "text": "維運手冊",
    "link": "/operations/SENTRY_SETUP"
  },
  {
    "text": "產品需求",
    "link": "/product/business/AI_BLOG_WRITING_TOOL_ANALYSIS"
  },
  {
    "text": "品質管理",
    "link": "/quality/assessments/fix-bug/2026-01-26-article-category-mapping"
  },
  {
    "text": "參考資料",
    "link": "/reference/dev-notes/GOTCHAS"
  }
]

export const sidebar = [
  {
    "text": "治理與規範",
    "items": [
      {
        "text": "開發規範",
        "items": [
          {
            "text": "AI 輔助開發 Token 優化方案",
            "link": "/conventions/dev-standards/2026-06-14-ai-assisted-development-token-optimization"
          },
          {
            "text": "程式碼風格與型別規範",
            "link": "/conventions/dev-standards/GUIDELINE-2026-06-13-code-style"
          },
          {
            "text": "Commit 規範與 Git Hooks",
            "link": "/conventions/dev-standards/GUIDELINE-2026-06-13-commit-conventions"
          },
          {
            "text": "Git Flow 與分支管理規範",
            "link": "/conventions/dev-standards/GUIDELINE-2026-06-13-git-branching"
          }
        ],
        "collapsed": true
      },
      {
        "text": "文件治理紀錄",
        "items": [
          {
            "text": "T-020 執行期間的文件分類與 doc-viewer 優化回饋",
            "link": "/conventions/docs-governance/2026-06-13-t020-doc-classification-feedback"
          },
          {
            "text": "文件維護與調整工作流 (Doc Maintenance Workflow)",
            "link": "/conventions/docs-governance/2026-06-14-doc-maintenance-workflow"
          },
          {
            "text": "文件分類定義原則 (Docs Classification Logic)",
            "link": "/conventions/docs-governance/2026-06-14-docs-classification-logic"
          },
          {
            "text": "doc-viewer docs-governance 文件分類落差分析與改進建議",
            "link": "/conventions/docs-governance/T-017-doc-viewer-docs-governance-gap-analysis"
          },
          {
            "text": "文件治理：戰略面與工程技術面分類規劃",
            "link": "/conventions/docs-governance/T-018-docs-reorganization-plan"
          },
          {
            "text": "文件治理遷移報告：T-018 Phase 2-5 執行結果",
            "link": "/conventions/docs-governance/T-019-docs-governance-migration-report"
          }
        ],
        "collapsed": true
      },
      {
        "text": "決策治理",
        "items": [
          {
            "text": ".template",
            "items": [
              {
                "text": "決策記錄：[議題標題]",
                "link": "/conventions/governance/.template/decision"
              },
              {
                "text": "[議題標題]",
                "link": "/conventions/governance/.template/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "角色卡",
            "items": [
              {
                "text": "圓桌會議角色卡 - 角色對比總結",
                "link": "/conventions/governance/character-cards/COMPARISON"
              },
              {
                "text": "圓桌會議角色卡",
                "link": "/conventions/governance/character-cards/INDEX"
              },
              {
                "text": "🎯 Alex Chen - 產品經理 (PM)",
                "link": "/conventions/governance/character-cards/alex-chen-pm"
              },
              {
                "text": "🔍 Casey Lin - SEO 專家 (SEO Specialist)",
                "link": "/conventions/governance/character-cards/casey-lin-seo"
              },
              {
                "text": "👤 Jordan Lee - 一般使用者 (User)",
                "link": "/conventions/governance/character-cards/jordan-lee-user"
              },
              {
                "text": "📢 Lisa Wang - 行銷專員 (Marketing)",
                "link": "/conventions/governance/character-cards/lisa-wang-marketing"
              },
              {
                "text": "📚 Morgan Chen - 學習者 (Learner)",
                "link": "/conventions/governance/character-cards/morgan-chen-learner"
              },
              {
                "text": "🔧 Sam Liu - 維運人員 (Ops)",
                "link": "/conventions/governance/character-cards/sam-liu-ops"
              },
              {
                "text": "💻 Taylor Wu - 技術長 (CTO)",
                "link": "/conventions/governance/character-cards/taylor-wu-cto"
              }
            ],
            "collapsed": true
          },
          {
            "text": "技術審查檢查清單",
            "link": "/conventions/governance/review-checklist"
          },
          {
            "text": "圓桌會議運作規則",
            "link": "/conventions/governance/roundtable-rules"
          },
          {
            "text": "WriteFlow 技術團隊",
            "link": "/conventions/governance/team-composition"
          }
        ],
        "collapsed": true
      },
      {
        "text": "跨目錄文件索引（依 Domain）",
        "link": "/conventions/INDEX-by-domain"
      },
      {
        "text": "圓桌會議討論記錄",
        "link": "/conventions/ROUNDTABLE-DISCUSSIONS-INDEX"
      }
    ],
    "collapsed": true
  },
  {
    "text": "交付計畫",
    "items": [
      {
        "text": "AI 開發討論",
        "items": [
          {
            "text": "topic-002-2026-02-06-progress-review-week2",
            "items": [
              {
                "text": "WriteFlow MVP 行動項目清單（調整版）",
                "link": "/delivery/discussions/topic-002-2026-02-06-progress-review-week2/action-items-adjusted"
              },
              {
                "text": "WriteFlow MVP 緊急衝刺行動項目清單",
                "link": "/delivery/discussions/topic-002-2026-02-06-progress-review-week2/action-items"
              },
              {
                "text": "第二週進度回顧",
                "link": "/delivery/discussions/topic-002-2026-02-06-progress-review-week2/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-003-2026-02-06-emergency-progress-review",
            "items": [
              {
                "text": "緊急進度回顧",
                "link": "/delivery/discussions/topic-003-2026-02-06-emergency-progress-review/decision"
              },
              {
                "text": "WriteFlow 專案緊急圓桌會議 - 進度檢討與方向修正",
                "link": "/delivery/discussions/topic-003-2026-02-06-emergency-progress-review/discussion"
              },
              {
                "text": "WriteFlow 專案進度與落差分析圓桌會議",
                "link": "/delivery/discussions/topic-003-2026-02-06-emergency-progress-review/progress-gap-review"
              },
              {
                "text": "WriteFlow 團隊承諾書",
                "link": "/delivery/discussions/topic-003-2026-02-06-emergency-progress-review/team-commitment"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-005-2026-02-13-week3-progress-review",
            "items": [
              {
                "text": "第三週進度回顧",
                "link": "/delivery/discussions/topic-005-2026-02-13-week3-progress-review/decision"
              },
              {
                "text": "WriteFlow 圓桌會議 - Week 3 進度回報與方向修正",
                "link": "/delivery/discussions/topic-005-2026-02-13-week3-progress-review/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-008-2026-02-14-sprint-retro",
            "items": [
              {
                "text": "Sprint Retro",
                "link": "/delivery/discussions/topic-008-2026-02-14-sprint-retro/decision"
              },
              {
                "text": "WriteFlow 圓桌會議 #008 — Sprint Retrospective",
                "link": "/delivery/discussions/topic-008-2026-02-14-sprint-retro/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-011-2026-02-14-quality-sprint-planning",
            "items": [
              {
                "text": "品質衝刺規劃",
                "link": "/delivery/discussions/topic-011-2026-02-14-quality-sprint-planning/decision"
              },
              {
                "text": "圓桌會議 #011：v0.2 Sprint 方向決策",
                "link": "/delivery/discussions/topic-011-2026-02-14-quality-sprint-planning/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-022-2026-02-28-progress-review",
            "items": [
              {
                "text": "進度回顧（原編號 topic-012，已重新編號）",
                "link": "/delivery/discussions/topic-022-2026-02-28-progress-review/decision"
              },
              {
                "text": "圓桌會議 #012：v0.2 品質 Sprint 進度審查與 v0.3 方向決策",
                "link": "/delivery/discussions/topic-022-2026-02-28-progress-review/discussion"
              }
            ],
            "collapsed": true
          }
        ],
        "collapsed": true
      },
      {
        "text": "計畫",
        "items": [
          {
            "text": "progress",
            "items": [
              {
                "text": "weekly",
                "items": [
                  {
                    "text": "Week X 週檢查點 - YYYY-MM-DD",
                    "link": "/delivery/plans/progress/weekly/template"
                  }
                ],
                "collapsed": true
              },
              {
                "text": "Week 1 進度報告",
                "link": "/delivery/plans/progress/2026-02-04-week-1-summary"
              },
              {
                "text": "Week 2 Day 1 進度報告",
                "link": "/delivery/plans/progress/2026-02-04-week-2-day-1"
              },
              {
                "text": "Week 2 Day 2 完成報告",
                "link": "/delivery/plans/progress/2026-02-04-week-2-day-2"
              },
              {
                "text": "Week 2 Day 3 進度報告",
                "link": "/delivery/plans/progress/2026-02-05-week-2-day-3"
              },
              {
                "text": "Week 2 Day 4 最終報告 - UI/UX 優化完成",
                "link": "/delivery/plans/progress/2026-02-05-week-2-day-4-final"
              },
              {
                "text": "Week 2 Day 4 進度報告",
                "link": "/delivery/plans/progress/2026-02-05-week-2-day-4"
              },
              {
                "text": "Week 2 Day 5 (緊急衝刺啟動) - 進度報告",
                "link": "/delivery/plans/progress/2026-02-06-emergency-sprint-start"
              }
            ],
            "collapsed": true
          },
          {
            "text": "Full-Text Search Implementation Plan",
            "link": "/delivery/plans/2026-02-16-full-text-search"
          },
          {
            "text": "正確的開發優先級路線圖",
            "link": "/delivery/plans/CORRECT_PRIORITY_ROADMAP"
          },
          {
            "text": "WriteFlow MVP 功能狀態",
            "link": "/delivery/plans/MVP_STATUS"
          },
          {
            "text": "P0 範圍調整決策：移除 Git 自動化",
            "link": "/delivery/plans/P0_SCOPE_ADJUSTMENT"
          },
          {
            "text": "WriteFlow 進度追蹤機制",
            "link": "/delivery/plans/PROGRESS_TRACKING"
          },
          {
            "text": "分類功能分支開發回顧",
            "link": "/delivery/plans/RETRO-001-category-feature-branching"
          },
          {
            "text": "Sprint 3 實作規劃",
            "link": "/delivery/plans/T-013-sprint3-implementation-planning"
          }
        ],
        "collapsed": true
      }
    ],
    "collapsed": true
  },
  {
    "text": "工程決策",
    "items": [
      {
        "text": "架構決策（ADR）",
        "items": [
          {
            "text": "ADR-0001：以 CodeMirror 6 取代原生 textarea 編輯器",
            "link": "/engineering/adr/ADR-0001-codemirror6-editor-migration"
          }
        ],
        "collapsed": true
      },
      {
        "text": "analysis",
        "items": [
          {
            "text": "系統架構完整文件",
            "link": "/engineering/analysis/ARCHITECTURE_COMPLETE"
          },
          {
            "text": "架構重構進度報告",
            "link": "/engineering/analysis/ARCHITECTURE_REFACTOR"
          },
          {
            "text": "Service 層 SOLID 原則分析報告",
            "link": "/engineering/analysis/SOLID_ANALYSIS"
          },
          {
            "text": "已封存文件",
            "items": [
              {
                "text": "架構設計文件",
                "link": "/engineering/analysis/ARCHITECTURE"
              },
              {
                "text": "檔案服務架構分析 - 過度設計問題",
                "link": "/engineering/analysis/ARCHITECTURE_ANALYSIS"
              }
            ],
            "collapsed": true
          }
        ],
        "collapsed": true
      },
      {
        "text": "AI 開發討論",
        "items": [
          {
            "text": "topic-006-2026-02-14-publish-mechanism",
            "items": [
              {
                "text": "發布機制架構決策",
                "link": "/engineering/discussions/topic-006-2026-02-14-publish-mechanism/decision"
              },
              {
                "text": "WriteFlow 圓桌會議 #006 — 發布機制落差確認",
                "link": "/engineering/discussions/topic-006-2026-02-14-publish-mechanism/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-007-2026-02-14-frontmatter-date-fields",
            "items": [
              {
                "text": "Frontmatter 日期欄位設計",
                "link": "/engineering/discussions/topic-007-2026-02-14-frontmatter-date-fields/decision"
              },
              {
                "text": "圓桌會議 #007：Frontmatter 時間欄位命名與語意釐清",
                "link": "/engineering/discussions/topic-007-2026-02-14-frontmatter-date-fields/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-012-2026-02-16-auto-update",
            "items": [
              {
                "text": "自動更新機制",
                "link": "/engineering/discussions/topic-012-2026-02-16-auto-update/decision"
              },
              {
                "text": "線上自動更新機制評估",
                "link": "/engineering/discussions/topic-012-2026-02-16-auto-update/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-014-2026-02-16-ai-api-integration",
            "items": [
              {
                "text": "AI API 整合架構",
                "link": "/engineering/discussions/topic-014-2026-02-16-ai-api-integration/decision"
              },
              {
                "text": "討論記錄：AI API 串接評估",
                "link": "/engineering/discussions/topic-014-2026-02-16-ai-api-integration/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-015-2026-02-16-ai-panel-design",
            "items": [
              {
                "text": "AI 面板設計",
                "link": "/engineering/discussions/topic-015-2026-02-16-ai-panel-design/decision"
              },
              {
                "text": "topic-015 AI Panel 設計討論",
                "link": "/engineering/discussions/topic-015-2026-02-16-ai-panel-design/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-019-2026-03-07-autosave-on-switch-behavior",
            "items": [
              {
                "text": "Autosave 切換行為（待排程）",
                "link": "/engineering/discussions/topic-019-2026-03-07-autosave-on-switch-behavior/PENDING"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-020-2026-06-13-save-race-data-overwrite",
            "items": [
              {
                "text": "topic-020｜儲存競態：自動儲存以舊快照覆寫磁碟",
                "link": "/engineering/discussions/topic-020-2026-06-13-save-race-data-overwrite/PENDING"
              },
              {
                "text": "儲存機制整體設計（合併解決 topic-019）",
                "link": "/engineering/discussions/topic-020-2026-06-13-save-race-data-overwrite/decision"
              },
              {
                "text": "儲存機制整體設計（合併 topic-019）",
                "link": "/engineering/discussions/topic-020-2026-06-13-save-race-data-overwrite/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-021-2026-06-13-articlelisttree-reactivity",
            "items": [
              {
                "text": "ArticleListTree 在完整 E2E 套件中無法顯示新偵測文章（待排程）",
                "link": "/engineering/discussions/topic-021-2026-06-13-articlelisttree-reactivity/PENDING"
              }
            ],
            "collapsed": true
          },
          {
            "text": "CodeMirror 6 整合 Spike 計畫",
            "link": "/engineering/discussions/2026-02-14-codemirror6-spike-plan"
          },
          {
            "text": "技術評估：編輯器 UX 升級選型",
            "link": "/engineering/discussions/2026-02-14-editor-ux-tech-eval"
          },
          {
            "text": "發布流程重構",
            "link": "/engineering/discussions/T-001-publish-refactor"
          },
          {
            "text": "自動儲存機制（TDR）",
            "link": "/engineering/discussions/T-002-autosave-mechanism"
          },
          {
            "text": "Changelog 自動化",
            "link": "/engineering/discussions/T-004-changelog-automation"
          },
          {
            "text": "Metadata 快取設計（TDR）",
            "link": "/engineering/discussions/T-005-metadata-cache-design"
          },
          {
            "text": "分類型別重構",
            "link": "/engineering/discussions/T-006-category-type-refactor"
          },
          {
            "text": "Electron 自動更新（electron-updater）",
            "link": "/engineering/discussions/T-008-auto-update-electron-updater"
          },
          {
            "text": "全文搜尋設計（TDR）",
            "link": "/engineering/discussions/T-009-full-text-search-design"
          },
          {
            "text": "AI Service 架構",
            "link": "/engineering/discussions/T-010-ai-service-architecture"
          },
          {
            "text": "AI 面板 Phase 2-3 Prompt 設計",
            "link": "/engineering/discussions/T-012-ai-panel-phase2-3-prompt-design"
          },
          {
            "text": "AI Service 設計",
            "link": "/engineering/discussions/T-015-ai-service-design"
          },
          {
            "text": "Phase 2 Token 成本評估",
            "link": "/engineering/discussions/T-016-phase2-token-cost-evaluation"
          }
        ],
        "collapsed": true
      },
      {
        "text": "playbooks",
        "items": [
          {
            "text": "E2E 測試指南（Electron + Playwright）",
            "link": "/engineering/playbooks/e2e-testing-guide"
          }
        ],
        "collapsed": true
      },
      {
        "text": "重構檢查清單",
        "link": "/engineering/2026-02-02-refactor-checklist"
      },
      {
        "text": "服務層重構計劃",
        "link": "/engineering/2026-02-02-refactoring-plan"
      },
      {
        "text": "端到端發布流程文件",
        "link": "/engineering/E2E_PUBLISH_FLOW"
      },
      {
        "text": "核心功能整合指南",
        "link": "/engineering/INTEGRATION_GUIDE"
      },
      {
        "text": "WriteFlow 發布哲學與設計決策",
        "link": "/engineering/PUBLISH_DESIGN"
      },
      {
        "text": "中文 Slug 處理評估報告",
        "link": "/engineering/chinese-slug-evaluation"
      }
    ],
    "collapsed": true
  },
  {
    "text": "維運手冊",
    "items": [
      {
        "text": "Sentry 錯誤追蹤設定指南",
        "link": "/operations/SENTRY_SETUP"
      },
      {
        "text": "GitHub Actions CI/CD",
        "link": "/operations/T-003-github-actions-cicd"
      }
    ],
    "collapsed": true
  },
  {
    "text": "產品需求",
    "items": [
      {
        "text": "business",
        "items": [
          {
            "text": "AI 輔助部落格寫作工具 - 專業分析報告",
            "link": "/product/business/AI_BLOG_WRITING_TOOL_ANALYSIS"
          },
          {
            "text": "WriteFlow MVP 範圍定義",
            "link": "/product/business/MVP_SCOPE"
          },
          {
            "text": "產品規劃文件",
            "link": "/product/business/PRODUCT_SPEC"
          },
          {
            "text": "設定面板完整文件",
            "link": "/product/business/SETTINGS_COMPLETE"
          },
          {
            "text": "設定面板快速參考",
            "link": "/product/business/SETTINGS_QUICK_REFERENCE"
          },
          {
            "text": "文章列表 UI 改版對比",
            "link": "/product/business/UI_COMPARISON"
          },
          {
            "text": "已封存文件",
            "items": [
              {
                "text": "設定面板改版對比",
                "link": "/product/business/SETTINGS_COMPARISON"
              },
              {
                "text": "設定面板 UI/UX 重新設計",
                "link": "/product/business/SETTINGS_REDESIGN"
              }
            ],
            "collapsed": true
          }
        ],
        "collapsed": true
      },
      {
        "text": "AI 開發討論",
        "items": [
          {
            "text": "topic-001-2026-02-03-product-launch-strategy",
            "items": [
              {
                "text": "項目清單與分工：WriteFlow 產品推出",
                "link": "/product/discussions/topic-001-2026-02-03-product-launch-strategy/action-items"
              },
              {
                "text": "產品上市策略",
                "link": "/product/discussions/topic-001-2026-02-03-product-launch-strategy/decision"
              },
              {
                "text": "議題一：產品推出策略與規劃",
                "link": "/product/discussions/topic-001-2026-02-03-product-launch-strategy/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-004-2026-02-12-reality-reset",
            "items": [
              {
                "text": "Reality Reset（戰略方向重置）",
                "link": "/product/discussions/topic-004-2026-02-12-reality-reset/decision"
              },
              {
                "text": "WriteFlow 專案圓桌會議 - 現實重組與計畫調整",
                "link": "/product/discussions/topic-004-2026-02-12-reality-reset/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-009-2026-02-14-ux-review",
            "items": [
              {
                "text": "UX Review",
                "link": "/product/discussions/topic-009-2026-02-14-ux-review/decision"
              },
              {
                "text": "WriteFlow 圓桌會議 #009 — 編輯器 UX 體驗問題",
                "link": "/product/discussions/topic-009-2026-02-14-ux-review/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-010-2026-02-14-editor-ux-decision",
            "items": [
              {
                "text": "編輯器 UX 決策",
                "link": "/product/discussions/topic-010-2026-02-14-editor-ux-decision/decision"
              },
              {
                "text": "圓桌會議 #010：Editor UX 改善決策",
                "link": "/product/discussions/topic-010-2026-02-14-editor-ux-decision/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-013-2026-02-16-next-sprint-direction",
            "items": [
              {
                "text": "下一階段 Sprint 方向",
                "link": "/product/discussions/topic-013-2026-02-16-next-sprint-direction/decision"
              },
              {
                "text": "v0.2 後半 Sprint 方向決策",
                "link": "/product/discussions/topic-013-2026-02-16-next-sprint-direction/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-016-2026-02-27-blog-content-analysis",
            "items": [
              {
                "text": "部落格文章內容品質分析（SEO/行銷/學習者）",
                "link": "/product/discussions/topic-016-2026-02-27-blog-content-analysis/decision"
              },
              {
                "text": "topic-016 部落格文章內容品質分析：SEO / 行銷 / 學習者三角度",
                "link": "/product/discussions/topic-016-2026-02-27-blog-content-analysis/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-017-2026-02-27-feature-direction-integration",
            "items": [
              {
                "text": "整合 AI 規格與後續 Sprint 功能走向",
                "link": "/product/discussions/topic-017-2026-02-27-feature-direction-integration/decision"
              },
              {
                "text": "topic-017 整合 AI 規格與後續 Sprint 功能走向",
                "link": "/product/discussions/topic-017-2026-02-27-feature-direction-integration/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-018-2026-03-03-market-direction-progress-check",
            "items": [
              {
                "text": "市場方向進度檢視",
                "link": "/product/discussions/topic-018-2026-03-03-market-direction-progress-check/decision"
              },
              {
                "text": "topic-018 討論記錄：市場方向與進度對焦",
                "link": "/product/discussions/topic-018-2026-03-03-market-direction-progress-check/discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "設定面板 UX 評估",
            "link": "/product/discussions/T-011-settings-panel-ux-review"
          },
          {
            "text": "表單設計系統",
            "link": "/product/discussions/UX-001-form-design-system"
          },
          {
            "text": "Jordan Lee 使用心得回饋",
            "link": "/product/discussions/jordan-user-feedback-2026-02-28"
          }
        ],
        "collapsed": true
      }
    ],
    "collapsed": true
  },
  {
    "text": "品質管理",
    "items": [
      {
        "text": "品質評估報告",
        "items": [
          {
            "text": "fix-bug",
            "items": [
              {
                "text": "文章分類映射錯誤 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-01-26-article-category-mapping"
              },
              {
                "text": "文章列表問題修復報告",
                "link": "/quality/assessments/fix-bug/2026-01-26-article-list-issues-fix"
              },
              {
                "text": "文章列表問題根本原因分析",
                "link": "/quality/assessments/fix-bug/2026-01-26-article-list-issues-root-cause"
              },
              {
                "text": "文章列表選擇後亂跳 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-01-26-article-list-jump"
              },
              {
                "text": "文章列表排序導致亂跳 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-01-26-article-list-sorting"
              },
              {
                "text": "自動儲存誤判問題分析報告",
                "link": "/quality/assessments/fix-bug/2026-01-26-autosave-false-positive"
              },
              {
                "text": "編輯器行號顯示異常 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-01-26-editor-line-numbers"
              },
              {
                "text": "防止檔案監聽重複 Reload Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-01-26-prevent-file-watch-redundant-reload"
              },
              {
                "text": "AutoSave 開啟文件誤觸儲存 Bug 報告",
                "link": "/quality/assessments/fix-bug/2026-02-14-autosave-false-positive-on-open"
              },
              {
                "text": "Preview CSS 樣式問題報告",
                "link": "/quality/assessments/fix-bug/2026-02-14-preview-css-issues"
              },
              {
                "text": "CI pnpm 版本衝突 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-02-15-ci-pnpm-version-conflict"
              },
              {
                "text": "CI E2E 測試問題排除完整指南",
                "link": "/quality/assessments/fix-bug/2026-02-24-ci-e2e-tests-troubleshooting-guide"
              },
              {
                "text": "SearchService 路徑正規化 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-02-27-search-service-path-normalization"
              },
              {
                "text": "A6-01 修正：reloadArticle 欄位不一致問題",
                "link": "/quality/assessments/fix-bug/2026-03-01-a6-reload-article-consistency"
              },
              {
                "text": "P6-05 修正：ImageService 批量 IPC 查詢效能問題",
                "link": "/quality/assessments/fix-bug/2026-03-01-p6-image-validation-batch"
              },
              {
                "text": "Fix: QUAL6-01 + QUAL6-07 — ProcessService 硬編碼問題",
                "link": "/quality/assessments/fix-bug/2026-03-01-qual6-01-07-process-service"
              },
              {
                "text": "Fix: QUAL6-02 + QUAL6-09 — ProcessService 競態條件與停止等待",
                "link": "/quality/assessments/fix-bug/2026-03-01-qual6-02-09-process-service-race"
              },
              {
                "text": "Fix: QUAL6-03 — autoDownload 改為使用者確認",
                "link": "/quality/assessments/fix-bug/2026-03-01-qual6-03-auto-download"
              },
              {
                "text": "S6-02 修正：ConfigService safeStorage fail-close",
                "link": "/quality/assessments/fix-bug/2026-03-01-s6-config-safe-storage-fail-close"
              },
              {
                "text": "S6-03/04 修正：FileService 路徑白名單漏洞",
                "link": "/quality/assessments/fix-bug/2026-03-01-s6-path-whitelist-gaps"
              },
              {
                "text": "第二次技術評估修正記錄",
                "link": "/quality/assessments/fix-bug/2026-03-01-second-review-fixes"
              },
              {
                "text": "Fix: TOKEN6-01/02/04/05 — AI 層安全與穩健性",
                "link": "/quality/assessments/fix-bug/2026-03-01-token6-ai-security"
              },
              {
                "text": "文章列表三項嚴重問題 Bug 報告",
                "link": "/quality/assessments/fix-bug/2026-03-07-article-list-critical-bugs"
              },
              {
                "text": "Config Schema 路徑欄位強制驗證 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-03-07-config-schema-optional-paths"
              },
              {
                "text": "Vue emitsOptions null 錯誤與 updateArticle 缺失 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-03-08-vue-emitsoptions-null-and-updatearticle-missing"
              },
              {
                "text": "文章圖片無法顯示 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-05-01-image-preview-dompurify-blocked-file-url"
              },
              {
                "text": "大綱面板初次載入為空 Bug Fix 報告",
                "link": "/quality/assessments/fix-bug/2026-06-13-outline-empty-on-load"
              },
              {
                "text": "topic-020 儲存來源單一化 — E2E 驗收期間發現的修復",
                "link": "/quality/assessments/fix-bug/2026-06-13-topic-020-e2e-acceptance-fixes"
              },
              {
                "text": "文章列表「跳到第一個」問題調查",
                "link": "/quality/assessments/fix-bug/INVESTIGATION-article-list-scroll"
              },
              {
                "text": "自動儲存誤觸發調查",
                "link": "/quality/assessments/fix-bug/INVESTIGATION-autosave-trigger"
              }
            ],
            "collapsed": true
          },
          {
            "text": "testing",
            "items": [
              {
                "text": "自動化測試指南",
                "link": "/quality/assessments/testing/AUTOMATED_TESTING_GUIDE"
              },
              {
                "text": "手動測試指南 - 文章列表跳動問題修復",
                "link": "/quality/assessments/testing/MANUAL_TESTING_GUIDE"
              },
              {
                "text": "效能與程式碼品質審查報告",
                "link": "/quality/assessments/testing/PERFORMANCE_CODE_REVIEW"
              },
              {
                "text": "功能測試核對清單 (Feature Test Checklist)",
                "link": "/quality/assessments/testing/feature-test-checklist"
              },
              {
                "text": "WriteFlow Smoke Test Checklist",
                "link": "/quality/assessments/testing/smoke-test-checklist"
              }
            ],
            "collapsed": true
          },
          {
            "text": "部落格撰寫應用程式 - UI/UX 與知識管理專家分析報告",
            "link": "/quality/assessments/ANALYSIS_REPORT"
          },
          {
            "text": "P0 功能缺口分析報告",
            "link": "/quality/assessments/P0_GAP_ANALYSIS"
          },
          {
            "text": "Phase 0 功能缺口分析",
            "link": "/quality/assessments/PHASE_0_GAP_ANALYSIS"
          },
          {
            "text": "潛在問題清單",
            "link": "/quality/assessments/POTENTIAL_ISSUES"
          }
        ],
        "collapsed": true
      },
      {
        "text": "AI 開發討論",
        "items": [
          {
            "text": "2026-03-01-fifth-review",
            "items": [
              {
                "text": "第五次全面技術評審 — 索引",
                "link": "/quality/discussions/2026-03-01-fifth-review/00-index"
              },
              {
                "text": "資安評估報告 — 第五次全面評估",
                "link": "/quality/discussions/2026-03-01-fifth-review/01-security-report"
              },
              {
                "text": "效能/O(n) 評估報告 — 第五次全面評估",
                "link": "/quality/discussions/2026-03-01-fifth-review/02-performance-report"
              },
              {
                "text": "SOLID 原則評估報告 — 第五次全面評估",
                "link": "/quality/discussions/2026-03-01-fifth-review/03-solid-report"
              },
              {
                "text": "架構設計評估報告 — 第五次全面評估",
                "link": "/quality/discussions/2026-03-01-fifth-review/04-architecture-report"
              },
              {
                "text": "程式碼品質評估報告 — 第五次全面評估",
                "link": "/quality/discussions/2026-03-01-fifth-review/05-code-quality-report"
              },
              {
                "text": "可維護性評估報告 — 第五次全面評估",
                "link": "/quality/discussions/2026-03-01-fifth-review/06-maintainability-report"
              },
              {
                "text": "跨角色技術討論 — 第五次全面評估",
                "link": "/quality/discussions/2026-03-01-fifth-review/07-cross-discussion"
              },
              {
                "text": "第五次全面評審 — 問題追蹤驗證表",
                "link": "/quality/discussions/2026-03-01-fifth-review/VERIFICATION"
              }
            ],
            "collapsed": true
          },
          {
            "text": "2026-03-01-fourth-review",
            "items": [
              {
                "text": "第四次技術評估 — 索引",
                "link": "/quality/discussions/2026-03-01-fourth-review/00-index"
              },
              {
                "text": "資安評估報告 — 第四次全面評估",
                "link": "/quality/discussions/2026-03-01-fourth-review/01-security-report"
              },
              {
                "text": "效能評估報告 — 第四次全面評估",
                "link": "/quality/discussions/2026-03-01-fourth-review/02-performance-report"
              },
              {
                "text": "SOLID 原則評估報告 — 第四次全面評估",
                "link": "/quality/discussions/2026-03-01-fourth-review/03-solid-report"
              },
              {
                "text": "架構評估報告 — 第四次全面評估",
                "link": "/quality/discussions/2026-03-01-fourth-review/04-architecture-report"
              },
              {
                "text": "程式品質評估報告 — 第四次全面評估",
                "link": "/quality/discussions/2026-03-01-fourth-review/05-code-quality-report"
              },
              {
                "text": "可維護性評估報告 — 第四次全面評估",
                "link": "/quality/discussions/2026-03-01-fourth-review/06-maintainability-report"
              },
              {
                "text": "跨角色交互討論 — 第四次全面評估",
                "link": "/quality/discussions/2026-03-01-fourth-review/07-cross-discussion"
              },
              {
                "text": "第四次技術評估 — 問題追蹤 VERIFICATION",
                "link": "/quality/discussions/2026-03-01-fourth-review/VERIFICATION"
              }
            ],
            "collapsed": true
          },
          {
            "text": "2026-03-01-second-review",
            "items": [
              {
                "text": "WriteFlow 第二次技術評估：索引",
                "link": "/quality/discussions/2026-03-01-second-review/00-index"
              },
              {
                "text": "WriteFlow 資安評估報告（第二次）",
                "link": "/quality/discussions/2026-03-01-second-review/01-security-report"
              },
              {
                "text": "WriteFlow 效能評估報告（第二次）",
                "link": "/quality/discussions/2026-03-01-second-review/02-performance-report"
              },
              {
                "text": "WriteFlow SOLID 原則評估報告（第二次）",
                "link": "/quality/discussions/2026-03-01-second-review/03-solid-report"
              },
              {
                "text": "WriteFlow 系統架構評估報告（第二次）",
                "link": "/quality/discussions/2026-03-01-second-review/04-architecture-report"
              },
              {
                "text": "WriteFlow AI Token 效率與品質評估報告（第二次）",
                "link": "/quality/discussions/2026-03-01-second-review/05-ai-token-report"
              },
              {
                "text": "WriteFlow 程式品質評估報告（第二次）",
                "link": "/quality/discussions/2026-03-01-second-review/06-code-quality-report"
              },
              {
                "text": "WriteFlow 技術圓桌討論：第二次評估交互報告",
                "link": "/quality/discussions/2026-03-01-second-review/07-cross-discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "2026-03-01-sixth-review",
            "items": [
              {
                "text": "第六次全面技術評審 — 索引",
                "link": "/quality/discussions/2026-03-01-sixth-review/00-index"
              },
              {
                "text": "資安評估報告 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/01-security-report"
              },
              {
                "text": "效能（演算法/O(n)）評估報告 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/02-performance-report"
              },
              {
                "text": "SOLID 原則評估報告 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/03-solid-report"
              },
              {
                "text": "軟體架構評估報告 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/04-architecture-report"
              },
              {
                "text": "AI Token 成本評估報告 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/05-ai-token-report"
              },
              {
                "text": "程式品質評估報告 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/06-quality-report"
              },
              {
                "text": "跨角色技術討論 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/07-cross-discussion"
              },
              {
                "text": "問題追蹤 — 第六次全面評估",
                "link": "/quality/discussions/2026-03-01-sixth-review/VERIFICATION"
              }
            ],
            "collapsed": true
          },
          {
            "text": "2026-03-01-third-review",
            "items": [
              {
                "text": "第三次全面技術評估 — 索引",
                "link": "/quality/discussions/2026-03-01-third-review/00-index"
              },
              {
                "text": "資安評估報告 — 第三次全面評估",
                "link": "/quality/discussions/2026-03-01-third-review/01-security-report"
              },
              {
                "text": "效能 / O(n) 評估報告 — 第三次全面評估",
                "link": "/quality/discussions/2026-03-01-third-review/02-performance-report"
              },
              {
                "text": "SOLID 原則評估報告 — 第三次全面評估",
                "link": "/quality/discussions/2026-03-01-third-review/03-solid-report"
              },
              {
                "text": "架構評估報告 — 第三次全面評估",
                "link": "/quality/discussions/2026-03-01-third-review/04-architecture-report"
              },
              {
                "text": "程式品質評估報告 — 第三次全面評估",
                "link": "/quality/discussions/2026-03-01-third-review/05-code-quality-report"
              },
              {
                "text": "可維護性與易讀性評估報告 — 第三次全面評估",
                "link": "/quality/discussions/2026-03-01-third-review/06-maintainability-report"
              },
              {
                "text": "交互討論記錄 — 第三次全面評估",
                "link": "/quality/discussions/2026-03-01-third-review/07-cross-discussion"
              },
              {
                "text": "修正驗證指南（VERIFICATION）",
                "link": "/quality/discussions/2026-03-01-third-review/VERIFICATION"
              }
            ],
            "collapsed": true
          },
          {
            "text": "2026-03-02-seventh-review",
            "items": [
              {
                "text": "第七次全面技術評估 — 索引",
                "link": "/quality/discussions/2026-03-02-seventh-review/00-index"
              },
              {
                "text": "資安評估報告 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/01-security-report"
              },
              {
                "text": "效能 / O(n) 評估報告 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/02-performance-report"
              },
              {
                "text": "SOLID 原則評估報告 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/03-solid-report"
              },
              {
                "text": "架構評估報告 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/04-architecture-report"
              },
              {
                "text": "AI Token 評估報告 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/05-ai-token-report"
              },
              {
                "text": "程式品質評估報告 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/06-quality-report"
              },
              {
                "text": "跨職能交互討論記錄 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/07-cross-discussion"
              },
              {
                "text": "問題追蹤 — 第七次全面評估",
                "link": "/quality/discussions/2026-03-02-seventh-review/VERIFICATION"
              }
            ],
            "collapsed": true
          },
          {
            "text": "20260228-第一次全面分析",
            "items": [
              {
                "text": "WriteFlow 資安評估報告",
                "link": "/quality/discussions/20260228-第一次全面分析/01-security-assessment"
              },
              {
                "text": "WriteFlow 效能與演算法複雜度評估報告",
                "link": "/quality/discussions/20260228-第一次全面分析/02-performance-assessment"
              },
              {
                "text": "WriteFlow SOLID 原則評估報告",
                "link": "/quality/discussions/20260228-第一次全面分析/03-solid-assessment"
              },
              {
                "text": "WriteFlow 系統架構評估報告",
                "link": "/quality/discussions/20260228-第一次全面分析/04-architecture-assessment"
              },
              {
                "text": "WriteFlow AI Token 效率評估報告",
                "link": "/quality/discussions/20260228-第一次全面分析/05-ai-token-assessment"
              },
              {
                "text": "WriteFlow 程式品質評估報告",
                "link": "/quality/discussions/20260228-第一次全面分析/06-code-quality-assessment"
              },
              {
                "text": "第一次全面分析 — 圓桌討論",
                "link": "/quality/discussions/20260228-第一次全面分析/07-roundtable-discussion"
              }
            ],
            "collapsed": true
          },
          {
            "text": "topic-000-2026-02-02-initial-system-evaluation",
            "items": [
              {
                "text": "初始系統評估（多角色基準評估）",
                "link": "/quality/discussions/topic-000-2026-02-02-initial-system-evaluation/decision"
              },
              {
                "text": "產品圓桌會議記錄",
                "link": "/quality/discussions/topic-000-2026-02-02-initial-system-evaluation/discussion"
              },
              {
                "text": "技術長視角：系統評估報告",
                "link": "/quality/discussions/topic-000-2026-02-02-initial-system-evaluation/role-cto"
              },
              {
                "text": "一般使用者視角：系統評估報告",
                "link": "/quality/discussions/topic-000-2026-02-02-initial-system-evaluation/role-end-user"
              },
              {
                "text": "行銷專員視角：系統評估報告",
                "link": "/quality/discussions/topic-000-2026-02-02-initial-system-evaluation/role-marketing"
              },
              {
                "text": "維運人員視角：系統評估報告",
                "link": "/quality/discussions/topic-000-2026-02-02-initial-system-evaluation/role-operations"
              },
              {
                "text": "產品經理視角：系統評估報告",
                "link": "/quality/discussions/topic-000-2026-02-02-initial-system-evaluation/role-product-manager"
              }
            ],
            "collapsed": true
          },
          {
            "text": "WriteFlow 技術圓桌討論：第二次評估交互報告",
            "link": "/quality/discussions/2026-03-01-second-evaluation-roundtable"
          },
          {
            "text": "Playwright Electron E2E 環境建置",
            "link": "/quality/discussions/T-007-playwright-electron-e2e-setup"
          }
        ],
        "collapsed": true
      }
    ],
    "collapsed": true
  },
  {
    "text": "參考資料",
    "items": [
      {
        "text": "dev-notes",
        "items": [
          {
            "text": "開發特別注意事項",
            "link": "/reference/dev-notes/GOTCHAS"
          },
          {
            "text": "技術評估報告：部落格編輯器自動儲存機制",
            "link": "/reference/dev-notes/技術評估報告：部落格編輯器自動儲存機制"
          }
        ],
        "collapsed": true
      },
      {
        "text": "規格",
        "items": [
          {
            "text": "WriteFlow 寫作基線功能設計文件",
            "link": "/reference/specs/2026-04-08-writing-baseline-design"
          }
        ],
        "collapsed": true
      },
      {
        "text": "IDE 風格文章樹使用指南",
        "link": "/reference/ARTICLE_TREE_USAGE"
      }
    ],
    "collapsed": true
  }
]
