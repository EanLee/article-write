<template>
  <div class="properties-tab">
    <div v-if="!currentArticle" class="empty-state">
      <Info :size="48" class="opacity-30" />
      <p class="text-sm text-base-content/60 mt-2">請選擇一篇文章</p>
    </div>

    <div v-else class="properties-content">
      <div class="form-control">
        <label for="properties-title-input" class="label">
          <span class="label-text">標題 *</span>
        </label>
        <input
          id="properties-title-input"
          v-model="titleDraft"
          type="text"
          placeholder="文章標題"
          class="input input-bordered input-sm"
          @blur="commitTitle"
        />
      </div>

      <div class="form-control">
        <label for="properties-slug-input" class="label">
          <span class="label-text">網址代稱</span>
        </label>
        <input
          id="properties-slug-input"
          v-model="slugDraft"
          type="text"
          placeholder="自動生成"
          class="input input-bordered input-sm"
          @blur="commitSlug"
        />
        <div class="label">
          <span class="label-text-alt">留空將根據標題自動生成</span>
        </div>
      </div>

      <div class="form-control">
        <label for="properties-date-input" class="label">
          <span class="label-text">發布日期</span>
        </label>
        <input
          id="properties-date-input"
          v-model="dateDraft"
          type="date"
          class="input input-bordered input-sm"
          @change="commitDate"
        />
      </div>

      <div class="form-control">
        <label for="properties-category-input" class="label">
          <span class="label-text">分類</span>
        </label>
        <select
          id="properties-category-input"
          v-model="categoryDraft"
          class="select select-bordered select-sm"
          @change="commitCategory"
        >
          <option value="">選擇分類</option>
          <option value="Software">Software</option>
          <option value="growth">Growth</option>
          <option value="management">Management</option>
        </select>
      </div>

      <div class="form-control">
        <label for="properties-tags-input" class="label">
          <span class="label-text">標籤</span>
        </label>
        <div class="flex flex-wrap gap-2 mb-2">
          <div v-for="tag in tagsDraft" :key="tag" class="badge badge-primary gap-2">
            {{ tag }}
            <button type="button" class="btn btn-ghost btn-xs" @click="removeTag(tag)">✕</button>
          </div>
        </div>
        <div class="join">
          <input
            id="properties-tags-input"
            v-model="newTag"
            type="text"
            placeholder="輸入標籤"
            class="input input-bordered input-sm join-item flex-1"
            @keyup.enter="addTag"
          />
          <button type="button" class="btn btn-sm btn-primary join-item" @click="addTag">新增</button>
        </div>
      </div>

      <div class="form-control">
        <label for="properties-keywords-input" class="label">
          <span class="label-text">關鍵字</span>
        </label>
        <div class="flex flex-wrap gap-2 mb-2">
          <div v-for="keyword in keywordsDraft" :key="keyword" class="badge badge-secondary gap-2">
            {{ keyword }}
            <button type="button" class="btn btn-ghost btn-xs" @click="removeKeyword(keyword)">✕</button>
          </div>
        </div>
        <div class="join">
          <input
            id="properties-keywords-input"
            v-model="newKeyword"
            type="text"
            placeholder="輸入 SEO 關鍵字"
            class="input input-bordered input-sm join-item flex-1"
            @keyup.enter="addKeyword"
          />
          <button type="button" class="btn btn-sm btn-secondary join-item" @click="addKeyword">新增</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { Info } from "@lucide/vue"
import { useArticleStore } from "@/stores/article"
import { autoSaveService } from "@/services/AutoSaveService"
import type { Article } from "@/types"

const articleStore = useArticleStore()
const currentArticle = computed(() => articleStore.currentArticle)

// 欄位草稿（僅在 blur / change / 新增-移除 時才寫回 store，避免每個按鍵都觸發 store 更新）
const titleDraft = ref("")
const slugDraft = ref("")
const dateDraft = ref("")
const categoryDraft = ref("")
const tagsDraft = ref<string[]>([])
const keywordsDraft = ref<string[]>([])
const newTag = ref("")
const newKeyword = ref("")

watch(
  currentArticle,
  (article) => {
    titleDraft.value = article?.frontmatter.title ?? ""
    slugDraft.value = article?.slug ?? ""
    dateDraft.value = article?.frontmatter.date || new Date().toISOString().split("T")[0]
    categoryDraft.value = article?.category ?? ""
    tagsDraft.value = article?.frontmatter.tags ? [...article.frontmatter.tags] : []
    keywordsDraft.value = article?.frontmatter.keywords ? [...article.frontmatter.keywords] : []
  },
  { immediate: true }
)

// 從標題產生 slug（改寫自 FrontmatterEditor.vue，允許中文字元）
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

/**
 * 以目前 store 中的 currentArticle 為基礎，套用單一欄位變更後立即寫回 store（記憶體）。
 * 比照 FrontmatterEditor.vue 的 handleSave：更新 lastmod / lastModified 並標記已修改，
 * 但這裡沒有「儲存」按鈕 —— 每次欄位 blur/change 都是一次獨立的寫回。
 */
function commit(mutate: (draft: Article) => void) {
  const article = currentArticle.value
  if (!article) {return}

  // JSON round-trip 繞過 Vue reactive Proxy 的 Symbol property（structuredClone 在 Electron/Chromium 下會丟 DataCloneError，
  // 沿用 FrontmatterEditor.vue 既有的處理方式）
  const updated = JSON.parse(JSON.stringify(article)) as Article
  mutate(updated)
  updated.frontmatter.lastmod = new Date().toISOString().split("T")[0]
  updated.lastModified = new Date()

  autoSaveService.markAsModified()
  articleStore.updateArticleInMemory(updated)
}

function commitTitle() {
  const title = titleDraft.value
  commit((draft) => {
    draft.title = title
    draft.frontmatter.title = title
    if (title) {
      const slug = generateSlug(title)
      draft.slug = slug
      if (!draft.frontmatter.slug) {
        draft.frontmatter.slug = slug
      }
      slugDraft.value = slug
    }
  })
}

function commitSlug() {
  const slug = slugDraft.value
  commit((draft) => {
    draft.slug = slug
  })
}

function commitDate() {
  if (!dateDraft.value) {return}
  const date = dateDraft.value
  commit((draft) => {
    draft.frontmatter.date = date
  })
}

function commitCategory() {
  const category = categoryDraft.value
  commit((draft) => {
    draft.category = category
    draft.frontmatter.categories = [category]
  })
}

function addTag() {
  const tag = newTag.value.trim()
  if (!tag) {return}
  if (!tagsDraft.value.includes(tag)) {
    tagsDraft.value = [...tagsDraft.value, tag]
    commit((draft) => {
      draft.frontmatter.tags = [...tagsDraft.value]
    })
  }
  newTag.value = ""
}

function removeTag(tag: string) {
  tagsDraft.value = tagsDraft.value.filter((existing) => existing !== tag)
  commit((draft) => {
    draft.frontmatter.tags = [...tagsDraft.value]
  })
}

function addKeyword() {
  const keyword = newKeyword.value.trim()
  if (!keyword) {return}
  if (!keywordsDraft.value.includes(keyword)) {
    keywordsDraft.value = [...keywordsDraft.value, keyword]
    commit((draft) => {
      draft.frontmatter.keywords = [...keywordsDraft.value]
    })
  }
  newKeyword.value = ""
}

function removeKeyword(keyword: string) {
  keywordsDraft.value = keywordsDraft.value.filter((existing) => existing !== keyword)
  commit((draft) => {
    draft.frontmatter.keywords = [...keywordsDraft.value]
  })
}
</script>

<style scoped>
.properties-tab {
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

.properties-content {
  padding: 12px;
}
</style>
