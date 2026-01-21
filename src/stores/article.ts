import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Article, ArticleFilter } from '@/types'
import { MarkdownService } from '@/services/MarkdownService'
import { autoSaveService } from '@/services/AutoSaveService'
import { backupService } from '@/services/BackupService'
import { notify } from '@/services/NotificationService'
import { useConfigStore } from './config'

export const useArticleStore = defineStore('article', () => {
  // Services
  const _markdownService = new MarkdownService()
  const configStore = useConfigStore()

  // State
  const articles = ref<Article[]>([])
  const currentArticle = ref<Article | null>(null)
  const filter = ref<ArticleFilter>({
    status: 'all',
    category: 'all',
    tags: [],
    searchText: ''
  })
  const loading = ref(false)
  const watchingFiles = ref(false)

  // Getters
  const filteredArticles = computed(() => {
    return articles.value.filter(article => {
      // Status filter
      if (filter.value.status !== 'all' && article.status !== filter.value.status) {
        return false
      }

      // Category filter
      if (filter.value.category !== 'all' && article.category !== filter.value.category) {
        return false
      }

      // Tags filter
      if (filter.value.tags.length > 0) {
        const hasMatchingTag = filter.value.tags.some(tag => 
          article.frontmatter.tags.includes(tag)
        )
        if (!hasMatchingTag) {return false}
      }

      // Search text filter
      if (filter.value.searchText) {
        const searchLower = filter.value.searchText.toLowerCase()
        const titleMatch = article.title.toLowerCase().includes(searchLower)
        const contentMatch = article.content.toLowerCase().includes(searchLower)
        if (!titleMatch && !contentMatch) {return false}
      }

      return true
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
      article.frontmatter.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  })

  // Actions
  async function loadArticles() {
    loading.value = true
    try {
      const vaultPath = configStore.config.paths.obsidianVault
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
        { path: `${vaultPath}/Drafts`, status: 'draft' as const },
        { path: `${vaultPath}/Publish`, status: 'published' as const }
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
                
                const article: Article = {
                  id: generateId(),
                  title: frontmatter.title || file.replace('.md', ''),
                  slug: file.replace('.md', ''),
                  filePath,
                  status: folder.status,
                  category: category as 'Software' | 'growth' | 'management',
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

  async function createArticle(title: string, category: 'Software' | 'growth' | 'management'): Promise<Article> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const vaultPath = configStore.config.paths.obsidianVault
      if (!vaultPath) {
        throw new Error('Obsidian vault path not configured')
      }

      const slug = generateSlug(title)
      const now = new Date()

      const article: Article = {
        id: generateId(),
        title,
        slug,
        filePath: '', // Will be set by file service
        status: 'draft',
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

      // Create directory structure
      const categoryPath = `${vaultPath}/Drafts/${article.category}`
      article.filePath = `${categoryPath}/${article.slug}.md`

      // Ensure directory exists
      await window.electronAPI.createDirectory(categoryPath)

      // Generate initial markdown content
      const markdownContent = _markdownService.generateMarkdown(article.frontmatter, article.content)

      // Write file
      await window.electronAPI.writeFile(article.filePath, markdownContent)

      articles.value.push(article)
      notify.success('建立成功', `已建立「${title}」`)
      return article
    } catch (error) {
      console.error('Failed to create article:', error)
      notify.error('建立失敗', error instanceof Error ? error.message : '無法建立文章')
      throw error
    }
  }

  async function updateArticle(updatedArticle: Article) {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available')
      }

      // 檢測衝突
      const conflictResult = await backupService.detectConflict(updatedArticle)
      if (conflictResult.hasConflict) {
        notify.warning(
          '檔案衝突',
          '檔案在外部被修改，建議重新載入',
          {
            action: {
              label: '重新載入',
              callback: () => reloadArticle(updatedArticle.id)
            }
          }
        )
      }

      // 建立備份
      backupService.createBackup(updatedArticle)

      // Update lastModified timestamp
      updatedArticle.lastModified = new Date()

      // Generate markdown content
      const markdownContent = _markdownService.generateMarkdown(
        updatedArticle.frontmatter,
        updatedArticle.content
      )

      // Save to file
      await window.electronAPI.writeFile(updatedArticle.filePath, markdownContent)

      // Update in store
      const index = articles.value.findIndex(a => a.id === updatedArticle.id)
      if (index !== -1) {
        articles.value[index] = { ...updatedArticle }
      }
    } catch (error) {
      console.error('Failed to update article:', error)
      notify.error('儲存失敗', error instanceof Error ? error.message : '無法儲存文章')
      throw error
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

      // 建立備份（以防需要復原）
      backupService.createBackup(article)

      // Delete file from file system
      await window.electronAPI.deleteFile(article.filePath)

      // Remove from store
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
        const vaultPath = configStore.config.paths.obsidianVault
        if (!vaultPath) {
          throw new Error('Obsidian vault path not configured')
        }

        // 建立備份
        backupService.createBackup(article)

        // Create new path
        const publishPath = `${vaultPath}/Publish/${article.category}`
        const newFilePath = `${publishPath}/${article.slug}.md`

        // Ensure publish directory exists
        await window.electronAPI.createDirectory(publishPath)

        // Read current content
        const content = await window.electronAPI.readFile(article.filePath)

        // Write to new location
        await window.electronAPI.writeFile(newFilePath, content)

        // Delete old file
        await window.electronAPI.deleteFile(article.filePath)

        // Update article in store
        article.status = 'published'
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
  function startFileWatching() {
    const vaultPath = configStore.config.paths.obsidianVault
    if (!vaultPath || watchingFiles.value) { return }

    // Check if we're running in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI) {
      return
    }

    // TODO: Implement file watching using Electron API
    // For now, skip file watching to prevent crashes

    watchingFiles.value = true
  }

  /**
   * Stop watching for file system changes
   */
  function stopFileWatching() {
    // TODO: Implement file watching cleanup using Electron API
    // For now, skip file watching cleanup
    watchingFiles.value = false
  }

  /**
   * Reload a specific article from file system
   */
  async function reloadArticle(id: string) {
    const article = articles.value.find(a => a.id === id)
    if (!article) {return}

    // TODO: Implement article reloading using Electron API
    // For now, skip article reloading
    const reloadedArticle = null
    if (reloadedArticle) {
      const index = articles.value.findIndex(a => a.id === id)
      if (index !== -1) {
        articles.value[index] = reloadedArticle
        if (currentArticle.value?.id === id) {
          currentArticle.value = reloadedArticle
        }
      }
    }
  }

  /**
   * Save current article if it has changes
   */
  async function saveCurrentArticle() {
    if (currentArticle.value) {
      await updateArticle(currentArticle.value)
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
      updateArticle,
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
    updateArticle,
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