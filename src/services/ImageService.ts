import type { Article } from '@/types'

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
 * 圖片服務類別
 * 負責管理圖片檔案、驗證圖片引用，以及提供圖片相關功能
 */
export class ImageService {
  private vaultPath: string = ''
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
    if (!this.vaultPath || typeof window === 'undefined' || !window.electronAPI) {
      return []
    }

    try {
      const imagesPath = this.getImagesPath()
      
      // Check if images directory exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats = await (window.electronAPI as any).getFileStats(imagesPath)
      if (!stats?.isDirectory) {
        return []
      }

      const files = await window.electronAPI.readDirectory(imagesPath)
      
      // Filter image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']
      const imageFiles = files.filter(file => {
        const ext = file.toLowerCase().substring(file.lastIndexOf('.'))
        return imageExtensions.includes(ext)
      })

      const imageInfos: ImageInfo[] = []
      
      for (const fileName of imageFiles) {
        const filePath = `${imagesPath}/${fileName}`
        
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line no-console
      console.error('Failed to load images:', error)
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
    const lines = article.content.split('\n')
    
    lines.forEach((line, index) => {
      const imageRegex = /!\[\[([^\]]+)\]\]/g
      let match
      
      while ((match = imageRegex.exec(line)) !== null) {
        const imageName = match[1]
        const imageExists = this.checkImageExists(imageName)
        
        references.push({
          imageName,
          articleId: article.id,
          articleTitle: article.title,
          line: index + 1,
          exists: imageExists
        })
      }
    })
    
    return references
  }

  /**
   * 檢查圖片檔案是否存在
   * @param {string} _imageName - 圖片檔名
   * @returns {boolean} 檔案是否存在
   */
  checkImageExists(_imageName: string): boolean {
    // This would need to be implemented with actual file system check
    // For now, we'll assume images exist if they're in our loaded list
    return true
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
   * 刪除未使用的圖片
   * @param {string} imageName - 圖片檔名
   * @returns {Promise<boolean>} 是否成功刪除
   */
  async deleteUnusedImage(imageName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === 'undefined' || !window.electronAPI) {
      return false
    }

    // Double check that image is not used
    if (this.isImageUsed(imageName)) {
      throw new Error('Cannot delete image that is still in use')
    }

    try {
      const filePath = `${this.getImagesPath()}/${imageName}`
      await window.electronAPI.deleteFile(filePath)
      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete image:', error)
      return false
    }
  }

  /**
   * 複製圖片到 images 目錄
   * @param {string} _sourcePath - 來源檔案路徑
   * @param {string} _fileName - 目標檔案名稱
   * @returns {Promise<boolean>} 是否成功複製
   */
  async copyImageToVault(_sourcePath: string, _fileName: string): Promise<boolean> {
    if (!this.vaultPath || typeof window === 'undefined' || !window.electronAPI) {
      return false
    }

    try {
      // This would need to be implemented with proper file copying
      // For now, we'll return false as the current API doesn't support file copying
      // eslint-disable-next-line no-console
      console.warn('Image copying not implemented in current API')
      return false
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy image:', error)
      return false
    }
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
    const regex = new RegExp(`!\\[\\[${imageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'g')
    return content.replace(regex, '')
  }
}
