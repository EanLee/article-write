<template>
  <div class="outline-panel">
    <div v-if="headings.length === 0" class="outline-empty">
      <p class="text-xs text-base-content/40 text-center px-4 py-8">
        尚無標題
      </p>
    </div>
    <ul v-else class="outline-list">
      <li
        v-for="(heading, idx) in headings"
        :key="idx"
        class="outline-item"
        :class="`outline-h${heading.level}`"
        :style="{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }"
        @click="$emit('scroll-to-line', heading.line)"
      >
        <span class="outline-level">{{ 'H' + heading.level }}</span>
        <span class="outline-text" :title="heading.text">{{ heading.text }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { OutlineHeading } from "@/components/CodeMirrorEditor.vue"

defineProps<{
  headings: OutlineHeading[]
}>()

defineEmits<{
  "scroll-to-line": [line: number]
}>()
</script>

<style scoped>
.outline-panel {
  height: 100%;
  overflow-y: auto;
}

.outline-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 4px;
  padding-bottom: 4px;
  padding-right: 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 4px;
  transition: background 0.1s ease;
  min-width: 0;
}

/* noinspection CssUnresolvedCustomProperty */
.outline-item:hover {
  background: oklch(var(--bc) / 0.07);
}

/* noinspection CssUnresolvedCustomProperty */
.outline-level {
  font-size: 9px;
  font-weight: 700;
  color: oklch(var(--p));
  opacity: 0.7;
  flex-shrink: 0;
  font-family: monospace;
  min-width: 20px;
}

.outline-h1 .outline-level { opacity: 1; }
.outline-h2 .outline-level { opacity: 0.8; }
.outline-h3 .outline-level { opacity: 0.65; }
.outline-h4 .outline-level { opacity: 0.5; }
.outline-h5 .outline-level { opacity: 0.4; }
.outline-h6 .outline-level { opacity: 0.3; }

/* noinspection CssUnresolvedCustomProperty */
.outline-text {
  font-size: 0.75rem;
  color: oklch(var(--bc) / 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* noinspection CssUnresolvedCustomProperty */
.outline-h1 .outline-text {
  font-weight: 600;
  color: oklch(var(--bc));
}
</style>
