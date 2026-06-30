/**
 * Vault 目錄結構常數
 *
 * 集中管理 Obsidian Vault 目錄名稱假設，避免魔法字串散落於各模組。
 *
 * 目前的 Vault 結構慣例：
 *   vaultPath/
 *   ├── Publish/          ← 已發布文章（PUBLISHED_STATUS_DIR）
 *   │   └── Category/
 *   │       └── article.md
 *   └── Drafts/           ← 草稿文章（DRAFT_STATUS_DIR）
 *       └── Category/
 *           └── article.md
 *
 * 若未來要變更目錄命名慣例，只需修改這個檔案。
 */
export const VaultDirs = {
  /** 已發布文章的頂層目錄名稱（對應 ArticleStatus.Published）*/
  PUBLISHED: "Publish",

  /** 草稿文章的頂層目錄名稱（對應 ArticleStatus.Draft）*/
  DRAFTS: "Drafts",
} as const;

export type VaultDirName = (typeof VaultDirs)[keyof typeof VaultDirs];
