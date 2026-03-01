<template>
  <div>
    <button
      v-if="hasKey !== false"
      class="btn btn-xs btn-outline btn-primary"
      :class="{ loading: seoStore.isGenerating }"
      :disabled="seoStore.isGenerating || !article"
      @click="handleGenerate"
    >
      <span v-if="!seoStore.isGenerating">✨ 生成 SEO</span>
      <span v-else>生成中...</span>
    </button>
    <button
      v-else
      class="btn btn-xs btn-outline"
      @click="emit('open-settings')"
    >
      ⚙ 設定 API Key
    </button>

    <div v-if="seoStore.error" class="toast toast-end toast-bottom z-50">
      <div class="alert alert-error text-xs">
        <span>{{ seoStore.error }}</span>
        <button class="btn btn-xs btn-ghost" @click="seoStore.error = null">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import type { Article } from "@/types"
import { useSeoStore } from "@/stores/seo"

const props = defineProps<{
  article: Article | null
}>()

const emit = defineEmits<{
  (e: "seo-generated", result: { slug: string; metaDescription: string; keywords: string[] }): void
  (e: "open-settings"): void
}>()

const seoStore = useSeoStore()
const hasKey = ref<boolean | null>(null)

onMounted(async () => {
  if (window.electronAPI) {
    hasKey.value = await seoStore.hasApiKey()
  }
})

async function handleGenerate() {
  if (!props.article) {return}
  const result = await seoStore.generateSEO(props.article)
  if (result) {
    emit("seo-generated", result)
    hasKey.value = true
  }
}
</script>
