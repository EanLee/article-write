# 效能 / O(n) 評估報告 — 第七次全面評估

**評審者**: Perf（效能工程師）  
**評審日期**: 2026-03-02  
**評審範圍**: Main process services、Renderer stores/composables、演算法設計

---

## 一、前次效能問題確認

| P6 ID | 描述 | 狀態確認 |
|-------|------|---------|
| P6-01 | filteredArticles 無防抖 + zh-TW 校對排序 | ✅ 已修（useArticleFilter composable，debounce 邏輯移出） |
| P6-02 | SearchService O(N×L) 線性掃描 | ✅ 已修（Trigram 倒排索引，詳見下方複雜度分析） |
| P6-05 | ImageService O(I×A×C) 批次 IPC 炸彈 | ✅ 已修（批次正則掃描） |
| P6-03 | MetadataCacheService 串行 I/O | ⬜ **仍待修**（P2） |
| P6-04 | ConverterService processImages 未使用 batchCopyImages | ⬜ **仍待修**（P2） |
| P6-06 | Vue deep watch + articles 全量替換觸發全體重算 | ⬜ **仍待修**（P3） |

---

## 本次評分

| 項目 | Q6 | Q7 | 說明 |
|------|----|----|------|
| **效能總分** | **5.0/10** | **7.0/10** | 三個 🔴 已修復，剩餘為 🟡 串行 I/O |
| SearchService 索引效率 | 4/10 | 8/10 | Trigram 倒排索引，O(N×L) → 平均 O(K×B) |
| ImageService 批次效率 | 3/10 | 7.5/10 | O(I×A×C) 三重巢狀 + 500 IPC 已批次改善 |
| filteredArticles 反應性 | 5/10 | 7.5/10 | debounce + 緩存鍵，防止每鍵入重算 |
| MetadataCacheService I/O | 7/10 | 7/10 | 快取機制良好，串行 I/O 仍待改 |
| ConverterService 並發 | 6/10 | 6/10 | batchCopyImages 仍未被使用 |
| Vue 響應式計算 | 5/10 | 5/10 | deep watch + 全量陣列替換，P3 |

---

## 二、SearchService Trigram 索引複雜度驗證

經程式碼審閱，P6-02 修復符合設計預期：

### 建索引複雜度（buildIndex）
- 掃描 N 個文件，每個文件提取 trigram：O(N × L) — L = 平均文字字元數
- 最壞情況下索引記憶體：每文件 L 個 trigram，共 N × L 個 `Map<string, Set<string>>` 條目
- 對 100 篇文章、平均 2000 字元/篇：約 2×10⁵ 個 Set 插入，可接受

### 查詢複雜度（search）
- 短查詢（< 3 字元）：O(N)——線性掃描所有文件，此為設計取捨（可接受）
- 一般查詢（≥ 3 字元）：提取查詢 trigram → 取多個 bucket 的交集
  - 最壞情況：O(K × B) — K = 查詢 trigram 數，B = 最大 bucket 大小
  - 交集操作透過 Set.has() 進一步縮小：實務接近 O(K × 候選集大小)
- **比較**：原 O(N×L) 改善為平均 O(K × 候選集)，對高頻詞仍有 false positive 後去重

### 發現：`extractTrigrams` 逐迴圈建立 Set

```typescript
// P7-01: 每次查詢都 new Set<string>()，對長文字（索引建立時）有 GC 壓力
private extractTrigrams(text: string): Set<string> {
  const normalized = text.toLowerCase();
  const trigrams = new Set<string>();
  for (let i = 0; i + 2 < normalized.length; i++) {
    trigrams.add(normalized.slice(i, i + 3));
  }
  return trigrams;
}
```

- 索引建立期（indexFile）：每篇文章呼叫一次，文章較長時產生大量 string slice，GC 壓力真實存在
- 查詢期（getCandidatesByTrigram）：查詢通常短（< 50 字元），GC 影響可忽略
- **建議**：indexFile 路徑可考慮累加 Map 而非 Set，但實際效能瓶頸在 I/O 而非 GC，暫 P3

---

## 三、AutoSaveService.hasContentChanged 效能

```typescript
private hasContentChanged(article: Article): boolean {
  return article.content !== this.lastSavedContent 
      || !isEqual(article.frontmatter, this.lastSavedFrontmatter);
}
```

**評估**:
- `article.content !== this.lastSavedContent`：字串相等比較，對大文章是 O(L) 但有 short-circuit（第一個不同字元即停止）
- `isEqual(frontmatter, lastSavedFrontmatter)`：lodash 深度比較，Frontmatter 結構小（< 20 個欄位），實務 O(1)
- AutoSave 間隔 30 秒，每次執行 < 1ms，**無效能疑慮**

---

## 四、P7 新發現

### P7-01 🟡 — ProcessService.stopDevServer 懸空 setTimeout

**位置**: `src/main/services/ProcessService.ts`，`stopDevServer()`

```typescript
proc.once("exit", () => resolve());
proc.kill();

// 保陽: 5 秒內不退出，強製終止
setTimeout(() => {        // ← 沒有對應的 clearTimeout！
  if (this.devServerProcess) {
    this.devServerProcess.kill("SIGKILL");
  }
  resolve(); // 若 proc.once("exit") 已先 resolve，此處 resolve 為無效但仍在佇列
}, 5000);
```

若 process 在 5 秒內正常退出（`proc.once("exit")`），5 秒後 setTimeout 仍然執行，對已解決的 Promise 呼叫 `resolve()`（無害但多餘）且再嘗試 kill 已 null 的 process（有 null-guard）。實際無 crash，但構成記憶體不必要的佔用 5 秒。

**嚴重性**: 🟢 低（不影響正確性，只是資源殘留）  
**建議**:
```typescript
const forceKillTimer = setTimeout(() => { ... }, 5000);
proc.once("exit", () => {
  clearTimeout(forceKillTimer);
  resolve();
});
```

### P7-02 🟡 — MetadataCacheService 串行 I/O（P6-03 延伸）

仍未修復。在 vault 有 100 篇文章時，串行讀取約 100 × (avg 2ms I/O) = 200ms 啟動延遲。  
建議改為 `Promise.all()` + concurrency limit（避免同時開啟過多 fd）。

### P7-03 🟢 — SearchService 短查詢線性掃描是設計取捨

< 3 字元查詢走線性 O(N)，這是對「兩字元 CJK 邊界不能形成三元語法」的合理回應。  
若要支援 2-gram（適合中文），需引入更複雜的 bigram 索引。當前 100 篇規模下不構成問題，P3。

---

## 五、效能熱點地圖（現況）

```
高風險（待修）:
  MetadataCacheService  ─── 串行 I/O ─────────── O(N) serial  [P2]
  ConverterService      ─── 未批次圖片複製 ──────── O(I) serial [P2]

已改善（Q7 確認健康）:
  SearchService         ─── Trigram 索引 ─────────  O(K·B) avg  [GOOD]
  filteredArticles      ─── debounce + 緩存鍵 ─────  O(N) 但防抖 [GOOD]
  AutoSaveService       ─── 30s 間隔 + dirty flag ─  效能可忽略  [GOOD]
  ProcessService spawn  ─── 非同步 + settle 樣式 ─── 正確        [GOOD]

低風險（觀察）:
  ProcessService timer  ─── 懸空 5s setTimeout ────  無害但待清  [P3]
```
