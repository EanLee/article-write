<template>
  <div
    v-if="inspectorStore.isOpen"
    class="inspector-view bg-base-100 border-l border-base-300 flex flex-col overflow-hidden relative"
    data-testid="inspector-view"
    :style="{ width: width + 'px' }"
  >
    <!-- Resize Handle（左側，比照 AIPanelView.vue） -->
    <div class="resize-handle" @mousedown="startResize"></div>

    <!-- Panel Header：三個頁籤切換 + 折疊按鈕 -->
    <div class="flex items-center justify-between px-2 bg-base-200 border-b border-base-300 flex-shrink-0">
      <div role="tablist" class="tabs tabs-boxed tabs-sm bg-transparent py-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.id }"
          :data-testid="`inspector-tab-${tab.id}`"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <button
        class="btn btn-ghost btn-xs btn-square"
        data-testid="inspector-collapse-button"
        title="收合"
        @click="inspectorStore.toggle()"
      >
        <PanelRightClose :size="14" />
      </button>
    </div>

    <PropertiesTab v-if="activeTab === 'properties'" />
    <AIPanelContent
      v-else-if="activeTab === 'ai'"
      :article="currentArticle"
      @open-settings="$emit('open-settings', $event)"
    />
    <PublishTab v-else-if="activeTab === 'publish'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { PanelRightClose } from "@lucide/vue"
import { useInspectorStore } from "@/stores/inspector"
import { useArticleStore } from "@/stores/article"
import PropertiesTab from "@/components/PropertiesTab.vue"
import AIPanelContent from "@/components/AIPanelContent.vue"
import PublishTab from "@/components/PublishTab.vue"

defineEmits<{
  "open-settings": [tab?: string]
}>()

const inspectorStore = useInspectorStore()
const articleStore = useArticleStore()
const currentArticle = computed(() => articleStore.currentArticle)

type InspectorTabId = "properties" | "ai" | "publish"

const tabs: Array<{ id: InspectorTabId; label: string }> = [
  { id: "properties", label: "屬性" },
  { id: "ai", label: "AI 助手" },
  { id: "publish", label: "發布" },
]

const activeTab = ref<InspectorTabId>("properties")

// Resize（比照 AIPanelView.vue 現有實作，寬度以 localStorage 持久化）
const MIN_WIDTH = 240
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 300
const STORAGE_KEY = "inspector-width"

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
.inspector-view {
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
