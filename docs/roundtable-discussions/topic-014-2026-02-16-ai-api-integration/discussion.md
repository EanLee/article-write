# 討論記錄：AI API 串接評估

> **話題編號**: topic-014
> **發起日期**: 2026-02-16
> **主持人**: Alex（PM）
> **狀態**: 🔄 討論中

---

## 議題說明

評估在 WriteFlow 內串接 AI API，提供以下功能：
1. **文章檢視與撰寫建議** — 分析文章品質，指出不足或需要加強之處
2. **SEO 輔助生成** — 自動建議 Slug、Meta Description、Keywords

---

## 專案現況（發起前確認）

- **版本**：v0.2 Sprint 進行中
- **已完成**：全文搜尋（T-009 ✅）、Auto-Update（T-008 ✅）、CI/CD（T-003 ✅）
- **進行中**：CM6 wikilink 高亮（S-02）、CM6 Adapter 文件（S-03）
- **分支**：`feature/s01-full-text-search`

---

## 討論記錄

### 第三輪：最終決策輪（2026-02-16）

Taylor：「我認為我們有能力同時做兩個功能，但確實有先後。從技術角度看，SEO 生成是更獨立的模組，可以快速驗證 BYOK 架構。文章建議的複雜度更高，但長期價值更大。建議分階段實作。」

Lisa：「好的，我能接受分階段做。如果 Phase 1 先做 SEO 生成，我們可以快速推出新聞稿『WriteFlow 新增 AI SEO 助手』，獲得初期市場關注。Phase 2 做文章建議時再做第二波推廣，這樣更有節奏感。」

Jordan：「只要 SEO 生成是真的能用，能幫我自動填 Slug 和描述，我就滿意。最重要的是要穩定，不要一個月壞一次。」

Sam：「技術架構層面我有建議：Adapter 模式很好，但 API Key 加密存儲、Fallback 機制、完整監控這三項是非協商的。我需要看到 Sentry 錯誤追蹤、健康檢查和自動降級方案。」

Alex：「好的，我來做最終決策。我們的方向是：**分兩個 Phase 實施 AI 整合**。Phase 1（本 Sprint）先實作 **SEO 生成功能**，使用 BYOK + Demo Key 方案，建立 IAIProvider Adapter 架構。Phase 2（下個 Sprint）實作 **文章建議功能**。架構上完全採用 Adapter 模式，API Key 加密存儲，必須有完整的 Fallback 機制和 Sentry 監控。這樣既滿足 Lisa 的推廣節奏，也不讓 Jordan 和使用者體驗失望，同時符合 Taylor 和 Sam 對技術品質的要求。下個步驟是 Taylor 和 Sam 一起設計 API 層架構文件，提交 T-XXX 技術設計文件。」

