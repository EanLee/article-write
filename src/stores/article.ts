import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Article, ArticleFilter } from '@/types'
import { MarkdownService } from '@/services/MarkdownService'
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
        throw new Error('Obsidian vault path not configured')
      }

      // TODO: Implement article scanning using Electron API
      // For now, initialize with empty array to prevent crashes
      articles.value = []
      
      // Start watching for file changes if not already watching
      if (!watchingFiles.value) {
        startFileWatching()
      }
    } catch (error) {
      console.error('Failed to load articles:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createArticle(title: string, category: 'Software' | 'growth' | 'management'): Promise<Article> {
    try {
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

      // TODO: Implement file creation using Electron API
      // For now, set a placeholder file path
      article.filePath = `${vaultPath}/${article.status}/${article.category}/${article.slug}.md`

      articles.value.push(article)
      return article
    } catch (error) {
      console.error('Failed to create article:', error)
      throw error
    }
  }

  async function updateArticle(updatedArticle: Article) {
    try {
      // Update lastModified timestamp
      updatedArticle.lastModified = new Date()
      
      // TODO: Implement file saving using Electron API
      // For now, skip file system operations
      
      // Update in store
      const index = articles.value.findIndex(a => a.id === updatedArticle.id)
      if (index !== -1) {
        articles.value[index] = { ...updatedArticle }
      }
    } catch (error) {
      console.error('Failed to update article:', error)
      throw error
    }
  }

  async function deleteArticle(id: string) {
    try {
      const article = articles.value.find(a => a.id === id)
      if (!article) {
        throw new Error('Article not found')
      }

      // TODO: Implement file deletion using Electron API
      // For now, skip file system operations
      
      // Remove from store
      const index = articles.value.findIndex(a => a.id === id)
      if (index !== -1) {
        articles.value.splice(index, 1)
        if (currentArticle.value?.id === id) {
          currentArticle.value = null
        }
      }
    } catch (error) {
      console.error('Failed to delete article:', error)
      throw error
    }
  }

  async function moveToPublished(id: string) {
    try {
      const article = articles.value.find(a => a.id === id)
      if (!article) {
        throw new Error('Article not found')
      }

      if (article.status === 'draft') {
        const vaultPath = configStore.config.paths.obsidianVault
        if (!vaultPath) {
          throw new Error('Obsidian vault path not configured')
        }

        // TODO: Implement file moving using Electron API
        // For now, update the file path manually
        const newFilePath = `${vaultPath}/publish/${article.category}/${article.slug}.md`
        
        // Update article in store
        article.status = 'published'
        article.filePath = newFilePath
        article.lastModified = new Date()
      }
    } catch (error) {
      console.error('Failed to move article to published:', error)
      throw error
    }
  }

  function setCurrentArticle(article: Article | null) {
    currentArticle.value = article
  }

  function updateFilter(newFilter: Partial<ArticleFilter>) {
    filter.value = { ...filter.value, ...newFilter }
  }

  /**
   * Start watching for file system changes
   */
  function startFileWatching() {
    const vaultPath = configStore.config.paths.obsidianVault
    if (!vaultPath || watchingFiles.value) {return}

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
    saveCurrentArticle
  }
})