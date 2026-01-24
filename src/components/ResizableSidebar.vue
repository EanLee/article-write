<template>
  <div
    v-if="!collapsed"
    class="resizable-sidebar bg-base-200 border-r border-base-300 flex flex-col"
    :style="{ width: `${width}px` }"
  >
    <!-- Sidebar Header -->
    <div class="sidebar-header flex items-center justify-between p-4 border-b border-base-300">
      <slot name="header">
        <h2 class="text-lg font-semibold">Sidebar</h2>
      </slot>
      <button
        class="btn btn-ghost btn-sm btn-square"
        @click="toggleCollapse"
        title="收合側邊欄"
      >
        <PanelLeftClose :size="18" />
      </button>
    </div>

    <!-- Sidebar Content -->
    <div class="sidebar-content flex-1 overflow-y-auto">
      <slot></slot>
    </div>

    <!-- Resize Handle -->
    <div
      class="resize-handle"
      @mousedown="startResize"
      @dblclick="resetWidth"
      title="拖曳調整寬度，雙擊重置"
    >
      <div class="resize-indicator"></div>
    </div>
  </div>

  <!-- Collapsed State -->
  <div
    v-else
    class="collapsed-sidebar bg-base-200 border-r border-base-300 flex flex-col items-center p-2"
  >
    <button
      class="btn btn-ghost btn-sm btn-square"
      @click="toggleCollapse"
      title="展開側邊欄"
    >
      <PanelLeftOpen :size="18" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    defaultWidth?: number
    minWidth?: number
    maxWidth?: number
    storageKey?: string
  }>(),
  {
    defaultWidth: 280,
    minWidth: 200,
    maxWidth: 600,
    storageKey: 'sidebar-width'
  }
)

const emit = defineEmits<{
  'width-change': [width: number]
  'collapse-change': [collapsed: boolean]
}>()

const width = ref(props.defaultWidth)
const collapsed = ref(false)
const isResizing = ref(false)

// 從 localStorage 載入儲存的寬度和折疊狀態
onMounted(() => {
  const savedWidth = localStorage.getItem(props.storageKey)
  const savedCollapsed = localStorage.getItem(`${props.storageKey}-collapsed`)

  if (savedWidth) {
    const parsedWidth = parseInt(savedWidth, 10)
    if (parsedWidth >= props.minWidth && parsedWidth <= props.maxWidth) {
      width.value = parsedWidth
    }
  }

  if (savedCollapsed) {
    collapsed.value = savedCollapsed === 'true'
  }
})

// 拖曳狀態
let startX = 0
let startWidth = 0
let currentOnMouseMove: ((e: MouseEvent) => void) | null = null
let currentOnMouseUp: (() => void) | null = null

function startResize(e: MouseEvent) {
  isResizing.value = true
  startX = e.clientX
  startWidth = width.value

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isResizing.value) return

    const delta = moveEvent.clientX - startX
    let newWidth = startWidth + delta

    // 限制寬度範圍
    newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth))

    width.value = newWidth
    emit('width-change', newWidth)
  }

  const onMouseUp = () => {
    if (isResizing.value) {
      isResizing.value = false
      // 儲存新寬度到 localStorage
      localStorage.setItem(props.storageKey, width.value.toString())
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      currentOnMouseMove = null
      currentOnMouseUp = null
    }
  }

  currentOnMouseMove = onMouseMove
  currentOnMouseUp = onMouseUp

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function resetWidth() {
  width.value = props.defaultWidth
  localStorage.setItem(props.storageKey, width.value.toString())
  emit('width-change', width.value)
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem(`${props.storageKey}-collapsed`, collapsed.value.toString())
  emit('collapse-change', collapsed.value)
}

// 清理
onUnmounted(() => {
  // 清理樣式
  if (isResizing.value) {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  // 強制移除事件監聽器（防止拖曳過程中組件卸載導致洩漏）
  if (currentOnMouseMove) {
    document.removeEventListener('mousemove', currentOnMouseMove)
  }
  if (currentOnMouseUp) {
    document.removeEventListener('mouseup', currentOnMouseUp)
  }
})
</script>

<style scoped>
.resizable-sidebar {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.collapsed-sidebar {
  width: 3rem;
  height: 100%;
  flex-shrink: 0;
}

.sidebar-header {
  min-height: 4rem;
}

.sidebar-content {
  position: relative;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle:hover .resize-indicator {
  background: oklch(var(--p) / 0.5);
}

.resize-indicator {
  width: 2px;
  height: 40px;
  background: oklch(var(--bc) / 0.1);
  border-radius: 1px;
  transition: background 0.2s ease;
}

/* 滾動條樣式 */
.sidebar-content::-webkit-scrollbar {
  width: 0.5rem;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 0.25rem;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}
</style>
