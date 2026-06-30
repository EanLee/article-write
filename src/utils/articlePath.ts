import { ArticleStatus } from "@/types";
import { normalizePath } from "@/utils/path";
import { VaultDirs } from "@/config/vault";

/**
 * 解析文章檔案路徑，取得其狀態和分類
 *
 * Vault 目錄結構假設（見 VaultDirs）：
 *   vaultPath/
 *   ├── Publish/Category/article.md   → status: Published
 *   └── Drafts/Category/article.md    → status: Draft
 *
 * @param filePath - 文章檔案的絕對路徑
 * @param vaultPath - Obsidian vault 根目錄路徑
 * @returns 解析結果（status + category），若路徑不符格式則回傳 null
 */
export function parseArticlePath(
  filePath: string,
  vaultPath: string
): { status: ArticleStatus; category: string } | null {
  const relativePath = normalizePath(filePath)
    .replace(normalizePath(vaultPath), "")
    .replace(/^\//, "");

  const parts = relativePath.split("/");
  if (parts.length < 3 || !parts[2].endsWith(".md")) {
    return null;
  }

  const [statusFolder, category] = parts;

  if (!category) {
    return null;
  }

  const status =
    statusFolder === VaultDirs.PUBLISHED ? ArticleStatus.Published : ArticleStatus.Draft;

  return { status, category };
}
