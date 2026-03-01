import Anthropic from "@anthropic-ai/sdk";
import type { IAIProvider, SEOGenerationInput, SEOGenerationResult } from "./types.js";
import { AIError, AIErrorCode } from "./types.js";
import { buildSEOPrompt } from "./prompts.js";

export class ClaudeProvider implements IAIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult> {
    const prompt = buildSEOPrompt(input);

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new AIError(AIErrorCode.ApiError, "回應格式錯誤");
      }

      const text = content.text.trim();
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
      if (e instanceof Anthropic.APIConnectionTimeoutError) {
        throw new AIError(AIErrorCode.Timeout, "請求逾時，請稍後再試");
      }
      throw new AIError(AIErrorCode.ApiError, String(e));
    }
  }
}
