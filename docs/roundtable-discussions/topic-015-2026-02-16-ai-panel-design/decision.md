# topic-015 AI Panel 設計決策

**議題**：Left sidebar 加入 AI icon 後，右側 AI 操作 Panel 應該放什麼？
**決策日期**：2026-02-16
**決策人**：Alex（PM）、Lisa（Marketing）、Jordan（User）、Sam（Ops）、Taylor（CTO）

---

## 決策

### AI Panel 結構：三個 Section

**Section 1：SEO 助手**（Phase 1，已完成）
- 一鍵生成 Slug / Meta Description / Keywords
- 顯示目前已有的 SEO 欄位值
- 結果可直接套用到 frontmatter

**Section 2：文章建議**（Phase 2，Placeholder）
- 品質分析：結構、清晰度、實用建議
- 不做機械式評分，提供可直接使用的具體建議
- 顯示「即將推出」狀態

**Section 3：寫作助手**（Phase 3，Placeholder）
- 輸入提示，AI 給寫作方向建議（不全寫，給方向）
- Streaming 輸出
- 顯示「即將推出」狀態

---

## 技術架構決策

### aiPanelStore 設計

每個 Section 有獨立的 loading / error / result 狀態，互不干擾：

```typescript
interface AIPanelSectionState<T> {
  isLoading: boolean
  error: string | null
  result: T | null
}

interface AIPanelStore {
  seo: AIPanelSectionState<SEOGenerationResult>
  suggestions: AIPanelSectionState<unknown>  // Phase 2
  writing: AIPanelSectionState<unknown>      // Phase 3
  applyToArticle: (field: keyof ArticleFrontmatter, value: unknown) => void
}
```

### Panel 與 articleStore 通訊

- Panel 透過 `applyToArticle(field, value)` 直接寫入 articleStore
- 不需中間層，結果一鍵套用
- SEO section 優先實作，Phase 2/3 等 Placeholder 就位再擴充

### UX 原則

- Panel 是輔助工具，不是獨立工作流
- 打開即可用，設定最少（只需 API Key）
- Phase 2/3 Placeholder 需要明確文案（「即將推出」vs「需要 API Key」）

---

## Action Items

| # | 任務 | 負責人 | 優先級 |
|---|------|--------|--------|
| 1 | 建立 AIPanelPanel.vue 骨架（三個 Section + Left Sidebar icon） | Wei（Frontend） | P1 |
| 2 | 建立 aiPanelStore（獨立狀態管理） | Wei | P1 |
| 3 | SEO Section 接入既有 seoStore，實作 applyToArticle | Wei | P1 |
| 4 | Phase 2/3 Section Placeholder UI（coming-soon 文案） | Wei | P2 |
| 5 | Left Sidebar 加入 AI icon，點擊開關 Panel | Wei | P1 |

---

## 參考討論

- [discussion.md](./discussion.md)
