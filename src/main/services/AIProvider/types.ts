export interface SEOGenerationInput {
  title: string
  contentPreview: string  // 前 300 字
  existingSlug?: string
}

export interface SEOGenerationResult {
  slug: string
  metaDescription: string  // ≤ 160 字
  keywords: string[]       // 5-7 個
}

export interface IAIProvider {
  generateSEO(input: SEOGenerationInput): Promise<SEOGenerationResult>
}

export enum AIErrorCode {
  KeyMissing = "AI_KEY_MISSING",
  Timeout = "AI_API_TIMEOUT",
  RateLimit = "AI_RATE_LIMIT",       // TOKEN6-04: 429 Too Many Requests
  ContextTooLong = "AI_CONTEXT_TOO_LONG",  // TOKEN6-04: 輸入超出模型上限
  ApiError = "AI_API_ERROR",
}

export class AIError extends Error {
  constructor(public code: AIErrorCode, message: string) {
    super(message)
    this.name = "AIError"
  }
}
