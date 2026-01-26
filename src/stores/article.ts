import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Article, ArticleFilter } from '@/types'
import { ArticleStatus, ArticleCategory, ArticleFilterStatus, ArticleFilterCategory } from '@/types'
import { useMarkdownService } from '@/composables/useServices'
import { autoSaveService } from '@/services/AutoSaveService'
import { notify } from '@/services/NotificationService'
import { useConfigStore } from './config'
import { getArticleService } from '@/services/ArticleService'

export const useArticleStore = defineStore('article', () => {
  // 使用服務單例
  const _markdownService = useMarkdownService()
  const articleService = getArticleService()
  const configStore = useConfigStore()

  // State
  const articles = ref<Article[]>([])
  const currentArticle = ref<Article | null>(null)
  const filter = ref<ArticleFilter>({
    status: ArticleFilterStatus.All,
    category: ArticleFilterCategory.All,
    tags: [],
    searchText: ''
  })
  const loading = ref(false)
  const watchingFiles = ref(false)

  // Getters
  const filteredArticles = computed(() => {
    return articles.value
      .filter(article => {
        // Status filter
        if (filter.value.status !== ArticleFilterStatus.All && article.status !== filter.value.status) {
          return false
        }

        // Category filter
        if (filter.value.category !== ArticleFilterCategory.All && article.category !== filter.value.category) {
          return false
        }

        // Tags filter
        if (filter.value.tags.length > 0) {
          const hasMatchingTag = filter.value.tags.some(tag => 
            article.frontmatter.tags && Array.isArray(article.frontmatter.tags) && article.frontmatter.tags.includes(tag)
          )
          if (!hasMatchingTag) {return false}
        }

        // Search text filter
        if (filter.value.searchText) {
          const searchLower = filter.value.searchText.toLowerCase()
          const titleMatch = article.title.toLowerCase().includes(searchLower)
          // 空內容安全處理：空字串的 toLowerCase().includes() 總是返回 false
          const contentMatch = (article.content || '').toLowerCase().includes(searchLower)
          if (!titleMatch && !contentMatch) {return false}
        }

        return true
      })
      .sort((a, b) => {
        // 按標題字母順序排序（穩定排序，不會因儲存而跳動）
        return a.title.localeCompare(b.title, 'zh-TW')
      })
  })

  // Debug: 監控 filteredArticles 重新計算
  watch(filteredArticles, (newArticles, oldArticles) => {
    console.log('📋 filteredArticles 重新計算:', {
      count: newArticles.length,
      titles: newArticles.map(a => a.title),
      changed: newArticles !== oldArticles
    })
  })

  const draftArticles = computed(() => 
    articles.value.filter(article => article.status === 'draft')
  )

  const publishedArticles = computed(() => 
    articles.value.filter(article => article.status === 'published')
  )

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    articles.value.forEach(article => {
      // 防禦性檢查：確保 tags 存在且為陣列
      if (article.frontmatter.tags && Array.isArray(article.frontmatter.tags)) {
        article.frontmatter.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  })

  // Actions
  async function loadArticles() {
    loading.value = true
    try {
      const vaultPath = configStore.config.paths.articlesDir
      if (!vaultPath) {
        console.warn('Obsidian vault path not configured')
        articles.value = []
        loading.value = false
        return
      }

      console.log('開始載入文章，Vault 路徑:', vaultPath)

      // Check if we're running in Electron environment
      if (typeof window === 'undefined' || !window.electronAPI) {
        console.warn('Running in browser mode - using mock articles')
        articles.value = []
        loading.value = false
        return
      }

      const loadedArticles: Article[] = []
      
      // Scan both Drafts and Publish folders
      const folders = [
        { path: `${vaultPath}/Drafts`, status: ArticleStatus.Draft },
        { path: `${vaultPath}/Publish`, status: ArticleStatus.Published }
      ]
      
      for (const folder of folders) {
        try {
          // Check if folder exists
          const stats = await window.electronAPI.getFileStats(folder.path)
          if (!stats?.isDirectory) {
            continue
          }
          
          // Read categories (Software, growth, management)
          const categories = await window.electronAPI.readDirectory(folder.path)
          
          for (const category of categories) {
            const categoryPath = `${folder.path}/${category}`
            const catStats = await window.electronAPI.getFileStats(categoryPath)
            if (!catStats?.isDirectory) {continue}
            
            // Read markdown files in category
            const files = await window.electronAPI.readDirectory(categoryPath)
            const mdFiles = files.filter(f => f.endsWith('.md'))
            
            for (const file of mdFiles) {
              const filePath = `${categoryPath}/${file}`
              try {
                const content = await window.electronAPI.readFile(filePath)
                const { frontmatter, content: articleContent } = _markdownService.parseMarkdown(content)
                
                // Get file stats for accurate lastModified time
                const fileStats = await window.electronAPI.getFileStats(filePath)
                const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date()
                
                // 決定文章分類：優先從 frontmatter.categories 取得，其次使用資料夾名稱
                let articleCategory: ArticleCategory
                if (frontmatter.categories && frontmatter.categories.length > 0) {
                  // 從 frontmatter.categories 陣列取第一個有效值
                  const firstCategory = frontmatter.categories[0]
                  if (Object.values(ArticleCategory).includes(firstCategory as ArticleCategory)) {
                    articleCategory = firstCategory as ArticleCategory
                  } else {
                    // 如果 categories 值不在 enum 中，使用資料夾名稱或預設值
                    articleCategory = (Object.values(ArticleCategory).includes(category as ArticleCategory) 
                      ? category 
                      : ArticleCategory.Software) as ArticleCategory
                  }
                } else {
                  // 沒有 frontmatter.categories，使用資料夾名稱或預設值
                  articleCategory = (Object.values(ArticleCategory).includes(category as ArticleCategory) 
                    ? category 
                    : ArticleCategory.Software) as ArticleCategory
                }
                
                const article: Article = {
                  id: generateId(),
                  title: frontmatter.title || file.replace('.md', ''),
                  slug: frontmatter.slug || file.replace('.md', ''),
                  filePath,
                  status: folder.status,
                  category: articleCategory,
                  lastModified,
                  content: articleContent,
                  frontmatter
                }
                
                loadedArticles.push(article)
              } catch (err) {
                console.warn(`Failed to load article ${filePath}:`, err)
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to scan ${folder.path}:`, err)
        }
      }
      
      articles.value = loadedArticles
      
      // Start watching for file changes if not already watching
      if (!watchingFiles.value) {
        startFileWatching()
      }
    } catch (error) {
      console.error('Failed to load articles:', error)
      // Don't throw error, just log it and continue with empty articles
      articles.value = []
    } finally {
      loading.value = false
    }
  }

  async function createArticle(title: string, category: ArticleCategory): Promise<Article> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const vaultPath = configStore.config.paths.articlesDir
      if (!vaultPath) {
        throw new Error('Obsidian vault path not configured')
      }

      const slug = generateSlug(title)
      const now = new Date()

      // Create directory structure
      const categoryPath = `${vaultPath}/Drafts/${category}`
      const filePath = `${categoryPath}/${slug}.md`

      // Ensure directory exists
      await window.electronAPI.createDirectory(categoryPath)

      const article: Article = {
        id: generateId(),
        title,
        slug,
        filePath,
        status: ArticleStatus.Draft,
        category,
        lastModified: now,
        content: '',
        frontmatter: {
          title,
          date: now.toISOString().split('T')[0],
          tags: [],
          categories: [category]
        }
      }

      // 使用 ArticleService 儲存新文章
      const result = await articleService.saveArticle(article, {
        skipConflictCheck: true // 新文章不需要檢查衝突
      })

      if (!result.success) {
        throw result.error || new Error('Failed to create article')
      }

      // 儲存成功，加入 store
      articles.value.push(article)
      notify.success('建立成功', `已建立「${title}」`)
      return article
    } catch (error) {
      console.error('Failed to create article:', error)
      notify.error('建立失敗', error instanceof Error ? error.message : '無法建立文章')
      throw error
    }
  }

  /**
   * 儲存文章到磁碟（使用 ArticleService）
   * 
   * ⚠️ 這個函數會執行實際的檔案寫入操作
   * 成功後會自動更新 store 狀態
   */
  async function saveArticle(article: Article) {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available')
      }

      // 更新 lastModified timestamp
      const articleToSave = {
        ...article,
        lastModified: new Date()
      }

      // 使用 ArticleService 儲存（包含備份、衝突檢測、檔案寫入）
      const result = await articleService.saveArticle(articleToSave)

      if (result.success) {
        // 儲存成功，更新 store 狀態
        updateArticle(articleToSave)
      } else if (result.conflict) {
        // 檔案衝突
        notify.warning(
          '檔案衝突',
          '檔案在外部被修改，建議重新載入',
          {
            action: {
              label: '重新載入',
              callback: () => reloadArticle(article.id)
            }
          }
        )
        throw new Error('File conflict detected')
      } else if (result.error) {
        throw result.error
      }
    } catch (error) {
      console.error('Failed to save article:', error)
      notify.error('儲存失敗', error instanceof Error ? error.message : '無法儲存文章')
      throw error
    }
  }

  /**
   * 更新文章狀態（僅記憶體中，不寫入檔案）
   * 
   * ⚠️ 這個函數只更新 store 狀態，不會寫入檔案
   * 如需儲存到磁碟，請使用 saveArticle()
   */
  function updateArticle(updatedArticle: Article) {
    const index = articles.value.findIndex(a => a.id === updatedArticle.id)
    if (index !== -1) {
      articles.value[index] = { ...updatedArticle }
    }
    
    // 如果更新的是當前文章，也更新 currentArticle
    if (currentArticle.value?.id === updatedArticle.id) {
      currentArticle.value = { ...updatedArticle }
    }
  }

  async function deleteArticle(id: string) {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const article = articles.value.find(a => a.id === id)
      if (!article) {
        throw new Error('Article not found')
      }

      // 使用 ArticleService 刪除文章（包含備份）
      await articleService.deleteArticle(article)

      // 從 store 移除
      const index = articles.value.findIndex(a => a.id === id)
      if (index !== -1) {
        articles.value.splice(index, 1)
        if (currentArticle.value?.id === id) {
          currentArticle.value = null
        }
      }

      notify.success('刪除成功', `已刪除「${article.title}」`)
    } catch (error) {
      console.error('Failed to delete article:', error)
      notify.error('刪除失敗', error instanceof Error ? error.message : '無法刪除文章')
      throw error
    }
  }

  async function moveToPublished(id: string) {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const article = articles.value.find(a => a.id === id)
      if (!article) {
        throw new Error('Article not found')
      }

      if (article.status === 'draft') {
        const vaultPath = configStore.config.paths.articlesDir
        if (!vaultPath) {
          throw new Error('Obsidian vault path not configured')
        }

        // Create new path
        const publishPath = `${vaultPath}/Publish/${article.category}`
        const newFilePath = `${publishPath}/${article.slug}.md`

        // Ensure publish directory exists
        await window.electronAPI.createDirectory(publishPath)

        // 使用 ArticleService 移動文章（包含備份和檔案操作）
        await articleService.moveArticle(article, newFilePath)

        // 更新 store 中的文章狀態
        article.status = ArticleStatus.Published
        article.filePath = newFilePath
        article.lastModified = new Date()

        notify.success('發布成功', `「${article.title}」已移至發布區`)
      }
    } catch (error) {
      console.error('Failed to move article to published:', error)
      notify.error('發布失敗', error instanceof Error ? error.message : '無法移動文章')
      throw error
    }
  }

  function setCurrentArticle(article: Article | null) {
    // 在切換文章前自動儲存前一篇文章
    const previousArticle = currentArticle.value
    if (previousArticle && previousArticle !== article) {
      autoSaveService.saveOnArticleSwitch(previousArticle)
    }
    
    currentArticle.value = article
    
    // 設定新的當前文章到自動儲存服務
    autoSaveService.setCurrentArticle(article)
  }

  function updateFilter(newFilter: Partial<ArticleFilter>) {
    filter.value = { ...filter.value, ...newFilter }
  }

  /**
   * Start watching for file system changes
   */
  let unsubscribeFileChange: (() => void) | null = null

  async function startFileWatching() {
    const vaultPath = configStore.config.paths.articlesDir
    if (!vaultPath || watchingFiles.value) { return }

    // Check if we're running in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI) {
      return
    }

    try {
      // 開始監聽 vault 資料夾
      await window.electronAPI.startFileWatching(vaultPath)
      
      // 訂閱檔案變更事件
      unsubscribeFileChange = window.electronAPI.onFileChange(async (data) => {
        await handleFileChange(data.event, data.path)
      })
      
      watchingFiles.value = true
    } catch (error) {
      console.error('Failed to start file watching:', error)
    }
  }
  
  async function handleFileChange(event: string, filePath: string) {
    const vaultPath = configStore.config.paths.articlesDir
    if (!vaultPath) {return}
    
    // 解析檔案路徑以取得狀態和分類
    const relativePath = filePath.replace(vaultPath, '').replace(/\\/g, '/')
    const parts = relativePath.split('/').filter(Boolean)
    
    // 預期格式：/Drafts|Publish/category/filename.md
    if (parts.length < 3) {return}
    
    const [statusFolder, category] = parts
    const status = statusFolder === 'Publish' ? 'published' : 'draft'
    
    if (!['Software', 'growth', 'management'].includes(category)) {return}
    
    switch (event) {
      case 'add':
      case 'change':
        await reloadArticleByPath(filePath, status as 'draft' | 'published', category as 'Software' | 'growth' | 'management')
        break
      case 'unlink':
        removeArticleByPath(filePath)
        break
    }
  }
  
  async function reloadArticleByPath(
    filePath: string,
    status: ArticleStatus,
    category: ArticleCategory
  ) {
    if (typeof window === 'undefined' || !window.electronAPI) {return}
    
    try {
      const content = await window.electronAPI.readFile(filePath)
      const { frontmatter, content: articleContent } = _markdownService.parseMarkdown(content)
      const fileStats = await window.electronAPI.getFileStats(filePath)
      const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date()
      
      const filename = filePath.split(/[/\\]/).pop()?.replace('.md', '') || ''
      
      // 檢查是否已存在
      const existingIndex = articles.value.findIndex(a => a.filePath === filePath)
      
      const article: Article = {
        id: existingIndex !== -1 ? articles.value[existingIndex].id : generateId(),
        title: frontmatter.title || filename,
        slug: filename,
        filePath,
        status,
        category,
        lastModified,
        content: articleContent,
        frontmatter
      }
      
      if (existingIndex !== -1) {
        // 更新現有文章
        articles.value[existingIndex] = article
        if (currentArticle.value?.filePath === filePath) {
          // 只在內容真正變更時通知（避免自己儲存觸發的變更）
          const timeDiff = Date.now() - lastModified.getTime()
          if (timeDiff > 2000) {
            notify.info('檔案已更新', '外部修改已同步')
          }
          currentArticle.value = article
        }
      } else {
        // 新增文章
        articles.value.push(article)
        notify.info('新增文章', `偵測到新文章：${article.title}`)
      }
    } catch (error) {
      console.warn(`Failed to reload article ${filePath}:`, error)
    }
  }
  
  function removeArticleByPath(filePath: string) {
    const index = articles.value.findIndex(a => a.filePath === filePath)
    if (index !== -1) {
      const article = articles.value[index]
      articles.value.splice(index, 1)
      if (currentArticle.value?.filePath === filePath) {
        currentArticle.value = null
      }
      notify.info('文章已移除', `偵測到文章被刪除：${article.title}`)
    }
  }

  /**
   * Stop watching for file system changes
   */
  async function stopFileWatching() {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return
    }
    
    try {
      // 取消訂閱檔案變更事件
      if (unsubscribeFileChange) {
        unsubscribeFileChange()
        unsubscribeFileChange = null
      }
      
      // 停止檔案監聽
      await window.electronAPI.stopFileWatching()
      watchingFiles.value = false
    } catch (error) {
      console.error('Failed to stop file watching:', error)
    }
  }

  /**
   * Reload a specific article from file system
   */
  async function reloadArticle(id: string) {
    const article = articles.value.find(a => a.id === id)
    if (!article) { return }

    if (typeof window === 'undefined' || !window.electronAPI) {
      return
    }

    try {
      const content = await window.electronAPI.readFile(article.filePath)
      const { frontmatter, content: articleContent } = _markdownService.parseMarkdown(content)
      const fileStats = await window.electronAPI.getFileStats(article.filePath)
      const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date()
      
      const reloadedArticle: Article = {
        ...article,
        title: frontmatter.title || article.title,
        content: articleContent,
        frontmatter,
        lastModified
      }
      
      const index = articles.value.findIndex(a => a.id === id)
      if (index !== -1) {
        articles.value[index] = reloadedArticle
        if (currentArticle.value?.id === id) {
          currentArticle.value = reloadedArticle
        }
      }
      
      notify.success('重新載入成功', `已重新載入「${reloadedArticle.title}」`)
    } catch (error) {
      console.error('Failed to reload article:', error)
      notify.error('重新載入失敗', '無法重新載入文章')
    }
  }

  /**
   * Save current article if it has changes
   */
  async function saveCurrentArticle() {
    if (currentArticle.value) {
      await saveArticle(currentArticle.value)
    }
  }

  // Helper functions
  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  // 初始化自動儲存服務
  function initializeAutoSave() {
    const config = configStore.config
    const interval = config.editorConfig.autoSaveInterval || 30000
    
    autoSaveService.initialize(
      saveArticle,  // ✅ 使用新的 saveArticle 函數（會寫入檔案）
      () => currentArticle.value,
      interval
    )
    
    // 根據設定啟用或停用自動儲存
    autoSaveService.setEnabled(config.editorConfig.autoSave)
  }

  // 監聽設定變更以更新自動儲存
  watch(
    () => configStore.config.editorConfig,
    (newConfig) => {
      autoSaveService.setEnabled(newConfig.autoSave)
      autoSaveService.setInterval(newConfig.autoSaveInterval || 30000)
    },
    { deep: true }
  )

  // 初始化自動儲存（延遲執行以確保 configStore 已載入）
  setTimeout(() => {
    initializeAutoSave()
  }, 100)

  return {
    // State
    articles,
    currentArticle,
    filter,
    loading,
    watchingFiles,
    
    // Getters
    filteredArticles,
    draftArticles,
    publishedArticles,
    allTags,
    
    // Actions
    loadArticles,
    createArticle,
    saveArticle,  // ✅ 新增：儲存文章到磁碟
    updateArticle,  // ⚠️ 注意：現在只更新 store 狀態，不寫檔案
    deleteArticle,
    moveToPublished,
    setCurrentArticle,
    updateFilter,
    startFileWatching,
    stopFileWatching,
    reloadArticle,
    saveCurrentArticle,
    initializeAutoSave
  }
})