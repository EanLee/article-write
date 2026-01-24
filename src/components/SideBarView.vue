<template>
  <transition name="slide">
    <div v-if="modelValue" class="sidebar-view" :style="{ width: `${width}px` }">
      <!-- Header -->
      <div class="sidebar-header">
        <h3 class="sidebar-title">{{ currentTitle }}</h3>
        <button
          class="btn btn-ghost btn-xs"
          title="收合側邊欄"
          @click="$emit('update:modelValue', '')"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Content -->
      <div class="sidebar-content">
        <!-- 文章列表視圖 -->
        <ArticleListTree v-if="modelValue === 'articles'" />

        <!-- Frontmatter 視圖 -->
        <FrontmatterView v-else-if="modelValue === 'frontmatter'" />

        <!-- 文章管理視圖 -->
        <ArticleManagement v-else-if="modelValue === 'manage'" />
      </div>

      <!-- Resize Handle -->
      <div
        class="resize-handle"
        @mousedown="startResize"
      ></div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import ArticleListTree from './ArticleListTree.vue'
import FrontmatterView from './FrontmatterView.vue'
import ArticleManagement from './ArticleManagement.vue'

const modelValue = defineModel<string>()

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 280
const STORAGE_KEY = 'sidebar-view-width'

const width = ref(DEFAULT_WIDTH)
const isResizing = ref(false)

const currentTitle = computed(() => {
  const titles: Record<string, string> = {
    articles: '文章列表',
    frontmatter: '文章資訊',
    manage: '文章管理'
  }
  return titles[modelValue.value || ''] || ''
})

function startResize(e: MouseEvent) {
  isResizing.value = true
  e.preventDefault()
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value) {return}

  const newWidth = e.clientX - 48 // 扣除 ActivityBar 的寬度
  if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
    width.value = newWidth
  }
}

function stopResize() {
  if (isResizing.value) {
    isResizing.value = false
    // 儲存寬度到 localStorage
    localStorage.setItem(STORAGE_KEY, width.value.toString())
  }
}

onMounted(() => {
  // 載入儲存的寬度
  const savedWidth = localStorage.getItem(STORAGE_KEY)
  if (savedWidth) {
    const parsed = parseInt(savedWidth, 10)
    if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      width.value = parsed
    }
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
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
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid oklch(var(--bc) / 0.1);
  min-height: 40px;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: oklch(var(--bc) / 0.7);
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

/* Slide animation */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
