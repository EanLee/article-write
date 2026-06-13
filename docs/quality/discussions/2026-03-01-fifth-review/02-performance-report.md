# 效能/O(n) 評估報告 — 第五次全面評估

**審查者**: 效能工程師 Agent
**日期**: 2026-03-01
**評估範圍**: WriteFlow v0.1.0，基準 commit `3fbb641`

---

## 本次評分

| 項目 | 分數 | 說明 |
|------|------|------|
| **效能總分** | **8.5 / 10** | 整體穩定，新發現批量轉換無節流與大型元件初始渲染問題 |
| 記憶體管理 | 9/10 | 洩漏問題全數修正，監聽器生命週期正確 |
| 渲染效率 | 7.5/10 | SettingsPanel.vue (941行) 渲染負擔偏重 |
| 搜尋效率 | 9/10 | Fuse.js 索引快取，无重複建立 |
| 批量操作 | 7.5/10 | 圖片批量轉換缺乏背壓 (backpressure) 控制 |
| 自動儲存 | 9.5/10 | 雙重 timer 問題已修正，debounce 正確 |

---

## 執行摘要

前次評審確認的效能問題均已解決（記憶體洩漏、雙重 AutoSave timer）。本次新發現兩個中等優先度問題：**ConverterService 批量圖片轉換無節流機制**、以及 **SettingsPanel 三個 Tab 全量渲染**。

---

## 已修正確認（第四次評估效能問題）

| 問題 ID | 描述 | 驗證 |
|--------|------|------|
| P4-01/P4-02 | 算法建議（低優先）| ✅ 確認維持現狀合理 |
| dup-autosave | MainEditor 雙重 AutoSave timer | ✅ 改委派 autoSaveService.markAsModified() |

---

## 新發現問題

### P5-01 🟡 SettingsPanel.vue (941行) 三個 Tab 全量初始渲染 — 中等

**位置**: `src/components/SettingsPanel.vue`

**問題**: SettingsPanel 包含 AI、編輯器、發布、Git 等多個設定段，目前使用 `v-show` 管理 Tab 顯示：

```vue
<!-- SettingsPanel.vue 目前模式：v-show 全量渲染 -->
<div v-show="activeTab === 'ai'">
  <!-- AI 設定，含多個 ref、computed、API 呼叫 -->
</div>
<div v-show="activeTab === 'editor'">
  <!-- Editor 設定 -->
</div>
```

`v-show` 在首次渲染時仍會建立所有 Panel 的完整 VDOM 和 reactive 綁定。941行的龐大元件在初始化時：
- 建立約 30+ 個 `ref/computed`
- 渲染三至四個 Tab 的完整 DOM

**建議**: 改用 `v-if` + `KeepAlive` 實現懶載入：

```vue
<KeepAlive>
  <component :is="activeTabComponent" />
</KeepAlive>
```

**效能影響估計**: 首次載入節省約 30-40% 初始化時間（Tab 切換後 KeepAlive 快取無需重建）。

---

### P5-02 🟡 ConverterService 批量圖片轉換缺乏背壓控制 — 中等

**位置**: `src/services/ConverterService.ts:convertImages()`

**問題**: 批量圖片轉換使用 `Promise.all()` 並行處理所有圖片，無法限制同時並行數量：

```typescript
// ConverterService.ts 約 L450
async convertImages(images: string[]): Promise<void> {
  await Promise.all(images.map(img => this.processImage(img)))
  // ← 若有 100 張圖片，同時發出 100 個 fs 操作
}
```

**影響**:
- 大量圖片場景下（>20張）可能導致 Node.js 文件描述符耗盡
- UI Thread 事件循環被阻塞，使用者看到 Electron 視窗無回應

**建議**: 使用固定大小的 concurrency pool：

```typescript
async function batchProcess<T>(
  items: T[],
  handler: (item: T) => Promise<void>,
  concurrency = 5
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map(handler))
  }
}
```

---

### P5-03 🟢 MetadataCacheService 快取無 TTL 策略 — 低

**位置**: `src/services/MetadataCacheService.ts`

**問題**: 文章 Metadata 永久快取在記憶體中，長時間運行（>8小時）可能導致快取與磁碟狀態不一致。

**評估**: 目前已有 FileService 的 chokidar 監聽機制在檔案變更時更新，因此實際影響低。但若 chokidar 漏事件（目錄重命名等邊界條件），快取可能陳舊。

**建議**: 加入 5-10 分鐘 TTL，過期時重新驗證。

---

## 效能基準追蹤

| 指標 | 第三次評估 | 第四次評估 | 第五次評估 |
|------|-----------|-----------|-----------|
| TypeScript 建構速度 | ~8s | ~8s | ~8s（穩定）|
| 單元測試執行時間 | ~8s | ~10s | **~10.4s**（因測試數增加）|
| 測試數量 | 373 | 424 | 424（穩定）|
| 記憶體洩漏 | ❌ 1個已知 | ✅ 全修正 | ✅ 維持 |
| 搜尋索引建立 | 首次建立 | 首次建立 | ✅ 快取正確 |

---

## 效能工程師結語

WriteFlow 整體效能架構健康，記憶體管理和 AutoSave 機制是本輪最明顯的改善。**P5-01（SettingsPanel 渲染）** 和 **P5-02（批量轉換背壓）** 是中等優先度的改善機會，不影響現有功能正確性，但在大量文章操作時使用者體驗有明顯優化空間。

---

*第五次全面評估 — 效能 | 前次: [第四次評估](../2026-03-01-fourth-review/02-performance-report.md)*
