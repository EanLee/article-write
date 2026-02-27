import Anthropic from '@anthropic-ai/sdk'
import { AIProviderFactory } from './AIProvider/AIProviderFactory.js'
import { AIError, AIErrorCode } from './AIProvider/types.js'
import type { SEOGenerationInput, SEOGenerationResult } from './AIProvider/types.js'
import type { AIProviderName } from './AIProvider/AIProviderFactory.js'
import type { ConfigService } from './ConfigService.js'

export type { AIProviderName }

export class AIService {
  constructor(private configService: ConfigService) {}

  async generateSEO(input: SEOGenerationInput, provider?: AIProviderName): Promise<SEOGenerationResult> {
    const activeProvider = provider ?? this.resolveProvider()
    if (!activeProvider) {
      throw new AIError(AIErrorCode.KeyMissing, '請先在設定中輸入 Claude、Gemini 或 OpenAI API Key')
    }

    const key = this.configService.getApiKey(activeProvider)
    if (!key) {
      const names: Record<AIProviderName, string> = { claude: 'Claude', gemini: 'Gemini', openai: 'OpenAI' }
      throw new AIError(AIErrorCode.KeyMissing, `${names[activeProvider]} API Key 未設定`)
    }

    const providerInstance = AIProviderFactory.create(activeProvider, key)

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

  /** 自動選擇有 Key 的 provider（優先順序：Claude → Gemini → OpenAI） */
  resolveProvider(): AIProviderName | null {
    if (this.configService.hasApiKey('claude')) { return 'claude' }
    if (this.configService.hasApiKey('gemini')) { return 'gemini' }
    if (this.configService.hasApiKey('openai')) { return 'openai' }
    return null
  }

  getActiveProvider(): AIProviderName | null {
    return this.resolveProvider()
  }
}

export { AIError, AIErrorCode }
export type { SEOGenerationInput, SEOGenerationResult }
