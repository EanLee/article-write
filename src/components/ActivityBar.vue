<template>
  <div class="activity-bar">
    <div class="activity-items">
      <button
        v-for="item in items"
        :key="item.id"
        class="activity-item"
        :class="{ active: modelValue === item.id }"
        :title="`${item.label} (${item.shortcut})`"
        @click="handleClick(item.id)"
      >
        <component :is="item.icon" :size="24" />
      </button>
    </div>

    <!-- Bottom actions -->
    <div class="activity-bottom">
      <button
        class="activity-item"
        title="設定"
        @click="$emit('open-settings')"
      >
        <Settings :size="24" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText, Info, Settings, List } from 'lucide-vue-next'

interface ActivityItem {
  id: string
  icon: any
  label: string
  shortcut: string
}

const items: ActivityItem[] = [
  { id: 'articles', icon: FileText, label: '文章列表', shortcut: 'Ctrl+Shift+E' },
  { id: 'frontmatter', icon: Info, label: '文章資訊', shortcut: 'Ctrl+Shift+I' },
  { id: 'manage', icon: List, label: '文章管理', shortcut: 'Ctrl+Shift+M' }
]

const modelValue = defineModel<string>({ default: 'articles' })

defineEmits<{
  'open-settings': []
}>()

function handleClick(id: string) {
  if (modelValue.value === id) {
    // 再次點擊同一個：收合側邊欄
    modelValue.value = ''
  } else {
    modelValue.value = id
  }
}
</script>

<style scoped>
.activity-bar {
  width: 48px;
  background: oklch(var(--b2));
  border-right: 1px solid oklch(var(--bc) / 0.1);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.activity-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  flex: 1;
}

.activity-bottom {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  border-top: 1px solid oklch(var(--bc) / 0.1);
}

.activity-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: oklch(var(--bc) / 0.6);
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}

.activity-item:hover {
  color: oklch(var(--bc));
  background: oklch(var(--bc) / 0.05);
}

.activity-item.active {
  color: oklch(var(--p));
}

.activity-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: oklch(var(--p));
}
</style>
