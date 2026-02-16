import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Article } from '@/types'

export const useSeoStore = defineStore('seo', () => {
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  async function generateSEO(article: Article) {
    isGenerating.value = true
    error.value = null
    try {
      const contentPreview = article.content.slice(0, 300)
      const result = await window.electronAPI.aiGenerateSEO({
        title: article.title,
        contentPreview,
        existingSlug: article.frontmatter.slug,
      })
      if (!result.success) {
        error.value = result.message ?? '生成失敗'
        return null
      }
      return result.data ?? null
    } finally {
      isGenerating.value = false
    }
  }

  async function hasApiKey(): Promise<boolean> {
    return window.electronAPI.aiHasApiKey('claude')
  }

  return { isGenerating, error, generateSEO, hasApiKey }
})
