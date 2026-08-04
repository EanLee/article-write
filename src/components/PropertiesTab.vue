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
          @input="markDirty('title')"
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
          @input="markDirty('slug')"
          @blur="commitSlug"
        />
        <div class="label">
          <span class="label-text-alt">留空將根據標題自動生成</span>
        </div>
      </div>

      <div class="form-control">
        <label for="properties-description-input" class="label">
          <span class="label-text">描述</span>
        </label>
        <textarea
          id="properties-description-input"
          v-model="descriptionDraft"
          class="textarea textarea-bordered textarea-sm"
          rows="3"
          placeholder="文章描述（可選）"
          @input="markDirty('description')"
          @blur="commitDescription"
        ></textarea>
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
          @input="markDirty('date')"
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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-control">
          <label for="properties-series-input" class="label">
            <span class="label-text">系列名稱</span>
          </label>
          <input
            id="properties-series-input"
            v-model="seriesDraft"
            type="text"
            placeholder="例如：Vue 3 進階教學"
            class="input input-bordered input-sm"
            @input="markDirty('series')"
            @blur="commitSeries"
          />
          <div class="label">
            <span class="label-text-alt">將相關文章組織成系列</span>
          </div>
        </div>

        <div class="form-control">
          <label for="properties-series-order-input" class="label">
            <span class="label-text">系列順序</span>
          </label>
          <input
            id="properties-series-order-input"
            v-model="seriesOrderDraft"
            type="number"
            min="1"
            placeholder="1"
            class="input input-bordered input-sm"
            :disabled="!seriesDraft"
            @input="markDirty('seriesOrder')"
            @blur="commitSeriesOrder"
          />
          <div class="label">
            <span class="label-text-alt">在系列中的排序</span>
          </div>
        </div>
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
const descriptionDraft = ref("")
const dateDraft = ref("")
const categoryDraft = ref("")
const seriesDraft = ref("")
// number | string：Vue 3 對 type="number" 的 <input> 會自動把 v-model 的值轉成 number
// （即使沒有 .number modifier），所以這裡不能假設 .value 永遠是字串。
const seriesOrderDraft = ref<number | string>("")
const tagsDraft = ref<string[]>([])
const keywordsDraft = ref<string[]>([])
const newTag = ref("")
const newKeyword = ref("")

/**
 * 「正在編輯中」的欄位名稱集合（不需要 Vue 響應性，只在 watch(currentArticle) 觸發當下讀取）。
 *
 * 修復資料遺失 race：欄位在 blur/change 前只是本地草稿，若這段期間另一個欄位的 commit()
 * 觸發 articleStore.currentArticle 換成新物件（無論是自己另一個欄位的 commit、背景自動儲存、
 * 或是檔案監聽 reload 同一篇文章），下面的 watch 都會被觸發一次。若不比對 dirtyFields，
 * 就會把使用者尚未送出的草稿用 store 的舊值蓋掉，等使用者之後才 blur 時，寫回的就是被蓋掉的舊值
 * ——等同於靜默遺失使用者剛剛輸入的內容（與 topic-020 的 save-race-data-overwrite 同一類問題）。
 */
const dirtyFields = new Set<string>()

function markDirty(field: string) {
  dirtyFields.add(field)
}

watch(
  currentArticle,
  (article, previousArticle) => {
    // 切換到不同文章（含從無到有／從有到無）時，先前欄位的草稿與 dirty 狀態一律作廢，
    // 全部欄位都要重新從新文章載入，不受 dirtyFields 保護。
    const switchedArticle = article?.id !== previousArticle?.id
    if (switchedArticle) {
      dirtyFields.clear()
    }

    if (switchedArticle || !dirtyFields.has("title")) {
      titleDraft.value = article?.frontmatter.title ?? ""
    }
    if (switchedArticle || !dirtyFields.has("slug")) {
      slugDraft.value = article?.slug ?? ""
    }
    if (switchedArticle || !dirtyFields.has("description")) {
      descriptionDraft.value = article?.frontmatter.description ?? ""
    }
    if (switchedArticle || !dirtyFields.has("date")) {
      dateDraft.value = article?.frontmatter.date || new Date().toISOString().split("T")[0]
    }
    if (switchedArticle || !dirtyFields.has("category")) {
      categoryDraft.value = article?.category ?? ""
    }
    if (switchedArticle || !dirtyFields.has("series")) {
      seriesDraft.value = article?.frontmatter.series ?? ""
    }
    if (switchedArticle || !dirtyFields.has("seriesOrder")) {
      seriesOrderDraft.value =
        article?.frontmatter.seriesOrder !== undefined ? String(article.frontmatter.seriesOrder) : ""
    }
    // 標籤／關鍵字透過新增/移除按鈕即時 commit（見 addTag/removeTag/addKeyword/removeKeyword），
    // commit 當下就已經同步好本地陣列，watch 觸發時重新整理沒有遺失風險，因此不需要 dirtyFields 保護。
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
 *
 * @param field 這次 commit 對應的欄位名稱，成功寫回後會從 dirtyFields 移除（結束「編輯中」狀態）。
 */
function commit(field: string, mutate: (draft: Article) => void) {
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
  dirtyFields.delete(field)
}

function commitTitle() {
  const title = titleDraft.value
  let autoSlug: string | null = null
  commit("title", (draft) => {
    draft.title = title
    draft.frontmatter.title = title
    // 只在使用者沒有同時正在編輯 slug 欄位時才自動代入，避免蓋掉使用者正在輸入的網址代稱
    if (title && !dirtyFields.has("slug")) {
      const slug = generateSlug(title)
      draft.slug = slug
      if (!draft.frontmatter.slug) {
        draft.frontmatter.slug = slug
      }
      autoSlug = slug
    }
  })
  if (autoSlug !== null) {
    slugDraft.value = autoSlug
  }
}

function commitSlug() {
  const slug = slugDraft.value
  commit("slug", (draft) => {
    // ⚠️ 必須同時寫入 frontmatter.slug：ArticleService.performSave() 是用
    // markdownService.combineContent(article.frontmatter, article.content) 序列化存檔，
    // 只改頂層 slug（顯示用/由 frontmatter.slug 或檔名推導）不會真正寫進檔案。
    draft.slug = slug
    draft.frontmatter.slug = slug
  })
}

function commitDescription() {
  const description = descriptionDraft.value
  commit("description", (draft) => {
    draft.frontmatter.description = description
  })
}

function commitDate() {
  if (!dateDraft.value) {return}
  const date = dateDraft.value
  commit("date", (draft) => {
    draft.frontmatter.date = date
  })
}

function commitCategory() {
  const category = categoryDraft.value
  commit("category", (draft) => {
    draft.category = category
    draft.frontmatter.categories = [category]
  })
}

function commitSeries() {
  const series = seriesDraft.value
  commit("series", (draft) => {
    draft.frontmatter.series = series
  })
}

function commitSeriesOrder() {
  // seriesOrderDraft.value 可能是 number（Vue 對 type="number" 的自動轉型）或 string（初始值 / 手動同步），
  // 不能假設一定有 .trim()，統一轉成字串再判斷是否為空。
  const raw = String(seriesOrderDraft.value ?? "").trim()
  const order = raw === "" ? undefined : Number(raw)
  commit("seriesOrder", (draft) => {
    if (order === undefined || Number.isNaN(order)) {
      delete draft.frontmatter.seriesOrder
    } else {
      draft.frontmatter.seriesOrder = order
    }
  })
}

function addTag() {
  const tag = newTag.value.trim()
  if (!tag) {return}
  if (!tagsDraft.value.includes(tag)) {
    tagsDraft.value = [...tagsDraft.value, tag]
    commit("tags", (draft) => {
      draft.frontmatter.tags = [...tagsDraft.value]
    })
  }
  newTag.value = ""
}

function removeTag(tag: string) {
  tagsDraft.value = tagsDraft.value.filter((existing) => existing !== tag)
  commit("tags", (draft) => {
    draft.frontmatter.tags = [...tagsDraft.value]
  })
}

function addKeyword() {
  const keyword = newKeyword.value.trim()
  if (!keyword) {return}
  if (!keywordsDraft.value.includes(keyword)) {
    keywordsDraft.value = [...keywordsDraft.value, keyword]
    commit("keywords", (draft) => {
      draft.frontmatter.keywords = [...keywordsDraft.value]
    })
  }
  newKeyword.value = ""
}

function removeKeyword(keyword: string) {
  keywordsDraft.value = keywordsDraft.value.filter((existing) => existing !== keyword)
  commit("keywords", (draft) => {
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
