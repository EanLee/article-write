# 決策記錄：整合 AI 規格與後續 Sprint 功能走向

> **話題編號**: topic-017
> **決策日期**: 2026-02-27
> **決策類型**: 全體一致
> **相關話題**: [topic-014](../topic-014-2026-02-16-ai-api-integration/) | [topic-015](../topic-015-2026-02-16-ai-panel-design/) | [topic-016](../topic-016-2026-02-27-blog-content-analysis/)

---

## 決策結果

**最終決定**：Sprint 3 以 **AI Phase 1（SEO 生成功能）** 為主線，前提條件是 T-015 技術設計文件和 Sentry 監控先到位；Phase 2 在 Sprint 3 期間完成 TypeScript 介面設計，Sprint 4 實作；Phase 3 寫作助手維持 Placeholder，不排入近期 Sprint。

**決策理由**：

1. **高頻使用場景**：Jordan 每篇文章都要手寫 Slug / Meta Description / Keywords，每次耗時 5-10 分鐘——這是最直接、最高頻的使用者痛點
2. **Phase 1 範圍明確、風險可控**：SEO 生成功能獨立可驗證，三週內可交付
3. **架構優先**：T-015（IAIProvider 介面）是 AI 功能的地基，三天內可完成，不造成顯著阻塞，但省略會累積技術債
4. **可觀測性保障**：Sentry 監控是引入外部 API 依賴的必要條件，不可跳過
5. **Phase 2 規格完整但複雜度高**：topic-016 已定義三角度分析框架，但一次 API 呼叫三組結構化回覆的 Prompt 設計需要先做 token 消耗評估；在 Phase 1 穩定前進入主線風險過高
6. **Phase 3 暫緩**：Streaming 輸出架構尚未評估，不在近期規劃範圍

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| PM (Alex) | ✅ 支持 | 高頻痛點優先，Phase 1 低風險可快速交付，三場圓桌的 Action Items 需要落地 |
| Marketing (Lisa) | ✅ 支持 | AI SEO 是差異化賣點，Phase 1+2 打包「AI 文章助手 2.0」行銷效果更好 |
| User (Jordan) | ✅ 支持 | 每篇文章的高頻需求，三週時程可接受 |
| Ops (Sam) | ✅ 條件支持 | 條件：T-015 設計文件 + Sentry 先到位，Phase 1 和 Phase 2 不同時實作 |
| CTO (Taylor) | ✅ 支持 | 架構先行（T-015 三天定案），Phase 2 介面 Sprint 3 完成，為 Sprint 4 奠基 |

**結果**: 5 支持、0 反對、0 中立 → **全體一致**

---

## Sprint 規劃摘要

| Sprint | 主線 | 並行（不阻塞主線） |
|--------|------|-----------------|
| **Sprint 3** | 全文搜尋（S-01）完成 → AI Phase 1（SEO 生成）上線 | T-015 設計文件（P0）、Sentry 設定（P0）、Phase 2 TypeScript 介面定義（P1）、Phase 2 token 消耗評估（P2）、推廣素材準備（P2） |
| **Sprint 4** | AI Phase 2（文章建議三角度分析）實作 | Phase 1+2 合併行銷發布、Phase 3 可行性評估 |
| **Sprint 5+** | AI Phase 3（寫作助手）—— 需獨立評估 Streaming 架構 | — |

---

## ✅ Action Items

| # | 行動項目 | 負責人 | 優先級 | 完成條件 | 狀態 |
|---|---------|-------|-------|---------|------|
| 1 | 完成 T-015 技術設計文件（IAIProvider 介面、Claude Adapter 設計、加密方案、Fallback 機制） | Taylor + Sam | P0 | 文件完成，介面定義明確，所有技術成員對契約有共識；目標三天內完成 | ⏳ 待開始 |
| 2 | 設定 Sentry 錯誤追蹤（捕捉 API 失敗、timeout、Key 驗證錯誤） | Sam | P0 | Sentry 集成完成，Dashboard 可見 AI 相關錯誤事件；AI Phase 1 上線前必須到位 | ⏳ 待開始 |
| 3 | 實作 IAIProvider 介面和 Claude Adapter | Taylor | P1 | 通過單元測試，Claude API 呼叫可正常運作，建在 T-015 設計文件之上 | ⏳ 待開始 |
| 4 | 實作 AI Phase 1 SEO 生成功能（Slug / Meta Description / Keywords） | 技術團隊（Lin + Wei） | P1 | E2E 測試通過，Jordan 可一鍵生成 SEO 欄位並套用到 Frontmatter，Sentry 監控正常 | ⏳ 待開始 |
| 5 | 定義 Phase 2 TypeScript 介面（AnalysisSuggestion、ArticleAnalysisResult、analyzeArticle 函式） | Taylor | P1 | 型別定義落地到程式碼，通過 TypeScript 檢查，供 Sprint 4 實作使用 | ⏳ 待開始 |
| 6 | 評估 Phase 2 一次 API 呼叫的 Prompt 設計與 token 消耗 | Sam | P2 | 完成測試報告：各角度 Prompt 的 token 消耗估算、回應品質評估，結果供 Sprint 4 使用 | ⏳ 待開始 |
| 7 | 準備 Phase 1 推廣素材（文案規劃、截圖計畫、Product Hunt 草稿） | Lisa | P2 | 推廣素材完整就位，Phase 1 功能穩定後可立即發布；Phase 1+2 合併行銷計畫完成 | ⏳ 待開始 |
| 8 | CM6 Adapter 文件（AI-05）補齊 | Taylor | P3 | 文件完成，介面定義清楚，記錄 CM6 在 WriteFlow 的整合方式 | ⏳ 待開始 |

---

## 功能凍結（本次決定不在近期實作）

| 功能 | 理由 | 預計重新評估時間 |
|------|------|----------------|
| AI Phase 3（寫作助手）| Streaming 輸出架構複雜度高，需獨立評估 | Sprint 4 完成後 |
| 文章間連結功能 | topic-013 決定另開圓桌，尚未發起 | 待發起 topic（topic-013 S-05 待開始） |
| macOS Auto-Update | 需要 Apple Developer 帳號（$99/年），topic-013 決定第二波評估 | 全文搜尋完成後評估 |

---

## 追蹤

**驗證方式**：Jordan 能在 WriteFlow 中一鍵生成 Slug / Meta Description / Keywords，並直接套用到 Frontmatter；Sentry 能捕捉 AI API 相關錯誤事件；Phase 2 TypeScript 介面完成並通過型別檢查。

**回顧日期**：AI Phase 1 完成後（預估 2026-03 月中）

**負責追蹤**：Alex（PM）+ Taylor（CTO）

---

## 參考討論

- [discussion.md](./discussion.md)
- [topic-014 AI API 整合策略](../topic-014-2026-02-16-ai-api-integration/decision.md)
- [topic-015 AI Panel 設計](../topic-015-2026-02-16-ai-panel-design/decision.md)
- [topic-016 文章建議三角度分析](../topic-016-2026-02-27-blog-content-analysis/decision.md)

---

**文件版本**: 1.0
**最後更新**: 2026-02-27
