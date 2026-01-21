/**
 * 服務單例管理
 * 
 * 提供應用中共用的服務實例，避免重複創建
 */

import { MarkdownService } from '@/services/MarkdownService'
import { ObsidianSyntaxService } from '@/services/ObsidianSyntaxService'
import { PreviewService } from '@/services/PreviewService'
import { ImageService } from '@/services/ImageService'

// 服務單例實例
let markdownServiceInstance: MarkdownService | null = null
let obsidianSyntaxServiceInstance: ObsidianSyntaxService | null = null
let previewServiceInstance: PreviewService | null = null
let imageServiceInstance: ImageService | null = null

/**
 * 取得 MarkdownService 單例
 */
export function useMarkdownService(): MarkdownService {
  if (!markdownServiceInstance) {
    markdownServiceInstance = new MarkdownService()
  }
  return markdownServiceInstance
}

/**
 * 取得 ObsidianSyntaxService 單例
 */
export function useObsidianSyntaxService(): ObsidianSyntaxService {
  if (!obsidianSyntaxServiceInstance) {
    obsidianSyntaxServiceInstance = new ObsidianSyntaxService()
  }
  return obsidianSyntaxServiceInstance
}

/**
 * 取得 PreviewService 單例
 */
export function usePreviewService(): PreviewService {
  if (!previewServiceInstance) {
    previewServiceInstance = new PreviewService()
  }
  return previewServiceInstance
}

/**
 * 取得 ImageService 單例
 */
export function useImageService(): ImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new ImageService()
  }
  return imageServiceInstance
}

/**
 * 取得所有服務（便捷方法）
 */
export function useServices() {
  return {
    markdownService: useMarkdownService(),
    obsidianSyntaxService: useObsidianSyntaxService(),
    previewService: usePreviewService(),
    imageService: useImageService()
  }
}

/**
 * 重設所有服務實例（主要用於測試）
 */
export function resetServices(): void {
  markdownServiceInstance = null
  obsidianSyntaxServiceInstance = null
  previewServiceInstance = null
  imageServiceInstance = null
}
