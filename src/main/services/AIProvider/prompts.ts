import type { SEOGenerationInput } from "./types.js";

/**
 * 建立 SEO 生成 Prompt
 *
 * 三個 AI Provider（Claude、Gemini、OpenAI）共用同一份 Prompt，
 * 確保不同 Provider 間的輸出格式一致，並避免多份 prompt 同步更新的維護負擔。
 *
 * @param input - SEO 生成所需的文章資訊
 * @returns 格式化好的 Prompt 字串
 */
export function buildSEOPrompt(input: SEOGenerationInput): string {
  return `你是一位 SEO 專家。根據以下文章資訊，生成 SEO 相關資料。

文章標題：${input.title}
文章內容預覽：${input.contentPreview}
${input.existingSlug ? `現有 Slug：${input.existingSlug}` : ""}

請用 JSON 格式回覆，包含以下欄位：
- slug: URL 友善的文章識別碼（英文小寫，以連字符分隔，不超過 60 字元）
- metaDescription: Meta 描述（繁體中文，不超過 160 字元）
- keywords: 關鍵字陣列（5-7 個繁體中文關鍵字）

只回覆 JSON，不要其他說明文字。範例：
{"slug":"my-article-title","metaDescription":"文章的簡短描述...","keywords":["關鍵字1","關鍵字2","關鍵字3","關鍵字4","關鍵字5"]}`;
}
