import Anthropic from '@anthropic-ai/sdk'
import { ClaudeProvider } from './AIProvider/index.js'
import { AIError, AIErrorCode } from './AIProvider/types.js'
import type { SEOGenerationInput, SEOGenerationResult } from './AIProvider/types.js'
import type { ConfigService } from './ConfigService.js'

export class AIService {
  constructor(private configService: ConfigService) {}

  async generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult> {
    const key = this.configService.getApiKey('claude')
    if (!key) {
      throw new AIError(AIErrorCode.KeyMissing, 'Claude API Key 未設定，請至設定頁面輸入 API Key')
    }

    const provider = new ClaudeProvider(key)
    try {
      return await provider.generateSEO(input)
    } catch (e) {
      if (e instanceof AIError) {throw e}
      if (e instanceof Anthropic.APIConnectionTimeoutError) {
        throw new AIError(AIErrorCode.Timeout, '請求逾時，請稍後再試')
      }
      throw new AIError(AIErrorCode.ApiError, String(e))
    }
  }
}

export { AIError, AIErrorCode }
export type { SEOGenerationInput, SEOGenerationResult }
