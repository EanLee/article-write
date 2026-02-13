<template>
  <div
    class="sidebar-view"
    :class="{ 'sidebar-collapsed': isCollapsed || focusMode }"
    :style="isCollapsed || focusMode ? {} : { width: `${width}px` }"
  >
    <!-- 收合狀態：只顯示展開按鈕 -->
    <div v-if="isCollapsed || focusMode" class="sidebar-toggle-btn" @click="expand" title="展開側欄 (Ctrl+B)">
      <PanelLeftOpen :size="16" />
    </div>

    <!-- 展開狀態 -->
    <template v-else>
      <!-- Header with tabs -->
      <div class="sidebar-header">
        <div class="sidebar-tabs">
          <button
            class="tab-btn"
            :class="{ active: modelValue === SidebarView.Articles }"
            @click="$emit('update:modelValue', SidebarView.Articles)"
          >
            <FileText :size="14" />
            <span>文章列表</span>
          </button>
          <button
            class="tab-btn"
            :class="{ active: modelValue === SidebarView.Frontmatter }"
            :disabled="!hasCurrentArticle"
            @click="$emit('update:modelValue', SidebarView.Frontmatter)"
          >
            <Info :size="14" />
            <span>文章資訊</span>
          </button>
          <!-- 收合按鈕 -->
          <button class="tab-btn collapse-btn" @click="collapse" title="收合側欄 (Ctrl+B)">
            <PanelLeftClose :size="14" />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="sidebar-content">
        <ArticleListTree v-if="modelValue === SidebarView.Articles" />
        <FrontmatterView v-else-if="modelValue === SidebarView.Frontmatter" />
      </div>

      <!-- Resize Handle -->
      <div class="resize-handle" @mousedown="startResize"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { FileText, Info, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { SidebarView } from '@/types'
import { useArticleStore } from '@/stores/article'
import { useFocusMode } from '@/composables/useFocusMode'
import ArticleListTree from './ArticleListTree.vue'
import FrontmatterView from './FrontmatterView.vue'

const articleStore = useArticleStore()
const { focusMode } = useFocusMode()
const modelValue = defineModel<SidebarView>({ default: SidebarView.Articles })

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 280
const STORAGE_KEY = 'sidebar-view-width'
const COLLAPSED_KEY = 'sidebar-view-collapsed'

const width = ref(DEFAULT_WIDTH)
const isResizing = ref(false)
const isCollapsed = ref(false)

const hasCurrentArticle = computed(() => !!articleStore.currentArticle)

function collapse() {
  isCollapsed.value = true
  localStorage.setItem(COLLAPSED_KEY, 'true')
}

function expand() {
  isCollapsed.value = false
  localStorage.setItem(COLLAPSED_KEY, 'false')
}

function toggleCollapse() {
  if (isCollapsed.value) {
    expand()
  } else {
    collapse()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault()
    toggleCollapse()
  }
}

function startResize(e: MouseEvent) {
  isResizing.value = true
  e.preventDefault()
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value) { return }
  const newWidth = e.clientX - 48 // 扣除 ActivityBar 的寬度
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
    const parsed = parseInt(savedWidth, 10)
    if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      width.value = parsed
    }
  }

  const savedCollapsed = localStorage.getItem(COLLAPSED_KEY)
  if (savedCollapsed === 'true') {
    isCollapsed.value = true
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.sidebar-view {
  background: oklch(var(--b1));
  border-right: 1px solid oklch(var(--bc) / 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
  position: relative;
  transition: width 0.2s ease;
}

.sidebar-collapsed {
  width: 36px !important;
  overflow: hidden;
}

.sidebar-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 100%;
  cursor: pointer;
  color: oklch(var(--bc) / 0.5);
  transition: color 0.15s ease;
  flex-shrink: 0;
}

.sidebar-toggle-btn:hover {
  color: oklch(var(--bc) / 0.9);
  background: oklch(var(--bc) / 0.05);
}

.sidebar-header {
  border-bottom: 1px solid oklch(var(--bc) / 0.1);
  background: oklch(var(--b2) / 0.5);
}

.sidebar-tabs {
  display: flex;
  padding: 4px;
  gap: 2px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: oklch(var(--bc) / 0.6);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.tab-btn:hover:not(:disabled) {
  background: oklch(var(--bc) / 0.05);
  color: oklch(var(--bc) / 0.8);
}

.tab-btn.active {
  background: oklch(var(--b1));
  color: oklch(var(--p));
  font-weight: 600;
}

.tab-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.collapse-btn {
  flex: none;
  width: 28px;
  padding: 6px 6px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Resize Handle */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: oklch(var(--p) / 0.3);
}
</style>
