import * as Sentry from "@sentry/electron/main"
import { AIProviderFactory } from "./AIProvider/AIProviderFactory.js"
import { AIError, AIErrorCode } from "./AIProvider/types.js"
import type { SEOGenerationInput, SEOGenerationResult } from "./AIProvider/types.js"
import type { AIProviderName } from "./AIProvider/AIProviderFactory.js"
import type { ConfigService } from "./ConfigService.js"

export type { AIProviderName }

export class AIService {
  constructor(private configService: ConfigService) {}

  async generateSEO(input: SEOGenerationInput, provider?: AIProviderName): Promise<SEOGenerationResult> {
    const activeProvider = provider ?? this.resolveProvider()
    if (!activeProvider) {
      throw new AIError(AIErrorCode.KeyMissing, "請先在設定中輸入 Claude、Gemini 或 OpenAI API Key")
    }

    const key = this.configService.getApiKey(activeProvider)
    if (!key) {
      const names: Record<AIProviderName, string> = { claude: "Claude", gemini: "Gemini", openai: "OpenAI" }
      throw new AIError(AIErrorCode.KeyMissing, `${names[activeProvider]} API Key 未設定`)
    }

    const providerInstance = AIProviderFactory.create(activeProvider, key)

    try {
      return await providerInstance.generateSEO(input)
    } catch (e) {
      if (e instanceof AIError) {
        // TOKEN6-05: 各 Provider 負責將 SDK 例外轉為 AIError，AIService 不再處理原始 SDK 例外
        // ClaudeProvider/GeminiProvider/OpenAIProvider 均已在內部完整轉換
        Sentry.captureException(e, { tags: { ai_error_code: e.code } })
        throw e
      }
      const apiError = new AIError(AIErrorCode.ApiError, String(e))
      Sentry.captureException(apiError, { tags: { ai_error_code: apiError.code } })
      throw apiError
    }
  }

  /** 自動選擇有 Key 的 provider（優先順序：Claude → Gemini → OpenAI） */
  resolveProvider(): AIProviderName | null {
    if (this.configService.hasApiKey("claude")) { return "claude" }
    if (this.configService.hasApiKey("gemini")) { return "gemini" }
    if (this.configService.hasApiKey("openai")) { return "openai" }
    return null
  }

  getActiveProvider(): AIProviderName | null {
    return this.resolveProvider()
  }
}

export { AIError, AIErrorCode }
export type { SEOGenerationInput, SEOGenerationResult }
