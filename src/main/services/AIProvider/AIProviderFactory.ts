import { ClaudeProvider } from './ClaudeProvider.js'
import { GeminiProvider } from './GeminiProvider.js'
import { OpenAIProvider } from './OpenAIProvider.js'
import type { IAIProvider } from './types.js'

export type AIProviderName = 'claude' | 'gemini' | 'openai'

export class AIProviderFactory {
  static create(provider: AIProviderName, apiKey: string): IAIProvider {
    switch (provider) {
      case 'claude': return new ClaudeProvider(apiKey)
      case 'gemini': return new GeminiProvider(apiKey)
      case 'openai': return new OpenAIProvider(apiKey)
    }
  }
}
