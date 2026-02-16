import Anthropic from '@anthropic-ai/sdk'
import { ClaudeProvider, GeminiProvider } from './AIProvider/index.js'
import { AIError, AIErrorCode } from './AIProvider/types.js'
import type { SEOGenerationInput, SEOGenerationResult } from './AIProvider/types.js'
import type { ConfigService } from './ConfigService.js'

export type AIProvider = 'claude' | 'gemini'

export class AIService {
  constructor(private configService: ConfigService) {}

  async generateSEO(input: SEOGenerationInput, provider?: AIProvider): Promise<SEOGenerationResult> {
    const activeProvider = provider ?? this.resolveProvider()
    if (!activeProvider) {
      throw new AIError(AIErrorCode.KeyMissing, '請先在設定中輸入 Claude 或 Gemini API Key')
    }

    const key = this.configService.getApiKey(activeProvider)
    if (!key) {
      throw new AIError(AIErrorCode.KeyMissing, `${activeProvider === 'claude' ? 'Claude' : 'Gemini'} API Key 未設定`)
    }

    const providerInstance = activeProvider === 'gemini'
      ? new GeminiProvider(key)
      : new ClaudeProvider(key)

    try {
      return await providerInstance.generateSEO(input)
    } catch (e) {
      if (e instanceof AIError) { throw e }
      if (e instanceof Anthropic.APIConnectionTimeoutError) {
        throw new AIError(AIErrorCode.Timeout, '請求逾時，請稍後再試')
      }
      throw new AIError(AIErrorCode.ApiError, String(e))
    }
  }

  /** 自動選擇有 Key 的 provider（優先 Claude） */
  resolveProvider(): AIProvider | null {
    if (this.configService.hasApiKey('claude')) { return 'claude' }
    if (this.configService.hasApiKey('gemini')) { return 'gemini' }
    return null
  }

  getActiveProvider(): AIProvider | null {
    return this.resolveProvider()
  }
}

export { AIError, AIErrorCode }
export type { SEOGenerationInput, SEOGenerationResult }
