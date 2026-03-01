<template>
  <div class="w-1/2 border-l border-base-300 bg-base-50 flex flex-col">
    <!-- Preview Header with Stats -->
    <div class="bg-base-200 p-3 border-b border-base-300">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-sm font-semibold">預覽</h3>
        <div class="flex gap-2 text-xs">
          <span class="badge badge-outline">{{ stats.wordCount }} 字</span>
          <span class="badge badge-outline">{{ stats.readingTime }} 分鐘</span>
        </div>
      </div>

      <!-- Validation Status -->
      <div v-if="validation.invalidImages.length > 0 || validation.invalidLinks.length > 0" class="flex gap-2 text-xs">
        <div v-if="validation.invalidImages.length > 0" class="badge badge-error badge-sm">
          {{ validation.invalidImages.length }} 無效圖片
        </div>
        <div v-if="validation.invalidLinks.length > 0" class="badge badge-warning badge-sm">
          {{ validation.invalidLinks.length }} 無效連結
        </div>
      </div>
    </div>

    <!-- Preview Content -->
    <div ref="previewContainerRef" class="flex-1 overflow-y-auto" @scroll="handleScroll">
      <div class="p-4 prose prose-sm max-w-none markdown-preview obsidian-preview" v-html="sanitizedContent"></div>
    </div>

    <!-- Preview Footer with Detailed Stats -->
    <div class="bg-base-200 border-t border-base-300 p-2 text-xs">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <span class="text-base-content/70">字符: </span>
          <span>{{ stats.characterCount }}</span>
        </div>
        <div>
          <span class="text-base-content/70">圖片: </span>
          <span>{{ stats.imageCount }}</span>
        </div>
        <div>
          <span class="text-base-content/70">連結: </span>
          <span>{{ stats.linkCount }}</span>
        </div>
        <div>
          <span class="text-base-content/70">閱讀: </span>
          <span>~{{ stats.readingTime }}min</span>
        </div>
      </div>

      <!-- Validation Details (Collapsible) -->
      <div v-if="validation.invalidImages.length > 0 || validation.invalidLinks.length > 0" class="mt-2">
        <details class="collapse collapse-arrow bg-base-100">
          <summary class="collapse-title text-xs font-medium">驗證詳情</summary>
          <div class="collapse-content text-xs">
            <div v-if="validation.invalidImages.length > 0" class="mb-2">
              <div class="font-medium text-error">無效圖片:</div>
              <ul class="list-disc list-inside ml-2">
                <li v-for="img in validation.invalidImages" :key="img" class="text-error">{{ img }}</li>
              </ul>
            </div>
            <div v-if="validation.invalidLinks.length > 0">
              <div class="font-medium text-warning">無效連結:</div>
              <ul class="list-disc list-inside ml-2">
                <li v-for="link in validation.invalidLinks" :key="link" class="text-warning">{{ link }}</li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import DOMPurify from "dompurify"

interface PreviewStats {
  wordCount: number
  characterCount: number
  readingTime: number
  imageCount: number
  linkCount: number
}

interface PreviewValidation {
  validImages: string[]
  invalidImages: string[]
  validLinks: string[]
  invalidLinks: string[]
}

interface Props {
  renderedContent: string
  stats: PreviewStats
  validation: PreviewValidation
}

const props = defineProps<Props>()

// 使用 DOMPurify 消毒 markdown-it 輸出，防止 XSS 攻擊
const sanitizedContent = computed(() =>
  DOMPurify.sanitize(props.renderedContent, {
    USE_PROFILES: { html: true },
  })
)

const emit = defineEmits<{
  "scroll": []
}>()

const previewContainerRef = ref<HTMLElement>()

function handleScroll() {
  emit("scroll")
}

// Expose ref for parent component to access
defineExpose({
  previewContainerRef
})
</script>

<style scoped>
/* Syntax highlighting for code blocks */
.markdown-preview :deep(pre) {
  background-color: #f2f2f2;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

.markdown-preview :deep(code) {
  background-color: #f2f2f2;
  color: #1f2937;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

/* Enhanced Obsidian-style elements */
.obsidian-preview :deep(.obsidian-wikilink) {
  color: #3b82f6;
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
  transition: all 0.2s ease;
}

.obsidian-preview :deep(.obsidian-wikilink:hover) {
  text-decoration-style: solid;
  background-color: rgba(59, 130, 246, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.obsidian-preview :deep(.obsidian-wikilink-valid) {
  color: #059669;
  border-bottom: 1px solid #059669;
}

.obsidian-preview :deep(.obsidian-wikilink-invalid) {
  color: #dc2626;
  border-bottom: 1px dashed #dc2626;
}

.obsidian-preview :deep(.obsidian-image) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.obsidian-preview :deep(.obsidian-image:hover) {
  transform: scale(1.02);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.obsidian-preview :deep(.obsidian-tag) {
  display: inline-block;
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0.125rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.obsidian-preview :deep(.obsidian-highlight) {
  background-color: rgba(251, 191, 36, 0.3);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  box-decoration-break: clone;
}

/* Obsidian embed blocks */
.obsidian-preview :deep(.obsidian-embed) {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin: 1rem 0;
  overflow: hidden;
  background-color: #f9fafb;
}

.obsidian-preview :deep(.obsidian-embed-header) {
  background-color: #f3f4f6;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 1px solid #e5e7eb;
}

.obsidian-preview :deep(.obsidian-embed-content) {
  padding: 0.75rem;
  font-style: italic;
  color: #6b7280;
}

/* Obsidian callouts */
.obsidian-preview :deep(.obsidian-callout) {
  border-left: 4px solid #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0 0.5rem 0.5rem 0;
}

.obsidian-preview :deep(.obsidian-callout-note) {
  border-left-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
}

.obsidian-preview :deep(.obsidian-callout-warning) {
  border-left-color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.05);
}

.obsidian-preview :deep(.obsidian-callout-error) {
  border-left-color: #dc2626;
  background-color: rgba(220, 38, 38, 0.05);
}

.obsidian-preview :deep(.obsidian-callout-success) {
  border-left-color: #059669;
  background-color: rgba(5, 150, 105, 0.05);
}

/* Enhanced task lists */
.obsidian-preview :deep(.obsidian-task) {
  margin-right: 0.5rem;
  transform: scale(1.1);
}

/* Code block enhancements */
.obsidian-preview :deep(.code-block-wrapper) {
  position: relative;
  margin: 1rem 0;
}

.obsidian-preview :deep(.code-block-header) {
  background-color: #374151;
  padding: 0.5rem;
  border-radius: 0.5rem 0.5rem 0 0;
  display: flex;
  justify-content: flex-end;
}

.obsidian-preview :deep(.code-copy-btn) {
  background-color: #4b5563;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.obsidian-preview :deep(.code-copy-btn:hover) {
  background-color: #6b7280;
}

/* Table enhancements */
.obsidian-preview :deep(.table-wrapper) {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.obsidian-preview :deep(.table-wrapper table) {
  margin: 0;
  border-radius: 0;
}

/* External links */
.obsidian-preview :deep(.external-link) {
  color: #059669;
  text-decoration: none;
}

.obsidian-preview :deep(.external-link:hover) {
  text-decoration: underline;
}

/* Task lists */
.markdown-preview :deep(.task-list-item) {
  list-style: none;
}

.markdown-preview :deep(.task-list-item input) {
  margin-right: 0.5rem;
}

/* Table of contents */
.markdown-preview :deep(.table-of-contents) {
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.markdown-preview :deep(.table-of-contents ul) {
  list-style: none;
  padding-left: 0;
}

.markdown-preview :deep(.table-of-contents li) {
  margin-bottom: 0.25rem;
}

.markdown-preview :deep(.table-of-contents a) {
  color: inherit;
}

.markdown-preview :deep(.table-of-contents a:hover) {
  color: #3b82f6;
}

/* Footnotes */
.markdown-preview :deep(.footnote-ref) {
  color: #3b82f6;
  font-size: 0.75rem;
  vertical-align: super;
}

.markdown-preview :deep(.footnotes) {
  border-top: 1px solid #e5e7eb;
  margin-top: 2rem;
  padding-top: 1rem;
}

/* Headers with anchors */
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  position: relative;
}

.markdown-preview :deep(.header-anchor) {
  position: absolute;
  left: -1.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.markdown-preview :deep(h1:hover .header-anchor),
.markdown-preview :deep(h2:hover .header-anchor),
.markdown-preview :deep(h3:hover .header-anchor),
.markdown-preview :deep(h4:hover .header-anchor),
.markdown-preview :deep(h5:hover .header-anchor),
.markdown-preview :deep(h6:hover .header-anchor) {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .markdown-preview {
    font-size: 14px;
  }

  .markdown-preview :deep(pre) {
    font-size: 12px;
  }
}
</style>
