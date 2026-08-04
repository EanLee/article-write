<template>
  <!-- No Article State -->
  <div v-if="!article" class="flex-1 flex items-center justify-center p-6">
    <p class="text-sm text-base-content/50 text-center">請先選擇一篇文章</p>
  </div>

  <!-- Panel Content -->
  <div v-else class="flex-1 overflow-y-auto">

    <!-- SEO 生成 -->
    <div class="border-b border-base-300">
      <button
        class="w-full flex items-center justify-between px-4 py-2 bg-base-200 hover:bg-base-300 transition-colors text-sm font-medium"
        @click="seoExpanded = !seoExpanded"
      >
        <div class="flex items-center gap-2">
          <component :is="seoExpanded ? ChevronDown : ChevronRight" :size="14" />
          <span>SEO 生成</span>
        </div>
      </button>

      <div v-if="seoExpanded" class="p-4 space-y-3">
        <!-- No API Key -->
        <div v-if="!hasApiKey" class="text-center space-y-2">
          <p class="text-xs text-base-content/60">需要 API Key 才能使用 AI 功能</p>
          <button class="btn btn-xs btn-outline" @click="$emit('open-settings', 'ai')">⚙ 前往設定</button>
        </div>

        <div v-else class="space-y-3">
          <button
            class="btn btn-sm btn-primary w-full"
            :disabled="seoStore.isGenerating"
            @click="handleGenerateSEO"
          >
            <span v-if="!seoStore.isGenerating" class="flex items-center gap-1">
              <Sparkles :size="14" /> 生成 SEO
            </span>
            <span v-else class="loading loading-spinner loading-xs"></span>
          </button>

          <!-- Error -->
          <div v-if="seoResultStore.seoError" class="alert alert-error p-2">
            <span class="text-xs">{{ seoResultStore.seoError }}</span>
          </div>

          <!-- Result -->
          <div v-if="seoResultStore.seoResult" class="space-y-2">
            <div class="rounded-lg border border-base-300 overflow-hidden text-xs">
              <div class="p-3 space-y-2">
                <div>
                  <span class="text-base-content/50 text-xs uppercase tracking-wide">Slug</span>
                  <p class="font-mono mt-0.5 break-all">{{ seoResultStore.seoResult.slug }}</p>
                </div>
                <div>
                  <span class="text-base-content/50 text-xs uppercase tracking-wide">Description</span>
                  <p class="mt-0.5">{{ seoResultStore.seoResult.metaDescription }}</p>
                </div>
                <div>
                  <span class="text-base-content/50 text-xs uppercase tracking-wide">Keywords</span>
                  <div class="flex flex-wrap gap-1 mt-0.5">
                    <span
                      v-for="kw in seoResultStore.seoResult.keywords"
                      :key="kw"
                      class="badge badge-outline badge-sm"
                    >{{ kw }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-xs btn-primary flex-1" @click="handleApplySEO">套用到文章</button>
              <button class="btn btn-xs btn-ghost" @click="seoResultStore.clearSEO()">清除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Sparkles, ChevronDown, ChevronRight } from "@lucide/vue"
import { useSeoResultStore } from "@/stores/seoResult"
import { useSeoStore } from "@/stores/seo"
import { useArticleStore } from "@/stores/article"
import type { Article } from "@/types"

const props = defineProps<{
  article: Article | null
}>()

defineEmits<{
  "open-settings": [tab?: string]
}>()

const seoResultStore = useSeoResultStore()
const seoStore = useSeoStore()
const articleStore = useArticleStore()

const seoExpanded = ref(true)
const hasApiKey = ref(false)

onMounted(async () => {
  hasApiKey.value = await seoStore.hasApiKey()
})

async function handleGenerateSEO() {
  const article = props.article
  if (!article) { return }
  await seoResultStore.generateSEO(article)
  hasApiKey.value = await seoStore.hasApiKey()
}

function handleApplySEO() {
  const article = props.article
  if (!article) { return }
  const updated = seoResultStore.applySEOResult(article)
  if (updated) {
    articleStore.updateArticleInMemory(updated)
  }
}
</script>
