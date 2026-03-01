<template>
  <div class="frontmatter-view">
    <div v-if="!currentArticle" class="empty-state">
      <Info :size="48" class="opacity-30" />
      <p class="text-sm text-base-content/60 mt-2">請選擇一篇文章</p>
    </div>

    <div v-else class="frontmatter-content">
      <!-- 快速操作按鈕 -->
      <div class="actions">
        <button class="btn btn-sm btn-ghost gap-1" @click="openEditor">
          <Edit2 :size="14" />
          編輯
        </button>
      </div>

      <!-- Frontmatter 表格 -->
      <table class="table table-sm">
        <tbody>
          <tr>
            <td class="font-semibold w-20">標題</td>
            <td>{{ currentArticle.frontmatter.title }}</td>
          </tr>
          <tr>
            <td class="font-semibold">日期</td>
            <td>{{ formatDate(currentArticle.frontmatter.date) }}</td>
          </tr>
          <tr v-if="currentArticle.frontmatter.lastmod">
            <td class="font-semibold">更新</td>
            <td>{{ formatDate(currentArticle.frontmatter.lastmod) }}</td>
          </tr>
          <tr v-if="currentArticle.frontmatter.description">
            <td class="font-semibold">描述</td>
            <td class="text-sm">{{ currentArticle.frontmatter.description }}</td>
          </tr>
          <tr v-if="currentArticle.frontmatter.categories?.length">
            <td class="font-semibold">分類</td>
            <td>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="cat in currentArticle.frontmatter.categories"
                  :key="cat"
                  class="badge badge-sm"
                >
                  {{ cat }}
                </span>
              </div>
            </td>
          </tr>
          <tr v-if="currentArticle.frontmatter.tags?.length">
            <td class="font-semibold">標籤</td>
            <td>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="tag in currentArticle.frontmatter.tags"
                  :key="tag"
                  class="badge badge-sm badge-outline"
                >
                  {{ tag }}
                </span>
              </div>
            </td>
          </tr>
          <tr v-if="currentArticle.frontmatter.series">
            <td class="font-semibold">系列</td>
            <td>
              {{ currentArticle.frontmatter.series }}
              <span v-if="currentArticle.frontmatter.seriesOrder" class="badge badge-sm ml-1">
                #{{ currentArticle.frontmatter.seriesOrder }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="font-semibold">狀態</td>
            <td>
              <span
                class="badge badge-sm"
                :class="currentArticle.status === 'published' ? 'badge-success' : 'badge-warning'"
              >
                {{ currentArticle.status === 'published' ? '已發布' : '草稿' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 檔案資訊 -->
      <div class="divider text-xs">檔案資訊</div>
      <div class="text-xs space-y-1 px-2">
        <div class="flex justify-between">
          <span class="text-base-content/60">檔案路徑</span>
          <span class="font-mono text-base-content/80">{{ getFileName(currentArticle.filePath) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-base-content/60">最後修改</span>
          <span class="text-base-content/80">{{ formatDateTime(currentArticle.lastModified) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Info, Edit2 } from "lucide-vue-next"
import { useArticleStore } from "@/stores/article"

const articleStore = useArticleStore()
const currentArticle = computed(() => articleStore.currentArticle)

function openEditor() {
  // TODO: 開啟 Frontmatter 編輯 modal
  // 可以 emit 事件或使用 store 管理 modal 狀態
  console.log("Open Frontmatter Editor")
}

function formatDate(dateString: string) {
  if (!dateString) {return ""}
  return new Date(dateString).toLocaleDateString("zh-TW")
}

function formatDateTime(date: Date) {
  if (!date) {return ""}
  return new Date(date).toLocaleString("zh-TW")
}

function getFileName(filePath: string) {
  if (!filePath) {return ""}
  return filePath.split(/[/\\]/).pop() || ""
}
</script>

<style scoped>
.frontmatter-view {
  height: 100%;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  height: 100%;
}

.frontmatter-content {
  padding: 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.table {
  font-size: 0.875rem;
}

.table td {
  padding: 8px 4px;
  vertical-align: top;
}

.table td:first-child {
  color: oklch(var(--bc) / 0.7);
}
</style>
