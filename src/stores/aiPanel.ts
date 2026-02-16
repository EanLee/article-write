import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSeoStore } from '@/stores/seo'
import { useArticleStore } from '@/stores/article'
import type { SEOGenerationResult } from '@/main/services/AIProvider/types'

export const useAIPanelStore = defineStore('aiPanel', () => {
  const isOpen = ref(false)

  // SEO Section 狀態
  const seoResult = ref<SEOGenerationResult | null>(null)
  const seoError = ref<string | null>(null)

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  async function generateSEO() {
    const articleStore = useArticleStore()
    const seoStore = useSeoStore()

    if (!articleStore.currentArticle) { return }

    seoResult.value = null
    seoError.value = null

    const result = await seoStore.generateSEO(articleStore.currentArticle)
    if (result) {
      seoResult.value = result
    } else {
      seoError.value = seoStore.error ?? '生成失敗'
    }
  }

  function applySEOResult() {
    if (!seoResult.value) { return }
    const articleStore = useArticleStore()
    const article = articleStore.currentArticle
    if (!article) { return }

    const updated = {
      ...article,
      frontmatter: {
        ...article.frontmatter,
        slug: seoResult.value.slug,
        description: seoResult.value.metaDescription,
        keywords: seoResult.value.keywords,
      }
    }
    articleStore.updateArticle(updated)
  }

  function clearSEO() {
    seoResult.value = null
    seoError.value = null
  }

  return {
    isOpen,
    seoResult,
    seoError,
    toggle,
    open,
    close,
    generateSEO,
    applySEOResult,
    clearSEO,
  }
})
