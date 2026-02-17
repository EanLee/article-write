<template>
  <div class="ai-panel bg-base-100 border-l border-base-300 flex flex-col overflow-hidden relative" :style="{ width: width + 'px' }">
    <!-- Resize Handle（左側） -->
    <div class="resize-handle" @mousedown="startResize"></div>

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
            <button class="btn btn-xs btn-outline" @click="$emit('open-settings')">⚙ 前往設定</button>
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
            <div v-if="aiPanelStore.seoError" class="alert alert-error p-2">
              <span class="text-xs">{{ aiPanelStore.seoError }}</span>
            </div>

            <!-- Result -->
            <div v-if="aiPanelStore.seoResult" class="space-y-2">
              <div class="rounded-lg border border-base-300 overflow-hidden text-xs">
                <div class="p-3 space-y-2">
                  <div>
                    <span class="text-base-content/50 text-xs uppercase tracking-wide">Slug</span>
                    <p class="font-mono mt-0.5 break-all">{{ aiPanelStore.seoResult.slug }}</p>
                  </div>
                  <div>
                    <span class="text-base-content/50 text-xs uppercase tracking-wide">Description</span>
                    <p class="mt-0.5">{{ aiPanelStore.seoResult.metaDescription }}</p>
                  </div>
                  <div>
                    <span class="text-base-content/50 text-xs uppercase tracking-wide">Keywords</span>
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

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Sparkles, X, ChevronDown, ChevronRight } from 'lucide-vue-next'
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
const hasApiKey = ref(false)

// Resize
const MIN_WIDTH = 240
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 300
const STORAGE_KEY = 'ai-panel-width'

const width = ref(DEFAULT_WIDTH)
const isResizing = ref(false)

function startResize(e: MouseEvent) {
  isResizing.value = true
  e.preventDefault()
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value) { return }
  const newWidth = window.innerWidth - e.clientX
  if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
    width.value = newWidth
  }
}

function stopResize() {
  if (isResizing.value) {
    isResizing.value = false
    localStorage.setItem(STORAGE_KEY, width.value.toString())
  }
}

onMounted(async () => {
  const savedWidth = localStorage.getItem(STORAGE_KEY)
  if (savedWidth) {
    const parsed = parseInt(savedWidth, 10)
    if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      width.value = parsed
    }
  }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)

  hasApiKey.value = await seoStore.hasApiKey()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})

async function handleGenerateSEO() {
  await aiPanelStore.generateSEO()
  hasApiKey.value = await seoStore.hasApiKey()
}

function handleApplySEO() {
  aiPanelStore.applySEOResult()
}
</script>

<style scoped>
.ai-panel {
  flex-shrink: 0;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s ease;
  z-index: 10;
}

.resize-handle:hover {
  background: oklch(var(--p) / 0.3);
}
</style>
