// 專案自訂文件分類設定（依 T-017 / T-018 規劃）
//
// 目的：在不搬移既有 200+ 份文件的前提下，讓 docs-governance 系列 skill
// （docs-governance / doc-migration）讀取本檔案、合併內建分類表，
// 產出「本專案實際適用」的文件分類規則。
//
// 本檔案不會被任何 build/lint 自動讀取（doc-viewer 尚未實作消費端），
// 目前作為 skill 與人類審閱時的「分類規格文件」使用。

export default {
  // 擴充/覆寫內建 doc_type → 目錄映射
  // （docs-governance 內建表格將 ADR/TDR 對應到 docs/engineering/* ，
  //  本專案維持既有扁平路徑）
  extend: {
    ADR:   { label: '架構決策記錄', dir: 'adr' },
    TDR:   { label: '技術選型決策', dir: 'tech-team' },
    RETRO: { label: '流程回顧', dir: 'tech-team', required: ['doc_id', 'title', 'status'] },
    UX:    { label: 'UX/介面設計評估', dir: 'tech-team' },
    PLAN:  { label: '規劃/治理文件', dir: 'tech-team' },
    FIX:   { label: '缺陷修正報告', dir: 'fix-bug' },
    RPD:   { label: '圓桌會議決議', dir: 'roundtable-discussions' },
    AIDR:  { label: 'AI/角色討論記錄', dir: 'roundtable-discussions' },
  },

  // 標記允許「混合多種 doc_type / domain」的目錄（T-017 落差四）
  // 這些目錄內的文件改以 frontmatter `domain` 欄位標示實際性質，
  // 而非依賴目錄路徑本身。
  mixedDirs: [
    'roundtable-discussions',
    'tech-team',
    'planning',
    'analysis',
    'guides',
  ],

  // 註冊索引檔，供未來 lint 檢查序號/連結一致性（T-017 落差一）
  registries: [
    { dir: 'adr', index: 'README.md' },
    { dir: 'tech-team', index: 'TEAM.md' },
    { dir: 'roundtable-discussions', index: 'README.md' },
  ],

  // mixedDirs 內允許使用的 domain 值（對應 docs-governance 8-domain 的子集）
  domains: ['product', 'engineering', 'quality', 'delivery', 'conventions', 'operations'],

  // 舊文件狀態詞彙 → docs-governance 五階段 status 對照表（T-018 落差九）
  // 補 frontmatter 時依此表將舊文件中的自由文字狀態轉換為標準值。
  statusMap: {
    '已實作': 'approved',
    '整合文件': 'approved',
    '✅ 完成': 'approved',
    '✅ 完成（待回報 doc-viewer 專案）': 'approved',
    '進行中': 'reviewing',
    '規劃中': 'draft',
    'PENDING（檔名）': 'pending', // 對應 T-017 落差五：補充的前置狀態，非 docs-governance 既有五階段
  },

  // 前置狀態（T-017 落差五）：用於 topic-*/PENDING.md 這類「尚未進入
  // draft 編寫流程、僅標記待處理」的文件。docs-governance 五階段流程
  // 為 draft → reviewing → approved → deprecated → archived，
  // pending 排在 draft 之前。
  prependStatus: ['pending'],
}
