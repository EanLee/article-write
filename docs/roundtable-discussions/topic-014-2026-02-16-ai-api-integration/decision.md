# 決策記錄：AI API 整合策略

> **話題編號**: topic-014
> **決策日期**: 2026-02-16
> **決策類型**: 全體一致共識

---

## 決策結果

**最終決定**:
採用分階段實施策略：**Phase 1 先做 SEO 生成功能，Phase 2 再做文章建議功能**，使用 BYOK（用戶自帶 API Key）+ Demo Key 方案，採用 Adapter 模式架構。

**決策理由**:
- Phase 1 SEO 生成功能較獨立、易於驗證，能快速推出新聞稿搶佔市場先機（滿足 Lisa 推廣需求）
- Phase 2 文章建議功能複雜度高、長期價值大，不冒進（滿足 Jordan 和 PM 的實際需求）
- Adapter 模式確保架構可擴展性，降低技術債
- BYOK 方案尊重使用者隱私，Demo Key 降低試用門檻
- 完整的加密、Fallback 和監控滿足 Ops 的穩定性要求

---

## 投票結果

| 角色 | 立場 | 關鍵理由 |
|------|------|---------|
| PM (Alex) | ✅ 支持 | 分階段方案平衡了功能推廣節奏和技術品質 |
| Marketing (Lisa) | ✅ 支持 | SEO 生成優先，能快速獲得推廣素材 |
| User (Jordan) | ✅ 支持 | 功能實用，且穩定性有保障 |
| Ops (Sam) | ✅ 支持 | Adapter 架構、加密、Fallback、監控完備 |
| CTO (Taylor) | ✅ 支持 | 分階段降低風險，Adapter 模式優雅可擴展 |

**結果**: 5 支持、0 反對、0 中立 → **全體一致**

---

## ✅ Action Items

| # | 行動項目 | 負責人 | 優先級 | 完成條件 | 狀態 |
|---|---------|-------|-------|---------|------|
| 1 | 設計 AI Provider Adapter 架構 | Taylor + Sam | P0 | 完成 T-015 技術設計文件（含 API 層設計、加密方案、Fallback 機制、監控計畫） | ⏳ 待開始 |
| 2 | 實作 IAIProvider 介面和 Claude Adapter | Taylor | P1 | 通過單元測試，集成到主分支 | ⏳ 待開始 |
| 3 | 實作 SEO 生成功能（Slug、Meta Description、Keywords） | 開發團隊 | P1 | 完整 E2E 測試通過，無 TypeScript 錯誤 | ⏳ 待開始 |
| 4 | 設定 Sentry 錯誤追蹤 + 監控告警 | Sam | P1 | Sentry 完整集成，Dashboard 可見所有 API 調用 | ⏳ 待開始 |
| 5 | 準備 Phase 1 推廣素材（產品文案、螢幕截圖） | Lisa | P2 | SEO 生成功能可演示，推廣文案就位 | ⏳ 待開始 |
| 6 | 規劃 Phase 2 文章建議功能需求 | Alex | P2 | 完成使用者故事和驗收條件 | ⏳ 待開始 |

**優先級說明**：
- `P0` — Phase 1 能否成功的前提
- `P1` — Phase 1 本 Sprint 必須完成
- `P2` — Phase 2 下個 Sprint

**狀態說明**：
- `⏳ 待開始` — 尚未開始
- `🔄 進行中` — 已開始執行
- `✅ 完成` — 完成條件已達成
- `❌ 封存` — 因故不執行，原因需說明

---

## 技術架構確認

### 核心原則（不可變更）

1. **BYOK + Demo Key 方案**
   - 用戶可提供自己的 Claude API Key
   - 提供 Demo Key 供試用（可選配額限制）
   - 用戶內容不明文上傳到第三方

2. **Adapter 模式 (IAIProvider)**
   - 統一的 AI Provider 介面
   - 未來易於擴展（如 OpenAI、Gemini）
   - 核心邏輯與 API 層解耦

3. **安全與隱私**
   - API Key 加密儲存
   - 完整的 Fallback 機制（Key 失效、API 異常）
   - Sentry 監控但不記錄敏感資料

---

## Phase 1 功能範圍（本 Sprint）

**SEO 生成功能**:
- 自動生成文章 Slug（基於標題）
- 建議 Meta Description（摘取前 160 字優化）
- 推薦 Keywords（5-7 個，基於內容分析）

**技術要求**:
- 與編輯器完整集成（按鈕、UI）
- 完整 E2E 測試
- 錯誤處理（API 超時、配額超限等）
- Sentry 監控全覆蓋

---

## Phase 2 功能規劃（下個 Sprint）

**文章建議功能**:
- 分析文章品質（句子長度、詞彙多樣性、清晰度）
- 識別不足之處（缺少導言、結論薄弱等）
- 提供改進建議

**技術要求**:
- 複雜度更高，需充分測試
- 建立在 Phase 1 Adapter 基礎之上

---

## 追蹤

**驗證方式**:
- Phase 1 完成：SEO 生成功能可用，Sentry 監控正常，推廣素材就位
- 整體策略檢驗：下個 Sprint 開始 Phase 2 時確認 Phase 1 穩定性

**回顧日期**: 2026-02-23（Phase 1 完成後）

**負責追蹤**: Alex（PM）+ Taylor（CTO）

---

**文件版本**: 1.0
**最後更新**: 2026-02-16
