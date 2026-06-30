<template>
  <header
    class="editor-header bg-base-200 border-b border-base-300 transition-all duration-300"
    :class="{
      'header-collapsed': focusMode && !isHovering,
      'header-compact': !focusMode
    }"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <!-- 專注模式下的迷你狀態條 -->
    <div v-if="focusMode && !isHovering" class="mini-status-bar">
      <div class="flex items-center gap-2 px-4 py-1">
        <SaveStatusIndicator compact icon-only />
        <span class="text-xs text-base-content/50">{{ article?.title || '未命名' }}</span>
      </div>
    </div>

    <!-- 完整 Header（緊湊模式或專注模式懸停時） -->
    <div v-else class="header-content p-3">
      <div class="flex justify-between items-center gap-4">
        <!-- 左側：標題 + 儲存狀態 -->
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <h2 class="text-base font-semibold truncate">
            {{ article?.title || '未命名文章' }}
          </h2>
          <SaveStatusIndicator compact />

          <!-- 緊湊模式下顯示精簡資訊 -->
          <div class="flex items-center gap-2 text-xs">
            <span
              class="badge badge-xs"
              :class="article?.status === 'published' ? 'badge-success' : 'badge-info'"
            >
              {{ statusText }}
            </span>
            <span v-if="article?.frontmatter.series" class="badge badge-xs badge-primary">
              📚 {{ article.frontmatter.series }}
              <span v-if="article.frontmatter.seriesOrder">#{{ article.frontmatter.seriesOrder }}</span>
            </span>
          </div>
        </div>

        <!-- 右側：按鈕組 -->
        <div class="flex items-center gap-2">
          <!-- 專注模式切換 -->
          <div class="tooltip tooltip-bottom" data-tip="專注模式 (Ctrl+Shift+F)">
            <button
              class="btn btn-sm btn-ghost btn-square"
              :class="{ 'btn-active': focusMode }"
              @click="$emit('toggle-focus-mode')"
            >
              <Maximize v-if="!focusMode" :size="16" />
              <Minimize v-else :size="16" />
            </button>
          </div>

          <div class="divider divider-horizontal h-6 mx-0"></div>

          <!-- 編輯器模式切換 -->
          <div class="btn-group">
            <div class="tooltip tooltip-bottom" :data-tip="editorMode === 'compose' ? '撰寫模式（當前）' : '切換到撰寫模式'">
              <button
                class="btn btn-xs"
                :class="editorMode === 'compose' ? 'btn-active' : ''"
                @click="$emit('toggle-editor-mode')"
              >
                <FileEdit :size="14" />
              </button>
            </div>
            <div class="tooltip tooltip-bottom" :data-tip="editorMode === 'raw' ? 'Raw 模式（當前）' : '切換到 Raw 模式'">
              <button
                class="btn btn-xs"
                :class="editorMode === 'raw' ? 'btn-active' : ''"
                @click="$emit('toggle-editor-mode')"
              >
                <FileCode :size="14" />
              </button>
            </div>
          </div>

          <!-- Frontmatter 編輯 -->
          <div v-if="editorMode === 'compose'" class="tooltip tooltip-bottom" data-tip="編輯前置資料">
            <button
              class="btn btn-xs btn-ghost btn-square"
              @click="$emit('edit-frontmatter')"
            >
              <Edit3 :size="14" />
            </button>
          </div>

          <!-- 文章狀態切換 -->
          <div
            class="tooltip tooltip-bottom"
            :data-tip="article?.status === 'published' ? '改為草稿' : '標記為已發布'"
          >
            <button
              class="btn btn-xs gap-1"
              :class="article?.status === 'published' ? 'btn-ghost' : 'btn-success'"
              @click="$emit('toggle-status')"
            >
              <Upload v-if="article?.status === 'draft'" :size="14" />
              <FileEdit v-else :size="14" />
              <span class="hidden lg:inline text-xs">
                {{ article?.status === 'published' ? '改為草稿' : '標記發布' }}
              </span>
            </button>
          </div>

          <!-- 預覽切換 -->
          <div class="tooltip tooltip-bottom" :data-tip="showPreview ? '隱藏預覽' : '顯示預覽 (Ctrl+/)'">
            <button
              class="btn btn-xs btn-primary gap-1"
              @click="$emit('toggle-preview')"
            >
              <Eye v-if="!showPreview" :size="14" />
              <EyeOff v-else :size="14" />
              <span class="hidden lg:inline text-xs">{{ showPreview ? '隱藏' : '預覽' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import type { Article } from "@/types"
import {
  Edit3,
  Upload,
  Eye,
  EyeOff,
  FileCode,
  FileEdit,
  Maximize,
  Minimize
} from "@lucide/vue"
import SaveStatusIndicator from "@/components/SaveStatusIndicator.vue"

interface Props {
  article: Article | null
  showPreview: boolean
  editorMode?: "compose" | "raw"
  focusMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editorMode: "compose",
  focusMode: false
})

defineEmits<{
  "toggle-preview": []
  "edit-frontmatter": []
  "toggle-status": []
  "toggle-editor-mode": []
  "toggle-focus-mode": []
}>()

const isHovering = ref(false)

const statusText = computed(() => {
  return props.article?.status === "published" ? "已發布" : "草稿"
})
</script>

<style scoped>
.editor-header {
  position: relative;
}

/* 緊湊模式 */
.header-compact {
  min-height: 48px;
}

/* 專注模式收合狀態 */
.header-collapsed {
  height: 24px;
  min-height: 24px;
  overflow: hidden;
  border-bottom: 1px solid transparent;
}

/* noinspection CssUnresolvedCustomProperty */
.header-collapsed:hover {
  border-bottom-color: oklch(var(--bc) / 0.1);
}

/* 迷你狀態條 */
/* noinspection CssUnresolvedCustomProperty */
.mini-status-bar {
  height: 24px;
  display: flex;
  align-items: center;
  background: oklch(var(--b1));
  opacity: 0.8;
  transition: opacity 0.2s;
}

.header-collapsed:hover .mini-status-bar {
  opacity: 1;
}

/* 完整內容區 */
.header-content {
  min-height: 48px;
}

/* 按鈕尺寸優化 */
.btn-xs {
  height: 28px;
  min-height: 28px;
  padding: 0 8px;
}

.btn-square.btn-xs {
  width: 28px;
  padding: 0;
}
</style>
