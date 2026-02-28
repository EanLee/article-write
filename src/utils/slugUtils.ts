/**
 * slugUtils - 統一的 Slug 生成工具
 *
 * 修復問題：generateSlug 邏輯原本分散於 3 個服務中，各有細微差異
 * - ArticleService.generateSlug()
 * - FileScannerService.generateSlug()（缺少 .trim()）
 * - MarkdownService.generateSlugFromTitle()（丟棄中文字元）
 *
 * 統一至此處，所有服務改引用這個函式。
 */

/**
 * 從標題產生 URL-safe slug
 *
 * @param title - 文章標題（支援英文、注音以外的拉丁字元）
 * @returns kebab-case slug，例如 "hello-world"
 *
 * @example
 * generateSlug("Hello World!")  // → "hello-world"
 * generateSlug("  Vue 3 Tips  ")  // → "vue-3-tips"
 * generateSlug("TypeScript & React")  // → "typescript-react"
 */
export function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // 移除非 ASCII 字元（包含中文）
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, ''); // 移除前後多餘的 -
}

/**
 * 從標題產生 slug，若無法生成有效 slug 則使用備用值
 *
 * @param title - 文章標題
 * @param fallback - 當標題全為非 ASCII 字元時的備用 slug（例如檔案名）
 * @returns slug 或備用值
 */
export function generateSlugWithFallback(title: string, fallback: string): string {
  const slug = generateSlug(title);
  return slug || generateSlug(fallback) || 'untitled';
}
