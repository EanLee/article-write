/**
 * 服務單例管理
 *
 * 提供應用中共用的服務實例，避免重複創建
 */

import { MarkdownService } from "@/services/MarkdownService"
import { ObsidianSyntaxService } from "@/services/ObsidianSyntaxService"
import { PreviewService } from "@/services/PreviewService"
import { ImageService } from "@/services/ImageService"

// 服務單例實例
let markdownServiceInstance: MarkdownService | null = null
let obsidianSyntaxServiceInstance: ObsidianSyntaxService | null = null
let previewServiceInstance: PreviewService | null = null
let imageServiceInstance: ImageService | null = null

export function useMarkdownService(): MarkdownService {
  markdownServiceInstance ??= new MarkdownService()
  return markdownServiceInstance
}

export function useObsidianSyntaxService(): ObsidianSyntaxService {
  obsidianSyntaxServiceInstance ??= new ObsidianSyntaxService()
  return obsidianSyntaxServiceInstance
}

export function usePreviewService(): PreviewService {
  previewServiceInstance ??= new PreviewService()
  return previewServiceInstance
}

export function useImageService(): ImageService {
  imageServiceInstance ??= new ImageService()
  return imageServiceInstance
}

export function useServices() {
  return {
    markdownService: useMarkdownService(),
    obsidianSyntaxService: useObsidianSyntaxService(),
    previewService: usePreviewService(),
    imageService: useImageService()
  }
}

export function resetServices(): void {
  markdownServiceInstance = null
  obsidianSyntaxServiceInstance = null
  previewServiceInstance = null
  imageServiceInstance = null
}
