import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIError, AIErrorCode } from '../../src/main/services/AIProvider/types.js'

// Mock ConfigService
const mockGetApiKey = vi.fn()
const mockHasApiKey = vi.fn()
const mockConfigService = {
  getApiKey: mockGetApiKey,
  hasApiKey: mockHasApiKey
}

// Mock ClaudeProvider
const mockGenerateSEO = vi.fn()
vi.mock('../../src/main/services/AIProvider/ClaudeProvider.js', () => ({
  ClaudeProvider: class MockClaudeProvider {
    generateSEO = mockGenerateSEO
  }
}))

// Mock GeminiProvider
vi.mock('../../src/main/services/AIProvider/GeminiProvider.js', () => ({
  GeminiProvider: class MockGeminiProvider {
    generateSEO = mockGenerateSEO
  }
}))

// Mock @anthropic-ai/sdk
vi.mock('@anthropic-ai/sdk', () => ({
  default: {
    APIConnectionTimeoutError: class APIConnectionTimeoutError extends Error {
      constructor() {
        super('timeout')
      }
    }
  }
}))

import { AIService } from '../../src/main/services/AIService.js'

describe('AIService', () => {
  let aiService: AIService

  beforeEach(() => {
    vi.clearAllMocks()
    aiService = new AIService(mockConfigService as any)
  })

  it('API Key 未設定時拋出 AIErrorCode.KeyMissing', async () => {
    mockHasApiKey.mockReturnValue(false)

    await expect(
      aiService.generateSEO({ title: '測試', contentPreview: '內容' })
    ).rejects.toMatchObject({ code: AIErrorCode.KeyMissing })
  })

  it('正常生成 SEO 返回正確結構', async () => {
    mockGetApiKey.mockReturnValue('sk-ant-test')
    const mockResult = {
      slug: 'test-article',
      metaDescription: '測試文章描述',
      keywords: ['關鍵字1', '關鍵字2', '關鍵字3', '關鍵字4', '關鍵字5']
    }
    mockGenerateSEO.mockResolvedValue(mockResult)

    const result = await aiService.generateSEO({ title: '測試', contentPreview: '內容' }, 'claude')
    expect(result).toEqual(mockResult)
  })

  it('API 一般錯誤時拋出 AIErrorCode.ApiError', async () => {
    mockGetApiKey.mockReturnValue('sk-ant-test')
    mockGenerateSEO.mockRejectedValue(new Error('Network error'))

    await expect(
      aiService.generateSEO({ title: '測試', contentPreview: '內容' }, 'claude')
    ).rejects.toMatchObject({ code: AIErrorCode.ApiError })
  })

  it('AIError 直接向上傳遞', async () => {
    mockGetApiKey.mockReturnValue('sk-ant-test')
    const err = new AIError(AIErrorCode.Timeout, '請求逾時')
    mockGenerateSEO.mockRejectedValue(err)

    await expect(
      aiService.generateSEO({ title: '測試', contentPreview: '內容' }, 'claude')
    ).rejects.toMatchObject({ code: AIErrorCode.Timeout })
  })

  it('Gemini provider 正常生成 SEO', async () => {
    mockGetApiKey.mockReturnValue('AIza-test')
    const mockResult = {
      slug: 'test-article',
      metaDescription: '測試文章描述',
      keywords: ['關鍵字1', '關鍵字2', '關鍵字3', '關鍵字4', '關鍵字5']
    }
    mockGenerateSEO.mockResolvedValue(mockResult)

    const result = await aiService.generateSEO({ title: '測試', contentPreview: '內容' }, 'gemini')
    expect(result).toEqual(mockResult)
  })
})
