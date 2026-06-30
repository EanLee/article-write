import type { SEOGenerationInput } from "./types.js";

/** TOKEN6-02: 程式強制截斷上限，防止 input token 失控 */
const CONTENT_PREVIEW_MAX_CHARS = 300;

/**
 * 建立 SEO 生成 Prompt
 *
 * 三個 AI Provider（Claude、Gemini、OpenAI）共用同一份 Prompt，
 * 確保不同 Provider 間的輸出格式一致，並避免多份 prompt 同步更新的維護負擔。
 *
 * 安全措施：
 * - TOKEN6-01: contentPreview 以 XML 標籤包裹，防止 Prompt 注入攻擊
 * - TOKEN6-02: contentPreview 程式強制截斷至 300 字元
 *
 * @param input - SEO 生成所需的文章資訊
 * @returns 格式化好的 Prompt 字串
 */
export function buildSEOPrompt(input: SEOGenerationInput): string {
  // TOKEN6-02: 程式強制截斷，不依賴 types.ts 的注解約定
  const safePreview = input.contentPreview.slice(0, CONTENT_PREVIEW_MAX_CHARS);

  // TOKEN6-01: XML 邊界標記隔離使用者內容，防止注入指令逃逸
  return `你是一位 SEO 專家。根據以下文章資訊，生成 SEO 相關資料。

文章標題：${input.title}
${input.existingSlug ? `現有 Slug：${input.existingSlug}` : ""}
<article_content>
${safePreview}
</article_content>

請用 JSON 格式回覆，包含以下欄位：
- slug: URL 友善的文章識別碼（英文小寫，以連字符分隔，不超過 60 字元）
- metaDescription: Meta 描述（繁體中文，不超過 160 字元）
- keywords: 關鍵字陣列（5-7 個繁體中文關鍵字）

只回覆 JSON，不要其他說明文字。`;
}
