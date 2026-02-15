# 技術討論 T-005 — Metadata Cache 設計評估

> **日期**: 2026-02-15
> **主持**: Sam（Tech Lead）
> **參與**: Wei（Frontend）、Lin（Services）、Alex（UI/UX）
> **背景**: CTO 提出需求——分類欄位應支援「可自行輸入，也可選取曾出現過的分類」，並希望不要每次開啟表單都重新掃描文章

---

## 任務清單

| # | 任務 | 負責 | 狀態 |
|---|------|------|------|
| 1 | 確認 cache 存放位置 | Lin | ✅ 決策完成 |
| 2 | 確認觸發掃描時機 | Sam | ✅ 決策完成 |
| 3 | 確認收集內容範圍 | Wei | ✅ 決策完成 |
| 4 | 確認 FrontmatterEditor combobox 互動設計 | Alex | ✅ 決策完成 |
| 5 | 實作 MetadataCacheService | Lin | 🔲 待實作 |
| 6 | 實作 FrontmatterEditor combobox | Wei | 🔲 待實作 |
| 7 | 設定頁新增「重新掃描」按鈕 | Wei | 🔲 待實作 |

---

## 討論記錄

### Sam：問題背景

**Sam**：CTO 希望分類欄位從固定的 `<select>` 改為可自行輸入、也能選取曾出現過的分類。目前欄位是硬編碼的三個選項（Software / Growth / Management），完全無法擴充。

討論重點有兩個：**cache 存哪**、**何時掃描**。

---

### Lin：Cache 存放位置分析

**Lin**：我評估了兩個位置：

| | Vault 根目錄 `.writeflow/metadata-cache.json` | App 設定資料夾 `userData/metadata-cache.json` |
|---|---|---|
| 隨 vault 搬移 | ✅ cache 跟著 vault 走 | ❌ 換電腦要重掃 |
| 多個 vault | ✅ 每個 vault 各自獨立 | ❌ 需要以 vault path 為 key |
| 使用者可見 | 放隱藏資料夾 `.writeflow/` 可接受 | 隱藏在系統路徑 |

**結論**：放在 vault 根目錄的 `.writeflow/metadata-cache.json`。原因是 WriteFlow 本來就是 vault-based 工具，cache 應該跟著 vault 走，換電腦或多裝置時行為一致。

---

### Wei：觸發時機與收集範圍

**Wei**：觸發時機我評估了三個方案：

- **A. 設定頁手動按鈕**：使用者主動控制，但 cache 可能過時
- **B. FrontmatterEditor 內加掃描按鈕**：太干擾，modal 目的是填資料不是管理設定
- **C. 開啟 vault 時背景自動掃描**：最透明，使用者無感

**建議 A + C 並用**：開 vault 時靜默掃描一次（確保不過時），設定頁保留手動按鈕（給進階使用者強制更新）。

收集範圍：**categories + tags 一起掃**。既然要遍歷文章，一次全部收集，tags 在 FrontmatterEditor 輸入時同樣能提供建議。

---

### Alex：Combobox 互動設計

**Alex**：FrontmatterEditor 的分類欄位互動原則：

1. 使用者輸入時，即時過濾現有分類（不區分大小寫）
2. 沒有符合項目時，直接使用輸入值——**不強迫選擇**
3. 點擊建議項目即填入，不需要確認步驟
4. 視覺上與其他 input 一致，下方出現 dropdown 建議清單

實作使用 DaisyUI `dropdown` 搭配 input，不引入外部 combobox 套件。

---

### Sam：決策整理

**Sam**：對齊完成，決策如下：

| 項目 | 決策 | 理由 |
|------|------|------|
| Cache 位置 | `.writeflow/metadata-cache.json`（vault 根目錄） | 跟著 vault 走，支援多 vault |
| 觸發時機 | 開 vault 時背景自動 + 設定頁手動按鈕 | 使用者無感 + 提供 fallback |
| 收集內容 | categories + tags | 一次掃描全部收集 |
| UI 元件 | DaisyUI dropdown combobox | 樣式一致，無外部依賴 |

---

## 相關文件

- [UX-001 表單設計規範](./UX-001-form-design-system.md)
- `src/components/FrontmatterEditor.vue`
- `src/services/MetadataCacheService.ts`（待建立）
- `.writeflow/metadata-cache.json`（vault cache 檔，待生成）
