<template>
  <div class="ai-panel bg-base-100 border-l border-base-300 flex flex-col overflow-hidden">
    <!-- Panel Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-base-200 border-b border-base-300 flex-shrink-0">
      <div class="flex items-center gap-2">
        <Sparkles :size="16" class="text-primary" />
        <span class="font-semibold text-sm">AI 助手</span>
      </div>
      <button class="btn btn-ghost btn-xs btn-square" @click="aiPanelStore.close()">
        <X :size="14" />
      </button>
    </div>

    <!-- No Article State -->
    <div v-if="!article" class="flex-1 flex items-center justify-center p-4">
      <p class="text-sm text-base-content/50 text-center">請先選擇一篇文章</p>
    </div>

    <!-- Panel Content -->
    <div v-else class="flex-1 overflow-y-auto">

      <!-- Section 1: SEO 助手 -->
      <div class="border-b border-base-300">
        <button
          class="w-full flex items-center justify-between px-4 py-2 bg-base-200 hover:bg-base-300 transition-colors text-sm font-medium"
          @click="seoExpanded = !seoExpanded"
        >
          <div class="flex items-center gap-2">
            <component :is="seoExpanded ? ChevronDown : ChevronRight" :size="14" />
            <span>SEO 助手</span>
          </div>
          <span class="badge badge-primary badge-xs">Phase 1</span>
        </button>

        <div v-if="seoExpanded" class="p-4 space-y-3">
          <!-- No API Key -->
          <div v-if="!hasApiKey" class="text-center space-y-2">
            <p class="text-xs text-base-content/60">需要 Claude API Key 才能使用 AI 功能</p>
            <button class="btn btn-xs btn-outline" @click="$emit('open-settings')">⚙ 設定 API Key</button>
          </div>

          <!-- Generate Button -->
          <div v-else class="space-y-3">
            <button
              class="btn btn-sm btn-primary w-full"
              :disabled="seoStore.isGenerating"
              @click="handleGenerateSEO"
            >
              <span v-if="!seoStore.isGenerating" class="flex items-center gap-1">
                <Sparkles :size="14" /> 生成 SEO
              </span>
              <span v-else>生成中...</span>
            </button>

            <!-- Error -->
            <div v-if="aiPanelStore.seoError" class="alert alert-error p-2">
              <span class="text-xs">{{ aiPanelStore.seoError }}</span>
            </div>

            <!-- Result -->
            <div v-if="aiPanelStore.seoResult" class="space-y-2">
              <div class="rounded-lg border border-base-300 overflow-hidden text-xs">
                <div class="px-3 py-2 bg-base-200 font-medium">生成結果</div>
                <div class="p-3 space-y-2">
                  <div>
                    <span class="text-base-content/50">Slug</span>
                    <p class="font-mono mt-0.5 break-all">{{ aiPanelStore.seoResult.slug }}</p>
                  </div>
                  <div>
                    <span class="text-base-content/50">Meta Description</span>
                    <p class="mt-0.5">{{ aiPanelStore.seoResult.metaDescription }}</p>
                  </div>
                  <div>
                    <span class="text-base-content/50">Keywords</span>
                    <div class="flex flex-wrap gap-1 mt-0.5">
                      <span
                        v-for="kw in aiPanelStore.seoResult.keywords"
                        :key="kw"
                        class="badge badge-outline badge-sm"
                      >{{ kw }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-xs btn-primary flex-1" @click="handleApplySEO">套用到文章</button>
                <button class="btn btn-xs btn-ghost" @click="aiPanelStore.clearSEO()">清除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: 文章建議 -->
      <div class="border-b border-base-300">
        <button
          class="w-full flex items-center justify-between px-4 py-2 bg-base-200 hover:bg-base-300 transition-colors text-sm font-medium"
          @click="suggestionsExpanded = !suggestionsExpanded"
        >
          <div class="flex items-center gap-2">
            <component :is="suggestionsExpanded ? ChevronDown : ChevronRight" :size="14" />
            <span>文章建議</span>
          </div>
          <span class="badge badge-ghost badge-xs">即將推出</span>
        </button>

        <div v-if="suggestionsExpanded" class="p-4">
          <div class="flex flex-col items-center gap-2 py-4 text-center">
            <FileSearch :size="32" class="text-base-content/20" />
            <p class="text-xs text-base-content/50">文章品質分析與改進建議<br>Phase 2 即將推出</p>
          </div>
        </div>
      </div>

      <!-- Section 3: 寫作助手 -->
      <div>
        <button
          class="w-full flex items-center justify-between px-4 py-2 bg-base-200 hover:bg-base-300 transition-colors text-sm font-medium"
          @click="writingExpanded = !writingExpanded"
        >
          <div class="flex items-center gap-2">
            <component :is="writingExpanded ? ChevronDown : ChevronRight" :size="14" />
            <span>寫作助手</span>
          </div>
          <span class="badge badge-ghost badge-xs">即將推出</span>
        </button>

        <div v-if="writingExpanded" class="p-4">
          <div class="flex flex-col items-center gap-2 py-4 text-center">
            <PenLine :size="32" class="text-base-content/20" />
            <p class="text-xs text-base-content/50">輸入提示，獲得寫作方向建議<br>Phase 3 即將推出</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Sparkles, X, ChevronDown, ChevronRight, FileSearch, PenLine } from 'lucide-vue-next'
import { useAIPanelStore } from '@/stores/aiPanel'
import { useSeoStore } from '@/stores/seo'
import type { Article } from '@/types'

defineProps<{
  article: Article | null
}>()

defineEmits<{
  'open-settings': []
}>()

const aiPanelStore = useAIPanelStore()
const seoStore = useSeoStore()

const seoExpanded = ref(true)
const suggestionsExpanded = ref(false)
const writingExpanded = ref(false)
const hasApiKey = ref(false)

onMounted(async () => {
  hasApiKey.value = await seoStore.hasApiKey()
})

async function handleGenerateSEO() {
  await aiPanelStore.generateSEO()
  // 生成後重新確認 API Key 狀態（確保狀態同步）
  hasApiKey.value = await seoStore.hasApiKey()
}

function handleApplySEO() {
  aiPanelStore.applySEOResult()
}
</script>

<style scoped>
.ai-panel {
  width: 300px;
  flex-shrink: 0;
}
</style>
