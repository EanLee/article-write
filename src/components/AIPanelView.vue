<template>
  <div class="ai-panel bg-base-100 border-l border-base-300 flex flex-col overflow-hidden relative" data-testid="ai-panel" :style="{ width: width + 'px' }">
    <!-- Resize Handle（左側） -->
    <div class="resize-handle" @mousedown="startResize"></div>

    <!-- Panel Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-base-200 border-b border-base-300 flex-shrink-0">
      <div class="flex items-center gap-2">
        <Sparkles :size="16" class="text-primary" />
        <span class="font-semibold text-sm">AI 助手</span>
      </div>
      <button class="btn btn-ghost btn-xs btn-square" data-testid="ai-panel-close-button" @click="inspectorStore.close()">
        <X :size="14" />
      </button>
    </div>

    <AIPanelContent :article="article" @open-settings="$emit('open-settings', $event)" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { Sparkles, X } from "@lucide/vue"
import { useInspectorStore } from "@/stores/inspector"
import AIPanelContent from "@/components/AIPanelContent.vue"
import type { Article } from "@/types"

defineProps<{
  article: Article | null
}>()

defineEmits<{
  "open-settings": [tab?: string]
}>()

const inspectorStore = useInspectorStore()

// Resize
const MIN_WIDTH = 240
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 300
const STORAGE_KEY = "ai-panel-width"

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

onMounted(() => {
  const savedWidth = localStorage.getItem(STORAGE_KEY)
  if (savedWidth) {
    const parsed = Number.parseInt(savedWidth, 10)
    if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      width.value = parsed
    }
  }
  document.addEventListener("mousemove", handleMouseMove)
  document.addEventListener("mouseup", stopResize)
})

onUnmounted(() => {
  document.removeEventListener("mousemove", handleMouseMove)
  document.removeEventListener("mouseup", stopResize)
})
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

/* noinspection CssUnresolvedCustomProperty */
.resize-handle:hover {
  background: oklch(var(--p) / 0.3);
}
</style>
