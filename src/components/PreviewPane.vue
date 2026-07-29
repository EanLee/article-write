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
import { ref, computed, onMounted, onUnmounted } from "vue"
import DOMPurify from "dompurify"
import { logger } from "@/utils/logger"

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
// 允許 local-file: 協定（自訂 Electron Protocol）與 file: 協定（生產模式 file:// 載入時）
const ALLOWED_URI_REGEXP =
  /^(?:https?:|ftps?:|mailto:|tel:|callto:|cid:|xmpp:|file:|local-file:|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i // NOSONAR — DOMPurify 安全 URI 白名單不可簡化

const sanitizedContent = computed(() =>
  DOMPurify.sanitize(props.renderedContent, {
    USE_PROFILES: { html: true },
    ALLOWED_URI_REGEXP,
  })
)

const emit = defineEmits<{
  "scroll": []
}>()

const previewContainerRef = ref<HTMLElement>()

function handleScroll() {
  emit("scroll")
}

// 圖片載入失敗容錯：DOMPurify 會剝除 <img onerror="..."> 這類 inline event handler，
// 所以破圖偵測必須在這裡用 addEventListener 掛，而不是在渲染出的 HTML 字串裡內嵌 onerror。
// error 事件不會冒泡，必須用 capture phase 掛在容器上才能攔截到子層 <img> 的錯誤。
function handleImageError(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLImageElement)) {
    return
  }
  if (target.classList.contains("obsidian-image-broken")) {
    return
  }
  target.classList.add("obsidian-image-broken")
  target.alt = `⚠ 圖片載入失敗：${target.alt}`
}

// 程式碼區塊複製按鈕：同樣因為 DOMPurify 會剝除 onclick，改用 addEventListener 事件代理。
// click 事件會冒泡，不需要 capture phase。
function handleCopyButtonClick(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  const button = target.closest(".code-copy-btn")
  if (!button) {
    return
  }
  const codeBlock = button.parentElement?.nextElementSibling
  const code = codeBlock?.textContent ?? ""
  navigator.clipboard.writeText(code).catch((error: unknown) => {
    logger.error("複製程式碼失敗：", error)
  })
}

onMounted(() => {
  previewContainerRef.value?.addEventListener("error", handleImageError, true)
  previewContainerRef.value?.addEventListener("click", handleCopyButtonClick)
})

onUnmounted(() => {
  previewContainerRef.value?.removeEventListener("error", handleImageError, true)
  previewContainerRef.value?.removeEventListener("click", handleCopyButtonClick)
})

// Expose ref for parent component to access
defineExpose({
  previewContainerRef
})
</script>

<style scoped>
/* noinspection CssUnusedSymbol -- 所有 :deep() 選擇器均用於 Markdown 渲染器動態注入的 HTML 元素，IDE 靜態分析無法偵測到 */
/* Syntax highlighting for code blocks */
.markdown-preview :deep(pre) {
  background-color: var(--color-base-200);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

.markdown-preview :deep(code) {
  background-color: var(--color-base-200);
  color: var(--color-base-content);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

/* Enhanced Obsidian-style elements（以下 :deep() 選擇器均用於渲染器動態注入的 HTML）*/
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-wikilink) {
  color: var(--color-primary);
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-wikilink:hover) {
  text-decoration-style: solid;
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-wikilink-valid) {
  color: var(--color-success);
  border-bottom: 1px solid var(--color-success);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-wikilink-invalid) {
  color: var(--color-error);
  border-bottom: 1px dashed var(--color-error);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-image) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgb(0 0 0 / 10%);
  transition: transform 0.2s ease;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-image:hover) {
  transform: scale(1.02);
  box-shadow: 0 8px 15px rgb(0 0 0 / 15%);
}

/* 圖片載入失敗時的破圖提示樣式（見 PreviewPane.vue 的 handleImageError） */
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-image-broken) {
  display: inline-block;
  min-width: 120px;
  min-height: 80px;
  border: 2px dashed var(--color-error);
  border-radius: 0.5rem;
  background-color: color-mix(in srgb, var(--color-error) 8%, transparent);
  color: var(--color-error);
  font-size: 0.875rem;
  box-shadow: none;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-tag) {
  display: inline-block;
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0.125rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-highlight) {
  background-color: color-mix(in srgb, var(--color-warning) 35%, transparent);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  box-decoration-break: clone;
}

/* Obsidian embed blocks */
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-embed) {
  border: 1px solid var(--color-base-300);
  border-radius: 0.5rem;
  margin: 1rem 0;
  overflow: hidden;
  background-color: var(--color-base-200);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-embed-header) {
  background-color: var(--color-base-300);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 1px solid var(--color-base-300);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-embed-content) {
  padding: 0.75rem;
  font-style: italic;
  color: var(--color-base-content);
  opacity: 0.7;
}

/* Obsidian callouts */
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-callout) {
  border-left: 4px solid var(--color-info);
  background-color: color-mix(in srgb, var(--color-info) 6%, transparent);
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0 0.5rem 0.5rem 0;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-callout-note) {
  border-left-color: var(--color-info);
  background-color: color-mix(in srgb, var(--color-info) 6%, transparent);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-callout-warning) {
  border-left-color: var(--color-warning);
  background-color: color-mix(in srgb, var(--color-warning) 8%, transparent);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-callout-error) {
  border-left-color: var(--color-error);
  background-color: color-mix(in srgb, var(--color-error) 6%, transparent);
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-callout-success) {
  border-left-color: var(--color-success);
  background-color: color-mix(in srgb, var(--color-success) 6%, transparent);
}

/* Enhanced task lists */
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.obsidian-task) {
  margin-right: 0.5rem;
  transform: scale(1.1);
}

/* Code block enhancements */
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.code-block-wrapper) {
  position: relative;
  margin: 1rem 0;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.code-block-header) {
  background-color: var(--color-neutral);
  padding: 0.5rem;
  border-radius: 0.5rem 0.5rem 0 0;
  display: flex;
  justify-content: flex-end;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.code-copy-btn) {
  background-color: var(--color-neutral-content);
  color: var(--color-neutral);
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.code-copy-btn:hover) {
  opacity: 0.85;
}

/* Table enhancements */
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.table-wrapper) {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.5rem;
  border: 1px solid var(--color-base-300);
}

.obsidian-preview :deep(.table-wrapper table) {
  margin: 0;
  border-radius: 0;
}

/* External links */
/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.external-link) {
  color: var(--color-success);
  text-decoration: none;
}

/* noinspection CssUnusedSymbol */
.obsidian-preview :deep(.external-link:hover) {
  text-decoration: underline;
}

/* Task lists */
/* noinspection CssUnusedSymbol */
.markdown-preview :deep(.task-list-item) {
  list-style: none;
}

.markdown-preview :deep(.task-list-item input) {
  margin-right: 0.5rem;
}

/* Table of contents */
/* noinspection CssUnusedSymbol */
.markdown-preview :deep(.table-of-contents) {
  background-color: var(--color-base-100);
  border: 1px solid var(--color-base-300);
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
  color: var(--color-primary);
}

/* Footnotes */
/* noinspection CssUnusedSymbol */
.markdown-preview :deep(.footnote-ref) {
  color: var(--color-primary);
  font-size: 0.75rem;
  vertical-align: super;
}

/* noinspection CssUnusedSymbol */
.markdown-preview :deep(.footnotes) {
  border-top: 1px solid var(--color-base-300);
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

/* noinspection CssUnusedSymbol */
.markdown-preview :deep(.header-anchor) {
  position: absolute;
  left: -1.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

/* noinspection CssUnusedSymbol */
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
