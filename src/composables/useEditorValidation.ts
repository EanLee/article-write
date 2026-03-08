/**
 * 編輯器驗證功能 Composable
 */
import { ref, type Ref } from "vue"
import type { SyntaxError } from "@/services/ObsidianSyntaxService"
import type { ImageValidationWarning } from "@/types/image"
import { useObsidianSyntaxService, useMarkdownService, useImageService } from "./useServices"
import { useConfigStore } from "@/stores/config"

export function useEditorValidation(contentRef: Ref<string>) {
  const obsidianSyntax = useObsidianSyntaxService()
  const markdownService = useMarkdownService()
  const imageService = useImageService()
  const configStore = useConfigStore()

  // 驗證狀態
  const syntaxErrors = ref<SyntaxError[]>([])
  const imageValidationWarnings = ref<ImageValidationWarning[]>([])

  // 防抖計時器
  let validationTimeout: number | null = null

  /**
   * 防抖驗證
   */
  function debounceValidation(delay = 500) {
    if (validationTimeout) {
      clearTimeout(validationTimeout)
    }

    validationTimeout = setTimeout(() => {
      validateSyntax()
    }, delay) as unknown as number
  }

  /**
   * 執行語法驗證
   */
  async function validateSyntax() {
    // 同步 vault 路徑與圖片目錄，確保 ImageService 能正確查詢圖片是否存在
    const vaultPath = configStore.config.paths.articlesDir
    if (vaultPath) {
      imageService.setVaultPath(vaultPath)
      // 優先使用使用者設定的 imagesDir，未設定時 ImageService 內部回退到 vaultPath/images
      imageService.setImagesPath(configStore.config.paths.imagesDir)
    }

    // Obsidian 語法驗證
    const obsidianErrors = obsidianSyntax.validateSyntax(contentRef.value)
    
    // Markdown 語法驗證
    const markdownErrors = markdownService.validateMarkdownSyntax(contentRef.value)

    // 圖片驗證（只在有 vault 路徑時執行，避免假陽性）
    const imageWarnings = vaultPath
      ? await imageService.getImageValidationWarnings(contentRef.value)
      : []
    imageValidationWarnings.value = imageWarnings

    // 合併語法驗證結果（不包含圖片警告，圖片警告已由 imageValidationWarnings 獨立顯示）
    syntaxErrors.value = [
      ...obsidianErrors,
      ...markdownErrors.map((error) => ({
        line: error.line,
        column: 0,
        message: error.message,
        type: error.type as "error" | "warning",
        suggestion: ""
      })),
    ]
  }

  /**
   * 清理計時器
   */
  function cleanup() {
    if (validationTimeout) {
      clearTimeout(validationTimeout)
      validationTimeout = null
    }
  }

  return {
    // 狀態
    syntaxErrors,
    imageValidationWarnings,
    
    // 方法
    validateSyntax,
    debounceValidation,
    cleanup
  }
}
