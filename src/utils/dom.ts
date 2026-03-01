/**
 * DOM 安全工具函式
 *
 * 注意：本模組在 Renderer process（瀏覽器環境）中運行。
 * 所有需要在 v-html 使用的字串必須先經過 escapeHtml() 處理。
 */

/**
 * 將字串中的 HTML 特殊字元轉為 HTML entities，防止 XSS 注入。
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 在已 escape 的文字中以 `<mark>` 標籤標示搜尋關鍵字。
 * 對 v-html 安全：先 escape 特殊字元，再插入受控的 mark 標籤。
 *
 * @param text    原始純文字（未 escape）
 * @param keyword 搜尋關鍵字（不限制 regex 特殊字元，內部自動跳脫）
 * @returns 安全的 HTML 字串，可直接用於 v-html
 *
 * @example
 * highlightKeyword('<script>', 'script')
 * // → '&lt;<mark ...>script</mark>&gt;'
 */
export function highlightKeyword(text: string, keyword: string): string {
  // escape 必須在 early return 之前，確保空 keyword 時也能安全注入 v-html
  const escaped = escapeHtml(text);
  if (!keyword.trim()) {
    return escaped;
  }
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(`(${escapedKeyword})`, "gi"), '<mark class="bg-warning text-warning-content rounded px-0.5">$1</mark>');
}
