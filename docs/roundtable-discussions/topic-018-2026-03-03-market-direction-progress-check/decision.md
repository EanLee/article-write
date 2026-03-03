# 決策記錄：市場方向與進度對焦

> **話題編號**: topic-018
> **決策日期**: 2026-03-03
> **決策類型**: 全體一致
> **相關話題**: [topic-017](../topic-017-2026-02-27-feature-direction-integration/)

---

## 決策結果

**最終決定**：維持 Sprint 3 AI Phase 1 為主線，但確立明確的「3/11 Jordan 驗收」作為 3/15 是否公開發布的 go/no-go 決策點；同時將 Phase 1+2 合併行銷策略調整為分波推出，Phase 1 完成即推。

---

## 核心發現（本次討論新增）

| 發現 | 影響 | 決策 |
|------|------|------|
| ClaudeProvider/AIService 架構已落地，但 Jordan 從未使用過 AI 功能 | AI Phase 1 技術完成 ≠ 功能可交付 | 補齊 UI 接通 + Jordan 驗收 |
| max_tokens=400 未修（TOKEN6-03 第七次評審 P2）| SEO 生成複雜輸出可能截斷導致 Parse 失敗 | 本週修復，P0 |
| Sentry 代碼在但 DSN 未確認在生產 build 中有效 | AI API 錯誤無可觀測性 | Sam 本週驗證，AI Phase 1 上線前提條件 |
| ConfigService S7-02（getApiKey 靜默返回亂碼）| AI 功能可能對用戶靜默失敗 | Taylor 本週修復，AI Phase 1 前置依賴 |
| Phase 2 TypeScript 介面設計在文件，未落地到 types.ts | Sprint 3 承諾部分未兌現 | Taylor 3/10 前補齊 |
| 文章列表選中文章消失 UX bug | 影響外部用戶第一印象 | 3/10 前修復 |

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| PM (Alex) | ✅ 支持 | 3/11 Jordan 驗收作為 go/no-go，時間緊但可行 |
| Marketing (Lisa) | ✅ 支持 | Phase 1 完成即推，不等 Phase 2，保留 Product Hunt 窗口 |
| User (Jordan) | ✅ 條件支持 | 條件：3/11 前親自驗收 AI Phase 1，驗收通過才同意 3/15 公開 |
| Ops (Sam) | ✅ 條件支持 | 條件：Sentry DSN 生產驗證完成 + ConfigService S7-02 修復，才能上線 AI Phase 1 |
| CTO (Taylor) | ✅ 條件支持 | 條件：max_tokens 修復 + ConfigService 修復必須先於 AI Phase 1 任何測試 |

**結果**: 5 支持（其中 3 條件支持）→ **全體一致**

---

## 上線策略決策

### 2026-03-15 上線定義（調整）

| 情境 | 上線策略 |
|------|---------|
| 3/11 前 Jordan 驗收 AI Phase 1 通過 | **Soft Launch**：Reddit r/ObsidianMD、Indie Hackers、個人社群，不衝 Product Hunt |
| 3/11 前未完成驗收 | **Alpha Only**：維持現有 Alpha 測試，不公開，日期另訂 |
| AI Phase 1 + Sentry 全部到位，Phase 1 穩定 | **Product Hunt 正式推**：保留此窗口給正式衝刺 |

### Phase 1+2 行銷策略調整

**原決策（topic-017）**：Phase 1+2 打包「AI 文章助手 2.0」一起推
**新決策**：Phase 1 完成即推，訴求「SEO-powered publishing」；Phase 2 完成後第二波，升級為「AI 文章助手」

**理由**：行銷窗口有時效性，等 Sprint 4 可能 4-5 月，風險過高。

### 一句話 Pitch（確認）

> "Write in Obsidian. Publish with AI-optimized SEO. Instantly."
> （行銷版）
>
> "Obsidian 寫完，自動處理發布的那些雜事，還幫你生成 SEO。"
> （Jordan 真實用戶版）

---

## ✅ Action Items

| # | 行動項目 | 負責人 | 優先級 | 截止 | 完成條件 |
|---|---------|-------|-------|------|---------|
| 1 | max_tokens 400 → 600（TOKEN6-03 一行修復） | Taylor | P0 | 3/4 | ClaudeProvider.ts 修改，SEO 生成不再截斷 |
| 2 | ConfigService S7-02 + QUAL7-04 合併修復（注入 configDir + getApiKey async）| Taylor | P0 | 3/6 | 測試通過，API Key 設定路徑不再靜默失敗 |
| 3 | Sentry DSN 生產環境驗證（觸發 AI 錯誤確認後台有收到）| Sam | P0 | 3/7 | Sentry Dashboard 可見 AI 錯誤 event，alert rule 設定 |
| 4 | 文章列表選中文章消失 UX bug 修復 | 待認領 | P0 | 3/10 | Jordan 確認「同步後選中文章不消失」 |
| 5 | AI Panel UI 接通 AIService（讓 Jordan 看到並能使用 SEO 生成按鈕）| 待認領 | P1 | 3/8 | Jordan 可在 UI 上觸發 SEO 生成 |
| 6 | Phase 2 TypeScript 介面落地 types.ts（AnalysisSuggestion、ArticleAnalysisResult 等）| Taylor | P1 | 3/10 | types.ts 通過 TypeScript 檢查，Sprint 4 可直接實作 |
| 7 | Jordan AI Phase 1 真實驗收（一鍵生成 Slug/Meta/Keywords 並套用到 Frontmatter）| Jordan | P1 | 3/11 | Jordan 確認：功能有效、體驗符合預期 |
| 8 | 一句話 pitch 確認（英文 + 繁中版）| Alex + Lisa | P1 | 3/6 | 各版本 pitch 確認，Lisa 素材製作依此延伸 |
| 9 | 推廣素材包（截圖、GIF、Product Hunt 草稿、Twitter 發文稿）| Lisa | P2 | Jordan 驗收後 48h | 素材包就位，可於 Soft Launch 當天立即發布 |
| 10 | 自動儲存「正在儲存...」虛驚改善 | 待認領 | P3 | 3/14 | Jordan 日常使用噪音消除 |

---

## 功能凍結（維持上次決策）

| 功能 | 理由 |
|------|------|
| AI Phase 3（寫作助手）| Streaming 架構複雜，Sprint 4 後評估 |
| macOS Auto-Update | 需 Apple Developer 帳號，第二波評估 |
| Phase 2 文章建議實作 | Sprint 4 主線 |

---

## 追蹤

**Go/No-Go 決策點**：2026-03-11，Jordan 驗收 AI Phase 1 結果
**Soft Launch 日**：2026-03-15（條件達成）
**Product Hunt 正式推**：AI Phase 1 穩定 + 推廣素材完整後

**負責追蹤**：Alex（PM）

---

**文件版本**: 1.0
**最後更新**: 2026-03-03
