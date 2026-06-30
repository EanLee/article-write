// 專案自訂文件分類設定（依 T-017 / T-018 規劃，2026-06-14 隨 schema 整併更新）
//
// 目的：在不搬移既有 200+ 份文件的前提下，讓 docs-governance 系列 skill
// （docs-governance / doc-migration）讀取本檔案、合併內建分類表，
// 產出「本專案實際適用」的文件分類規則。
//
// 本檔案不會被任何 build/lint 自動讀取（doc-viewer 尚未實作消費端），
// 目前作為 skill 與人類審閱時的「分類規格文件」使用。
//
// schema 對照：docs/conventions/docs-governance/2026-06-14-docs-classification-logic.md
// （title/domain/type/status/owner/updated/source_of_truth，status: draft|approved|archived）

export default {
  // type 開放詞彙建議（補充 docs-governance skill Step 1 未列出的專案慣用值）
  // 僅供人類/AI 審閱參考，非封閉列舉，亦不影響檔案存放目錄（目錄由 domain 決定）
  extend: {
    retro: '流程回顧',
    ux: 'UX/介面設計評估',
    fix: '缺陷修正報告',
    aidr: 'AI/角色討論記錄',
  },

  // 註冊索引檔，供未來 lint 檢查序號/連結一致性（T-017 落差一）
  registries: [
    { dir: 'engineering/adr', index: 'README.md' },
    { dir: 'conventions/governance', index: 'team-composition.md' },
    { dir: 'conventions', index: 'ROUNDTABLE-DISCUSSIONS-INDEX.md' },
  ],

  // 7-domain 分類允許使用的 domain 值（目錄結構本身即代表 domain；2026-06-14 移除未使用的 archive）
  domains: ['product', 'engineering', 'quality', 'delivery', 'conventions', 'operations', 'reference'],

  // 舊文件狀態詞彙 → 統一 schema status 對照表（2026-06-14 改為 draft/approved/archived 三階段）
  // 補 frontmatter 時依此表將舊文件中的自由文字狀態轉換為標準值。
  statusMap: {
    '已實作': 'approved',
    '整合文件': 'approved',
    '✅ 完成': 'approved',
    '✅ 完成（待回報 doc-viewer 專案）': 'approved',
    '進行中': 'draft',
    '規劃中': 'draft',
    'PENDING（檔名）': 'draft',
  },
}
