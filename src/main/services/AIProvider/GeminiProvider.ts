import { GoogleGenAI } from '@google/genai'
import type { IAIProvider, SEOGenerationInput, SEOGenerationResult } from './types.js'
import { AIError, AIErrorCode } from './types.js'

export class GeminiProvider implements IAIProvider {
  private client: GoogleGenAI

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult> {
    const prompt = `你是一位 SEO 專家。根據以下文章資訊，生成 SEO 相關資料。

文章標題：${input.title}
文章內容預覽：${input.contentPreview}
${input.existingSlug ? `現有 Slug：${input.existingSlug}` : ''}

請用 JSON 格式回覆，包含以下欄位：
- slug: URL 友善的文章識別碼（英文小寫，以連字符分隔，不超過 60 字元）
- metaDescription: Meta 描述（繁體中文，不超過 160 字元）
- keywords: 關鍵字陣列（5-7 個繁體中文關鍵字）

只回覆 JSON，不要其他說明文字。範例：
{"slug":"my-article-title","metaDescription":"文章的簡短描述...","keywords":["關鍵字1","關鍵字2","關鍵字3","關鍵字4","關鍵字5"]}`

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { maxOutputTokens: 400 },
      })

      const text = (response.text ?? '').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new AIError(AIErrorCode.ApiError, '無法解析 JSON 回應')
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        slug?: string
        metaDescription?: string
        keywords?: string[]
      }

      if (!parsed.slug || !parsed.metaDescription || !Array.isArray(parsed.keywords)) {
        throw new AIError(AIErrorCode.ApiError, 'JSON 欄位不完整')
      }

      return {
        slug: parsed.slug,
        metaDescription: parsed.metaDescription.slice(0, 160),
        keywords: parsed.keywords.slice(0, 7)
      }
    } catch (e) {
      if (e instanceof AIError) { throw e }
      throw new AIError(AIErrorCode.ApiError, String(e))
    }
  }
}
