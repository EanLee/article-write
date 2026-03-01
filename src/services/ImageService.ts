import type { Article } from "@/types"

/**
 * 圖片資訊介面
 */
export interface ImageInfo {
  name: string
  path: string
  size: number
  lastModified: Date
  isUsed: boolean
  exists: boolean
  preview?: string
}

/**
 * 圖片引用資訊介面
 */
export interface ImageReference {
  imageName: string
  articleId: string
  articleTitle: string
  line: number
  exists: boolean
}

/**
 * 圖片驗證結果介面
 */
export interface ImageValidationResult {
  validImages: string[]
  invalidImages: string[]
  unusedImages: string[]
  totalImages: number
}

/**
 * 圖片驗證詳細結果介面
 */
export interface ImageValidationDetails {
  imageName: string
  exists: boolean
  isUsed: boolean
  referencedIn: string[]
  filePath?: string
  errorMessage?: string
}

/**
 * 圖片驗證警告介面
 */
export interface ImageValidationWarning {
  imageName: string
  line: number
  column: number
  type: "missing-file" | "invalid-format" | "broken-reference"
  message: string
  suggestion: string
  severity: "error" | "warning"
}

/**
 * 圖片服務類別
 * 負責管理圖片檔案、驗證圖片引用，以及提供圖片相關功能
 */
export class ImageService {
  private vaultPath: string = ""
  private articles: Article[] = []

  /**
   * 設定 Vault 路徑
   * @param {string} path - Obsidian Vault 路徑
   */
  setVaultPath(path: string): void {
    this.vaultPath = path
  }

  /**
   * 更新文章清單
   * @param {Article[]} articles - 文章陣列
   */
  updateArticles(articles: Article[]): void {
    this.articles = articles
  }

  /**
   * 取得圖片目錄路徑
   * @returns {string} 圖片目錄路徑
   */
  getImagesPath(): string {
    return `${this.vaultPath}/images`
  }

  /**
   * 掃描並載入所有圖片資訊
   * @returns {Promise<ImageInfo[]>} 圖片資訊陣列
   */
  async loadImages(): Promise<ImageInfo[]> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return []
    }

    try {
      const imagesPath = this.getImagesPath()
      
      // Check if images directory exists
       
      const stats = await (window.electronAPI as any).getFileStats(imagesPath)
      if (!stats?.isDirectory) {
        return []
      }

      const files = await window.electronAPI.readDirectory(imagesPath)
      
      // Filter image files
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"]
      const imageFiles = files.filter(file => {
        const ext = file.toLowerCase().substring(file.lastIndexOf("."))
        return imageExtensions.includes(ext)
      })

      const imageInfos: ImageInfo[] = []
      
      for (const fileName of imageFiles) {
        const filePath = `${imagesPath}/${fileName}`
        
        try {
           
          const fileStats = await (window.electronAPI as any).getFileStats(filePath)
          
          const imageInfo: ImageInfo = {
            name: fileName,
            path: filePath,
            size: 0, // File size not available from current API
            lastModified: fileStats?.mtime ? new Date(fileStats.mtime) : new Date(),
            isUsed: this.isImageUsed(fileName),
            exists: true,
            preview: `file://${filePath}`
          }
          
          imageInfos.push(imageInfo)
        } catch {
          // If we can't get stats, still include the image but mark as potentially problematic
          const imageInfo: ImageInfo = {
            name: fileName,
            path: filePath,
            size: 0,
            lastModified: new Date(),
            isUsed: this.isImageUsed(fileName),
            exists: false,
            preview: undefined
          }
          
          imageInfos.push(imageInfo)
        }
      }

      return imageInfos
    } catch (error) {
       
      console.error("Failed to load images:", error)
      return []
    }
  }

  /**
   * 檢查圖片是否被文章引用
   * @param {string} imageName - 圖片檔名
   * @returns {boolean} 是否被使用
   */
  isImageUsed(imageName: string): boolean {
    return this.articles.some(article => {
      const imageRegex = /!\[\[([^\]]+)\]\]/g
      let match
      while ((match = imageRegex.exec(article.content)) !== null) {
        if (match[1] === imageName) {
          return true
        }
      }
      return false
    })
  }

  /**
   * 取得文章中引用的所有圖片
   * @param {Article} article - 文章物件
   * @returns {ImageReference[]} 圖片引用陣列
   */
  getArticleImageReferences(article: Article): ImageReference[] {
    const references: ImageReference[] = []
    const lines = article.content.split("\n")
    
    lines.forEach((line, index) => {
      // Obsidian 格式圖片: ![[image.png]]
      const obsidianImageRegex = /!\[\[([^\]]+)\]\]/g
      let match
      
      while ((match = obsidianImageRegex.exec(line)) !== null) {
        const imageName = match[1]
        
        references.push({
          imageName,
          articleId: article.id,
          articleTitle: article.title,
          line: index + 1,
          exists: false // Will be updated by validation methods
        })
      }

      // 標準 Markdown 格式圖片: ![alt](path)
      const standardImageRegex = /!\[.*?\]\(([^)]+)\)/g
      while ((match = standardImageRegex.exec(line)) !== null) {
        const imagePath = match[1]
        // 提取檔名（如果是相對路徑）
        const imageName = imagePath.includes("/") ? imagePath.split("/").pop() || imagePath : imagePath
        
        references.push({
          imageName,
          articleId: article.id,
          articleTitle: article.title,
          line: index + 1,
          exists: false // Will be updated by validation methods
        })
      }
    })
    
    return references
  }

  /**
   * 檢查圖片檔案是否存在
   * @param {string} imageName - 圖片檔名
   * @returns {Promise<boolean>} 檔案是否存在
   */
  async checkImageExists(imageName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return false
    }

    try {
      const filePath = `${this.getImagesPath()}/${imageName}`
       
      const stats = await (window.electronAPI as any).getFileStats(filePath)
      return stats && stats.isFile
    } catch {
      return false
    }
  }

  /**
   * 批量檢查多個圖片檔案是否存在
   * @param {string[]} imageNames - 圖片檔名陣列
   * @returns {Promise<Map<string, boolean>>} 圖片存在性對照表
   */
  async checkMultipleImagesExist(imageNames: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const imageName of imageNames) {
      const exists = await this.checkImageExists(imageName)
      results.set(imageName, exists)
    }
    
    return results
  }

  /**
   * 驗證所有圖片引用
   * @returns {Promise<ImageValidationResult>} 驗證結果
   */
  async validateImageReferences(): Promise<ImageValidationResult> {
    const allImages = await this.loadImages()
    const validImages: string[] = []
    const invalidImages: string[] = []
    const unusedImages: string[] = []

    // Check each image
    for (const image of allImages) {
      if (image.exists) {
        if (image.isUsed) {
          validImages.push(image.name)
        } else {
          unusedImages.push(image.name)
        }
      } else {
        invalidImages.push(image.name)
      }
    }

    // Check for referenced images that don't exist
    for (const article of this.articles) {
      const references = this.getArticleImageReferences(article)
      for (const ref of references) {
        if (!ref.exists && !invalidImages.includes(ref.imageName)) {
          invalidImages.push(ref.imageName)
        }
      }
    }

    return {
      validImages,
      invalidImages,
      unusedImages,
      totalImages: allImages.length
    }
  }

  /**
   * 取得詳細的圖片驗證結果
   * @returns {Promise<ImageValidationDetails[]>} 詳細驗證結果
   */
  async getDetailedImageValidation(): Promise<ImageValidationDetails[]> {
    const results: ImageValidationDetails[] = []
    const referencedImages = new Set<string>()
    const imageReferences = new Map<string, string[]>()

    // 收集所有被引用的圖片
    for (const article of this.articles) {
      const references = this.getArticleImageReferences(article)
      for (const ref of references) {
        referencedImages.add(ref.imageName)
        
        if (!imageReferences.has(ref.imageName)) {
          imageReferences.set(ref.imageName, [])
        }
        imageReferences.get(ref.imageName)!.push(article.title)
      }
    }

    // 檢查所有被引用的圖片
    for (const imageName of referencedImages) {
      const exists = await this.checkImageExists(imageName)
      const referencedIn = imageReferences.get(imageName) || []
      
      results.push({
        imageName,
        exists,
        isUsed: true,
        referencedIn,
        filePath: exists ? `${this.getImagesPath()}/${imageName}` : undefined,
        errorMessage: exists ? undefined : "圖片檔案不存在"
      })
    }

    // 檢查未被引用的圖片
    const allImages = await this.loadImages()
    for (const image of allImages) {
      if (!referencedImages.has(image.name)) {
        results.push({
          imageName: image.name,
          exists: image.exists,
          isUsed: false,
          referencedIn: [],
          filePath: image.path,
          errorMessage: undefined
        })
      }
    }

    return results.sort((a, b) => a.imageName.localeCompare(b.imageName))
  }

  /**
   * 驗證特定文章中的圖片引用
   * @param {Article} article - 要驗證的文章
   * @returns {Promise<ImageValidationDetails[]>} 該文章的圖片驗證結果
   */
  async validateArticleImages(article: Article): Promise<ImageValidationDetails[]> {
    const references = this.getArticleImageReferences(article)
    const results: ImageValidationDetails[] = []

    for (const ref of references) {
      const exists = await this.checkImageExists(ref.imageName)
      
      results.push({
        imageName: ref.imageName,
        exists,
        isUsed: true,
        referencedIn: [article.title],
        filePath: exists ? `${this.getImagesPath()}/${ref.imageName}` : undefined,
        errorMessage: exists ? undefined : "圖片檔案不存在"
      })
    }

    return results
  }

  /**
   * 取得文章內容中的圖片驗證警告
   * @param {string} content - 文章內容
   * @returns {Promise<ImageValidationWarning[]>} 圖片驗證警告陣列
   */
  async getImageValidationWarnings(content: string): Promise<ImageValidationWarning[]> {
    const warnings: ImageValidationWarning[] = []
    const lines = content.split("\n")
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      
      // 檢查 Obsidian 格式圖片: ![[image.png]]
      const obsidianImageRegex = /!\[\[([^\]]+)\]\]/g
      let match
      
      while ((match = obsidianImageRegex.exec(line)) !== null) {
        const imageName = match[1]
        const exists = await this.checkImageExists(imageName)
        
        if (!exists) {
          warnings.push({
            imageName,
            line: lineIndex + 1,
            column: match.index + 1,
            type: "missing-file",
            message: `圖片檔案 "${imageName}" 不存在`,
            suggestion: "請檢查圖片檔案是否存在於 images 資料夾中",
            severity: "error"
          })
        } else if (!this.isImageFile(imageName)) {
          warnings.push({
            imageName,
            line: lineIndex + 1,
            column: match.index + 1,
            type: "invalid-format",
            message: `"${imageName}" 不是有效的圖片格式`,
            suggestion: "支援的格式: .jpg, .jpeg, .png, .gif, .bmp, .svg, .webp",
            severity: "warning"
          })
        }
      }

      // 檢查標準 Markdown 格式圖片: ![alt](path)
      const standardImageRegex = /!\[.*?\]\(([^)]+)\)/g
      while ((match = standardImageRegex.exec(line)) !== null) {
        const imagePath = match[1]
        // 如果是相對路徑且指向 images 目錄，進行驗證
        if (imagePath.includes("images/") || imagePath.startsWith("./images/")) {
          const imageName = imagePath.split("/").pop() || imagePath
          const exists = await this.checkImageExists(imageName)
          
          if (!exists) {
            warnings.push({
              imageName,
              line: lineIndex + 1,
              column: match.index + 1,
              type: "missing-file",
              message: `圖片檔案 "${imageName}" 不存在`,
              suggestion: "請檢查圖片檔案是否存在於 images 資料夾中",
              severity: "error"
            })
          }
        }
      }
    }
    
    return warnings
  }

  /**
   * 檢查檔案名稱是否為有效的圖片格式
   * @param {string} filename - 檔案名稱
   * @returns {boolean} 是否為有效的圖片格式
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".avif"]
    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."))
    return imageExtensions.includes(ext)
  }

  /**
   * 刪除未使用的圖片
   * @param {string} imageName - 圖片檔名
   * @returns {Promise<boolean>} 是否成功刪除
   */
  async deleteUnusedImage(imageName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return false
    }

    // Double check that image is not used
    if (this.isImageUsed(imageName)) {
      throw new Error("Cannot delete image that is still in use")
    }

    try {
      const filePath = `${this.getImagesPath()}/${imageName}`
      await window.electronAPI.deleteFile(filePath)
      return true
    } catch (error) {
       
      console.error("Failed to delete image:", error)
      return false
    }
  }

  /**
   * 複製圖片到 images 目錄
   * @param {string} sourcePath - 來源檔案路徑
   * @param {string} fileName - 目標檔案名稱
   * @returns {Promise<boolean>} 是否成功複製
   */
  async copyImageToVault(sourcePath: string, fileName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return false
    }

    try {
      const targetPath = `${this.getImagesPath()}/${fileName}`
      
      // Use Electron API to copy file
      await (window.electronAPI as any).copyFile(sourcePath, targetPath)
      return true
    } catch (error) {
       
      console.error("Failed to copy image:", error)
      return false
    }
  }

  /**
   * 上傳圖片檔案到 images 目錄
   * @param {File} file - 要上傳的檔案
   * @param {string} customName - 自訂檔案名稱（可選）
   * @returns {Promise<string>} 上傳後的檔案名稱
   */
  async uploadImageFile(file: File, customName?: string): Promise<string> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      throw new Error("Vault path not set or Electron API not available")
    }

    // Validate file type
    if (!this.isImageFile(file.name)) {
      throw new Error("Invalid image file format")
    }

    // Generate unique filename
    const fileName = customName || this.generateUniqueFileName(file.name)
    const targetPath = `${this.getImagesPath()}/${fileName}`

    try {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      // Write file using Electron API
      await (window.electronAPI as any).writeFileBuffer(targetPath, buffer)
      
      return fileName
    } catch (error) {
       
      console.error("Failed to upload image:", error)
      throw new Error(`Failed to upload image: ${(error as Error).message}`)
    }
  }

  /**
   * 產生唯一的檔案名稱
   * @param {string} originalName - 原始檔案名稱
   * @returns {string} 唯一的檔案名稱
   */
  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const extension = originalName.substring(originalName.lastIndexOf("."))
    const baseName = originalName.substring(0, originalName.lastIndexOf("."))
    
    return `${baseName}-${timestamp}-${randomSuffix}${extension}`
  }

  /**
   * 清理未使用的圖片檔案
   * @returns {Promise<string[]>} 被清理的檔案名稱陣列
   */
  async cleanupUnusedImages(): Promise<string[]> {
    if (!this.vaultPath || typeof window === "undefined" || !window.electronAPI) {
      return []
    }

    try {
      const allImages = await this.loadImages()
      const unusedImages = allImages.filter(image => !image.isUsed)
      const cleanedFiles: string[] = []

      for (const image of unusedImages) {
        try {
          await window.electronAPI.deleteFile(image.path)
          cleanedFiles.push(image.name)
        } catch (error) {
           
          console.warn(`Failed to delete unused image ${image.name}:`, error)
        }
      }

      return cleanedFiles
    } catch (error) {
       
      console.error("Failed to cleanup unused images:", error)
      return []
    }
  }

  /**
   * 取得未使用的圖片清單
   * @returns {Promise<ImageInfo[]>} 未使用的圖片陣列
   */
  async getUnusedImages(): Promise<ImageInfo[]> {
    const allImages = await this.loadImages()
    return allImages.filter(image => !image.isUsed)
  }

  /**
   * 批量刪除圖片檔案
   * @param {string[]} imageNames - 要刪除的圖片檔案名稱陣列
   * @returns {Promise<{ success: string[], failed: string[] }>} 刪除結果
   */
  async batchDeleteImages(imageNames: string[]): Promise<{ success: string[], failed: string[] }> {
    const success: string[] = []
    const failed: string[] = []

    for (const imageName of imageNames) {
      try {
        const deleteSuccess = await this.deleteUnusedImage(imageName)
        if (deleteSuccess) {
          success.push(imageName)
        } else {
          failed.push(imageName)
        }
      } catch {
        failed.push(imageName)
      }
    }

    return { success, failed }
  }

  /**
   * 產生圖片的 Obsidian 引用語法
   * @param {string} imageName - 圖片檔名
   * @returns {string} Obsidian 引用語法
   */
  generateImageReference(imageName: string): string {
    return `![[${imageName}]]`
  }

  /**
   * 從文章內容中移除圖片引用
   * @param {string} content - 文章內容
   * @param {string} imageName - 要移除的圖片檔名
   * @returns {string} 移除引用後的內容
   */
  removeImageReference(content: string, imageName: string): string {
    const regex = new RegExp(`!\\[\\[${imageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]`, "g")
    return content.replace(regex, "")
  }
}
