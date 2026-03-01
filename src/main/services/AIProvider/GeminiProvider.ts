import { GoogleGenAI } from "@google/genai";
import type { IAIProvider, SEOGenerationInput, SEOGenerationResult } from "./types.js";
import { AIError, AIErrorCode } from "./types.js";
import { buildSEOPrompt } from "./prompts.js";

export class GeminiProvider implements IAIProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult> {
    const prompt = buildSEOPrompt(input);

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { maxOutputTokens: 400 },
      });

      const text = (response.text ?? "").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIError(AIErrorCode.ApiError, "無法解析 JSON 回應");
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        slug?: string;
        metaDescription?: string;
        keywords?: string[];
      };

      if (!parsed.slug || !parsed.metaDescription || !Array.isArray(parsed.keywords)) {
        throw new AIError(AIErrorCode.ApiError, "JSON 欄位不完整");
      }

      return {
        slug: parsed.slug,
        metaDescription: parsed.metaDescription.slice(0, 160),
        keywords: parsed.keywords.slice(0, 7),
      };
    } catch (e) {
      if (e instanceof AIError) {
        throw e;
      }
      // TOKEN6-04: Rate Limit / context 超限處理
      const errMsg = String(e)
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate")) {
        throw new AIError(AIErrorCode.RateLimit, "請求過於頻繁，請稍後再試")
      }
      if (errMsg.toLowerCase().includes("too long") || errMsg.toLowerCase().includes("token")) {
        throw new AIError(AIErrorCode.ContextTooLong, "文章內容過長，無法處理")
      }
      throw new AIError(AIErrorCode.ApiError, String(e));
    }
  }
}
