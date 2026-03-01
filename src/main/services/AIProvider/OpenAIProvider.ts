import OpenAI from "openai";
import type { IAIProvider, SEOGenerationInput, SEOGenerationResult } from "./types.js";
import { AIError, AIErrorCode } from "./types.js";
import { buildSEOPrompt } from "./prompts.js";

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult> {
    const prompt = buildSEOPrompt(input);

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      });

      const text = (response.choices[0]?.message?.content ?? "").trim();
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
      throw new AIError(AIErrorCode.ApiError, String(e));
    }
  }
}
