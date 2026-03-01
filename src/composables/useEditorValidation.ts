/**
 * 編輯器驗證功能 Composable
 */
import { ref, type Ref } from "vue"
import type { SyntaxError } from "@/services/ObsidianSyntaxService"
import type { ImageValidationWarning } from "@/services/ImageService"
import { useObsidianSyntaxService, useMarkdownService, useImageService } from "./useServices"

export function useEditorValidation(contentRef: Ref<string>) {
  const obsidianSyntax = useObsidianSyntaxService()
  const markdownService = useMarkdownService()
  const imageService = useImageService()

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
    // Obsidian 語法驗證
    const obsidianErrors = obsidianSyntax.validateSyntax(contentRef.value)
    
    // Markdown 語法驗證
    const markdownErrors = markdownService.validateMarkdownSyntax(contentRef.value)

    // 圖片驗證
    const imageWarnings = await imageService.getImageValidationWarnings(contentRef.value)
    imageValidationWarnings.value = imageWarnings

    // 將圖片警告轉換為語法錯誤格式
    const imageErrors: SyntaxError[] = imageWarnings.map(warning => ({
      line: warning.line,
      column: warning.column,
      message: warning.message,
      type: warning.severity,
      suggestion: warning.suggestion
    }))

    // 合併所有驗證結果
    syntaxErrors.value = [
      ...obsidianErrors,
      ...markdownErrors.map((error) => ({
        line: error.line,
        column: 0,
        message: error.message,
        type: error.type as "error" | "warning",
        suggestion: ""
      })),
      ...imageErrors
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
